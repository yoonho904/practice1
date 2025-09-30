import * as THREE from 'three';
import { ElectronState, ElementQuantumState } from './QuantumMechanicsEngine';

export interface PerformanceProfile {
  maxParticles: number;
  updateFrequency: number;
  renderDistance: number;
  levelOfDetail: boolean;
  culling: boolean;
  instancedRendering: boolean;
  geometryOptimizations: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  particleCount: number;
  triangleCount: number;
  drawCalls: number;
  memoryUsage: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private performanceHistory: number[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private targetFPS = 60;

  // Performance profiles for different hardware capabilities
  private profiles: Record<string, PerformanceProfile> = {
    low: {
      maxParticles: 1000,
      updateFrequency: 30,
      renderDistance: 50,
      levelOfDetail: true,
      culling: true,
      instancedRendering: false,
      geometryOptimizations: true
    },
    medium: {
      maxParticles: 3000,
      updateFrequency: 60,
      renderDistance: 100,
      levelOfDetail: true,
      culling: true,
      instancedRendering: true,
      geometryOptimizations: true
    },
    high: {
      maxParticles: 8000,
      updateFrequency: 60,
      renderDistance: 200,
      levelOfDetail: false,
      culling: true,
      instancedRendering: true,
      geometryOptimizations: false
    },
    ultra: {
      maxParticles: 15000,
      updateFrequency: 120,
      renderDistance: 500,
      levelOfDetail: false,
      culling: false,
      instancedRendering: true,
      geometryOptimizations: false
    }
  };

  private currentProfile: PerformanceProfile;
  private adaptiveMode = true;

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  constructor() {
    this.currentProfile = this.detectOptimalProfile();
  }

  /**
   * Detect optimal performance profile based on hardware capabilities
   */
  private detectOptimalProfile(): PerformanceProfile {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      return this.profiles.low;
    }

    // Detect GPU capabilities
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

    // Check for high-end GPUs
    const highEndGPUs = ['RTX', 'GTX 1080', 'GTX 1070', 'RX 6800', 'RX 6900', 'M1 Pro', 'M1 Max', 'M2'];
    const mediumGPUs = ['GTX 1060', 'GTX 970', 'RX 580', 'RX 570'];

    if (highEndGPUs.some(gpu => renderer.includes(gpu))) {
      return this.profiles.ultra;
    } else if (mediumGPUs.some(gpu => renderer.includes(gpu))) {
      return this.profiles.high;
    }

    // Check device memory and CPU cores
    const memoryGB = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;

    if (memoryGB >= 8 && cores >= 8) {
      return this.profiles.high;
    } else if (memoryGB >= 4 && cores >= 4) {
      return this.profiles.medium;
    }

    return this.profiles.low;
  }

  /**
   * Update performance metrics and adapt settings if needed
   */
  public updateMetrics(renderer: THREE.WebGLRenderer): PerformanceMetrics {
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Calculate FPS
    this.performanceHistory.push(frameTime);
    if (this.performanceHistory.length > 60) {
      this.performanceHistory.shift();
    }

    const avgFrameTime = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
    const fps = 1000 / avgFrameTime;

    // Get rendering info
    const info = renderer.info;
    const metrics: PerformanceMetrics = {
      fps,
      frameTime: avgFrameTime,
      particleCount: info.render.triangles / 2, // Approximate particle count
      triangleCount: info.render.triangles,
      drawCalls: info.render.calls,
      memoryUsage: info.memory.geometries + info.memory.textures
    };

    // Adaptive performance adjustment
    if (this.adaptiveMode) {
      this.adaptPerformance(fps);
    }

    return metrics;
  }

  /**
   * Adapt performance settings based on current FPS
   */
  private adaptPerformance(fps: number): void {
    const targetFPS = this.targetFPS;

    if (fps < targetFPS * 0.8) {
      // Performance too low, reduce quality
      this.downgradeProfile();
    } else if (fps > targetFPS * 1.2) {
      // Performance headroom, increase quality
      this.upgradeProfile();
    }
  }

  private downgradeProfile(): void {
    const profiles = ['ultra', 'high', 'medium', 'low'];
    const currentIndex = profiles.findIndex(p => this.profiles[p] === this.currentProfile);

    if (currentIndex < profiles.length - 1) {
      this.currentProfile = this.profiles[profiles[currentIndex + 1]];
    }
  }

  private upgradeProfile(): void {
    const profiles = ['low', 'medium', 'high', 'ultra'];
    const currentIndex = profiles.findIndex(p => this.profiles[p] === this.currentProfile);

    if (currentIndex < profiles.length - 1) {
      this.currentProfile = this.profiles[profiles[currentIndex + 1]];
    }
  }

