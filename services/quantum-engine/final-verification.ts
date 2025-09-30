/**
 * Final comprehensive verification of quantum orbital mathematics
 */

import { HydrogenLikeAtom } from './src/models/hydrogen-like.js';

const hydrogen = new HydrogenLikeAtom(1);

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   COMPREHENSIVE QUANTUM ORBITAL VERIFICATION             ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let passedTests = 0;

function test(name: string, condition: boolean) {
  totalTests++;
  const status = condition ? '✓ PASS' : '✗ FAIL';
  if (condition) passedTests++;
  console.log(`${status}: ${name}`);
  return condition;
}

// === Energy Levels ===
console.log('\n1. ENERGY LEVELS');
test('1s energy = -0.5 Ha', Math.abs(hydrogen.calculateEnergy({ n: 1, l: 0, m: 0, s: 0.5 }).energy + 0.5) < 1e-10);
test('2s energy = -0.125 Ha', Math.abs(hydrogen.calculateEnergy({ n: 2, l: 0, m: 0, s: 0.5 }).energy + 0.125) < 1e-10);
test('3d energy = -0.0556 Ha', Math.abs(hydrogen.calculateEnergy({ n: 3, l: 2, m: 0, s: 0.5 }).energy + 0.0556) < 0.001);
test('4f energy = -0.03125 Ha', Math.abs(hydrogen.calculateEnergy({ n: 4, l: 3, m: 0, s: 0.5 }).energy + 0.03125) < 1e-10);
test('5g energy = -0.02 Ha', Math.abs(hydrogen.calculateEnergy({ n: 5, l: 4, m: 0, s: 0.5 }).energy + 0.02) < 1e-10);

// === Spherical Symmetry ===
console.log('\n2. SPHERICAL SYMMETRY');
const r1 = 3.0;
const psi_1s_x = hydrogen.calculateWaveFunction({ n: 1, l: 0, m: 0, s: 0.5 }, r1, 0, 0);
const psi_1s_y = hydrogen.calculateWaveFunction({ n: 1, l: 0, m: 0, s: 0.5 }, 0, r1, 0);
const psi_1s_z = hydrogen.calculateWaveFunction({ n: 1, l: 0, m: 0, s: 0.5 }, 0, 0, r1);
test('1s is spherically symmetric', Math.abs(psi_1s_x - psi_1s_y) < 1e-10 && Math.abs(psi_1s_y - psi_1s_z) < 1e-10);

// === Nodal Surfaces ===
console.log('\n3. NODAL SURFACES');
const psi_2pz_xy = hydrogen.calculateWaveFunction({ n: 2, l: 1, m: 0, s: 0.5 }, 1, 1, 0);
test('2p_z has nodal plane at z=0', Math.abs(psi_2pz_xy) < 1e-10);

// === High n/l Orbitals ===
console.log('\n4. HIGH n/l ORBITALS');
test('3d orbital is non-zero', hydrogen.calculateProbabilityDensity({ n: 3, l: 2, m: 0, s: 0.5 }, 0, 0, 6) > 0);
test('4f orbital is non-zero', hydrogen.calculateProbabilityDensity({ n: 4, l: 3, m: 0, s: 0.5 }, 0, 0, 12) > 0);
test('5g orbital is non-zero', hydrogen.calculateProbabilityDensity({ n: 5, l: 4, m: 0, s: 0.5 }, 0, 0, 20) > 0);

// === All m Values for d Orbitals ===
console.log('\n5. d ORBITAL m VALUES');
for (let m = -2; m <= 2; m++) {
  const r = 6;
  const theta = Math.PI / 4;
  const phi = Math.PI / 3;
  const x = r * Math.sin(theta) * Math.cos(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(theta);
  const density = hydrogen.calculateProbabilityDensity({ n: 3, l: 2, m, s: 0.5 }, x, y, z);
  test(`3d m=${m} orbital is non-zero`, density > 0);
}

// === All m Values for f Orbitals ===
console.log('\n6. f ORBITAL m VALUES');
for (let m = -3; m <= 3; m++) {
  const r = 12;
  const theta = Math.PI / 3;
  const phi = Math.PI / 4;
  const x = r * Math.sin(theta) * Math.cos(phi);
  const y = r * Math.sin(theta) * Math.sin(phi);
  const z = r * Math.cos(theta);
  const density = hydrogen.calculateProbabilityDensity({ n: 4, l: 3, m, s: 0.5 }, x, y, z);
  test(`4f m=${m} orbital is non-zero`, density > 0);
}

// === Radial Nodes ===
console.log('\n7. RADIAL NODES');
function countRadialNodes(n: number, l: number): number {
  let nodeCount = 0;
  let prevSign = Math.sign(hydrogen.calculateWaveFunction({ n, l, m: 0, s: 0.5 }, 0, 0, 0.1));

  for (let r = 0.1; r < n * n * 2; r += 0.2) {
    const psi = hydrogen.calculateWaveFunction({ n, l, m: 0, s: 0.5 }, 0, 0, r);
    const currSign = Math.sign(psi);

    if (currSign !== prevSign && prevSign !== 0 && Math.abs(psi) > 1e-10) {
      nodeCount++;
      prevSign = currSign;
    } else if (Math.abs(psi) > 1e-10) {
      prevSign = currSign;
    }
  }
  return nodeCount;
}

test('2s has 1 radial node', countRadialNodes(2, 0) === 1);
test('3s has 2 radial nodes', countRadialNodes(3, 0) === 2);
test('3p has 1 radial node', countRadialNodes(3, 1) === 1);

// === Finite Values Everywhere ===
console.log('\n8. NUMERICAL STABILITY');
test('No NaN values for high n/l', isFinite(hydrogen.calculateProbabilityDensity({ n: 5, l: 4, m: 4, s: 0.5 }, 20, 10, 5)));
test('No Infinity values', isFinite(hydrogen.calculateProbabilityDensity({ n: 4, l: 3, m: -3, s: 0.5 }, 15, 15, 15)));

// === Summary ===
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log(`║   SUMMARY: ${passedTests}/${totalTests} tests passed ${' '.repeat(Math.max(0, 25 - (passedTests.toString().length + totalTests.toString().length)))}║`);
const percentage = ((passedTests / totalTests) * 100).toFixed(1);
console.log(`║   Success Rate: ${percentage}% ${' '.repeat(Math.max(0, 38 - percentage.length))}║`);
console.log('╚══════════════════════════════════════════════════════════╝');

if (passedTests === totalTests) {
  console.log('\n🎉 ALL TESTS PASSED! Quantum mathematics implementation is verified.');
} else {
  console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Review implementation.`);
  process.exit(1);
}
