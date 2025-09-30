import { describe, it, expect, beforeEach } from 'vitest';
import { ScientificValidator } from '../../validation/ScientificValidator';
import { validateQuantumNumbers, calculateOrbitalEnergy } from '../../constants/PhysicalConstants';
import { testAtomicData, scientificAssertions } from '../../test-utils/TestingFramework';

describe('ScientificValidator', () => {
  let validator: ScientificValidator;

  beforeEach(() => {
    validator = ScientificValidator.getInstance();
    validator.clearCache(); // Ensure clean state
  });

  describe('orbital validation', () => {
    it('should validate correct orbital data', () => {
      const orbital = {
        n: 2,
        l: 1,
        m: 0,
        electronCount: 1,
        energy: calculateOrbitalEnergy(2, 1),
        radius: 2.12, // Approximate 2p orbital radius in Bohr radii
        probability: [0.3, 0.4, 0.3] // Normalized to electron count = 1
      };

      const result = validator.validateOrbital(orbital);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should reject invalid quantum numbers', () => {
      const invalidOrbitals = [
        { n: 0, l: 0, m: 0, electronCount: 1 }, // n must be > 0
        { n: 2, l: 2, m: 0, electronCount: 1 }, // l must be < n
        { n: 2, l: 1, m: 2, electronCount: 1 }, // |m| must be <= l
        { n: 1, l: 0, m: 0, electronCount: 3 }  // max 2 electrons per orbital
      ];

      invalidOrbitals.forEach((orbital, index) => {
        const result = validator.validateOrbital(orbital);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('should detect unnormalized probability distributions', () => {
      const orbital = {
        n: 1,
        l: 0,
        m: 0,
        electronCount: 1,
        probability: [0.1, 0.2, 0.3] // Sum = 0.6, should be 1.0
      };

      const result = validator.validateOrbital(orbital);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('Probability density not normalized')
      )).toBe(true);
    });

    it('should detect negative probability densities', () => {
      const orbital = {
        n: 1,
        l: 0,
        m: 0,
        electronCount: 1,
        probability: [0.5, -0.2, 0.7] // Negative probability
      };

      const result = validator.validateOrbital(orbital);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('Negative probability densities')
      )).toBe(true);
    });

    it('should warn about unusual orbital radii', () => {
      const orbital = {
        n: 1,
        l: 0,
        m: 0,
        electronCount: 1,
        radius: 100 // Unrealistically large for 1s orbital
      };

      const result = validator.validateOrbital(orbital);

      expect(result.warnings.some(warning =>
        warning.includes('Orbital radius unusual')
      )).toBe(true);
      expect(result.confidence).toBeLessThan(1.0);
    });
  });

  describe('atomic validation', () => {
    it('should validate hydrogen atom correctly', () => {
      const hydrogenAtom = {
        atomicNumber: 1,
        massNumber: 1,
        electronConfiguration: testAtomicData.hydrogen.electronConfiguration,
        orbitals: [{
          n: 1,
          l: 0,
          m: 0,
          electronCount: 1
        }]
      };

      const result = validator.validateAtom(hydrogenAtom);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should validate carbon atom correctly', () => {
      const carbonAtom = {
        atomicNumber: 6,
        massNumber: 12,
        electronConfiguration: testAtomicData.carbon.electronConfiguration,
        orbitals: [
          { n: 1, l: 0, m: 0, electronCount: 2 },
          { n: 2, l: 0, m: 0, electronCount: 2 },
          { n: 2, l: 1, m: -1, electronCount: 1 },
          { n: 2, l: 1, m: 0, electronCount: 1 }
        ]
      };

      const result = validator.validateAtom(carbonAtom);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid atomic numbers', () => {
      const invalidAtoms = [
        { atomicNumber: 0, massNumber: 1 },
        { atomicNumber: 119, massNumber: 300 }, // Beyond known elements
        { atomicNumber: -1, massNumber: 1 }
      ];

      invalidAtoms.forEach(atom => {
        const fullAtom = {
          ...atom,
          electronConfiguration: [],
          orbitals: []
        };

        const result = validator.validateAtom(fullAtom);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error =>
          error.includes('Invalid atomic number')
        )).toBe(true);
      });
    });

    it('should detect electron count mismatches', () => {
      const atom = {
        atomicNumber: 6,
        massNumber: 12,
        electronConfiguration: testAtomicData.hydrogen.electronConfiguration, // Wrong config
        orbitals: [{ n: 1, l: 0, m: 0, electronCount: 2 }]
      };

      const result = validator.validateAtom(atom);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('Electron count mismatch')
      )).toBe(true);
    });

    it('should warn about unusual isotopes', () => {
      const atom = {
        atomicNumber: 1,
        massNumber: 5, // Highly unusual for hydrogen
        electronConfiguration: testAtomicData.hydrogen.electronConfiguration,
        orbitals: [{ n: 1, l: 0, m: 0, electronCount: 1 }]
      };

      const result = validator.validateAtom(atom);

      expect(result.warnings.some(warning =>
        warning.includes('neutron/proton ratio')
      )).toBe(true);
    });
  });

  describe('energy validation', () => {
    it('should validate hydrogen-like orbital energies', () => {
      const testCases = [
        { n: 1, l: 0, Z: 1 },
        { n: 2, l: 0, Z: 1 },
        { n: 2, l: 1, Z: 1 },
        { n: 3, l: 0, Z: 6 } // Carbon-like
      ];

      testCases.forEach(({ n, l, Z }) => {
        const theoreticalEnergy = calculateOrbitalEnergy(n, Z);
        const result = validator.validateOrbitalEnergy(n, l, Z, theoreticalEnergy);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject positive energies for bound states', () => {
      const result = validator.validateOrbitalEnergy(1, 0, 1, 5.0); // Positive energy

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('Positive orbital energy')
      )).toBe(true);
    });

    it('should warn about large deviations from hydrogen model', () => {
      const theoreticalEnergy = calculateOrbitalEnergy(1, 1);
      const deviatedEnergy = theoreticalEnergy * 2; // 100% deviation

      const result = validator.validateOrbitalEnergy(1, 0, 1, deviatedEnergy);

      expect(result.warnings.some(warning =>
        warning.includes('Large deviation from hydrogen-like model')
      )).toBe(true);
    });

    it('should check energy ordering', () => {
      const e1s = calculateOrbitalEnergy(1, 1);
      const e2s = calculateOrbitalEnergy(2, 1);

      // Should not warn for correct ordering
      const result2s = validator.validateOrbitalEnergy(2, 0, 1, e2s);
      expect(result2s.warnings.length).toBe(0);

      // Should warn for incorrect ordering
      const resultWrong = validator.validateOrbitalEnergy(2, 0, 1, e1s - 1); // Lower than 1s
      expect(resultWrong.warnings.some(warning =>
        warning.includes('Energy ordering violation')
      )).toBe(true);
    });
  });

  describe('numerical stability validation', () => {
    it('should detect NaN and Infinity values', () => {
      const invalidValues = [1, 2, NaN, 4, Infinity, 6];

      const result = validator.validateNumericalStability(
        invalidValues,
        [0, 10],
        'test values'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error =>
        error.includes('invalid test values (NaN/Infinity)')
      )).toBe(true);
    });

    it('should warn about out-of-range values', () => {
      const values = [1, 2, 3, 15, 4, 5]; // 15 is out of range [0, 10]

      const result = validator.validateNumericalStability(
        values,
        [0, 10],
        'test values'
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning =>
        warning.includes('outside expected range')
      )).toBe(true);
    });

    it('should handle high variability data', () => {
      const highVariabilityValues = [1, 1000, 2, 2000, 3]; // Very high coefficient of variation

      const result = validator.validateNumericalStability(
        highVariabilityValues,
        [0, 5000],
        'variable data'
      );

      expect(result.warnings.some(warning =>
        warning.includes('High variability')
      )).toBe(true);
    });
  });

  describe('caching behavior', () => {
    it('should cache validation results', () => {
      const orbital = {
        n: 1,
        l: 0,
        m: 0,
        electronCount: 1
      };

      // First call
      const result1 = validator.validateOrbital(orbital);

      // Second call should return cached result
      const result2 = validator.validateOrbital(orbital);

      expect(result1).toEqual(result2);
    });

    it('should provide cache statistics', () => {
      const stats = validator.getCacheStats();

      expect(stats).toMatchObject({
        size: expect.any(Number),
        hitRate: expect.any(Number)
      });
    });

    it('should clear cache on demand', () => {
      const orbital = {
        n: 1,
        l: 0,
        m: 0,
        electronCount: 1
      };

      validator.validateOrbital(orbital);
      const statsBefore = validator.getCacheStats();

      validator.clearCache();
      const statsAfter = validator.getCacheStats();

      expect(statsAfter.size).toBe(0);
    });
  });
});