  /**
   * Optimize particle array for rendering
   */
  public optimizeParticles(particles: ElectronState[], cameraPosition: THREE.Vector3): ElectronState[] {
    let optimized = particles;

    // Limit particle count
    if (optimized.length > this.currentProfile.maxParticles) {
      // Sort by importance (distance from camera, probability)
      optimized = optimized
        .map(particle => ({
          ...particle,
          distance: Math.sqrt(
            (particle.position[0] - cameraPosition.x) ** 2 +
            (particle.position[1] - cameraPosition.y) ** 2 +
            (particle.position[2] - cameraPosition.z) ** 2
          )
        }))
        .sort((a, b) => {
          // Prioritize high probability particles close to camera
          const scoreA = a.probability / (1 + a.distance * 0.1);
          const scoreB = b.probability / (1 + b.distance * 0.1);
          return scoreB - scoreA;
        })
        .slice(0, this.currentProfile.maxParticles);
    }

    // Distance culling
    if (this.currentProfile.culling) {
      optimized = optimized.filter(particle => {
        const distance = Math.sqrt(
          (particle.position[0] - cameraPosition.x) ** 2 +
          (particle.position[1] - cameraPosition.y) ** 2 +
          (particle.position[2] - cameraPosition.z) ** 2
        );
        return distance <= this.currentProfile.renderDistance;
      });
    }

    return optimized;
  }

  /**
   * Create level-of-detail geometry based on distance
   */
  public createLODGeometry(distance: number): THREE.BufferGeometry {
    if (!this.currentProfile.levelOfDetail) {
      return new THREE.SphereGeometry(0.1, 16, 16);
    }

    if (distance < 10) {
      return new THREE.SphereGeometry(0.1, 16, 16); // High detail
    } else if (distance < 30) {
      return new THREE.SphereGeometry(0.1, 8, 8);   // Medium detail
    } else {
      return new THREE.SphereGeometry(0.1, 4, 4);   // Low detail
    }
  }

  /**
   * Create optimized material with reduced complexity at distance
   */
  public createOptimizedMaterial(distance: number, baseColor: THREE.Color): THREE.Material {
    if (distance > 50 || this.currentProfile.geometryOptimizations) {
      // Use simple material for distant objects
      return new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.8
      });
    }

    // Use complex material for close objects
    return new THREE.MeshPhongMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.8,
      emissive: baseColor.clone().multiplyScalar(0.2)
    });
  }

  /**
   * Create instanced mesh for better performance with many identical objects
   */
  public createInstancedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    particles: ElectronState[]
  ): THREE.InstancedMesh {
    if (!this.currentProfile.instancedRendering) {
      // Fallback to regular rendering
      return new THREE.InstancedMesh(geometry, material, 1);
    }

    const count = Math.min(particles.length, this.currentProfile.maxParticles);
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const particle = particles[i];

      // Set transform
      matrix.setPosition(
        particle.position[0],
        particle.position[1],
        particle.position[2]
      );

      // Scale based on probability
      const scale = 0.5 + particle.probability * 0.5;
      matrix.scale(new THREE.Vector3(scale, scale, scale));

      instancedMesh.setMatrixAt(i, matrix);

      // Set color based on quantum numbers
      const hue = (particle.quantum.n * 60 + particle.quantum.l * 120) % 360;
      color.setHSL(hue / 360, 0.8, 0.6);
      instancedMesh.setColorAt(i, color);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }

    return instancedMesh;
  }

  /**
   * Optimize THREE.js scene for better performance
   */
  public optimizeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
    // Enable frustum culling
    scene.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = this.currentProfile.culling;
      }
    });

    // Optimize renderer settings
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !this.currentProfile.geometryOptimizations;

    if (this.currentProfile.geometryOptimizations) {
      renderer.shadowMap.type = THREE.BasicShadowMap;
    } else {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }

  /**
   * Get current performance profile
   */
  public getCurrentProfile(): PerformanceProfile {
    return { ...this.currentProfile };
  }

  /**
   * Set performance profile manually
   */
  public setProfile(profileName: string): void {
    if (this.profiles[profileName]) {
      this.currentProfile = this.profiles[profileName];
      this.adaptiveMode = false;
    }
  }

  /**
   * Enable/disable adaptive performance
   */
  public setAdaptiveMode(enabled: boolean): void {
    this.adaptiveMode = enabled;
  }

  /**
   * Get performance recommendations
   */
  public getPerformanceRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.fps < 30) {
      recommendations.push("Consider reducing particle count for better performance");
    }

    if (metrics.drawCalls > 100) {
      recommendations.push("Enable instanced rendering to reduce draw calls");
    }

    if (metrics.memoryUsage > 100) {
      recommendations.push("Enable geometry optimizations to reduce memory usage");
    }

    if (metrics.triangleCount > 100000) {
      recommendations.push("Enable level-of-detail for distant objects");
    }

    return recommendations;
  }

  /**
   * Reset performance metrics
   */
  public reset(): void {
    this.performanceHistory = [];
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }
}