import type { CSSProperties } from 'react';
import type { Theme } from '../themes/theme.js';
import type { VisualizationMode, DistributionType } from '../QuantumVisualizer.js';

interface MobileControlsProps {
  theme: Theme;
  // Quantum numbers
  element: number;
  n: number;
  l: number;
  m: number;
  onElementChange: (z: number) => void;
  onNChange: (n: number) => void;
  onLChange: (l: number) => void;
  onMChange: (m: number) => void;
  // Visualization
  visualizationMode: VisualizationMode;
  distributionType: DistributionType;
  onVisualizationModeChange: (mode: VisualizationMode) => void;
  onDistributionTypeChange: (type: DistributionType) => void;
  // Visual aids
  showAxes: boolean;
  showNodalPlanes: boolean;
  onShowAxesChange: (show: boolean) => void;
  onShowNodalPlanesChange: (show: boolean) => void;
  // Density visualization
  showDensityVis: boolean;
  densityGridRes: number;
  densityMinThreshold: number;
  densityMaxThreshold: number;
  onShowDensityVisChange: (show: boolean) => void;
  onDensityGridResChange: (res: number) => void;
  onDensityMinThresholdChange: (percent: number) => void;
  onDensityMaxThresholdChange: (percent: number) => void;
  // Element data
  elementData: Array<{ z: number; name: string; symbol: string }>;
  // Quantum info for display
  orbitalName: string;
  elementName: string;
  elementSymbol: string;
  energy: string;
  bohrRadius: string;
  fps?: number;
  particleCount: number;
  orbitalColors: Array<{ label: string; color: string }>;
}

/**
 * Compact mobile control panel with essential quantum controls.
 * Designed for touch interaction with larger tap targets.
 */
