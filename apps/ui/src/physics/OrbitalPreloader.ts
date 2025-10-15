import type { QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';
import { cloneOrbitalSamplingResult } from './orbitalSampling.js';
import type { OrbitalSamplingResult } from './orbitalSampling.js';

export interface PreloadRequest {
  atomicNumber: number;
  quantumNumbers: QuantumNumbers;
  particleCount: number;
  isDarkBackground: boolean;
  distributionType: 'accurate' | 'aesthetic';
  priority: 'high' | 'medium' | 'low';
}

export interface CacheEntry {
  key: string;
  data: OrbitalSamplingResult;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Manages predictive pre-caching of orbital calculations to provide
 * instant transitions when quantum numbers change.
 *
 * Strategy:
 * - High priority: All m values for current n,l (most likely to change)
 * - Medium priority: Adjacent n values
 * - Low priority: Adjacent l values
 *
 * Uses LRU eviction to keep memory usage under control (~100MB max).
 */
export class OrbitalPreloader {
  private cache = new Map<string, CacheEntry>();
  private preloadQueue: PreloadRequest[] = [];
  private isPreloading = false;
  private maxCacheSize = 30; // Maximum number of cached orbitals
  private maxMemoryMB = 100; // Maximum memory usage in MB

  /**
   * Generate a unique cache key for an orbital configuration
   */
  private getCacheKey(
    atomicNumber: number,
    qn: QuantumNumbers,
    count: number,
    dark: boolean,
    distributionType: 'accurate' | 'aesthetic',
  ): string {
    return `${atomicNumber}:${qn.n}:${qn.l}:${qn.m}:${count}:${dark ? 'dark' : 'light'}:${distributionType}`;
  }

  /**
   * Get a cached orbital if it exists
   */
  get(
    atomicNumber: number,
    qn: QuantumNumbers,
    count: number,
    dark: boolean,
    distributionType: 'accurate' | 'aesthetic',
  ): OrbitalSamplingResult | null {
    const key = this.getCacheKey(atomicNumber, qn, count, dark, distributionType);
    const entry = this.cache.get(key);

    if (entry) {
      // Update access statistics for LRU
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return cloneOrbitalSamplingResult(entry.data);
    }

    return null;
  }

  /**
   * Store an orbital in the cache
   */
  set(
    atomicNumber: number,
    qn: QuantumNumbers,
    count: number,
    dark: boolean,
    distributionType: 'accurate' | 'aesthetic',
    data: OrbitalSamplingResult
  ): void {
    const key = this.getCacheKey(atomicNumber, qn, count, dark, distributionType);

    const cachedData = cloneOrbitalSamplingResult(data);

    const entry: CacheEntry = {
      key,
      data: cachedData,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);

    // Check if we need to evict old entries
    this.evictIfNeeded();
  }

  /**
   * Check if an orbital is already cached
   */
  has(
    atomicNumber: number,
    qn: QuantumNumbers,
    count: number,
    dark: boolean,
    distributionType: 'accurate' | 'aesthetic',
  ): boolean {
    const key = this.getCacheKey(atomicNumber, qn, count, dark, distributionType);
    return this.cache.has(key);
  }

  /**
   * Preload orbitals in the neighborhood of the current state
   * This is the main predictive caching function
   */
  async preloadNeighborhood(
    atomicNumber: number,
    currentQN: QuantumNumbers,
    particleCount: number,
    isDarkBackground: boolean,
    distributionType: 'accurate' | 'aesthetic',
    calculator: (req: PreloadRequest) => Promise<OrbitalSamplingResult | null>
  ): Promise<void> {
    const requests: PreloadRequest[] = [];

    // HIGH PRIORITY: Preload all m values for current n,l
    // This is the most common change users make
    for (let m = -currentQN.l; m <= currentQN.l; m++) {
      if (m === currentQN.m) {
        continue; // Skip current state
      }

      if (
        !this.has(atomicNumber, { ...currentQN, m }, particleCount, isDarkBackground, distributionType)
      ) {
        requests.push({
          atomicNumber,
          quantumNumbers: { ...currentQN, m },
          particleCount,
          isDarkBackground,
          distributionType,
          priority: 'high',
        });
      }
    }

    // MEDIUM PRIORITY: Preload adjacent n values
    if (currentQN.n > 1) {
      const lowerN = currentQN.n - 1;
      const lowerL = Math.min(currentQN.l, lowerN - 1);
      const lowerM = Math.min(Math.max(currentQN.m, -lowerL), lowerL);

      if (
        !this.has(
          atomicNumber,
          { n: lowerN, l: lowerL, m: lowerM, s: currentQN.s },
          particleCount,
          isDarkBackground,
          distributionType,
        )
      ) {
        requests.push({
          atomicNumber,
          quantumNumbers: { n: lowerN, l: lowerL, m: lowerM, s: currentQN.s },
          particleCount,
          isDarkBackground,
          distributionType,
          priority: 'medium',
        });
      }
    }

    if (currentQN.n < 5) {
      const higherN = currentQN.n + 1;

      if (
        !this.has(
          atomicNumber,
          { n: higherN, l: currentQN.l, m: currentQN.m, s: currentQN.s },
          particleCount,
          isDarkBackground,
          distributionType,
        )
      ) {
        requests.push({
          atomicNumber,
          quantumNumbers: { n: higherN, l: currentQN.l, m: currentQN.m, s: currentQN.s },
          particleCount,
          isDarkBackground,
          distributionType,
          priority: 'medium',
        });
      }
    }

    // LOW PRIORITY: Preload adjacent l values
    if (currentQN.l > 0) {
      const lowerL = currentQN.l - 1;
      const lowerM = Math.min(Math.max(currentQN.m, -lowerL), lowerL);

      if (
        !this.has(
          atomicNumber,
          { ...currentQN, l: lowerL, m: lowerM },
          particleCount,
          isDarkBackground,
          distributionType,
        )
      ) {
        requests.push({
          atomicNumber,
          quantumNumbers: { ...currentQN, l: lowerL, m: lowerM },
          particleCount,
          isDarkBackground,
          distributionType,
          priority: 'low',
        });
      }
    }

    if (currentQN.l < currentQN.n - 1) {
      const higherL = currentQN.l + 1;

      if (
        !this.has(
          atomicNumber,
          { ...currentQN, l: higherL, m: 0 },
          particleCount,
          isDarkBackground,
          distributionType,
        )
      ) {
        requests.push({
          atomicNumber,
          quantumNumbers: { ...currentQN, l: higherL, m: 0 },
          particleCount,
          isDarkBackground,
          distributionType,
          priority: 'low',
        });
      }
    }

    // Sort by priority: high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    requests.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Add to preload queue
    this.preloadQueue.push(...requests);

    // Start processing queue if not already running
    if (!this.isPreloading) {
      void this.processPreloadQueue(calculator);
    }
  }

  /**
   * Process the preload queue in the background
   */
  private async processPreloadQueue(
    calculator: (req: PreloadRequest) => Promise<OrbitalSamplingResult | null>
  ): Promise<void> {
    if (this.isPreloading) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const request = this.preloadQueue.shift();
      if (!request) {
        break;
      }

      // Check if already cached (might have been added while waiting)
      if (
        this.has(
          request.atomicNumber,
          request.quantumNumbers,
          request.particleCount,
          request.isDarkBackground,
          request.distributionType,
        )
      ) {
        continue;
      }

      try {
        const result = await calculator(request);

        if (result) {
          this.set(
            request.atomicNumber,
            request.quantumNumbers,
            request.particleCount,
            request.isDarkBackground,
            request.distributionType,
            result
          );
        }
      } catch (error) {
        console.warn('Preload failed for orbital:', request.quantumNumbers, error);
      }

      // Small delay between preloads to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.isPreloading = false;
  }

  /**
   * Evict old cache entries based on LRU policy
   */
  private evictIfNeeded(): void {
    // Check cache size limit
    if (this.cache.size <= this.maxCacheSize) {
      return;
    }

    // Convert cache to array and sort by LRU score
    const entries = Array.from(this.cache.values());

    // LRU score: lower is worse (should be evicted first)
    // Considers both recency and frequency
    entries.sort((a, b) => {
      const scoreA = a.lastAccessed + (a.accessCount * 10000); // Weight frequency higher
      const scoreB = b.lastAccessed + (b.accessCount * 10000);
      return scoreA - scoreB;
    });

    // Evict bottom 20% to avoid thrashing
    const evictCount = Math.ceil(this.cache.size * 0.2);

    for (let i = 0; i < evictCount; i++) {
      this.cache.delete(entries[i].key);
    }
  }

  /**
   * Clear all cached orbitals
   */
  clear(): void {
    this.cache.clear();
    this.preloadQueue = [];
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; queueLength: number; hitRate: number } {
    let totalAccesses = 0;
    let totalHits = 0;

    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
      if (entry.accessCount > 1) {
        totalHits += entry.accessCount - 1; // First access is a miss
      }
    }

    const hitRate = totalAccesses > 0 ? totalHits / totalAccesses : 0;

    return {
      size: this.cache.size,
      queueLength: this.preloadQueue.length,
      hitRate,
    };
  }

  /**
   * Cancel all pending preload operations
   */
  cancelPreloads(): void {
    this.preloadQueue = [];
  }
}

// Export a singleton instance
export const orbitalPreloader = new OrbitalPreloader();
