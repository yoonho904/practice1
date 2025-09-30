import { FUNDAMENTAL_CONSTANTS, ATOMIC_CONSTANTS, UnitConverter, validateQuantumNumbers } from '../constants/PhysicalConstants';

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
    const theta = Math.acos(z / (r + 1e-10));
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
    return waveValue * waveValue;
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
      if (remainingElectrons <= 0) break;

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
    const { n, l, electrons } = configuration;

    // Thermal energy effects
    const thermalVelocity = Math.sqrt(3 * FUNDAMENTAL_CONSTANTS.BOLTZMANN_CONSTANT * temperature / FUNDAMENTAL_CONSTANTS.ELECTRON_MASS);

    // Generate initial particle positions using proper quantum sampling
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
          return dist < 0.3; // Minimum separation of 0.3 Angstroms
        });

        if (!tooClose || attempts >= maxAttempts) break;
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
    const a0 = FUNDAMENTAL_CONSTANTS.BOHR_RADIUS * 1e10; // Convert to Angstroms
    const rho = 2 * Z * r / (n * a0);

    // Associated Laguerre polynomials for different n,l combinations
    let radialPart = 0;

    switch (n) {
      case 1:
        if (l === 0) {
          radialPart = 2 * Math.pow(Z / a0, 1.5) * Math.exp(-rho / 2);
        }
        break;

      case 2:
        if (l === 0) {
          radialPart = Math.pow(Z / (2 * a0), 1.5) * (2 - rho) * Math.exp(-rho / 2) / Math.sqrt(2);
        } else if (l === 1) {
          radialPart = Math.pow(Z / (2 * a0), 1.5) * rho * Math.exp(-rho / 2) / (2 * Math.sqrt(6));
        }
        break;

      case 3:
        if (l === 0) {
          radialPart = Math.pow(Z / (3 * a0), 1.5) * (27 - 18 * rho + 2 * rho * rho) * Math.exp(-rho / 2) / (81 * Math.sqrt(3));
        } else if (l === 1) {
          radialPart = Math.pow(Z / (3 * a0), 1.5) * (6 - rho) * rho * Math.exp(-rho / 2) / (81 * Math.sqrt(6));
        } else if (l === 2) {
          radialPart = Math.pow(Z / (3 * a0), 1.5) * rho * rho * Math.exp(-rho / 2) / (81 * Math.sqrt(30));
        }
        break;

      default:
        // Simplified exponential for higher n
        radialPart = Math.exp(-rho / 2) / Math.pow(n, 1.5);
    }

    return radialPart;
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
    const relaxedParticles = particles.map(p => ({ ...p })); // Deep copy
    const iterations = 20;
    const repulsionStrength = 0.05;
    const dampening = 0.7;

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

        if (currentProb < 0.01) { // If moved to low probability region
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
    const bohrRadius = FUNDAMENTAL_CONSTANTS.BOHR_RADIUS * 1e10; // Convert to Angstroms
    const a0 = bohrRadius;

    // Use proper orbital-dependent radial sampling
    let r: number;

    if (n === 1 && l === 0) {
      // 1s orbital - exponential distribution
      r = -a0 * Math.log(1 - Math.random()) * n * n / Z;
    } else if (n === 2 && l === 0) {
      // 2s orbital - more complex with radial node
      const u = Math.random();
      r = a0 * n * n / Z * (1.5 + Math.sqrt(u) * 2);
    } else if (l === 1) {
      // p orbitals - peak away from origin
      const u = Math.random();
      r = a0 * n * n / Z * Math.pow(u, 0.3) * (1.5 + Math.random());
    } else {
      // General case
      const u = Math.random();
      r = a0 * n * n / Z * Math.pow(u, 1.0 / (n + l));
    }

    // Limit maximum radius
    const maxR = n * n * a0 / Z * 6;
    r = Math.min(r, maxR);

    // Generate angular coordinates based on orbital type
    let theta: number, phi: number;

    if (l === 0) {
      // s orbitals - spherically symmetric
      theta = Math.acos(2 * Math.random() - 1);
      phi = 2 * Math.PI * Math.random();
    } else if (l === 1) {
      // p orbitals - directional preference
      const cosTheta = 2 * Math.random() - 1;
      theta = Math.acos(cosTheta);
      phi = 2 * Math.PI * Math.random();

      // Add slight directional bias for p orbitals
      const direction = Math.random();
      if (direction < 0.33) {
        // px preference
        phi = Math.random() < 0.6 ? 0 : phi;
      } else if (direction < 0.66) {
        // py preference
        phi = Math.random() < 0.6 ? Math.PI/2 : phi;
      }
      // pz naturally favored by cosTheta distribution
    } else {
      // d orbitals and higher
      theta = Math.acos(2 * Math.random() - 1);
      phi = 2 * Math.PI * Math.random();
    }

    // Convert to Cartesian coordinates
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    return [x, y, z];
  }

  /**
   * Fill orbital subshell according to Hund's rules
   */
  private fillOrbitalSubshell(n: number, l: number, electronCount: number, Z: number): ElectronState[] {
    const electrons: ElectronState[] = [];
    const orbitals = 2 * l + 1; // Number of magnetic quantum states

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