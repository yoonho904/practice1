import { vi } from 'vitest';

// Mock WebGL context for testing
export function createMockWebGLContext(): Partial<WebGLRenderingContext> {
  return {
    getParameter: vi.fn((param) => {
      switch (param) {
        case WebGLRenderingContext.RENDERER:
          return 'Mock WebGL Renderer';
        case WebGLRenderingContext.VENDOR:
          return 'Mock Vendor';
        case WebGLRenderingContext.MAX_TEXTURE_SIZE:
          return 4096;
        case WebGLRenderingContext.MAX_VERTEX_ATTRIBS:
          return 16;
        default:
          return null;
      }
    }),
    createShader: vi.fn(() => ({} as WebGLShader)),
    createProgram: vi.fn(() => ({} as WebGLProgram)),
    createBuffer: vi.fn(() => ({} as WebGLBuffer)),
    createTexture: vi.fn(() => ({} as WebGLTexture)),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    useProgram: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    getExtension: vi.fn(() => null),
    canvas: document.createElement('canvas')
  };
}

// Mock HTMLCanvasElement for testing
export function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  // Mock getContext to return our mock WebGL context
  const originalGetContext = canvas.getContext.bind(canvas);
  canvas.getContext = vi.fn((contextType: string) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return createMockWebGLContext();
    }
    return originalGetContext(contextType);
  });

  return canvas;
}

// Mock Worker for testing
export class MockWorker {
  private listeners: Map<string, Function[]> = new Map();

  constructor(private url: string | URL) {}

  postMessage(data: any): void {
    // Simulate async worker response
    setTimeout(() => {
      this.dispatchEvent('message', { data: { type: 'test_response', data } });
    }, 10);
  }

  addEventListener(type: string, listener: Function): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: Function): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private dispatchEvent(type: string, event: any): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  terminate(): void {
    this.listeners.clear();
  }
}

// Mock requestAnimationFrame for testing
let rafId = 0;
const rafCallbacks = new Map<number, Function>();

export const mockRequestAnimationFrame = vi.fn((callback: Function) => {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  // Execute immediately in tests
  setTimeout(() => callback(performance.now()), 0);
  return id;
});

export const mockCancelAnimationFrame = vi.fn((id: number) => {
  rafCallbacks.delete(id);
});

// Mock requestIdleCallback for testing
export const mockRequestIdleCallback = vi.fn((callback: Function, options?: any) => {
  const deadline = {
    timeRemaining: () => 50, // Mock 50ms remaining
    didTimeout: false
  };
  setTimeout(() => callback(deadline), 0);
  return 1;
});

// Mock performance.now for consistent testing
let mockTime = 0;
export const mockPerformanceNow = vi.fn(() => {
  return mockTime += 16.67; // Simulate 60fps
});

// Test environment setup
export function setupTestEnvironment() {
  // Mock global objects
  global.Worker = MockWorker as any;
  global.requestAnimationFrame = mockRequestAnimationFrame;
  global.cancelAnimationFrame = mockCancelAnimationFrame;
  global.requestIdleCallback = mockRequestIdleCallback;

  // Mock performance
  Object.defineProperty(global.performance, 'now', {
    value: mockPerformanceNow,
    writable: true
  });

  // Mock canvas creation
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return createMockCanvas();
    }
    return originalCreateElement(tagName);
  });

  // Mock WebGL extensions
  HTMLCanvasElement.prototype.getContext = vi.fn(function(this: HTMLCanvasElement, contextType: string) {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return createMockWebGLContext();
    }
    return null;
  });
}

// Test utilities for atomic data
export const testAtomicData = {
  hydrogen: {
    atomicNumber: 1,
    symbol: 'H',
    name: 'Hydrogen',
    atomicMass: 1.008,
    electronConfiguration: [{ n: 1, l: 0, m: 0, spin: 0.5 }]
  },
  carbon: {
    atomicNumber: 6,
    symbol: 'C',
    name: 'Carbon',
    atomicMass: 12.011,
    electronConfiguration: [
      { n: 1, l: 0, m: 0, spin: 0.5 },
      { n: 1, l: 0, m: 0, spin: -0.5 },
      { n: 2, l: 0, m: 0, spin: 0.5 },
      { n: 2, l: 0, m: 0, spin: -0.5 },
      { n: 2, l: 1, m: -1, spin: 0.5 },
      { n: 2, l: 1, m: 0, spin: 0.5 }
    ]
  },
  oxygen: {
    atomicNumber: 8,
    symbol: 'O',
    name: 'Oxygen',
    atomicMass: 15.999,
    electronConfiguration: [
      { n: 1, l: 0, m: 0, spin: 0.5 },
      { n: 1, l: 0, m: 0, spin: -0.5 },
      { n: 2, l: 0, m: 0, spin: 0.5 },
      { n: 2, l: 0, m: 0, spin: -0.5 },
      { n: 2, l: 1, m: -1, spin: 0.5 },
      { n: 2, l: 1, m: -1, spin: -0.5 },
      { n: 2, l: 1, m: 0, spin: 0.5 },
      { n: 2, l: 1, m: 0, spin: -0.5 }
    ]
  }
};

