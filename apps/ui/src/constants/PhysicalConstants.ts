/**
 * NIST/CODATA 2018 fundamental physical constants
 * All values are in SI units unless otherwise specified
 * Source: https://physics.nist.gov/cuu/Constants/
 */

export const FUNDAMENTAL_CONSTANTS = {
  // Universal constants
  SPEED_OF_LIGHT: 299792458, // m/s (exact)
  PLANCK_CONSTANT: 6.62607015e-34, // J⋅Hz⁻¹ (exact)
  REDUCED_PLANCK_CONSTANT: 1.054571817e-34, // J⋅s
  ELEMENTARY_CHARGE: 1.602176634e-19, // C (exact)
  VACUUM_PERMEABILITY: 1.25663706212e-6, // N⋅A⁻²
  VACUUM_PERMITTIVITY: 8.8541878128e-12, // F⋅m⁻¹

  // Atomic constants
  FINE_STRUCTURE_CONSTANT: 7.2973525693e-3, // dimensionless
  BOHR_RADIUS: 5.29177210903e-11, // m
  ELECTRON_MASS: 9.1093837015e-31, // kg
  PROTON_MASS: 1.67262192369e-27, // kg
  NEUTRON_MASS: 1.67492749804e-27, // kg
  ATOMIC_MASS_UNIT: 1.66053906660e-27, // kg
  AVOGADRO_CONSTANT: 6.02214076e23, // mol⁻¹ (exact)

  // Energy conversion factors
  ELECTRON_VOLT: 1.602176634e-19, // J (exact)
  HARTREE_ENERGY: 4.3597447222071e-18, // J
  RYDBERG_ENERGY: 2.1798723611035e-18, // J

  // Temperature and thermodynamics
  BOLTZMANN_CONSTANT: 1.380649e-23, // J⋅K⁻¹ (exact)
  GAS_CONSTANT: 8.314462618, // J⋅mol⁻¹⋅K⁻¹ (exact)
  STEFAN_BOLTZMANN_CONSTANT: 5.670374419e-8, // W⋅m⁻²⋅K⁻⁴

  // Uncertainty values (relative standard uncertainty)
  UNCERTAINTIES: {
    REDUCED_PLANCK_CONSTANT: 0, // exact
    BOHR_RADIUS: 1.5e-10,
    ELECTRON_MASS: 3.0e-10,
    PROTON_MASS: 3.1e-10,
    NEUTRON_MASS: 5.7e-10,
    FINE_STRUCTURE_CONSTANT: 1.5e-10,
    HARTREE_ENERGY: 1.0e-10,
  }
} as const;

export const ATOMIC_CONSTANTS = {
  // Orbital quantum numbers constraints
  MAX_PRINCIPAL_QUANTUM_NUMBER: 7, // For ground state atoms
  MAX_AZIMUTHAL_QUANTUM_NUMBER: 4, // f orbitals (l = 3)

  // Orbital capacities
  ORBITAL_CAPACITIES: {
    s: 2, // l = 0
    p: 6, // l = 1
    d: 10, // l = 2
    f: 14, // l = 3
  },

  // Spin quantum number
  ELECTRON_SPIN: 0.5,

  // Pauli exclusion principle
  MAX_ELECTRONS_PER_ORBITAL: 2,

  // Aufbau principle ordering (simplified)
  ORBITAL_FILLING_ORDER: [
    '1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'
  ],
} as const;

export const VISUALIZATION_CONSTANTS = {
  // Unit conversions for visualization
  BOHR_TO_ANGSTROM: 0.529177210903, // Å
  ANGSTROM_TO_METER: 1e-10, // m
  HARTREE_TO_EV: 27.211386245988, // eV

  // Rendering scales
  DEFAULT_ATOMIC_SCALE: 1.0,
  ORBITAL_SCALE_FACTOR: 1.2,
  NUCLEUS_SCALE_FACTOR: 0.15,

  // Probability density thresholds
  ORBITAL_ISOSURFACE_VALUES: [0.01, 0.05, 0.1, 0.3] as const,
  DEFAULT_ISOSURFACE_VALUE: 0.05,

  // Animation parameters
  DEFAULT_ANIMATION_SPEED: 1.0,
  MAX_ANIMATION_SPEED: 10.0,
  MIN_ANIMATION_SPEED: 0.1,

  // Performance limits
  MAX_ORBITAL_SAMPLES: 2000,
  MIN_ORBITAL_SAMPLES: 100,
  DEFAULT_ORBITAL_SAMPLES: 800,
} as const;

