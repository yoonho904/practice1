import { useMemo, useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { HydrogenLikeAtom, type QuantumNumbers } from '../../../services/quantum-engine/src/index.js';
import { QuantumVisualizer, type VisualizationMode, type DistributionType } from './QuantumVisualizer';
import { MolecularBondingVisualizer } from './MolecularBondingVisualizer';
import { useTheme } from './themes/ThemeContext.js';
import { useDebouncedValue } from './hooks/useDebouncedValue.js';
import { useOrbitalPreloader } from './hooks/useOrbitalPreloader.js';
import { useIsMobile } from './hooks/useMediaQuery.js';
import { MobileDrawer } from './components/MobileDrawer.js';
import { MobileControls } from './components/MobileControls.js';
import { FAQPage } from './components/FAQPage.js';
import { TopNav } from './components/TopNav.js';
import type { Theme } from './themes/theme.js';
import type { MolecularOrbitalType } from './physics/molecularOrbitals.js';
import { preloadMolecularOrbitalSample } from './physics/molecularBondingSampler.js';

type SystemMode = 'atomic' | 'molecular';

const ELEMENT_DATA = [
  { z: 1, name: 'Hydrogen', symbol: 'H' },
  { z: 2, name: 'Helium', symbol: 'He' },
  { z: 3, name: 'Lithium', symbol: 'Li' },
  { z: 4, name: 'Beryllium', symbol: 'Be' },
  { z: 5, name: 'Boron', symbol: 'B' },
  { z: 6, name: 'Carbon', symbol: 'C' },
  { z: 7, name: 'Nitrogen', symbol: 'N' },
  { z: 8, name: 'Oxygen', symbol: 'O' },
  { z: 9, name: 'Fluorine', symbol: 'F' },
  { z: 10, name: 'Neon', symbol: 'Ne' },
];

const SUBSHELL_LABELS = ['s', 'p', 'd', 'f', 'g', 'h'];
const BOHR_RADIUS_PM = 52.9177;

const DROPDOWN_OPTION_STYLE: CSSProperties = {
  backgroundColor: '#ffffff',
  color: '#000000',
};

function clampMagnetic(m: number, l: number): number {
  if (l <= 0) {
    return 0;
  }
  return Math.min(Math.max(m, -l), l);
}

function formatNumber(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(fractionDigits);
}

function toRgb(color: { r: number; g: number; b: number }): string {
  return `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(
    color.b * 255,
  )})`;
}

export function App(): JSX.Element {
  const { theme, themeMode, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const [element, setElement] = useState(1);
  const [n, setN] = useState(1);
  const [l, setL] = useState(0);
  const [m, setM] = useState(0);
  const [particleCount, setParticleCount] = useState(10000);
  const [noiseIntensity, setNoiseIntensity] = useState(0.3);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>('wave-flow');
  const [distributionType, setDistributionType] =
    useState<DistributionType>('accurate');
  const [showAxes, setShowAxes] = useState(false);
  const [showNodalPlanes, setShowNodalPlanes] = useState(false);
  const [showDensityVis, setShowDensityVis] = useState(false);
  const [densityGridRes, setDensityGridRes] = useState(32);
  const [densityMinThreshold, setDensityMinThreshold] = useState(0.1);
  const [densityMaxThreshold, setDensityMaxThreshold] = useState(1.0);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [fps, setFps] = useState(0);
  const [showFAQ, setShowFAQ] = useState(false);
  const [systemMode, setSystemMode] = useState<SystemMode>('atomic');
  const [bondLength, setBondLength] = useState(1.4); // Bond length in Bohr radii (default H-H equilibrium)
  const [molecularOrbitalType, setMolecularOrbitalType] = useState<MolecularOrbitalType>('sigma');

  const isDarkMode = themeMode === 'dark';

  useEffect(() => {
    const atomA = new HydrogenLikeAtom(1);
    const atomB = new HydrogenLikeAtom(1);
    const molecularQuantum: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };
    preloadMolecularOrbitalSample({
      atomA,
      atomB,
      quantumNumbers: molecularQuantum,
      particleCount,
      bondLength,
      themeMode,
      orbitalType: molecularOrbitalType,
    });
  }, [particleCount, bondLength, themeMode, molecularOrbitalType]);

  // Mobile performance optimizations
  useEffect(() => {
    if (!isMobile) {
      return;
    }

    setParticleCount((count) => (count > 5000 ? 5000 : count));
    setPerformanceMode(true);
    setShowDensityVis(false);
  }, [isMobile]);

  const debouncedElement = useDebouncedValue(element, 120);
  const debouncedN = useDebouncedValue(n, 120);
  const debouncedL = useDebouncedValue(l, 120);
  const debouncedM = useDebouncedValue(m, 120);

  const validatedL = useMemo(
    () => Math.max(0, Math.min(debouncedL, Math.max(debouncedN - 1, 0))),
    [debouncedL, debouncedN],
  );
  const validatedM = useMemo(
    () => clampMagnetic(debouncedM, validatedL),
    [debouncedM, validatedL],
  );

  const quantumNumbers = useMemo<QuantumNumbers>(
    () => ({
      n: debouncedN,
      l: validatedL,
      m: validatedM,
      s: 0.5,
    }),
    [debouncedN, validatedL, validatedM],
  );

  const preloader = useOrbitalPreloader({
    atomicNumber: debouncedElement,
    quantumNumbers,
    particleCount,
    isDarkBackground: isDarkMode,
    distributionType,
  });

  const autoPerformance = useMemo(
    () => particleCount > 8000 || quantumNumbers.n > 4 || quantumNumbers.l > 2,
    [particleCount, quantumNumbers.n, quantumNumbers.l],
  );
  const activePerformanceMode = performanceMode || autoPerformance;

  const elementInfo = useMemo(() => {
    const info = ELEMENT_DATA.find((entry) => entry.z === debouncedElement);
    if (info) {
      return info;
    }
    return { z: debouncedElement, name: `Z=${debouncedElement}`, symbol: `Z${debouncedElement}` };
  }, [debouncedElement]);

  const orbitalLabel = useMemo(() => {
    const subshell = SUBSHELL_LABELS[quantumNumbers.l] ?? quantumNumbers.l.toString();
    return `${quantumNumbers.n}${subshell}`;
  }, [quantumNumbers.l, quantumNumbers.n]);

  const energyEv = useMemo(
    () => -13.6 * (debouncedElement ** 2) / (quantumNumbers.n ** 2),
    [debouncedElement, quantumNumbers.n],
  );

  const radiusBohr = useMemo(
    () => (quantumNumbers.n ** 2) / Math.max(debouncedElement, 1),
    [quantumNumbers.n, debouncedElement],
  );

  const angularMomentum = useMemo(
    () => Math.sqrt(quantumNumbers.l * (quantumNumbers.l + 1)),
    [quantumNumbers.l],
  );

  const angleUncertainty = useMemo(() => {
    if (quantumNumbers.l === 0) {
      return Infinity;
    }
    return Math.PI / Math.sqrt(quantumNumbers.l * (quantumNumbers.l + 1));
  }, [quantumNumbers.l]);

  const legendEntries = useMemo(
    () => [
      { label: 's orbital (l=0)', color: toRgb(theme.particles.s) },
      { label: 'p orbital (l=1)', color: toRgb(theme.particles.p) },
      { label: 'd orbital (l=2)', color: toRgb(theme.particles.d) },
      { label: 'f orbital (l=3)', color: toRgb(theme.particles.f) },
      { label: 'g orbital (l=4)', color: toRgb(theme.particles.g) },
    ],
    [theme.particles.d, theme.particles.f, theme.particles.g, theme.particles.p, theme.particles.s],
  );

  const rootStyle = useMemo<CSSProperties>(
    () => ({
      display: isMobile ? 'block' : 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '320px minmax(0, 1fr) 380px',
      height: '100vh',
      background: theme.ui.background,
      color: theme.ui.text,
      fontFamily:
        '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
      position: 'relative',
    }),
    [theme.ui.background, theme.ui.text, isMobile],
  );

  const sideColumnStyle = useMemo<CSSProperties>(
    () => ({
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      padding: '1.5rem',
      overflowY: 'auto',
      pointerEvents: 'none',
    }),
    [],
  );

  const visualizationColumnStyle = useMemo<CSSProperties>(
    () => ({
      position: 'relative',
      minHeight: 0,
    }),
    [],
  );

  const cardStyle = useMemo<CSSProperties>(
    () => ({
      background: theme.ui.cardBg,
      border: `1px solid ${theme.ui.cardBorder}`,
      borderRadius: '20px',
      padding: '1.5rem',
      boxShadow: theme.ui.cardShadow,
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      pointerEvents: 'auto',
      backdropFilter: 'blur(16px)',
    }),
    [theme.ui.cardBg, theme.ui.cardBorder, theme.ui.cardShadow],
  );

  const selectStyle = useMemo<CSSProperties>(
    () => ({
      width: '100%',
      padding: '0.75rem 1rem',
      background: theme.ui.selectBg,
      border: `1px solid ${theme.ui.selectBorder}`,
      borderRadius: '12px',
      color: theme.ui.selectColor,
      fontSize: '0.9rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
    [theme.ui.selectBg, theme.ui.selectBorder, theme.ui.selectColor],
  );

  const sliderStyle = useMemo<CSSProperties>(
    () => ({
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      accentColor: theme.ui.sliderActive,
      cursor: 'pointer',
    }),
    [theme.ui.sliderActive],
  );

  const checkboxAccent = theme.ui.checkboxAccent;

  const handleElementChange = (value: number) => {
    setElement(value);
  };

  const handlePrincipalChange = (value: number) => {
    setN(value);
    if (l >= value) {
      const nextL = Math.max(0, value - 1);
      setL(nextL);
      setM(clampMagnetic(m, nextL));
    }
  };

  const handleAngularChange = (value: number) => {
    setL(value);
    if (Math.abs(m) > value) {
      setM(clampMagnetic(m, value));
    }
  };

  const handleMinThresholdChange = (percent: number) => {
    const normalized = Math.min(percent / 100, densityMaxThreshold - 0.01);
    setDensityMinThreshold(Math.max(0, normalized));
  };

  const handleMaxThresholdChange = (percent: number) => {
    const normalized = Math.max(percent / 100, densityMinThreshold + 0.01);
    setDensityMaxThreshold(Math.min(1, normalized));
  };

  // FAQ overlay (shown on both mobile and desktop)
  if (showFAQ) {
    return <FAQPage theme={theme} onClose={() => setShowFAQ(false)} isMobile={isMobile} />;
  }

  // Mobile layout - simplified with drawer
  if (isMobile) {
    return (
      <div
        data-testid="app-root"
        data-theme-mode={themeMode}
        style={{
          display: 'block',
          height: '100vh',
          background: theme.ui.background,
          color: theme.ui.text,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <TopNav
          theme={theme}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
          onOpenFAQ={() => setShowFAQ(true)}
          isMobile={isMobile}
        />

        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '100vh',
            backgroundColor: theme.scene.background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {systemMode === 'atomic' ? (
            <QuantumVisualizer
              atomicNumber={debouncedElement}
              quantumNumbers={quantumNumbers}
              particleCount={particleCount}
              noiseIntensity={noiseIntensity}
              animationSpeed={animationSpeed}
              visualizationMode={visualizationMode}
              distributionType={distributionType}
              showAxes={showAxes}
              showNodalPlanes={showNodalPlanes}
              showDensityVisualization={showDensityVis}
              densityGridResolution={densityGridRes}
              densityMinThreshold={densityMinThreshold}
              densityMaxThreshold={densityMaxThreshold}
              performanceMode={activePerformanceMode}
              onFpsUpdate={setFps}
              themeMode={themeMode}
              backgroundColor={theme.scene.background}
              preloader={preloader}
            />
          ) : (
            <MolecularBondingVisualizer
              particleCount={particleCount}
              noiseIntensity={noiseIntensity}
              animationSpeed={animationSpeed}
              visualizationMode={visualizationMode}
              showAxes={showAxes}
              performanceMode={activePerformanceMode}
              onFpsUpdate={setFps}
              themeMode={themeMode}
              backgroundColor={theme.scene.background}
              bondLength={bondLength}
              orbitalType={molecularOrbitalType}
              showDensitySurface={showDensityVis}
              densityResolution={densityGridRes}
            />
          )}
        </div>

        <MobileDrawer theme={theme} defaultOpen={false}>
          <MobileControls
            theme={theme}
            element={element}
            n={n}
            l={l}
            m={m}
            onElementChange={setElement}
            onNChange={handlePrincipalChange}
            onLChange={handleAngularChange}
            onMChange={setM}
            visualizationMode={visualizationMode}
            distributionType={distributionType}
            onVisualizationModeChange={setVisualizationMode}
            onDistributionTypeChange={setDistributionType}
            showAxes={showAxes}
            showNodalPlanes={showNodalPlanes}
            onShowAxesChange={setShowAxes}
            onShowNodalPlanesChange={setShowNodalPlanes}
            showDensityVis={showDensityVis}
            densityGridRes={densityGridRes}
            densityMinThreshold={densityMinThreshold}
            densityMaxThreshold={densityMaxThreshold}
            onShowDensityVisChange={setShowDensityVis}
            onDensityGridResChange={setDensityGridRes}
            onDensityMinThresholdChange={handleMinThresholdChange}
            onDensityMaxThresholdChange={handleMaxThresholdChange}
            elementData={ELEMENT_DATA}
            orbitalName={`${orbitalLabel} orbital`}
            elementName={elementInfo.name}
            elementSymbol={elementInfo.symbol}
            energy={formatNumber(energyEv, 2)}
            bohrRadius={formatNumber(radiusBohr * BOHR_RADIUS_PM, 0)}
            fps={fps}
            particleCount={particleCount}
            orbitalColors={legendEntries}
          />
        </MobileDrawer>
      </div>
    );
  }

  // Desktop layout - full 3-column grid
  return (
    <div
      data-testid="app-root"
      data-theme-mode={themeMode}
      style={rootStyle}
    >
      <TopNav
        theme={theme}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onOpenFAQ={() => setShowFAQ(true)}
        isMobile={isMobile}
      />

      <aside style={sideColumnStyle}>
        <div style={cardStyle}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '2rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: theme.ui.text,
              }}
            >
              {systemMode === 'atomic' ? 'Quantum Orbital' : 'Molecular Bonding'}
            </h1>
            <div
              style={{
                marginTop: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              {systemMode === 'atomic' ? (
                <>
                  <span
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: theme.ui.accent,
                    }}
                  >
                    {elementInfo.name} ({elementInfo.symbol})
                  </span>
                  <span
                    style={{
                      fontSize: '1rem',
                      color: theme.ui.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    {orbitalLabel} orbital
                  </span>
                </>
              ) : (
                <>
                  <span
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: theme.ui.accent,
                    }}
                  >
                    H₂ Molecule
                  </span>
                  <span
                    style={{
                      fontSize: '1rem',
                      color: theme.ui.textSecondary,
                      fontWeight: 600,
                    }}
                  >
                    σ bonding orbital (1sₐ + 1sᵦ)
                  </span>
                </>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '0.75rem 1.25rem',
              fontSize: '0.85rem',
              color: theme.ui.textSecondary,
            }}
          >
            {systemMode === 'atomic' ? (
              <>
                <InfoStat label="Energy" value={`${formatNumber(energyEv, 2)} eV`} accent={theme.ui.accent} />
                <InfoStat
                  label="Radius"
                  value={`${formatNumber(radiusBohr, 2)} a₀ / ${formatNumber(radiusBohr * BOHR_RADIUS_PM, 0)} pm`}
                  accent={theme.ui.accent}
                />
                <InfoStat
                  label="Angular momentum"
                  value={`${formatNumber(angularMomentum, 2)} ℏ`}
                  accent={theme.ui.accent}
                />
                <InfoStat
                  label="Δθ uncertainty"
                  value={Number.isFinite(angleUncertainty) ? `${formatNumber(angleUncertainty, 3)} rad` : '∞'}
                  accent={theme.ui.accent}
                />
                <InfoStat label="Particles" value={particleCount.toLocaleString()} accent={theme.ui.accent} />
                <InfoStat label="FPS" value={fps.toString()} accent={theme.ui.accent} />
              </>
            ) : (
              <>
                <InfoStat
                  label="Bond length"
                  value={`${(bondLength * BOHR_RADIUS_PM / 100).toFixed(2)} Å / ${bondLength.toFixed(1)} a₀`}
                  accent={theme.ui.accent}
                />
                <InfoStat label="Bond type" value="σ (sigma)" accent={theme.ui.accent} />
                <InfoStat label="Bond order" value="1 (single)" accent={theme.ui.accent} />
                <InfoStat label="Orbital type" value="Bonding MO" accent={theme.ui.accent} />
                <InfoStat label="Particles" value={particleCount.toLocaleString()} accent={theme.ui.accent} />
                <InfoStat label="FPS" value={fps.toString()} accent={theme.ui.accent} />
              </>
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: theme.ui.text,
            }}
          >
            Orbital Colors
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.9rem',
            }}
          >
            {legendEntries.map((entry) => (
              <div
                key={entry.label}
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: entry.color,
                    boxShadow: `0 0 8px ${entry.color}66`,
                  }}
                />
                <span>{entry.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: theme.ui.text,
            }}
          >
            {systemMode === 'atomic' ? 'Tips' : 'About H-H Bonding'}
          </h2>
          {systemMode === 'atomic' ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.9rem',
                color: theme.ui.textSecondary,
              }}
            >
              <li>Drag to rotate; scroll to zoom.</li>
              <li>Phase rotation highlights angular momentum.</li>
              <li>Enable density visualization for textbook-style probability clouds.</li>
            </ul>
          ) : (
            <ul
              style={{
                margin: 0,
                paddingLeft: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.9rem',
                color: theme.ui.textSecondary,
              }}
            >
              <li>Visualizes σ bonding molecular orbital formed by constructive interference of two 1s orbitals.</li>
              <li>Bond length: 0.74 Å (equilibrium H-H distance).</li>
              <li>Higher electron density between nuclei stabilizes the bond.</li>
              <li>Preview of future molecule building features.</li>
            </ul>
          )}
        </div>
      </aside>

      <main style={visualizationColumnStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
          }}
        >
          {systemMode === 'atomic' ? (
            <QuantumVisualizer
              atomicNumber={debouncedElement}
              quantumNumbers={quantumNumbers}
              particleCount={particleCount}
              noiseIntensity={noiseIntensity}
              animationSpeed={animationSpeed}
              visualizationMode={visualizationMode}
              distributionType={distributionType}
              showAxes={showAxes}
              showNodalPlanes={showNodalPlanes}
              showDensityVisualization={showDensityVis}
              densityGridResolution={densityGridRes}
              densityMinThreshold={densityMinThreshold}
              densityMaxThreshold={densityMaxThreshold}
              performanceMode={activePerformanceMode}
              onFpsUpdate={setFps}
              themeMode={themeMode}
              backgroundColor={theme.scene.background}
              preloader={preloader}
            />
          ) : (
            <MolecularBondingVisualizer
              particleCount={particleCount}
              noiseIntensity={noiseIntensity}
              animationSpeed={animationSpeed}
              visualizationMode={visualizationMode}
              showAxes={showAxes}
              performanceMode={activePerformanceMode}
              onFpsUpdate={setFps}
              themeMode={themeMode}
              backgroundColor={theme.scene.background}
              bondLength={bondLength}
            />
          )}
        </div>
      </main>

      <aside style={sideColumnStyle}>
        <ControlSection title="System Mode" theme={theme}>
          <ControlGroup label="View" htmlFor="system-mode" theme={theme}>
            <select
              id="system-mode"
              value={systemMode}
              onChange={(event) => setSystemMode(event.target.value as SystemMode)}
              style={selectStyle}
            >
              <option value="atomic" style={DROPDOWN_OPTION_STYLE}>
                Atomic Orbital
              </option>
              <option value="molecular" style={DROPDOWN_OPTION_STYLE}>
                Molecular (H-H Bonding)
              </option>
            </select>
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              {systemMode === 'atomic'
                ? 'Single atom quantum orbital visualization'
                : `Hydrogen-hydrogen ${molecularOrbitalType === 'sigma' ? 'σ bonding' : 'σ* antibonding'} molecular orbital`}
            </div>
          </ControlGroup>
        </ControlSection>

        {systemMode === 'molecular' && (
          <ControlSection title="Molecular Properties" theme={theme}>
            <ControlGroup label="Bond Length" htmlFor="bond-length-range" theme={theme}>
              <input
                id="bond-length-range"
                type="range"
                min={0.5}
                max={5.0}
                step={0.1}
                value={bondLength}
                onChange={(event) => setBondLength(parseFloat(event.target.value))}
                style={sliderStyle}
              />
              <div
                style={{
                  marginTop: '0.4rem',
                  fontSize: '0.8rem',
                  color: theme.ui.textSecondary,
                }}
              >
                {bondLength.toFixed(1)} a₀ ({(bondLength * BOHR_RADIUS_PM / 100).toFixed(2)} Å)
              </div>
              <div
                style={{
                  marginTop: '0.4rem',
                  fontSize: '0.75rem',
                  color: theme.ui.textSecondary,
                  fontStyle: 'italic',
                }}
              >
                Equilibrium H-H bond: 1.4 a₀ (0.74 Å)
              </div>
            </ControlGroup>
            <ControlGroup label="Orbital Type" htmlFor="bonding-type" theme={theme}>
              <div
                id="bonding-type"
                style={{
                  display: 'flex',
                  gap: '0.8rem',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <input
                    type="radio"
                    name="molecular-orbital-type"
                    value="sigma"
                    checked={molecularOrbitalType === 'sigma'}
                    onChange={() => setMolecularOrbitalType('sigma')}
                  />
                  σ Bonding (constructive)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <input
                    type="radio"
                    name="molecular-orbital-type"
                    value="sigma*"
                    checked={molecularOrbitalType === 'sigma*'}
                    onChange={() => setMolecularOrbitalType('sigma*')}
                  />
                  σ* Antibonding (destructive)
                </label>
              </div>
              <div
                style={{
                  marginTop: '0.35rem',
                  fontSize: '0.75rem',
                  color: theme.ui.textSecondary,
                }}
              >
                Bonding fills the internuclear region; antibonding introduces a node and phase inversion.
              </div>
            </ControlGroup>
          </ControlSection>
        )}

        <ControlSection title="Visualization Mode" theme={theme}>
          <ControlGroup label="Motion Type" htmlFor="visualization-mode" theme={theme}>
            <select
              id="visualization-mode"
              value={visualizationMode}
              onChange={(event) =>
                setVisualizationMode(event.target.value as VisualizationMode)
              }
              style={selectStyle}
            >
              <option value="wave-flow" style={DROPDOWN_OPTION_STYLE}>
                Wave Flow (Artistic)
              </option>
              <option value="static" style={DROPDOWN_OPTION_STYLE}>
                Static Quantum (Accurate)
              </option>
              <option value="phase-rotation" style={DROPDOWN_OPTION_STYLE}>
                Phase Rotation (Angular Momentum)
              </option>
            </select>
          </ControlGroup>
          <ControlGroup label="Distribution" htmlFor="distribution-type" theme={theme}>
            <select
              id="distribution-type"
              value={distributionType}
              onChange={(event) => setDistributionType(event.target.value as DistributionType)}
              style={selectStyle}
            >
              <option value="accurate" style={DROPDOWN_OPTION_STYLE}>
                Accurate (Monte Carlo)
              </option>
              <option value="aesthetic" style={DROPDOWN_OPTION_STYLE}>
                Aesthetic (Smooth Shells)
              </option>
            </select>
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              Accurate samples the wave function; aesthetic snaps particles into clean shells.
            </div>
          </ControlGroup>
          <div
            style={{
              fontSize: '0.85rem',
              color: theme.ui.textSecondary,
            }}
          >
            {visualizationMode === 'wave-flow' &&
              'Particles teleport between probability hot-spots to reveal density gradients.'}
            {visualizationMode === 'static' &&
              'Displays a time-independent probability distribution sampled from the true wave function.'}
            {visualizationMode === 'phase-rotation' &&
              'Applies angular momentum-driven rotation with subtle quantum jitter.'}
          </div>
        </ControlSection>

        {systemMode === 'atomic' && (
          <ControlSection title="Quantum Numbers" theme={theme}>
            <ControlGroup label="Element (Z)" htmlFor="element-select" theme={theme}>
            <select
              id="element-select"
              value={element}
              onChange={(event) => handleElementChange(parseInt(event.target.value, 10))}
              style={selectStyle}
            >
              {ELEMENT_DATA.map((entry) => (
                <option key={entry.z} value={entry.z} style={DROPDOWN_OPTION_STYLE}>
                  {entry.z} — {entry.name}
                </option>
              ))}
            </select>
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              Current: {elementInfo.name}
            </div>
          </ControlGroup>

          <ControlGroup label="Principal (n)" htmlFor="principal-select" theme={theme}>
            <select
              id="principal-select"
              value={n}
              onChange={(event) => handlePrincipalChange(parseInt(event.target.value, 10))}
              style={selectStyle}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value} style={DROPDOWN_OPTION_STYLE}>
                  {value}
                </option>
              ))}
            </select>
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              Current: n = {quantumNumbers.n}
            </div>
          </ControlGroup>

          <ControlGroup label="Angular (ℓ)" htmlFor="angular-select" theme={theme}>
            <select
              id="angular-select"
              value={l}
              onChange={(event) => handleAngularChange(parseInt(event.target.value, 10))}
              style={selectStyle}
            >
              {Array.from({ length: n }, (_, index) => index).map((value) => (
                <option key={value} value={value} style={DROPDOWN_OPTION_STYLE}>
                  {value} ({SUBSHELL_LABELS[value] ?? value})
                </option>
              ))}
            </select>
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              Current: ℓ = {quantumNumbers.l}
            </div>
          </ControlGroup>

          <ControlGroup label="Magnetic (m)" htmlFor="magnetic-select" theme={theme}>
            <select
              id="magnetic-select"
              value={m}
              onChange={(event) => setM(parseInt(event.target.value, 10))}
              style={selectStyle}
            >
              {Array.from(
                { length: 2 * quantumNumbers.l + 1 },
                (_, index) => index - quantumNumbers.l,
              ).map((value) => (
                <option key={value} value={value} style={DROPDOWN_OPTION_STYLE}>
                  {value}
                </option>
              ))}
            </select>
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              Current: m = {quantumNumbers.m}
            </div>
          </ControlGroup>
          </ControlSection>
        )}

        <ControlSection title="Visualization" theme={theme}>
          <ControlGroup label="Particle Count" htmlFor="particle-count-range" theme={theme}>
            <input
              id="particle-count-range"
              type="range"
              min={1000}
              max={25000}
              step={500}
              value={particleCount}
              onChange={(event) => setParticleCount(parseInt(event.target.value, 10))}
              style={sliderStyle}
            />
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              {particleCount.toLocaleString()} particles
            </div>
          </ControlGroup>

          <ControlGroup label="Noise Intensity" htmlFor="noise-range" theme={theme}>
            <input
              id="noise-range"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={noiseIntensity}
              onChange={(event) => setNoiseIntensity(parseFloat(event.target.value))}
              style={sliderStyle}
            />
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              {noiseIntensity.toFixed(2)}
            </div>
          </ControlGroup>

          <ControlGroup label="Animation Speed" htmlFor="speed-range" theme={theme}>
            <input
              id="speed-range"
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={animationSpeed}
              onChange={(event) => setAnimationSpeed(parseFloat(event.target.value))}
              style={sliderStyle}
            />
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              {animationSpeed.toFixed(1)}x
            </div>
          </ControlGroup>
        </ControlSection>

        <ControlSection title="Visual Aids" theme={theme}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: theme.ui.checkboxBg,
              border: `1px solid ${theme.ui.selectBorder}`,
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            <input
              type="checkbox"
              checked={showAxes}
              onChange={(event) => setShowAxes(event.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: checkboxAccent,
                cursor: 'pointer',
              }}
            />
            <span style={{ fontWeight: 500 }}>Show XYZ Axes</span>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: theme.ui.checkboxBg,
              border: `1px solid ${theme.ui.selectBorder}`,
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            <input
              type="checkbox"
              checked={showNodalPlanes}
              onChange={(event) => setShowNodalPlanes(event.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: checkboxAccent,
                cursor: 'pointer',
              }}
            />
            <span style={{ fontWeight: 500 }}>Show Nodal Planes</span>
          </label>

          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: theme.ui.checkboxBg,
                border: `1px solid ${theme.ui.selectBorder}`,
                cursor: 'pointer',
                pointerEvents: 'auto',
              }}
            >
              <input
                type="checkbox"
                checked={performanceMode}
                onChange={(event) => setPerformanceMode(event.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: checkboxAccent,
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontWeight: 500 }}>Performance Mode</span>
            </label>
            {autoPerformance && (
              <div
                style={{
                  fontSize: '0.8rem',
                  marginTop: '0.35rem',
                  color: theme.ui.textSecondary,
                  paddingLeft: '0.5rem',
                }}
              >
                ⚡ Auto-enabled for large/complex orbitals
              </div>
            )}
          </div>
        </ControlSection>

        <ControlSection title="Density Visualization" theme={theme}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: theme.ui.checkboxBg,
              border: `1px solid ${theme.ui.selectBorder}`,
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            <input
              type="checkbox"
              checked={showDensityVis}
              onChange={(event) => setShowDensityVis(event.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: checkboxAccent,
                cursor: 'pointer',
              }}
            />
            <span style={{ fontWeight: 500 }}>Enable probability density cloud</span>
          </label>

          <ControlGroup label="Grid Resolution" htmlFor="density-grid-range" theme={theme}>
            <input
              id="density-grid-range"
              type="range"
              min={16}
              max={64}
              step={8}
              value={densityGridRes}
              onChange={(event) => setDensityGridRes(parseInt(event.target.value, 10))}
              style={sliderStyle}
              disabled={!showDensityVis}
            />
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              {densityGridRes}³ samples (
              {showDensityVis ? 'higher = more detail, slower' : 'enable to adjust'})
            </div>
          </ControlGroup>

          <ControlGroup label="Min Density" htmlFor="density-min-range" theme={theme}>
            <input
              id="density-min-range"
              type="range"
              min={0}
              max={50}
              step={1}
              value={Math.round(densityMinThreshold * 100)}
              onChange={(event) => handleMinThresholdChange(parseInt(event.target.value, 10))}
              style={sliderStyle}
              disabled={!showDensityVis}
            />
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              {Math.round(densityMinThreshold * 100)}%
            </div>
          </ControlGroup>

          <ControlGroup label="Max Density" htmlFor="density-max-range" theme={theme}>
            <input
              id="density-max-range"
              type="range"
              min={50}
              max={100}
              step={1}
              value={Math.round(densityMaxThreshold * 100)}
              onChange={(event) => handleMaxThresholdChange(parseInt(event.target.value, 10))}
              style={sliderStyle}
              disabled={!showDensityVis}
            />
            <div
              style={{
                marginTop: '0.4rem',
                fontSize: '0.8rem',
                color: theme.ui.textSecondary,
              }}
            >
              {Math.round(densityMaxThreshold * 100)}%
            </div>
          </ControlGroup>
        </ControlSection>
      </aside>
    </div>
  );
}

interface InfoStatProps {
  label: string;
  value: string;
  accent: string;
}

function InfoStat({ label, value, accent }: InfoStatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.78rem' }}>{label}</span>
      <span style={{ fontWeight: 600, color: accent }}>{value}</span>
    </div>
  );
}

interface ControlSectionProps {
  title: string;
  children: ReactNode;
  theme: Theme;
}

function ControlSection({ title, children, theme }: ControlSectionProps) {
  return (
    <div
      style={{
        background: theme.ui.cardBg,
        border: `1px solid ${theme.ui.cardBorder}`,
        borderRadius: '20px',
        padding: '1.5rem',
        boxShadow: theme.ui.cardShadow,
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        pointerEvents: 'auto',
        backdropFilter: 'blur(16px)',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '0.95rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: theme.ui.textSecondary,
        }}
      >
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

interface ControlGroupProps {
  label?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  theme: Theme;
}

function ControlGroup({ label, htmlFor, children, theme }: ControlGroupProps) {
  return (
    <div>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: theme.ui.textSecondary,
          }}
        >
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
