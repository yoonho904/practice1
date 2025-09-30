import { describe, it, expect } from 'vitest';
import { QuantumMechanicsEngine } from '../../physics/QuantumMechanicsEngine';
import { ElectronConfigurator } from '../../physics/ElectronConfigurator';
import { WaveFunctionFactory } from '../../physics/WaveFunctions';

describe('QuantumMechanicsEngine', () => {
  it('should generate electron configuration for hydrogen', () => {
    const engine = QuantumMechanicsEngine.getInstance();
    const hydrogenState = engine.generateElectronConfiguration(1, 0);

    expect(hydrogenState.atomicNumber).toBe(1);
    expect(hydrogenState.configurations).toHaveLength(1);
    expect(hydrogenState.configurations[0].n).toBe(1);
    expect(hydrogenState.configurations[0].l).toBe(0);
    expect(hydrogenState.configurations[0].electrons).toHaveLength(1);
  });

  it('should generate electron configuration for carbon', () => {
    const engine = QuantumMechanicsEngine.getInstance();
    const carbonState = engine.generateElectronConfiguration(6, 0);

    expect(carbonState.atomicNumber).toBe(6);
    expect(carbonState.configurations.length).toBeGreaterThan(1);

    // Check total electron count
    const totalElectrons = carbonState.configurations.reduce(
      (sum, config) => sum + config.electrons.length,
      0
    );
    expect(totalElectrons).toBe(6);
  });

  it('should calculate wave function values', () => {
    const engine = QuantumMechanicsEngine.getInstance();

    const waveValue = engine.calculateWaveFunction(1, 0, 0, 1, 0, 0, 1, 0);
    expect(typeof waveValue).toBe('number');
    expect(waveValue).not.toBeNaN();
  });

  it('should calculate probability density', () => {
    const engine = QuantumMechanicsEngine.getInstance();

    const probability = engine.calculateProbabilityDensity(1, 0, 0, 0, 0, 0, 1);
    expect(typeof probability).toBe('number');
    expect(probability).toBeGreaterThanOrEqual(0);
    expect(probability).not.toBeNaN();
  });

  it('should generate wave particles', () => {
    const engine = QuantumMechanicsEngine.getInstance();
    const carbonState = engine.generateElectronConfiguration(6, 0);

    if (carbonState.configurations.length > 0) {
      const particles = engine.generateWaveParticles(
        carbonState.configurations[0],
        100,
        6,
        298
      );

      expect(particles).toHaveLength(100);
      expect(particles[0]).toHaveProperty('position');
      expect(particles[0]).toHaveProperty('velocity');
      expect(particles[0]).toHaveProperty('quantum');
      expect(particles[0]).toHaveProperty('probability');
    }
  });

  it('should collapse wavefunction upon measurement', () => {
    const engine = QuantumMechanicsEngine.getInstance();
    const hydrogenState = engine.generateElectronConfiguration(1, 0);

    const particles = engine.generateWaveParticles(
      hydrogenState.configurations[0],
      10,
      1,
      298
    );

    const measurementPoint: [number, number, number] = [0, 0, 0];
    const collapsedParticles = engine.collapseWaveFunction(
      particles,
      measurementPoint,
      5.0
    );

    expect(collapsedParticles).toHaveLength(particles.length);

    // Some particles should be affected by measurement
    let affectedCount = 0;
    for (let i = 0; i < particles.length; i++) {
      const original = particles[i];
      const collapsed = collapsedParticles[i];

      const originalDistance = Math.sqrt(
        original.position[0]**2 + original.position[1]**2 + original.position[2]**2
      );
      const collapsedDistance = Math.sqrt(
        collapsed.position[0]**2 + collapsed.position[1]**2 + collapsed.position[2]**2
      );

      if (Math.abs(originalDistance - collapsedDistance) > 0.01) {
        affectedCount++;
      }
    }

    expect(affectedCount).toBeGreaterThan(0);
  });
});

