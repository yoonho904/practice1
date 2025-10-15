import { FUNDAMENTAL_CONSTANTS, validateQuantumNumbers } from '../constants/PhysicalConstants';

export interface QuantumNumbers {
  n: number;  // Principal quantum number
  l: number;  // Angular momentum quantum number
  m: number;  // Magnetic quantum number
  s: number;  // Spin quantum number (±0.5)
}

export interface ElectronState {
  quantum: QuantumNumbers;
  position: [number, number, number];
  velocity: [number, number, number];
  phase: number;
  probability: number;
  energy: number;
}

export interface OrbitalConfiguration {
  n: number;
  l: number;
  electrons: ElectronState[];
  maxCapacity: number;
  energyLevel: number;
}

export interface ElementQuantumState {
  atomicNumber: number;
  massNumber: number;
  ionCharge: number;
  configurations: OrbitalConfiguration[];
  totalEnergy: number;
  groundState: boolean;
}

export class QuantumMechanicsEngine {
  private static instance: QuantumMechanicsEngine;
  private waveFunctionCache = new Map<string, Float32Array>();
  private factorialCache = new Map<number, number>();
  private radialPeakCache = new Map<string, number>();
  private radialAmplitudePeakCache = new Map<string, number>();
  private angularPeakCache = new Map<string, number>();
  private probabilityPeakCache = new Map<string, number>();

  public static getInstance(): QuantumMechanicsEngine {
    if (!QuantumMechanicsEngine.instance) {
      QuantumMechanicsEngine.instance = new QuantumMechanicsEngine();
    }
    return QuantumMechanicsEngine.instance;
  }

  /**
   * Calculate hydrogen-like wave function value at given coordinates
   */
  public calculateWaveFunction(
    n: number,
    l: number,
    m: number,
    x: number,
    y: number,
    z: number,
    Z: number = 1,
    time: number = 0
  ): number {
    if (!validateQuantumNumbers(n, l, m)) {
      return 0;
    }

    const r = Math.sqrt(x * x + y * y + z * z);
    const safeRatio = r === 0 ? 1 : Math.min(1, Math.max(-1, z / r));
    const theta = Math.acos(safeRatio);
    const phi = Math.atan2(y, x);

    const radialPart = this.calculateRadialWaveFunction(n, l, r, Z);
    const angularPart = this.calculateSphericalHarmonic(l, m, theta, phi);
    const timePart = this.calculateTimeEvolution(n, Z, time);

    return radialPart * angularPart * timePart;
  }

  /**
   * Calculate probability density |ψ|² at given coordinates
   */
  public calculateProbabilityDensity(
    n: number,
    l: number,
    m: number,
    x: number,
    y: number,
    z: number,
    Z: number = 1
  ): number {
    const waveValue = this.calculateWaveFunction(n, l, m, x, y, z, Z);
    const probability = waveValue * waveValue;
    const normalization = this.getProbabilityPeak(n, l, m, Z);

    if (normalization <= 0) {
      return probability;
    }

    return Math.min(probability / normalization, 1);
  }

  /**
   * Generate electron configuration for any element
   */
  public generateElectronConfiguration(atomicNumber: number, ionCharge: number = 0): ElementQuantumState {
    const effectiveElectrons = atomicNumber - ionCharge;
    if (effectiveElectrons < 0) {
      throw new Error('Invalid ion charge: results in negative electron count');
    }

    const configurations: OrbitalConfiguration[] = [];
    let remainingElectrons = effectiveElectrons;
    let totalEnergy = 0;

    // Aufbau principle with proper orbital ordering
    const orbitalOrder = this.getOrbitalFillingOrder();

    for (const { n, l } of orbitalOrder) {
      if (remainingElectrons <= 0) {break;}

      const maxElectronsInSubshell = 2 * (2 * l + 1);
      const electronsToPlace = Math.min(remainingElectrons, maxElectronsInSubshell);

      const electrons = this.fillOrbitalSubshell(n, l, electronsToPlace, atomicNumber);
      const energyLevel = this.calculateOrbitalEnergy(n, l, atomicNumber);

      configurations.push({
        n,
        l,
        electrons,
        maxCapacity: maxElectronsInSubshell,
        energyLevel
      });

      totalEnergy += energyLevel * electronsToPlace;
      remainingElectrons -= electronsToPlace;
    }

    return {
      atomicNumber,
      massNumber: Math.round(atomicNumber * 2), // Approximate
      ionCharge,
      configurations,
      totalEnergy,
      groundState: ionCharge === 0
    };
  }

