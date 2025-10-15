export enum LODLevel {
  LOD0 = 0, // Highest detail
  LOD1 = 1, // Medium detail
  LOD2 = 2, // Low detail
  LOD3 = 3  // Minimum detail
}

export interface LODConfig {
  maxPoints: number;
  sampleMultiplier: number;
  geometryComplexity: {
    sphereSegments: number;
    cylinderSegments: number;
    torusSegments: number;
  };
  visualEffects: {
    animation: boolean;
    lighting: 'basic' | 'enhanced';
    shadows: boolean;
    antialiasing: boolean;
  };
  renderDistance: number;
  cullDistance: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  memoryUsage: number;
  gpuMemory: number;
}

export interface LODManagerConfig {
  targetFPS: number;
  minFPS: number;
  adaptiveEnabled: boolean;
  performanceSamples: number;
  hysteresis: number; // Prevent rapid LOD switching
}

const LOD_CONFIGURATIONS: Record<LODLevel, LODConfig> = {
  [LODLevel.LOD0]: {
    maxPoints: 2000,
    sampleMultiplier: 1.0,
    geometryComplexity: {
      sphereSegments: 48,
      cylinderSegments: 36,
      torusSegments: 96
    },
    visualEffects: {
      animation: true,
      lighting: 'enhanced',
      shadows: true,
      antialiasing: true
    },
    renderDistance: 100,
    cullDistance: 200
  },
  [LODLevel.LOD1]: {
    maxPoints: 1200,
    sampleMultiplier: 0.7,
    geometryComplexity: {
      sphereSegments: 28,
      cylinderSegments: 24,
      torusSegments: 64
    },
    visualEffects: {
      animation: true,
      lighting: 'enhanced',
      shadows: false,
      antialiasing: true
    },
    renderDistance: 80,
    cullDistance: 150
  },
  [LODLevel.LOD2]: {
    maxPoints: 600,
    sampleMultiplier: 0.4,
    geometryComplexity: {
      sphereSegments: 16,
      cylinderSegments: 12,
      torusSegments: 36
    },
    visualEffects: {
      animation: false,
      lighting: 'basic',
      shadows: false,
      antialiasing: false
    },
    renderDistance: 50,
    cullDistance: 100
  },
  [LODLevel.LOD3]: {
    maxPoints: 200,
    sampleMultiplier: 0.2,
    geometryComplexity: {
      sphereSegments: 8,
      cylinderSegments: 8,
      torusSegments: 16
    },
    visualEffects: {
      animation: false,
      lighting: 'basic',
      shadows: false,
      antialiasing: false
    },
    renderDistance: 30,
    cullDistance: 60
  }
};