describe('ElectronConfigurator', () => {
  it('should get element configuration for hydrogen', () => {
    const hydrogen = ElectronConfigurator.getElementConfiguration(1);

    expect(hydrogen.atomicNumber).toBe(1);
    expect(hydrogen.symbol).toBe('H');
    expect(hydrogen.name).toBe('Hydrogen');
  });

  it('should generate configuration string', () => {
    const hydrogenState = QuantumMechanicsEngine.getInstance().generateElectronConfiguration(1, 0);
    const configString = ElectronConfigurator.generateConfigurationString(hydrogenState.configurations);

    expect(typeof configString).toBe('string');
    expect(configString.length).toBeGreaterThan(0);
  });

  it('should generate noble gas configuration', () => {
    const config = ElectronConfigurator.generateNobleGasConfiguration(6);

    expect(typeof config).toBe('string');
    expect(config.length).toBeGreaterThan(0);
  });

  it('should calculate effective nuclear charge', () => {
    const zeff = ElectronConfigurator.calculateEffectiveNuclearCharge(6, 2, 0);

    expect(typeof zeff).toBe('number');
    expect(zeff).toBeGreaterThan(0);
    expect(zeff).toBeLessThanOrEqual(6);
  });

  it('should calculate ionization energies', () => {
    const ionizationEnergies = ElectronConfigurator.calculateIonizationEnergies(3, 2);

    expect(Array.isArray(ionizationEnergies)).toBe(true);
    expect(ionizationEnergies.length).toBe(2);
    expect(ionizationEnergies[0]).toBeGreaterThan(0);
    expect(ionizationEnergies[1]).toBeGreaterThan(ionizationEnergies[0]); // Second ionization should be higher
  });
});

describe('WaveFunctionFactory', () => {
  it('should create hydrogen wave function', () => {
    const waveFunction = WaveFunctionFactory.create(1, 0, 0, 1);

    expect(waveFunction).toBeDefined();
    expect(typeof waveFunction.getValue).toBe('function');
    expect(typeof waveFunction.getProbabilityDensity).toBe('function');
    expect(typeof waveFunction.getCharacteristicRadius).toBe('function');
  });

  it('should calculate wave function values correctly', () => {
    const waveFunction = WaveFunctionFactory.create(1, 0, 0, 1);

    const value = waveFunction.getValue(0, 0, 0, 0);
    expect(typeof value).toBe('number');
    expect(value).not.toBeNaN();

    const probability = waveFunction.getProbabilityDensity(0, 0, 0);
    expect(typeof probability).toBe('number');
    expect(probability).toBeGreaterThanOrEqual(0);
    expect(probability).not.toBeNaN();
  });

  it('should get characteristic radius', () => {
    const waveFunction = WaveFunctionFactory.create(1, 0, 0, 1);
    const radius = waveFunction.getCharacteristicRadius();

    expect(typeof radius).toBe('number');
    expect(radius).toBeGreaterThan(0);
  });

  it('should create orbital boundaries', () => {
    const waveFunction = WaveFunctionFactory.create(2, 1, 0, 1);
    const boundary = waveFunction.getOrbitalBoundary(0.05);

    expect(Array.isArray(boundary)).toBe(true);
    // Should have some boundary points for 2p orbital
    if (boundary.length > 0) {
      expect(boundary[0]).toHaveLength(3); // [x, y, z]
    }
  });

  it('should create nodal surfaces', () => {
    const waveFunction = WaveFunctionFactory.create(2, 1, 0, 1);
    const nodals = waveFunction.getNodalSurfaces();

    expect(Array.isArray(nodals)).toBe(true);
    // 2p orbital should have nodal planes
  });

  it('should create hybrid orbitals', () => {
    const sp3Hybrid = WaveFunctionFactory.createHybridOrbital('sp3', 6);

    expect(sp3Hybrid).toBeDefined();
    expect(typeof sp3Hybrid.getValue).toBe('function');

    const value = sp3Hybrid.getValue(1, 1, 1, 0);
    expect(typeof value).toBe('number');
    expect(value).not.toBeNaN();
  });

  it('should list all orbital types', () => {
    const orbitals = WaveFunctionFactory.getAllOrbitalTypes(3);

    expect(Array.isArray(orbitals)).toBe(true);
    expect(orbitals.length).toBeGreaterThan(0);

    // Should include 1s, 2s, 2p, 3s, 3p
    const labels = orbitals.map(o => o.label);
    expect(labels).toContain('1s');
    expect(labels).toContain('2s');
    expect(labels).toContain('2p');
  });

  it('should list hybridization types', () => {
    const types = WaveFunctionFactory.getHybridizationTypes();

    expect(Array.isArray(types)).toBe(true);
    expect(types).toContain('sp');
    expect(types).toContain('sp2');
    expect(types).toContain('sp3');
  });
});