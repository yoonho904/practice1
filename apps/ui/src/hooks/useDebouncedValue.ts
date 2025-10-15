import { useState, useEffect } from 'react';

/**
 * Debounces a rapidly changing value to prevent excessive re-renders
 * and expensive computations.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 150ms)
 * @returns The debounced value
 *
 * @example
 * const debouncedSearch = useDebouncedValue(searchTerm, 300);
 */
export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
