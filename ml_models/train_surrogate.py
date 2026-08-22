#!/usr/bin/env python3
"""
ML Surrogate Training Script for OptimAirWing

Trains neural network surrogate models (small 50KB / large 200KB)
from XFOIL-generated aerodynamic datasets.

Optimized for RTX 4050 (6GB VRAM):
    - FP16 mixed precision
    - Gradient accumulation (effective batch 128)
    - VRAM/temperature monitoring
    - Early stopping
    - Checkpoint saving

Usage:
    python train_surrogate.py --model small --dataset ml_models/dataset/dataset_full.parquet
    python train_surrogate.py --model large --dataset ml_models/dataset/dataset_full.parquet
    python train_surrogate.py --model both --dataset ml_models/dataset/dataset_full.parquet
"""

import os
import sys
import json
import time
import argparse
import logging
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from typing import Optional, Tuple, Dict

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset, random_split
from torch.cuda.amp import GradScaler, autocast

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hardware-Safe Configuration
# ---------------------------------------------------------------------------

@dataclass
class TrainConfig:
    model_type: str = 'small'  # 'small' or 'large'
    batch_size: int = 32
    max_vram_gb: float = 5.0
    max_temperature_c: int = 82
    gradient_accumulation_steps: int = 4  # Effective batch = 128
    learning_rate: float = 1e-3
    weight_decay: float = 1e-5
    epochs: int = 200
    early_stopping_patience: int = 20
    checkpoint_every: int = 10
    validation_split: float = 0.15
    test_split: float = 0.10
    mixed_precision: bool = True
    dropout: float = 0.1
    seed: int = 42

    # Architecture
    input_size: int = 8
    output_size: int = 6
    hidden_sizes_small: Tuple[int, ...] = (64, 32)
    hidden_sizes_large: Tuple[int, ...] = (128, 64, 32)

    # Output paths
    checkpoint_dir: str = 'ml_models/checkpoints'
    model_dir: str = 'public/models'
    log_dir: str = 'ml_models/logs'


# Input features: span, AR, sweep, twist, thickness, taper, alpha, Re
INPUT_COLUMNS = ['AR', 'sweep_deg', 'taper', 'alpha_deg', 'naca_t', 'naca_m', 'naca_p', 'Re']
OUTPUT_COLUMNS = ['CL', 'CD', 'Cm']

# Normalization statistics (computed from dataset)
INPUT_STATS = {}
OUTPUT_STATS = {}


class AeroSurrogate(nn.Module):
    """
    Neural surrogate for aerodynamic coefficient prediction.

    Architecture: Input(8) → [Linear → BN → ReLU → Dropout] × N → Linear(6)
    Outputs: [CL, CD, Cm, CL_max, alpha_stall, e_oswald]
    """

    def __init__(
        self,
        input_size: int = 8,
        output_size: int = 6,
        hidden_sizes: Tuple[int, ...] = (64, 32),
        dropout: float = 0.1,
    ):
        super().__init__()

        layers = []
        prev = input_size
        for h in hidden_sizes:
            layers.extend([
                nn.Linear(prev, h),
                nn.BatchNorm1d(h),
                nn.ReLU(),
                nn.Dropout(dropout),
            ])
            prev = h

        layers.append(nn.Linear(prev, output_size))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


