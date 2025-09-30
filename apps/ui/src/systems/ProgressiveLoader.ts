export interface LoadableResource {
  id: string;
  priority: number;
  estimatedSize: number;
  loader: () => Promise<any>;
  onProgress?: (loaded: number, total: number) => void;
  onComplete?: (resource: any) => void;
  onError?: (error: Error) => void;
}

export interface LoadingSession {
  id: string;
  resources: LoadableResource[];
  totalSize: number;
  loadedSize: number;
  progress: number;
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: Error;
}

export interface ProgressiveLoaderConfig {
  maxConcurrentLoads: number;
  priorityThreshold: number;
  timeSliceMs: number;
  maxRetries: number;
}

export class ProgressiveLoader {
  private config: ProgressiveLoaderConfig;
  private sessions = new Map<string, LoadingSession>();
  private activeLoads = new Set<string>();
  private loadQueue: LoadableResource[] = [];
  private isProcessing = false;

  constructor(config: Partial<ProgressiveLoaderConfig> = {}) {
    this.config = {
      maxConcurrentLoads: 3,
      priorityThreshold: 0.5,
      timeSliceMs: 16, // ~60fps budget
      maxRetries: 3,
      ...config
    };
  }

  createSession(resources: LoadableResource[]): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Sort resources by priority (higher first)
    const sortedResources = [...resources].sort((a, b) => b.priority - a.priority);

    const totalSize = sortedResources.reduce((sum, resource) => sum + resource.estimatedSize, 0);

    const session: LoadingSession = {
      id: sessionId,
      resources: sortedResources,
      totalSize,
      loadedSize: 0,
      progress: 0,
      status: 'pending'
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  async loadSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'loading';

    try {
      // Add high-priority resources to immediate queue
      const highPriorityResources = session.resources.filter(
        resource => resource.priority >= this.config.priorityThreshold
      );

      const lowPriorityResources = session.resources.filter(
        resource => resource.priority < this.config.priorityThreshold
      );

      // Load high-priority resources first
      if (highPriorityResources.length > 0) {
        await this.loadResourceBatch(highPriorityResources, session);
      }

      // Load remaining resources progressively
      if (lowPriorityResources.length > 0) {
        this.scheduleProgressiveLoading(lowPriorityResources, session);
      }

      session.status = 'completed';
      session.progress = 1;

    } catch (error) {
      session.status = 'error';
      session.error = error instanceof Error ? error : new Error('Loading failed');
      throw session.error;
    }
  }

  private async loadResourceBatch(resources: LoadableResource[], session: LoadingSession): Promise<void> {
    const promises = resources.slice(0, this.config.maxConcurrentLoads).map(resource =>
      this.loadResource(resource, session)
    );

    await Promise.all(promises);

    // Load remaining resources
    const remaining = resources.slice(this.config.maxConcurrentLoads);
    if (remaining.length > 0) {
      await this.loadResourceBatch(remaining, session);
    }
  }

