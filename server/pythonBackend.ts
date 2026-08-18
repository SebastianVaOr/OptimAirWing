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
    // Backend Python/CFD no operativo: se reporta honestamente como no disponible.
    this.available = false;
  }

  async runXfoil(airfoil: string, alpha: number, Re: number): Promise<{ CL: number; CD: number; Cm: number } | null> {
    return null;
  }

  async runOpenfoam(params: Record<string, unknown>): Promise<PythonCfdResult | null> {
    return null;
  }

  async healthCheck(): Promise<{ fastapi: boolean; xfoil: boolean; openfoam: boolean }> {
    return { fastapi: false, xfoil: false, openfoam: false };
  }
}

export const pythonBackend = new PythonBackend();