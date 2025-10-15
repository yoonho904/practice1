import { PI, TAU, associatedLegendre, generalizedLaguerre, factorial } from "./math.js";
import type { OrbitalOccupancy } from "./orbitals.js";

const A0 = 1; // Bohr radius in arbitrary units

// Enhanced screening for better multi-electron accuracy
function getEffectiveNuclearCharge(n: number, l: number, z: number): number {
  // Improved Slater's rules with better screening constants
  let sigma = 0;

  // Same group (n,l) electrons
  if (n === 1 && l === 0) {
    sigma += 0.30; // 1s
  } else if (l === 0) {
    sigma += 0.85; // ns electrons
  } else if (l === 1) {
    sigma += 0.35; // np electrons
  } else if (l === 2) {
    sigma += 0.35; // nd electrons
  } else {
    sigma += 0.35; // nf electrons
  }

  // Inner shells contribute more screening
  for (let shell = 1; shell < n; shell++) {
    if (shell === n - 1) {
      sigma += (l === 0) ? 0.85 : 1.00; // (n-1) shell
    } else {
      sigma += 1.00; // Inner shells
    }
  }

  return Math.max(1.0, z - sigma);
}

function radialWaveFunction(n: number, l: number, r: number, zEff: number): number {
  const rho = (2 * zEff * r) / (n * A0);

  // Normalization constant
  const norm = Math.sqrt(
    Math.pow(2 * zEff / (n * A0), 3) *
    factorial(n - l - 1) / (2 * n * factorial(n + l))
  );

  // Radial part: R_nl(r) = norm * exp(-rho/2) * rho^l * L_{n-l-1}^{2l+1}(rho)
  const laguerre = generalizedLaguerre(n - l - 1, 2 * l + 1, rho);
  return norm * Math.exp(-rho / 2) * Math.pow(rho, l) * laguerre;
}

function sphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
  const absM = Math.abs(m);
  const legendre = associatedLegendre(l, absM, Math.cos(theta));

  // Normalization
  const norm = Math.sqrt(
    ((2 * l + 1) / (4 * PI)) *
    (factorial(l - absM) / factorial(l + absM))
  );

  if (m === 0) {
    return norm * legendre;
  }

  const factor = Math.sqrt(2) * norm;
  if (m > 0) {
    return factor * legendre * Math.cos(m * phi);
  }
  return factor * legendre * Math.sin(absM * phi);
}

function waveFunction(n: number, l: number, m: number, r: number, theta: number, phi: number, z: number): number {
  const zEff = getEffectiveNuclearCharge(n, l, z);
  const radial = radialWaveFunction(n, l, r, zEff);
  const angular = sphericalHarmonic(l, m, theta, phi);
  return radial * angular;
}

function probabilityDensity(n: number, l: number, m: number, r: number, theta: number, phi: number, z: number): number {
  const psi = waveFunction(n, l, m, r, theta, phi, z);
  return psi * psi;
}

export interface BohemianSample {
  readonly position: [number, number, number];
  readonly waveFunction: number;
  readonly probability: number;
  readonly phase: number;
  readonly shell: number;
  readonly subshell: string;
}

export interface OrbitalLayer {
  readonly n: number;
  readonly l: number;
  readonly m: number;
  readonly samples: BohemianSample[];
  readonly maxProbability: number;
  readonly averageRadius: number;
}

function cartesianToSpherical(x: number, y: number, z: number): { r: number; theta: number; phi: number } {
  const r = Math.sqrt(x * x + y * y + z * z);
  const theta = r === 0 ? 0 : Math.acos(Math.max(-1, Math.min(1, z / r)));
  const phi = Math.atan2(y, x);
  return { r, theta, phi: phi < 0 ? phi + TAU : phi };
}

function sphericalToCartesian(r: number, theta: number, phi: number): [number, number, number] {
  return [
    r * Math.sin(theta) * Math.cos(phi),
    r * Math.sin(theta) * Math.sin(phi),
    r * Math.cos(theta)
  ];
}

