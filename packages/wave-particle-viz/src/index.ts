/**
 * Wave-Particle Visualization Package
 * High-performance quantum electron droplet visualization
 */

export { WaveParticleVisualizer } from './WaveParticleVisualizer.js';
export { WaveParticleSystem } from './systems/WaveParticleSystem.js';
export { DropletRenderer } from './renderers/DropletRenderer.js';

export type {
  ElectronDroplet,
  WaveParticleConfig,
} from './systems/WaveParticleSystem.js';

export type {
  DropletRenderConfig,
} from './renderers/DropletRenderer.js';

export type {
  VisualizationControls,
  PerformanceMetrics,
} from './WaveParticleVisualizer.js';

// Version and build info
export const VERSION = '0.1.0';
export const BUILD_INFO = {
  name: 'Wave-Particle Visualization Engine',
  description: 'High-performance quantum electron droplet visualization',
  features: [
    'WebGL-accelerated rendering',
    'Real-time quantum physics simulation',
    'Interactive orbital slicing',
    'Performance-optimized for 60fps',
    'Research-grade accuracy',
  ],
  performance: {
    maxParticles: 10000,
    targetFPS: 60,
    renderingAPI: 'WebGL',
  },
} as const;