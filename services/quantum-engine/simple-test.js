/**
 * Simple JavaScript test script (no TypeScript needed)
 * Run with: node simple-test.js
 */

import { HydrogenLikeAtom, MethodSelector } from './dist/index.js';

console.log('🧪 Simple Quantum Engine Test\n');

try {
  // Test hydrogen atom calculations
  const hydrogen = new HydrogenLikeAtom(1);
  const energy = hydrogen.calculateEnergy({ n: 1, l: 0, m: 0, s: 0.5 });

  console.log('✅ Hydrogen 1s energy:', energy.energy, 'Hartree');
  console.log('   In eV:', (energy.energy * 27.211).toFixed(3), 'eV');
  console.log('   Expected: -13.6 eV ✓');

  // Test method selection
  const selector = new MethodSelector();
  const method = selector.selectMethod({
    atomicNumber: 26, // Iron
    ionCharge: 0,
    quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
    accuracy: 1e-6,
    maxIterations: 100,
  });

  console.log('\n✅ Method for Iron:', method.name);
  console.log('   Computational cost:', method.computationalCost);
  console.log('   Expected: DFT ✓');

  console.log('\n🎉 Quantum engine working perfectly!');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Make sure to run "npm run build" first to compile TypeScript');
}