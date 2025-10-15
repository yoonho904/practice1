/**
 * Wave-Particle System: Electrons as droplets following wave patterns
 * High-performance implementation with quantum noise simulation
 */

import * as THREE from 'three';
import type { HydrogenLikeAtom, QuantumNumbers } from '@bio-sim/quantum-engine';

export interface ElectronDroplet {
  /** Current position (follows wave + noise) */
  position: THREE.Vector3;
  /** Velocity vector */
  velocity: THREE.Vector3;
  /** Target position from wave function */
  waveTarget: THREE.Vector3;
  /** Quantum noise offset */
  noiseOffset: THREE.Vector3;
  /** Time-based phase for animation */
  phase: number;
  /** Probability density at current position */
  density: number;
  /** Droplet opacity (based on density) */
  opacity: number;
  /** Unique droplet ID */
  id: number;
}

export interface WaveParticleConfig {
  /** Number of electron droplets */
  particleCount: number;
  /** Quantum noise strength (0 = perfect wave, 1 = pure noise) */
  noiseStrength: number;
  /** Animation speed multiplier */
  animationSpeed: number;
  /** Wave following strength (0 = free particles, 1 = locked to wave) */
  waveFollowing: number;
  /** Droplet size scaling */
  dropletSize: number;
  /** Time step for physics simulation */
  timeStep: number;
}

/**
 * High-performance wave-particle system
 * Shows electrons as droplets following quantum wave patterns with noise
 */
export class WaveParticleSystem {
  private droplets: ElectronDroplet[] = [];
  private atom: HydrogenLikeAtom;
  private quantumNumbers: QuantumNumbers;
  private config: WaveParticleConfig;
  private time: number = 0;

  // Performance optimization: Pre-allocated arrays
  private readonly tempVector = new THREE.Vector3();
  // private readonly wavePositions: Float32Array; // Reserved for future wave interpolation
  private readonly noiseSeeds: Float32Array;

  constructor(
    atom: HydrogenLikeAtom,
    quantumNumbers: QuantumNumbers,
    config: Partial<WaveParticleConfig> = {}
  ) {
    this.atom = atom;
    this.quantumNumbers = quantumNumbers;
    this.config = {
      particleCount: 5000,
      noiseStrength: 0.15,
      animationSpeed: 1.0,
      waveFollowing: 0.8,
      dropletSize: 1.0,
      timeStep: 0.016, // ~60fps
      ...config,
    };

    // Pre-allocate for performance
    // this.wavePositions = new Float32Array(this.config.particleCount * 3); // Reserved for future
    this.noiseSeeds = new Float32Array(this.config.particleCount * 4);

    this.initializeDroplets();
    this.generateNoiseSeeds();
  }

  /**
   * Initialize electron droplets using quantum sampling
   */
  private initializeDroplets(): void {
    this.droplets = [];

    for (let i = 0; i < this.config.particleCount; i++) {
      // Sample initial position from quantum wave function
      const position = this.sampleQuantumPosition();

      // Calculate wave function density at this position
      const density = this.atom.calculateProbabilityDensity(
        this.quantumNumbers,
        position.x,
        position.y,
        position.z
      );

      // Create droplet with physics properties
      const droplet: ElectronDroplet = {
        position: position.clone(),
        velocity: new THREE.Vector3(),
        waveTarget: position.clone(),
        noiseOffset: new THREE.Vector3(),
        phase: Math.random() * Math.PI * 2,
        density,
        opacity: Math.min(1.0, density * 100), // Scale for visibility
        id: i,
      };

      this.droplets.push(droplet);
    }
  }

  /**
   * Generate deterministic noise seeds for smooth animation
   */
  private generateNoiseSeeds(): void {
    for (let i = 0; i < this.config.particleCount; i++) {
      const idx = i * 4;
      this.noiseSeeds[idx] = Math.random() * 1000;     // X noise seed
      this.noiseSeeds[idx + 1] = Math.random() * 1000; // Y noise seed
      this.noiseSeeds[idx + 2] = Math.random() * 1000; // Z noise seed
      this.noiseSeeds[idx + 3] = Math.random() * 10;   // Frequency seed
    }
  }

