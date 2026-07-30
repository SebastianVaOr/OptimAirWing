export type UnitDimension = 'length' | 'mass' | 'time' | 'angle' | 'temperature' | 'currency';

export interface Dimensioned<T> {
  value: number;
  unit: string;
  dimension: UnitDimension;
  to(targetUnit: string): Dimensioned<T>;
}

class Length {
  constructor(public meters: number) {}
  get mm() { return this.meters * 1000; }
  get cm() { return this.meters * 100; }
  get m() { return this.meters; }
  get ft() { return this.meters * 3.28084; }
  get in() { return this.meters * 39.3701; }
  add(other: Length) { return new Length(this.meters + other.meters); }
  mul(factor: number) { return new Length(this.meters * factor); }
}

class Force {
  constructor(public newtons: number) {}
  get N() { return this.newtons; }
  get kgf() { return this.newtons / 9.80665; }
  get lbf() { return this.newtons * 0.224809; }
}

class Pressure {
  constructor(public pascals: number) {}
  get Pa() { return this.pascals; }
  get kPa() { return this.pascals / 1000; }
  get MPa() { return this.pascals / 1e6; }
  get psi() { return this.pascals * 0.000145038; }
  get atm() { return this.pascals / 101325; }
}

class Velocity {
  constructor(public mps: number) {}
  get m_s() { return this.mps; }
  get kmh() { return this.mps * 3.6; }
  get kn() { return this.mps * 1.94384; }
  get mph() { return this.mps * 2.23694; }
}

class Mass {
  constructor(private _kg: number) {}
  get kg() { return this._kg; }
  get g() { return this._kg * 1000; }
  get lb() { return this._kg * 2.20462; }
}

class Angle {
  constructor(public degrees: number) {}
  get deg() { return this.degrees; }
  get rad() { return this.degrees * Math.PI / 180; }
}

class DynamicPressure {
  constructor(public pascals: number) {}
  get Pa() { return this.pascals; }
  get kPa() { return this.pascals / 1000; }
  get psf() { return this.pascals * 0.0208854; }
}

export const units = {
  Length: (m: number) => new Length(m),
  Force: (N: number) => new Force(N),
  Pressure: (Pa: number) => new Pressure(Pa),
  Velocity: (m_s: number) => new Velocity(m_s),
  Mass: (kg: number) => new Mass(kg),
  Angle: (deg: number) => new Angle(deg),
  DynamicPressure: (Pa: number) => new DynamicPressure(Pa),
};

export function dynamicPressure(velocity: Velocity, density: number = 1.225): DynamicPressure {
  return new DynamicPressure(0.5 * density * velocity.m_s * velocity.m_s);
}

export function liftForce(CL: number, q: DynamicPressure, S: number): Force {
  return new Force(CL * q.Pa * S);
}

export function reynoldsNumber(velocity: Velocity, chord: Length, nu: number = 1.5e-5): number {
  return velocity.m_s * chord.meters / nu;
}
