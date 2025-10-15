import { useEffect, useRef, type CSSProperties } from 'react';
import type { Theme } from '../themes/theme.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FAQPageProps {
  theme: Theme;
  onClose: () => void;
  isMobile: boolean;
}

interface FAQItem {
  question: string;
  answer: string | string[];
}

// LaTeX equation component
function LatexEquation({ latex, theme }: { latex: string; theme: Theme }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, {
          throwOnError: false,
          displayMode: true,
          output: 'html',
        });
      } catch (e) {
        console.error('KaTeX rendering error:', e);
      }
    }
  }, [latex]);

  return (
    <div
      ref={ref}
      style={{
        margin: '0.75rem 0',
        padding: '1rem 1.5rem',
        backgroundColor: `${theme.ui.background}80`,
        borderLeft: `3px solid ${theme.ui.accent}`,
        borderRadius: '0.25rem',
        overflowX: 'auto',
        fontSize: '1.1rem',
      }}
    />
  );
}

interface FAQItemWithLatex extends FAQItem {
  latex?: string[];
}

const FAQ_CONTENT: FAQItemWithLatex[] = [
  {
    question: 'What are the main equations used in this model?',
    answer: [
      'This visualizer is built on fundamental quantum mechanical equations:',
      '',
      '1. Time-Independent Schrödinger Equation (TISE):',
      '',
      'LATEX:TISE',
      'Where Ĥ is the Hamiltonian operator, ψ is the wave function, and E is energy.',
      '',
      '2. Hydrogen-Like Atom Wave Function:',
      '',
      'LATEX:WAVEFUNCTION',
      'Radial part × Angular part (spherical harmonics)',
      '',
      '3. Energy Levels (Hydrogen-like atoms):',
      '',
      'LATEX:ENERGY',
      'Where Z is atomic number, n is principal quantum number',
      '',
      '4. Radial Wave Function:',
      '',
      'LATEX:RADIAL',
      'Where ρ = 2Zr/(na₀), L is the associated Laguerre polynomial',
      '',
      '5. Angular Wave Function (Spherical Harmonics):',
      '',
      'LATEX:ANGULAR',
      'Where P is the associated Legendre polynomial',
      '',
      '6. Probability Density:',
      '',
      'LATEX:PROBABILITY',
      'The square of the wave function amplitude',
      '',
      '7. Bohr Radius:',
      '',
      'LATEX:BOHR',
      'The characteristic atomic length scale',
      '',
      '8. Orbital Radius (expectation value):',
      '',
      'LATEX:RADIUS',
      'The average distance from nucleus',
      '',
      'These equations are implemented using analytical solutions for maximum accuracy.',
    ],
    latex: [
      'TISE:\\hat{H}\\psi = E\\psi',
      'WAVEFUNCTION:\\psi_{n\\ell m}(r, \\theta, \\varphi) = R_{n\\ell}(r) \\times Y_{\\ell}^{m}(\\theta, \\varphi)',
      'ENERGY:E_n = -13.6 \\text{ eV} \\times \\frac{Z^2}{n^2}',
      'RADIAL:R_{n\\ell}(r) \\propto \\rho^{\\ell} \\times L_{n-\\ell-1}^{2\\ell+1}(\\rho) \\times e^{-\\rho/2}',
      'ANGULAR:Y_{\\ell}^{m}(\\theta, \\varphi) = P_{\\ell}^{m}(\\cos \\theta) \\times e^{im\\varphi}',
      'PROBABILITY:P(r, \\theta, \\varphi) = |\\psi(r, \\theta, \\varphi)|^2',
      'BOHR:a_0 = \\frac{4\\pi\\varepsilon_0\\hbar^2}{m_e e^2} \\approx 52.9 \\text{ pm}',
      'RADIUS:\\langle r \\rangle_{n\\ell} = a_0 \\times \\frac{n^2}{Z} \\times \\left[1 + \\frac{1}{2}\\left(1 - \\frac{\\ell(\\ell+1)}{n^2}\\right)\\right]',
    ],
  },
  {
    question: 'What are quantum numbers?',
    answer: [
      'Quantum numbers are a set of values that describe the unique quantum state of an electron in an atom. There are four quantum numbers:',
      '',
      '• Principal Quantum Number (n): Determines the energy level and size of the orbital. Values: 1, 2, 3, 4... Higher n means higher energy and larger orbital.',
      '',
      '• Angular Momentum Quantum Number (l): Determines the shape of the orbital. Values: 0 to (n-1). Common notations: s (l=0), p (l=1), d (l=2), f (l=3).',
      '',
      '• Magnetic Quantum Number (m): Determines the orientation of the orbital in space. Values: -l to +l. For example, p orbitals (l=1) have three orientations: m=-1, 0, +1.',
      '',
      '• Spin Quantum Number (s): Determines the intrinsic angular momentum of the electron. Values: +½ or -½ (spin up or spin down).',
    ],
  },
  {
    question: 'What model is this visualizer using?',
    answer: [
      'This visualizer uses the Hydrogen-Like Atom Model, which solves the Schrödinger equation for single-electron systems.',
      '',
      'Key features of the model:',
      '• Exact analytical solutions for hydrogen-like atoms (H, He+, Li2+, etc.)',
      '• Wave functions based on spherical harmonics and associated Laguerre polynomials',
      '• Probability density distributions showing where electrons are likely to be found',
      '• Nodal surfaces where the probability of finding an electron is zero',
      '',
      'For multi-electron atoms, we use an effective nuclear charge approximation (Slater\'s rules) to account for electron shielding.',
    ],
  },
  {
    question: 'What do the different orbital shapes mean?',
    answer: [
      's orbitals (l=0): Spherical shape, symmetric in all directions. Found at all energy levels (1s, 2s, 3s...).',
      '',
      'p orbitals (l=1): Dumbbell-shaped, oriented along x, y, or z axes. Available from n=2 onwards. Three orientations: px, py, pz.',
      '',
      'd orbitals (l=2): More complex cloverleaf shapes. Available from n=3 onwards. Five orientations with different spatial arrangements.',
      '',
      'f orbitals (l=3): Even more complex shapes. Available from n=4 onwards. Seven orientations, important for lanthanides and actinides.',
      '',
      'The shapes represent regions of high probability density where electrons are likely to be found 90% of the time.',
    ],
  },
  {
    question: 'What is the probability density cloud?',
    answer: [
      'The probability density cloud shows the spatial distribution of where an electron is likely to be found.',
      '',
      'Unlike the Bohr model (which shows electrons in fixed circular orbits), quantum mechanics describes electrons as probability waves. The density cloud visualizes |ψ|² (the square of the wave function), which gives the probability per unit volume.',
      '',
      'Brighter/denser regions = higher probability of finding the electron',
      'Darker/sparser regions = lower probability',
      'Nodal surfaces (gaps) = zero probability',
      '',
      'You can adjust the density thresholds to show different isosurfaces representing various probability levels.',
    ],
  },
  {
    question: 'What does the energy value represent?',
    answer: [
      'The energy value (in electron volts, eV) represents the binding energy of the electron in that orbital.',
      '',
      'For hydrogen-like atoms, the energy is calculated using: E = -13.6 × Z² / n² eV',
      '',
      'Where:',
      '• Z is the atomic number (nuclear charge)',
      '• n is the principal quantum number',
      '',
      'Negative energy means the electron is bound to the nucleus. Higher n values (like 3s, 4s) have less negative energy, meaning the electron is less tightly bound and easier to remove (ionize).',
      '',
      'The ground state (n=1) has the most negative energy and is the most stable.',
    ],
  },
  {
    question: 'What is the Bohr radius?',
    answer: [
      'The Bohr radius is the most probable distance between the electron and nucleus for a hydrogen atom in its ground state (1s orbital).',
      '',
      'Value: a₀ = 52.9 pm (picometers) or 0.529 Ångströms',
      '',
      'For other orbitals, the characteristic radius scales with n² and Z:',
      'r = a₀ × n² / Z',
      '',
      'This value gives you a sense of the "size" of the orbital. Larger values mean the electron cloud extends further from the nucleus.',
    ],
  },
  {
    question: 'What are nodal planes and surfaces?',
    answer: [
      'Nodal surfaces are regions in space where the probability of finding an electron is exactly zero.',
      '',
      'There are two types:',
      '',
      '1. Radial nodes: Spherical surfaces at specific distances from the nucleus',
      '   Number = n - l - 1',
      '   Example: 2s orbital has 1 radial node',
      '',
      '2. Angular nodes: Planar surfaces passing through the nucleus',
      '   Number = l',
      '   Example: p orbitals (l=1) have 1 nodal plane each',
      '',
      'Total nodes = n - 1',
      '',
      'These nodes are crucial for understanding orbital shapes and chemical bonding.',
    ],
  },
  {
    question: 'What visualization modes are available?',
    answer: [
      'Wave Flow: Animates particles to show the wave-like nature of electrons with time-dependent behavior.',
      '',
      'Static: Shows the time-independent probability distribution without animation.',
      '',
      'Rotation: Automatically rotates the visualization to see the orbital from all angles.',
      '',
      'Distribution Types:',
      '• Probability: Shows particle density matching |ψ|² distribution',
      '• Classical: Shows orbital paths similar to planetary motion (non-quantum)',
      '• Scattered: Random distribution for performance testing',
    ],
  },
  {
    question: 'Why do some elements show simplified orbitals?',
    answer: [
      'For multi-electron atoms (Z > 1), exact analytical solutions don\'t exist due to electron-electron repulsion.',
      '',
      'This visualizer uses several approximations:',
      '',
      '1. Hydrogen-like approximation: Treats each electron as if it\'s alone, but with an effective nuclear charge that accounts for shielding by other electrons',
      '',
      '2. Slater\'s rules: Estimates the screening effect of inner electrons',
      '',
      '3. Single-electron visualization: Shows one electron in a specific orbital, not the full electron configuration',
      '',
      'For highly accurate multi-electron calculations, methods like Hartree-Fock or Density Functional Theory (DFT) would be needed, which are beyond the scope of this real-time visualizer.',
    ],
  },
  {
    question: 'How can I optimize performance?',
    answer: [
      'Several options help maintain smooth frame rates:',
      '',
      'Performance Mode: Reduces particle count and disables expensive calculations',
      '',
      'Particle Count: Lower values (1,000-5,000) render faster but show less detail',
      '',
      'Density Visualization: Disable or reduce grid resolution if experiencing lag',
      '',
      'Mobile: Automatically optimized with lower particle counts and disabled density visualization',
      '',
      'Target: Aim for 30+ FPS for smooth interaction. The FPS counter shows current performance.',
    ],
  },
  {
    question: 'What is the scientific accuracy of this model?',
    answer: [
      'This visualizer is based on rigorous quantum mechanical principles:',
      '',
      '✓ Uses exact solutions to the Schrödinger equation for hydrogen-like atoms',
      '✓ Implements proper spherical harmonics (Yₗᵐ) for angular distributions',
      '✓ Uses associated Laguerre polynomials for radial wave functions',
      '✓ Calculates energies using the Rydberg formula',
      '✓ Follows Pauli exclusion principle and quantum selection rules',
      '',
      'Limitations:',
      '✗ Multi-electron atoms use simplified effective nuclear charge',
      '✗ Electron-electron correlation not fully modeled',
      '✗ Relativistic effects not included (important for heavy atoms)',
      '✗ Spin-orbit coupling not visualized',
      '',
      'This model is excellent for educational purposes and understanding fundamental quantum concepts, comparable to undergraduate-level quantum chemistry.',
    ],
  },
];

