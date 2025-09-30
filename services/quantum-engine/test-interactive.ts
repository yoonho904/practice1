#!/usr/bin/env tsx

/**
 * Interactive test script for the quantum engine
 * Run with: npm run dev or npx tsx test-interactive.ts
 */

import {
  HydrogenLikeAtom,
  MethodSelector,
  PHYSICAL_CONSTANTS,
  validateQuantumNumbers,
  type CalculationConfig,
} from './src/index.js';

console.log('🚀 Quantum Engine Interactive Test\n');

// Test 1: Calculate hydrogen energies
console.log('📊 Test 1: Hydrogen Energy Levels');
const hydrogen = new HydrogenLikeAtom(1);

const orbitals = [
  { n: 1, l: 0, name: '1s' },
  { n: 2, l: 0, name: '2s' },
  { n: 2, l: 1, name: '2p' },
  { n: 3, l: 0, name: '3s' },
  { n: 3, l: 1, name: '3p' },
  { n: 3, l: 2, name: '3d' },
];

orbitals.forEach(({ n, l, name }) => {
  const result = hydrogen.calculateEnergy({ n, l, m: 0, s: 0.5 });
  const energyEv = result.energy * 27.211; // Convert Hartree to eV
  console.log(`  ${name}: ${energyEv.toFixed(3)} eV (${result.energy.toFixed(6)} Hartree)`);
});

// Test 2: Method selection for different elements
console.log('\n🧪 Test 2: Method Selection');
const selector = new MethodSelector();

const elements = [
  { name: 'Hydrogen', Z: 1, charge: 0 },
  { name: 'Helium', Z: 2, charge: 0 },
  { name: 'Helium+', Z: 2, charge: 1 },
  { name: 'Lithium', Z: 3, charge: 0 },
  { name: 'Carbon', Z: 6, charge: 0 },
  { name: 'Iron', Z: 26, charge: 0 },
  { name: 'Gold', Z: 79, charge: 0 },
  { name: 'Uranium', Z: 92, charge: 0 },
];

elements.forEach(({ name, Z, charge }) => {
  const config: CalculationConfig = {
    atomicNumber: Z,
    ionCharge: charge,
    quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
    accuracy: 1e-6,
    maxIterations: 100,
  };

  const method = selector.selectMethod(config);
  console.log(`  ${name.padEnd(10)} (Z=${Z.toString().padEnd(2)}): ${method.name.padEnd(20)} (${method.computationalCost} cost)`);
});

// Test 3: Wave function calculation
console.log('\n⚛️  Test 3: Wave Function Values');
console.log('1s hydrogen wave function at different distances from nucleus:');

const distances = [0, 0.5, 1.0, 2.0, 5.0]; // in Bohr radii
distances.forEach(r => {
  const psi = hydrogen.calculateWaveFunction({ n: 1, l: 0, m: 0, s: 0.5 }, r, 0, 0);
  const prob = psi * psi;
  console.log(`  r = ${r.toFixed(1)} a₀: ψ = ${psi.toFixed(4)}, |ψ|² = ${prob.toFixed(4)}`);
});

// Test 4: Spectroscopy calculation
console.log('\n🌈 Test 4: Hydrogen Spectroscopy');
console.log('Lyman series (transitions to n=1):');

const transitions = [
  { from: 2, to: 1, series: 'Lyman α' },
  { from: 3, to: 1, series: 'Lyman β' },
  { from: 4, to: 1, series: 'Lyman γ' },
];

transitions.forEach(({ from, to, series }) => {
  const eFrom = hydrogen.calculateEnergy({ n: from, l: 0, m: 0, s: 0.5 });
  const eTo = hydrogen.calculateEnergy({ n: to, l: 0, m: 0, s: 0.5 });

  const deltaE = eFrom.energy - eTo.energy; // Energy difference in Hartree
  const wavelengthM = (PHYSICAL_CONSTANTS.h * PHYSICAL_CONSTANTS.c) / (deltaE * PHYSICAL_CONSTANTS.Eh);
  const wavelengthNm = wavelengthM * 1e9;

  console.log(`  ${series} (${from}→${to}): ${wavelengthNm.toFixed(1)} nm`);
});

// Test 5: Quantum number validation
console.log('\n✅ Test 5: Quantum Number Validation');
const testCases = [
  { qn: { n: 1, l: 0, m: 0, s: 0.5 }, valid: true, desc: '1s orbital' },
  { qn: { n: 2, l: 1, m: -1, s: -0.5 }, valid: true, desc: '2p orbital' },
  { qn: { n: 1, l: 1, m: 0, s: 0.5 }, valid: false, desc: 'invalid: l ≥ n' },
  { qn: { n: 2, l: 1, m: 2, s: 0.5 }, valid: false, desc: 'invalid: |m| > l' },
];

testCases.forEach(({ qn, valid, desc }) => {
  const isValid = validateQuantumNumbers(qn);
  const status = isValid === valid ? '✅' : '❌';
  console.log(`  ${status} ${desc}: ${isValid ? 'VALID' : 'INVALID'}`);
});

// Test 6: Performance benchmark
console.log('\n⚡ Test 6: Performance Benchmark');
const iterations = 1000;
const startTime = performance.now();

for (let i = 0; i < iterations; i++) {
  hydrogen.calculateEnergy({ n: 1, l: 0, m: 0, s: 0.5 });
}

const endTime = performance.now();
const avgTime = (endTime - startTime) / iterations;

console.log(`  ${iterations} hydrogen energy calculations:`);
console.log(`  Total time: ${(endTime - startTime).toFixed(2)} ms`);
console.log(`  Average per calculation: ${avgTime.toFixed(4)} ms`);
console.log(`  Rate: ${(1000 / avgTime).toFixed(0)} calculations/second`);

console.log('\n🎉 All tests completed successfully!');
console.log('\n📚 To explore more:');
console.log('  • Run "npm test" for full test suite');
console.log('  • Run "npm run test:coverage" for coverage report');
console.log('  • Check src/demo.test.ts for advanced examples');
console.log('  • Examine src/integration/ for workflow tests');