import type { ComputationInput, ChemistryComputationResult } from "./types.js";
import { getElementProfile } from "./constants.js";

const GAS_CONSTANT = 8.314; // J/(mol·K)
const REFERENCE_TEMPERATURE = 298; // K
const ARRHENIUS_PREFACTOR = 1e13; // s^-1

function computeActivationEnergyKJ(standardBondEnergy: number, electronegativity: number | null): number {
  const polarityFactor = electronegativity ? 1 + Math.abs(electronegativity - 2.5) * 0.05 : 1;
  return Math.max(standardBondEnergy * 0.6 * polarityFactor, 15);
}

export function computeChemistrySnapshot({ element, environment }: ComputationInput): ChemistryComputationResult {
  const profile = getElementProfile(element.symbol);
  if (!profile) {
    throw new Error(`No chemistry profile registered for element ${element.symbol}`);
  }

  const activationEnergyKJ = computeActivationEnergyKJ(profile.standardBondEnergyKJ, element.electronegativity);
  const activationEnergyJ = activationEnergyKJ * 1_000;
  const rateConstant = ARRHENIUS_PREFACTOR * Math.exp(-activationEnergyJ / (GAS_CONSTANT * environment.temperature));

  const temperatureOffset = environment.temperature - REFERENCE_TEMPERATURE;
  const phFactor = Math.exp(-(Math.abs(environment.ph - 7.4) * 0.08));
  const pressureFactor = 1 + (environment.pressureAtm - 1) * 0.1;

  const gibbsFreeEnergy = profile.standardBondEnergyKJ + temperatureOffset * -0.04 + (pressureFactor - 1) * 5;
  const effectiveRate = rateConstant * phFactor * pressureFactor;

  const summary = `ΔG=${gibbsFreeEnergy.toFixed(1)} kJ/mol, k=${effectiveRate.toExponential(2)} s⁻¹ at ${environment.temperature.toFixed(0)}K`;

  const metrics: Record<string, number> = {
    activationEnergyKJ,
    gibbsFreeEnergy,
    arrheniusRate: effectiveRate,
    temperatureK: environment.temperature,
    pressureAtm: environment.pressureAtm,
    ph: environment.ph,
  };

  return {
    summary,
    metrics,
    reactionRate: effectiveRate,
    gibbsFreeEnergy,
  };
}
