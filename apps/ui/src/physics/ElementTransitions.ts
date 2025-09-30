import * as THREE from 'three';
import { ElementQuantumState, ElectronState } from './QuantumMechanicsEngine';
import { ElectronConfigurator } from './ElectronConfigurator';

export interface TransitionState {
  from: ElementQuantumState;
  to: ElementQuantumState;
  progress: number; // 0 to 1
  duration: number; // milliseconds
  startTime: number;
  type: 'ionization' | 'excitation' | 'deexcitation' | 'element_change';
}

export interface TransitionEffect {
  type: 'particle_emit' | 'energy_wave' | 'orbital_morph' | 'nucleus_change';
  particles: THREE.Points | null;
  position: THREE.Vector3;
  energy: number;
  lifetime: number;
  startTime: number;
}

export class ElementTransitionManager {
  private activeTransitions = new Map<string, TransitionState>();
  private transitionEffects = new Map<string, TransitionEffect>();
  private transitionCallbacks = new Map<string, (state: TransitionState) => void>();

  /**
   * Start transition between two quantum states
   */
  public startTransition(
    fromState: ElementQuantumState,
    toState: ElementQuantumState,
    duration: number = 2000,
    transitionId: string = Math.random().toString(36)
  ): string {
    const transitionType = this.determineTransitionType(fromState, toState);

    const transition: TransitionState = {
      from: fromState,
      to: toState,
      progress: 0,
      duration,
      startTime: Date.now(),
      type: transitionType
    };

    this.activeTransitions.set(transitionId, transition);

    // Create visual effects for transition
    this.createTransitionEffects(transition, transitionId);

    return transitionId;
  }

  /**
   * Update all active transitions
   */
  public updateTransitions(): { updatedStates: Map<string, ElementQuantumState>; completedTransitions: string[] } {
    const currentTime = Date.now();
    const updatedStates = new Map<string, ElementQuantumState>();
    const completedTransitions: string[] = [];

    for (const [id, transition] of this.activeTransitions) {
      const elapsed = currentTime - transition.startTime;
      const progress = Math.min(elapsed / transition.duration, 1);

      transition.progress = this.applyEasing(progress, transition.type);

      // Interpolate between states
      const interpolatedState = this.interpolateStates(transition.from, transition.to, transition.progress);
      updatedStates.set(id, interpolatedState);

      // Update effects
      this.updateTransitionEffects(id, transition);

      // Execute callback
      const callback = this.transitionCallbacks.get(id);
      if (callback) {
        callback(transition);
      }

      // Check if transition is complete
      if (progress >= 1) {
        completedTransitions.push(id);
        this.completeTransition(id);
      }
    }

    return { updatedStates, completedTransitions };
  }

  /**
   * Interpolate between two quantum states
   */
  private interpolateStates(from: ElementQuantumState, to: ElementQuantumState, t: number): ElementQuantumState {
    // Create interpolated state
    const interpolated: ElementQuantumState = {
      atomicNumber: Math.round(from.atomicNumber + (to.atomicNumber - from.atomicNumber) * t),
      massNumber: Math.round(from.massNumber + (to.massNumber - from.massNumber) * t),
      ionCharge: Math.round(from.ionCharge + (to.ionCharge - from.ionCharge) * t),
      configurations: [],
      totalEnergy: from.totalEnergy + (to.totalEnergy - from.totalEnergy) * t,
      groundState: t < 0.5 ? from.groundState : to.groundState
    };

    // Interpolate electron configurations
    interpolated.configurations = this.interpolateConfigurations(from.configurations, to.configurations, t);

    return interpolated;
  }

  /**
   * Interpolate electron configurations
   */
  private interpolateConfigurations(fromConfigs: any[], toConfigs: any[], t: number): any[] {
    const result = [];
    const maxConfigs = Math.max(fromConfigs.length, toConfigs.length);

    for (let i = 0; i < maxConfigs; i++) {
      const fromConfig = fromConfigs[i];
      const toConfig = toConfigs[i];

      if (fromConfig && toConfig && fromConfig.n === toConfig.n && fromConfig.l === toConfig.l) {
        // Interpolate electron count in same orbital
        const interpolatedElectrons = this.interpolateElectrons(fromConfig.electrons, toConfig.electrons, t);

        result.push({
          n: fromConfig.n,
          l: fromConfig.l,
          electrons: interpolatedElectrons,
          maxCapacity: Math.max(fromConfig.maxCapacity, toConfig.maxCapacity),
          energyLevel: fromConfig.energyLevel + (toConfig.energyLevel - fromConfig.energyLevel) * t
        });
      } else if (fromConfig && !toConfig) {
        // Removing orbital
        const fadeOut = Math.max(0, 1 - t * 2);
        if (fadeOut > 0) {
          result.push({
            ...fromConfig,
            electrons: fromConfig.electrons.map((e: ElectronState) => ({
              ...e,
              probability: e.probability * fadeOut
            }))
          });
        }
      } else if (!fromConfig && toConfig) {
        // Adding orbital
        const fadeIn = Math.max(0, t * 2 - 1);
        if (fadeIn > 0) {
          result.push({
            ...toConfig,
            electrons: toConfig.electrons.map((e: ElectronState) => ({
              ...e,
              probability: e.probability * fadeIn
            }))
          });
        }
      }
    }

    return result;
  }

