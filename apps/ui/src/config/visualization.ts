/**
 * PLACEHOLDER VISUALIZATION CONFIG
 *
 * Minimal config to prevent build errors while visualization system is destroyed.
 * Contains only the fidelity settings needed by simulation connection.
 */

export type VisualizationFidelity = 'low' | 'medium' | 'high' | 'ultra';

export interface FidelityConfig {
  sampleMultiplier: number;
  maxParticles: number;
  renderDistance: number;
  animationFrameSkip: number;
}

export const VISUALIZATION_FIDELITY_SETTINGS: Record<VisualizationFidelity, FidelityConfig> = {
  low: {
    sampleMultiplier: 0.25,
    maxParticles: 500,
    renderDistance: 50,
    animationFrameSkip: 2,
  },
  medium: {
    sampleMultiplier: 0.5,
    maxParticles: 1000,
    renderDistance: 100,
    animationFrameSkip: 1,
  },
  high: {
    sampleMultiplier: 1.0,
    maxParticles: 2000,
    renderDistance: 200,
    animationFrameSkip: 0,
  },
  ultra: {
    sampleMultiplier: 2.0,
    maxParticles: 5000,
    renderDistance: 500,
    animationFrameSkip: 0,
  },
};

// Placeholder for tone mapping function
export function resolveToneMapping(): string {
  return 'aces';
}