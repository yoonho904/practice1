# 🌊⚛️ Wave-Particle Visualization Engine

High-performance quantum electron droplet visualization that shows the wave-particle duality of electrons following quantum wave patterns with natural uncertainty.

## Features

✨ **Wave-Particle Duality**: Electrons behave like droplets following wave patterns with quantum noise
🚀 **High Performance**: 60fps with 10,000+ particles using WebGL optimization
🔬 **Research Accuracy**: Real quantum wave functions from Schrödinger equation
🎛️ **Interactive Controls**: Real-time orbital slicing and parameter adjustment
⚡ **WebGL Accelerated**: Custom shaders for optimal rendering performance

## Quick Start

### 1. View the Demo

Open `demo.html` in your browser to see the visualization in action:

```bash
# Open in your browser
open packages/wave-particle-viz/demo.html
```

### 2. Basic Usage

```typescript
import { WaveParticleVisualizer } from '@bio-sim/wave-particle-viz';

// Create visualizer
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const visualizer = new WaveParticleVisualizer(canvas, {
  quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 }, // 1s orbital
  atomicNumber: 1, // Hydrogen
  particleCount: 5000,
  noiseStrength: 0.15,
  dropletColor: '#4CAF50'
});

// Start animation
visualizer.start();

// Update controls
visualizer.updateControls({
  enableSlicing: true,
  sliceThickness: 0.5
});
```

### 3. Advanced Configuration

```typescript
// Configure physics simulation
const physicsConfig = {
  particleCount: 8000,
  noiseStrength: 0.2,    // 0 = pure wave, 1 = pure noise
  animationSpeed: 1.5,
  waveFollowing: 0.8,    // How strongly particles follow the wave
  dropletSize: 1.2
};

// Configure rendering
const renderConfig = {
  dropletColor: new THREE.Color('#00FF88'),
  fadeDistance: 25.0,
  globalScale: 60.0,
  enableSlicing: true
};

const visualizer = new WaveParticleVisualizer(canvas, {
  ...physicsConfig,
  dropletColor: '#00FF88'
});
```

## Visualization Concept

The visualization shows **quantum wave-particle duality**:

1. **Electron Droplets**: Individual particles with position and velocity
2. **Wave Following**: Particles follow quantum wave function patterns
3. **Quantum Noise**: Natural uncertainty principle creates position noise
4. **Orbital Slicing**: Interactive cross-sections reveal orbital structure

### Scientific Accuracy

- ✅ **Real Wave Functions**: Uses exact hydrogen-like solutions from quantum engine
- ✅ **Probability Sampling**: Particles distributed according to |ψ|²
- ✅ **Time Evolution**: Realistic quantum dynamics with uncertainty
- ✅ **Physical Constants**: NIST-validated Schrödinger equation parameters

## Interactive Controls

### Orbital Selection
- **1s, 2s, 2p, 3s, 3p, 3d**: Different hydrogen orbitals
- **Elements**: H, He⁺, Li²⁺ (hydrogen-like systems)

### Physics Parameters
- **Particle Count**: 1,000 - 10,000 droplets
- **Quantum Noise**: 0% (pure wave) to 50% (high uncertainty)
- **Wave Following**: How strongly particles follow quantum patterns
- **Animation Speed**: Slow motion to 3x speed

### Visualization Features
- **Orbital Slicing**: Mouse movement controls slice plane
- **Real-time Updates**: All parameters adjust instantly
- **Performance Monitoring**: FPS and memory usage display

## Performance Optimization

### WebGL Shaders
```glsl
// Vertex shader handles particle positioning and size
attribute vec3 position;
attribute float opacity;
uniform float time;
uniform float globalScale;

// Fragment shader creates droplet appearance
float dropletShape(vec2 uv) {
  float dist = distance(gl_PointCoord, vec2(0.5));
  return 1.0 - smoothstep(0.4, 0.5, dist);
}
```

### Performance Features
- **Instanced Rendering**: Single draw call for all particles
- **Buffer Optimization**: Pre-allocated Float32Arrays
- **Frustum Culling**: Only render visible particles
- **Adaptive Quality**: Automatic performance scaling
- **Memory Pooling**: Efficient particle data management

### Benchmarks
- **10,000 particles**: ~60fps on modern GPU
- **5,000 particles**: ~60fps on integrated graphics
- **Memory usage**: ~50MB for large simulations
- **Draw calls**: 1 per frame (highly optimized)

## API Reference

### WaveParticleVisualizer

Main class for quantum visualization.

```typescript
class WaveParticleVisualizer {
  constructor(canvas: HTMLCanvasElement, controls?: VisualizationControls)

  start(): void                           // Begin animation
  stop(): void                            // Stop animation
  updateControls(controls: Partial<VisualizationControls>): void
  getPerformanceMetrics(): PerformanceMetrics
  takeScreenshot(): string               // Returns base64 PNG
  dispose(): void                        // Cleanup resources
}
```

### VisualizationControls

```typescript
interface VisualizationControls {
  quantumNumbers: QuantumNumbers;      // n, l, m, s quantum numbers
  atomicNumber: number;                // Element Z
  ionCharge: number;                   // Ion charge
  noiseStrength: number;               // 0-1 quantum uncertainty
  animationSpeed: number;              // Speed multiplier
  waveFollowing: number;               // 0-1 wave adherence
  particleCount: number;               // Number of droplets
  dropletColor: string;                // Hex color
  enableSlicing: boolean;              // Interactive slicing
  sliceThickness: number;              // Slice depth
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  fps: number;                         // Frames per second
  frameTime: number;                   // Milliseconds per frame
  particleCount: number;               // Total particles
  visibleParticles: number;            // Currently rendered
  averageDensity: number;              // Quantum density
  memoryUsage: number;                 // Estimated MB
}
```

## Integration Examples

### React Integration

```tsx
import { useEffect, useRef } from 'react';
import { WaveParticleVisualizer } from '@bio-sim/wave-particle-viz';

function QuantumVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerRef = useRef<WaveParticleVisualizer>();

  useEffect(() => {
    if (canvasRef.current) {
      visualizerRef.current = new WaveParticleVisualizer(canvasRef.current);
      visualizerRef.current.start();
    }

    return () => visualizerRef.current?.dispose();
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '400px' }} />;
}
```

### Vue Integration

```vue
<template>
  <canvas ref="canvas" @mousemove="onMouseMove" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { WaveParticleVisualizer } from '@bio-sim/wave-particle-viz';

const canvas = ref();
let visualizer;

onMounted(() => {
  visualizer = new WaveParticleVisualizer(canvas.value);
  visualizer.start();
});

onUnmounted(() => {
  visualizer?.dispose();
});

function onMouseMove() {
  // Interactive slicing handled automatically
}
</script>
```

## Browser Compatibility

- ✅ **Chrome**: Full support with WebGL 2.0
- ✅ **Firefox**: Full support with WebGL 2.0
- ✅ **Safari**: Limited to 5,000 particles
- ✅ **Edge**: Full support
- ❌ **IE**: Not supported (requires WebGL 2.0)

## Development

```bash
# Install dependencies
npm install

# Build package
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

## License

MIT License - Built for scientific education and research.