  /**
   * Interpolate electrons within an orbital
   */
  private interpolateElectrons(fromElectrons: ElectronState[], toElectrons: ElectronState[], t: number): ElectronState[] {
    const result: ElectronState[] = [];
    const maxElectrons = Math.max(fromElectrons.length, toElectrons.length);

    for (let i = 0; i < maxElectrons; i++) {
      const fromElectron = fromElectrons[i];
      const toElectron = toElectrons[i];

      if (fromElectron && toElectron) {
        // Interpolate existing electron
        result.push({
          quantum: toElectron.quantum, // Use target quantum numbers
          position: [
            fromElectron.position[0] + (toElectron.position[0] - fromElectron.position[0]) * t,
            fromElectron.position[1] + (toElectron.position[1] - fromElectron.position[1]) * t,
            fromElectron.position[2] + (toElectron.position[2] - fromElectron.position[2]) * t
          ],
          velocity: [
            fromElectron.velocity[0] + (toElectron.velocity[0] - fromElectron.velocity[0]) * t,
            fromElectron.velocity[1] + (toElectron.velocity[1] - fromElectron.velocity[1]) * t,
            fromElectron.velocity[2] + (toElectron.velocity[2] - fromElectron.velocity[2]) * t
          ],
          phase: fromElectron.phase + (toElectron.phase - fromElectron.phase) * t,
          probability: fromElectron.probability + (toElectron.probability - fromElectron.probability) * t,
          energy: fromElectron.energy + (toElectron.energy - fromElectron.energy) * t
        });
      } else if (fromElectron && !toElectron) {
        // Electron being removed (ionization)
        const fadeOut = Math.max(0, 1 - t * 1.5);
        if (fadeOut > 0) {
          result.push({
            ...fromElectron,
            probability: fromElectron.probability * fadeOut,
            position: [
              fromElectron.position[0] + (Math.random() - 0.5) * t * 50,
              fromElectron.position[1] + (Math.random() - 0.5) * t * 50,
              fromElectron.position[2] + (Math.random() - 0.5) * t * 50
            ]
          });
        }
      } else if (!fromElectron && toElectron) {
        // Electron being added
        const fadeIn = Math.max(0, t * 1.5 - 0.5);
        if (fadeIn > 0) {
          result.push({
            ...toElectron,
            probability: toElectron.probability * fadeIn
          });
        }
      }
    }

    return result;
  }

  /**
   * Determine type of transition
   */
  private determineTransitionType(from: ElementQuantumState, to: ElementQuantumState): TransitionState['type'] {
    if (from.atomicNumber !== to.atomicNumber) {
      return 'element_change';
    }

    if (from.ionCharge !== to.ionCharge) {
      return 'ionization';
    }

    if (from.totalEnergy < to.totalEnergy) {
      return 'excitation';
    }

    return 'deexcitation';
  }

  /**
   * Apply easing function based on transition type
   */
  private applyEasing(t: number, type: TransitionState['type']): number {
    switch (type) {
      case 'ionization':
        // Fast start, slow end
        return 1 - Math.pow(1 - t, 3);

      case 'excitation':
        // Slow start, fast middle, slow end
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      case 'deexcitation':
        // Fast exponential decay
        return 1 - Math.exp(-t * 4);

      case 'element_change':
        // Smooth S-curve
        return t * t * (3 - 2 * t);

      default:
        return t;
    }
  }

