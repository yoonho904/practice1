import type { HydrogenLikeAtom, QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';

export interface DensityFieldData {
  resolution: number;
  field: Float32Array;
  maxSample: number;
  maxProbability: number;
}

/**
 * Sample the hydrogen-like probability density on a cubic grid and normalize by the
 * supplied maxProbability. Returned values are clamped to [0, 1].
 */
export function computeDensityField(
  atom: HydrogenLikeAtom,
  quantumNumbers: QuantumNumbers,
  extent: number,
  maxProbability: number,
  resolution: number,
): DensityFieldData {
  const size = Math.max(4, Math.floor(resolution));
  const total = size * size * size;
  const field = new Float32Array(total);
  const inv = 1 / (size - 1);
  const safeMaxProbability = Math.max(Math.abs(maxProbability), 1e-10);

  let index = 0;
  let maxSample = 0;

  for (let z = 0; z < size; z++) {
    const wz = (z * inv - 0.5) * 2 * extent;
    for (let y = 0; y < size; y++) {
      const wy = (y * inv - 0.5) * 2 * extent;
      for (let x = 0; x < size; x++) {
        const wx = (x * inv - 0.5) * 2 * extent;
        const probability = atom.calculateProbabilityDensity(quantumNumbers, wx, wy, wz);
        const normalized = Math.min(probability / safeMaxProbability, 1);
        field[index] = normalized;
        if (normalized > maxSample) {
          maxSample = normalized;
        }
        index += 1;
      }
    }
  }

  return {
    resolution: size,
    field,
    maxSample,
    maxProbability: safeMaxProbability,
  };
}
