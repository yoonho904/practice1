import type { ComputationInput, PhysicsComputationResult } from "./types.js";
import { getElementProfile } from "./constants.js";

const BOLTZMANN = 1.380649e-23; // J/K
const AVOGADRO = 6.02214076e23; // 1/mol
const BASE_VISCOSITY = 0.003; // Pa·s (cytoplasm approximation)

function computeViscosity(temperature: number, ph: number): number {
  const temperatureFactor = Math.exp(-0.015 * (temperature - 310));
  const phFactor = 1 + Math.abs(ph - 7.4) * 0.05;
  return BASE_VISCOSITY * temperatureFactor * phFactor;
}

export function computePhysicsSnapshot({ element, environment }: ComputationInput): PhysicsComputationResult {
  const profile = getElementProfile(element.symbol);
  if (!profile) {
    throw new Error(`No physics profile registered for element ${element.symbol}`);
  }

  const particleMassKg = (element.atomicMass / 1_000) / AVOGADRO;
  const rmsVelocity = Math.sqrt((3 * BOLTZMANN * environment.temperature) / particleMassKg);

  const radiusMeters = profile.vdwRadiusPm * 1e-12;
  const viscosity = computeViscosity(environment.temperature, environment.ph);
  const diffusionCoefficient = (BOLTZMANN * environment.temperature) / (6 * Math.PI * viscosity * radiusMeters);

  const sigma = radiusMeters * 2;
  const epsilon = profile.standardBondEnergyKJ * 1_000 / AVOGADRO; // J per pair

  const summary = `⟨v⟩=${rmsVelocity.toFixed(2)} m/s, D=${diffusionCoefficient.toExponential(2)} m²/s under ${environment.pressureAtm.toFixed(2)} atm`;

  const metrics: Record<string, number> = {
    rmsVelocity,
    diffusionCoefficient,
    lennardJonesSigma: sigma,
    lennardJonesEpsilon: epsilon,
    viscosity,
    temperatureK: environment.temperature,
  };

  return {
    summary,
    metrics,
    diffusionCoefficient,
    rmsVelocity,
  };
}
