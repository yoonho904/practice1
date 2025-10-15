/**
 * Hydrogen-like atom implementation with exact analytical solutions
 * These are the only atoms/ions with exact quantum mechanical solutions
 */

import type {
  QuantumNumbers,
  QuantumCalculationResult,
  CalculationMetadata,
} from '../types/quantum-types.js';
import { validateQuantumNumbers } from '../types/quantum-types.js';

/**
 * Hydrogen-like atom solver using exact analytical solutions
 * Applicable to: H, He+, Li2+, Be3+, etc. (single electron systems)
 */
export class HydrogenLikeAtom {
  private readonly atomicNumber: number;

  /**
   * @param atomicNumber Nuclear charge Z (positive integer)
   */
  constructor(atomicNumber: number) {
    if (!Number.isInteger(atomicNumber) || atomicNumber <= 0) {
      throw new Error('Atomic number must be positive');
    }
    this.atomicNumber = atomicNumber;
  }

  /**
   * Calculate exact energy for hydrogen-like atom
   * E_n = -Z² × (1/2) × (1/n²) Hartree
   */
  calculateEnergy(quantumNumbers: QuantumNumbers): QuantumCalculationResult {
    const startTime = performance.now();

    if (!validateQuantumNumbers(quantumNumbers)) {
      throw new Error('Invalid quantum numbers');
    }

    // Exact analytical formula: E_n = -Z²/(2n²) in Hartree units
    const energy = -(this.atomicNumber ** 2) / (2 * quantumNumbers.n ** 2);

    const metadata: CalculationMetadata = {
      method: 'hydrogen-like-exact',
      atomicNumber: this.atomicNumber,
      ionCharge: this.atomicNumber - 1, // Z-1 for single electron
      accuracy: Number.EPSILON, // Exact solution
      computationTime: performance.now() - startTime,
      converged: true,
      iterations: 1, // Analytical solution requires no iterations
    };

    return {
      energy,
      metadata,
    };
  }

  /**
   * Calculate wave function value at given coordinates
   * Uses exact analytical expressions for hydrogen-like orbitals
   */
  calculateWaveFunction(
    quantumNumbers: QuantumNumbers,
    x: number,
    y: number,
    z: number
  ): number {
    if (!validateQuantumNumbers(quantumNumbers)) {
      throw new Error('Invalid quantum numbers');
    }

    const { n, l, m } = quantumNumbers;
    const r = Math.sqrt(x * x + y * y + z * z);
    const theta = r > 0 ? Math.acos(z / r) : 0;
    const phi = Math.atan2(y, x);

    // Calculate components
    const radialPart = this.calculateRadialWaveFunction(n, l, r);
    const angularPart = this.calculateSphericalHarmonic(l, m, theta, phi);

    return radialPart * angularPart;
  }

  /**
   * Calculate probability density |ψ|² at given coordinates
   */
  calculateProbabilityDensity(
    quantumNumbers: QuantumNumbers,
    x: number,
    y: number,
    z: number
  ): number {
    const psi = this.calculateWaveFunction(quantumNumbers, x, y, z);
    return psi * psi;
  }

  /**
   * Calculate radial part of hydrogen-like wave function
   * R_nl(r) = normalization × (2Z/na₀)^(3/2) × polynomial × exp(-Zr/na₀)
   */
  private calculateRadialWaveFunction(n: number, l: number, r: number): number {
    const Z = this.atomicNumber;
    const a0 = 1.0; // Atomic units (Bohr radius = 1)
    const rho = (2 * Z * r) / (n * a0);

    // For 1s orbital, use exact analytical form
    if (n === 1 && l === 0) {
      const normalization = 2 * Math.pow(Z / a0, 1.5);
      return normalization * Math.exp(-Z * r / a0);
    }

    // For other orbitals, use general formula
    const normalization = Math.sqrt(
      ((2 * Z) / (n * a0)) ** 3 * this.factorial(n - l - 1) / (2 * n * this.factorial(n + l))
    );

    // Associated Laguerre polynomial L_{n-l-1}^{2l+1}(ρ)
    const laguerrePolynomial = this.associatedLaguerre(n - l - 1, 2 * l + 1, rho);

    // Exponential decay
    const exponential = Math.exp(-rho / 2);

    // Power term
    const powerTerm = Math.pow(rho, l);

    return normalization * powerTerm * exponential * laguerrePolynomial;
  }

