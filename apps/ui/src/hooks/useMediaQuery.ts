import { useState, useEffect } from 'react';

/**
 * Responsive breakpoints for the application
 */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
} as const;

/**
 * Custom hook to detect media query matches for responsive design.
 * Handles window resize events and returns the current match state.
 *
 * @param query - CSS media query string (e.g., "(max-width: 768px)")
 * @returns boolean indicating if the media query matches
 *
 * @example
 * const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.mobile}px)`);
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Update state when media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers (Safari < 14)
    else {
      // @ts-expect-error - Legacy API
      mediaQuery.addListener(handleChange);
      // @ts-expect-error - Legacy API
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [query]);

  return matches;
}

/**
 * Hook to detect if the current viewport is mobile-sized
 * @returns true if viewport width is less than or equal to mobile breakpoint
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.mobile}px)`);
}

/**
 * Hook to detect if the current viewport is tablet-sized
 * @returns true if viewport width is between mobile and desktop breakpoints
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px)`
  );
}

/**
 * Hook to detect if the current viewport is desktop-sized
 * @returns true if viewport width is greater than tablet breakpoint
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.tablet + 1}px)`);
}

/**
 * Hook to get current device type based on viewport size
 * @returns 'mobile' | 'tablet' | 'desktop'
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  if (isMobile) {
    return 'mobile';
  }
  if (isTablet) {
    return 'tablet';
  }
  return 'desktop';
}
