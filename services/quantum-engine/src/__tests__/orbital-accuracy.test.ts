/**
 * Comprehensive test suite for orbital accuracy
 * Tests high n and l configurations
 */

import { HydrogenLikeAtom } from '../models/hydrogen-like.js';
import type { QuantumNumbers } from '../types/quantum-types.js';

describe('Orbital Accuracy Tests', () => {
  const hydrogen = new HydrogenLikeAtom(1);

  describe('Energy Levels', () => {
    test('1s orbital energy', () => {
      const result = hydrogen.calculateEnergy({ n: 1, l: 0, m: 0, s: 0.5 });
      expect(result.energy).toBeCloseTo(-0.5, 10); // -13.6 eV in Hartree
    });

    test('2s orbital energy', () => {
      const result = hydrogen.calculateEnergy({ n: 2, l: 0, m: 0, s: 0.5 });
      expect(result.energy).toBeCloseTo(-0.125, 10);
    });

    test('3d orbital energy', () => {
      const result = hydrogen.calculateEnergy({ n: 3, l: 2, m: 0, s: 0.5 });
      expect(result.energy).toBeCloseTo(-0.0555555, 6);
    });

    test('4f orbital energy', () => {
      const result = hydrogen.calculateEnergy({ n: 4, l: 3, m: 0, s: 0.5 });
      expect(result.energy).toBeCloseTo(-0.03125, 6);
    });

    test('5g orbital energy', () => {
      const result = hydrogen.calculateEnergy({ n: 5, l: 4, m: 0, s: 0.5 });
      expect(result.energy).toBeCloseTo(-0.02, 6);
    });
  });

  describe('Wave Function Symmetry', () => {
    test('s orbital is spherically symmetric', () => {
      const qn: QuantumNumbers = { n: 2, l: 0, m: 0, s: 0.5 };
      const r = 2.0;

      // Test at same radius, different angles
      const psi1 = hydrogen.calculateWaveFunction(qn, r, 0, 0);
      const psi2 = hydrogen.calculateWaveFunction(qn, 0, r, 0);
      const psi3 = hydrogen.calculateWaveFunction(qn, 0, 0, r);

      expect(psi1).toBeCloseTo(psi2, 10);
      expect(psi2).toBeCloseTo(psi3, 10);
    });

    test('p_z orbital has nodal plane at z=0', () => {
      const qn: QuantumNumbers = { n: 2, l: 1, m: 0, s: 0.5 };

      // Points in xy plane should have zero or near-zero density
      const psi1 = hydrogen.calculateWaveFunction(qn, 1, 0, 0);
      const psi2 = hydrogen.calculateWaveFunction(qn, 0, 1, 0);
      const psi3 = hydrogen.calculateWaveFunction(qn, 1, 1, 0);

      expect(Math.abs(psi1)).toBeLessThan(1e-10);
      expect(Math.abs(psi2)).toBeLessThan(1e-10);
      expect(Math.abs(psi3)).toBeLessThan(1e-10);
    });

    test('d orbital nodal surfaces', () => {
      const qn: QuantumNumbers = { n: 3, l: 2, m: 0, s: 0.5 };

      // d_z² has nodal cone at magic angle
      const magicAngle = Math.acos(1 / Math.sqrt(3));
      const r = 3.0;
      const x = r * Math.sin(magicAngle);
      const z = r * Math.cos(magicAngle);

      const psi = hydrogen.calculateWaveFunction(qn, x, 0, z);
      // Should be near zero on nodal surface
      expect(Math.abs(psi)).toBeLessThan(0.1);
    });
  });

  describe('Normalization Check', () => {
    test('Probability density integrates to reasonable value', () => {
      const qn: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

      // Sample probability density at various points
      let totalProbability = 0;
      const samples = 1000;
      const maxR = 10; // Bohr radii

      for (let i = 0; i < samples; i++) {
        const r = Math.random() * maxR;
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = Math.random() * 2 * Math.PI;

        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(theta);

        const prob = hydrogen.calculateProbabilityDensity(qn, x, y, z);
        const volumeElement = r * r * Math.sin(theta); // Jacobian
        totalProbability += prob * volumeElement;
      }

      // Normalize by sampling volume
      const avgProbability = totalProbability / samples * (4 * Math.PI * Math.pow(maxR, 3) / 3);

      // Should be close to 1 (within Monte Carlo error)
      expect(avgProbability).toBeGreaterThan(0.5);
      expect(avgProbability).toBeLessThan(2.0);
    });
  });

  describe('High n and l Configurations', () => {
    test('3d orbital has correct shape', () => {
      const qn: QuantumNumbers = { n: 3, l: 2, m: 0, s: 0.5 };

      // Peak should be around n² Bohr radii
      const expectedPeak = 9; // n² = 9

      let maxDensity = 0;
      let maxR = 0;

      // Search for peak along z-axis
      for (let r = 0; r < 20; r += 0.5) {
        const density = hydrogen.calculateProbabilityDensity(qn, 0, 0, r);
        if (density > maxDensity) {
          maxDensity = density;
          maxR = r;
        }
      }

      // Peak should be within 50% of expected value
      expect(maxR).toBeGreaterThan(expectedPeak * 0.5);
      expect(maxR).toBeLessThan(expectedPeak * 1.5);
    });

    test('4f orbital is non-zero', () => {
      const qn: QuantumNumbers = { n: 4, l: 3, m: 0, s: 0.5 };

      // Test at expected peak radius
      const r = 16; // n² = 16
      const density = hydrogen.calculateProbabilityDensity(qn, 0, 0, r);

      expect(density).toBeGreaterThan(0);
      expect(isFinite(density)).toBe(true);
    });

    test('5g orbital is non-zero', () => {
      const qn: QuantumNumbers = { n: 5, l: 4, m: 0, s: 0.5 };

      // Test at expected peak radius
      const r = 25; // n² = 25
      const density = hydrogen.calculateProbabilityDensity(qn, 0, 0, r);

      expect(density).toBeGreaterThan(0);
      expect(isFinite(density)).toBe(true);
    });

    test('Various m values for d orbitals', () => {
      for (let m = -2; m <= 2; m++) {
        const qn: QuantumNumbers = { n: 3, l: 2, m, s: 0.5 };

        const r = 9; // n²
        const density = hydrogen.calculateProbabilityDensity(qn, r, 0, 0);

        expect(density).toBeGreaterThan(0);
        expect(isFinite(density)).toBe(true);
      }
    });
  });

  describe('Radial Nodes', () => {
    test('2s has 1 radial node', () => {
      const qn: QuantumNumbers = { n: 2, l: 0, m: 0, s: 0.5 };

      // Search for node along z-axis
      let nodeCount = 0;
      let prevSign = Math.sign(hydrogen.calculateWaveFunction(qn, 0, 0, 0.1));

      for (let r = 0.1; r < 10; r += 0.1) {
        const psi = hydrogen.calculateWaveFunction(qn, 0, 0, r);
        const currSign = Math.sign(psi);

        if (currSign !== prevSign && Math.abs(psi) > 1e-10) {
          nodeCount++;
          prevSign = currSign;
        }
      }

      // n - l - 1 = 2 - 0 - 1 = 1 node
      expect(nodeCount).toBe(1);
    });

    test('3s has 2 radial nodes', () => {
      const qn: QuantumNumbers = { n: 3, l: 0, m: 0, s: 0.5 };

      let nodeCount = 0;
      let prevSign = Math.sign(hydrogen.calculateWaveFunction(qn, 0, 0, 0.1));

      for (let r = 0.1; r < 20; r += 0.1) {
        const psi = hydrogen.calculateWaveFunction(qn, 0, 0, r);
        const currSign = Math.sign(psi);

        if (currSign !== prevSign && Math.abs(psi) > 1e-10) {
          nodeCount++;
          prevSign = currSign;
        }
      }

      // n - l - 1 = 3 - 0 - 1 = 2 nodes
      expect(nodeCount).toBe(2);
    });
  });
});
