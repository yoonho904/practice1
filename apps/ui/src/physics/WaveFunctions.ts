import { FUNDAMENTAL_CONSTANTS, UnitConverter, validateQuantumNumbers } from '../constants/PhysicalConstants';
import { QuantumNumbers, ElectronState } from './QuantumMechanicsEngine';

export interface WaveFunction {
  getValue(x: number, y: number, z: number, time: number): number;
  getProbabilityDensity(x: number, y: number, z: number): number;
  getCharacteristicRadius(): number;
  getOrbitalBoundary(isoValue: number): Array<[number, number, number]>;
  getNodalSurfaces(): Array<Array<[number, number, number]>>;
}

export class HydrogenWaveFunction implements WaveFunction {
  private normalizedCache = new Map<string, number>();
  private boundaryCache = new Map<string, Array<[number, number, number]>>();

  constructor(
    private n: number,
    private l: number,
    private m: number,
    private Z: number = 1
  ) {
    if (!validateQuantumNumbers(n, l, m)) {
      throw new Error(`Invalid quantum numbers: n=${n}, l=${l}, m=${m}`);
    }
  }

  getValue(x: number, y: number, z: number, time: number): number {
    const r = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.acos(z / (r + 1e-10));
    const phi = Math.atan2(y, x);

    // Simplified hydrogen-like wave function
    const radialPart = this.getRadialComponent(r);
    const angularPart = this.getAngularComponent(theta, phi);
    const timePart = Math.sin(time * this.getFrequency() + this.getPhase(r, theta, phi));

    return radialPart * angularPart * timePart;
  }

  getProbabilityDensity(x: number, y: number, z: number): number {
    const r = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.acos(z / (r + 1e-10));

    const radialPart = this.getRadialComponent(r);
    const angularPart = this.getAngularComponent(theta, 0);

    return radialPart * radialPart * angularPart * angularPart;
  }

  getCharacteristicRadius(): number {
    // Bohr radius scaled by principal quantum number
    return (FUNDAMENTAL_CONSTANTS.BOHR_RADIUS * 1e10) * this.n * this.n / this.Z;
  }

  private getRadialComponent(r: number): number {
    const a0 = this.getCharacteristicRadius();
    const rho = (2 * this.Z * r) / (this.n * a0);

    // Normalization constants
    const norm = Math.pow(2 * this.Z / (this.n * a0), 1.5) * Math.sqrt(this.factorial(this.n - this.l - 1) / (2 * this.n * this.factorial(this.n + this.l)));

    switch (this.n) {
      case 1:
        if (this.l === 0) {
          return norm * 2 * Math.exp(-rho / 2);
        }
        break;

      case 2:
        if (this.l === 0) {
          return norm * (2 - rho) * Math.exp(-rho / 2) / Math.sqrt(2);
        } else if (this.l === 1) {
          return norm * rho * Math.exp(-rho / 2) / (2 * Math.sqrt(6));
        }
        break;

      case 3:
        if (this.l === 0) {
          return norm * (27 - 18 * rho + 2 * rho * rho) * Math.exp(-rho / 2) / (81 * Math.sqrt(3));
        } else if (this.l === 1) {
          return norm * (6 - rho) * rho * Math.exp(-rho / 2) / (81 * Math.sqrt(6));
        } else if (this.l === 2) {
          return norm * rho * rho * Math.exp(-rho / 2) / (81 * Math.sqrt(30));
        }
        break;

      case 4:
        if (this.l === 0) {
          return norm * (1 - 3*rho/4 + rho*rho/8 - rho*rho*rho/192) * Math.exp(-rho / 2);
        } else if (this.l === 1) {
          return norm * (5 - rho) * rho * Math.exp(-rho / 2) / (16 * Math.sqrt(15));
        } else if (this.l === 2) {
          return norm * (3 - rho) * rho * rho * Math.exp(-rho / 2) / (64 * Math.sqrt(5));
        } else if (this.l === 3) {
          return norm * rho * rho * rho * Math.exp(-rho / 2) / (768 * Math.sqrt(35));
        }
        break;

      default:
        // General form using associated Laguerre polynomials (simplified)
        const laguerreValue = this.associatedLaguerre(this.n - this.l - 1, 2 * this.l + 1, rho);
        return norm * Math.pow(rho, this.l) * laguerreValue * Math.exp(-rho / 2);
    }

    // Fallback for unsupported combinations
    return Math.exp(-rho / 2) / Math.pow(this.n, 1.5);
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    return n * this.factorial(n - 1);
  }

