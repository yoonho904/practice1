/**
 * Test setup file for quantum engine
 * Sets up global test utilities and configurations
 */

import { beforeEach } from 'vitest';

// Global test configuration
beforeEach(() => {
  // Reset any global state between tests
  // This ensures test isolation
});

// Custom matchers for quantum calculations
expect.extend({
  toBeCloseToQuantum(received: number, expected: number, precision = 6): { pass: boolean; message: () => string } {
    const pass = Math.abs(received - expected) < Math.pow(10, -precision);
    return {
      message: () =>
        `expected ${received} to be close to ${expected} within quantum precision (${precision} decimal places)`,
      pass,
    };
  },
});

// Declare custom matcher types for TypeScript
declare module 'vitest' {
  interface AsymmetricMatchersContaining {
    toBeCloseToQuantum(expected: number, precision?: number): void;
  }
}
