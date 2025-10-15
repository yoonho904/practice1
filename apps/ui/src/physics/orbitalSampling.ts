import type { HydrogenLikeAtom, QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';
import type { NodalConfiguration } from '../helpers/nodalConfig.js';
import { computeNodalConfiguration } from '../helpers/nodalConfig.js';
import { clearDensityFieldCache } from './densityFieldCache.js';
import type { DensityFieldData } from './densityField.js';

export interface OrbitalSamplingResult {
  positions: Float32Array;
  colors: Float32Array;
  basePositions: Float32Array;
  allValidPositions: Float32Array;
  extent: number;
  maxProbability: number;
  nodalConfig: NodalConfiguration;
  densityField?: DensityFieldData;
}

export type OrbitalCacheKey = `${number}:${number}:${number}:${number}`;

const orbitalSamplePoolCache = new Map<OrbitalCacheKey, { pool: Float32Array; extent: number; maxProbability: number }>();
const orbitalDistributionCache = new Map<OrbitalCacheKey, OrbitalDistribution>();
const radialDistributionCache = new Map<string, RadialDistribution>();

export const FIELD_EXTENT_TOLERANCE = 1e-3;
const TWO_PI = Math.PI * 2;
const RADIAL_TARGET_CDF = 0.9995;
const MIN_RADIAL_STEPS = 512;
const MAX_RADIAL_STEPS = 12000;
const EPSILON = 1e-6;
const factorialCache = new Map<number, number>();

interface RadialDistribution {
  radii: Float32Array;
  cdf: Float32Array;
  maxRadius: number;
  maxRadialAmplitude: number;
  step: number;
}

interface AngularDistribution {
  l: number;
  m: number;
  thetaValues: Float32Array;
  thetaCdf: Float32Array;
  phiValues: Float32Array | null;
  phiCdf: Float32Array | null;
  maxAngularAmplitude: number;
}

interface OrbitalDistribution {
  radial: RadialDistribution;
  angular: AngularDistribution;
  extent: number;
  maxProbability: number;
}


export function getOrbitalCacheKey(atomicNumber: number, quantumNumbers: QuantumNumbers): OrbitalCacheKey {
  return `${atomicNumber}:${quantumNumbers.n}:${quantumNumbers.l}:${quantumNumbers.m}`;
}

function getRadialCacheKey(atomicNumber: number, quantumNumbers: QuantumNumbers): string {
  return `${atomicNumber}:${quantumNumbers.n}:${quantumNumbers.l}`;
}

export function clearOrbitalSamplingCaches(): void {
  orbitalSamplePoolCache.clear();
  orbitalDistributionCache.clear();
  radialDistributionCache.clear();
  clearDensityFieldCache();
}

export function cloneOrbitalSamplingResult(source: OrbitalSamplingResult): OrbitalSamplingResult {
  return {
    positions: source.positions.slice(),
    colors: source.colors.slice(),
    basePositions: source.basePositions.slice(),
    allValidPositions: source.allValidPositions.slice(),
    extent: source.extent,
    maxProbability: source.maxProbability,
    nodalConfig: source.nodalConfig,
    densityField: source.densityField,
  };
}

export function getOrbitalColor(
  quantumNumbers: QuantumNumbers,
  isDarkBackground: boolean,
): { r: number; g: number; b: number } {
  const { l } = quantumNumbers;

  const baseColorsDark = [
    { r: 0.35, g: 1.0, b: 0.55 },   // s (l=0) - green
    { r: 0.3, g: 0.7, b: 1.0 },     // p (l=1) - blue
    { r: 1.0, g: 1.0, b: 1.0 },     // d (l=2) - white
    { r: 1.0, g: 0.35, b: 1.0 },    // f (l=3) - magenta
    { r: 1.0, g: 0.95, b: 0.3 },    // g (l=4) - yellow
  ];

  const baseColorsLight = [
    { r: 0.05, g: 0.45, b: 0.18 },
    { r: 0.1, g: 0.35, b: 0.7 },
    { r: 0.1, g: 0.1, b: 0.1 },
    { r: 0.55, g: 0.1, b: 0.55 },
    { r: 0.55, g: 0.38, b: 0.05 },
  ];

  const subshellColors = isDarkBackground ? baseColorsDark : baseColorsLight;
  const baseColor = subshellColors[l] || subshellColors[0];

  return {
    r: baseColor.r,
    g: baseColor.g,
    b: baseColor.b,
  };
}

export function generateOrbitalParticles(
  atom: HydrogenLikeAtom,
  atomicNumber: number,
  quantumNumbers: QuantumNumbers,
  count: number,
  isDarkBackground: boolean = true,
): OrbitalSamplingResult {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);

  const orbitalColor = getOrbitalColor(quantumNumbers, isDarkBackground);
  const { n, l, m } = quantumNumbers;

  if (l >= n || Math.abs(m) > l) {
    console.error(
      `[orbitalSampling] Invalid quantum numbers: n=${n}, l=${l}, m=${m}. ` +
      `Must satisfy: l < n and |m| <= l`
    );
    const fallback = new Float32Array(count * 3);
    return {
      positions: fallback,
      colors: fallback,
      basePositions: fallback,
      allValidPositions: fallback,
      extent: 1,
      maxProbability: 1,
    };
  }

  const orbitalKey = getOrbitalCacheKey(atomicNumber, quantumNumbers);
  const distribution = getOrbitalDistribution(atomicNumber, quantumNumbers, atom);
  const { radial, angular, extent, maxProbability } = distribution;

  const poolCount = Math.max(count, Math.floor(count * 1.15));
  const requiredPoolLength = poolCount * 3;

  let cached = orbitalSamplePoolCache.get(orbitalKey);
  let pool: Float32Array | null = null;

  if (
    cached &&
    cached.pool.length >= requiredPoolLength &&
    Math.abs(cached.extent - extent) < FIELD_EXTENT_TOLERANCE &&
    Math.abs(cached.maxProbability - maxProbability) <= Math.max(1e-12, maxProbability * 0.02)
  ) {
    pool = cached.pool;
  }

  if (!pool) {
    pool = new Float32Array(requiredPoolLength);
    for (let i = 0; i < poolCount; i++) {
      const r = sampleRadius(radial);
      const theta = sampleTheta(angular);
      const phi = samplePhi(angular);
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const x = r * sinTheta * Math.cos(phi);
      const y = r * sinTheta * Math.sin(phi);
      const z = r * cosTheta;
      const idx = i * 3;
      pool[idx] = x;
      pool[idx + 1] = y;
      pool[idx + 2] = z;
    }
    cached = { pool, extent, maxProbability };
    orbitalSamplePoolCache.set(orbitalKey, cached);
  }

  const poolLength = pool.length / 3;
  for (let i = 0; i < count; i++) {
    const sampleIndex = poolLength > count ? Math.floor(Math.random() * poolLength) : i % poolLength;
    const src = sampleIndex * 3;
    const dest = i * 3;

    const x = pool[src];
    const y = pool[src + 1];
    const z = pool[src + 2];

    positions[dest] = x;
    positions[dest + 1] = y;
    positions[dest + 2] = z;

    basePositions[dest] = x;
    basePositions[dest + 1] = y;
    basePositions[dest + 2] = z;

    const variation = 0.85 + Math.random() * 0.15;
    colors[dest] = orbitalColor.r * variation;
    colors[dest + 1] = orbitalColor.g * variation;
    colors[dest + 2] = orbitalColor.b * variation;
  }

  return {
    positions,
    colors,
    basePositions,
    allValidPositions: pool,
    extent,
    maxProbability,
    nodalConfig: computeNodalConfiguration(quantumNumbers, extent),
  };
}

