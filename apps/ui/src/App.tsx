import { useState } from 'react';
import { QuantumVisualizer } from './QuantumVisualizer';

export type VisualizationMode = 'wave-flow' | 'static' | 'phase-rotation';

export function App(): JSX.Element {
  // State for controls
  const [element, setElement] = useState(1); // Hydrogen
  const [n, setN] = useState(1);
  const [l, setL] = useState(0);
  const [m, setM] = useState(0);
  const [particleCount, setParticleCount] = useState(10000);
  const [noiseIntensity, setNoiseIntensity] = useState(0.3);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('wave-flow');
  const [showAxes, setShowAxes] = useState(false);
  const [showNodalPlanes, setShowNodalPlanes] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [fps, setFps] = useState(0);

  // Auto-enable performance mode for complex simulations
  const isComplexSimulation = particleCount > 8000 || n > 4 || l > 2;

  const getOrbitalName = () => {
    const subshells = ['s', 'p', 'd', 'f', 'g', 'h'];
    return `${n}${subshells[l] || l}`;
  };

  const getElementName = () => {
    const elements = [
      '', 'Hydrogen', 'Helium', 'Lithium', 'Beryllium', 'Boron', 'Carbon', 'Nitrogen', 'Oxygen', 'Fluorine', 'Neon',
      'Sodium', 'Magnesium', 'Aluminum', 'Silicon', 'Phosphorus', 'Sulfur', 'Chlorine', 'Argon', 'Potassium', 'Calcium'
    ];
    const symbols = [
      '', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
      'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'
    ];
    const name = elements[element] || 'Unknown';
    const symbol = symbols[element] || `Z=${element}`;
    const charge = element - 1;
    return charge > 0 ? `${name} (${symbol}${'⁺'.repeat(Math.min(charge, 3))}${charge > 3 ? charge : ''})` : name;
  };

  // Calculate energy in eV for hydrogen-like atom: E_n = -13.6 × Z²/n² eV
  const calculateEnergy = () => {
    const Z = element;
    return -13.6 * (Z * Z) / (n * n);
  };

  // Calculate expected orbital radius in Bohr radii: r = n²/Z
  const calculateRadius = () => {
    return (n * n) / element;
  };

  // Calculate angular momentum quantum number magnitude: L = √(l(l+1)) ℏ
  const calculateAngularMomentum = () => {
    return Math.sqrt(l * (l + 1));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0a0a0f',
      color: '#ffffff',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden'
    }}>
      {/* Floating Header Card */}
      <div style={{
        position: 'absolute',
        left: '1.5rem',
        top: '1.5rem',
        zIndex: 10,
        background: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '1.5rem 2rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        maxWidth: '420px'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          QUANTUM
        </h1>

        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00ff41' }}>{getElementName()}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, opacity: 0.7 }}>
              {getOrbitalName()} orbital
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            gap: '0.5rem 1.5rem',
            fontSize: '0.85rem',
            opacity: 0.85,
            marginTop: '0.5rem'
          }}>
            <span style={{ opacity: 0.7 }}>Energy:</span>
            <span style={{ fontWeight: 600, color: '#00ff41' }}>{calculateEnergy().toFixed(2)} eV</span>

            <span style={{ opacity: 0.7 }}>Radius:</span>
            <span style={{ fontWeight: 600, color: '#00ff41' }}>{calculateRadius().toFixed(2)} a₀</span>

            <span style={{ opacity: 0.7 }}>Angular momentum:</span>
            <span style={{ fontWeight: 600, color: '#00ff41' }}>{calculateAngularMomentum().toFixed(2)} ℏ</span>

            <span style={{ opacity: 0.7 }}>Δθ (uncertainty):</span>
            <span style={{ fontWeight: 600, color: '#00ff41' }}>
              {l === 0 ? '∞' : (Math.PI / Math.sqrt(l * (l + 1))).toFixed(3)} rad
            </span>

            <span style={{ opacity: 0.7 }}>FPS:</span>
            <span style={{ fontWeight: 600, color: '#00ff41' }}>{fps}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Main Canvas - Full Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
        }}>
          <QuantumVisualizer
            atomicNumber={element}
            quantumNumbers={{ n, l, m, s: 0.5 }}
            particleCount={particleCount}
            noiseIntensity={noiseIntensity}
            animationSpeed={animationSpeed}
            visualizationMode={visualizationMode}
            showAxes={showAxes}
            showNodalPlanes={showNodalPlanes}
            performanceMode={performanceMode || isComplexSimulation}
            onFpsUpdate={setFps}
          />
        </div>

        {/* Floating Control Cards */}
        <aside style={{
          position: 'absolute',
          right: '1.5rem',
          top: '1.5rem',
          bottom: '1.5rem',
          width: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
          paddingRight: '0.5rem',
          pointerEvents: 'none'
        }}>
          <ControlSection title="Visualization Mode">
            <ControlGroup label="Motion Type">
              <select
                value={visualizationMode}
                onChange={(e) => setVisualizationMode(e.target.value as VisualizationMode)}
                style={selectStyle}
              >
                <option value="wave-flow">Wave Flow (Artistic)</option>
                <option value="static">Static Quantum (Accurate)</option>
                <option value="phase-rotation">Phase Rotation (Angular Momentum)</option>
              </select>
            </ControlGroup>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, lineHeight: 1.4, marginTop: '0.5rem' }}>
              {visualizationMode === 'wave-flow' && '✨ Flowing probability waves with fade effects'}
              {visualizationMode === 'static' && '🔬 Time-independent quantum state (physically accurate)'}
              {visualizationMode === 'phase-rotation' && '🌀 Orbital rotation based on angular momentum'}
            </div>
          </ControlSection>

          <ControlSection title="Quantum Numbers">
            <ControlGroup label={<span>Element (Z) <span style={{ color: '#00ff41' }}>{element}</span></span>}>
              <select
                value={element}
                onChange={(e) => setElement(parseInt(e.target.value))}
                style={selectStyle}
              >
                {[1, 2, 3, 4, 5, 6].map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </ControlGroup>

            <ControlGroup label={<span>Principal (n) <span style={{ color: '#00ff41' }}>{n}</span></span>}>
              <select
                value={n}
                onChange={(e) => {
                  const newN = parseInt(e.target.value);
                  setN(newN);
                  // Validate and reset l if it's out of range
                  if (l >= newN) {
                    setL(newN - 1);
                    setM(0); // Reset m when l changes
                  }
                }}
                style={selectStyle}
              >
                {[1, 2, 3, 4, 5].map(val => <option key={val} value={val}>{val}</option>)}
              </select>
            </ControlGroup>

            <ControlGroup label={<span>Angular (l) <span style={{ color: '#00ff41' }}>{l}</span></span>}>
              <select
                value={l}
                onChange={(e) => {
                  const newL = parseInt(e.target.value);
                  setL(newL);
                  // Reset m to 0 when l changes (m must be between -l and l)
                  if (Math.abs(m) > newL) {
                    setM(0);
                  }
                }}
                style={selectStyle}
              >
                {Array.from({ length: n }, (_, i) => i).map(val => (
                  <option key={val} value={val}>{val} ({['s', 'p', 'd', 'f', 'g'][val]})</option>
                ))}
              </select>
            </ControlGroup>

            <ControlGroup label={<span>Magnetic (m) <span style={{ color: '#00ff41' }}>{m}</span></span>}>
              <select value={m} onChange={(e) => setM(parseInt(e.target.value))} style={selectStyle}>
                {Array.from({ length: 2 * l + 1 }, (_, i) => i - l).map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </ControlGroup>
          </ControlSection>

          <ControlSection title="Visualization">
            <ControlGroup label={<span>Particle Count: <span style={{ color: '#00ff41' }}>{particleCount}</span></span>}>
              <input
                type="range"
                min="1000"
                max="25000"
                step="500"
                value={particleCount}
                onChange={(e) => setParticleCount(parseInt(e.target.value))}
                style={sliderStyle}
              />
            </ControlGroup>

            <ControlGroup label={<span>Noise Intensity: <span style={{ color: '#00ff41' }}>{noiseIntensity.toFixed(2)}</span></span>}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={noiseIntensity}
                onChange={(e) => setNoiseIntensity(parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </ControlGroup>

            <ControlGroup label={<span>Animation Speed: <span style={{ color: '#00ff41' }}>{animationSpeed.toFixed(1)}x</span></span>}>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                style={sliderStyle}
              />
            </ControlGroup>
          </ControlSection>

          <ControlSection title="Visual Aids">
            <ControlGroup label="">
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={showAxes}
                  onChange={(e) => setShowAxes(e.target.checked)}
                  style={{
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px',
                    accentColor: '#fff'
                  }}
                />
                <span style={{ fontWeight: 500 }}>Show XYZ Axes</span>
              </label>
            </ControlGroup>

            <ControlGroup label="">
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={showNodalPlanes}
                  onChange={(e) => setShowNodalPlanes(e.target.checked)}
                  style={{
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px',
                    accentColor: '#fff'
                  }}
                />
                <span style={{ fontWeight: 500 }}>Show Nodal Planes</span>
              </label>
            </ControlGroup>

            <ControlGroup label="">
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                cursor: 'pointer',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={performanceMode}
                  onChange={(e) => setPerformanceMode(e.target.checked)}
                  style={{
                    cursor: 'pointer',
                    width: '18px',
                    height: '18px',
                    accentColor: '#fff'
                  }}
                />
                <span style={{ fontWeight: 500 }}>Performance Mode</span>
              </label>
              {isComplexSimulation && (
                <div style={{
                  fontSize: '0.75rem',
                  opacity: 0.8,
                  marginTop: '0.5rem',
                  marginLeft: '2rem',
                  fontWeight: 500
                }}>
                  ⚡ Auto-enabled
                </div>
              )}
            </ControlGroup>
          </ControlSection>

          <ControlSection title="Orbital Colors">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgb(51, 255, 77)', boxShadow: '0 0 8px rgba(51, 255, 77, 0.6)' }} />
                <span>s orbital (l=0)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgb(51, 128, 255)', boxShadow: '0 0 8px rgba(51, 128, 255, 0.6)' }} />
                <span>p orbital (l=1)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgb(255, 77, 26)', boxShadow: '0 0 8px rgba(255, 77, 26, 0.6)' }} />
                <span>d orbital (l=2)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'rgb(255, 51, 255)', boxShadow: '0 0 8px rgba(255, 51, 255, 0.6)' }} />
                <span>f orbital (l=3)</span>
              </div>
            </div>
          </ControlSection>

          <div style={{
            background: 'rgba(10, 10, 15, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.85rem',
            lineHeight: 1.7,
            pointerEvents: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.9rem' }}>💡 Tip</div>
            <p style={{ margin: 0, opacity: 0.95 }}>
              Drag to rotate, scroll to zoom. Particles follow quantum probability patterns with wave-like motion.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Helper Components
function ControlSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(10, 10, 15, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      pointerEvents: 'auto'
    }}>
      <h3 style={{
        margin: '0 0 1.25rem 0',
        fontSize: '0.95rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        opacity: 1
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

function ControlGroup({ label, children }: { label: string | React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontSize: '0.85rem',
          opacity: 0.95,
          fontWeight: 600
        }}>
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

// Styles
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  background: 'rgba(255, 255, 255, 0.2)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  accentColor: '#fff',
  cursor: 'pointer',
};
