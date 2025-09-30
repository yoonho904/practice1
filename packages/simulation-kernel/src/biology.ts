import type { BiologyComputationResult, ComputationInput } from "./types.js";
import { getElementProfile } from "./constants.js";

const BASE_TRANSLATION_RATE = 15; // amino acids per second baseline for ribosome
const ATP_PER_AMINO_ACID = 2; // simplified stoichiometry

function cofactorSupport(symbol: string): number {
  switch (symbol) {
    case "Mg":
      return 1.2; // stabilizes ribosome assembly
    case "K":
    case "Na":
      return 1.1;
    case "Fe":
    case "Zn":
      return 1.05;
    default:
      return 1.0;
  }
}

export function computeBiologySnapshot({ element, environment }: ComputationInput): BiologyComputationResult {
  const profile = getElementProfile(element.symbol);
  const coordination = profile?.preferredCoordination ?? 3;

  const temperatureDeviation = (environment.temperature - 310) / 12;
  const temperatureFactor = Math.exp(-temperatureDeviation * temperatureDeviation);
  const phDeviation = environment.ph - 7.2;
  const phFactor = Math.exp(-0.5 * phDeviation * phDeviation);
  const ionicSupport = cofactorSupport(element.symbol);
  const coordinationFactor = 1 + (coordination - 3) * 0.03;

  const translationRate = BASE_TRANSLATION_RATE * temperatureFactor * phFactor * ionicSupport * coordinationFactor;
  const atpConsumption = translationRate * ATP_PER_AMINO_ACID;

  const peptideBias = element.symbol === "C" || element.symbol === "N" ? 1.15 : element.symbol === "P" ? 1.05 : 1.0;
  const ribosomeEfficiency = translationRate * peptideBias;

  const summary = `Translation ${translationRate.toFixed(1)} aa/s, ATP ${atpConsumption.toFixed(1)} s⁻¹ (bias ${peptideBias.toFixed(2)}×)`;

  const metrics: Record<string, number> = {
    translationRate,
    atpConsumption,
    ribosomeEfficiency,
    temperatureK: environment.temperature,
    ph: environment.ph,
  };

  return {
    summary,
    metrics,
    translationRate,
    atpConsumption,
  };
}