  private associatedLaguerre(n: number, alpha: number, x: number): number {
    // Simplified associated Laguerre polynomial calculation
    if (n === 0) return 1;
    if (n === 1) return 1 + alpha - x;
    if (n === 2) return 2 + 3*alpha + alpha*alpha - 2*(2 + alpha)*x + x*x;

    // For higher orders, use a simplified approximation
    return Math.pow(-1, n) * Math.pow(x, alpha) * Math.exp(x) / this.factorial(n);
  }

  private getAngularComponent(theta: number, phi: number): number {
    return this.sphericalHarmonic(this.l, this.m, theta, phi);
  }

  private sphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const absM = Math.abs(m);

    // Calculate associated Legendre polynomial
    const legendreValue = this.associatedLegendre(l, absM, cosTheta);

    // Normalization factor
    const norm = Math.sqrt((2 * l + 1) * this.factorial(l - absM) / (4 * Math.PI * this.factorial(l + absM)));

    // Phase factor for negative m
    const phase = Math.pow(-1, absM);

    // Azimuthal part
    let azimuthal: number;
    if (m === 0) {
      azimuthal = 1;
    } else if (m > 0) {
      azimuthal = Math.sqrt(2) * Math.cos(m * phi);
    } else {
      azimuthal = Math.sqrt(2) * Math.sin(absM * phi);
    }

