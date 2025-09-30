/**
 * Quick verification script for orbital mathematics
 */

import { HydrogenLikeAtom } from './src/models/hydrogen-like.js';

const hydrogen = new HydrogenLikeAtom(1);

console.log('=== Energy Level Verification ===');
console.log('1s energy:', hydrogen.calculateEnergy({ n: 1, l: 0, m: 0, s: 0.5 }).energy, '(expected: -0.5)');
console.log('2s energy:', hydrogen.calculateEnergy({ n: 2, l: 0, m: 0, s: 0.5 }).energy, '(expected: -0.125)');
console.log('3d energy:', hydrogen.calculateEnergy({ n: 3, l: 2, m: 0, s: 0.5 }).energy, '(expected: -0.0556)');
console.log('4f energy:', hydrogen.calculateEnergy({ n: 4, l: 3, m: 0, s: 0.5 }).energy, '(expected: -0.03125)');
console.log('5g energy:', hydrogen.calculateEnergy({ n: 5, l: 4, m: 0, s: 0.5 }).energy, '(expected: -0.02)');

console.log('\n=== s Orbital Spherical Symmetry ===');
const qn_2s = { n: 2, l: 0, m: 0, s: 0.5 };
const r = 2.0;
const psi_x = hydrogen.calculateWaveFunction(qn_2s, r, 0, 0);
const psi_y = hydrogen.calculateWaveFunction(qn_2s, 0, r, 0);
const psi_z = hydrogen.calculateWaveFunction(qn_2s, 0, 0, r);
console.log('Ψ(2,0,0):', psi_x);
console.log('Ψ(0,2,0):', psi_y);
console.log('Ψ(0,0,2):', psi_z);
console.log('Symmetric:', Math.abs(psi_x - psi_y) < 1e-10 && Math.abs(psi_y - psi_z) < 1e-10);

console.log('\n=== p_z Nodal Plane (z=0) ===');
const qn_2p = { n: 2, l: 1, m: 0, s: 0.5 };
const psi_xy1 = hydrogen.calculateWaveFunction(qn_2p, 1, 0, 0);
const psi_xy2 = hydrogen.calculateWaveFunction(qn_2p, 0, 1, 0);
const psi_xy3 = hydrogen.calculateWaveFunction(qn_2p, 1, 1, 0);
console.log('Ψ(1,0,0):', psi_xy1, '(should be ~0)');
console.log('Ψ(0,1,0):', psi_xy2, '(should be ~0)');
console.log('Ψ(1,1,0):', psi_xy3, '(should be ~0)');
console.log('Has nodal plane:', Math.abs(psi_xy1) < 1e-6 && Math.abs(psi_xy2) < 1e-6);

console.log('\n=== High n/l Orbital Non-Zero Check ===');
const qn_3d = { n: 3, l: 2, m: 0, s: 0.5 };
const qn_4f = { n: 4, l: 3, m: 0, s: 0.5 };
const qn_5g = { n: 5, l: 4, m: 0, s: 0.5 };

const density_3d = hydrogen.calculateProbabilityDensity(qn_3d, 0, 0, 9);
const density_4f = hydrogen.calculateProbabilityDensity(qn_4f, 0, 0, 16);
const density_5g = hydrogen.calculateProbabilityDensity(qn_5g, 0, 0, 25);

console.log('3d density at r=9:', density_3d, '(should be > 0)');
console.log('4f density at r=16:', density_4f, '(should be > 0)');
console.log('5g density at r=25:', density_5g, '(should be > 0)');

console.log('\n=== 2s Radial Node Count ===');
const qn_2s_node = { n: 2, l: 0, m: 0, s: 0.5 };
let nodeCount = 0;
let prevSign = Math.sign(hydrogen.calculateWaveFunction(qn_2s_node, 0, 0, 0.1));

for (let r = 0.1; r < 10; r += 0.2) {
  const psi = hydrogen.calculateWaveFunction(qn_2s_node, 0, 0, r);
  const currSign = Math.sign(psi);

  if (currSign !== prevSign && prevSign !== 0 && Math.abs(psi) > 1e-10) {
    nodeCount++;
    console.log(`  Node found at r ≈ ${r.toFixed(2)}`);
    prevSign = currSign;
  } else if (Math.abs(psi) > 1e-10) {
    prevSign = currSign;
  }
}
console.log('Total radial nodes:', nodeCount, '(expected: 1)');

console.log('\n=== d Orbital All m Values ===');
for (let m = -2; m <= 2; m++) {
  const qn_d = { n: 3, l: 2, m, s: 0.5 };
  // Test at a generic point not on any axis to avoid nodal surfaces
  const r = 6;
  const theta = Math.PI / 4;
  const phi = Math.PI / 3;
  const x = r * Math.sin(theta) * Math.cos(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(theta);
  const density = hydrogen.calculateProbabilityDensity(qn_d, x, y, z);
  console.log(`3d (m=${m}) density:`, density, density > 0 ? '✓' : '✗');
}

console.log('\n=== Peak Location Check ===');
const qn_3d_peak = { n: 3, l: 2, m: 0, s: 0.5 };
let maxDensity = 0;
let maxR = 0;

for (let r = 0; r < 20; r += 0.5) {
  const density = hydrogen.calculateProbabilityDensity(qn_3d_peak, 0, 0, r);
  if (density > maxDensity) {
    maxDensity = density;
    maxR = r;
  }
}
console.log('3d peak at r =', maxR, '(expected around 9, n²)');
console.log('Within 50% of expected:', maxR > 4.5 && maxR < 13.5 ? '✓' : '✗');
