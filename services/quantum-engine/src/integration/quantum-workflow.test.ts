/**
 * Integration tests for the complete quantum calculation workflow
 * These tests verify that all components work together correctly
 */

import { describe, expect, it } from 'vitest';

import type { CalculationConfig } from '../types/quantum-types.js';
import { HydrogenLikeAtom } from '../models/hydrogen-like.js';
import { MethodSelector } from '../models/method-selector.js';

describe('Quantum Calculation Workflow Integration', () => {
  describe('End-to-End Calculation Pipeline', () => {
    it('should perform complete calculation for hydrogen', async () => {
      // Step 1: Configure calculation
      const config: CalculationConfig = {
        atomicNumber: 1,
        ionCharge: 0,
        quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-10,
        maxIterations: 100,
      };

      // Step 2: Select appropriate method
      const selector = new MethodSelector();
      const method = selector.selectMethod(config);

      // Step 3: Verify correct method was selected
      expect(method.name).toBe('hydrogen-like-exact');
      expect(method.accuracy).toBe('exact');

      // Step 4: Perform calculation with selected method
      const atom = new HydrogenLikeAtom(config.atomicNumber);
      const result = atom.calculateEnergy(config.quantumNumbers);

      // Step 5: Verify results
      expect(result.energy).toBeCloseToQuantum(-0.5, 8); // -13.6 eV = -0.5 Hartree
      expect(result.metadata.method).toBe('hydrogen-like-exact');
      expect(result.metadata.converged).toBe(true);
      expect(result.metadata.computationTime).toBeLessThan(10); // Should be fast
    });

    it('should handle helium ion (He+) correctly', () => {
      const config: CalculationConfig = {
        atomicNumber: 2,
        ionCharge: 1, // He+ has 1 electron
        quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-10,
        maxIterations: 100,
      };

      const selector = new MethodSelector();
      const method = selector.selectMethod(config);

      // Should select exact method for single-electron system
      expect(method.name).toBe('hydrogen-like-exact');

      const atom = new HydrogenLikeAtom(config.atomicNumber);
      const result = atom.calculateEnergy(config.quantumNumbers);

      // He+ energy should be Z² times hydrogen: -2.0 Hartree
      expect(result.energy).toBeCloseToQuantum(-2.0, 8);
    });

    it('should select different method for neutral helium', () => {
      const config: CalculationConfig = {
        atomicNumber: 2,
        ionCharge: 0, // Neutral He has 2 electrons
        quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-6,
        maxIterations: 100,
      };

      const selector = new MethodSelector();
      const method = selector.selectMethod(config);

      // Should NOT select exact method for multi-electron system
      expect(method.name).toBe('hartree-fock');
      expect(method.handlesElectronCorrelation).toBe(false);
    });

    it('should escalate method when requested', () => {
      const config: CalculationConfig = {
        atomicNumber: 3,
        ionCharge: 0,
        quantumNumbers: { n: 2, l: 0, m: 0, s: 0.5 },
        accuracy: 1e-6,
        maxIterations: 100,
        methodOptions: { previousMethodFailed: 'hartree-fock' },
      };

      const selector = new MethodSelector();
      const method = selector.selectMethod(config);

      // Should escalate to DFT
      expect(method.name).toBe('dft');
      expect(method.handlesElectronCorrelation).toBe(true);
    });
  });

  describe('Performance and Scaling', () => {
    it('should handle multiple calculations efficiently', () => {
      const atom = new HydrogenLikeAtom(1);

      const calculations = [
        { n: 1, l: 0, m: 0, s: 0.5 as const },
        { n: 2, l: 0, m: 0, s: 0.5 as const },
        { n: 2, l: 1, m: -1, s: 0.5 as const },
        { n: 2, l: 1, m: 0, s: 0.5 as const },
        { n: 2, l: 1, m: 1, s: 0.5 as const },
      ];

      const startTime = performance.now();

      const results = calculations.map(qn => atom.calculateEnergy(qn));

      const endTime = performance.now();

      // Should complete all calculations quickly
      expect(endTime - startTime).toBeLessThan(10);
      expect(results).toHaveLength(5);

      // All n=2 states should have same energy (degeneracy)
      const n2States = results.slice(1);
      n2States.forEach(result => {
        expect(result.energy).toBeCloseToQuantum(-0.125, 8);
      });
    });

    it('should provide method recommendations for different elements', () => {
      const selector = new MethodSelector();
      const testCases = [
        { element: 1, expectedMethod: 'hydrogen-like-exact' },
        { element: 6, expectedMethod: 'hartree-fock' },
        { element: 26, expectedMethod: 'dft' },
        { element: 79, expectedMethod: 'relativistic-dft' },
      ];

      testCases.forEach(({ element, expectedMethod }) => {
        const config: CalculationConfig = {
          atomicNumber: element,
          ionCharge: 0,
          quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
          accuracy: 1e-6,
          maxIterations: 100,
        };

        const method = selector.selectMethod(config);
        expect(method.name).toBe(expectedMethod);
      });
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate quantum numbers across workflow', () => {
      const atom = new HydrogenLikeAtom(1);
      const invalidQN = { n: 0, l: 0, m: 0, s: 0.5 as const };

      expect(() => atom.calculateEnergy(invalidQN)).toThrow('Invalid quantum numbers');
    });

    it('should validate method-element compatibility', () => {
      const selector = new MethodSelector();

      expect(() => {
        selector.validateMethodForElement('hydrogen-like-exact', 2, 0); // Neutral He
      }).toThrow('Hydrogen-like method not applicable');

      expect(() => {
        selector.validateMethodForElement('hydrogen-like-exact', 1, 0); // H
      }).not.toThrow();
    });
  });

  describe('Scientific Accuracy', () => {
    it('should satisfy fundamental quantum relationships', () => {
      const atom = new HydrogenLikeAtom(1);

      // Test Rydberg formula: 1/λ = R∞ × Z² × (1/n₁² - 1/n₂²)
      const e1 = atom.calculateEnergy({ n: 1, l: 0, m: 0, s: 0.5 });
      const e2 = atom.calculateEnergy({ n: 2, l: 0, m: 0, s: 0.5 });

      const transitionEnergy = e2.energy - e1.energy;

      // Lyman alpha transition: n=2 → n=1
      // Expected: ΔE = -0.125 - (-0.5) = 0.375 Hartree
      expect(transitionEnergy).toBeCloseToQuantum(0.375, 8);
    });

    it('should demonstrate proper Z² scaling for hydrogen-like ions', () => {
      const testCases = [
        { Z: 1, expectedEnergy: -0.5 },    // H
        { Z: 2, expectedEnergy: -2.0 },   // He+
        { Z: 3, expectedEnergy: -4.5 },   // Li2+
      ];

      testCases.forEach(({ Z, expectedEnergy }) => {
        const atom = new HydrogenLikeAtom(Z);
        const result = atom.calculateEnergy({ n: 1, l: 0, m: 0, s: 0.5 });

        expect(result.energy).toBeCloseToQuantum(expectedEnergy, 8);
      });
    });
  });
});