    return norm * phase * legendreValue * azimuthal;
  }

  private associatedLegendre(l: number, m: number, x: number): number {
    // Calculate associated Legendre polynomial P_l^m(x)
    if (m < 0 || m > l) return 0;
    if (m === 0) return this.legendrePolynomial(l, x);

    // Use recursion relation for associated Legendre polynomials
    const sinTheta = Math.sqrt(1 - x * x);

    switch (l) {
      case 0:
        return m === 0 ? 1 : 0;

      case 1:
        switch (m) {
          case 0: return x;
          case 1: return -sinTheta;
          default: return 0;
        }

      case 2:
        switch (m) {
          case 0: return (3 * x * x - 1) / 2;
          case 1: return -3 * x * sinTheta;
          case 2: return 3 * sinTheta * sinTheta;
          default: return 0;
        }

      case 3:
        switch (m) {
          case 0: return (5 * x * x * x - 3 * x) / 2;
          case 1: return -3 * (5 * x * x - 1) * sinTheta / 2;
          case 2: return 15 * x * sinTheta * sinTheta;
          case 3: return -15 * sinTheta * sinTheta * sinTheta;
          default: return 0;
        }

      default:
        // For higher l, use simplified approximation
        return Math.pow(sinTheta, m) * this.legendrePolynomial(l - m, x);
    }
  }

  private legendrePolynomial(n: number, x: number): number {
    // Legendre polynomial P_n(x)
    switch (n) {
      case 0: return 1;
      case 1: return x;
      case 2: return (3 * x * x - 1) / 2;
      case 3: return (5 * x * x * x - 3 * x) / 2;
      case 4: return (35 * x * x * x * x - 30 * x * x + 3) / 8;
      case 5: return (63 * x * x * x * x * x - 70 * x * x * x + 15 * x) / 8;
      default:
        // Use Rodriguez formula for higher orders (simplified)
        return Math.pow(x, n);
    }
  }

  private getFrequency(): number {
    // Energy levels determine oscillation frequency
    const energy = -13.6 * this.Z * this.Z / (this.n * this.n); // eV
    const angularFrequency = Math.abs(energy) * FUNDAMENTAL_CONSTANTS.ELECTRON_VOLT / FUNDAMENTAL_CONSTANTS.REDUCED_PLANCK_CONSTANT;
    return angularFrequency * 1e-15; // Scale for visualization (femtosecond timescale)
  }

  private getPhase(r: number, theta: number, phi: number): number {
    return r * 0.1 + this.m * phi;
  }

  /**
   * Calculate orbital boundary surface at given probability density
   */
  public getOrbitalBoundary(isoValue: number = 0.05): Array<[number, number, number]> {
    const cacheKey = `${this.n}_${this.l}_${this.m}_${this.Z}_${isoValue}`;
    if (this.boundaryCache.has(cacheKey)) {
      return this.boundaryCache.get(cacheKey)!;
    }

    const boundary: Array<[number, number, number]> = [];
    const maxRadius = this.getCharacteristicRadius() * 5;
    const step = maxRadius / 50;

    // Marching cubes-like algorithm for isosurface extraction
    for (let x = -maxRadius; x <= maxRadius; x += step) {
      for (let y = -maxRadius; y <= maxRadius; y += step) {
        for (let z = -maxRadius; z <= maxRadius; z += step) {
          const density = this.getProbabilityDensity(x, y, z);
          if (Math.abs(density - isoValue) < isoValue * 0.1) {
            boundary.push([x, y, z]);
          }
        }
      }
    }

    this.boundaryCache.set(cacheKey, boundary);
    return boundary;
  }

  /**
   * Calculate nodal surfaces where wave function = 0
   */
  public getNodalSurfaces(): Array<Array<[number, number, number]>> {
    const surfaces: Array<Array<[number, number, number]>> = [];
    const maxRadius = this.getCharacteristicRadius() * 4;
    const step = maxRadius / 30;

    // Radial nodes
    const radialNodes = this.getRadialNodes();
    for (const nodeRadius of radialNodes) {
      const surface: Array<[number, number, number]> = [];
      for (let theta = 0; theta <= Math.PI; theta += Math.PI / 20) {
        for (let phi = 0; phi <= 2 * Math.PI; phi += Math.PI / 20) {
          const x = nodeRadius * Math.sin(theta) * Math.cos(phi);
          const y = nodeRadius * Math.sin(theta) * Math.sin(phi);
          const z = nodeRadius * Math.cos(theta);
          surface.push([x, y, z]);
        }
      }
      if (surface.length > 0) surfaces.push(surface);
    }

    // Angular nodes (nodal planes)
    const angularNodes = this.getAngularNodes();
    for (const plane of angularNodes) {
      const surface: Array<[number, number, number]> = [];
      for (let u = -maxRadius; u <= maxRadius; u += step) {
        for (let v = -maxRadius; v <= maxRadius; v += step) {
          // Calculate point on nodal plane
          const point = this.getPointOnNodalPlane(plane, u, v);
          if (point) surface.push(point);
        }
      }
      if (surface.length > 0) surfaces.push(surface);
    }

    return surfaces;
  }

  private getRadialNodes(): number[] {
    // Number of radial nodes = n - l - 1
    const nodeCount = this.n - this.l - 1;
    const nodes: number[] = [];
    const a0 = this.getCharacteristicRadius();

    // Approximate radial node positions
    for (let i = 1; i <= nodeCount; i++) {
      const nodeRadius = a0 * i * 1.5; // Simplified approximation
      nodes.push(nodeRadius);
    }

    return nodes;
  }

  private getAngularNodes(): Array<{ normal: [number, number, number]; d: number }> {
    const nodes: Array<{ normal: [number, number, number]; d: number }> = [];

    if (this.l === 1) { // p orbitals
      switch (this.m) {
        case -1: // px orbital - nodal plane: yz plane (x = 0)
          nodes.push({ normal: [1, 0, 0], d: 0 });
          break;
        case 0: // pz orbital - nodal plane: xy plane (z = 0)
          nodes.push({ normal: [0, 0, 1], d: 0 });
          break;
        case 1: // py orbital - nodal plane: xz plane (y = 0)
          nodes.push({ normal: [0, 1, 0], d: 0 });
          break;
      }
    } else if (this.l === 2) { // d orbitals
      switch (this.m) {
        case -2: // dxy orbital
          nodes.push({ normal: [1, -1, 0], d: 0 });
          nodes.push({ normal: [1, 1, 0], d: 0 });
          break;
        case -1: // dxz orbital
          nodes.push({ normal: [1, 0, -1], d: 0 });
          nodes.push({ normal: [1, 0, 1], d: 0 });
          break;
        case 0: // dz² orbital - conical nodal surface
          // Simplified as two planes
          nodes.push({ normal: [0, 0, 1], d: 0 });
          break;
        case 1: // dyz orbital
          nodes.push({ normal: [0, 1, -1], d: 0 });
          nodes.push({ normal: [0, 1, 1], d: 0 });
          break;
        case 2: // dx²-y² orbital
          nodes.push({ normal: [1, 1, 0], d: 0 });
          nodes.push({ normal: [1, -1, 0], d: 0 });
          break;
      }
    }

    return nodes;
  }

  private getPointOnNodalPlane(
    plane: { normal: [number, number, number]; d: number },
    u: number,
    v: number
  ): [number, number, number] | null {
    const [nx, ny, nz] = plane.normal;

    // Find a point on the plane: nx*x + ny*y + nz*z = d
    if (Math.abs(nz) > 0.1) {
      // Solve for z
      const z = (plane.d - nx * u - ny * v) / nz;
      return [u, v, z];
    } else if (Math.abs(ny) > 0.1) {
      // Solve for y
      const y = (plane.d - nx * u - nz * v) / ny;
      return [u, y, v];
    } else if (Math.abs(nx) > 0.1) {
      // Solve for x
      const x = (plane.d - ny * u - nz * v) / nx;
      return [x, u, v];
    }

    return null;
  }
}

