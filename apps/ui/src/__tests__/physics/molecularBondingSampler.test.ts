import { describe, expect, it, beforeEach } from 'vitest';
import { HydrogenLikeAtom } from '../../../../../services/quantum-engine/src/index.js';
import type { QuantumNumbers } from '../../../../../services/quantum-engine/src/index.js';
import { generateMolecularOrbitalSample } from '../../physics/molecularBondingSampler.js';
import {
  clearMolecularOrbitalCache,
  getMolecularOrbitalCacheStats,
} from '../../physics/molecularOrbitalCache.js';

const QUANTUM_1S: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

describe('molecularBondingSampler', () => {
  beforeEach(() => {
    clearMolecularOrbitalCache();
  });

  it('generates normalized amplitudes within [-1, 1]', () => {
    const atomA = new HydrogenLikeAtom(1);
    const atomB = new HydrogenLikeAtom(1);

    const sample = generateMolecularOrbitalSample({
      atomA,
      atomB,
      quantumNumbers: QUANTUM_1S,
      particleCount: 2000,
      bondLength: 1.4,
      themeMode: 'dark',
      orbitalType: 'sigma',
    });

    const maxAbsAmplitude = sample.amplitudes.reduce(
      (max, value) => Math.max(max, Math.abs(value)),
      0,
    );
    expect(maxAbsAmplitude).toBeLessThanOrEqual(1.0001);
    expect(maxAbsAmplitude).toBeGreaterThan(0.7);
  });

  it('reuses cached samples for identical parameters', () => {
    const atomA = new HydrogenLikeAtom(1);
    const atomB = new HydrogenLikeAtom(1);

    const firstSample = generateMolecularOrbitalSample({
      atomA,
      atomB,
      quantumNumbers: QUANTUM_1S,
      particleCount: 1000,
      bondLength: 1.6,
      themeMode: 'light',
      orbitalType: 'sigma*',
    });

    const statsAfterFirst = getMolecularOrbitalCacheStats();
    expect(statsAfterFirst.size).toBeGreaterThanOrEqual(1);

    const secondSample = generateMolecularOrbitalSample({
      atomA,
      atomB,
      quantumNumbers: QUANTUM_1S,
      particleCount: 1000,
      bondLength: 1.6,
      themeMode: 'light',
      orbitalType: 'sigma*',
    });

    expect(Array.from(secondSample.positions)).toEqual(Array.from(firstSample.positions));
    expect(Array.from(secondSample.amplitudes)).toEqual(Array.from(firstSample.amplitudes));
  });

  it('preloads neighbor bond lengths into the cache', async () => {
    const atomA = new HydrogenLikeAtom(1);
    const atomB = new HydrogenLikeAtom(1);

    generateMolecularOrbitalSample({
      atomA,
      atomB,
      quantumNumbers: QUANTUM_1S,
      particleCount: 800,
      bondLength: 1.2,
      themeMode: 'dark',
      orbitalType: 'sigma',
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    const { size, keys } = getMolecularOrbitalCacheStats();
    expect(size).toBeGreaterThanOrEqual(2);
    expect(keys.some((key) => key.includes('1.000'))).toBe(true);
    expect(keys.some((key) => key.includes('1.400'))).toBe(true);
  });
});
