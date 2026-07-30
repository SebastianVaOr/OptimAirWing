import { execSync } from 'child_process';
import path from 'path';

export interface PythonCfdResult {
  CL: number;
  CD: number;
  Cm: number;
  solver: string;
  meshSize: number;
  convergenceIterations: number;
}

export class PythonBackend {
  private pythonPath: string;
  private backendDir: string;
  public available: boolean;

  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.backendDir = path.join(process.cwd(), 'backend');
    this.available = this.checkAvailable();
  }

  private checkAvailable(): boolean {
    try {
      execSync(`${this.pythonPath} -c "import fastapi; print('ok')"`, { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async runXfoil(airfoil: string, alpha: number, Re: number): Promise<{ CL: number; CD: number; Cm: number } | null> {
    if (!this.available) return null;
    try {
      const script = path.join(this.backendDir, 'xfoil_wrapper.py');
      const out = execSync(
        `${this.pythonPath} "${script}" --airfoil ${airfoil} --alpha ${alpha} --re ${Re}`,
        { stdio: 'pipe', timeout: 30000 }
      );
      return JSON.parse(out.toString());
    } catch {
      return null;
    }
  }

  async runOpenfoam(params: Record<string, unknown>): Promise<PythonCfdResult | null> {
    if (!this.available) return null;
    try {
      const script = path.join(this.backendDir, 'openfoam_wrapper.py');
      const out = execSync(
        `${this.pythonPath} "${script}" --params '${JSON.stringify(params)}'`,
        { stdio: 'pipe', timeout: 120000 }
      );
      return JSON.parse(out.toString());
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<{ fastapi: boolean; xfoil: boolean; openfoam: boolean }> {
    if (!this.available) {
      return { fastapi: false, xfoil: false, openfoam: false };
    }
    try {
      execSync(`${this.pythonPath} -c "import fastapi; print('ok')"`, { stdio: 'pipe', timeout: 3000 });
      return { fastapi: true, xfoil: true, openfoam: true };
    } catch {
      return { fastapi: false, xfoil: false, openfoam: false };
    }
  }
}

export const pythonBackend = new PythonBackend();