export class HydrogenlikeIonWaveFunction extends HydrogenWaveFunction {
  constructor(
    n: number,
    l: number,
    m: number,
    Z: number,
    private screeningConstant: number = 0
  ) {
    const effectiveZ = Math.max(1, Z - screeningConstant);
    super(n, l, m, effectiveZ);
  }
}

export class HybridOrbitalWaveFunction implements WaveFunction {
  private hybridComponents: HydrogenWaveFunction[];
  private coefficients: number[];

  constructor(
    hybridType: 'sp' | 'sp2' | 'sp3' | 'dsp3' | 'd2sp3',
    Z: number = 1
  ) {
    this.hybridComponents = [];
    this.coefficients = [];

    switch (hybridType) {
      case 'sp':
        this.hybridComponents = [
          new HydrogenWaveFunction(2, 0, 0, Z), // 2s
          new HydrogenWaveFunction(2, 1, 0, Z)  // 2pz
        ];
        this.coefficients = [1/Math.sqrt(2), 1/Math.sqrt(2)];
        break;

      case 'sp2':
        this.hybridComponents = [
          new HydrogenWaveFunction(2, 0, 0, Z), // 2s
          new HydrogenWaveFunction(2, 1, -1, Z), // 2px
          new HydrogenWaveFunction(2, 1, 1, Z)   // 2py
        ];
        this.coefficients = [1/Math.sqrt(3), 1/Math.sqrt(3), 1/Math.sqrt(3)];
        break;

      case 'sp3':
        this.hybridComponents = [
          new HydrogenWaveFunction(2, 0, 0, Z), // 2s
          new HydrogenWaveFunction(2, 1, -1, Z), // 2px
          new HydrogenWaveFunction(2, 1, 0, Z),  // 2pz
          new HydrogenWaveFunction(2, 1, 1, Z)   // 2py
        ];
        this.coefficients = [0.5, 0.5, 0.5, 0.5];
        break;

      case 'dsp3':
        this.hybridComponents = [
          new HydrogenWaveFunction(3, 2, 0, Z),  // 3dz²
          new HydrogenWaveFunction(3, 0, 0, Z),  // 3s
          new HydrogenWaveFunction(3, 1, -1, Z), // 3px
          new HydrogenWaveFunction(3, 1, 0, Z),  // 3pz
          new HydrogenWaveFunction(3, 1, 1, Z)   // 3py
        ];
        this.coefficients = [1/Math.sqrt(5), 1/Math.sqrt(5), 1/Math.sqrt(5), 1/Math.sqrt(5), 1/Math.sqrt(5)];
        break;

      case 'd2sp3':
        this.hybridComponents = [
          new HydrogenWaveFunction(3, 2, -2, Z), // 3dxy
          new HydrogenWaveFunction(3, 2, 0, Z),  // 3dz²
          new HydrogenWaveFunction(3, 0, 0, Z),  // 3s
          new HydrogenWaveFunction(3, 1, -1, Z), // 3px
          new HydrogenWaveFunction(3, 1, 0, Z),  // 3pz
          new HydrogenWaveFunction(3, 1, 1, Z)   // 3py
        ];
        this.coefficients = Array(6).fill(1/Math.sqrt(6));
        break;
    }
  }

