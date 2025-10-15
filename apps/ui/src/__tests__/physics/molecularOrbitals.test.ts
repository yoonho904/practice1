import { describe, expect, it } from 'vitest';
import { HydrogenLikeAtom } from '../../../../../services/quantum-engine/src/index.js';
import type { QuantumNumbers } from '../../../../../services/quantum-engine/src/index.js';
import {
  calculateBondingNormalization,
  calculateOverlapIntegral1s,
  calculateMolecularOrbitalAmplitude,
  calculateMolecularOrbitalDensity,
} from '../../physics/molecularOrbitals.js';

const QUANTUM_1S: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

describe('molecularOrbitals', () => {
  const atomA = new HydrogenLikeAtom(1);
  const atomB = new HydrogenLikeAtom(1);

  it('calculates overlap integral for 1s orbitals', () => {
    const sZero = calculateOverlapIntegral1s(0);
    const sEquilibrium = calculateOverlapIntegral1s(1.4);
    const sWide = calculateOverlapIntegral1s(4);

    expect(sZero).toBeCloseTo(1, 6);
    expect(sEquilibrium).toBeGreaterThan(0.7);
    expect(sEquilibrium).toBeLessThan(0.78);
    expect(sWide).toBeLessThan(0.2);
    expect(sWide).toBeGreaterThan(0.17);
  });

  it('normalizes bonding and antibonding combinations', () => {
    const bondLength = 1.4;
    const overlap = calculateOverlapIntegral1s(bondLength);

    const bondingNorm = calculateBondingNormalization(overlap, 'sigma');
    const antibondingNorm = calculateBondingNormalization(overlap, 'sigma*');

    // Both normalizations should be finite and bonding should be larger
    expect(Number.isFinite(bondingNorm)).toBe(true);
    expect(Number.isFinite(antibondingNorm)).toBe(true);
    expect(antibondingNorm).toBeGreaterThan(bondingNorm);
  });

  it('produces higher density between nuclei for bonding orbital', () => {
    const bondLength = 1.4;
    const posA = { x: -bondLength / 2, y: 0, z: 0 };
    const posB = { x: bondLength / 2, y: 0, z: 0 };
    const midpoint = { x: 0, y: 0, z: 0 };
    const farPoint = { x: 4, y: 0, z: 0 };

    const bondingAmplitudeMid = calculateMolecularOrbitalAmplitude({
      type: 'sigma',
      atomA,
      atomB,
      quantumNumbers: QUANTUM_1S,
      position: midpoint,
      posA,
      posB,
    });
    const antibondingAmplitudeMid = calculateMolecularOrbitalAmplitude({
      type: 'sigma*',
      atomA,
      atomB,
      quantumNumbers: QUANTUM_1S,
      position: midpoint,
      posA,
      posB,
    });

    const bondingDensityFar = calculateMolecularOrbitalDensity({
      type: 'sigma',
      atomA,
      atomB,
      quantumNumbers: QUANTUM_1S,
      position: farPoint,
      posA,
      posB,
    });

    expect(Math.abs(bondingAmplitudeMid)).toBeGreaterThan(Math.abs(antibondingAmplitudeMid));
    expect(bondingDensityFar).toBeLessThanOrEqual(0.02);
  });
});
