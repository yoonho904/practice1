/**
 * Theme configuration for the quantum orbital visualizer
 * Supports both light and dark modes with comprehensive color palettes
 */

export type ThemeMode = 'light' | 'dark';

export interface ParticleColors {
  s: { r: number; g: number; b: number };  // l=0
  p: { r: number; g: number; b: number };  // l=1
  d: { r: number; g: number; b: number };  // l=2
  f: { r: number; g: number; b: number };  // l=3
  g: { r: number; g: number; b: number };  // l=4
}

export interface Theme {
  mode: ThemeMode;

  // Three.js scene colors (hex numbers)
  scene: {
    background: number;
    fog?: number;
  };

  // UI colors (CSS strings)
  ui: {
    background: string;
    text: string;
    textSecondary: string;
    accent: string;

    // Cards
    cardBg: string;
    cardBorder: string;
    cardBorderTop: string;
    cardShadow: string;

    // Controls
    selectBg: string;
    selectBorder: string;
    selectColor: string;
    selectHoverBg: string;

    // Checkboxes
    checkboxAccent: string;
    checkboxBg: string;

    // Sliders
    sliderTrack: string;
    sliderThumb: string;
    sliderActive: string;
  };

  // Particle colors for quantum visualization
  particles: ParticleColors;

  // Axes and grid colors
  axes: {
    x: number;
    y: number;
    z: number;
    grid: number;
  };

  // Nodal planes
  nodal: {
    color: number;
    opacity: number;
  };
}

/**
 * Dark theme - original quantum visualizer aesthetic
 */
export const darkTheme: Theme = {
  mode: 'dark',

  scene: {
    background: 0x0a0a0f,
  },

  ui: {
    background: '#0a0a0f',
    text: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    accent: '#00ff41',

    cardBg: 'rgba(10, 10, 15, 0.85)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    cardBorderTop: 'rgba(255, 255, 255, 0.2)',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',

    selectBg: 'rgba(255, 255, 255, 0.15)',
    selectBorder: 'rgba(255, 255, 255, 0.25)',
    selectColor: '#ffffff',
    selectHoverBg: 'rgba(255, 255, 255, 0.25)',

    checkboxAccent: '#ffffff',
    checkboxBg: 'rgba(255, 255, 255, 0.1)',

    sliderTrack: 'rgba(255, 255, 255, 0.2)',
    sliderThumb: '#ffffff',
    sliderActive: '#00ff41',
  },

  particles: {
    s: { r: 0.55, g: 1.0, b: 0.65 },   // Vibrant green
    p: { r: 0.35, g: 0.82, b: 1.0 },   // Bright cyan
    d: { r: 1.0, g: 0.58, b: 0.15 },   // Luminous orange
    f: { r: 1.0, g: 0.5, b: 1.0 },     // Neon magenta
    g: { r: 1.0, g: 0.97, b: 0.45 },   // Radiant yellow
  },

  axes: {
    x: 0xff0000,  // Red
    y: 0x00ff00,  // Green
    z: 0x0000ff,  // Blue
    grid: 0x333333,
  },

  nodal: {
    color: 0xffffff,
    opacity: 0.15,
  },
};

/**
 * Light theme - clean, professional appearance for bright environments
 */
export const lightTheme: Theme = {
  mode: 'light',

  scene: {
    background: 0xf5f5f7,  // Slightly off-white (Apple-inspired)
  },

  ui: {
    background: '#f5f5f7',
    text: '#000000',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    accent: '#007a33',  // Darker green for better contrast

    cardBg: 'rgba(255, 255, 255, 0.9)',
    cardBorder: 'rgba(0, 0, 0, 0.1)',
    cardBorderTop: 'rgba(0, 0, 0, 0.15)',
    cardShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',

    selectBg: 'rgba(0, 0, 0, 0.05)',
    selectBorder: 'rgba(0, 0, 0, 0.15)',
    selectColor: '#000000',
    selectHoverBg: 'rgba(0, 0, 0, 0.1)',

    checkboxAccent: '#007a33',
    checkboxBg: 'rgba(0, 0, 0, 0.05)',

    sliderTrack: 'rgba(0, 0, 0, 0.15)',
    sliderThumb: '#007a33',
    sliderActive: '#007a33',
  },

  particles: {
    s: { r: 0.08, g: 0.55, b: 0.25 },   // Deep emerald
    p: { r: 0.15, g: 0.45, b: 0.88 },   // Strong sapphire
    d: { r: 0.78, g: 0.22, b: 0.05 },   // Punchy amber-red
    f: { r: 0.7, g: 0.25, b: 0.68 },    // Bold orchid
    g: { r: 0.8, g: 0.6, b: 0.08 },     // Rich gold
  },

  axes: {
    x: 0xcc0000,  // Darker red
    y: 0x00aa00,  // Darker green
    z: 0x0000cc,  // Darker blue
    grid: 0xcccccc,
  },

  nodal: {
    color: 0x333333,
    opacity: 0.2,
  },
};

/**
 * Get theme by mode
 */
export function getTheme(mode: ThemeMode): Theme {
  return mode === 'light' ? lightTheme : darkTheme;
}

/**
 * Get particle color for specific orbital (l value) in current theme
 */
export function getParticleColor(l: number, theme: Theme): { r: number; g: number; b: number } {
  const colors = [
    theme.particles.s,
    theme.particles.p,
    theme.particles.d,
    theme.particles.f,
    theme.particles.g,
  ];

  return colors[l] || colors[0];
}
