import { describe, it, expect, beforeEach } from 'vitest';
import { QuantumMechanicsEngine } from '../physics/QuantumMechanicsEngine';

describe('QuantumMechanicsEngine', () => {
  let engine: QuantumMechanicsEngine;

  beforeEach(() => {
    engine = QuantumMechanicsEngine.getInstance();
  });

  describe('Wave Function Tests', () => {
    it('should return correct 1s wave function values', () => {
      // Test 1s wave function at origin (should be maximum)
      const waveAtOrigin = engine.calculateWaveFunction(1, 0, 0, 0, 0, 0, 1, 0);
      expect(waveAtOrigin).toBeGreaterThan(0);

      // Test 1s wave function far from origin (should be near zero)
      const waveAtDistance = engine.calculateWaveFunction(1, 0, 0, 10, 10, 10, 1, 0);
      expect(Math.abs(waveAtDistance)).toBeLessThan(0.1);
    });

    it('should return spherically symmetric values for 1s orbital', () => {
      const r = 1.0;
      const positions = [
        [r, 0, 0],
        [0, r, 0],
        [0, 0, r],
        [r/Math.sqrt(3), r/Math.sqrt(3), r/Math.sqrt(3)]
      ];

      const values = positions.map(([x, y, z]) =>
        Math.abs(engine.calculateWaveFunction(1, 0, 0, x, y, z, 1, 0))
      );

      // All values should be approximately equal for 1s orbital (spherical symmetry)
      const tolerance = 0.01;
      for (let i = 1; i < values.length; i++) {
        expect(Math.abs(values[i] - values[0])).toBeLessThan(tolerance);
      }
    });

    it('should have correct angular dependence for 2p orbital', () => {
      const r = 2.0;

      // 2p_z orbital should be maximum along z-axis
      const waveAtZAxis = Math.abs(engine.calculateWaveFunction(2, 1, 0, 0, 0, r, 1, 0));

      // 2p_z orbital should be zero in xy-plane
      const waveInXYPlane = Math.abs(engine.calculateWaveFunction(2, 1, 0, r, 0, 0, 1, 0));

      expect(waveAtZAxis).toBeGreaterThan(waveInXYPlane);
    });
  });

  describe('Probability Density Tests', () => {
    it('should have correct 1s probability density distribution', () => {
      // Maximum at origin
      const densityAtOrigin = engine.calculateProbabilityDensity(1, 0, 0, 0, 0, 0, 1);

      // Decreasing with distance
      const densityAt1Bohr = engine.calculateProbabilityDensity(1, 0, 0, 1, 0, 0, 1);
      const densityAt2Bohr = engine.calculateProbabilityDensity(1, 0, 0, 2, 0, 0, 1);

      expect(densityAtOrigin).toBeGreaterThan(densityAt1Bohr);
      expect(densityAt1Bohr).toBeGreaterThan(densityAt2Bohr);
    });

    it('should be spherically symmetric for s orbitals', () => {
      const r = 1.5;
      const positions = [
        [r, 0, 0],
        [0, r, 0],
        [0, 0, r],
        [-r, 0, 0],
        [r/Math.sqrt(2), r/Math.sqrt(2), 0]
      ];

      const densities = positions.map(([x, y, z]) =>
        engine.calculateProbabilityDensity(1, 0, 0, x, y, z, 1)
      );

      const tolerance = 0.01;
      for (let i = 1; i < densities.length; i++) {
        expect(Math.abs(densities[i] - densities[0])).toBeLessThan(tolerance);
      }
    });

    it('should have nodal plane for 2p orbitals', () => {
      // 2p_z should have nodal plane at z=0
      const densityInNodalPlane = engine.calculateProbabilityDensity(2, 1, 0, 1, 1, 0, 1);
      expect(densityInNodalPlane).toBeLessThan(0.01);

      // Should be non-zero away from nodal plane
      const densityOffNodalPlane = engine.calculateProbabilityDensity(2, 1, 0, 0, 0, 2, 1);
      expect(densityOffNodalPlane).toBeGreaterThan(0.01);
    });
  });

  describe('Electron Configuration Tests', () => {
    it('should generate correct configuration for Hydrogen (Z=1)', () => {
      const config = engine.generateElectronConfiguration(1);

      expect(config.configurations).toHaveLength(1);
      expect(config.configurations[0].n).toBe(1);
      expect(config.configurations[0].l).toBe(0);
      expect(config.configurations[0].electrons).toHaveLength(1);
    });

    it('should generate correct configuration for Helium (Z=2)', () => {
      const config = engine.generateElectronConfiguration(2);

      expect(config.configurations).toHaveLength(1);
      expect(config.configurations[0].n).toBe(1);
      expect(config.configurations[0].l).toBe(0);
      expect(config.configurations[0].electrons).toHaveLength(2);
    });

    it('should generate correct configuration for Carbon (Z=6)', () => {
      const config = engine.generateElectronConfiguration(6);

      // Should have 1s^2 2s^2 2p^2
      const configurations = config.configurations;
      expect(configurations).toHaveLength(3);

      // 1s^2
      expect(configurations[0].n).toBe(1);
      expect(configurations[0].l).toBe(0);
      expect(configurations[0].electrons).toHaveLength(2);

      // 2s^2
      expect(configurations[1].n).toBe(2);
      expect(configurations[1].l).toBe(0);
      expect(configurations[1].electrons).toHaveLength(2);

      // 2p^2
      expect(configurations[2].n).toBe(2);
      expect(configurations[2].l).toBe(1);
      expect(configurations[2].electrons).toHaveLength(2);
    });
  });

  describe('Wave Particle Generation Tests', () => {
    it('should generate particles within reasonable bounds for 1s orbital', () => {
      const config = engine.generateElectronConfiguration(1);
      const particles = engine.generateWaveParticles(config.configurations[0], 100, 1, 298);

      expect(particles).toHaveLength(100);

      // Check that particles are within reasonable distance from origin
      particles.forEach(particle => {
        const [x, y, z] = particle.position;
        const r = Math.sqrt(x*x + y*y + z*z);
        expect(r).toBeLessThan(20); // Should be within ~20 Bohr radii
        expect(r).toBeGreaterThan(0); // Should not all be at origin
      });
    });

    it('should have proper probability distribution for generated particles', () => {
      const config = engine.generateElectronConfiguration(1);
      const particles = engine.generateWaveParticles(config.configurations[0], 1000, 1, 298);

      // Count particles in different radial shells
      const shellCounts = [0, 0, 0, 0]; // 0-1, 1-2, 2-3, 3+ Bohr radii

      particles.forEach(particle => {
        const [x, y, z] = particle.position;
        const r = Math.sqrt(x*x + y*y + z*z);

        if (r < 1) shellCounts[0]++;
        else if (r < 2) shellCounts[1]++;
        else if (r < 3) shellCounts[2]++;
        else shellCounts[3]++;
      });

      // For 1s orbital, most particles should be in inner shells
      expect(shellCounts[0]).toBeGreaterThan(shellCounts[2]);
      expect(shellCounts[1]).toBeGreaterThan(shellCounts[3]);
    });
  });
});