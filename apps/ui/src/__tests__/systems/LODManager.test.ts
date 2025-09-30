import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LODManager, LODLevel } from '../../systems/LODManager';
import { testDataGenerators } from '../../test-utils/TestingFramework';

describe('LODManager', () => {
  let lodManager: LODManager;

  beforeEach(() => {
    lodManager = new LODManager({
      targetFPS: 60,
      minFPS: 30,
      adaptiveEnabled: true,
      performanceSamples: 5,
      hysteresis: 100 // Short hysteresis for testing
    });
  });

  describe('initialization', () => {
    it('should initialize with default LOD level', () => {
      const currentLOD = lodManager.getCurrentLOD();
      expect(currentLOD).toBeGreaterThanOrEqual(LODLevel.LOD0);
      expect(currentLOD).toBeLessThanOrEqual(LODLevel.LOD3);
    });

    it('should provide valid configuration for current LOD', () => {
      const config = lodManager.getCurrentConfig();

      expect(config).toMatchObject({
        maxPoints: expect.any(Number),
        sampleMultiplier: expect.any(Number),
        geometryComplexity: {
          sphereSegments: expect.any(Number),
          cylinderSegments: expect.any(Number),
          torusSegments: expect.any(Number)
        },
        visualEffects: {
          animation: expect.any(Boolean),
          lighting: expect.stringMatching(/^(basic|enhanced)$/),
          shadows: expect.any(Boolean),
          antialiasing: expect.any(Boolean)
        },
        renderDistance: expect.any(Number),
        cullDistance: expect.any(Number)
      });
    });
  });

  describe('manual LOD control', () => {
    it('should allow manual LOD setting', () => {
      lodManager.setLOD(LODLevel.LOD2);
      expect(lodManager.getCurrentLOD()).toBe(LODLevel.LOD2);

      lodManager.setLOD(LODLevel.LOD0);
      expect(lodManager.getCurrentLOD()).toBe(LODLevel.LOD0);
    });

    it('should notify listeners when LOD changes', () => {
      const listener = vi.fn();
      const unsubscribe = lodManager.addLODListener(listener);

      lodManager.setLOD(LODLevel.LOD3);

      expect(listener).toHaveBeenCalledWith(
        LODLevel.LOD3,
        expect.objectContaining({
          maxPoints: expect.any(Number),
          sampleMultiplier: expect.any(Number)
        })
      );

      unsubscribe();
    });

    it('should not notify if LOD level doesn\'t change', () => {
      const listener = vi.fn();
      lodManager.addLODListener(listener);

      const currentLOD = lodManager.getCurrentLOD();
      lodManager.setLOD(currentLOD);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('adaptive LOD behavior', () => {
    it('should reduce quality when performance is poor', async () => {
      lodManager.setLOD(LODLevel.LOD0); // Start at highest quality

      // Simulate poor performance
      const poorPerformance = testDataGenerators.generatePerformanceMetrics();
      poorPerformance.fps = 20; // Below minimum
      poorPerformance.frameTime = 50; // High frame time

      // Feed multiple samples to trigger adaptation
      for (let i = 0; i < 6; i++) {
        lodManager.updatePerformanceMetrics(poorPerformance);
      }

      // Wait for hysteresis period
      await new Promise(resolve => setTimeout(resolve, 150));

      const newLOD = lodManager.getCurrentLOD();
      expect(newLOD).toBeGreaterThan(LODLevel.LOD0);
    });

    it('should increase quality when performance improves', async () => {
      lodManager.setLOD(LODLevel.LOD3); // Start at lowest quality

      // Simulate excellent performance
      const excellentPerformance = testDataGenerators.generatePerformanceMetrics();
      excellentPerformance.fps = 75; // Well above target
      excellentPerformance.frameTime = 13; // Low frame time

      // Feed multiple samples
      for (let i = 0; i < 6; i++) {
        lodManager.updatePerformanceMetrics(excellentPerformance);
      }

      // Wait for hysteresis period
      await new Promise(resolve => setTimeout(resolve, 150));

      const newLOD = lodManager.getCurrentLOD();
      expect(newLOD).toBeLessThan(LODLevel.LOD3);
    });

    it('should respect hysteresis to prevent rapid switching', async () => {
      const listener = vi.fn();
      lodManager.addLODListener(listener);

      lodManager.setLOD(LODLevel.LOD1);

      // Rapidly alternate between good and bad performance
      const goodPerf = testDataGenerators.generatePerformanceMetrics();
      goodPerf.fps = 75;

      const badPerf = testDataGenerators.generatePerformanceMetrics();
      badPerf.fps = 20;

      // Should not change immediately due to hysteresis
      for (let i = 0; i < 5; i++) {
        lodManager.updatePerformanceMetrics(badPerf);
      }

      // Should not have changed yet (within hysteresis period)
      expect(listener).not.toHaveBeenCalled();
    });

    it('should consider memory pressure in LOD decisions', async () => {
      lodManager.setLOD(LODLevel.LOD0);

      // Simulate high memory usage
      const highMemoryPerf = testDataGenerators.generatePerformanceMetrics();
      highMemoryPerf.fps = 50; // Decent FPS
      highMemoryPerf.memoryUsage = 600 * 1024 * 1024; // 600MB - above threshold

      for (let i = 0; i < 6; i++) {
        lodManager.updatePerformanceMetrics(highMemoryPerf);
      }

      await new Promise(resolve => setTimeout(resolve, 150));

      const newLOD = lodManager.getCurrentLOD();
      expect(newLOD).toBeGreaterThan(LODLevel.LOD0);
    });
  });

  describe('device capability detection', () => {
    it('should recommend appropriate LOD for different devices', () => {
      const recommendedLOD = lodManager.getRecommendedLODForDevice();

      expect(recommendedLOD).toBeGreaterThanOrEqual(LODLevel.LOD0);
      expect(recommendedLOD).toBeLessThanOrEqual(LODLevel.LOD3);
    });

    it('should provide different recommendations for different capabilities', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        configurable: true
      });

      const lowEndLOD = lodManager.getRecommendedLODForDevice();

      // Mock high-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 16,
        configurable: true
      });

      const highEndLOD = lodManager.getRecommendedLODForDevice();

      // High-end should get better or equal quality
      expect(highEndLOD).toBeLessThanOrEqual(lowEndLOD);
    });
  });

  describe('configuration scaling', () => {
    it('should scale sample counts appropriately across LOD levels', () => {
      const lod0Config = lodManager.getCurrentConfig();

      lodManager.setLOD(LODLevel.LOD3);
      const lod3Config = lodManager.getCurrentConfig();

      // LOD0 should have more points and higher quality than LOD3
      expect(lod0Config.maxPoints).toBeGreaterThan(lod3Config.maxPoints);
      expect(lod0Config.sampleMultiplier).toBeGreaterThan(lod3Config.sampleMultiplier);
      expect(lod0Config.geometryComplexity.sphereSegments)
        .toBeGreaterThan(lod3Config.geometryComplexity.sphereSegments);
    });

    it('should disable expensive features at lower LOD levels', () => {
      lodManager.setLOD(LODLevel.LOD3);
      const lowConfig = lodManager.getCurrentConfig();

      expect(lowConfig.visualEffects.animation).toBe(false);
      expect(lowConfig.visualEffects.shadows).toBe(false);
      expect(lowConfig.visualEffects.antialiasing).toBe(false);
      expect(lowConfig.visualEffects.lighting).toBe('basic');
    });

    it('should enable all features at highest LOD level', () => {
      lodManager.setLOD(LODLevel.LOD0);
      const highConfig = lodManager.getCurrentConfig();

      expect(highConfig.visualEffects.animation).toBe(true);
      expect(highConfig.visualEffects.shadows).toBe(true);
      expect(highConfig.visualEffects.antialiasing).toBe(true);
      expect(highConfig.visualEffects.lighting).toBe('enhanced');
    });
  });

  describe('performance statistics', () => {
    it('should provide accurate performance statistics', () => {
      const stats = lodManager.getPerformanceStats();

      expect(stats).toMatchObject({
        currentLOD: expect.any(Number),
        avgFPS: expect.any(Number),
        avgFrameTime: expect.any(Number),
        avgMemory: expect.any(Number),
        adaptiveEnabled: expect.any(Boolean)
      });
    });

    it('should track performance history accurately', () => {
      const testMetrics = [
        { ...testDataGenerators.generatePerformanceMetrics(), fps: 30 },
        { ...testDataGenerators.generatePerformanceMetrics(), fps: 40 },
        { ...testDataGenerators.generatePerformanceMetrics(), fps: 50 }
      ];

      testMetrics.forEach(metrics => {
        lodManager.updatePerformanceMetrics(metrics);
      });

      const stats = lodManager.getPerformanceStats();
      expect(stats.avgFPS).toBeCloseTo(40, 1); // Should average to ~40
    });
  });

  describe('adaptive LOD control', () => {
    it('should allow enabling/disabling adaptive behavior', () => {
      lodManager.enableAdaptiveLOD(false);
      let stats = lodManager.getPerformanceStats();
      expect(stats.adaptiveEnabled).toBe(false);

      lodManager.enableAdaptiveLOD(true);
      stats = lodManager.getPerformanceStats();
      expect(stats.adaptiveEnabled).toBe(true);
    });

    it('should not adapt when disabled', async () => {
      lodManager.enableAdaptiveLOD(false);
      lodManager.setLOD(LODLevel.LOD1);

      const listener = vi.fn();
      lodManager.addLODListener(listener);

      // Simulate terrible performance
      const terriblePerf = testDataGenerators.generatePerformanceMetrics();
      terriblePerf.fps = 5;

      for (let i = 0; i < 10; i++) {
        lodManager.updatePerformanceMetrics(terriblePerf);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should not have changed LOD
      expect(listener).not.toHaveBeenCalled();
      expect(lodManager.getCurrentLOD()).toBe(LODLevel.LOD1);
    });
  });

  describe('reset functionality', () => {
    it('should reset to recommended LOD', () => {
      lodManager.setLOD(LODLevel.LOD3);
      lodManager.reset();

      const currentLOD = lodManager.getCurrentLOD();
      const recommendedLOD = lodManager.getRecommendedLODForDevice();

      expect(currentLOD).toBe(recommendedLOD);
    });

    it('should clear performance history on reset', () => {
      // Add some performance data
      for (let i = 0; i < 5; i++) {
        lodManager.updatePerformanceMetrics(testDataGenerators.generatePerformanceMetrics());
      }

      lodManager.reset();

      const stats = lodManager.getPerformanceStats();
      // After reset, should have default/empty values
      expect(stats.avgFPS).toBeCloseTo(60, 1); // Default value
    });
  });

  describe('listener management', () => {
    it('should properly remove listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = lodManager.addLODListener(listener1);
      const unsubscribe2 = lodManager.addLODListener(listener2);

      // Remove first listener
      unsubscribe1();

      lodManager.setLOD(LODLevel.LOD2);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      // Clean up
      unsubscribe2();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      lodManager.addLODListener(errorListener);
      lodManager.addLODListener(goodListener);

      // Should not throw and should call good listener
      expect(() => lodManager.setLOD(LODLevel.LOD1)).not.toThrow();
      expect(goodListener).toHaveBeenCalled();
    });
  });
});