  /**
   * Create visual effects for transitions
   */
  private createTransitionEffects(transition: TransitionState, transitionId: string): void {
    const effects: TransitionEffect[] = [];

    switch (transition.type) {
      case 'ionization':
        effects.push({
          type: 'particle_emit',
          particles: this.createIonizationParticles(),
          position: new THREE.Vector3(0, 0, 0),
          energy: Math.abs(transition.to.totalEnergy - transition.from.totalEnergy),
          lifetime: transition.duration,
          startTime: Date.now()
        });
        break;

      case 'excitation':
        effects.push({
          type: 'energy_wave',
          particles: this.createEnergyWave(),
          position: new THREE.Vector3(0, 0, 0),
          energy: transition.to.totalEnergy - transition.from.totalEnergy,
          lifetime: transition.duration * 0.3,
          startTime: Date.now()
        });
        break;

      case 'deexcitation':
        effects.push({
          type: 'particle_emit',
          particles: this.createPhotonEmission(),
          position: new THREE.Vector3(0, 0, 0),
          energy: transition.from.totalEnergy - transition.to.totalEnergy,
          lifetime: transition.duration * 0.5,
          startTime: Date.now()
        });
        break;

      case 'element_change':
        effects.push({
          type: 'nucleus_change',
          particles: this.createNucleusChangeEffect(),
          position: new THREE.Vector3(0, 0, 0),
          energy: Math.abs(transition.to.totalEnergy - transition.from.totalEnergy),
          lifetime: transition.duration,
          startTime: Date.now()
        });
        break;
    }

    // Store effects
    effects.forEach((effect, index) => {
      this.transitionEffects.set(`${transitionId}_${index}`, effect);
    });
  }

  /**
   * Create ionization particle effect
   */
  private createIonizationParticles(): THREE.Points {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random positions around origin
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      // Blue-white colors for electrons
      colors[i * 3] = 0.5 + Math.random() * 0.5;
      colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 2] = 1.0;

      sizes[i] = Math.random() * 0.2 + 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  /**
   * Create energy wave effect
   */
  private createEnergyWave(): THREE.Points {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Energy colors (yellow to red)
      const intensity = Math.random();
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = intensity;
      colors[i * 3 + 2] = 0.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  /**
   * Create photon emission effect
   */
  private createPhotonEmission(): THREE.Points {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Start from center, move outward
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Photon colors (white/yellow)
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  /**
   * Create nucleus change effect
   */
  private createNucleusChangeEffect(): THREE.Points {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;

      // Nuclear colors (orange/red)
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
      colors[i * 3 + 2] = 0.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    return new THREE.Points(geometry, material);
  }

  /**
   * Update transition effects
   */
  private updateTransitionEffects(transitionId: string, transition: TransitionState): void {
    const currentTime = Date.now();

    for (const [effectId, effect] of this.transitionEffects) {
      if (!effectId.startsWith(transitionId)) continue;

      const elapsed = currentTime - effect.startTime;
      const progress = elapsed / effect.lifetime;

      if (progress >= 1) {
        // Remove completed effect
        this.transitionEffects.delete(effectId);
        continue;
      }

      // Update effect based on type
      this.updateEffect(effect, progress, transition);
    }
  }

  /**
   * Update individual effect
   */
  private updateEffect(effect: TransitionEffect, progress: number, transition: TransitionState): void {
    if (!effect.particles) return;

    const positions = effect.particles.geometry.attributes.position.array as Float32Array;
    const material = effect.particles.material as THREE.PointsMaterial;

    switch (effect.type) {
      case 'particle_emit':
        // Particles move outward and fade
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] *= 1 + progress * 0.1;
          positions[i + 1] *= 1 + progress * 0.1;
          positions[i + 2] *= 1 + progress * 0.1;
        }
        material.opacity = Math.max(0, 1 - progress);
        break;

      case 'energy_wave':
        // Wave expands and fades
        const scale = 1 + progress * 5;
        effect.particles.scale.setScalar(scale);
        material.opacity = Math.max(0, 1 - progress * progress);
        break;

      case 'nucleus_change':
        // Chaotic movement with gradual settling
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += (Math.random() - 0.5) * (1 - progress) * 0.5;
          positions[i + 1] += (Math.random() - 0.5) * (1 - progress) * 0.5;
          positions[i + 2] += (Math.random() - 0.5) * (1 - progress) * 0.5;
        }
        break;
    }

    effect.particles.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Complete transition and cleanup
   */
  private completeTransition(transitionId: string): void {
    this.activeTransitions.delete(transitionId);
    this.transitionCallbacks.delete(transitionId);

    // Clean up effects
    for (const effectId of this.transitionEffects.keys()) {
      if (effectId.startsWith(transitionId)) {
        this.transitionEffects.delete(effectId);
      }
    }
  }

  /**
   * Set callback for transition updates
   */
  public onTransitionUpdate(transitionId: string, callback: (state: TransitionState) => void): void {
    this.transitionCallbacks.set(transitionId, callback);
  }

  /**
   * Cancel transition
   */
  public cancelTransition(transitionId: string): void {
    this.completeTransition(transitionId);
  }

  /**
   * Get all transition effects for rendering
   */
  public getActiveEffects(): TransitionEffect[] {
    return Array.from(this.transitionEffects.values());
  }

  /**
   * Check if any transitions are active
   */
  public hasActiveTransitions(): boolean {
    return this.activeTransitions.size > 0;
  }
}