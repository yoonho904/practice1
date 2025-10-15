import type { ElectronState, OrbitalConfiguration, ElementQuantumState } from './QuantumMechanicsEngine';

export interface ElementProperties {
  atomicNumber: number;
  symbol: string;
  name: string;
  period: number;
  group: number;
  block: string;
  atomicMass: number;
  electronConfiguration: string;
  nobleGasConfiguration: string;
  ionizationEnergy: number; // eV
  electronAffinity: number; // eV
  electronegativity: number;
}

export interface ExcitedStateConfiguration {
  groundState: ElementQuantumState;
  excitedStates: ElementQuantumState[];
  transitionEnergies: number[];
}

export class ElectronConfigurator {
  private static periodicData: Map<number, ElementProperties> = new Map();

  static {
    // Initialize periodic table data for all elements
    this.initializePeriodicTable();
  }

  /**
   * Get standard electron configuration for any element
   */
  public static getElementConfiguration(atomicNumber: number): ElementProperties {
    const element = this.periodicData.get(atomicNumber);
    if (!element) {
      throw new Error(`Element with atomic number ${atomicNumber} not found`);
    }
    return element;
  }

  /**
   * Generate electron configuration string (e.g., "1s² 2s² 2p⁶")
   */
  public static generateConfigurationString(configurations: OrbitalConfiguration[]): string {
    return configurations
      .map(config => {
        const orbital = this.getOrbitalLabel(config.n, config.l);
        const electronCount = config.electrons.length;
        return `${orbital}${this.toSuperscript(electronCount)}`;
      })
      .join(' ');
  }

  /**
   * Generate noble gas core configuration
   */
  public static generateNobleGasConfiguration(atomicNumber: number): string {
    const nobleGases = [2, 10, 18, 36, 54, 86, 118]; // He, Ne, Ar, Kr, Xe, Rn, Og

    let coreGas = 0;
    for (const gas of nobleGases) {
      if (gas < atomicNumber) {
        coreGas = gas;
      } else {
        break;
      }
    }

    if (coreGas === 0) {
      return this.generateFullConfiguration(atomicNumber);
    }

    const coreSymbol = this.getNobleGasSymbol(coreGas);
    const remainingElectrons = atomicNumber - coreGas;

    if (remainingElectrons === 0) {
      return `[${coreSymbol}]`;
    }

    const valenceConfig = this.generateValenceConfiguration(remainingElectrons);
    return `[${coreSymbol}] ${valenceConfig}`;
  }

  /**
   * Get all possible excited states for an element
   */
  public static getExcitedStates(
    atomicNumber: number,
    maxExcitationLevel: number = 3
  ): ExcitedStateConfiguration {
    // This would generate excited state configurations
    // For now, we'll create a simplified version
    const groundState = this.generateGroundState(atomicNumber);
    const excitedStates: ElementQuantumState[] = [];
    const transitionEnergies: number[] = [];

    // Generate simple excited states (electron promotion)
    for (let level = 1; level <= maxExcitationLevel; level++) {
      const excitedState = this.generateExcitedState(groundState, level);
      if (excitedState) {
        excitedStates.push(excitedState);
        transitionEnergies.push(excitedState.totalEnergy - groundState.totalEnergy);
      }
    }

    return {
      groundState,
      excitedStates,
      transitionEnergies
    };
  }

  /**
   * Calculate effective nuclear charge for screening effects
   */
  public static calculateEffectiveNuclearCharge(
    atomicNumber: number,
    n: number,
    l: number
  ): number {
    // Slater's rules implementation
    let screening = 0;

    // Get electron configuration up to (n,l)
    const config = this.generateGroundState(atomicNumber);

    for (const orbital of config.configurations) {
      if (orbital.n > n || (orbital.n === n && orbital.l > l)) {
        continue; // Don't count electrons in higher orbitals
      }

      const electronCount = orbital.electrons.length;

      if (orbital.n === n && orbital.l === l) {
        // Same subshell: each electron shields 0.35 (except the electron itself)
        screening += 0.35 * (electronCount - 1);
      } else if (orbital.n === n - 1) {
        // n-1 shell: each electron shields 0.85
        screening += 0.85 * electronCount;
      } else if (orbital.n <= n - 2) {
        // Lower shells: each electron shields 1.00
        screening += 1.00 * electronCount;
      }
    }

    return Math.max(1, atomicNumber - screening);
  }

  /**
   * Get orbital energy levels including electron-electron interactions
   */
  public static getOrbitalEnergyLevels(atomicNumber: number): Map<string, number> {
    const energies = new Map<string, number>();
    const config = this.generateGroundState(atomicNumber);

    for (const orbital of config.configurations) {
      const key = `${orbital.n}${this.getOrbitalLetter(orbital.l)}`;
      energies.set(key, orbital.energyLevel);
    }

    return energies;
  }

  /**
   * Generate electron configuration for ions
   */
  public static getIonConfiguration(
    atomicNumber: number,
    charge: number
  ): ElementQuantumState {
    const effectiveElectrons = atomicNumber - charge;
    if (effectiveElectrons < 0) {
      throw new Error('Invalid charge: results in negative electron count');
    }

    // For positive ions, remove electrons from highest energy orbitals first
    // For negative ions, add electrons following Aufbau principle
    return this.generateGroundState(effectiveElectrons);
  }

