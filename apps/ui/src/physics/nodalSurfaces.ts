import type { HydrogenLikeAtom, QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';

export interface NodalSurfaceData {
  readonly radialNodes: Float32Array;
  readonly coneAngles: Float32Array;
  readonly phiAngles: Float32Array;
  readonly includeHorizontalPlane: boolean;
}

const EPSILON = 1e-3;

function bisectRoot(
  fn: (x: number) => number,
  a: number,
  b: number,
  fa: number,
): number {
  let left = a;
  let right = b;
  let fLeft = fa;
  for (let i = 0; i < 40; i += 1) {
    const mid = 0.5 * (left + right);
    const fMid = fn(mid);
    if (Math.abs(fMid) < 1e-6 || Math.abs(right - left) < 1e-3) {
      return mid;
    }

    if (fLeft * fMid <= 0) {
      right = mid;
    } else {
      left = mid;
      fLeft = fMid;
    }
  }

  return 0.5 * (left + right);
}

function associatedLegendre(l: number, m: number, x: number): number {
  const absM = Math.abs(m);
  if (absM > l) {
    return 0;
  }

  const clampX = Math.min(1, Math.max(-1, x));

  let pmm = 1;
  if (absM > 0) {
    const somx2 = Math.sqrt((1 - clampX) * (1 + clampX));
    let fact = 1;
    for (let i = 1; i <= absM; i += 1) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }

  if (l === absM) {
    return m < 0 && absM % 2 === 1 ? -pmm : pmm;
  }

  let pmmp1 = clampX * (2 * absM + 1) * pmm;
  if (l === absM + 1) {
    return m < 0 && absM % 2 === 1 ? -pmmp1 : pmmp1;
  }

  let pll = 0;
  for (let ll = absM + 2; ll <= l; ll += 1) {
    pll = ((2 * ll - 1) * clampX * pmmp1 - (ll + absM - 1) * pmm) / (ll - absM);
    pmm = pmmp1;
    pmmp1 = pll;
  }

  const result = m < 0 && absM % 2 === 1 ? -pmmp1 : pmmp1;
  return result;
}

function findAssociatedLegendreRoots(l: number, m: number): number[] {
  if (l === 0) {
    return [];
  }

  const roots: number[] = [];
  const samples = 4096;
  let previousX = -1;
  let previousValue = associatedLegendre(l, m, previousX + 1e-5);

  const evaluate = (x: number) => associatedLegendre(l, m, x);

  for (let i = 1; i <= samples; i += 1) {
    const x = -1 + (2 * i) / samples;
    const value = evaluate(x);

    if (!Number.isFinite(value)) {
      previousX = x;
      previousValue = value;
      continue;
    }

    if (previousValue === 0) {
      roots.push(previousX);
    } else if (previousValue * value < 0) {
      roots.push(bisectRoot(evaluate, previousX, x, previousValue));
    }

    previousX = x;
    previousValue = value;
  }

  const sorted = roots.sort((a, b) => a - b);
  const filtered: number[] = [];
  for (const value of sorted) {
    if (Math.abs(value + 1) < EPSILON || Math.abs(value - 1) < EPSILON) {
      continue;
    }
    if (filtered.every((existing) => Math.abs(existing - value) > EPSILON)) {
      filtered.push(value);
    }
  }
  return filtered;
}

function findRadialNodes(
  atom: HydrogenLikeAtom,
  quantumNumbers: QuantumNumbers,
  maxRadius: number,
): number[] {
  const nodes: number[] = [];
  const samples = 2048;
  let previousR = 1e-4;
  let previousValue = atom.calculateWaveFunction(quantumNumbers, 0, 0, previousR);

  const evaluate = (r: number) => atom.calculateWaveFunction(quantumNumbers, 0, 0, r);

  for (let i = 1; i <= samples; i += 1) {
    const r = (i / samples) * maxRadius;
    const value = evaluate(r);
    if (!Number.isFinite(value)) {
      continue;
    }

    if (previousValue === 0) {
      nodes.push(previousR);
    } else if (previousValue * value < 0) {
      nodes.push(bisectRoot(evaluate, previousR, r, previousValue));
    }

    previousR = r;
    previousValue = value;
  }

  return nodes;
}

export function computeNodalSurfaceData(
  atom: HydrogenLikeAtom,
  quantumNumbers: QuantumNumbers,
  extent: number,
): NodalSurfaceData {
  const { l, m } = quantumNumbers;
  const radialNodes = findRadialNodes(atom, quantumNumbers, extent * 1.25);

  if (l === 0) {
    return {
      radialNodes: new Float32Array(radialNodes),
      coneAngles: new Float32Array(0),
      phiAngles: new Float32Array(0),
      includeHorizontalPlane: false,
    };
  }

  const coneAngles: number[] = [];
  const phiAngles: number[] = [];
  let includeHorizontalPlane = false;

  const addConeAngle = (theta: number) => {
    const normalized = theta > Math.PI / 2 ? Math.PI - theta : theta;
    if (normalized < EPSILON) {
      return;
    }
    if (Math.abs(normalized - Math.PI / 2) < EPSILON) {
      includeHorizontalPlane = true;
      return;
    }
    coneAngles.push(normalized);
  };

  const angularRoots = findAssociatedLegendreRoots(l, Math.abs(m));
  for (const root of angularRoots) {
    const clamped = Math.min(1, Math.max(-1, root));
    const theta = Math.acos(clamped);
    addConeAngle(theta);
  }

  if (m > 0) {
    const absM = m;
    for (let k = 0; k < absM; k += 1) {
      const phi = ((k + 0.5) * Math.PI) / absM;
      phiAngles.push(phi);
    }
  } else if (m < 0) {
    const absM = Math.abs(m);
    for (let k = 0; k < absM; k += 1) {
      const phi = (k * Math.PI) / absM;
      phiAngles.push(phi);
    }
  }

  return {
    radialNodes: new Float32Array(radialNodes),
    coneAngles: new Float32Array(coneAngles),
    phiAngles: new Float32Array(phiAngles),
    includeHorizontalPlane,
  };
}
