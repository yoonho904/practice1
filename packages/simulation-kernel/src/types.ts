import type { AtomicElement } from "@bio-sim/event-schemas";

export interface EnvironmentConditions {
  readonly temperature: number; // Kelvin
  readonly pressureAtm: number; // atmospheres
  readonly ph: number;
}

export interface EngineComputationResult {
  readonly summary: string;
  readonly metrics: Record<string, number>;
}

export interface ChemistryComputationResult extends EngineComputationResult {
  readonly reactionRate: number; // s^-1
  readonly gibbsFreeEnergy: number; // kJ/mol
}

export interface PhysicsComputationResult extends EngineComputationResult {
  readonly diffusionCoefficient: number; // m^2/s
  readonly rmsVelocity: number; // m/s
}

export interface BiologyComputationResult extends EngineComputationResult {
  readonly translationRate: number; // aa/s
  readonly atpConsumption: number; // molecules/s
}

export type ComputationInput = {
  element: AtomicElement;
  environment: EnvironmentConditions;
};
