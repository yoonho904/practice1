/**
 * Tests for quantum method selection system
 * This system chooses the optimal calculation method for each element/ion
 */

import { describe, expect, it } from 'vitest';

import type { CalculationConfig } from '../types/quantum-types.js';
import { MethodSelector, type QuantumMethod } from './method-selector.js';

describe('MethodSelector', () => {
  let selector: MethodSelector;

  beforeEach(() => {
    selector = new MethodSelector();
  });

  describe('Hydrogen-like systems', () => {
    it('should select exact method for hydrogen (Z=1)', () => {
      const config: CalculationConfig = {
        atomicNumber: 1,
        ionCharge: 0,
        quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-10,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('hydrogen-like-exact');
      expect(method.accuracy).toBe('exact');
      expect(method.computationalCost).toBe('low');
    });

    it('should select exact method for He+ (Z=2, charge=1)', () => {
      const config: CalculationConfig = {
        atomicNumber: 2,
        ionCharge: 1, // He+ has 1 electron
        quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-10,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('hydrogen-like-exact');
      expect(method.applicableElements).toContain(2);
    });

    it('should select exact method for Li2+ (Z=3, charge=2)', () => {
      const config: CalculationConfig = {
        atomicNumber: 3,
        ionCharge: 2, // Li2+ has 1 electron
        quantumNumbers: { n: 2, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-10,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('hydrogen-like-exact');
    });
  });

  describe('Light multi-electron atoms', () => {
    it('should select Hartree-Fock for neutral helium', () => {
      const config: CalculationConfig = {
        atomicNumber: 2,
        ionCharge: 0, // Neutral He has 2 electrons
        quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-6,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('hartree-fock');
      expect(method.accuracy).toBe('approximate');
      expect(method.computationalCost).toBe('medium');
    });

    it('should select Hartree-Fock for lithium (Z=3)', () => {
      const config: CalculationConfig = {
        atomicNumber: 3,
        ionCharge: 0,
        quantumNumbers: { n: 2, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-6,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('hartree-fock');
    });

    it('should select high-accuracy method for benchmark calculations', () => {
      const config: CalculationConfig = {
        atomicNumber: 4, // Beryllium
        ionCharge: 0,
        quantumNumbers: { n: 2, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-8, // High accuracy requested
        maxIterations: 1000,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('coupled-cluster');
      expect(method.accuracy).toBe('high');
    });
  });

  describe('Transition metals', () => {
    it('should select DFT for iron (Z=26)', () => {
      const config: CalculationConfig = {
        atomicNumber: 26,
        ionCharge: 0,
        quantumNumbers: { n: 3, l: 2, m: 0, s: 0.5 },
        accuracy: 1e-4,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('dft');
      expect(method.functional).toBe('B3LYP'); // Default hybrid functional
    });

    it('should handle different oxidation states', () => {
      const config: CalculationConfig = {
        atomicNumber: 26, // Iron
        ionCharge: 2, // Fe2+
        quantumNumbers: { n: 3, l: 2, m: 0, s: 0.5 },
        accuracy: 1e-4,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('dft');
      expect(method.applicableElements).toContain(26);
    });
  });

  describe('Heavy elements', () => {
    it('should select relativistic DFT for gold (Z=79)', () => {
      const config: CalculationConfig = {
        atomicNumber: 79,
        ionCharge: 0,
        quantumNumbers: { n: 6, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-3,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('relativistic-dft');
      expect(method.relativisticEffects).toBe(true);
    });

    it('should use effective core potentials for heavy elements', () => {
      const config: CalculationConfig = {
        atomicNumber: 92, // Uranium
        ionCharge: 0,
        quantumNumbers: { n: 7, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-3,
        maxIterations: 100,
      };

      const method = selector.selectMethod(config);

      expect(method.name).toBe('relativistic-dft');
      expect(method.effectiveCoreActivated).toBe(true);
    });
  });

  describe('Performance optimization', () => {
    it('should respect computational budget constraints', () => {
      const config: CalculationConfig = {
        atomicNumber: 26,
        ionCharge: 0,
        quantumNumbers: { n: 4, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-2, // Low accuracy for speed
        maxIterations: 10,
        methodOptions: { computationalBudget: 'low' },
      };

      const method = selector.selectMethod(config);

      expect(method.computationalCost).toBe('low');
    });

    it('should escalate method for convergence issues', () => {
      // Simulate a case where initial method failed to converge
      const config: CalculationConfig = {
        atomicNumber: 25, // Manganese (known for convergence issues)
        ionCharge: 0,
        quantumNumbers: { n: 3, l: 2, m: 0, s: 0.5 },
        accuracy: 1e-6,
        maxIterations: 100,
        methodOptions: { previousMethodFailed: 'hartree-fock' },
      };

      const method = selector.selectMethod(config);

      expect(method.name).not.toBe('hartree-fock');
      expect(method.computationalCost).not.toBe('low');
    });
  });

  describe('Method validation', () => {
    it('should validate method applicability', () => {
      expect(() => {
        selector.validateMethodForElement('hydrogen-like-exact', 2, 0); // Neutral He
      }).toThrow('Hydrogen-like method not applicable');
    });

    it('should accept valid method-element combinations', () => {
      expect(() => {
        selector.validateMethodForElement('hydrogen-like-exact', 1, 0); // H
      }).not.toThrow();

      expect(() => {
        selector.validateMethodForElement('dft', 26, 0); // Fe
      }).not.toThrow();
    });
  });

  describe('Method properties', () => {
    it('should provide correct method metadata', () => {
      const method = selector.getMethodInfo('hartree-fock');

      expect(method).toEqual({
        name: 'hartree-fock',
        accuracy: 'approximate',
        computationalCost: 'medium',
        applicableElements: expect.arrayContaining([2, 3, 4, 5, 6, 7, 8, 9, 10]),
        scalingWithElectrons: 'N^4',
        requiresBasisSet: true,
        handlesElectronCorrelation: false,
      });
    });

    it('should provide correct DFT method metadata', () => {
      const method = selector.getMethodInfo('dft');

      expect(method.handlesElectronCorrelation).toBe(true);
      expect(method.scalingWithElectrons).toBe('N^3');
      expect(method.requiresBasisSet).toBe(true);
    });
  });
});