  /**
   * Sample position from quantum wave function using Monte Carlo
   */
  private sampleQuantumPosition(): THREE.Vector3 {
    const { n } = this.quantumNumbers;
    const maxRadius = n * n * 8; // Reasonable cutoff in Bohr radii

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      // Random spherical coordinates
      const r = Math.random() * maxRadius;
      const theta = Math.acos(2 * Math.random() - 1);
      const phi = Math.random() * 2 * Math.PI;

      // Convert to Cartesian
      const x = r * Math.sin(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.sin(phi);
      const z = r * Math.cos(theta);

      // Accept/reject based on probability density
      const density = this.atom.calculateProbabilityDensity(
        this.quantumNumbers,
        x, y, z
      );

      const maxDensity = this.getMaximumDensity();
      if (Math.random() < density / maxDensity) {
        return new THREE.Vector3(x, y, z);
      }

      attempts++;
    }

    // Fallback: return position near nucleus
    return new THREE.Vector3(0, 0, 0);
  }

  /**
   * Get approximate maximum density for normalization
   */
  private getMaximumDensity(): number {
    // For hydrogen-like atoms, maximum is usually at origin for s orbitals
    if (this.quantumNumbers.l === 0) {
      return this.atom.calculateProbabilityDensity(
        this.quantumNumbers,
        0, 0, 0
      );
    }

    // For p,d,f orbitals, estimate maximum
    return this.atom.calculateProbabilityDensity(
      this.quantumNumbers,
      1, 0, 0
    ) * 2;
  }

  /**
   * Update droplet positions with wave following + quantum noise
   */
  public update(deltaTime: number): void {
    this.time += deltaTime * this.config.animationSpeed;

    for (let i = 0; i < this.droplets.length; i++) {
      const droplet = this.droplets[i]!;
      this.updateDropletPhysics(droplet, i, deltaTime);
    }
  }

  /**
   * Update individual droplet physics
   */
  private updateDropletPhysics(droplet: ElectronDroplet, index: number, deltaTime: number): void {
    // 1. Calculate current wave function target
    this.updateWaveTarget(droplet);

    // 2. Add quantum noise
    this.addQuantumNoise(droplet, index);

    // 3. Apply wave following force
    this.applyWaveFollowing(droplet, deltaTime);

    // 4. Apply velocity damping (prevents excessive oscillation)
    droplet.velocity.multiplyScalar(0.95);

    // 5. Update position
    this.tempVector.copy(droplet.velocity).multiplyScalar(deltaTime);
    droplet.position.add(this.tempVector);

    // 6. Update density and opacity
    this.updateDropletProperties(droplet);

    // 7. Update phase for time-based effects
    droplet.phase += deltaTime * (1 + droplet.density * 2);
  }

  /**
   * Calculate where the wave function wants the droplet to be
   */
  private updateWaveTarget(droplet: ElectronDroplet): void {
    // For now, keep target close to current position with slight wave-based drift
    // In a full implementation, this would solve the time-dependent Schrödinger equation
    const driftStrength = 0.1;
    const timePhase = this.time * 0.5;

    droplet.waveTarget.copy(droplet.position);
    droplet.waveTarget.x += Math.sin(timePhase + droplet.phase) * driftStrength;
    droplet.waveTarget.y += Math.cos(timePhase + droplet.phase * 1.3) * driftStrength;
    droplet.waveTarget.z += Math.sin(timePhase + droplet.phase * 0.7) * driftStrength;
  }

