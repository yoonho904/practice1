import type { QuantumNumbers } from '../../../services/quantum-engine/src/index.js';
import type { ThemeMode } from '../themes/theme.js';
import type { MolecularOrbitalType } from './molecularOrbitals.js';

export interface MolecularOrbitalSample {
  positions: Float32Array;
  colors: Float32Array;
  basePositions: Float32Array;
  allValidPositions: Float32Array;
  amplitudes: Float32Array;
  metadata: {
    bondLength: number;
    orbitalType: MolecularOrbitalType;
    particleCount: number;
    themeMode: ThemeMode;
    quantumKey: string;
    createdAt: number;
    amplitudeScale: number;
    overlap: number;
    normalization: number;
  };
}

export interface MolecularCacheRequest {
  quantumNumbers: QuantumNumbers;
  bondLength: number;
  particleCount: number;
  orbitalType: MolecularOrbitalType;
  themeMode: ThemeMode;
}

type CacheKey = string;

const CACHE_LIMIT = 6;
const molecularCache = new Map<CacheKey, MolecularOrbitalSample>();
const cacheUsageOrder: CacheKey[] = [];

function serializeQuantumNumbers(quantumNumbers: QuantumNumbers): string {
  return `${quantumNumbers.n}:${quantumNumbers.l}:${quantumNumbers.m}`;
}

function getKey({
  quantumNumbers,
  bondLength,
  particleCount,
  orbitalType,
  themeMode,
}: MolecularCacheRequest): CacheKey {
  return [
    serializeQuantumNumbers(quantumNumbers),
    orbitalType,
    themeMode,
    particleCount,
    bondLength.toFixed(3),
  ].join('|');
}

function cloneSample(sample: MolecularOrbitalSample): MolecularOrbitalSample {
  return {
    positions: sample.positions.slice(),
    colors: sample.colors.slice(),
    basePositions: sample.basePositions.slice(),
    allValidPositions: sample.allValidPositions.slice(),
    amplitudes: sample.amplitudes.slice(),
    metadata: { ...sample.metadata },
  };
}

function touchKey(key: CacheKey): void {
  const idx = cacheUsageOrder.indexOf(key);
  if (idx >= 0) {
    cacheUsageOrder.splice(idx, 1);
  }
  cacheUsageOrder.push(key);

  while (cacheUsageOrder.length > CACHE_LIMIT) {
    const oldest = cacheUsageOrder.shift();
    if (oldest) {
      molecularCache.delete(oldest);
    }
  }
}

export function getMolecularOrbitalSample(request: MolecularCacheRequest): MolecularOrbitalSample | null {
  const key = getKey(request);
  const stored = molecularCache.get(key);
  if (!stored) {
    return null;
  }

  touchKey(key);
  return cloneSample(stored);
}

export function setMolecularOrbitalSample(
  request: MolecularCacheRequest,
  sample: MolecularOrbitalSample,
): void {
  const key = getKey(request);
  const stored = cloneSample(sample);
  molecularCache.set(key, stored);
  touchKey(key);
}

export function scheduleMolecularOrbitalPreload(
  request: MolecularCacheRequest,
  generator: () => MolecularOrbitalSample,
): void {
  if (getMolecularOrbitalSample(request)) {
    return;
  }

  if (typeof window === 'undefined') {
    const sample = generator();
    setMolecularOrbitalSample(request, sample);
    return;
  }

  const schedule = 'requestIdleCallback' in window
    ? window.requestIdleCallback.bind(window)
    : ((cb: IdleRequestCallback) =>
      window.setTimeout(
        () => cb({ didTimeout: false, timeRemaining: () => 16 }),
        0,
      ));

  schedule(() => {
    if (getMolecularOrbitalSample(request)) {
      return;
    }
    const sample = generator();
    setMolecularOrbitalSample(request, sample);
  });
}

export function clearMolecularOrbitalCache(): void {
  molecularCache.clear();
  cacheUsageOrder.length = 0;
}

export function getMolecularOrbitalCacheStats() {
  return {
    size: molecularCache.size,
    keys: [...molecularCache.keys()],
  };
}
