#!/usr/bin/env python3
"""
ONNX Model Exporter for OptimAirWing ML Surrogate

Loads trained PyTorch models and exports them to ONNX format
for browser inference via ONNX Runtime Web.

Usage:
    python export_onnx.py --model_type small
    python export_onnx.py --model_type large
    python export_onnx.py --model_type both
"""

import argparse
import json
import logging
from pathlib import Path

import torch
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def export_model(model_type: str, checkpoint_dir: str, output_dir: str):
    """Export a single model to ONNX."""

    # Import model architecture from training script
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from train_surrogate import AeroSurrogate, TrainConfig, INPUT_COLUMNS, OUTPUT_COLUMNS

    config = TrainConfig(model_type=model_type)
    hidden = (config.hidden_sizes_large if model_type == 'large'
              else config.hidden_sizes_small)

    model = AeroSurrogate(
        input_size=config.input_size,
        output_size=config.output_size,
        hidden_sizes=hidden,
    )

    # Load trained weights
    ckpt_path = Path(checkpoint_dir) / f'surrogate_{model_type}.pt'
    if not ckpt_path.exists():
        ckpt_path = Path(output_dir) / f'surrogate_{model_type}.pt'

    state_dict = torch.load(ckpt_path, map_location='cpu')
    if isinstance(state_dict, dict) and 'model_state_dict' in state_dict:
        state_dict = state_dict['model_state_dict']
    model.load_state_dict(state_dict)
    model.eval()

    # Export
    dummy_input = torch.randn(1, config.input_size)
    output_path = Path(output_dir) / f'surrogate_{model_type}.onnx'

    torch.onnx.export(
        model,
        dummy_input,
        str(output_path),
        input_names=['wing_params'],
        output_names=['aero_coeffs'],
        dynamic_axes={
            'wing_params': {0: 'batch_size'},
            'aero_coeffs': {0: 'batch_size'},
        },
        opset_version=14,
        do_constant_folding=True,
    )

    size_kb = output_path.stat().st_size / 1024
    logger.info(f"Exported: {output_path} ({size_kb:.1f}KB)")

    # Validate the exported model
    import onnxruntime as ort
    session = ort.InferenceSession(str(output_path))
    test_input = np.random.randn(1, config.input_size).astype(np.float32)
    outputs = session.run(None, {'wing_params': test_input})

    logger.info(f"Validation: input shape={test_input.shape}, output shape={outputs[0].shape}")
    logger.info(f"Sample output (denormalized): {outputs[0][0]}")

    return output_path


def export_normalization_stats(output_dir: str):
    """Export normalization statistics used during training."""
    # These will be loaded from the training run
    stats_path = Path(output_dir) / 'normalization_stats.json'

    if not stats_path.exists():
        # Create placeholder stats
        stats = {
            'input': {
                'AR': {'mean': 12.0, 'std': 5.2},
                'sweep_deg': {'mean': 5.0, 'std': 12.0},
                'taper': {'mean': 0.6, 'std': 0.22},
                'alpha_deg': {'mean': 5.0, 'std': 5.0},
                'naca_t': {'mean': 0.12, 'std': 0.03},
                'naca_m': {'mean': 0.02, 'std': 0.015},
                'naca_p': {'mean': 0.4, 'std': 0.15},
                'Re': {'mean': 3e6, 'std': 2e6},
            },
            'output': {
                'CL': {'mean': 0.52, 'std': 0.45},
                'CD': {'mean': 0.018, 'std': 0.015},
                'Cm': {'mean': -0.04, 'std': 0.06},
            },
            'note': 'These are placeholder stats. Replace with actual values after training.',
        }
        with open(stats_path, 'w') as f:
            json.dump(stats, f, indent=2)
        logger.info(f"Created placeholder stats: {stats_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Export ML Surrogate to ONNX')
    parser.add_argument('--model_type', choices=['small', 'large', 'both'], default='small')
    parser.add_argument('--checkpoint_dir', default='ml_models/checkpoints')
    parser.add_argument('--output_dir', default='public/models')
    args = parser.parse_args()

    Path(args.output_dir).mkdir(parents=True, exist_ok=True)

    export_normalization_stats(args.output_dir)

    models = ['small', 'large'] if args.both else [args.model_type]
    for mt in models:
        export_model(mt, args.checkpoint_dir, args.output_dir)
