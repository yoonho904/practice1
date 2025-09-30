import { HydrogenLikeAtom } from './src/models/hydrogen-like.js';

const hydrogen = new HydrogenLikeAtom(1);
const qn = { n: 2, l: 0, m: 0, s: 0.5 };

console.log('Testing 2s orbital...');
console.log('');

for (let r = 0.1; r < 5; r += 0.5) {
  const psi = hydrogen.calculateWaveFunction(qn, 0, 0, r);
  const density = hydrogen.calculateProbabilityDensity(qn, 0, 0, r);
  console.log(`r=${r.toFixed(1)}: Ψ=${psi.toFixed(6)}, |Ψ|²=${density.toFixed(8)}`);
}