export function FAQPage({ theme, onClose, isMobile }: FAQPageProps): JSX.Element {
  const containerStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: theme.ui.background,
    color: theme.ui.text,
    overflowY: 'auto',
    zIndex: 2000,
    WebkitOverflowScrolling: 'touch',
  };

  const headerStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    backgroundColor: theme.ui.cardBg,
    borderBottom: `1px solid ${theme.ui.cardBorder}`,
    padding: isMobile ? '1rem' : '1.5rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  };

  const titleStyle: CSSProperties = {
    fontSize: isMobile ? '1.5rem' : '2rem',
    fontWeight: 700,
    margin: 0,
    color: theme.ui.accent,
  };

  const closeButtonStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.ui.text,
    fontSize: isMobile ? '1.5rem' : '2rem',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const contentStyle: CSSProperties = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: isMobile ? '1.5rem 1rem' : '3rem 2rem',
  };

  const introStyle: CSSProperties = {
    fontSize: isMobile ? '1rem' : '1.1rem',
    lineHeight: 1.6,
    marginBottom: '2rem',
    color: theme.ui.textSecondary,
    padding: isMobile ? '1rem' : '1.5rem',
    backgroundColor: theme.ui.cardBg,
    borderRadius: '0.5rem',
    borderLeft: `4px solid ${theme.ui.accent}`,
  };

  const faqItemStyle: CSSProperties = {
    marginBottom: '2rem',
    padding: isMobile ? '1.25rem' : '1.5rem',
    backgroundColor: theme.ui.cardBg,
    borderRadius: '0.75rem',
    border: `1px solid ${theme.ui.cardBorder}`,
  };

  const questionStyle: CSSProperties = {
    fontSize: isMobile ? '1.1rem' : '1.25rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: theme.ui.accent,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  };

  const answerStyle: CSSProperties = {
    fontSize: isMobile ? '0.95rem' : '1rem',
    lineHeight: 1.7,
    color: theme.ui.text,
    whiteSpace: 'pre-line',
  };

  const iconStyle: CSSProperties = {
    fontSize: '1.25rem',
    flexShrink: 0,
  };

  // Helper to render content with LaTeX equation rendering
  const renderAnswer = (answer: string | string[], latexDefs?: string[]) => {
    const lines = Array.isArray(answer) ? answer : [answer];
    const latexMap = new Map<string, string>();

    // Build map of LaTeX definitions
    if (latexDefs) {
      latexDefs.forEach((def) => {
        const [key, latex] = def.split(':', 2);
        latexMap.set(key, latex);
      });
    }

    return lines.map((line, idx) => {
      // Check if line is a LaTeX placeholder
      if (line.startsWith('LATEX:')) {
        const key = line.substring(6);
        const latex = latexMap.get(key);
        if (latex) {
          return <LatexEquation key={idx} latex={latex} theme={theme} />;
        }
      }

      return <div key={idx}>{line}</div>;
    });
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Quantum Orbital Visualizer - FAQ</h1>
        <button
          style={closeButtonStyle}
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.ui.cardBorder;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Close FAQ"
        >
          ✕
        </button>
      </div>

      <div style={contentStyle}>
        <div style={introStyle}>
          <strong>Welcome to the Quantum Orbital Visualizer!</strong>
          <br /><br />
          This tool helps you explore the fascinating world of quantum mechanics by visualizing
          electron orbitals in atoms. Below you'll find answers to common questions about quantum
          numbers, the physics behind the model, and how to use this application effectively.
        </div>

        {FAQ_CONTENT.map((item, index) => (
          <div key={index} style={faqItemStyle}>
            <div style={questionStyle}>
              <span style={iconStyle}>❓</span>
              <span>{item.question}</span>
            </div>
            <div style={answerStyle}>
              {renderAnswer(item.answer, item.latex)}
            </div>
          </div>
        ))}

        <div style={{ ...introStyle, borderLeft: `4px solid ${theme.ui.accent}`, marginTop: '3rem' }}>
          <strong>Need more help?</strong>
          <br /><br />
          This visualizer is designed for educational purposes. For more detailed quantum mechanics
          resources, consider textbooks like "Introduction to Quantum Mechanics" by Griffiths or
          online courses from platforms like MIT OpenCourseWare.
        </div>
      </div>
    </div>
  );
}