function getOrbitalDistribution(
  atomicNumber: number,
  quantumNumbers: QuantumNumbers,
  atom: HydrogenLikeAtom,
): OrbitalDistribution {
  const cacheKey = getOrbitalCacheKey(atomicNumber, quantumNumbers);
  const cached = orbitalDistributionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const radial = getRadialDistribution(atomicNumber, quantumNumbers);
  const angular = createAngularDistribution(quantumNumbers);

  let maxProbability = radial.maxRadialAmplitude * angular.maxAngularAmplitude;
  if (!Number.isFinite(maxProbability) || maxProbability <= 0) {
    maxProbability = 0;
  }

  // Probe combined probability using the engine to guard against numerical drift
  if (atom) {
    let observedMax = 0;
    const radialStep = Math.max(1, Math.floor(radial.radii.length / 220));
    for (let ri = 0; ri < radial.radii.length; ri += radialStep) {
      const r = radial.radii[ri];
      const thetaValues = angular.thetaValues;
      const thetaStride = Math.max(1, Math.floor(thetaValues.length / 18));
      for (let ti = 0; ti < thetaValues.length; ti += thetaStride) {
        const theta = thetaValues[ti];
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        if (angular.phiValues && angular.phiValues.length > 0) {
          const phiValues = angular.phiValues;
          const phiStride = Math.max(1, Math.floor(phiValues.length / 36));
          for (let pi = 0; pi < phiValues.length; pi += phiStride) {
            const phi = phiValues[pi];
            const x = r * sinTheta * Math.cos(phi);
            const y = r * sinTheta * Math.sin(phi);
            const z = r * cosTheta;
            const density = atom.calculateProbabilityDensity(quantumNumbers, x, y, z);
            if (density > observedMax) {
              observedMax = density;
            }
          }
        } else {
          const phi = 0;
          const x = r * sinTheta * Math.cos(phi);
          const y = r * sinTheta * Math.sin(phi);
          const z = r * cosTheta;
          const density = atom.calculateProbabilityDensity(quantumNumbers, x, y, z);
          if (density > observedMax) {
            observedMax = density;
          }
        }
      }
    }
    if (observedMax > maxProbability) {
      maxProbability = observedMax;
    }
  }

  if (!Number.isFinite(maxProbability) || maxProbability <= 0) {
    maxProbability = 1e-10;
  }

  const paddedExtent = Math.max(
    radial.maxRadius + radial.step * 4,
    radial.maxRadius * 1.08,
    nSquaredExtent(quantumNumbers, atomicNumber),
  );

  const distribution: OrbitalDistribution = {
    radial,
    angular,
    extent: paddedExtent,
    maxProbability,
  };

  orbitalDistributionCache.set(cacheKey, distribution);
  return distribution;
}

