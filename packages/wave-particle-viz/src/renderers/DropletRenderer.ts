/**
 * High-performance WebGL renderer for electron droplets
 * Handles instanced rendering and orbital slicing
 */

import * as THREE from 'three';
import type { WaveParticleSystem } from '../systems/WaveParticleSystem.js';

// Import shader source
const dropletVertexShader = `
attribute vec3 position;
attribute float opacity;
attribute float size;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;
uniform float globalScale;

varying float vOpacity;
varying vec2 vUv;
varying float vDistance;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDistance = length(mvPosition.xyz);
  vOpacity = opacity;
  vUv = vec2(0.5, 0.5);

  float sizeAttenuation = globalScale * size / vDistance;
  float pulse = 1.0 + 0.1 * sin(time * 2.0 + position.x + position.y + position.z);
  sizeAttenuation *= pulse;

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = sizeAttenuation;
}
`;

const dropletFragmentShader = `
precision highp float;

uniform float time;
uniform vec3 dropletColor;
uniform float fadeDistance;

varying float vOpacity;
varying vec2 vUv;
varying float vDistance;

float dropletShape(vec2 uv) {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(gl_PointCoord, center);
  float edge = 0.5;
  float softness = 0.1;
  float alpha = 1.0 - smoothstep(edge - softness, edge, dist);
  float variation = 0.05 * sin(time * 3.0 + dist * 20.0);
  alpha += variation;
  return clamp(alpha, 0.0, 1.0);
}

float innerGlow(vec2 uv) {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(gl_PointCoord, center);
  float glow = 1.0 - dist * 2.0;
  glow = clamp(glow, 0.0, 1.0);
  glow = pow(glow, 2.0);
  return glow;
}

void main() {
  float shape = dropletShape(gl_PointCoord);
  if (shape < 0.01) discard;

  float glow = innerGlow(gl_PointCoord);
  vec3 finalColor = dropletColor + vec3(0.3, 0.3, 0.3) * glow;
  float distanceFade = 1.0 - clamp(vDistance / fadeDistance, 0.0, 1.0);
  float finalOpacity = vOpacity * shape * distanceFade;
  finalColor *= (1.0 + (1.0 - vOpacity) * 0.5);

  gl_FragColor = vec4(finalColor, finalOpacity);
}
`;

export interface DropletRenderConfig {
  /** Base color for electron droplets */
  dropletColor: THREE.Color;
  /** Maximum fade distance */
  fadeDistance: number;
  /** Global size scaling */
  globalScale: number;
  /** Enable orbital slicing */
  enableSlicing: boolean;
  /** Slice plane normal vector */
  slicePlane: THREE.Vector3;
  /** Slice thickness */
  sliceThickness: number;
}

/**
 * High-performance droplet renderer with orbital slicing
 */
export class DropletRenderer {
  private scene: THREE.Scene;
  private material!: THREE.ShaderMaterial;
  private geometry!: THREE.BufferGeometry;
  private points!: THREE.Points;
  private system: WaveParticleSystem;
  private config: DropletRenderConfig;

  // Buffer attributes for dynamic updates
  private positionAttribute!: THREE.BufferAttribute;
  private opacityAttribute!: THREE.BufferAttribute;
  private sizeAttribute!: THREE.BufferAttribute;

  constructor(
    scene: THREE.Scene,
    system: WaveParticleSystem,
    config: Partial<DropletRenderConfig> = {}
  ) {
    this.scene = scene;
    this.system = system;
    this.config = {
      dropletColor: new THREE.Color(0x4CAF50), // Green like your reference
      fadeDistance: 20.0,
      globalScale: 50.0,
      enableSlicing: false,
      slicePlane: new THREE.Vector3(0, 0, 1),
      sliceThickness: 0.5,
      ...config,
    };

    this.initializeGeometry();
    this.initializeMaterial();
    this.createPoints();
    this.addToScene();
  }

  /**
   * Initialize geometry with buffer attributes
   */
  private initializeGeometry(): void {
    const particleCount = this.system.getConfig().particleCount;

    this.geometry = new THREE.BufferGeometry();

    // Position attribute (will be updated dynamically)
    const positions = new Float32Array(particleCount * 3);
    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positionAttribute);

    // Opacity attribute
    const opacities = new Float32Array(particleCount);
    this.opacityAttribute = new THREE.BufferAttribute(opacities, 1);
    this.opacityAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('opacity', this.opacityAttribute);

