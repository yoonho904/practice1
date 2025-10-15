import type { HydrogenLikeAtom, QuantumNumbers } from '../../../services/quantum-engine/src/index.js';
import type { ThemeMode } from '../themes/theme.js';
import {
  calculateBondingNormalization,
  calculateMolecularOrbitalAmplitude,
  calculateMolecularOrbitalDensity,
  calculateOverlapIntegral1s,
  type MolecularOrbitalType,
} from './molecularOrbitals.js';
import {
  getMolecularOrbitalSample,
  scheduleMolecularOrbitalPreload,
  setMolecularOrbitalSample,
  type MolecularCacheRequest,
  type MolecularOrbitalSample,
} from './molecularOrbitalCache.js';

interface GenerateParams {
  atomA: HydrogenLikeAtom;
  atomB: HydrogenLikeAtom;
  quantumNumbers: QuantumNumbers;
  particleCount: number;
  bondLength: number;
  themeMode: ThemeMode;
  orbitalType: MolecularOrbitalType;
}

export function generateMolecularOrbitalSample({
  atomA,
  atomB,
  quantumNumbers,
  particleCount,
  bondLength,
  themeMode,
  orbitalType,
}: GenerateParams): MolecularOrbitalSample {
  const cacheRequest: MolecularCacheRequest = {
    quantumNumbers,
    bondLength,
    particleCount,
    orbitalType,
    themeMode,
  };

  const scheduleNeighbors = () => {
    const neighborOffsets = [-0.2, 0.2];
    for (const offset of neighborOffsets) {
      const neighborBondLength = bondLength + offset;
      if (neighborBondLength <= 0.2 || Math.abs(neighborBondLength - bondLength) < 1e-6) {
        continue;
      }

      const neighborRequest: MolecularCacheRequest = {
        quantumNumbers,
        bondLength: neighborBondLength,
        particleCount,
        orbitalType,
        themeMode,
      };

      scheduleMolecularOrbitalPreload(neighborRequest, () =>
        buildMolecularOrbitalSample(
          atomA,
          atomB,
          quantumNumbers,
          particleCount,
          neighborBondLength,
          themeMode,
          orbitalType,
        ));
    }
  };

  const cached = getMolecularOrbitalSample(cacheRequest);
  if (cached) {
    scheduleNeighbors();
    return cached;
  }

  const sample = buildMolecularOrbitalSample(
    atomA,
    atomB,
    quantumNumbers,
    particleCount,
    bondLength,
    themeMode,
    orbitalType,
  );

  setMolecularOrbitalSample(cacheRequest, sample);
  scheduleNeighbors();

  return getMolecularOrbitalSample(cacheRequest) ?? sample;
}

export function preloadMolecularOrbitalSample(request: GenerateParams): void {
  const cacheRequest: MolecularCacheRequest = {
    quantumNumbers: request.quantumNumbers,
    bondLength: request.bondLength,
    particleCount: request.particleCount,
    orbitalType: request.orbitalType,
    themeMode: request.themeMode,
  };

  scheduleMolecularOrbitalPreload(cacheRequest, () =>
    buildMolecularOrbitalSample(
      request.atomA,
      request.atomB,
      request.quantumNumbers,
      request.particleCount,
      request.bondLength,
      request.themeMode,
      request.orbitalType,
    ));
}