function getRadialDistribution(atomicNumber: number, quantumNumbers: QuantumNumbers): RadialDistribution {
  const key = getRadialCacheKey(atomicNumber, quantumNumbers);
  const cached = radialDistributionCache.get(key);
  if (cached) {
    return cached;
  }

  const radial = buildRadialDistribution(atomicNumber, quantumNumbers);
  radialDistributionCache.set(key, radial);
  return radial;
}

function buildRadialDistribution(atomicNumber: number, quantumNumbers: QuantumNumbers): RadialDistribution {
  const { n, l } = quantumNumbers;
  const step = Math.max(0.012, Math.min(0.12, (n * n) / Math.max(120, atomicNumber * 420)));
  const radii: number[] = [];
  const cumulative: number[] = [];
  let area = 0;
  let prevPdf = 0;
  let maxRadialAmplitude = 0;
  let r = 0;
  let steps = 0;

  while (steps < MAX_RADIAL_STEPS) {
    const radialValue = radialWaveFunction(atomicNumber, n, l, r);
    const amplitudeSq = radialValue * radialValue;
    const pdf = amplitudeSq * r * r;
    if (amplitudeSq > maxRadialAmplitude) {
      maxRadialAmplitude = amplitudeSq;
    }
    radii.push(r);
    if (steps === 0) {
      cumulative.push(0);
    } else {
      area += ((prevPdf + pdf) * step) / 2;
      cumulative.push(area);
    }
    prevPdf = pdf;
    steps += 1;

    if (steps >= MIN_RADIAL_STEPS && area >= RADIAL_TARGET_CDF) {
      break;
    }

    r += step;
  }

  const totalArea = area || (prevPdf * step);
  if (totalArea <= 0 || radii.length < 2) {
    const fallbackRadius = Math.max(3, nSquaredExtent(quantumNumbers, atomicNumber));
    return {
      radii: new Float32Array([0, fallbackRadius]),
      cdf: new Float32Array([0, 1]),
      maxRadius: fallbackRadius,
      maxRadialAmplitude: Math.max(maxRadialAmplitude, 1e-6),
      step,
    };
  }

  const invTotal = 1 / totalArea;
  const normalizedCdf = new Float32Array(cumulative.length);
  for (let i = 0; i < cumulative.length; i++) {
    normalizedCdf[i] = clamp(cumulative[i] * invTotal, 0, 1);
  }
  normalizedCdf[normalizedCdf.length - 1] = 1;

  const radiiArray = new Float32Array(radii);
  const maxRadius = radiiArray[radiiArray.length - 1];

  return {
    radii: radiiArray,
    cdf: normalizedCdf,
    maxRadius,
    maxRadialAmplitude: Math.max(maxRadialAmplitude, 1e-12),
    step,
  };
}

