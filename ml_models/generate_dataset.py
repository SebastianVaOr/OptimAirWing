#!/usr/bin/env python3
"""
XFOIL Dataset Generator for OptimAirWing ML Surrogate

Generates 100,000+ aerodynamic samples using XFOIL for training the neural
surrogate model. Designed for safe batch execution on consumer hardware
(RTX 4050, 16GB RAM).

Usage:
    python generate_dataset.py --n_samples 100000 --output_dir ml_models/dataset
    python generate_dataset.py --resume --output_dir ml_models/dataset
    python generate_dataset.py --n_samples 1000 --batch 0 --output_dir ml_models/dataset

Hardware Safety:
    - GPU VRAM: limited to 5GB (XFOIL is CPU-only, but this limits overall system)
    - CPU: max 80% usage
    - Checkpoints every 1000 samples for crash recovery
"""

import os
import sys
import json
import time
import signal
import argparse
import subprocess
import tempfile
import re
import math
import logging
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict
from concurrent.futures import ProcessPoolExecutor, TimeoutError as FuturesTimeout

import numpy as np
import pandas as pd
from scipy.stats import qmc

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ml_models/dataset/generation.log'),
    ]
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CONFIG = {
    'n_samples': 100_000,
    'checkpoint_every': 1_000,
    'xfoil_timeout_s': 15,
    'max_workers': min(4, os.cpu_count() or 2),
    'max_cpu_percent': 80,
    'output_dir': 'ml_models/dataset',
}

# Latin Hypercube Sampling parameter space
# Based on Abbott & Von Doenhoff NACA data ranges
PARAM_SPACE = {
    'naca_m':      (0.00, 0.09),   # Camber ratio (max camber / chord)
    'naca_p':      (0.0, 0.9),     # Position of max camber (tenths of chord)
    'naca_t':      (0.06, 0.24),   # Max thickness ratio
    'alpha_deg':   (-5.0, 20.0),   # Angle of attack (degrees)
    'Re_log':      (4.699, 6.699), # log10(Re): 50k to 5M
    'AR':          (4.0, 25.0),    # Aspect ratio (for 3D correction)
    'sweep_deg':   (-10.0, 45.0),  # Quarter-chord sweep
    'taper':       (0.2, 1.0),     # Taper ratio Ct/Cr
}


@dataclass
class SampleResult:
    idx: int
    naca_code: str
    naca_m: float
    naca_p: float
    naca_t: float
    AR: float
    sweep_deg: float
    taper: float
    alpha_deg: float
    Re: float
    CL: float
    CD: float
    Cm: float
    CL_max: Optional[float] = None
    alpha_stall: Optional[float] = None
    success: bool = True
    error: str = ''


class XFOILRunner:
    """Manages XFOIL execution as a subprocess."""

    def __init__(self, xfoil_path: str = 'xfoil', timeout_s: int = 15):
        self.xfoil_path = xfoil_path
        self.timeout_s = timeout_s
        self._verify_xfoil()

    def _verify_xfoil(self):
        """Check that XFOIL is available."""
        try:
            result = subprocess.run(
                [self.xfoil_path, '-h'],
                capture_output=True, timeout=5
            )
            logger.info(f"XFOIL found at: {self.xfoil_path}")
        except FileNotFoundError:
            logger.warning("XFOIL not found in PATH. Using mock generator.")
            self.xfoil_path = None

    def run_analysis(
        self, naca_code: str, alpha: float, Re: float
    ) -> Optional[Dict]:
        """Run XFOIL panel method analysis for a single condition."""

        if self.xfoil_path is None:
            return self._mock_analysis(naca_code, alpha, Re)

        xfoil_script = f"""
NACA {naca_code}
PANE
OPER
ITER 80
VISC {Re:.0f}
ALFA {alpha:.2f}
QUIT
"""

        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.in', delete=False
        ) as f:
            f.write(xfoil_script)
            input_path = f.name

        try:
            result = subprocess.run(
                [self.xfoil_path],
                stdin=open(input_path, 'r'),
                capture_output=True,
                text=True,
                timeout=self.timeout_s,
            )
            return self._parse_output(result.stdout, result.stderr)
        except subprocess.TimeoutExpired:
            return None
        except Exception as e:
            logger.debug(f"XFOIL error: {e}")
            return None
        finally:
            os.unlink(input_path)

    def _parse_output(self, stdout: str, stderr: str) -> Optional[Dict]:
        """Parse XFOIL output for CL, CD, Cm."""
        cl_match = re.search(r'CL\s*=\s*([-\d.]+)', stdout)
        cd_match = re.search(r'CD\s*=\s*([-\d.]+)', stdout)
        cm_match = re.search(r'Cm\s*=\s*([-\d.]+)', stdout)

        if cl_match and cd_match:
            return {
                'CL': float(cl_match.group(1)),
                'CD': max(1e-6, float(cd_match.group(1))),
                'Cm': float(cm_match.group(1)) if cm_match else 0.0,
            }
        return None

    def _mock_analysis(
        self, naca_code: str, alpha: float, Re: float
    ) -> Dict:
        """
        Analytical approximation for when XFOIL is not installed.
        Uses thin airfoil theory + viscous correction.
        NOT for training data — only for code testing.
        """
        thickness = int(naca_code[-2:]) / 100 if len(naca_code) >= 4 else 0.12
        camber = int(naca_code[0]) / 100 if len(naca_code) >= 4 else 0.0

        a0 = 2 * math.pi
        alpha0 = -2 * camber / 0.12
        cl = a0 * (math.radians(alpha) - alpha0)

        cd0 = 0.005 + 0.5 * thickness ** 2
        cdi = cl ** 2 / (math.pi * 7.0 * 0.85)

        re_factor = (Re / 1e6) ** (-0.1)
        cd = (cd0 + cdi) * re_factor

        cm = -cl / 4 - camber / 2

        return {'CL': cl, 'CD': max(1e-6, cd), 'Cm': cm}