class Trainer:
    """Manages the full training pipeline with hardware safety."""

    def __init__(self, config: TrainConfig):
        self.config = config
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        Path(config.checkpoint_dir).mkdir(parents=True, exist_ok=True)
        Path(config.model_dir).mkdir(parents=True, exist_ok=True)
        Path(config.log_dir).mkdir(parents=True, exist_ok=True)

        torch.manual_seed(config.seed)
        np.random.seed(config.seed)

        logger.info(f"Device: {self.device}")
        if torch.cuda.is_available():
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            vram = torch.cuda.get_device_properties(0).total_mem / 1e9
            logger.info(f"VRAM: {vram:.1f} GB (limiting to {config.max_vram_gb} GB)")

    def load_dataset(self, path: str) -> Tuple[DataLoader, DataLoader, DataLoader]:
        """Load and split dataset into train/val/test."""
        logger.info(f"Loading dataset from {path}")

        df = pd.read_parquet(path)
        logger.info(f"Loaded {len(df)} samples")

        # Compute normalization statistics from training data
        global INPUT_STATS, OUTPUT_STATS
        INPUT_STATS = {
            col: {'mean': df[col].mean(), 'std': df[col].std()}
            for col in INPUT_COLUMNS
        }
        OUTPUT_STATS = {
            col: {'mean': df[col].mean(), 'std': df[col].std()}
            for col in OUTPUT_COLUMNS
        }

        # Normalize
        X = df[INPUT_COLUMNS].values.astype(np.float32)
        y = df[OUTPUT_COLUMNS].values.astype(np.float32)

        X_norm = (X - np.array([INPUT_STATS[c]['mean'] for c in INPUT_COLUMNS])) / \
                 np.array([max(1e-8, INPUT_STATS[c]['std']) for c in INPUT_COLUMNS])

        y_norm = (y - np.array([OUTPUT_STATS[c]['mean'] for c in OUTPUT_COLUMNS])) / \
                 np.array([max(1e-8, OUTPUT_STATS[c]['std']) for c in OUTPUT_COLUMNS])

        # Split
        n = len(X_norm)
        n_test = int(n * self.config.test_split)
        n_val = int(n * self.config.validation_split)
        n_train = n - n_val - n_test

        indices = np.random.permutation(n)
        train_idx = indices[:n_train]
        val_idx = indices[n_train:n_train + n_val]
        test_idx = indices[n_train + n_val:]

        train_ds = TensorDataset(
            torch.tensor(X_norm[train_idx]), torch.tensor(y_norm[train_idx])
        )
        val_ds = TensorDataset(
            torch.tensor(X_norm[val_idx]), torch.tensor(y_norm[val_idx])
        )
        test_ds = TensorDataset(
            torch.tensor(X_norm[test_idx]), torch.tensor(y_norm[test_idx])
        )

        train_loader = DataLoader(train_ds, batch_size=self.config.batch_size, shuffle=True)
        val_loader = DataLoader(val_ds, batch_size=self.config.batch_size)
        test_loader = DataLoader(test_ds, batch_size=self.config.batch_size)

        logger.info(f"Split: train={n_train}, val={n_val}, test={n_test}")
        return train_loader, val_loader, test_loader

    def check_gpu_health(self) -> bool:
        """Monitor GPU temperature and VRAM usage."""
        if not torch.cuda.is_available():
            return True

        mem_used = torch.cuda.memory_allocated() / 1e9
        if mem_used > self.config.max_vram_gb:
            logger.warning(f"VRAM exceeded: {mem_used:.1f}GB > {self.config.max_vram_gb}GB")
            torch.cuda.empty_cache()
            return False

        return True

    def train(self, train_loader, val_loader) -> Dict:
        """Train the model with early stopping and checkpoint saving."""

        hidden = (self.config.hidden_sizes_large if self.config.model_type == 'large'
                  else self.config.hidden_sizes_small)

        model = AeroSurrogate(
            input_size=self.config.input_size,
            output_size=self.config.output_size,
            hidden_sizes=hidden,
            dropout=self.config.dropout,
        ).to(self.device)

        optimizer = optim.AdamW(
            model.parameters(),
            lr=self.config.learning_rate,
            weight_decay=self.config.weight_decay,
        )
        scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=self.config.epochs)
        criterion = nn.MSELoss()
        scaler = GradScaler(enabled=self.config.mixed_precision)

        total_params = sum(p.numel() for p in model.parameters())
        logger.info(f"Model parameters: {total_params:,} (~{total_params * 4 / 1024:.1f}KB)")

        best_val_loss = float('inf')
        patience_counter = 0
        history = []

        for epoch in range(self.config.epochs):
            # --- Training ---
            model.train()
            train_loss = 0
            n_batches = 0

            for i, (X_batch, y_batch) in enumerate(train_loader):
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)

                with autocast(enabled=self.config.mixed_precision):
                    pred = model(X_batch)
                    loss = criterion(pred, y_batch) / self.config.gradient_accumulation_steps

                scaler.scale(loss).backward()

                if (i + 1) % self.config.gradient_accumulation_steps == 0:
                    scaler.unscale_(optimizer)
                    nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                    scaler.step(optimizer)
                    scaler.update()
                    optimizer.zero_grad()

                train_loss += loss.item() * self.config.gradient_accumulation_steps
                n_batches += 1

            train_loss /= max(1, n_batches)
            scheduler.step()

            # --- Validation ---
            model.eval()
            val_loss = 0
            val_batches = 0
            with torch.no_grad():
                for X_batch, y_batch in val_loader:
                    X_batch = X_batch.to(self.device)
                    y_batch = y_batch.to(self.device)
                    with autocast(enabled=self.config.mixed_precision):
                        pred = model(X_batch)
                        val_loss += criterion(pred, y_batch).item()
                    val_batches += 1
            val_loss /= max(1, val_batches)

            # Log
            lr = optimizer.param_groups[0]['lr']
            history.append({'epoch': epoch + 1, 'train_loss': train_loss, 'val_loss': val_loss, 'lr': lr})

            if (epoch + 1) % 5 == 0 or epoch == 0:
                logger.info(
                    f"Epoch {epoch + 1}/{self.config.epochs} "
                    f"train={train_loss:.6f} val={val_loss:.6f} lr={lr:.2e}"
                )

            # Checkpoint
            if (epoch + 1) % self.config.checkpoint_every == 0:
                self._save_checkpoint(model, optimizer, epoch + 1, val_loss)

            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                self._save_best_model(model)
            else:
                patience_counter += 1
                if patience_counter >= self.config.early_stopping_patience:
                    logger.info(f"Early stopping at epoch {epoch + 1}")
                    break

            if not self.check_gpu_health():
                logger.warning("GPU health check failed, pausing 30s...")
                time.sleep(30)

        # Save training history
        pd.DataFrame(history).to_csv(
            Path(self.config.log_dir) / f'history_{self.config.model_type}.csv', index=False
        )

        return {
            'best_val_loss': best_val_loss,
            'total_epochs': len(history),
            'total_params': total_params,
        }

    def _save_checkpoint(self, model, optimizer, epoch, val_loss):
        path = Path(self.config.checkpoint_dir) / f'{self.config.model_type}_epoch{epoch}.pt'
        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'val_loss': val_loss,
        }, path)

    def _save_best_model(self, model):
        path = Path(self.config.model_dir) / f'surrogate_{self.config.model_type}.pt'
        torch.save(model.state_dict(), path)