function createAngularDistribution(quantumNumbers: QuantumNumbers): AngularDistribution {
  const { l, m } = quantumNumbers;
  const absM = Math.abs(m);

  const thetaSteps = Math.max(180, (l + absM + 1) * 60);
  const thetaStep = Math.PI / thetaSteps;
  const thetaValues = new Float32Array(thetaSteps + 1);
  const thetaCdf = new Float32Array(thetaSteps + 1);

  let thetaCumulative = 0;
  let prevThetaWeight = thetaWeight(l, absM, 0);
  thetaValues[0] = 0;
  thetaCdf[0] = 0;

  for (let i = 1; i <= thetaSteps; i++) {
    const theta = i * thetaStep;
    const weight = thetaWeight(l, absM, theta);
    thetaCumulative += (prevThetaWeight + weight) * thetaStep * 0.5;
    thetaValues[i] = theta;
    thetaCdf[i] = thetaCumulative;
    prevThetaWeight = weight;
  }

  if (thetaCumulative <= 0 || !Number.isFinite(thetaCumulative)) {
    for (let i = 0; i <= thetaSteps; i++) {
      thetaCdf[i] = i / thetaSteps;
    }
  } else {
    const invThetaTotal = 1 / thetaCumulative;
    for (let i = 0; i <= thetaSteps; i++) {
      thetaCdf[i] = clamp(thetaCdf[i] * invThetaTotal, 0, 1);
    }
    thetaCdf[thetaCdf.length - 1] = 1;
  }

  let phiValues: Float32Array | null = null;
  let phiCdf: Float32Array | null = null;

  if (absM > 0) {
    const phiSteps = Math.max(360, absM * 240);
    const phiStep = TWO_PI / phiSteps;
    phiValues = new Float32Array(phiSteps + 1);
    phiCdf = new Float32Array(phiSteps + 1);

    let phiCumulative = 0;
    let prevPhiWeight = phiWeight(absM, m < 0, 0);
    phiValues[0] = 0;
    phiCdf[0] = 0;

    for (let i = 1; i <= phiSteps; i++) {
      const phi = i * phiStep;
      const weight = phiWeight(absM, m < 0, phi);
      phiCumulative += (prevPhiWeight + weight) * phiStep * 0.5;
      phiValues[i] = phi;
      phiCdf[i] = phiCumulative;
      prevPhiWeight = weight;
    }

    if (phiCumulative <= 0 || !Number.isFinite(phiCumulative)) {
      for (let i = 0; i <= phiSteps; i++) {
        phiCdf[i] = i / phiSteps;
      }
    } else {
      const invPhiTotal = 1 / phiCumulative;
      for (let i = 0; i <= phiSteps; i++) {
        phiCdf[i] = clamp(phiCdf[i] * invPhiTotal, 0, 1);
      }
      phiCdf[phiCdf.length - 1] = 1;
    }
  }

  let maxAngularAmplitude = 0;
  const thetaSamplesForMax = Math.max(96, (l + absM + 1) * 48);
  const phiSamplesForMax = absM === 0 ? 1 : Math.max(192, absM * 256);

  for (let ti = 0; ti < thetaSamplesForMax; ti++) {
    const theta = Math.PI * (ti + 0.5) / thetaSamplesForMax;
    if (absM === 0) {
      const value = realSphericalHarmonic(l, m, theta, 0);
      const density = value * value;
      if (density > maxAngularAmplitude) {
        maxAngularAmplitude = density;
      }
    } else {
      for (let pi = 0; pi < phiSamplesForMax; pi++) {
        const phi = TWO_PI * (pi + 0.5) / phiSamplesForMax;
        const value = realSphericalHarmonic(l, m, theta, phi);
        const density = value * value;
        if (density > maxAngularAmplitude) {
          maxAngularAmplitude = density;
        }
      }
    }
  }

  if (!Number.isFinite(maxAngularAmplitude) || maxAngularAmplitude <= 0) {
    maxAngularAmplitude = 1 / (4 * Math.PI);
  }

  return {
    l,
    m,
    thetaValues,
    thetaCdf,
    phiValues,
    phiCdf,
    maxAngularAmplitude,
  };
}

function thetaWeight(l: number, absM: number, theta: number): number {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const legendre = associatedLegendre(l, absM, cosTheta);
  const amplitudeSq = legendre * legendre;
  return amplitudeSq * Math.max(sinTheta, EPSILON);
}