export function MobileControls(props: MobileControlsProps): JSX.Element {
  const {
    theme,
    element,
    n,
    l,
    m,
    onElementChange,
    onNChange,
    onLChange,
    onMChange,
    visualizationMode,
    distributionType,
    onVisualizationModeChange,
    onDistributionTypeChange,
    showAxes,
    showNodalPlanes,
    onShowAxesChange,
    onShowNodalPlanesChange,
    showDensityVis,
    densityGridRes,
    densityMinThreshold,
    densityMaxThreshold,
    onShowDensityVisChange,
    onDensityGridResChange,
    onDensityMinThresholdChange,
    onDensityMaxThresholdChange,
    elementData,
    orbitalName,
    elementName,
    elementSymbol,
    energy,
    bohrRadius,
    fps,
    particleCount,
    orbitalColors,
  } = props;

  const sectionStyle: CSSProperties = {
    marginBottom: '1.5rem',
  };

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: theme.ui.text,
    marginBottom: '0.5rem',
  };

  const selectStyle: CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: theme.ui.selectBg,
    color: theme.ui.text,
    border: `1px solid ${theme.ui.selectBorder}`,
    borderRadius: '0.5rem',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(theme.ui.text)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '1.25rem',
    paddingRight: '2.5rem',
  };

  const optionStyle: CSSProperties = {
    backgroundColor: '#ffffff',
    color: '#000000',
  };

  const buttonGroupStyle: CSSProperties = {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  };

  const buttonStyle: CSSProperties = {
    flex: '1 1 calc(50% - 0.25rem)',
    minWidth: '100px',
    padding: '0.75rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    border: `1px solid ${theme.ui.selectBorder}`,
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    WebkitTapHighlightColor: 'transparent',
  };

  const activeButtonStyle: CSSProperties = {
    ...buttonStyle,
    backgroundColor: theme.ui.accent,
    color: '#ffffff',
    borderColor: theme.ui.accent,
  };

  const inactiveButtonStyle: CSSProperties = {
    ...buttonStyle,
    backgroundColor: theme.ui.selectBg,
    color: theme.ui.text,
  };

  const checkboxGroupStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  };

  const checkboxLabelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '1rem',
    color: theme.ui.text,
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    WebkitTapHighlightColor: 'transparent',
  };

  const checkboxStyle: CSSProperties = {
    width: '1.5rem',
    height: '1.5rem',
    cursor: 'pointer',
    accentColor: theme.ui.accent,
  };

  const infoCardStyle: CSSProperties = {
    backgroundColor: theme.ui.cardBg,
    border: `1px solid ${theme.ui.cardBorder}`,
    borderRadius: '1rem',
    padding: '1rem',
    marginBottom: '1.5rem',
  };

  const infoHeaderStyle: CSSProperties = {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: theme.ui.accent,
    marginBottom: '0.75rem',
  };

  const infoGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  };

  const infoStatStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  };

  const infoLabelStyle: CSSProperties = {
    fontSize: '0.75rem',
    color: theme.ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const infoValueStyle: CSSProperties = {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: theme.ui.text,
  };

  const colorLegendStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem',
  };

  const colorItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.75rem',
    color: theme.ui.textSecondary,
  };

  const colorDotStyle = (color: string): CSSProperties => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: color,
  });

  return (
    <div>
      {/* Quantum Info Card */}
      <div style={infoCardStyle}>
        <div style={infoHeaderStyle}>
          {elementName} {orbitalName}
        </div>
        <div style={infoGridStyle}>
          <div style={infoStatStyle}>
            <div style={infoLabelStyle}>Element</div>
            <div style={infoValueStyle}>{elementSymbol} (Z={element})</div>
          </div>
          <div style={infoStatStyle}>
            <div style={infoLabelStyle}>Energy</div>
            <div style={infoValueStyle}>{energy} eV</div>
          </div>
          <div style={infoStatStyle}>
            <div style={infoLabelStyle}>Bohr Radius</div>
            <div style={infoValueStyle}>{bohrRadius} pm</div>
          </div>
          <div style={infoStatStyle}>
            <div style={infoLabelStyle}>Particles</div>
            <div style={infoValueStyle}>{particleCount.toLocaleString()}</div>
          </div>
        </div>
        {fps !== undefined && (
          <div style={{ fontSize: '0.8rem', color: theme.ui.textSecondary, marginTop: '0.5rem' }}>
            {fps} FPS {fps < 30 ? '⚠️' : fps < 50 ? '⚡' : '✅'}
          </div>
        )}

        {/* Orbital Colors Legend */}
        <div style={{ borderTop: `1px solid ${theme.ui.cardBorder}`, paddingTop: '0.75rem', marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: theme.ui.textSecondary, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Orbital Colors
          </div>
          <div style={colorLegendStyle}>
            {orbitalColors.map((item) => (
              <div key={item.label} style={colorItemStyle}>
                <div style={colorDotStyle(item.color)} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Element Selection */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Element</label>
        <select
          value={element}
          onChange={(e) => onElementChange(parseInt(e.target.value, 10))}
          style={selectStyle}
        >
          {elementData.map((el) => (
            <option key={el.z} value={el.z} style={optionStyle}>
              {el.name} ({el.symbol})
            </option>
          ))}
        </select>
      </div>

      {/* Quantum Numbers */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Principal (n)</label>
        <select
          value={n}
          onChange={(e) => onNChange(parseInt(e.target.value, 10))}
          style={selectStyle}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((val) => (
            <option key={val} value={val} style={optionStyle}>
              {val}
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Angular (ℓ)</label>
        <select
          value={l}
          onChange={(e) => onLChange(parseInt(e.target.value, 10))}
          style={selectStyle}
        >
          {Array.from({ length: Math.min(n, 4) }, (_, i) => i).map((val) => (
            <option key={val} value={val} style={optionStyle}>
              {val} ({['s', 'p', 'd', 'f'][val]})
            </option>
          ))}
        </select>
      </div>

      <div style={sectionStyle}>
        <label style={labelStyle}>Magnetic (m)</label>
        <select
          value={m}
          onChange={(e) => onMChange(parseInt(e.target.value, 10))}
          style={selectStyle}
        >
          {Array.from({ length: 2 * l + 1 }, (_, i) => i - l).map((val) => (
            <option key={val} value={val} style={optionStyle}>
              {val}
            </option>
          ))}
        </select>
      </div>

      {/* Visualization Mode */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Visualization Mode</label>
        <div style={buttonGroupStyle}>
          <button
            onClick={() => onVisualizationModeChange('wave-flow')}
            style={visualizationMode === 'wave-flow' ? activeButtonStyle : inactiveButtonStyle}
          >
            Wave Flow
          </button>
          <button
            onClick={() => onVisualizationModeChange('static')}
            style={visualizationMode === 'static' ? activeButtonStyle : inactiveButtonStyle}
          >
            Static
          </button>
          <button
            onClick={() => onVisualizationModeChange('phase-rotation')}
            style={visualizationMode === 'phase-rotation' ? activeButtonStyle : inactiveButtonStyle}
          >
            Rotation
          </button>
        </div>
      </div>

      {/* Distribution Type */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Distribution</label>
        <div style={buttonGroupStyle}>
          <button
            onClick={() => onDistributionTypeChange('accurate')}
            style={distributionType === 'accurate' ? activeButtonStyle : inactiveButtonStyle}
          >
            Accurate
          </button>
          <button
            onClick={() => onDistributionTypeChange('aesthetic')}
            style={distributionType === 'aesthetic' ? activeButtonStyle : inactiveButtonStyle}
          >
            Aesthetic
          </button>
        </div>
      </div>

      {/* Visual Aids */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Visual Aids</label>
        <div style={checkboxGroupStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(e) => onShowAxesChange(e.target.checked)}
              style={checkboxStyle}
            />
            Show Axes
          </label>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={showNodalPlanes}
              onChange={(e) => onShowNodalPlanesChange(e.target.checked)}
              style={checkboxStyle}
            />
            Show Nodal Planes
          </label>
        </div>
      </div>

      {/* Density Visualization */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Density Visualization</label>
        <div style={checkboxGroupStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={showDensityVis}
              onChange={(e) => onShowDensityVisChange(e.target.checked)}
              style={checkboxStyle}
            />
            Enable Probability Density Cloud
          </label>
        </div>

        {showDensityVis && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Grid Resolution: {densityGridRes}³</label>
              <input
                type="range"
                min={16}
                max={64}
                step={8}
                value={densityGridRes}
                onChange={(e) => onDensityGridResChange(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  height: '6px',
                  accentColor: theme.ui.accent,
                  cursor: 'pointer',
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>Min Density: {Math.round(densityMinThreshold * 100)}%</label>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={Math.round(densityMinThreshold * 100)}
                onChange={(e) => onDensityMinThresholdChange(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  height: '6px',
                  accentColor: theme.ui.accent,
                  cursor: 'pointer',
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>Max Density: {Math.round(densityMaxThreshold * 100)}%</label>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={Math.round(densityMaxThreshold * 100)}
                onChange={(e) => onDensityMaxThresholdChange(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  height: '6px',
                  accentColor: theme.ui.accent,
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