  /**
   * Generate wave-particle positions for visualization
   * PLACEHOLDER - TO BE REBUILT IN NEW SYSTEM
   */
  public generateWaveParticles(
    configuration: OrbitalConfiguration,
    sampleCount: number,
    Z: number,
    temperature: number = 298
  ): ElectronState[] {
    const particles: ElectronState[] = [];
    const { n, l } = configuration;

    // Thermal energy effects
    const thermalVelocity = Math.sqrt(3 * FUNDAMENTAL_CONSTANTS.BOLTZMANN_CONSTANT * temperature / FUNDAMENTAL_CONSTANTS.ELECTRON_MASS);

    // Generate initial particle positions using proper quantum sampling
    const minSeparation = l === 0 ? 0.05 : 0.3;
    for (let i = 0; i < sampleCount; i++) {
      let position: [number, number, number];
      let attempts = 0;
      const maxAttempts = 50;

      do {
        position = this.sampleFromProbabilityDistribution(n, l, 0, Z);
        attempts++;

        // Check if position is too close to existing particles
        const tooClose = particles.some(p => {
          const dx = position[0] - p.position[0];
          const dy = position[1] - p.position[1];
          const dz = position[2] - p.position[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
          return dist < minSeparation; // Minimum separation to avoid clustering
        });

        if (!tooClose || attempts >= maxAttempts) {break;}
      } while (true);

      // Calculate wave function phase
      const phase = Math.random() * 2 * Math.PI;

      // Calculate probability at this position
      const probability = this.calculateProbabilityDensity(n, l, 0, position[0], position[1], position[2], Z);

      // Add thermal motion
      const velocity: [number, number, number] = [
        (Math.random() - 0.5) * thermalVelocity * 1e-6, // Scale for visualization
        (Math.random() - 0.5) * thermalVelocity * 1e-6,
        (Math.random() - 0.5) * thermalVelocity * 1e-6
      ];

      // Energy of this state
      const energy = this.calculateOrbitalEnergy(n, l, Z);

      particles.push({
        quantum: { n, l, m: 0, s: 0.5 },
        position,
        velocity,
        phase,
        probability,
        energy
      });
    }

    // Apply force-based relaxation to spread particles properly
    return this.applyElectronRepulsion(particles, n, l, Z);
  }

  /**
   * Calculate orbital energy including electron-electron repulsion (approximate)
   */
  private calculateOrbitalEnergy(n: number, l: number, Z: number): number {
    // Slater screening rules for effective nuclear charge
    const effectiveZ = this.calculateEffectiveNuclearCharge(n, l, Z);

    // Hydrogen-like energy with screening
    const hydrogenEnergy = -13.6 * effectiveZ * effectiveZ / (n * n); // eV

    // Convert to Joules
    return hydrogenEnergy * FUNDAMENTAL_CONSTANTS.ELECTRON_VOLT;
  }

  /**
   * Calculate effective nuclear charge using enhanced Slater's rules
   */
  private calculateEffectiveNuclearCharge(n: number, l: number, Z: number): number {
    let shielding = 0;

    // Enhanced Slater's rules for better accuracy across all elements
    if (n === 1) {
      // 1s electrons
      shielding = 0.30 * (Z - 1);
    } else if (n === 2) {
      // 2s and 2p electrons
      if (l === 0) {
        // 2s electrons
        shielding = 0.85 * Math.min(2, Z - 2) + 0.35 * Math.max(0, Math.min(8, Z - 2) - 2);
      } else {
        // 2p electrons
        shielding = 0.85 * Math.min(2, Z - 2) + 0.35 * Math.max(0, Z - 2 - 2);
      }
    } else if (n === 3) {
      // 3s, 3p, and 3d electrons
      if (l === 0 || l === 1) {
        // 3s and 3p electrons
        shielding = 1.00 * Math.min(10, Z - 10) + 0.85 * Math.min(8, Math.max(0, Z - 10 - 10)) + 0.35 * Math.max(0, Z - 18);
      } else {
        // 3d electrons
        shielding = 1.00 * Math.min(18, Z - 18) + 0.35 * Math.max(0, Z - 18 - (2 * l + 1 - 1));
      }
    } else {
      // For n ≥ 4, use generalized approach
      const coreElectrons = this.getCoreElectronCount(n, l);
      const sameSubshellElectrons = Math.max(0, 2 * l + 1 - 1);

      if (l === 3) {
        // f electrons
        shielding = 1.00 * coreElectrons + 0.35 * sameSubshellElectrons;
      } else if (l === 2) {
        // d electrons
        shielding = 1.00 * coreElectrons + 0.35 * sameSubshellElectrons;
      } else {
        // s and p electrons
        shielding = 1.00 * Math.min(coreElectrons, 10) + 0.85 * Math.max(0, coreElectrons - 10) + 0.35 * sameSubshellElectrons;
      }
    }

    return Math.max(1, Z - shielding);
  }

  /**
   * Get core electron count for effective nuclear charge calculation
   */
  private getCoreElectronCount(n: number, l: number): number {
    let coreElectrons = 0;
    const fillingOrder = this.getOrbitalFillingOrder();

    for (const orbital of fillingOrder) {
      if (orbital.n < n || (orbital.n === n && orbital.l < l)) {
        coreElectrons += 2 * (2 * orbital.l + 1);
      } else {
        break;
      }
    }

    return coreElectrons;
  }

  /**
   * Get element-specific visualization characteristics
   */
  public getElementCharacteristics(atomicNumber: number): {
    maxVisibleOrbitals: number;
    prominentOrbitals: string[];
    colorScheme: { [key: string]: string };
    visualizationScale: number;
  } {
    if (atomicNumber <= 2) {
      // Hydrogen and Helium
      return {
        maxVisibleOrbitals: 1,
        prominentOrbitals: ['1s'],
        colorScheme: { '1s': '#3399ff' },
        visualizationScale: 1.5
      };
    } else if (atomicNumber <= 10) {
      // Period 2 elements
      return {
        maxVisibleOrbitals: 2,
        prominentOrbitals: ['1s', '2s', '2p'],
        colorScheme: { '1s': '#3399ff', '2s': '#33ccff', '2p': '#33ff66' },
        visualizationScale: 1.2
      };
    } else if (atomicNumber <= 18) {
      // Period 3 elements
      return {
        maxVisibleOrbitals: 3,
        prominentOrbitals: ['2s', '2p', '3s', '3p'],
        colorScheme: { '2s': '#33ccff', '2p': '#33ff66', '3s': '#66ff33', '3p': '#99ff33' },
        visualizationScale: 1.0
      };
    } else if (atomicNumber <= 36) {
      // Period 4 elements (including transition metals)
      return {
        maxVisibleOrbitals: 4,
        prominentOrbitals: ['3s', '3p', '3d', '4s', '4p'],
        colorScheme: {
          '3s': '#66ff33', '3p': '#99ff33', '3d': '#ff9933',
          '4s': '#ccff33', '4p': '#ffcc33'
        },
        visualizationScale: 0.8
      };
    } else if (atomicNumber <= 54) {
      // Period 5 elements
      return {
        maxVisibleOrbitals: 5,
        prominentOrbitals: ['4s', '4p', '4d', '5s', '5p'],
        colorScheme: {
          '4s': '#ccff33', '4p': '#ffcc33', '4d': '#ff6633',
          '5s': '#ffff33', '5p': '#ffcc66'
        },
        visualizationScale: 0.7
      };
    } else if (atomicNumber <= 86) {
      // Period 6 elements (including lanthanides)
      return {
        maxVisibleOrbitals: 6,
        prominentOrbitals: ['5s', '5p', '5d', '4f', '6s', '6p'],
        colorScheme: {
          '5s': '#ffff33', '5p': '#ffcc66', '5d': '#ff3366',
          '4f': '#cc33ff', '6s': '#ff9966', '6p': '#ffcc99'
        },
        visualizationScale: 0.6
      };
    } else {
      // Period 7+ elements (including actinides)
      return {
        maxVisibleOrbitals: 7,
        prominentOrbitals: ['6s', '6p', '6d', '5f', '7s', '7p'],
        colorScheme: {
          '6s': '#ff9966', '6p': '#ffcc99', '6d': '#ff0066',
          '5f': '#9933ff', '7s': '#ff6699', '7p': '#ff99cc'
        },
        visualizationScale: 0.5
      };
    }
  }

  /**
   * Calculate radial part of hydrogen-like wave function
   */
  private calculateRadialWaveFunction(n: number, l: number, r: number, Z: number): number {
    if (n <= 0 || l < 0 || l >= n) {
      return 0;
    }

    const k = n - l - 1;
    if (k < 0) {
      return 0;
    }

    const rho = (2 * Z * r) / n;
    const prefactor = Math.sqrt(Math.pow(2 * Z / n, 3) * this.factorial(k) / (2 * n * this.factorial(n + l)));
    const laguerre = this.associatedLaguerre(k, 2 * l + 1, rho);

    return prefactor * Math.exp(-rho / 2) * Math.pow(rho, l) * laguerre;
  }

  private radialProbabilityDensity(n: number, l: number, Z: number, r: number): number {
    if (r < 0) {
      return 0;
    }
    const radial = this.calculateRadialWaveFunction(n, l, r, Z);
    return radial * radial * r * r;
  }

  private getRadialPeak(n: number, l: number, Z: number, maxRadius: number): number {
    const key = `${n}:${l}:${Z}:${maxRadius.toFixed(3)}`;
    const cached = this.radialPeakCache.get(key);
    if (cached) {
      return cached;
    }

    let peak = 0;
    const steps = 512;
    for (let i = 0; i <= steps; i++) {
      const r = (maxRadius * i) / steps;
      const density = this.radialProbabilityDensity(n, l, Z, r);
      if (density > peak) {
        peak = density;
      }
    }

    const safePeak = peak > 0 ? peak * 1.05 : 1e-6;
    this.radialPeakCache.set(key, safePeak);
    return safePeak;
  }

  private sampleAngularDistribution(l: number, m: number): { theta: number; phi: number } {
    if (l === 0) {
      const cosTheta = 2 * Math.random() - 1;
      return { theta: Math.acos(cosTheta), phi: 2 * Math.PI * Math.random() };
    }

    const peak = this.getAngularPeak(l, m);
    for (let attempt = 0; attempt < 512; attempt++) {
      const cosTheta = 2 * Math.random() - 1;
      const theta = Math.acos(cosTheta);
      const phi = 2 * Math.PI * Math.random();
      const density = Math.pow(this.calculateSphericalHarmonic(l, m, theta, phi), 2);
      if (density <= 0) {
        continue;
      }

      if (Math.random() * peak <= density) {
        return { theta, phi };
      }
    }

    const cosTheta = 2 * Math.random() - 1;
    return { theta: Math.acos(cosTheta), phi: 2 * Math.PI * Math.random() };
  }

  private getAngularPeak(l: number, m: number): number {
    const key = `${l}:${m}`;
    const cached = this.angularPeakCache.get(key);
    if (cached) {
      return cached;
    }

    let peak = 0;
    const thetaSteps = 120;
    const phiSteps = 240;
    for (let i = 0; i <= thetaSteps; i++) {
      const theta = Math.PI * i / thetaSteps;
      for (let j = 0; j < phiSteps; j++) {
        const phi = (2 * Math.PI * j) / phiSteps;
        const density = Math.pow(this.calculateSphericalHarmonic(l, m, theta, phi), 2);
        if (density > peak) {
          peak = density;
        }
      }
    }

    const safePeak = peak > 0 ? peak * 1.05 : 1e-6;
    this.angularPeakCache.set(key, safePeak);
    return safePeak;
  }

  private getRadialAmplitudePeak(n: number, l: number, Z: number): number {
    const key = `${n}:${l}:${Z}`;
    const cached = this.radialAmplitudePeakCache.get(key);
    if (cached) {
      return cached;
    }

    const maxRadius = Math.max(10, (n * n * 6) / Math.max(Z, 1));
    let peak = 0;
    const steps = 512;
    for (let i = 0; i <= steps; i++) {
      const r = (maxRadius * i) / steps;
      const amplitude = this.calculateRadialWaveFunction(n, l, r, Z);
      const value = amplitude * amplitude;
      if (value > peak) {
        peak = value;
      }
    }

    const safePeak = peak > 0 ? peak * 1.05 : 1e-6;
    this.radialAmplitudePeakCache.set(key, safePeak);
    return safePeak;
  }

  private getProbabilityPeak(n: number, l: number, m: number, Z: number): number {
    const key = `${n}:${l}:${m}:${Z}`;
    const cached = this.probabilityPeakCache.get(key);
    if (cached) {
      return cached;
    }

    const peak = this.getRadialAmplitudePeak(n, l, Z) * this.getAngularPeak(l, m);
    const safePeak = peak > 0 ? peak : 1e-6;
    this.probabilityPeakCache.set(key, safePeak);
    return safePeak;
  }

  private factorial(n: number): number {
    if (n <= 1) {
      return 1;
    }
    const cached = this.factorialCache.get(n);
    if (cached !== undefined) {
      return cached;
    }
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    this.factorialCache.set(n, result);
    return result;
  }

  private associatedLaguerre(k: number, alpha: number, x: number): number {
    if (k === 0) {
      return 1;
    }
    if (k === 1) {
      return 1 + alpha - x;
    }

    let LkMinusTwo = 1;
    let LkMinusOne = 1 + alpha - x;

    for (let i = 2; i <= k; i++) {
      const coefficient = ((2 * i - 1 + alpha - x) * LkMinusOne - (i - 1 + alpha) * LkMinusTwo) / i;
      LkMinusTwo = LkMinusOne;
      LkMinusOne = coefficient;
    }

    return LkMinusOne;
  }

  /**
   * Calculate spherical harmonics (angular part)
   */
  private calculateSphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    switch (l) {
      case 0: // s orbitals
        return 1 / (2 * Math.sqrt(Math.PI));

      case 1: // p orbitals
        switch (m) {
          case -1: return Math.sqrt(3 / (4 * Math.PI)) * sinTheta * Math.cos(phi);
          case 0:  return Math.sqrt(3 / (4 * Math.PI)) * cosTheta;
          case 1:  return Math.sqrt(3 / (4 * Math.PI)) * sinTheta * Math.sin(phi);
        }
        break;

      case 2: // d orbitals
        const sin2Theta = sinTheta * sinTheta;
        switch (m) {
          case -2: return Math.sqrt(15 / (4 * Math.PI)) * sin2Theta * Math.cos(2 * phi) / 2;
          case -1: return Math.sqrt(15 / (4 * Math.PI)) * sinTheta * cosTheta * Math.cos(phi);
          case 0:  return Math.sqrt(5 / (4 * Math.PI)) * (3 * cosTheta * cosTheta - 1) / 2;
          case 1:  return Math.sqrt(15 / (4 * Math.PI)) * sinTheta * cosTheta * Math.sin(phi);
          case 2:  return Math.sqrt(15 / (4 * Math.PI)) * sin2Theta * Math.sin(2 * phi) / 2;
        }
        break;

      case 3: // f orbitals
        const cos2Theta = cosTheta * cosTheta;
        const sin3Theta = sinTheta * sinTheta * sinTheta;
        switch (m) {
          case -3: return Math.sqrt(35 / (8 * Math.PI)) * sin3Theta * Math.cos(3 * phi);
          case -2: return Math.sqrt(105 / (4 * Math.PI)) * sin2Theta * cosTheta * Math.cos(2 * phi) / 2;
          case -1: return Math.sqrt(21 / (8 * Math.PI)) * sinTheta * (5 * cos2Theta - 1) * Math.cos(phi);
          case 0:  return Math.sqrt(7 / (4 * Math.PI)) * cosTheta * (5 * cos2Theta - 3) / 2;
          case 1:  return Math.sqrt(21 / (8 * Math.PI)) * sinTheta * (5 * cos2Theta - 1) * Math.sin(phi);
          case 2:  return Math.sqrt(105 / (4 * Math.PI)) * sin2Theta * cosTheta * Math.sin(2 * phi) / 2;
          case 3:  return Math.sqrt(35 / (8 * Math.PI)) * sin3Theta * Math.sin(3 * phi);
        }
        break;
    }

    return 1; // Fallback
  }