export const ERROR_TOLERANCES = {
  // Energy calculations (relative error)
  ENERGY_TOLERANCE: 1e-6, // 1 ppm
  ORBITAL_ENERGY_TOLERANCE: 1e-4, // 0.01%

  // Geometric tolerances
  POSITION_TOLERANCE: 1e-12, // m
  ANGULAR_TOLERANCE: 1e-9, // rad

  // Probability density
  PROBABILITY_TOLERANCE: 1e-10,
  NORMALIZATION_TOLERANCE: 1e-8,

  // Numerical integration
  INTEGRATION_TOLERANCE: 1e-8,
  MAX_INTEGRATION_STEPS: 10000,
} as const;

/**
 * Convert between common units used in atomic physics
 */
export const UnitConverter = {
  bohrToAngstrom: (bohr: number): number => bohr * VISUALIZATION_CONSTANTS.BOHR_TO_ANGSTROM,
  angstromToBohr: (angstrom: number): number => angstrom / VISUALIZATION_CONSTANTS.BOHR_TO_ANGSTROM,
  hartreeToEv: (hartree: number): number => hartree * VISUALIZATION_CONSTANTS.HARTREE_TO_EV,
  evToHartree: (ev: number): number => ev / VISUALIZATION_CONSTANTS.HARTREE_TO_EV,
  kelvinToEv: (kelvin: number): number => kelvin * FUNDAMENTAL_CONSTANTS.BOLTZMANN_CONSTANT / FUNDAMENTAL_CONSTANTS.ELECTRON_VOLT,
  evToKelvin: (ev: number): number => ev * FUNDAMENTAL_CONSTANTS.ELECTRON_VOLT / FUNDAMENTAL_CONSTANTS.BOLTZMANN_CONSTANT,

  // Atomic mass units
  amuToKg: (amu: number): number => amu * FUNDAMENTAL_CONSTANTS.ATOMIC_MASS_UNIT,
  kgToAmu: (kg: number): number => kg / FUNDAMENTAL_CONSTANTS.ATOMIC_MASS_UNIT,
} as const;

/**
 * Validate quantum numbers according to quantum mechanical rules
 */
export function validateQuantumNumbers(n: number, l: number, m: number, s: number = 0.5): boolean {
  // Principal quantum number must be positive integer
  if (!Number.isInteger(n) || n < 1) {
    return false;
  }

  // Azimuthal quantum number constraints: 0 ≤ l < n
  if (!Number.isInteger(l) || l < 0 || l >= n) {
    return false;
  }

  // Magnetic quantum number constraints: -l ≤ m ≤ l
  if (!Number.isInteger(m) || m < -l || m > l) {
    return false;
  }

  // Spin quantum number for electrons: ±1/2
  if (Math.abs(s) !== 0.5) {
    return false;
  }

  return true;
}

/**
 * Calculate theoretical orbital energies using hydrogen-like approximation
 */
export function calculateOrbitalEnergy(n: number, Z: number = 1): number {
  if (n < 1 || Z < 1) {
    throw new Error('Invalid quantum numbers for energy calculation');
  }

  // Hydrogen-like orbital energy: E_n = -Z²R_∞hc/n²
  const rydbergConstant = 1.0973731568160e7; // m⁻¹
  const energy = -Math.pow(Z, 2) * rydbergConstant * FUNDAMENTAL_CONSTANTS.PLANCK_CONSTANT * FUNDAMENTAL_CONSTANTS.SPEED_OF_LIGHT / Math.pow(n, 2);

  return energy; // J
}

/**
 * Validate that an electron configuration follows quantum mechanical rules
 */
export function validateElectronConfiguration(configuration: Array<{ n: number; l: number; m: number; spin: number }>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check Pauli exclusion principle
  const stateMap = new Map<string, number>();

  for (const electron of configuration) {
    const { n, l, m, spin } = electron;

    // Validate individual quantum numbers
    if (!validateQuantumNumbers(n, l, m, spin)) {
      errors.push(`Invalid quantum numbers: n=${n}, l=${l}, m=${m}, s=${spin}`);
      continue;
    }

    // Check Pauli exclusion principle
    const stateKey = `${n}_${l}_${m}_${spin}`;
    const count = stateMap.get(stateKey) || 0;

    if (count >= 1) {
      errors.push(`Pauli exclusion violation: state (${n},${l},${m},${spin}) already occupied`);
    }

    stateMap.set(stateKey, count + 1);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}