  /**
   * Add quantum uncertainty noise
   */
  private addQuantumNoise(droplet: ElectronDroplet, index: number): void {
    const noiseIdx = index * 4;
    const freq = this.noiseSeeds[noiseIdx + 3];
    const t = this.time * freq;

    // Perlin-like noise using sine waves
    const noiseX = Math.sin(t + this.noiseSeeds[noiseIdx]) * this.config.noiseStrength;
    const noiseY = Math.sin(t + this.noiseSeeds[noiseIdx + 1]) * this.config.noiseStrength;
    const noiseZ = Math.sin(t + this.noiseSeeds[noiseIdx + 2]) * this.config.noiseStrength;

    droplet.noiseOffset.set(noiseX, noiseY, noiseZ);
  }

  /**
   * Apply force that pulls droplets toward wave pattern
   */
  private applyWaveFollowing(droplet: ElectronDroplet, deltaTime: number): void {
    // Calculate target position (wave + noise)
    this.tempVector.copy(droplet.waveTarget).add(droplet.noiseOffset);

    // Calculate force toward target
    this.tempVector.sub(droplet.position);
    this.tempVector.multiplyScalar(this.config.waveFollowing * deltaTime * 60);

    // Apply force to velocity
    droplet.velocity.add(this.tempVector);

    // Limit velocity to prevent instability
    const maxVelocity = 5.0;
    if (droplet.velocity.length() > maxVelocity) {
      droplet.velocity.normalize().multiplyScalar(maxVelocity);
    }
  }

  /**
   * Update droplet density and visual properties
   */
  private updateDropletProperties(droplet: ElectronDroplet): void {
    // Recalculate density at current position
    droplet.density = this.atom.calculateProbabilityDensity(
      this.quantumNumbers,
      droplet.position.x,
      droplet.position.y,
      droplet.position.z
    );

    // Update opacity with smooth transitions
    const targetOpacity = Math.min(1.0, droplet.density * 100);
    droplet.opacity += (targetOpacity - droplet.opacity) * 0.1;

    // Ensure droplets don't get too far from realistic positions
    const maxDistance = this.quantumNumbers.n * this.quantumNumbers.n * 10;
    if (droplet.position.length() > maxDistance) {
      // Gently pull back toward origin
      this.tempVector.copy(droplet.position).normalize().multiplyScalar(-0.1);
      droplet.velocity.add(this.tempVector);
    }
  }

  /**
   * Get droplet data for rendering
   */
  public getDropletData(): {
    positions: Float32Array;
    opacities: Float32Array;
    sizes: Float32Array;
  } {
    const positions = new Float32Array(this.droplets.length * 3);
    const opacities = new Float32Array(this.droplets.length);
    const sizes = new Float32Array(this.droplets.length);

    for (let i = 0; i < this.droplets.length; i++) {
      const droplet = this.droplets[i]!;
      const idx = i * 3;

      positions[idx] = droplet.position.x;
      positions[idx + 1] = droplet.position.y;
      positions[idx + 2] = droplet.position.z;

      opacities[i] = droplet.opacity;
      sizes[i] = this.config.dropletSize * (0.5 + droplet.density * 0.5);
    }

    return { positions, opacities, sizes };
  }

  /**
   * Get system configuration
   */
  public getConfig(): WaveParticleConfig {
    return { ...this.config };
  }

  /**
   * Update system configuration
   */
  public updateConfig(newConfig: Partial<WaveParticleConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reinitialize if particle count changed
    if (newConfig.particleCount && newConfig.particleCount !== this.droplets.length) {
      this.initializeDroplets();
      this.generateNoiseSeeds();
    }
  }

  /**
   * Get performance statistics
   */
  public getStats(): {
    dropletCount: number;
    averageDensity: number;
    averageVelocity: number;
  } {
    const totalDensity = this.droplets.reduce((sum, d) => sum + d.density, 0);
    const totalVelocity = this.droplets.reduce((sum, d) => sum + d.velocity.length(), 0);

    return {
      dropletCount: this.droplets.length,
      averageDensity: totalDensity / this.droplets.length,
      averageVelocity: totalVelocity / this.droplets.length,
    };
  }
}