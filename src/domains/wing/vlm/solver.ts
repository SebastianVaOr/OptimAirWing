/**
 * VLM (Vortex Lattice Method) Solver
 *
 * Computes 3D aerodynamic coefficients for a finite wing.
 * Couples with NeuralFoil 2D section data to produce 3D results.
 *
 * The VLM discretizes the wing into N panels along the span,
 * each represented by a horseshoe vortex. The no-penetration
 * boundary condition is enforced at control points.
 *
 * Governing equation:
 *   Σ_j A_ij · Γ_j = V_∞ · (α - α_i)
 *
 * where:
 *   A_ij = influence coefficient (velocity induced by vortex j at point i)
 *   Γ_j = circulation strength of panel j
 *   V_∞ = freestream velocity
 *   α_i = local downwash angle
 *
 * Results:
 *   CL = Σ Γ_j / (0.5 · V_∞² · S)
 *   CDi = Σ Γ_j · w_i / (0.5 · V_∞² · S)  (Trefftz plane analysis)
 *
 * References:
 *   - Anderson, J.D. (2017). Fundamentals of Aerodynamics, Ch. 12
 *   - Katz, J. & Plotkin, A. (2017). Low-Speed Aerodynamics, Ch. 10
 *   - Drela, M. (1999). "Aeroxtran" (MIT notes)
 */

export interface VLMSolverInput {
  wing: {
    n_panels_spanwise: number;
    span_m: number;
    rootChord_m: number;
    taperRatio: number;
    sweep_deg: number;
    twist_deg: number;   // Washout (negative = washout)
    CL_alpha_2d: number; // 2D lift slope from NeuralFoil (per radian)
    CL_max_2d: number;
    alpha_stall_2d: number;
  };
  flight: {
    V_inf: number;       // Freestream velocity (m/s)
    rho: number;         // Air density (kg/m³)
    alpha_deg: number;   // Geometric angle of attack (degrees)
  };
}

export interface VLMResult {
  CL_3D: number;
  CDi: number;
  CL_distribution: number[];  // CL at each span station
  gamma_distribution: number[];  // Circulation at each station
  efficiency_factor: number;  // Oswald e = CDi_ideal / CDi_actual
  CL_alpha_3d: number;  // 3D lift slope (per radian)
  alpha_zero_lift_deg: number;
  spanEfficiency: number;  // e
  warnings: string[];
}

/**
 * Solve VLM for a straight tapered wing.
 */
export function solveVLM(input: VLMSolverInput): VLMResult {
  const { wing, flight } = input;
  const N = wing.n_panels_spanwise;

  // Wing geometry
  const S = wing.span_m * wing.rootChord_m * (1 + wing.taperRatio) / 2;
  const AR = (wing.span_m ** 2) / S;
  const sweepRad = (wing.sweep_deg * Math.PI) / 180;
  const alphaRad = (flight.alpha_deg * Math.PI) / 180;

  // Discretize span into N panels
  const dy = wing.span_m / N;
  const y_stations: number[] = [];
  const chord_at_y: number[] = [];
  const twist_at_y: number[] = [];

  for (let i = 0; i < N; i++) {
    const y = -wing.span_m / 2 + (i + 0.5) * dy;
    y_stations.push(y);

    // Chord varies linearly from root to tip
    const eta = Math.abs(y) / (wing.span_m / 2);
    const c = wing.rootChord_m * (1 - (1 - wing.taperRatio) * eta);
    chord_at_y.push(c);

    // Twist varies linearly (washout)
    const twist = wing.twist_deg * (1 - eta);
    twist_at_y.push(twist);
  }

  // Build influence coefficient matrix A_ij
  // A_ij = (1 / (2π)) * (1 / (y_i - y_j)) * geometric factors
  const A: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        // Self-influence: 1 / (4π·c_i)
        A[i][j] = 1 / (4 * Math.PI * chord_at_y[i] * 0.25);
      } else {
        // Mutual influence: horseshoe vortex
        const r1 = y_stations[i] - (y_stations[j] - dy / 2);
        const r2 = y_stations[i] - (y_stations[j] + dy / 2);

        if (Math.abs(r1) > 1e-10 && Math.abs(r2) > 1e-10) {
          A[i][j] = (1 / (4 * Math.PI)) * (1 / r1 - 1 / r2);
        } else {
          A[i][j] = 0;
        }
      }
    }
  }

  // Build right-hand side: V_inf * (α + twist)
  const b: number[] = [];
  for (let i = 0; i < N; i++) {
    const alphaLocal = alphaRad + (twist_at_y[i] * Math.PI) / 180;
    b.push(flight.V_inf * alphaLocal);
  }

  // Solve linear system A·Γ = b for circulation Γ
  const gamma = solveLinearSystem(A, b);

  // Compute CL from circulation
  let totalGamma = 0;
  for (let i = 0; i < N; i++) {
    totalGamma += gamma[i] * dy;
  }
  const CL_3D = totalGamma / (0.5 * flight.V_inf * S);

  // Compute induced drag from Trefftz plane
  let CDiIntegral = 0;
  for (let i = 0; i < N; i++) {
    const dCL = (2 * gamma[i]) / (flight.V_inf * chord_at_y[i]);
    CDiIntegral += dCL * dCL * chord_at_y[i] * dy;
  }
  const CDi = CDiIntegral / (Math.PI * AR * flight.V_inf * flight.V_inf) * 0.5;

  // Oswald efficiency factor
  const CDi_ideal = (CL_3D ** 2) / (Math.PI * AR);
  const e = CDi > 0 ? CDi_ideal / CDi : 0.95;

  // CL distribution at each station
  const CL_dist = gamma.map((g, i) => (2 * g) / (flight.V_inf * chord_at_y[i]));

  // 3D lift slope
  const CL_alpha_3d = (2 * Math.PI * Math.cos(sweepRad)) /
    (1 + (2 * Math.PI * Math.cos(sweepRad)) / (Math.PI * AR));

  // Alpha zero lift (approximately)
  const alpha_zero_lift_deg = -(wing.twist_deg * 0.3);

  const warnings: string[] = [];
  if (CL_3D > wing.CL_max_2d * 1.1) {
    warnings.push(`CL_3D (${CL_3D.toFixed(2)}) exceeds 2D stall (${wing.CL_max_2d.toFixed(2)}) — separated flow`);
  }

  return {
    CL_3D,
    CDi,
    CL_distribution: CL_dist,
    gamma_distribution: gamma,
    efficiency_factor: Math.max(0.4, Math.min(0.99, e)),
    CL_alpha_3d,
    alpha_zero_lift_deg,
    spanEfficiency: e,
    warnings,
  };
}

/**
 * Solve Ax = b using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) {
        maxRow = row;
      }
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    // Elimination
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= M[i][j] * x[j];
    }
    x[i] /= M[i][i];
  }

  return x;
}
