/**
 * Tests for hydrogen-like atom calculations
 * These are exact analytical solutions - perfect for validation
 */

import { describe, expect, it } from 'vitest';

import type { QuantumNumbers } from '../types/quantum-types.js';
import { HydrogenLikeAtom } from './hydrogen-like.js';

describe('HydrogenLikeAtom', () => {
  describe('Energy Calculations', () => {
    it('should calculate correct 1s hydrogen energy', () => {
      const hydrogen = new HydrogenLikeAtom(1); // Z = 1 for hydrogen
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      const result = hydrogen.calculateEnergy(quantumNumbers);

      // Expected: -13.6 eV = -0.5 Hartree
      expect(result.energy).toBeCloseToQuantum(-0.5, 8);
      expect(result.metadata.method).toBe('hydrogen-like-exact');
      expect(result.metadata.converged).toBe(true);
    });

    it('should calculate correct 2s hydrogen energy', () => {
      const hydrogen = new HydrogenLikeAtom(1);
      const quantumNumbers: QuantumNumbers = { n: 2, l: 0, m: 0, s: 0.5 };

      const result = hydrogen.calculateEnergy(quantumNumbers);

      // Expected: -3.4 eV = -0.125 Hartree
      expect(result.energy).toBeCloseToQuantum(-0.125, 8);
    });

    it('should calculate correct He+ energy (Z=2)', () => {
      const heliumIon = new HydrogenLikeAtom(2); // Z = 2 for He+
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      const result = heliumIon.calculateEnergy(quantumNumbers);

      // Expected: Z²(-0.5) = 4 * (-0.5) = -2.0 Hartree
      expect(result.energy).toBeCloseToQuantum(-2.0, 8);
    });

    it('should follow n⁻² scaling for principal quantum number', () => {
      const hydrogen = new HydrogenLikeAtom(1);

      const e1s = hydrogen.calculateEnergy({ n: 1, l: 0, m: 0, s: 0.5 });
      const e2s = hydrogen.calculateEnergy({ n: 2, l: 0, m: 0, s: 0.5 });
      const e3s = hydrogen.calculateEnergy({ n: 3, l: 0, m: 0, s: 0.5 });

      // Energy should scale as -1/n²
      expect(e2s.energy / e1s.energy).toBeCloseToQuantum(1/4, 6);
      expect(e3s.energy / e1s.energy).toBeCloseToQuantum(1/9, 6);
    });

    it('should be degenerate in l and m for same n', () => {
      const hydrogen = new HydrogenLikeAtom(1);

      const e2s = hydrogen.calculateEnergy({ n: 2, l: 0, m: 0, s: 0.5 });
      const e2px = hydrogen.calculateEnergy({ n: 2, l: 1, m: 1, s: 0.5 });
      const e2py = hydrogen.calculateEnergy({ n: 2, l: 1, m: -1, s: 0.5 });
      const e2pz = hydrogen.calculateEnergy({ n: 2, l: 1, m: 0, s: 0.5 });

      // All n=2 states should have same energy
      expect(e2px.energy).toBeCloseToQuantum(e2s.energy, 12);
      expect(e2py.energy).toBeCloseToQuantum(e2s.energy, 12);
      expect(e2pz.energy).toBeCloseToQuantum(e2s.energy, 12);
    });
  });

  describe('Wave Function Calculations', () => {
    it('should calculate correct 1s wave function at origin', () => {
      const hydrogen = new HydrogenLikeAtom(1);
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      const psi = hydrogen.calculateWaveFunction(quantumNumbers, 0, 0, 0);

      // ψ₁ₛ(0) = 2 × (1/√4π) = 2/√(4π) = 1/√π ≈ 0.5642 (in atomic units)
      // This is the exact analytical value for hydrogen 1s at origin
      expect(psi).toBeCloseToQuantum(1 / Math.sqrt(Math.PI), 6);
    });

    it('should have correct 1s wave function normalization', () => {
      const hydrogen = new HydrogenLikeAtom(1);
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      // Test normalization by numerical integration (simplified check)
      let integral = 0;
      const dr = 0.1; // atomic units
      const maxR = 10; // atomic units

      for (let r = 0; r < maxR; r += dr) {
        const psi = hydrogen.calculateWaveFunction(quantumNumbers, r, 0, 0);
        integral += psi * psi * 4 * Math.PI * r * r * dr;
      }

      // Should integrate to 1 (within numerical error)
      expect(integral).toBeCloseToQuantum(1.0, 1);
    });

    it('should have correct exponential decay for 1s', () => {
      const hydrogen = new HydrogenLikeAtom(1);
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      const psi1 = hydrogen.calculateWaveFunction(quantumNumbers, 1, 0, 0); // at r = 1 a₀
      const psi2 = hydrogen.calculateWaveFunction(quantumNumbers, 2, 0, 0); // at r = 2 a₀

      // For 1s: ψ ∝ e^(-r/a₀), so ψ(2a₀)/ψ(a₀) = e^(-1) ≈ 0.368
      expect(psi2 / psi1).toBeCloseToQuantum(Math.exp(-1), 3);
    });
  });

  describe('Probability Density', () => {
    it('should calculate correct probability density', () => {
      const hydrogen = new HydrogenLikeAtom(1);
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      const psi = hydrogen.calculateWaveFunction(quantumNumbers, 0, 0, 0);
      const prob = hydrogen.calculateProbabilityDensity(quantumNumbers, 0, 0, 0);

      // Probability density = |ψ|²
      expect(prob).toBeCloseToQuantum(psi * psi, 10);
    });

    it('should have maximum at nucleus for 1s', () => {
      const hydrogen = new HydrogenLikeAtom(1);
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      const probAtOrigin = hydrogen.calculateProbabilityDensity(quantumNumbers, 0, 0, 0);
      const probAt1Bohr = hydrogen.calculateProbabilityDensity(quantumNumbers, 1, 0, 0);

      // 1s orbital has maximum probability density at nucleus
      expect(probAtOrigin).toBeGreaterThan(probAt1Bohr);
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid quantum numbers', () => {
      const hydrogen = new HydrogenLikeAtom(1);
      const invalidQN: QuantumNumbers = { n: 0, l: 0, m: 0, s: 0.5 }; // n cannot be 0

      expect(() => hydrogen.calculateEnergy(invalidQN)).toThrow('Invalid quantum numbers');
    });

    it('should reject non-positive atomic numbers', () => {
      expect(() => new HydrogenLikeAtom(0)).toThrow('Atomic number must be positive');
      expect(() => new HydrogenLikeAtom(-1)).toThrow('Atomic number must be positive');
    });
  });

  describe('Performance Requirements', () => {
    it('should complete energy calculation quickly', () => {
      const hydrogen = new HydrogenLikeAtom(1);
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      const startTime = performance.now();
      hydrogen.calculateEnergy(quantumNumbers);
      const endTime = performance.now();

      // Should complete in less than 1ms for exact calculations
      expect(endTime - startTime).toBeLessThan(1);
    });
  });
});