function phiWeight(absM: number, useSin: boolean, phi: number): number {
  if (absM === 0) {
    return 1;
  }
  const argument = absM * phi;
  const base = useSin ? Math.sin(argument) : Math.cos(argument);
  const weight = base * base;
  return Math.max(weight, EPSILON);
}

function sampleTheta(distribution: AngularDistribution): number {
  return sampleFromCdf(distribution.thetaValues, distribution.thetaCdf);
}

function samplePhi(distribution: AngularDistribution): number {
  if (!distribution.phiValues || !distribution.phiCdf) {
    return Math.random() * TWO_PI;
  }
  const value = sampleFromCdf(distribution.phiValues, distribution.phiCdf);
  let phi = value % TWO_PI;
  if (phi < 0) {
    phi += TWO_PI;
  }
  return phi;
}

function sampleRadius(distribution: RadialDistribution): number {
  return sampleFromCdf(distribution.radii, distribution.cdf);
}

function sampleFromCdf(values: Float32Array, cdf: Float32Array): number {
  if (values.length === 0 || cdf.length === 0) {
    return 0;
  }

  const target = Math.random();
  let low = 0;
  let high = cdf.length - 1;

  while (low < high) {
    const mid = (low + high) >> 1;
    if (cdf[mid] < target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const idx = low;
  const prevCdf = idx === 0 ? 0 : cdf[idx - 1];
  const currentCdf = cdf[idx];
  const span = Math.max(currentCdf - prevCdf, EPSILON);
  const t = (target - prevCdf) / span;
  const v0 = idx === 0 ? values[0] : values[idx - 1];
  const v1 = values[idx];
  return v0 + (v1 - v0) * t;
}

function radialWaveFunction(atomicNumber: number, n: number, l: number, r: number): number {
  const a0 = 1;
  const Z = atomicNumber;
  const rho = (2 * Z * r) / (n * a0);

  const normalization = Math.sqrt(
    Math.pow((2 * Z) / (n * a0), 3) * factorial(n - l - 1) / (2 * n * factorial(n + l))
  );

  const laguerre = associatedLaguerre(n - l - 1, 2 * l + 1, rho);
  const power = l > 0 ? Math.pow(rho, l) : 1;

  return normalization * power * Math.exp(-rho / 2) * laguerre;
}

function associatedLaguerre(n: number, alpha: number, x: number): number {
  if (n === 0) {return 1;}
  if (n === 1) {return 1 + alpha - x;}

  let L0 = 1;
  let L1 = 1 + alpha - x;

  for (let i = 2; i <= n; i++) {
    const numerator = (2 * i - 1 + alpha - x) * L1 - (i - 1 + alpha) * L0;
    const Li = numerator / i;
    L0 = L1;
    L1 = Li;
  }

  return L1;
}

function associatedLegendre(l: number, m: number, x: number): number {
  if (m < 0 || m > l) {
    return 0;
  }

  if (Math.abs(x) > 1) {
    return 0;
  }

  let pmm = 1.0;
  if (m > 0) {
    const somx2 = Math.sqrt(1 - x * x);
    let fact = 1.0;
    for (let i = 1; i <= m; i++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }

  if (l === m) {
    return pmm;
  }

  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) {
    return pmmp1;
  }

  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = ((2 * ll - 1) * x * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }

  return pll;
}

function realSphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
  if (l === 0 && m === 0) {
    return 1 / Math.sqrt(4 * Math.PI);
  }

  const absM = Math.abs(m);
  const sqrtFactor = m !== 0 ? Math.sqrt(2) : 1;
  const normalization = sqrtFactor * Math.sqrt(
    ((2 * l + 1) * factorial(l - absM)) / (4 * Math.PI * factorial(l + absM))
  );

  const legendre = associatedLegendre(l, absM, Math.cos(theta));
  const phase = Math.pow(-1, absM);
  const azimuthal =
    m > 0 ? Math.cos(m * phi) :
    m < 0 ? Math.sin(absM * phi) :
    1;

  return normalization * phase * legendre * azimuthal;
}

function factorial(n: number): number {
  if (n < 0) {
    throw new Error('Factorial of negative number');
  }
  if (n <= 1) {
    return 1;
  }
  const cached = factorialCache.get(n);
  if (cached) {
    return cached;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  factorialCache.set(n, result);
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function nSquaredExtent(quantumNumbers: QuantumNumbers, atomicNumber: number): number {
  const { n } = quantumNumbers;
  const scaled = (n * n) / Math.max(1, atomicNumber);
  return Math.max(2, scaled * 1.2 + 0.5 * n);
}