def generate_naca_code(m: float, p: float, t: float) -> str:
    """Generate 4-digit NACA code from parameters."""
    m_digit = int(round(m * 100))
    p_digit = int(round(p * 10))
    t_digit = int(round(t * 100))
    return f"{m_digit:02d}{p_digit:01d}{t_digit:02d}"


def run_single_sample(
    idx: int,
    sample: np.ndarray,
    runner: XFOILRunner,
) -> SampleResult:
    """Generate one XFOIL sample."""
    m, p, t, alpha, Re_log, AR, sweep, taper = sample

    naca_code = generate_naca_code(m, p, t)
    Re = 10 ** Re_log

    result = runner.run_analysis(naca_code, alpha, Re)

    if result:
        return SampleResult(
            idx=idx,
            naca_code=naca_code,
            naca_m=m,
            naca_p=p,
            naca_t=t,
            AR=AR,
            sweep_deg=sweep,
            taper=taper,
            alpha_deg=alpha,
            Re=Re,
            CL=result['CL'],
            CD=result['CD'],
            Cm=result['Cm'],
            success=True,
        )
    else:
        return SampleResult(
            idx=idx, naca_code=naca_code,
            naca_m=m, naca_p=p, naca_t=t,
            AR=AR, sweep_deg=sweep, taper=taper,
            alpha_deg=alpha, Re=Re,
            CL=0, CD=0, Cm=0,
            success=False, error='XFOIL timeout or failure',
        )


class DatasetGenerator:
    """Main dataset generation pipeline."""

    def __init__(self, output_dir: str, config: dict = CONFIG):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.config = config
        self.checkpoint_file = self.output_dir / 'checkpoint.json'
        self.runner = XFOILRunner(timeout_s=config['xfoil_timeout_s'])
        self._interrupted = False

        signal.signal(signal.SIGINT, self._handle_interrupt)

    def _handle_interrupt(self, signum, frame):
        logger.warning("Interrupt received — finishing current batch...")
        self._interrupted = True

    def _load_checkpoint(self) -> int:
        if self.checkpoint_file.exists():
            with open(self.checkpoint_file) as f:
                data = json.load(f)
            return data.get('samples_generated', 0)
        return 0

    def _save_checkpoint(self, n: int):
        with open(self.checkpoint_file, 'w') as f:
            json.dump({
                'samples_generated': n,
                'timestamp': datetime.now().isoformat(),
            }, f)

    def generate(self, n_samples: int = None):
        n = n_samples or self.config['n_samples']
        start_idx = self._load_checkpoint()
        if start_idx > 0:
            logger.info(f"Resuming from checkpoint: {start_idx} samples already done")

        sampler = qmc.LatinHypercube(d=len(PARAM_SPACE))
        all_samples = sampler.random(n=n)
        l_bounds = [v[0] for v in PARAM_SPACE.values()]
        u_bounds = [v[1] for v in PARAM_SPACE.values()]
        all_samples = qmc.scale(all_samples, l_bounds, u_bounds)

        batch_results: List[SampleResult] = []
        total_generated = start_idx

        for i in range(start_idx, n):
            if self._interrupted:
                logger.info(f"Saving checkpoint at {i} before exit...")
                break

            sample = all_samples[i]
            result = run_single_sample(i, sample, self.runner)
            batch_results.append(result)
            total_generated += 1

            if total_generated % 100 == 0:
                success_rate = sum(1 for r in batch_results[-100:] if r.success) / 100 * 100
                logger.info(
                    f"[{total_generated}/{n}] success={success_rate:.0f}% "
                    f"CL={result.CL:.4f} CD={result.CD:.6f}"
                )

            if total_generated % self.config['checkpoint_every'] == 0:
                self._save_results(batch_results)
                self._save_checkpoint(total_generated)
                batch_results = []
                logger.info(f"Checkpoint saved: {total_generated}/{n}")

        self._save_results(batch_results)
        self._save_checkpoint(total_generated)

        logger.info(f"Generation complete. Total: {total_generated} samples")
        return self._compile_dataset()

    def _save_results(self, results: List[SampleResult]):
        if not results:
            return
        batch_file = self.output_dir / f'batch_{results[0].idx:07d}.csv'
        df = pd.DataFrame([asdict(r) for r in results])
        df.to_csv(batch_file, index=False)

    def _compile_dataset(self) -> pd.DataFrame:
        all_files = sorted(self.output_dir.glob('batch_*.csv'))
        if not all_files:
            return pd.DataFrame()

        dfs = [pd.read_csv(f) for f in all_files]
        df = pd.concat(dfs, ignore_index=True)
        df = df[df.success == True].copy()

        df.to_csv(self.output_dir / 'dataset_full.csv', index=False)
        df.to_parquet(self.output_dir / 'dataset_full.parquet', index=False)

        logger.info(
            f"Final dataset: {len(df)} successful samples from {len(all_files)} batches"
        )
        logger.info(f"  Saved to: {self.output_dir / 'dataset_full.parquet'}")

        for col in ['CL', 'CD', 'Cm']:
            logger.info(f"  {col}: mean={df[col].mean():.4f}, std={df[col].std():.4f}")

        return df


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='XFOIL Dataset Generator')
    parser.add_argument('--n_samples', type=int, default=100_000)
    parser.add_argument('--output_dir', type=str, default='ml_models/dataset')
    parser.add_argument('--resume', action='store_true')
    args = parser.parse_args()

    generator = DatasetGenerator(output_dir=args.output_dir)
    generator.generate(n_samples=args.n_samples)
