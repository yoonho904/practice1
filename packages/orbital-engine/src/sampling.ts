import { PI, TAU, associatedLegendre, generalizedLaguerre, factorial } from "./math.js";
import type { OrbitalOccupancy } from "./orbitals.js";

const A0 = 1; // Bohr radius in arbitrary units

// Slater's screening constants for more accurate multi-electron atoms
function getScreeningConstant(n: number, l: number, z: number): number {
  // Simplified Slater rules for screening
  let sigma = 0;

  // Electrons in same shell (n, l)
  if (n === 1) {
    sigma += 0.35; // 1s electrons
  } else if (l === 0) {
    sigma += 0.85; // ns electrons
  } else {
    sigma += 0.35; // np, nd, nf electrons
  }

  // Electrons in inner shells
  if (n > 1) {
    sigma += (n - 1) * 2; // Inner shell electrons
  }

  // Additional screening for higher orbitals
  if (l > 0) {
    sigma += l * 0.15;
  }

  return Math.max(1, z - sigma);
}

function normalizationRadial(n: number, l: number, zEff: number): number {
  const num = Math.pow((2 * zEff) / (n * A0), 3);
  const ratio = factorial(n - l - 1) / (2 * n * factorial(n + l));
  return Math.sqrt(num * ratio);
}

function radialWave(n: number, l: number, r: number, zEff: number): number {
  const rho = (2 * zEff * r) / (n * A0);
  const pref = normalizationRadial(n, l, zEff);
  const laguerre = generalizedLaguerre(n - l - 1, 2 * l + 1, rho);
  return pref * Math.exp(-rho / 2) * Math.pow(rho, l) * laguerre;
}

function sphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
  const absM = Math.abs(m);
  const legendre = associatedLegendre(l, absM, Math.cos(theta));
  const norm = Math.sqrt(((2 * l + 1) / (4 * PI)) * (factorial(l - absM) / factorial(l + absM)));
  if (m === 0) {
    return norm * legendre;
  }
  const factor = Math.sqrt(2) * norm;
  if (m > 0) {
    return factor * legendre * Math.cos(m * phi);
  }
  return factor * legendre * Math.sin(absM * phi);
}

function probabilityDensity(n: number, l: number, m: number, r: number, theta: number, phi: number, z: number): number {
  const zEff = getScreeningConstant(n, l, z);
  const radial = radialWave(n, l, r, zEff);
  const angular = sphericalHarmonic(l, m, theta, phi);
  return radial * radial * angular * angular;
}

function cartesianToSpherical(x: number, y: number, z: number): { r: number; theta: number; phi: number } {
  const r = Math.sqrt(x * x + y * y + z * z);
  const theta = r === 0 ? 0 : Math.acos(z / r);
  const phi = Math.atan2(y, x);
  return { r, theta, phi: phi < 0 ? phi + TAU : phi };
}

function evaluateDensity(n: number, l: number, m: number, pos: { r: number; theta: number; phi: number }, z: number): number {
  const density = probabilityDensity(n, l, m, pos.r, pos.theta, pos.phi, z);
  return density;
}