  /**
   * Calculate ionization energies for successive electron removal
   */
  public static calculateIonizationEnergies(
    atomicNumber: number,
    maxIonizations: number = 5
  ): number[] {
    const ionizationEnergies: number[] = [];

    for (let charge = 1; charge <= maxIonizations && charge < atomicNumber; charge++) {
      const neutralState = this.generateGroundState(atomicNumber - charge + 1);
      const ionizedState = this.generateGroundState(atomicNumber - charge);

      const ionizationEnergy = ionizedState.totalEnergy - neutralState.totalEnergy;
      ionizationEnergies.push(Math.abs(ionizationEnergy) / 1.602176634e-19); // Convert to eV
    }

    return ionizationEnergies;
  }

  private static generateGroundState(effectiveElectrons: number): ElementQuantumState {
    // Simplified ground state generation
    const configurations: OrbitalConfiguration[] = [];
    let remainingElectrons = effectiveElectrons;
    let totalEnergy = 0;

    const orbitalOrder = [
      { n: 1, l: 0 }, { n: 2, l: 0 }, { n: 2, l: 1 },
      { n: 3, l: 0 }, { n: 3, l: 1 }, { n: 4, l: 0 },
      { n: 3, l: 2 }, { n: 4, l: 1 }, { n: 5, l: 0 },
      { n: 4, l: 2 }, { n: 5, l: 1 }, { n: 6, l: 0 },
      { n: 4, l: 3 }, { n: 5, l: 2 }, { n: 6, l: 1 },
      { n: 7, l: 0 }, { n: 5, l: 3 }, { n: 6, l: 2 },
      { n: 7, l: 1 }
    ];

    for (const { n, l } of orbitalOrder) {
      if (remainingElectrons <= 0) {break;}

      const maxElectrons = 2 * (2 * l + 1);
      const electronsInOrbital = Math.min(remainingElectrons, maxElectrons);
      const electrons: ElectronState[] = [];

      // Create electron states for this orbital
      for (let i = 0; i < electronsInOrbital; i++) {
        const m = Math.floor(i / 2) - l; // Distribute among magnetic quantum numbers
        const s = i % 2 === 0 ? 0.5 : -0.5;

        electrons.push({
          quantum: { n, l, m, s },
          position: [0, 0, 0], // Will be calculated by quantum engine
          velocity: [0, 0, 0],
          phase: 0,
          probability: 0,
          energy: -13.6 / (n * n) * 1.602176634e-19 // Simplified energy in Joules
        });
      }

      const energy = -13.6 / (n * n) * 1.602176634e-19;
      configurations.push({
        n,
        l,
        electrons,
        maxCapacity: maxElectrons,
        energyLevel: energy
      });

      totalEnergy += energy * electronsInOrbital;
      remainingElectrons -= electronsInOrbital;
    }

    return {
      atomicNumber: effectiveElectrons,
      massNumber: effectiveElectrons * 2,
      ionCharge: 0,
      configurations,
      totalEnergy,
      groundState: true
    };
  }

  private static generateExcitedState(
    groundState: ElementQuantumState,
    excitationLevel: number
  ): ElementQuantumState | null {
    // Simplified excited state generation
    // In reality, this would involve complex calculations of excited state configurations
    const excitedState = JSON.parse(JSON.stringify(groundState));
    excitedState.groundState = false;
    excitedState.totalEnergy += excitationLevel * 2 * 1.602176634e-19; // Add excitation energy

    return excitedState;
  }

  private static generateFullConfiguration(atomicNumber: number): string {
    const config = this.generateGroundState(atomicNumber);
    return this.generateConfigurationString(config.configurations);
  }

  private static generateValenceConfiguration(electrons: number): string {
    // Simplified valence configuration generation
    const config = this.generateGroundState(electrons);
    return this.generateConfigurationString(config.configurations);
  }

  private static getOrbitalLabel(n: number, l: number): string {
    const letters = ['s', 'p', 'd', 'f', 'g', 'h', 'i'];
    return `${n}${letters[l] || `l${l}`}`;
  }

  private static getOrbitalLetter(l: number): string {
    const letters = ['s', 'p', 'd', 'f', 'g', 'h', 'i'];
    return letters[l] || `l${l}`;
  }

  private static getNobleGasSymbol(atomicNumber: number): string {
    const symbols: { [key: number]: string } = {
      2: 'He', 10: 'Ne', 18: 'Ar', 36: 'Kr', 54: 'Xe', 86: 'Rn', 118: 'Og'
    };
    return symbols[atomicNumber] || '';
  }

  private static toSuperscript(num: number): string {
    const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
    return num.toString().split('').map(digit => superscripts[parseInt(digit)]).join('');
  }

