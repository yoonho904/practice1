/**
 * Core quantum mechanics type definitions
 * These types form the foundation of all quantum calculations
 */

/**
 * Quantum numbers that uniquely define an atomic orbital
 */
export interface QuantumNumbers {
  /** Principal quantum number (n ≥ 1) */
  readonly n: number;
  /** Angular momentum quantum number (0 ≤ l < n) */
  readonly l: number;
  /** Magnetic quantum number (-l ≤ m ≤ l) */
  readonly m: number;
  /** Spin quantum number (±1/2) */
  readonly s: 0.5 | -0.5;
}

/**
 * Physical constants used in quantum calculations
 * All values in SI units unless otherwise specified
 */
export interface PhysicalConstants {
  /** Planck constant (J⋅s) */
  readonly h: number;
  /** Reduced Planck constant (J⋅s) */
  readonly hbar: number;
  /** Elementary charge (C) */
  readonly e: number;
  /** Electron rest mass (kg) */
  readonly me: number;
  /** Bohr radius (m) */
  readonly a0: number;
  /** Hartree energy (J) */
  readonly Eh: number;
  /** Speed of light (m/s) */
  readonly c: number;
  /** Vacuum permittivity (F/m) */
  readonly epsilon0: number;
}

/**
 * Result of a quantum mechanical calculation
 */
export interface QuantumCalculationResult {
  /** Calculated energy (Hartree) */
  readonly energy: number;
  /** Wave function values at sample points */
  readonly waveFunction?: Float64Array;
  /** Probability density values */
  readonly probabilityDensity?: Float64Array;
  /** Orbital coefficients for multi-electron systems */
  readonly orbitalCoefficients?: Float64Array;
  /** Calculation metadata */
  readonly metadata: CalculationMetadata;
}

/**
 * Metadata about a quantum calculation
 */
export interface CalculationMetadata {
  /** Method used for calculation */
  readonly method: string;
  /** Atomic number */
  readonly atomicNumber: number;
  /** Ion charge */
  readonly ionCharge: number;
  /** Calculation accuracy achieved */
  readonly accuracy: number;
  /** Computation time (ms) */
  readonly computationTime: number;
  /** Whether calculation converged */
  readonly converged: boolean;
  /** Number of iterations required */
  readonly iterations: number;
}

/**
 * Configuration for quantum calculations
 */
export interface CalculationConfig {
  /** Target accuracy for iterative methods */
  readonly accuracy: number;
  /** Maximum iterations allowed */
  readonly maxIterations: number;
  /** Atomic number of the element */
  readonly atomicNumber: number;
  /** Ion charge (0 for neutral atoms) */
  readonly ionCharge: number;
  /** Quantum numbers for the orbital */
  readonly quantumNumbers: QuantumNumbers;
  /** Additional method-specific options */
  readonly methodOptions?: Record<string, unknown>;
}

/**
 * Physical constants in SI units
 * Values from CODATA 2018 recommendations
 */
export const PHYSICAL_CONSTANTS: PhysicalConstants = {
  h: 6.62607015e-34, // Planck constant (J⋅s)
  hbar: 1.054571817e-34, // Reduced Planck constant (J⋅s)
  e: 1.602176634e-19, // Elementary charge (C)
  me: 9.1093837015e-31, // Electron rest mass (kg)
  a0: 5.29177210903e-11, // Bohr radius (m)
  Eh: 4.3597447222071e-18, // Hartree energy (J)
  c: 299792458, // Speed of light (m/s)
  epsilon0: 8.8541878128e-12, // Vacuum permittivity (F/m)
} as const;

/**
 * Validates quantum numbers according to quantum mechanical selection rules
 * @param qn Quantum numbers to validate
 * @returns true if quantum numbers are valid, false otherwise
 */
export function validateQuantumNumbers(qn: QuantumNumbers): boolean {
  // Principal quantum number must be positive integer
  if (!Number.isInteger(qn.n) || qn.n < 1) {
    return false;
  }

  // Angular momentum quantum number constraints: 0 ≤ l < n
  if (!Number.isInteger(qn.l) || qn.l < 0 || qn.l >= qn.n) {
    return false;
  }

  // Magnetic quantum number constraints: -l ≤ m ≤ l
  if (!Number.isInteger(qn.m) || Math.abs(qn.m) > qn.l) {
    return false;
  }

  // Spin quantum number must be ±1/2
  if (qn.s !== 0.5 && qn.s !== -0.5) {
    return false;
  }

  return true;
}