  private async loadResource(resource: LoadableResource, session: LoadingSession): Promise<any> {
    const startTime = performance.now();
    let retries = 0;

    while (retries <= this.config.maxRetries) {
      try {
        this.activeLoads.add(resource.id);

        const result = await resource.loader();

        // Update session progress
        session.loadedSize += resource.estimatedSize;
        session.progress = session.loadedSize / session.totalSize;

        resource.onComplete?.(result);

        const loadTime = performance.now() - startTime;
        console.debug(`Loaded resource ${resource.id} in ${loadTime.toFixed(2)}ms`);

        return result;

      } catch (error) {
        retries++;
        const err = error instanceof Error ? error : new Error('Resource loading failed');

        if (retries > this.config.maxRetries) {
          resource.onError?.(err);
          throw err;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retries - 1), 5000);
        console.warn(`Resource ${resource.id} failed, retrying in ${delay}ms (attempt ${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } finally {
        this.activeLoads.delete(resource.id);
      }
    }
  }

  private scheduleProgressiveLoading(resources: LoadableResource[], session: LoadingSession): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.loadQueue.push(...resources);

    requestIdleCallback(
      (deadline) => this.processLoadQueue(deadline, session),
      { timeout: 100 }
    );
  }

  private async processLoadQueue(deadline: IdleDeadline, session: LoadingSession): Promise<void> {
    while (
      this.loadQueue.length > 0 &&
      this.activeLoads.size < this.config.maxConcurrentLoads &&
      deadline.timeRemaining() > this.config.timeSliceMs
    ) {
      const resource = this.loadQueue.shift();
      if (!resource) break;

      try {
        await this.loadResource(resource, session);
      } catch (error) {
        console.error(`Failed to load resource ${resource.id}:`, error);
      }
    }

    if (this.loadQueue.length > 0) {
      // Continue processing in next idle period
      requestIdleCallback(
        (deadline) => this.processLoadQueue(deadline, session),
        { timeout: 100 }
      );
    } else {
      this.isProcessing = false;
    }
  }

  getSessionProgress(sessionId: string): LoadingSession | undefined {
    return this.sessions.get(sessionId);
  }

  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'error';
    session.error = new Error('Session cancelled');

    // Remove resources from queue
    this.loadQueue = this.loadQueue.filter(
      resource => !session.resources.some(sr => sr.id === resource.id)
    );

    this.sessions.delete(sessionId);
  }

  getActiveLoads(): string[] {
    return Array.from(this.activeLoads);
  }

  getQueueLength(): number {
    return this.loadQueue.length;
  }

  isLoading(): boolean {
    return this.activeLoads.size > 0 || this.loadQueue.length > 0;
  }

  getStats(): {
    activeSessions: number;
    activeLoads: number;
    queueLength: number;
    isProcessing: boolean;
  } {
    return {
      activeSessions: this.sessions.size,
      activeLoads: this.activeLoads.size,
      queueLength: this.loadQueue.length,
      isProcessing: this.isProcessing
    };
  }

  clear(): void {
    this.sessions.clear();
    this.activeLoads.clear();
    this.loadQueue.length = 0;
    this.isProcessing = false;
  }
}

// Orbital-specific progressive loading utilities
export class OrbitalProgressiveLoader {
  private loader: ProgressiveLoader;

  constructor() {
    this.loader = new ProgressiveLoader({
      maxConcurrentLoads: 2, // Conservative for orbital calculations
      priorityThreshold: 0.7,
      timeSliceMs: 10, // Smaller slices for better responsiveness
      maxRetries: 2
    });
  }

  async loadOrbitalData(
    atomicNumber: number,
    configurations: Array<{ n: number; l: number; priority: number; sampleCount: number }>
  ): Promise<string> {
    const resources: LoadableResource[] = configurations.map(config => ({
      id: `orbital_${atomicNumber}_${config.n}_${config.l}`,
      priority: config.priority,
      estimatedSize: config.sampleCount * 32, // Rough size estimate
      loader: async () => {
        const { buildElectronConfiguration, generateOrbitalLayers } = await import('@bio-sim/orbital-engine');

        // Create minimal configuration for this specific orbital
        const orbitalConfig = [{ quantum: { n: config.n, l: config.l, m: 0 }, occupancy: 1 }];

        return generateOrbitalLayers(orbitalConfig, atomicNumber, config.sampleCount);
      }
    }));

    return this.loader.createSession(resources);
  }

  async loadAtomData(atomicNumber: number): Promise<string> {
    // Progressive loading strategy for atomic data
    const resources: LoadableResource[] = [
      {
        id: `atom_nucleus_${atomicNumber}`,
        priority: 1.0, // Highest priority - nucleus loads first
        estimatedSize: 1024,
        loader: async () => {
          // Load nuclear data
          return {
            protons: atomicNumber,
            neutrons: Math.round(atomicNumber * 1.2) // Rough estimate
          };
        }
      },
      {
        id: `atom_electrons_core_${atomicNumber}`,
        priority: 0.8, // High priority - core electrons
        estimatedSize: 4096,
        loader: async () => {
          // Load core electron shells (1s, 2s, 2p)
          const { buildElectronConfiguration } = await import('@bio-sim/orbital-engine');
          const fullConfig = buildElectronConfiguration(atomicNumber);
          return fullConfig.filter(config => config.quantum.n <= 2);
        }
      },
      {
        id: `atom_electrons_valence_${atomicNumber}`,
        priority: 0.6, // Medium priority - valence electrons
        estimatedSize: 8192,
        loader: async () => {
          // Load valence electron shells
          const { buildElectronConfiguration } = await import('@bio-sim/orbital-engine');
          const fullConfig = buildElectronConfiguration(atomicNumber);
          return fullConfig.filter(config => config.quantum.n > 2);
        }
      }
    ];

    return this.loader.createSession(resources);
  }

  getProgress(sessionId: string): LoadingSession | undefined {
    return this.loader.getSessionProgress(sessionId);
  }

  cancel(sessionId: string): void {
    this.loader.cancelSession(sessionId);
  }

  isLoading(): boolean {
    return this.loader.isLoading();
  }
}

// Global instances
export const progressiveLoader = new ProgressiveLoader();
export const orbitalProgressiveLoader = new OrbitalProgressiveLoader();