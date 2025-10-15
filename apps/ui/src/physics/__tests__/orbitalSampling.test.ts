import { describe, expect, it } from 'vitest';
import { HydrogenLikeAtom } from '../../../../../services/quantum-engine/src/index.js';
import { generateOrbitalParticles } from '../orbitalSampling.js';

describe('generateOrbitalParticles adaptive sampling', () => {
  it('produces the requested number of particles for high-|m| orbitals', () => {
    const atom = new HydrogenLikeAtom(6);
    const quantumNumbers = { n: 4, l: 3, m: 3, s: 0.5 } as const;
    const sample = generateOrbitalParticles(atom, 6, quantumNumbers, 1500, true);

    expect(sample.positions).toHaveLength(1500 * 3);
    expect(sample.basePositions).toHaveLength(1500 * 3);
    expect(sample.maxProbability).toBeGreaterThan(0);

    const totalMagnitude = sample.positions.reduce((sum, value) => sum + Math.abs(value), 0);
    expect(totalMagnitude).toBeGreaterThan(0);
  });

  it('completes sampling for high-|m| orbitals without long stalls', () => {
    const atom = new HydrogenLikeAtom(8);
    const quantumNumbers = { n: 5, l: 4, m: 4, s: 0.5 } as const;
    const start = performance.now();
    const sample = generateOrbitalParticles(atom, 8, quantumNumbers, 4000, true);
    const duration = performance.now() - start;

    expect(sample.positions).toHaveLength(4000 * 3);
    expect(duration).toBeLessThan(1500);
  });
});
