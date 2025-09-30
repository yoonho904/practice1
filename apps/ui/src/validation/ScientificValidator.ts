import { FUNDAMENTAL_CONSTANTS, ERROR_TOLERANCES, calculateOrbitalEnergy, validateQuantumNumbers, validateElectronConfiguration, UnitConverter } from '../constants/PhysicalConstants';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number; // 0-1, confidence in the validation
}

export interface OrbitalValidationData {
  n: number;
  l: number;
  m: number;
  electronCount: number;
  energy?: number;
  radius?: number;
  probability?: number[];
}

export interface AtomValidationData {
  atomicNumber: number;
  massNumber: number;
  electronConfiguration: Array<{ n: number; l: number; m: number; spin: number }>;
  orbitals: OrbitalValidationData[];
}

export class ScientificValidator {
  private static instance: ScientificValidator;
  private validationCache = new Map<string, ValidationResult>();

  private constructor() {}

  static getInstance(): ScientificValidator {
    if (!ScientificValidator.instance) {
      ScientificValidator.instance = new ScientificValidator();
    }
    return ScientificValidator.instance;
  }

  /**
   * Validate atomic orbital data against quantum mechanical principles
   */
  validateOrbital(orbital: OrbitalValidationData): ValidationResult {
    const cacheKey = `orbital_${orbital.n}_${orbital.l}_${orbital.m}_${orbital.electronCount}`;
    const cached = this.validationCache.get(cacheKey);
    if (cached) return cached;

    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;

    // Basic quantum number validation
    if (!validateQuantumNumbers(orbital.n, orbital.l, orbital.m)) {
      errors.push(`Invalid quantum numbers: n=${orbital.n}, l=${orbital.l}, m=${orbital.m}`);
      confidence *= 0.1;
    }

    // Electron count validation
    const maxElectrons = 2; // Pauli exclusion principle
    if (orbital.electronCount < 0 || orbital.electronCount > maxElectrons) {
      errors.push(`Invalid electron count: ${orbital.electronCount}. Must be 0-${maxElectrons}`);
      confidence *= 0.3;
    }

    // Energy validation (if provided)
    if (orbital.energy !== undefined) {
      const theoreticalEnergy = calculateOrbitalEnergy(orbital.n, 1); // Hydrogen-like
      const relativeError = Math.abs(orbital.energy - theoreticalEnergy) / Math.abs(theoreticalEnergy);

      if (relativeError > ERROR_TOLERANCES.ORBITAL_ENERGY_TOLERANCE) {
        warnings.push(`Orbital energy deviates significantly from hydrogen-like model: ${(relativeError * 100).toFixed(2)}% error`);
        confidence *= 0.8;
      }
    }

    // Radius validation
    if (orbital.radius !== undefined) {
      const expectedRadius = this.calculateExpectedOrbitalRadius(orbital.n, orbital.l);
      const radiusRatio = orbital.radius / expectedRadius;

      if (radiusRatio < 0.5 || radiusRatio > 2.0) {
        warnings.push(`Orbital radius unusual: ${radiusRatio.toFixed(2)}x expected size`);
        confidence *= 0.9;
      }
    }

    // Probability density validation
    if (orbital.probability && orbital.probability.length > 0) {
      const totalProbability = orbital.probability.reduce((sum, p) => sum + p, 0);
      const probError = Math.abs(totalProbability - orbital.electronCount);

      if (probError > ERROR_TOLERANCES.PROBABILITY_TOLERANCE) {
        errors.push(`Probability density not normalized: total=${totalProbability.toFixed(6)}, expected=${orbital.electronCount}`);
        confidence *= 0.5;
      }

      // Check for negative probabilities
      const negativeProbabilities = orbital.probability.filter(p => p < 0);
      if (negativeProbabilities.length > 0) {
        errors.push(`Negative probability densities found: ${negativeProbabilities.length} points`);
        confidence *= 0.2;
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Validate complete atomic configuration
   */
  validateAtom(atom: AtomValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;

    // Basic atomic data validation
    if (atom.atomicNumber < 1 || atom.atomicNumber > 118) {
      errors.push(`Invalid atomic number: ${atom.atomicNumber}`);
      confidence *= 0.1;
    }

    if (atom.massNumber < atom.atomicNumber) {
      errors.push(`Mass number (${atom.massNumber}) cannot be less than atomic number (${atom.atomicNumber})`);
      confidence *= 0.3;
    }

    // Electron configuration validation
    const configValidation = validateElectronConfiguration(atom.electronConfiguration);
    if (!configValidation.isValid) {
      errors.push(...configValidation.errors);
      confidence *= 0.5;
    }

    // Check total electron count
    const totalElectrons = atom.electronConfiguration.length;
    if (totalElectrons !== atom.atomicNumber) {
      errors.push(`Electron count mismatch: ${totalElectrons} electrons for Z=${atom.atomicNumber}`);
      confidence *= 0.4;
    }

    // Validate individual orbitals
    for (const orbital of atom.orbitals) {
      const orbitalValidation = this.validateOrbital(orbital);

      if (!orbitalValidation.isValid) {
        errors.push(...orbitalValidation.errors.map(e => `Orbital (${orbital.n},${orbital.l},${orbital.m}): ${e}`));
      }

      warnings.push(...orbitalValidation.warnings.map(w => `Orbital (${orbital.n},${orbital.l},${orbital.m}): ${w}`));
      confidence *= orbitalValidation.confidence;
    }

    // Nuclear stability checks (simplified)
    const neutronCount = atom.massNumber - atom.atomicNumber;
    const neutronProtonRatio = neutronCount / atom.atomicNumber;

    if (atom.atomicNumber <= 20 && (neutronProtonRatio < 0.8 || neutronProtonRatio > 1.4)) {
      warnings.push(`Unusual neutron/proton ratio: ${neutronProtonRatio.toFixed(2)} (may be unstable)`);
      confidence *= 0.9;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: Math.max(0, confidence)
    };
  }

  /**
   * Validate orbital energy against experimental data
   */
  validateOrbitalEnergy(n: number, l: number, atomicNumber: number, calculatedEnergy: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;

    // Compare with hydrogen-like model (baseline)
    const hydrogenLikeEnergy = calculateOrbitalEnergy(n, atomicNumber);
    const relativeError = Math.abs(calculatedEnergy - hydrogenLikeEnergy) / Math.abs(hydrogenLikeEnergy);

    if (relativeError > 0.5) { // 50% deviation is concerning
      warnings.push(`Large deviation from hydrogen-like model: ${(relativeError * 100).toFixed(1)}%`);
      confidence *= 0.7;
    }

    // Energy should be negative for bound states
    if (calculatedEnergy > 0) {
      errors.push(`Positive orbital energy indicates unbound state: ${calculatedEnergy} J`);
      confidence *= 0.3;
    }

    // Energy ordering: higher n should have higher (less negative) energy
    const lowerShellEnergy = calculateOrbitalEnergy(n - 1, atomicNumber);
    if (n > 1 && calculatedEnergy < lowerShellEnergy) {
      warnings.push(`Energy ordering violation: n=${n} has lower energy than n=${n-1}`);
      confidence *= 0.8;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    };
  }

  /**
   * Calculate expected orbital radius using Bohr model
   */
  private calculateExpectedOrbitalRadius(n: number, l: number): number {
    // Simplified: a₀ * n² / Z (for hydrogen-like atoms)
    // This is a rough approximation; real orbitals have complex shapes
    return FUNDAMENTAL_CONSTANTS.BOHR_RADIUS * n * n;
  }

  /**
   * Validate numerical precision and stability
   */
  validateNumericalStability(
    values: number[],
    expectedRange: [number, number],
    label: string = 'values'
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;

    // Check for NaN or Infinity
    const invalidValues = values.filter(v => !isFinite(v));
    if (invalidValues.length > 0) {
      errors.push(`${invalidValues.length} invalid ${label} (NaN/Infinity)`);
      confidence *= 0.1;
    }

    // Check range
    const outOfRange = values.filter(v => isFinite(v) && (v < expectedRange[0] || v > expectedRange[1]));
    if (outOfRange.length > 0) {
      warnings.push(`${outOfRange.length} ${label} outside expected range [${expectedRange[0]}, ${expectedRange[1]}]`);
      confidence *= 0.9;
    }

    // Check for numerical precision issues
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / Math.abs(mean);

    if (coefficientOfVariation > 100) { // Very high variability might indicate numerical issues
      warnings.push(`High variability in ${label}: CV=${coefficientOfVariation.toFixed(2)}`);
      confidence *= 0.95;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence
    };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.validationCache.size,
      hitRate: 0 // Would need to track hits/misses for actual rate
    };
  }
}

export const scientificValidator = ScientificValidator.getInstance();