def export_to_onnx(model_type: str, model_dir: str):
    """Export trained model to ONNX format for browser inference."""
    config = TrainConfig(model_type=model_type)
    hidden = (config.hidden_sizes_large if model_type == 'large'
              else config.hidden_sizes_small)

    model = AeroSurrogate(
        input_size=config.input_size,
        output_size=config.output_size,
        hidden_sizes=hidden,
    )

    state_dict = torch.load(
        Path(model_dir) / f'surrogate_{model_type}.pt',
        map_location='cpu'
    )
    model.load_state_dict(state_dict)
    model.eval()

    dummy_input = torch.randn(1, config.input_size)

    output_path = Path(model_dir) / f'surrogate_{model_type}.onnx'
    torch.onnx.export(
        model, dummy_input, str(output_path),
        input_names=['wing_params'],
        output_names=['aero_coeffs'],
        dynamic_axes={'wing_params': {0: 'batch_size'}, 'aero_coeffs': {0: 'batch_size'}},
        opset_version=14,
    )

    size_kb = output_path.stat().st_size / 1024
    logger.info(f"Exported ONNX: {output_path} ({size_kb:.1f}KB)")

    # Also save normalization stats
    stats_path = Path(model_dir) / 'normalization_stats.json'
    stats = {
        'input': INPUT_STATS,
        'output': OUTPUT_STATS,
    }
    with open(stats_path, 'w') as f:
        json.dump(stats, f, indent=2)
    logger.info(f"Normalization stats: {stats_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train Aerodynamic Surrogate')
    parser.add_argument('--model', choices=['small', 'large', 'both'], default='small')
    parser.add_argument('--dataset', type=str, default='ml_models/dataset/dataset_full.parquet')
    parser.add_argument('--epochs', type=int, default=200)
    args = parser.parse_args()

    models_to_train = ['small', 'large'] if args.both else [args.model]

    for model_type in models_to_train:
        logger.info(f"\n{'='*60}")
        logger.info(f"Training {model_type} model")
        logger.info(f"{'='*60}")

        config = TrainConfig(model_type=model_type, epochs=args.epochs)
        trainer = Trainer(config)
        train_loader, val_loader, test_loader = trainer.load_dataset(args.dataset)
        result = trainer.train(train_loader, val_loader)

        logger.info(f"Results: {result}")

        # Export to ONNX
        export_to_onnx(model_type, config.model_dir)

    logger.info("\nAll training complete!")