    // Size attribute
    const sizes = new Float32Array(particleCount);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    this.sizeAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('size', this.sizeAttribute);
  }

  /**
   * Initialize shader material
   */
  private initializeMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      vertexShader: dropletVertexShader,
      fragmentShader: dropletFragmentShader,
      uniforms: {
        time: { value: 0.0 },
        dropletColor: { value: this.config.dropletColor },
        fadeDistance: { value: this.config.fadeDistance },
        globalScale: { value: this.config.globalScale },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: false,
    });
  }

  /**
   * Create Three.js Points object
   */
  private createPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false; // Disable frustum culling for performance
  }

  /**
   * Add to scene
   */
  private addToScene(): void {
    this.scene.add(this.points);
  }

  /**
   * Update rendering with latest droplet data
   */
  public update(time: number): void {
    // Update shader uniforms
    this.material.uniforms.time.value = time;

    // Get latest droplet data from physics system
    const dropletData = this.system.getDropletData();

    // Apply orbital slicing if enabled
    let filteredData = dropletData;
    if (this.config.enableSlicing) {
      filteredData = this.applyOrbitalSlicing(dropletData);
    }

    // Update buffer attributes
    this.updateBufferAttributes(filteredData);

    // Mark attributes as needing update
    this.positionAttribute.needsUpdate = true;
    this.opacityAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
  }

  /**
   * Apply orbital slicing to show cross-sections
   */
  private applyOrbitalSlicing(data: {
    positions: Float32Array;
    opacities: Float32Array;
    sizes: Float32Array;
  }): {
    positions: Float32Array;
    opacities: Float32Array;
    sizes: Float32Array;
  } {
    const { slicePlane, sliceThickness } = this.config;
    const particleCount = data.positions.length / 3;

    // Create new arrays for filtered data
    const filteredPositions = new Float32Array(data.positions.length);
    const filteredOpacities = new Float32Array(data.opacities.length);
    const filteredSizes = new Float32Array(data.sizes.length);

    let filteredCount = 0;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const x = data.positions[idx];
      const y = data.positions[idx + 1];
      const z = data.positions[idx + 2];

      // Calculate distance from slice plane
      const distance = Math.abs(
        x * slicePlane.x + y * slicePlane.y + z * slicePlane.z
      );

      // Include particle if within slice thickness
      if (distance <= sliceThickness) {
        const newIdx = filteredCount * 3;
        filteredPositions[newIdx] = x;
        filteredPositions[newIdx + 1] = y;
        filteredPositions[newIdx + 2] = z;
        filteredOpacities[filteredCount] = data.opacities[i];
        filteredSizes[filteredCount] = data.sizes[i];
        filteredCount++;
      }
    }

    // Return sliced arrays
    return {
      positions: filteredPositions.slice(0, filteredCount * 3),
      opacities: filteredOpacities.slice(0, filteredCount),
      sizes: filteredSizes.slice(0, filteredCount),
    };
  }

  /**
   * Update Three.js buffer attributes
   */
  private updateBufferAttributes(data: {
    positions: Float32Array;
    opacities: Float32Array;
    sizes: Float32Array;
  }): void {
    // Update positions
    if (data.positions.length <= this.positionAttribute.array.length) {
      this.positionAttribute.array.set(data.positions);
    }

    // Update opacities
    if (data.opacities.length <= this.opacityAttribute.array.length) {
      this.opacityAttribute.array.set(data.opacities);
    }

    // Update sizes
    if (data.sizes.length <= this.sizeAttribute.array.length) {
      this.sizeAttribute.array.set(data.sizes);
    }

    // Update draw range for slicing
    this.geometry.setDrawRange(0, data.positions.length / 3);
  }

  /**
   * Update rendering configuration
   */
  public updateConfig(newConfig: Partial<DropletRenderConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update shader uniforms
    if (newConfig.dropletColor) {
      this.material.uniforms.dropletColor.value = newConfig.dropletColor;
    }
    if (newConfig.fadeDistance !== undefined) {
      this.material.uniforms.fadeDistance.value = newConfig.fadeDistance;
    }
    if (newConfig.globalScale !== undefined) {
      this.material.uniforms.globalScale.value = newConfig.globalScale;
    }
  }

  /**
   * Set slice plane for orbital visualization
   */
  public setSlicePlane(normal: THREE.Vector3, thickness: number = 0.5): void {
    this.config.slicePlane = normal.normalize();
    this.config.sliceThickness = thickness;
    this.config.enableSlicing = true;
  }

  /**
   * Disable orbital slicing
   */
  public disableSlicing(): void {
    this.config.enableSlicing = false;
    this.geometry.setDrawRange(0, this.system.getConfig().particleCount);
  }

  /**
   * Get performance information
   */
  public getPerformanceInfo(): {
    particleCount: number;
    visibleParticles: number;
    drawCalls: number;
  } {
    const drawRange = this.geometry.drawRange;
    return {
      particleCount: this.system.getConfig().particleCount,
      visibleParticles: drawRange.count,
      drawCalls: 1, // Single draw call for all particles
    };
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.points);
  }
}