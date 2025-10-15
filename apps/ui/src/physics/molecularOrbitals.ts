import type { HydrogenLikeAtom, QuantumNumbers } from '../../../services/quantum-engine/src/index.js';

export type MolecularOrbitalType = 'sigma' | 'sigma*';

export interface BondPositions {
  x: number;
  y: number;
  z: number;
}

export interface MolecularOrbitalAmplitudeParams {
  type: MolecularOrbitalType;
  atomA: HydrogenLikeAtom;
  atomB: HydrogenLikeAtom;
  quantumNumbers: QuantumNumbers;
  position: BondPositions;
  posA: BondPositions;
  posB: BondPositions;
  overlap?: number;
  normalization?: number;
}

const OVERLAP_CACHE = new Map<number, number>();

/**
 * Clamp helper to avoid numerical instabilities for values close to ±1
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clearMolecularOrbitalCaches(): void {
  OVERLAP_CACHE.clear();
}

/**
 * Calculates the 1s–1s overlap integral analytically in Bohr radii (atomic units)
 * S(R) = exp(-R) * (1 + R + R^2 / 3)
 */
export function calculateOverlapIntegral1s(bondLength: number): number {
  const distance = Math.max(0, bondLength);
  const cached = OVERLAP_CACHE.get(distance);
  if (cached !== undefined) {
    return cached;
  }

  const overlap = Math.exp(-distance) * (1 + distance + (distance * distance) / 3);
  OVERLAP_CACHE.set(distance, overlap);
  return overlap;
}

/**
 * Heitler–London inspired enhancement factor to emulate Coulomb/exchange stabilisation.
 * Keeps a lightweight correction that increases bonding density between nuclei.
 */
function calculateCorrelationEnhancement(
  bondLength: number,
  orbitalType: MolecularOrbitalType,
  overlap: number,
): number {
  // Coulomb/exchange approximations for 1s orbitals (dimensionless)
  const coulomb = Math.exp(-bondLength) * (1 + bondLength);
  const exchange = overlap * overlap;
  const correction = 0.35 * coulomb + 0.25 * exchange;

  if (orbitalType === 'sigma') {
    return 1 + correction;
  }

  // Antibonding loses density in the internuclear region
  return clamp(1 - correction, 0.1, 1);
}

/**
 * Returns normalisation coefficient for bonding/antibonding LCAO combinations.
 */
export function calculateBondingNormalization(
  overlap: number,
  orbitalType: MolecularOrbitalType,
): number {
  const safeOverlap = clamp(overlap, -0.999_99, 0.999_99);
  if (orbitalType === 'sigma') {
    return 1 / Math.sqrt(2 * (1 + safeOverlap));
  }

  return 1 / Math.sqrt(2 * (1 - safeOverlap));
}

function resolveBondLength(posA: BondPositions, posB: BondPositions): number {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const dz = posB.z - posA.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates molecular orbital amplitude ψ at a given position for H₂-like systems.
 * Uses amplitude-level combination so interference is preserved.
 */
export function calculateMolecularOrbitalAmplitude({
  type,
  atomA,
  atomB,
  quantumNumbers,
  position,
  posA,
  posB,
  overlap,
  normalization,
}: MolecularOrbitalAmplitudeParams): number {
  const relAX = position.x - posA.x;
  const relAY = position.y - posA.y;
  const relAZ = position.z - posA.z;
  const relBX = position.x - posB.x;
  const relBY = position.y - posB.y;
  const relBZ = position.z - posB.z;

  const psiA = atomA.calculateWaveFunction(quantumNumbers, relAX, relAY, relAZ);
  const psiB = atomB.calculateWaveFunction(quantumNumbers, relBX, relBY, relBZ);

  const overlapValue = overlap ?? calculateOverlapIntegral1s(resolveBondLength(posA, posB));
  const norm = normalization ?? calculateBondingNormalization(overlapValue, type);

  const combination = type === 'sigma*' ? psiA - psiB : psiA + psiB;
  return norm * combination;
}

interface MolecularDensityParams {
  type: MolecularOrbitalType;
  atomA: HydrogenLikeAtom;
  atomB: HydrogenLikeAtom;
  quantumNumbers: QuantumNumbers;
  position: BondPositions;
  posA: BondPositions;
  posB: BondPositions;
  overlap?: number;
  normalization?: number;
}

/**
 * Calculates |ψ|² including a heuristic correlation enhancement.
 */
export function calculateMolecularOrbitalDensity(params: MolecularDensityParams): number {
  const bondLength = resolveBondLength(params.posA, params.posB);
  const overlap = params.overlap ?? calculateOverlapIntegral1s(bondLength);
  const norm = params.normalization ?? calculateBondingNormalization(overlap, params.type);

  const amplitude = calculateMolecularOrbitalAmplitude({
    ...params,
    overlap,
    normalization: norm,
  });

  const baseDensity = amplitude * amplitude;
  const enhancement = calculateCorrelationEnhancement(bondLength, params.type, overlap);
  return baseDensity * enhancement;
}
