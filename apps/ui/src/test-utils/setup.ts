import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { setupTestEnvironment } from './TestingFramework';

// Extend expect matchers
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<T = unknown> extends TestingLibraryMatchers<T, void> {
    readonly __testingLibraryBrand?: never;
  }
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, void> {
    readonly __testingLibraryBrand?: never;
  }
}

// Global setup
beforeAll(() => {
  setupTestEnvironment();

  // Mock console methods to reduce noise in tests
  vi.stubGlobal('console', {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  });

  // Mock window.location.reload
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      reload: vi.fn()
    },
    writable: true
  });

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock URL.createObjectURL
  global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
  global.URL.revokeObjectURL = vi.fn();

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

// Mock environment variables
vi.mock('../config/env', () => ({
  NODE_ENV: 'test',
  BASE_URL: '/',
  VITE_API_URL: 'http://localhost:3000'
}));
