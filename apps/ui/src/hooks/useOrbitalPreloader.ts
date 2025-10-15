import { useEffect, useCallback, useRef } from 'react';
import type { QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';
import { orbitalPreloader } from '../physics/OrbitalPreloader.js';
import type { OrbitalSamplingResult } from '../physics/orbitalSampling.js';
import type { PreloadRequest } from '../physics/OrbitalPreloader.js';

interface UseOrbitalPreloaderOptions {
  atomicNumber: number;
  quantumNumbers: QuantumNumbers;
  particleCount: number;
  isDarkBackground: boolean;
  enabled?: boolean;
}

/**
 * React hook for orbital preloading with automatic neighborhood caching.
 *
 * This hook:
 * 1. Checks if the requested orbital is cached
 * 2. If not, triggers calculation
 * 3. Automatically preloads neighboring orbitals in the background
 * 4. Provides instant results on subsequent requests
 *
 * @example
 * const { getCachedOrbital, preloadNeighborhood } = useOrbitalPreloader({
 *   atomicNumber: 1,
 *   quantumNumbers: { n: 2, l: 1, m: 0, s: 0.5 },
 *   particleCount: 10000,
 *   isDarkBackground: true
 * });
 */
export function useOrbitalPreloader({
  atomicNumber,
  quantumNumbers,
  particleCount,
  isDarkBackground,
  distributionType,
  enabled = true,
}: UseOrbitalPreloaderOptions) {
  const calculatorRef = useRef<((req: PreloadRequest) => Promise<OrbitalSamplingResult | null>) | null>(null);

  /**
   * Get a cached orbital or return null if not available
   */
  const getCachedOrbital = useCallback((): OrbitalSamplingResult | null => {
    if (!enabled) {
      return null;
    }

    return orbitalPreloader.get(
      atomicNumber,
      quantumNumbers,
      particleCount,
      isDarkBackground,
      distributionType,
    );
  }, [atomicNumber, quantumNumbers, particleCount, isDarkBackground, distributionType, enabled]);

  /**
   * Store an orbital in the cache
   */
  const cacheOrbital = useCallback((data: OrbitalSamplingResult): void => {
    if (!enabled) {
      return;
    }

    orbitalPreloader.set(
      atomicNumber,
      quantumNumbers,
      particleCount,
      isDarkBackground,
      distributionType,
      data,
    );
  }, [atomicNumber, quantumNumbers, particleCount, isDarkBackground, distributionType, enabled]);

  /**
   * Check if an orbital is cached
   */
  const isCached = useCallback((): boolean => {
    if (!enabled) {
      return false;
    }

    return orbitalPreloader.has(
      atomicNumber,
      quantumNumbers,
      particleCount,
      isDarkBackground,
      distributionType,
    );
  }, [atomicNumber, quantumNumbers, particleCount, isDarkBackground, distributionType, enabled]);

  /**
   * Set the calculator function for preloading
   * This should be called once to provide the calculation logic
   */
  const setCalculator = useCallback((
    calculator: (req: PreloadRequest) => Promise<OrbitalSamplingResult | null>
  ) => {
    calculatorRef.current = calculator;
  }, []);

  /**
   * Trigger preloading of neighboring orbitals
   */
  const preloadNeighborhood = useCallback(async (): Promise<void> => {
    if (!enabled || !calculatorRef.current) {
      return;
    }

    await orbitalPreloader.preloadNeighborhood(
      atomicNumber,
      quantumNumbers,
      particleCount,
      isDarkBackground,
      distributionType,
      calculatorRef.current
    );
  }, [atomicNumber, quantumNumbers, particleCount, isDarkBackground, distributionType, enabled]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return orbitalPreloader.getStats();
  }, []);

  /**
   * Clear the cache
   */
  const clearCache = useCallback(() => {
    orbitalPreloader.clear();
  }, []);

  /**
   * Cancel pending preload operations
   */
  const cancelPreloads = useCallback(() => {
    orbitalPreloader.cancelPreloads();
  }, []);

  // Auto-trigger preloading when quantum numbers change
  useEffect(() => {
    if (enabled && calculatorRef.current) {
      // Small delay to avoid preloading during rapid changes (debouncing already handles this)
      const timer = setTimeout(() => {
        void preloadNeighborhood();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [
    atomicNumber,
    quantumNumbers.n,
    quantumNumbers.l,
    quantumNumbers.m,
    distributionType,
    enabled,
    preloadNeighborhood,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelPreloads();
    };
  }, [cancelPreloads]);

  return {
    getCachedOrbital,
    cacheOrbital,
    isCached,
    setCalculator,
    preloadNeighborhood,
    getCacheStats,
    clearCache,
    cancelPreloads,
  };
}

export type UseOrbitalPreloaderReturn = ReturnType<typeof useOrbitalPreloader>;