// Performance testing utilities
export class PerformanceTester {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(key: string): void {
    const start = performance.now();
    if (!this.measurements.has(key)) {
      this.measurements.set(key, []);
    }
    this.measurements.get(key)!.push(start);
  }

  endMeasurement(key: string): number {
    const measurements = this.measurements.get(key);
    if (!measurements || measurements.length === 0) {
      throw new Error(`No active measurement for key: ${key}`);
    }

    const start = measurements.pop()!;
    const duration = performance.now() - start;
    return duration;
  }

  getAverageTime(key: string, iterations: number): Promise<number> {
    return new Promise((resolve) => {
      const times: number[] = [];

      const runIteration = () => {
        if (times.length >= iterations) {
          const average = times.reduce((sum, time) => sum + time, 0) / times.length;
          resolve(average);
          return;
        }

        const start = performance.now();
        // Simulate some work
        setTimeout(() => {
          const end = performance.now();
          times.push(end - start);
          runIteration();
        }, 0);
      };

      runIteration();
    });
  }

  clear(): void {
    this.measurements.clear();
  }
}

// Memory testing utilities
export class MemoryTester {
  private initialMemory: number = 0;

  startMemoryTest(): void {
    if ('memory' in performance && (performance as any).memory) {
      this.initialMemory = (performance as any).memory.usedJSHeapSize;
    }
  }

  getMemoryDelta(): number {
    if ('memory' in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize - this.initialMemory;
    }
    return 0;
  }

  static async forceGarbageCollection(): Promise<void> {
    if ('gc' in global && typeof (global as any).gc === 'function') {
      (global as any).gc();
    }
    // Give some time for GC to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Assertion helpers for scientific validation
export const scientificAssertions = {
  expectValidQuantumNumbers(n: number, l: number, m: number): void {
    expect(n).toBeGreaterThan(0);
    expect(Number.isInteger(n)).toBe(true);
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThan(n);
    expect(Number.isInteger(l)).toBe(true);
    expect(m).toBeGreaterThanOrEqual(-l);
    expect(m).toBeLessThanOrEqual(l);
    expect(Number.isInteger(m)).toBe(true);
  },

  expectValidProbabilityDensity(values: number[]): void {
    values.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(value)).toBe(true);
    });
  },

  expectNormalizedProbability(values: number[], tolerance: number = 1e-6): void {
    const sum = values.reduce((acc, val) => acc + val, 0);
    expect(Math.abs(sum - 1)).toBeLessThanOrEqual(tolerance);
  },

  expectEnergyOrdering(energies: number[]): void {
    for (let i = 1; i < energies.length; i++) {
      expect(energies[i]).toBeGreaterThanOrEqual(energies[i - 1]);
    }
  }
};

// Test data generators
export const testDataGenerators = {
  generateOrbitalSamples(count: number = 100): Array<{
    position: [number, number, number];
    probability: number;
    shell: number;
  }> {
    const samples = [];
    for (let i = 0; i < count; i++) {
      samples.push({
        position: [
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ] as [number, number, number],
        probability: Math.random(),
        shell: Math.floor(Math.random() * 4) + 1
      });
    }
    return samples;
  },

  generatePerformanceMetrics(): any {
    return {
      fps: 45 + Math.random() * 30,
      frameTime: 10 + Math.random() * 20,
      drawCalls: Math.floor(Math.random() * 100),
      triangles: Math.floor(Math.random() * 10000),
      points: Math.floor(Math.random() * 1000),
      memoryUsage: Math.floor(Math.random() * 100 * 1024 * 1024),
      gpuMemory: 0
    };
  }
};