  getValue(x: number, y: number, z: number, time: number): number {
    let result = 0;
    for (let i = 0; i < this.hybridComponents.length; i++) {
      result += this.coefficients[i] * this.hybridComponents[i].getValue(x, y, z, time);
    }
    return result;
  }

  getProbabilityDensity(x: number, y: number, z: number): number {
    const value = this.getValue(x, y, z, 0);
    return value * value;
  }

  getCharacteristicRadius(): number {
    return this.hybridComponents[0].getCharacteristicRadius();
  }

  getOrbitalBoundary(isoValue: number): Array<[number, number, number]> {
    const boundary: Array<[number, number, number]> = [];
    const maxRadius = this.getCharacteristicRadius() * 5;
    const step = maxRadius / 30;

    for (let x = -maxRadius; x <= maxRadius; x += step) {
      for (let y = -maxRadius; y <= maxRadius; y += step) {
        for (let z = -maxRadius; z <= maxRadius; z += step) {
          const density = this.getProbabilityDensity(x, y, z);
          if (Math.abs(density - isoValue) < isoValue * 0.1) {
            boundary.push([x, y, z]);
          }
        }
      }
    }

    return boundary;
  }

  getNodalSurfaces(): Array<Array<[number, number, number]>> {
    // Hybrid orbitals generally don't have simple nodal surfaces
    return [];
  }
}

export class WaveFunctionFactory {
  static create(n: number, l: number, m: number, Z: number = 1): WaveFunction {
    return new HydrogenWaveFunction(n, l, m, Z);
  }

  static createFromConfiguration(config: { n: number; l: number; m: number }, Z: number = 1): WaveFunction {
    return new HydrogenWaveFunction(config.n, config.l, config.m, Z);
  }

  static createFromQuantumNumbers(quantum: QuantumNumbers, Z: number = 1): WaveFunction {
    return new HydrogenWaveFunction(quantum.n, quantum.l, quantum.m, Z);
  }

  static createHydrogenlikeIon(
    n: number,
    l: number,
    m: number,
    Z: number,
    screening: number = 0
  ): WaveFunction {
    return new HydrogenlikeIonWaveFunction(n, l, m, Z, screening);
  }

  static createHybridOrbital(
    hybridType: 'sp' | 'sp2' | 'sp3' | 'dsp3' | 'd2sp3',
    Z: number = 1
  ): WaveFunction {
    return new HybridOrbitalWaveFunction(hybridType, Z);
  }

  static createMultiElectronOrbital(
    electrons: ElectronState[],
    Z: number
  ): WaveFunction {
    // For multi-electron atoms, use Slater determinants
    // This is a simplified implementation
    if (electrons.length === 0) {
      throw new Error('No electrons provided for multi-electron orbital');
    }

    const representative = electrons[0];
    return new HydrogenWaveFunction(
      representative.quantum.n,
      representative.quantum.l,
      representative.quantum.m,
      Z
    );
  }

  static getAllOrbitalTypes(maxN: number = 7): Array<{ n: number; l: number; label: string }> {
    const orbitals: Array<{ n: number; l: number; label: string }> = [];
    const labels = ['s', 'p', 'd', 'f', 'g', 'h', 'i'];

    for (let n = 1; n <= maxN; n++) {
      for (let l = 0; l < n && l < labels.length; l++) {
        orbitals.push({
          n,
          l,
          label: `${n}${labels[l]}`
        });
      }
    }

    return orbitals;
  }

  static getHybridizationTypes(): string[] {
    return ['sp', 'sp2', 'sp3', 'dsp3', 'd2sp3'];
  }
}