function metropolisSample(
  orbital: OrbitalOccupancy["quantum"],
  z: number,
  targetSamples: number,
  stepScale: number,
): Array<{ position: [number, number, number]; density: number }> {
  const samples: Array<{ position: [number, number, number]; density: number }> = [];

  // Calculate nucleus radius to ensure electron separation
  // Nuclear radius ~ 1.2 * A^(1/3) femtometers, scaled to Bohr radii
  const nucleusRadius = Math.max(0.3, 0.8 * Math.pow(z, 1/3) / 25000); // Very small in Bohr units
  const minElectronDistance = Math.max(nucleusRadius * 2.5, orbital.n * 0.1); // Ensure electrons stay outside nucleus

  const initial = {
    x: (Math.random() - 0.5) * stepScale,
    y: (Math.random() - 0.5) * stepScale,
    z: (Math.random() - 0.5) * stepScale,
  };

  // Ensure initial position is outside nucleus
  const initialDistance = Math.sqrt(initial.x * initial.x + initial.y * initial.y + initial.z * initial.z);
  if (initialDistance < minElectronDistance) {
    const scale = minElectronDistance / initialDistance;
    initial.x *= scale;
    initial.y *= scale;
    initial.z *= scale;
  }

  let state = initial;
  let spherical = cartesianToSpherical(state.x, state.y, state.z);
  let currentDensity = evaluateDensity(orbital.n, orbital.l, orbital.m, spherical, z);
  const burnIn = 200;
  const totalSteps = burnIn + targetSamples * 30;

  for (let step = 0; step < totalSteps; step += 1) {
    const candidate = {
      x: state.x + (Math.random() - 0.5) * stepScale,
      y: state.y + (Math.random() - 0.5) * stepScale,
      z: state.z + (Math.random() - 0.5) * stepScale,
    };

    // Check if candidate position maintains electron-nucleus separation
    const candidateDistance = Math.sqrt(candidate.x * candidate.x + candidate.y * candidate.y + candidate.z * candidate.z);

    // Reject positions too close to nucleus
    if (candidateDistance < minElectronDistance) {
      continue;
    }

    const candSpherical = cartesianToSpherical(candidate.x, candidate.y, candidate.z);
    const candDensity = evaluateDensity(orbital.n, orbital.l, orbital.m, candSpherical, z);

    const accept = candDensity >= currentDensity || Math.random() < candDensity / (currentDensity + 1e-12);
    if (accept && candDensity > 0) {
      state = candidate;
      spherical = candSpherical;
      currentDensity = candDensity;
    }

    if (step > burnIn && step % 25 === 0) {
      samples.push({
        position: [state.x, state.y, state.z],
        density: currentDensity,
      });
      if (samples.length >= targetSamples) {
        break;
      }
    }
  }

  return samples;
}

export interface OrbitalSample {
  readonly elementSymbol: string;
  readonly quantum: OrbitalOccupancy["quantum"];
  readonly position: [number, number, number];
  readonly density: number;
}

export function generateOrbitalSamples(
  elementSymbol: string,
  atomicNumber: number,
  configuration: OrbitalOccupancy[],
  totalSamples = 1500,
): OrbitalSample[] {
  const samples: OrbitalSample[] = [];
  if (configuration.length === 0) {
    return samples;
  }

  const electronCount = configuration.length || 1;
  const averagePerElectron = totalSamples / electronCount;
  const perElectron = Math.max(30, Math.min(120, Math.round(averagePerElectron)));
  const stepBase = Math.max(1.2, configuration[configuration.length - 1].quantum.n * 0.9);

  for (const occupancy of configuration) {
    const electronSamples = metropolisSample(occupancy.quantum, atomicNumber, perElectron, stepBase);
    for (const sample of electronSamples) {
      samples.push({
        elementSymbol,
        quantum: occupancy.quantum,
        position: sample.position,
        density: sample.density,
      });
    }
  }

  return samples;
}

export function generateShellSamples(
  elementSymbol: string,
  atomicNumber: number,
  configuration: OrbitalOccupancy[],
  totalSamples = 800,
): OrbitalSample[] {
  const samples: OrbitalSample[] = [];
  if (configuration.length === 0) {
    return samples;
  }

  // Calculate nucleus radius for separation
  const nucleusRadius = Math.max(0.3, 0.8 * Math.pow(atomicNumber, 1/3) / 25000);
  const minElectronDistance = Math.max(nucleusRadius * 2.5, 0.1);

  const perElectron = Math.max(30, Math.floor(totalSamples / configuration.length));
  for (const occupancy of configuration) {
    // Ensure orbital radius is always outside nucleus
    const orbitalRadius = Math.max(minElectronDistance * 1.5, occupancy.quantum.n * 0.7);

    for (let i = 0; i < perElectron; i += 1) {
      const theta = Math.acos(1 - 2 * Math.random());
      const phi = Math.random() * TAU;
      const jitter = (Math.random() - 0.5) * 0.15 * orbitalRadius;
      const r = Math.max(minElectronDistance, orbitalRadius + jitter); // Ensure minimum distance

      const position = [
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta),
      ] as [number, number, number];

      samples.push({
        elementSymbol,
        quantum: occupancy.quantum,
        position,
        density: 1,
      });
    }
  }
  return samples;
}
