/**
 * PLACEHOLDER ORBITAL UTILITIES
 *
 * This file was deleted during orbital system destruction but some components
 * still import constants from it. This provides minimal stubs to prevent build errors.
 * Will be replaced in the new system.
 */

export const ORBITAL_COLOR_PALETTE = {
  '1s': '#3399ff',
  '2s': '#33ccff',
  '2p': '#33ff66',
  '3s': '#66ff33',
  '3p': '#99ff33',
  '3d': '#ff9933',
  '4s': '#ccff33',
  '4p': '#ffcc33',
  '4d': '#ff6633',
  '4f': '#cc33ff',
  '5s': '#ffff33',
  '5p': '#ffcc66',
  '5d': '#ff3366',
  '5f': '#9933ff',
  '6s': '#ff9966',
  '6p': '#ffcc99',
  '6d': '#ff0066',
  '7s': '#ff6699',
  '7p': '#ff99cc'
};

export function orbitalLabel(n: number, l: number): string {
  const subshells = ['s', 'p', 'd', 'f'];
  return `${n}${subshells[l] || 'x'}`;
}

export function orbitalKey(n: number, l: number): string {
  return orbitalLabel(n, l);
}

export function orbitalStateKey(n: number, l: number, m: number): string {
  return `${orbitalLabel(n, l)}_${m}`;
}

export function orbitalOrientationLabel(m: number): string {
  if (m === 0) return 'z';
  if (m === 1) return 'x';
  if (m === -1) return 'y';
  return `m=${m}`;
}