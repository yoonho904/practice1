import type { ElementRecord } from "@bio-sim/atomic-data";

export interface OrbitalQuantumNumbers {
  readonly n: number;
  readonly l: number;
  readonly m: number;
  readonly spin: 1 | -1;
}

export interface OrbitalOccupancy {
  readonly quantum: OrbitalQuantumNumbers;
  readonly electronIndex: number;
}

const ORBITAL_ORDER: Array<{ n: number; l: number; label: string }> = [
  { n: 1, l: 0, label: "1s" },
  { n: 2, l: 0, label: "2s" },
  { n: 2, l: 1, label: "2p" },
  { n: 3, l: 0, label: "3s" },
  { n: 3, l: 1, label: "3p" },
  { n: 4, l: 0, label: "4s" },
  { n: 3, l: 2, label: "3d" },
  { n: 4, l: 1, label: "4p" },
  { n: 5, l: 0, label: "5s" },
  { n: 4, l: 2, label: "4d" },
  { n: 5, l: 1, label: "5p" },
  { n: 6, l: 0, label: "6s" },
  { n: 4, l: 3, label: "4f" },
  { n: 5, l: 2, label: "5d" },
  { n: 6, l: 1, label: "6p" },
  { n: 7, l: 0, label: "7s" },
  { n: 5, l: 3, label: "5f" },
  { n: 6, l: 2, label: "6d" },
  { n: 7, l: 1, label: "7p" },
];

function degeneracy(l: number): number {
  return 2 * l + 1;
}

function fillOrbital(n: number, l: number, electronOffset: number, electronsRemaining: number): OrbitalOccupancy[] {
  const slots: OrbitalOccupancy[] = [];
  const deg = degeneracy(l);
  const totalSlotCapacity = deg * 2;
  const electronsToPlace = Math.min(totalSlotCapacity, electronsRemaining);

  // Hund's rule: fill each magnetic quantum number with parallel spins before pairing
  const ms: number[] = [];
  for (let m = -l; m <= l; m += 1) {
    ms.push(m);
  }

  let placed = 0;
  // first pass spin +1
  for (const m of ms) {
    if (placed >= electronsToPlace) {
      break;
    }
    slots.push({
      quantum: { n, l, m, spin: 1 },
      electronIndex: electronOffset + placed,
    });
    placed += 1;
  }

  // second pass spin -1
  for (const m of ms) {
    if (placed >= electronsToPlace) {
      break;
    }
    slots.push({
      quantum: { n, l, m, spin: -1 },
      electronIndex: electronOffset + placed,
    });
    placed += 1;
  }

  return slots;
}

export function buildElectronConfiguration(atomicNumber: number): OrbitalOccupancy[] {
  const result: OrbitalOccupancy[] = [];
  let remaining = atomicNumber;
  let index = 0;

  for (const orbital of ORBITAL_ORDER) {
    if (remaining <= 0) {
      break;
    }
    const filled = fillOrbital(orbital.n, orbital.l, index, remaining);
    result.push(...filled);
    remaining -= filled.length;
    index += filled.length;
  }

  return result;
}

export function configurationForElement(element: ElementRecord): OrbitalOccupancy[] {
  return buildElectronConfiguration(element.atomicNumber);
}