  /**
   * Calculate time evolution of wave function
   */
  private calculateTimeEvolution(n: number, Z: number, time: number): number {
    const energy = -13.6 * Z * Z / (n * n); // eV
    const angularFrequency = Math.abs(energy) * FUNDAMENTAL_CONSTANTS.ELECTRON_VOLT / FUNDAMENTAL_CONSTANTS.REDUCED_PLANCK_CONSTANT;
    return Math.cos(angularFrequency * time);
  }

  /**
   * Apply electron-electron repulsion to prevent bunching
  */
  private applyElectronRepulsion(particles: ElectronState[], n: number, l: number, Z: number): ElectronState[] {
    if (l === 0) {
      return particles.map(p => ({ ...p }));
    }

    const relaxedParticles = particles.map(p => ({ ...p })); // Deep copy
    const iterations = 20;
    const repulsionStrength = 0.05;
    const dampening = 0.7;
    const lowProbabilityThreshold = 0.01;

    for (let iter = 0; iter < iterations; iter++) {
      // Calculate forces between all particles
      const forces = relaxedParticles.map(() => [0, 0, 0] as [number, number, number]);

      for (let i = 0; i < relaxedParticles.length; i++) {
        for (let j = i + 1; j < relaxedParticles.length; j++) {
          const pi = relaxedParticles[i];
          const pj = relaxedParticles[j];

          const dx = pi.position[0] - pj.position[0];
          const dy = pi.position[1] - pj.position[1];
          const dz = pi.position[2] - pj.position[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

          if (dist > 0 && dist < 2.0) { // Apply repulsion within 2 Angstroms
            const force = repulsionStrength / (dist * dist + 0.01);
            const fx = force * dx / dist;
            const fy = force * dy / dist;
            const fz = force * dz / dist;

            forces[i][0] += fx;
            forces[i][1] += fy;
            forces[i][2] += fz;

            forces[j][0] -= fx;
            forces[j][1] -= fy;
            forces[j][2] -= fz;
          }
        }
      }

      // Apply forces and quantum constraint
      for (let i = 0; i < relaxedParticles.length; i++) {
        const particle = relaxedParticles[i];

        // Apply repulsion force
        particle.position[0] += forces[i][0] * dampening;
        particle.position[1] += forces[i][1] * dampening;
        particle.position[2] += forces[i][2] * dampening;

        // Apply quantum constraint - pull back towards high probability regions
        const currentProb = this.calculateProbabilityDensity(n, l, 0,
          particle.position[0], particle.position[1], particle.position[2], Z);

        if (currentProb < lowProbabilityThreshold) { // If moved to low probability region
          // Sample a new position closer to original quantum distribution
          const quantumPosition = this.sampleFromProbabilityDistribution(n, l, 0, Z);
          const pullStrength = 0.1;

          particle.position[0] += (quantumPosition[0] - particle.position[0]) * pullStrength;
          particle.position[1] += (quantumPosition[1] - particle.position[1]) * pullStrength;
          particle.position[2] += (quantumPosition[2] - particle.position[2]) * pullStrength;
        }

        // Update probability
        particle.probability = this.calculateProbabilityDensity(n, l, 0,
          particle.position[0], particle.position[1], particle.position[2], Z);
      }
    }

    return relaxedParticles;
  }

  /**
   * Sample position from probability distribution using proper spherical sampling
   */
  private sampleFromProbabilityDistribution(n: number, l: number, m: number, Z: number): [number, number, number] {
    const maxRadius = Math.max(10, (n * n * 6) / Math.max(Z, 1));
    let radius: number;

    if (n === 1 && l === 0) {
      const product =
        Math.max(Math.random(), Number.EPSILON) *
        Math.max(Math.random(), Number.EPSILON) *
        Math.max(Math.random(), Number.EPSILON);
      radius = -0.5 * Math.log(product);
      radius /= Math.max(Z, 1e-6);
    } else {
      const peakProbability = this.getRadialPeak(n, l, Z, maxRadius);
      let selected: number | null = null;
      let bestCandidate = 0;
      let bestProbability = -Infinity;

      for (let attempt = 0; attempt < 512; attempt++) {
        const candidate = Math.random() * maxRadius;
        const probability = this.radialProbabilityDensity(n, l, Z, candidate);

        if (probability > bestProbability) {
          bestProbability = probability;
          bestCandidate = candidate;
        }

        if (probability <= 0) {
          continue;
        }

        if (Math.random() * peakProbability <= probability) {
          selected = candidate;
          break;
        }
      }

      radius = selected ?? bestCandidate;
    }

    radius = Math.min(radius, maxRadius);

    const { theta, phi } = this.sampleAngularDistribution(l, m);
    const sinTheta = Math.sin(theta);

    return [
      radius * sinTheta * Math.cos(phi),
      radius * sinTheta * Math.sin(phi),
      radius * Math.cos(theta),
    ];
  }

  /**
   * Fill orbital subshell according to Hund's rules
   */
  private fillOrbitalSubshell(n: number, l: number, electronCount: number, Z: number): ElectronState[] {
    const electrons: ElectronState[] = [];

    // First pass: fill each orbital with one electron (parallel spins)
    for (let m = -l; m <= l && electrons.length < electronCount; m++) {
      const position = this.sampleFromProbabilityDistribution(n, l, m, Z);
      const energy = this.calculateOrbitalEnergy(n, l, Z);

      electrons.push({
        quantum: { n, l, m, s: 0.5 },
        position,
        velocity: [0, 0, 0],
        phase: Math.random() * 2 * Math.PI,
        probability: this.calculateProbabilityDensity(n, l, m, position[0], position[1], position[2], Z),
        energy
      });
    }

    // Second pass: pair electrons (antiparallel spins)
    for (let m = -l; m <= l && electrons.length < electronCount; m++) {
      const position = this.sampleFromProbabilityDistribution(n, l, m, Z);
      const energy = this.calculateOrbitalEnergy(n, l, Z);

      electrons.push({
        quantum: { n, l, m, s: -0.5 },
        position,
        velocity: [0, 0, 0],
        phase: Math.random() * 2 * Math.PI,
        probability: this.calculateProbabilityDensity(n, l, m, position[0], position[1], position[2], Z),
        energy
      });
    }

    return electrons;
  }

  /**
   * Get orbital filling order according to Aufbau principle (enhanced for all elements)
   */
  private getOrbitalFillingOrder(): Array<{ n: number; l: number }> {
    return [
      { n: 1, l: 0 }, // 1s (2 electrons max)
      { n: 2, l: 0 }, // 2s (2 electrons max)
      { n: 2, l: 1 }, // 2p (6 electrons max)
      { n: 3, l: 0 }, // 3s (2 electrons max)
      { n: 3, l: 1 }, // 3p (6 electrons max)
      { n: 4, l: 0 }, // 4s (2 electrons max)
      { n: 3, l: 2 }, // 3d (10 electrons max)
      { n: 4, l: 1 }, // 4p (6 electrons max)
      { n: 5, l: 0 }, // 5s (2 electrons max)
      { n: 4, l: 2 }, // 4d (10 electrons max)
      { n: 5, l: 1 }, // 5p (6 electrons max)
      { n: 6, l: 0 }, // 6s (2 electrons max)
      { n: 4, l: 3 }, // 4f (14 electrons max)
      { n: 5, l: 2 }, // 5d (10 electrons max)
      { n: 6, l: 1 }, // 6p (6 electrons max)
      { n: 7, l: 0 }, // 7s (2 electrons max)
      { n: 5, l: 3 }, // 5f (14 electrons max)
      { n: 6, l: 2 }, // 6d (10 electrons max)
      { n: 7, l: 1 }, // 7p (6 electrons max)
      { n: 8, l: 0 }, // 8s (2 electrons max)
      { n: 6, l: 3 }, // 6f (14 electrons max)
      { n: 7, l: 2 }, // 7d (10 electrons max)
      { n: 8, l: 1 }, // 8p (6 electrons max)
    ];
  }


  /**
   * Simulate wavefunction collapse upon measurement
   */
  public collapseWaveFunction(
    particles: ElectronState[],
    measurementPoint: [number, number, number],
    radius: number
  ): ElectronState[] {
    return particles.map(particle => {
      const [px, py, pz] = particle.position;
      const [mx, my, mz] = measurementPoint;
      const distance = Math.sqrt((px - mx) ** 2 + (py - my) ** 2 + (pz - mz) ** 2);

      if (distance < radius) {
        // Collapse to measurement point with uncertainty
        const uncertainty = radius * 0.1;
        return {
          ...particle,
          position: [
            mx + (Math.random() - 0.5) * uncertainty,
            my + (Math.random() - 0.5) * uncertainty,
            mz + (Math.random() - 0.5) * uncertainty
          ],
          velocity: [
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
          ],
          probability: 1.0 // Certainty at measurement point
        };
      }

      return particle;
    });
  }
}