export class LODManager {
  private currentLOD: LODLevel = LODLevel.LOD1;
  private targetLOD: LODLevel = LODLevel.LOD1;
  private config: LODManagerConfig;
  private performanceHistory: PerformanceMetrics[] = [];
  private lastLODChange = 0;
  private listeners = new Set<(newLOD: LODLevel, config: LODConfig) => void>();
  private pendingLODChange: LODLevel | null = null;
  private pendingLODTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: Partial<LODManagerConfig> = {}) {
    this.config = {
      targetFPS: 60,
      minFPS: 30,
      adaptiveEnabled: true,
      performanceSamples: 10,
      hysteresis: 2000, // 2 second minimum between changes
      ...config
    };
  }

  getCurrentLOD(): LODLevel {
    return this.currentLOD;
  }

  getCurrentConfig(): LODConfig {
    return LOD_CONFIGURATIONS[this.currentLOD];
  }

  updatePerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);

    // Keep only recent samples
    if (this.performanceHistory.length > this.config.performanceSamples) {
      this.performanceHistory.shift();
    }

    // Only adapt if enabled and we have enough samples
    if (this.config.adaptiveEnabled && this.performanceHistory.length >= 5) {
      this.evaluateAndAdaptLOD();
    }
  }

  private evaluateAndAdaptLOD(): void {
    const now = Date.now();

    const avgFPS = this.calculateAverageFPS();
    const avgFrameTime = this.calculateAverageFrameTime();
    const frameTimeTarget = 1000 / this.config.targetFPS;

    let newTargetLOD = this.currentLOD;

    // Determine if we need to decrease quality (increase LOD level)
    if (avgFPS < this.config.minFPS || avgFrameTime > frameTimeTarget * 1.35) {
      if (this.currentLOD < LODLevel.LOD3) {
        newTargetLOD = this.currentLOD + 1;
        console.warn(
          `Performance degraded (${avgFPS.toFixed(1)} FPS, ${avgFrameTime.toFixed(1)}ms frame time), reducing quality to LOD${newTargetLOD}`
        );
      }
    }
    // Determine if we can increase quality (decrease LOD level)
    else if (avgFPS > this.config.targetFPS * 1.2 && avgFrameTime < frameTimeTarget * 0.8) {
      if (this.currentLOD > LODLevel.LOD0) {
        newTargetLOD = this.currentLOD - 1;
        console.info(`Performance improved (${avgFPS.toFixed(1)} FPS), increasing quality to LOD${newTargetLOD}`);
      }
    }

    // Check memory pressure
    const avgMemory = this.calculateAverageMemory();
    if (avgMemory > 500 * 1024 * 1024) { // 500MB threshold
      if (newTargetLOD < LODLevel.LOD3) {
        newTargetLOD = Math.max(newTargetLOD, this.currentLOD + 1);
        console.warn(`High memory usage (${(avgMemory / 1024 / 1024).toFixed(0)}MB), reducing quality`);
      }
    }

    if (newTargetLOD !== this.currentLOD) {
      const timeSinceChange = now - this.lastLODChange;
      const delay = Math.max(1, this.config.hysteresis - timeSinceChange);
      this.scheduleLODChange(newTargetLOD, delay);
    } else if (this.pendingLODChange !== null) {
      this.cancelPendingLODChange();
    }
  }

  private calculateAverageFPS(): number {
    if (!this.performanceHistory.length) {return 60;}

    const recentSamples = this.performanceHistory.slice(-5);
    return recentSamples.reduce((sum, metrics) => sum + metrics.fps, 0) / recentSamples.length;
  }

  private calculateAverageFrameTime(): number {
    if (!this.performanceHistory.length) {return 16.67;}

    const recentSamples = this.performanceHistory.slice(-5);
    return recentSamples.reduce((sum, metrics) => sum + metrics.frameTime, 0) / recentSamples.length;
  }

  private calculateAverageMemory(): number {
    if (!this.performanceHistory.length) {return 0;}

    const recentSamples = this.performanceHistory.slice(-3);
    return recentSamples.reduce((sum, metrics) => sum + (metrics.memoryUsage || 0), 0) / recentSamples.length;
  }

  setLOD(level: LODLevel): void {
    if (this.pendingLODTimeout) {
      this.cancelPendingLODChange();
    }

    if (level === this.currentLOD) {
      if (this.listeners.size > 1) {
        const config = this.getCurrentConfig();
        this.emitLODChange(level, config);
      }
      return;
    }

    const oldLOD = this.currentLOD;
    this.currentLOD = level;
    this.targetLOD = level;
    this.lastLODChange = Date.now();

    const config = this.getCurrentConfig();

    console.info(`LOD changed: ${oldLOD} → ${level}`, {
      maxPoints: config.maxPoints,
      sampleMultiplier: config.sampleMultiplier,
      lighting: config.visualEffects.lighting,
      animation: config.visualEffects.animation
    });

    this.emitLODChange(level, config);
  }

  addLODListener(listener: (newLOD: LODLevel, config: LODConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecommendedLODForDevice(): LODLevel {
    // Detect device capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      return LODLevel.LOD3; // Fallback for no WebGL
    }

    // Check GPU capabilities
    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

    // Device performance estimation
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const vendorString = typeof vendor === 'string' ? vendor : '';
    const attributeLimit = typeof maxVertexAttributes === 'number' ? maxVertexAttributes : 16;
    const isLowEndGPU = Boolean(renderer) && (
      renderer.includes('Intel') ||
      renderer.includes('630') ||
      renderer.includes('620') ||
      vendorString.includes('Microsoft') ||
      vendorString.includes('Qualcomm') ||
      maxTextureSize < 4096 ||
      attributeLimit < 16
    );

    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    if (isMobile || isLowEndGPU || hardwareConcurrency < 4) {
      return LODLevel.LOD2;
    } else if (maxTextureSize >= 8192 && hardwareConcurrency >= 8) {
      return LODLevel.LOD0;
    } else {
      return LODLevel.LOD1;
    }
  }

  enableAdaptiveLOD(enabled: boolean): void {
    this.config.adaptiveEnabled = enabled;
    if (enabled) {
      console.info('Adaptive LOD enabled');
    } else {
      console.info('Adaptive LOD disabled');
    }
  }

  getPerformanceStats(): {
    currentLOD: LODLevel;
    avgFPS: number;
    avgFrameTime: number;
    avgMemory: number;
    adaptiveEnabled: boolean;
  } {
    return {
      currentLOD: this.currentLOD,
      avgFPS: this.calculateAverageFPS(),
      avgFrameTime: this.calculateAverageFrameTime(),
      avgMemory: this.calculateAverageMemory(),
      adaptiveEnabled: this.config.adaptiveEnabled
    };
  }

  reset(): void {
    this.performanceHistory.length = 0;
    this.lastLODChange = 0;
    const recommendedLOD = this.getRecommendedLODForDevice();
    this.setLOD(recommendedLOD);
  }

  private scheduleLODChange(target: LODLevel, delay: number): void {
    if (this.pendingLODChange === target && this.pendingLODTimeout) {
      return;
    }

    this.cancelPendingLODChange();

    this.pendingLODChange = target;
    const safeDelay = Math.max(0, delay);
    this.pendingLODTimeout = setTimeout(() => {
      const pendingTarget = this.pendingLODChange;
      this.pendingLODChange = null;
      this.pendingLODTimeout = null;
      if (pendingTarget !== null) {
        this.setLOD(pendingTarget);
      }
    }, safeDelay);
  }

  private cancelPendingLODChange(): void {
    if (this.pendingLODTimeout) {
      clearTimeout(this.pendingLODTimeout);
      this.pendingLODTimeout = null;
    }
    this.pendingLODChange = null;
  }

  private emitLODChange(level: LODLevel, config: LODConfig): void {
    this.listeners.forEach(listener => {
      try {
        listener(level, config);
      } catch (error) {
        console.error('Error in LOD listener:', error);
      }
    });
  }
}

// Singleton instance
let globalLODManager: LODManager | null = null;

export function getLODManager(): LODManager {
  if (!globalLODManager) {
    globalLODManager = new LODManager();
    // Set initial LOD based on device
    const recommendedLOD = globalLODManager.getRecommendedLODForDevice();
    globalLODManager.setLOD(recommendedLOD);
  }
  return globalLODManager;
}
