import type { HydrogenLikeAtom, QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';
import { computeDensityField, type DensityFieldData } from './densityField.js';

interface DensityFieldCacheEntry {
  resolution: number;
  extent: number;
  maxProbability: number;
  data: DensityFieldData;
}

const FIELD_EXTENT_TOLERANCE = 1e-3;
const MAX_PROB_TOLERANCE = 0.02;

type ResolutionMap = Map<number, DensityFieldCacheEntry>;
const densityFieldCache = new Map<string, ResolutionMap>();

function getOrbitalKey(atomicNumber: number, quantumNumbers: QuantumNumbers): string {
  return `${atomicNumber}:${quantumNumbers.n}:${quantumNumbers.l}:${quantumNumbers.m}`;
}

function getResolutionMap(key: string): ResolutionMap {
  let map = densityFieldCache.get(key);
  if (!map) {
    map = new Map();
    densityFieldCache.set(key, map);
  }
  return map;
}

function meetsTolerance(entry: DensityFieldCacheEntry, extent: number, maxProbability: number): boolean {
  const extentDelta = Math.abs(entry.extent - extent);
  const probabilityDelta = Math.abs(entry.maxProbability - maxProbability);
  const probabilityTolerance = Math.max(1e-10, Math.abs(maxProbability) * MAX_PROB_TOLERANCE);

  return extentDelta < FIELD_EXTENT_TOLERANCE && probabilityDelta <= probabilityTolerance;
}

export function getCachedDensityField(
  atomicNumber: number,
  quantumNumbers: QuantumNumbers,
  resolution: number,
  extent: number,
  maxProbability: number,
): DensityFieldData | null {
  const key = getOrbitalKey(atomicNumber, quantumNumbers);
  const map = densityFieldCache.get(key);
  if (!map || map.size === 0) {
    return null;
  }

  const sortedResolutions = Array.from(map.keys()).sort((a, b) => a - b);

  // Prefer a cached resolution that is equal to or higher than requested.
  let chosenEntry: DensityFieldCacheEntry | undefined;
  for (const res of sortedResolutions) {
    const entry = map.get(res);
    if (!entry) {
      continue;
    }
    if (res >= resolution && meetsTolerance(entry, extent, maxProbability)) {
      chosenEntry = entry;
      break;
    }
  }

  if (!chosenEntry) {
    // Fallback to the highest available resolution that satisfies tolerance.
    for (let i = sortedResolutions.length - 1; i >= 0; i -= 1) {
      const entry = map.get(sortedResolutions[i]);
      if (entry && meetsTolerance(entry, extent, maxProbability)) {
        chosenEntry = entry;
        break;
      }
    }
  }

  return chosenEntry ? chosenEntry.data : null;
}

export function ensureDensityField(
  atomicNumber: number,
  atom: HydrogenLikeAtom,
  quantumNumbers: QuantumNumbers,
  extent: number,
  maxProbability: number,
  resolution: number,
): DensityFieldData {
  const existing = getCachedDensityField(atomicNumber, quantumNumbers, resolution, extent, maxProbability);
  if (existing) {
    return existing;
  }

  const data = computeDensityField(atom, quantumNumbers, extent, maxProbability, resolution);
  const key = getOrbitalKey(atomicNumber, quantumNumbers);
  const map = getResolutionMap(key);

  map.set(data.resolution, {
    resolution: data.resolution,
    extent,
    maxProbability,
    data,
  });

  return data;
}

export function clearDensityFieldCache(): void {
  densityFieldCache.clear();
}