// Enhanced Metropolis sampling for better wave function representation
function sampleOrbitalBohemian(
  quantum: { n: number; l: number; m: number },
  atomicNumber: number,
  numSamples: number = 2000
): BohemianSample[] {
  const samples: BohemianSample[] = [];
  const { n, l, m } = quantum;

  // Calculate expected radius for this orbital
  const expectedRadius = n * n / getEffectiveNuclearCharge(n, l, atomicNumber);
  const stepSize = expectedRadius * 0.3;

  // Nuclear exclusion radius
  const nuclearRadius = Math.max(0.1, 0.02 * Math.pow(atomicNumber, 1/3));
  const minRadius = Math.max(nuclearRadius * 3, n * 0.2);

  // Start from expected orbital region
  let currentPos = [
    (Math.random() - 0.5) * expectedRadius * 2,
    (Math.random() - 0.5) * expectedRadius * 2,
    (Math.random() - 0.5) * expectedRadius * 2
  ] as [number, number, number];

  // Ensure starting position is outside nucleus
  const currentSph = cartesianToSpherical(...currentPos);
  if (currentSph.r < minRadius) {
    currentPos = sphericalToCartesian(minRadius, currentSph.theta, currentSph.phi);
  }

  let currentProb = probabilityDensity(n, l, m, currentSph.r, currentSph.theta, currentSph.phi, atomicNumber);

  const burnIn = 500;
  const totalSteps = burnIn + numSamples * 50;
  let _accepted = 0;

  for (let step = 0; step < totalSteps; step++) {
    // Propose new position with adaptive step size
    const newPos = [
      currentPos[0] + (Math.random() - 0.5) * stepSize,
      currentPos[1] + (Math.random() - 0.5) * stepSize,
      currentPos[2] + (Math.random() - 0.5) * stepSize
    ] as [number, number, number];

    const newSph = cartesianToSpherical(...newPos);

    // Reject if too close to nucleus
    if (newSph.r < minRadius) {
      continue;
    }

    const newProb = probabilityDensity(n, l, m, newSph.r, newSph.theta, newSph.phi, atomicNumber);

    // Metropolis acceptance criterion
    const acceptanceRatio = newProb / (currentProb + 1e-15);
    if (acceptanceRatio >= 1 || Math.random() < acceptanceRatio) {
      currentPos = newPos;
      currentProb = newProb;
      _accepted++;
    }

    // Collect samples after burn-in
    if (step >= burnIn && step % 25 === 0 && samples.length < numSamples) {
      const sph = cartesianToSpherical(...currentPos);
      const wf = waveFunction(n, l, m, sph.r, sph.theta, sph.phi, atomicNumber);
      const phase = Math.atan2(0, wf); // Real part only for now

      samples.push({
        position: [...currentPos],
        waveFunction: wf,
        probability: currentProb,
        phase: phase,
        shell: n,
        subshell: `${n}${'spdf'[l] || 'x'}`
      });
    }
  }

  return samples;
}

// Generate layered orbital structure for visualization
export function generateOrbitalLayers(
  configuration: OrbitalOccupancy[],
  atomicNumber: number,
  samplesPerOrbital: number = 1500
): OrbitalLayer[] {
  const layerMap = new Map<string, OrbitalLayer>();

  for (const occupancy of configuration) {
    const { n, l, m } = occupancy.quantum;
    const key = `${n}_${l}_${m}`;

    if (!layerMap.has(key)) {
      const samples = sampleOrbitalBohemian(occupancy.quantum, atomicNumber, samplesPerOrbital);

      const maxProbability = Math.max(...samples.map(s => s.probability));
      const averageRadius = samples.reduce((sum, s) => {
        const r = Math.sqrt(s.position[0]**2 + s.position[1]**2 + s.position[2]**2);
        return sum + r;
      }, 0) / samples.length;

      layerMap.set(key, {
        n,
        l,
        m,
        samples,
        maxProbability,
        averageRadius
      });
    }
  }

  // Sort layers by energy (approximate)
  return Array.from(layerMap.values()).sort((a, b) => {
    // Energy ordering: n + l, then n
    const energyA = a.n + a.l + a.l * 0.1;
    const energyB = b.n + b.l + b.l * 0.1;
    return energyA - energyB;
  });
}

// Calculate orbital boundary surfaces for shape visualization
export function getOrbitalBoundary(
  n: number,
  l: number,
  m: number,
  atomicNumber: number,
  isoValue: number = 0.1
): Array<[number, number, number]> {
  const boundary: Array<[number, number, number]> = [];
  const zEff = getEffectiveNuclearCharge(n, l, atomicNumber);
  const maxRadius = n * n / zEff * 3; // Approximate outer boundary

  // Sample spherical surface
  const numTheta = 24;
  const numPhi = 48;

  for (let i = 0; i <= numTheta; i++) {
    const theta = (i / numTheta) * PI;

    for (let j = 0; j <= numPhi; j++) {
      const phi = (j / numPhi) * TAU;

      // Find radius where probability density equals isoValue
      let r = 0.5;
      let step = 0.1;

      for (let iter = 0; iter < 50; iter++) {
        const prob = probabilityDensity(n, l, m, r, theta, phi, atomicNumber);

        if (Math.abs(prob - isoValue) < 0.001) {
          break;
        }

        if (prob > isoValue) {
          r -= step;
        } else {
          r += step;
        }

        step *= 0.9;
        if (r <= 0 || r > maxRadius) {break;}
      }

      if (r > 0 && r < maxRadius) {
        boundary.push(sphericalToCartesian(r, theta, phi));
      }
    }
  }

  return boundary;
}