  /**
   * Calculate spherical harmonic Y_l^m(θ,φ) with proper normalization
   * Real spherical harmonics (linear combinations for visualization)
   */
  private calculateSphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
    // For s orbitals (l=0, m=0), Y_0^0 = 1/√(4π)
    if (l === 0 && m === 0) {
      return 1 / Math.sqrt(4 * Math.PI);
    }

    // Use real spherical harmonics for better visualization
    // These are linear combinations of complex spherical harmonics
    const absM = Math.abs(m);

    // Normalization constant (includes sqrt(2) for m≠0 real harmonics)
    const sqrtFactor = m !== 0 ? Math.sqrt(2) : 1;
    const normalization = sqrtFactor * Math.sqrt(
      ((2 * l + 1) * this.factorial(l - absM)) / (4 * Math.PI * this.factorial(l + absM))
    );

    // Associated Legendre polynomial
    const legendre = this.associatedLegendre(l, absM, Math.cos(theta));

    // Azimuthal part (real spherical harmonics)
    const azimuthal = m > 0 ? Math.cos(m * phi) : (m < 0 ? Math.sin(absM * phi) : 1);

    // Condon-Shortley phase
    const phase = Math.pow(-1, absM);

    return normalization * phase * legendre * azimuthal;
  }

  /**
   * Associated Laguerre polynomial L_n^α(x)
   * Simplified implementation for small n
   */
  private associatedLaguerre(n: number, alpha: number, x: number): number {
    if (n === 0) {return 1;}
    if (n === 1) {return 1 + alpha - x;}
    if (n === 2) {return ((2 + alpha - x) * (1 + alpha - x) - x) / 2;}

    // For higher orders, use recurrence relation
    // This is a simplified implementation - full version would be more extensive
    let L0 = 1;
    let L1 = 1 + alpha - x;

    for (let i = 2; i <= n; i++) {
      const L2 = ((2 * i - 1 + alpha - x) * L1 - (i - 1 + alpha) * L0) / i;
      L0 = L1;
      L1 = L2;
    }

    return L1;
  }

  /**
   * Associated Legendre polynomial P_l^m(x) using recurrence relations
   * General implementation for all l and m values
   */
  private associatedLegendre(l: number, m: number, x: number): number {
    // Handle base cases
    if (m < 0 || m > l) {return 0;}
    if (l === 0 && m === 0) {return 1;}

    // Compute P_m^m(x) using the base formula
    // P_m^m(x) = (-1)^m * (2m-1)!! * (1-x²)^(m/2)
    const sinTheta = Math.sqrt(1 - x * x);
    let pmm = 1.0;

    if (m > 0) {
      const somx2 = sinTheta;
      let fact = 1.0;
      for (let i = 1; i <= m; i++) {
        pmm *= -fact * somx2;
        fact += 2.0;
      }
    }

    if (l === m) {return pmm;}

    // Compute P_{m+1}^m(x) using recurrence
    // P_{m+1}^m(x) = x * (2m+1) * P_m^m(x)
    let pmmp1 = x * (2 * m + 1) * pmm;

    if (l === m + 1) {return pmmp1;}

    // Compute P_l^m(x) using recurrence relation
    // (l-m) * P_l^m(x) = x * (2l-1) * P_{l-1}^m(x) - (l+m-1) * P_{l-2}^m(x)
    let pll = 0.0;
    for (let ll = m + 2; ll <= l; ll++) {
      pll = (x * (2 * ll - 1) * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
      pmm = pmmp1;
      pmmp1 = pll;
    }

    return pll;
  }

  /**
   * Factorial function for normalization constants
   */
  private factorial(n: number): number {
    if (n < 0) {throw new Error('Factorial of negative number');}
    if (n === 0 || n === 1) {return 1;}

    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }
}