  private static initializePeriodicTable(): void {
    // Initialize with first 118 elements
    // This is a simplified version - in practice, you'd load this from a database
    const elements: Omit<ElementProperties, 'electronConfiguration' | 'nobleGasConfiguration'>[] = [
      { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', period: 1, group: 1, block: 's', atomicMass: 1.008, ionizationEnergy: 13.598, electronAffinity: 0.754, electronegativity: 2.20 },
      { atomicNumber: 2, symbol: 'He', name: 'Helium', period: 1, group: 18, block: 's', atomicMass: 4.003, ionizationEnergy: 24.587, electronAffinity: 0, electronegativity: 0 },
      { atomicNumber: 3, symbol: 'Li', name: 'Lithium', period: 2, group: 1, block: 's', atomicMass: 6.941, ionizationEnergy: 5.392, electronAffinity: 0.618, electronegativity: 0.98 },
      { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', period: 2, group: 2, block: 's', atomicMass: 9.012, ionizationEnergy: 9.323, electronAffinity: 0, electronegativity: 1.57 },
      { atomicNumber: 5, symbol: 'B', name: 'Boron', period: 2, group: 13, block: 'p', atomicMass: 10.811, ionizationEnergy: 8.298, electronAffinity: 0.277, electronegativity: 2.04 },
      { atomicNumber: 6, symbol: 'C', name: 'Carbon', period: 2, group: 14, block: 'p', atomicMass: 12.011, ionizationEnergy: 11.260, electronAffinity: 1.263, electronegativity: 2.55 },
      { atomicNumber: 7, symbol: 'N', name: 'Nitrogen', period: 2, group: 15, block: 'p', atomicMass: 14.007, ionizationEnergy: 14.534, electronAffinity: -0.07, electronegativity: 3.04 },
      { atomicNumber: 8, symbol: 'O', name: 'Oxygen', period: 2, group: 16, block: 'p', atomicMass: 15.999, ionizationEnergy: 13.618, electronAffinity: 1.461, electronegativity: 3.44 },
      { atomicNumber: 9, symbol: 'F', name: 'Fluorine', period: 2, group: 17, block: 'p', atomicMass: 18.998, ionizationEnergy: 17.423, electronAffinity: 3.399, electronegativity: 3.98 },
      { atomicNumber: 10, symbol: 'Ne', name: 'Neon', period: 2, group: 18, block: 'p', atomicMass: 20.180, ionizationEnergy: 21.565, electronAffinity: 0, electronegativity: 0 },
      // Add more elements as needed...
    ];

    for (const element of elements) {
      const fullElement: ElementProperties = {
        ...element,
        electronConfiguration: this.generateFullConfiguration(element.atomicNumber),
        nobleGasConfiguration: this.generateNobleGasConfiguration(element.atomicNumber)
      };

      this.periodicData.set(element.atomicNumber, fullElement);
    }

    // Auto-generate for elements not explicitly defined
    for (let z = 11; z <= 118; z++) {
      if (!this.periodicData.has(z)) {
        this.periodicData.set(z, this.generateElementData(z));
      }
    }
  }

  private static generateElementData(atomicNumber: number): ElementProperties {
    // Auto-generate element data for elements not explicitly defined
    const period = this.calculatePeriod(atomicNumber);
    const group = this.calculateGroup(atomicNumber);
    const block = this.calculateBlock(atomicNumber);

    return {
      atomicNumber,
      symbol: `E${atomicNumber}`, // Placeholder symbol
      name: `Element ${atomicNumber}`,
      period,
      group,
      block,
      atomicMass: atomicNumber * 2, // Rough approximation
      electronConfiguration: this.generateFullConfiguration(atomicNumber),
      nobleGasConfiguration: this.generateNobleGasConfiguration(atomicNumber),
      ionizationEnergy: 10, // Placeholder
      electronAffinity: 0,
      electronegativity: 2
    };
  }

  private static calculatePeriod(atomicNumber: number): number {
    if (atomicNumber <= 2) {return 1;}
    if (atomicNumber <= 10) {return 2;}
    if (atomicNumber <= 18) {return 3;}
    if (atomicNumber <= 36) {return 4;}
    if (atomicNumber <= 54) {return 5;}
    if (atomicNumber <= 86) {return 6;}
    return 7;
  }

  private static calculateGroup(atomicNumber: number): number {
    // Simplified group calculation
    const config = this.generateGroundState(atomicNumber);
    const valenceElectrons = this.countValenceElectrons(config);

    if (valenceElectrons <= 2) {return valenceElectrons;}
    if (valenceElectrons <= 8) {return valenceElectrons + 10;}
    return 18;
  }

  private static calculateBlock(atomicNumber: number): string {
    const config = this.generateGroundState(atomicNumber);
    const lastOrbital = config.configurations[config.configurations.length - 1];

    if (lastOrbital.l === 0) {return 's';}
    if (lastOrbital.l === 1) {return 'p';}
    if (lastOrbital.l === 2) {return 'd';}
    if (lastOrbital.l === 3) {return 'f';}
    return 'g';
  }

  private static countValenceElectrons(state: ElementQuantumState): number {
    // Count electrons in the outermost shell
    const maxN = Math.max(...state.configurations.map(c => c.n));
    return state.configurations
      .filter(c => c.n === maxN)
      .reduce((sum, c) => sum + c.electrons.length, 0);
  }
}
