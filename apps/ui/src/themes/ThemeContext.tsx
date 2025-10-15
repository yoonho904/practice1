import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getTheme, type Theme, type ThemeMode } from './theme.js';

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialMode?: ThemeMode;
}

/**
 * Theme provider component that manages light/dark mode state
 * and provides theme configuration to all child components
 */
export function ThemeProvider({ children, initialMode = 'dark' }: ThemeProviderProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quantum-theme-mode');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    }
    return initialMode;
  });

  const theme = getTheme(themeMode);

  // Save to localStorage when theme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quantum-theme-mode', themeMode);
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const value: ThemeContextValue = {
    theme,
    themeMode,
    toggleTheme,
    setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 *
 * @example
 * const { theme, themeMode, toggleTheme } = useTheme();
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