describe('Physical Constants Validation Functions', () => {
  describe('validateQuantumNumbers', () => {
    it('should validate correct quantum numbers', () => {
      scientificAssertions.expectValidQuantumNumbers(2, 1, 0);
      scientificAssertions.expectValidQuantumNumbers(3, 2, -1);
      scientificAssertions.expectValidQuantumNumbers(1, 0, 0);
    });

    it('should reject invalid quantum numbers', () => {
      expect(() => scientificAssertions.expectValidQuantumNumbers(0, 0, 0)).toThrow();
      expect(() => scientificAssertions.expectValidQuantumNumbers(2, 2, 0)).toThrow();
      expect(() => scientificAssertions.expectValidQuantumNumbers(2, 1, 2)).toThrow();
    });
  });

  describe('probability validation', () => {
    it('should validate probability densities', () => {
      const validProbabilities = [0.1, 0.5, 0.3, 0.0, 1.0];
      scientificAssertions.expectValidProbabilityDensity(validProbabilities);
    });

    it('should reject negative probabilities', () => {
      const invalidProbabilities = [0.1, -0.2, 0.3];
      expect(() =>
        scientificAssertions.expectValidProbabilityDensity(invalidProbabilities)
      ).toThrow();
    });

    it('should validate normalized probabilities', () => {
      const normalizedProbs = [0.3, 0.4, 0.3];
      scientificAssertions.expectNormalizedProbability(normalizedProbs);
    });

    it('should reject unnormalized probabilities', () => {
      const unnormalizedProbs = [0.1, 0.2, 0.3]; // Sum = 0.6
      expect(() =>
        scientificAssertions.expectNormalizedProbability(unnormalizedProbs)
      ).toThrow();
    });
  });

  describe('energy ordering validation', () => {
    it('should validate correct energy ordering', () => {
      const correctEnergies = [-13.6, -6.8, -3.4, -1.7]; // Hydrogen-like
      scientificAssertions.expectEnergyOrdering(correctEnergies);
    });

    it('should reject incorrect energy ordering', () => {
      const incorrectEnergies = [-3.4, -6.8, -1.7]; // Wrong order
      expect(() =>
        scientificAssertions.expectEnergyOrdering(incorrectEnergies)
      ).toThrow();
    });
  });
});