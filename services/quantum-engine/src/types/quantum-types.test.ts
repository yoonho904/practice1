/**
 * Tests for quantum types and validation
 * Following TDD: Write tests first, then implement functionality
 */

import { describe, expect, it } from 'vitest';

import type { QuantumNumbers } from './quantum-types.js';
import { validateQuantumNumbers, PHYSICAL_CONSTANTS } from './quantum-types.js';

describe('QuantumNumbers Validation', () => {
  describe('validateQuantumNumbers', () => {
    it('should accept valid 1s orbital quantum numbers', () => {
      const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };
      expect(validateQuantumNumbers(quantumNumbers)).toBe(true);
    });

    it('should accept valid 2p orbital quantum numbers', () => {
      const quantumNumbers: QuantumNumbers = { n: 2, l: 1, m: -1, s: -0.5 };
      expect(validateQuantumNumbers(quantumNumbers)).toBe(true);
    });

    it('should reject invalid principal quantum number (n = 0)', () => {
      const quantumNumbers: QuantumNumbers = { n: 0, l: 0, m: 0, s: 0.5 };
      expect(validateQuantumNumbers(quantumNumbers)).toBe(false);
    });

    it('should reject invalid angular momentum (l ≥ n)', () => {
      const quantumNumbers: QuantumNumbers = { n: 1, l: 1, m: 0, s: 0.5 };
      expect(validateQuantumNumbers(quantumNumbers)).toBe(false);
    });

    it('should reject invalid magnetic quantum number (|m| > l)', () => {
      const quantumNumbers: QuantumNumbers = { n: 2, l: 1, m: 2, s: 0.5 };
      expect(validateQuantumNumbers(quantumNumbers)).toBe(false);
    });

    it('should reject invalid spin quantum number', () => {
      // TypeScript should prevent this, but we test runtime validation
      const quantumNumbers = { n: 1, l: 0, m: 0, s: 1 } as QuantumNumbers;
      expect(validateQuantumNumbers(quantumNumbers)).toBe(false);
    });

    it('should accept edge case: maximum l for given n', () => {
      const quantumNumbers: QuantumNumbers = { n: 3, l: 2, m: 0, s: 0.5 };
      expect(validateQuantumNumbers(quantumNumbers)).toBe(true);
    });

    it('should accept edge case: maximum |m| for given l', () => {
      const quantumNumbers: QuantumNumbers = { n: 3, l: 2, m: 2, s: -0.5 };
      expect(validateQuantumNumbers(quantumNumbers)).toBe(true);
    });
  });
});

describe('Physical Constants', () => {
  it('should have correct Planck constant value', () => {
    expect(PHYSICAL_CONSTANTS.h).toBeCloseToQuantum(6.62607015e-34, 10);
  });

  it('should have correct reduced Planck constant', () => {
    expect(PHYSICAL_CONSTANTS.hbar).toBeCloseToQuantum(1.054571817e-34, 10);
  });

  it('should have correct elementary charge', () => {
    expect(PHYSICAL_CONSTANTS.e).toBeCloseToQuantum(1.602176634e-19, 10);
  });

  it('should have correct electron mass', () => {
    expect(PHYSICAL_CONSTANTS.me).toBeCloseToQuantum(9.1093837015e-31, 10);
  });

  it('should have correct Bohr radius', () => {
    expect(PHYSICAL_CONSTANTS.a0).toBeCloseToQuantum(5.29177210903e-11, 10);
  });

  it('should satisfy fundamental relationship: hbar = h / (2π)', () => {
    const calculatedHbar = PHYSICAL_CONSTANTS.h / (2 * Math.PI);
    expect(PHYSICAL_CONSTANTS.hbar).toBeCloseToQuantum(calculatedHbar, 12);
  });

  it('should satisfy Bohr radius relationship', () => {
    // a0 = 4πε₀ℏ²/(mₑe²)
    const { epsilon0, hbar, me, e } = PHYSICAL_CONSTANTS;
    const calculatedA0 = (4 * Math.PI * epsilon0 * hbar ** 2) / (me * e ** 2);
    expect(PHYSICAL_CONSTANTS.a0).toBeCloseToQuantum(calculatedA0, 10);
  });
});