function buildMolecularOrbitalSample(
  atomA: HydrogenLikeAtom,
  atomB: HydrogenLikeAtom,
  quantumNumbers: QuantumNumbers,
  count: number,
  bondLength: number,
  mode: ThemeMode,
  orbitalType: MolecularOrbitalType,
): MolecularOrbitalSample {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);
  const amplitudes = new Float32Array(count);

  const poolCount = Math.max(Math.floor(count * 2.5), 4000);
  const poolSize = poolCount * 3;
  const validPositionsPool: number[] = [];

  const posA = { x: -bondLength / 2, y: 0, z: 0 };
  const posB = { x: bondLength / 2, y: 0, z: 0 };

  const overlap = calculateOverlapIntegral1s(bondLength);
  const normalization = calculateBondingNormalization(overlap, orbitalType);
  const densityParamsBase = {
    type: orbitalType,
    atomA,
    atomB,
    quantumNumbers,
    posA,
    posB,
    overlap,
    normalization,
  } as const;

  const colorPalette = mode === 'dark'
    ? { r: 0.4, g: 0.9, b: orbitalType === 'sigma' ? 0.7 : 0.3 }
    : { r: 0.2, g: 0.7, b: orbitalType === 'sigma' ? 0.5 : 0.25 };

  const overlapWeight = clamp(overlap, 0.05, 0.85);

  const candidate = (): { x: number; y: number; z: number } => {
    const modeSelector = Math.random();
    if (modeSelector < overlapWeight) {
      const axial = (Math.random() - 0.5) * bondLength * 0.9;
      const radial = sampleHydrogen1sRadius() * 0.45;
      const angle = Math.random() * Math.PI * 2;
      const y = radial * Math.cos(angle);
      const z = radial * Math.sin(angle);
      const smoothing = 0.3 * (Math.random() - 0.5);
      return { x: axial + smoothing, y, z };
    }

    const origin = modeSelector < 0.5 ? posA : posB;
    const radius = sampleHydrogen1sRadius();
    const cosTheta = 2 * Math.random() - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = Math.random() * Math.PI * 2;
    const x = origin.x + radius * sinTheta * Math.cos(phi);
    const y = origin.y + radius * sinTheta * Math.sin(phi);
    const z = origin.z + radius * cosTheta;
    return { x, y, z };
  };

  let maxProbability = 0;
  const estimationSamples = Math.max(5000, Math.floor(count * 0.75));
  for (let i = 0; i < estimationSamples; i++) {
    const p = candidate();
    const probability = calculateMolecularOrbitalDensity({
      ...densityParamsBase,
      position: p,
    });
    if (probability > maxProbability) {
      maxProbability = probability;
    }
  }
  if (maxProbability <= 0) {
    maxProbability = 1e-10;
  }

  let particlesGenerated = 0;
  let attempts = 0;
  const maxAttempts = count * 500;
  const acceptanceThreshold = orbitalType === 'sigma' ? 0.002 : 0.003;
  let maxAmplitude = 0;

  while ((particlesGenerated < count || validPositionsPool.length < poolSize) && attempts < maxAttempts) {
    attempts++;
    const samplePoint = candidate();

    const probability = calculateMolecularOrbitalDensity({
      ...densityParamsBase,
      position: samplePoint,
    });
    const normalizedProbability = probability / maxProbability;
    const envelopeBoost = Math.pow(normalizedProbability, 0.68);

    if (normalizedProbability > acceptanceThreshold && Math.random() < envelopeBoost) {
      if (validPositionsPool.length < poolSize) {
        validPositionsPool.push(samplePoint.x, samplePoint.y, samplePoint.z);
      }

      if (particlesGenerated < count) {
        const idx = particlesGenerated * 3;
        positions[idx] = samplePoint.x;
        positions[idx + 1] = samplePoint.y;
        positions[idx + 2] = samplePoint.z;

        basePositions[idx] = samplePoint.x;
        basePositions[idx + 1] = samplePoint.y;
        basePositions[idx + 2] = samplePoint.z;

        const amplitude = calculateMolecularOrbitalAmplitude({
          type: orbitalType,
          atomA,
          atomB,
          quantumNumbers,
          position: samplePoint,
          posA,
          posB,
          overlap,
          normalization,
        });
        amplitudes[particlesGenerated] = amplitude;
        const absAmplitude = Math.abs(amplitude);
        if (absAmplitude > maxAmplitude) {
          maxAmplitude = absAmplitude;
        }

        const variation = 0.7 + Math.random() * 0.3;
        colors[idx] = colorPalette.r * variation;
        colors[idx + 1] = colorPalette.g * variation;
        colors[idx + 2] = colorPalette.b * variation;

        particlesGenerated++;
      }
    }
  }

  if (particlesGenerated < count * 0.9) {
    console.warn(`Only generated ${particlesGenerated}/${count} particles for molecular orbital ${orbitalType}`);
  }

  if (maxAmplitude > 0) {
    const invMax = 1 / maxAmplitude;
    for (let i = 0; i < particlesGenerated; i++) {
      amplitudes[i] *= invMax;
    }
  }

  const allValidPositions = validPositionsPool.length
    ? new Float32Array(validPositionsPool)
    : new Float32Array(0);

  const quantumKey = `${quantumNumbers.n}:${quantumNumbers.l}:${quantumNumbers.m}`;
  return {
    positions,
    colors,
    basePositions,
    allValidPositions,
    amplitudes,
    metadata: {
      bondLength,
      orbitalType,
      particleCount: count,
      themeMode: mode,
      quantumKey,
      createdAt: Date.now(),
      amplitudeScale: maxAmplitude > 0 ? maxAmplitude : 1,
      overlap,
      normalization,
    },
  };
}

function sampleHydrogen1sRadius(): number {
  let logProduct = 0;
  for (let i = 0; i < 3; i++) {
    const u = Math.random() || Number.EPSILON;
    logProduct += Math.log(u);
  }
  return -0.5 * logProduct;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
