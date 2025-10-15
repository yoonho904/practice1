import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { HydrogenLikeAtom, type QuantumNumbers } from '../../../services/quantum-engine/src/index.js';
import { createEnhancedAxes } from './helpers/createEnhancedAxes.js';
import type { ThemeMode } from './themes/theme.js';
import {
  calculateBondingNormalization,
  calculateMolecularOrbitalAmplitude,
  calculateMolecularOrbitalDensity,
  calculateOverlapIntegral1s,
  type MolecularOrbitalType,
} from './physics/molecularOrbitals.js';
import { generateMolecularOrbitalSample } from './physics/molecularBondingSampler.js';

export type VisualizationMode = 'wave-flow' | 'static' | 'phase-rotation';

interface Props {
  particleCount: number;
  noiseIntensity: number;
  animationSpeed: number;
  visualizationMode: VisualizationMode;
  showAxes: boolean;
  performanceMode: boolean;
  onFpsUpdate: (fps: number) => void;
  themeMode: ThemeMode;
  backgroundColor: number;
  bondLength: number; // In Bohr radii
  orbitalType?: MolecularOrbitalType;
  showDensitySurface: boolean;
  densityResolution?: number;
}

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  particles: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  atomA: HydrogenLikeAtom;
  atomB: HydrogenLikeAtom;
  time: number;
  basePositions: Float32Array;
  transitionProgress: Float32Array;
  allValidPositions: Float32Array;
  amplitudes: Float32Array;
  axesGroup: THREE.Group;
  ambientLight: THREE.AmbientLight;
  bondAxis: THREE.ArrowHelper;
  nucleusA: THREE.Mesh;
  nucleusB: THREE.Mesh;
  bondLength: number;
  orbitalType: MolecularOrbitalType;
  densitySurface: MarchingCubes | null;
  densityResolution: number;
  amplitudeScale: number;
  overlap: number;
  normalization: number;
}

const BOND_LENGTH_ANGSTROM = 0.74; // H-H bond length in Angstroms
const BOHR_TO_ANGSTROM = 0.529177; // Conversion factor
const H2_BOND_LENGTH_BOHR = BOND_LENGTH_ANGSTROM / BOHR_TO_ANGSTROM; // ~1.4 Bohr radii

export function MolecularBondingVisualizer({
  particleCount,
  noiseIntensity,
  animationSpeed,
  visualizationMode,
  showAxes,
  performanceMode,
  onFpsUpdate,
  themeMode,
  backgroundColor,
  bondLength = H2_BOND_LENGTH_BOHR,
  orbitalType = 'sigma',
  showDensitySurface = false,
  densityResolution = 28,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneState | null>(null);

  // Use refs for values that need to be accessed in animation loop
  const noiseIntensityRef = useRef(noiseIntensity);
  const animationSpeedRef = useRef(animationSpeed);
  const visualizationModeRef = useRef(visualizationMode);
  const themeModeRef = useRef(themeMode);

  function disposeGroup(group: THREE.Group | undefined) {
    if (!group) {
      return;
    }

    group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose());
      } else if (material) {
        material.dispose();
      }
    });

    if (group.parent) {
      group.parent.remove(group);
    }
  }

  // Update refs when props change
  useEffect(() => {
    noiseIntensityRef.current = noiseIntensity;
  }, [noiseIntensity]);

  useEffect(() => {
    animationSpeedRef.current = animationSpeed;
  }, [animationSpeed]);

  useEffect(() => {
    visualizationModeRef.current = visualizationMode;
  }, [visualizationMode]);

  useEffect(() => {
    themeModeRef.current = themeMode;
  }, [themeMode]);

  // Update axes visibility
  useEffect(() => {
    const state = sceneRef.current;
    if (state) {
      state.axesGroup.visible = showAxes;
    }
  }, [showAxes]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);

    const camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    const cameraDistance = 8;
    camera.position.set(cameraDistance, cameraDistance * 0.66, cameraDistance);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Add orbit controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 50;

    // Mobile touch controls
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Create two hydrogen atoms
    const atomA = new HydrogenLikeAtom(1); // Z=1 for hydrogen
    const atomB = new HydrogenLikeAtom(1);

    const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 }; // 1s orbital

    const isDarkScene = themeMode === 'dark';
    const sample = generateMolecularOrbitalSample({
      atomA,
      atomB,
      quantumNumbers,
      particleCount,
      bondLength,
      themeMode: themeModeRef.current,
      orbitalType,
    });

    const {
      positions,
      colors,
      basePositions,
      allValidPositions,
      amplitudes,
      metadata,
    } = sample;

    // Initialize transition progress for wave-flow mode
    const transitionProgress = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      transitionProgress[i] = 1.0;
    }

    // Create particle system
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(amplitudes, 1));

    // Add opacity attribute
    const opacities = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      opacities[i] = 1.0;
    }
    geometry.setAttribute('alpha', new THREE.BufferAttribute(opacities, 1));

    const phasePalette = getPhaseColorPalette(themeMode, orbitalType);
    const positiveColorVec = new THREE.Vector3(...phasePalette.positive);
    const negativeColorVec = new THREE.Vector3(...phasePalette.negative);

    const particleSize = performanceMode ? 0.15 : 0.25;
    const glowIntensity = performanceMode ? 0.2 : 0.5;
    const colorBoost = performanceMode ? 1.3 : 1.8;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointSize: { value: particleSize },
        glowIntensity: { value: glowIntensity },
        colorBoost: { value: colorBoost },
        positiveColor: { value: positiveColorVec },
        negativeColor: { value: negativeColorVec },
      },
      vertexShader: `
        attribute float alpha;
        attribute float phase;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vPhase;
        uniform float pointSize;

        void main() {
          vColor = color;
          vAlpha = alpha;
          vPhase = clamp(phase, -1.0, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vPhase;
        uniform float glowIntensity;
        uniform float colorBoost;
        uniform vec3 positiveColor;
        uniform vec3 negativeColor;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = glow * vAlpha;

          float phaseMix = clamp(vPhase * 0.5 + 0.5, 0.0, 1.0);
          vec3 phaseColor = mix(negativeColor, positiveColor, phaseMix);
          vec3 blended = mix(phaseColor, vColor, 0.35);
          vec3 boostedColor = blended * (colorBoost + glow * glowIntensity);

          gl_FragColor = vec4(boostedColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Add two nuclei (hydrogen atoms at bond distance)
    const nucleusGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const nucleusMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const nucleusA = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    nucleusA.position.set(-bondLength / 2, 0, 0);
    scene.add(nucleusA);

    const nucleusB = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    nucleusB.position.set(bondLength / 2, 0, 0);
    scene.add(nucleusB);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(
      themeMode === 'light' ? 0xffffff : 0xc0c0ff,
      themeMode === 'light' ? 0.32 : 0.55,
    );
    scene.add(ambientLight);

    // Add bond axis indicator (arrow along x-axis)
    const bondAxisDir = new THREE.Vector3(1, 0, 0);
    const bondAxisOrigin = new THREE.Vector3(-bondLength / 2 - 0.5, 0, 0);
    const bondAxisColor = isDarkScene ? 0x888888 : 0x444444;
    const bondAxis = new THREE.ArrowHelper(
      bondAxisDir,
      bondAxisOrigin,
      bondLength + 1,
      bondAxisColor,
      0.3,
      0.2
    );
    bondAxis.visible = showAxes;
    scene.add(bondAxis);

    const axesGroup = createEnhancedAxes(quantumNumbers, isDarkScene);
    axesGroup.visible = showAxes;
    scene.add(axesGroup);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      particles,
      atomA,
      atomB,
      time: 0,
      basePositions,
      transitionProgress,
      allValidPositions,
      amplitudes,
      axesGroup,
      ambientLight,
      bondAxis,
      nucleusA,
      nucleusB,
      bondLength,
      orbitalType,
      densitySurface: null,
      densityResolution,
      amplitudeScale: metadata.amplitudeScale,
      overlap: metadata.overlap,
      normalization: metadata.normalization,
    };

    updateDensitySurface(sceneRef.current, {
      enabled: showDensitySurface,
      resolution: densityResolution,
      bondLength,
      orbitalType,
      themeMode,
      quantumNumbers,
    });

    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current || !sceneRef.current) {
        return;
      }
      const { renderer: activeRenderer } = sceneRef.current;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      activeRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      const state = sceneRef.current;
      if (!state) {
        return;
      }

      const {
        scene,
        camera,
        renderer,
        controls,
        particles,
        basePositions,
        transitionProgress,
        allValidPositions,
      } = state;

      controls.update();

      state.time += 0.01 * animationSpeedRef.current;
      const animationTime = state.time;

      const currentNoiseIntensity = noiseIntensityRef.current;
      const currentMode = visualizationModeRef.current;

      // Update particle positions based on visualization mode
      const positions = particles.geometry.attributes.position.array as Float32Array;
      const alphas = particles.geometry.attributes.alpha.array as Float32Array;
      const phases = particles.geometry.attributes.phase.array as Float32Array;

      if (currentMode === 'static') {
        // Static mode: particles stay in fixed positions
        for (let i = 0; i < positions.length / 3; i++) {
          const idx = i * 3;
          positions[idx] = basePositions[idx];
          positions[idx + 1] = basePositions[idx + 1];
          positions[idx + 2] = basePositions[idx + 2];

          const jitter = currentNoiseIntensity * 0.05;
          positions[idx] += (Math.random() - 0.5) * jitter;
          positions[idx + 1] += (Math.random() - 0.5) * jitter;
          positions[idx + 2] += (Math.random() - 0.5) * jitter;

          alphas[i] = 1.0;
        }
      } else if (currentMode === 'phase-rotation') {
        // Phase rotation mode: rotate around bond axis (x-axis)
        const rotationSpeed = 2.0 * animationSpeedRef.current;
        const rotationAngle = animationTime * rotationSpeed;

        for (let i = 0; i < positions.length / 3; i++) {
          const idx = i * 3;
          const baseX = basePositions[idx];
          const baseY = basePositions[idx + 1];
          const baseZ = basePositions[idx + 2];

          // Rotate around x-axis (bond axis)
          const cosAngle = Math.cos(rotationAngle);
          const sinAngle = Math.sin(rotationAngle);

          positions[idx] = baseX;
          positions[idx + 1] = baseY * cosAngle - baseZ * sinAngle;
          positions[idx + 2] = baseY * sinAngle + baseZ * cosAngle;

          const jitter = currentNoiseIntensity * 0.05;
          positions[idx] += (Math.random() - 0.5) * jitter;
          positions[idx + 1] += (Math.random() - 0.5) * jitter;
          positions[idx + 2] += (Math.random() - 0.5) * jitter;

          alphas[i] = 1.0;
        }
      } else {
        // Wave-flow mode: random teleportation
        for (let i = 0; i < positions.length / 3; i++) {
          const idx = i * 3;

          const teleportProbability = 0.02 * animationSpeedRef.current;

          if (Math.random() < teleportProbability && allValidPositions && allValidPositions.length > 0) {
            transitionProgress[i] = 0;

            const randomIndex = Math.floor(Math.random() * (allValidPositions.length / 3));
            const randomIdx = randomIndex * 3;

            basePositions[idx] = allValidPositions[randomIdx];
            basePositions[idx + 1] = allValidPositions[randomIdx + 1];
            basePositions[idx + 2] = allValidPositions[randomIdx + 2];

            const amplitude = calculateMolecularOrbitalAmplitude({
              type: state.orbitalType,
              atomA: state.atomA,
              atomB: state.atomB,
              quantumNumbers,
              position: {
                x: basePositions[idx],
                y: basePositions[idx + 1],
                z: basePositions[idx + 2],
              },
              posA: { x: -state.bondLength / 2, y: 0, z: 0 },
              posB: { x: state.bondLength / 2, y: 0, z: 0 },
              overlap: state.overlap,
              normalization: state.normalization,
            });
            const scale = state.amplitudeScale || 1;
            phases[i] = Math.max(-1, Math.min(1, amplitude / scale));
          }

          if (transitionProgress[i] < 1.0) {
            transitionProgress[i] = Math.min(transitionProgress[i] + 0.05 * animationSpeedRef.current, 1.0);
          }

          const jitter = currentNoiseIntensity * 0.1;
          positions[idx] = basePositions[idx] + (Math.random() - 0.5) * jitter;
          positions[idx + 1] = basePositions[idx + 1] + (Math.random() - 0.5) * jitter;
          positions[idx + 2] = basePositions[idx + 2] + (Math.random() - 0.5) * jitter;

          const fade = transitionProgress[i];
          alphas[i] = 0.3 + fade * 0.7;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.alpha.needsUpdate = true;
      particles.geometry.attributes.phase.needsUpdate = true;

      renderer.render(scene, camera);

      // FPS tracking
      frameCount++;
      const currentTime = performance.now();
      if (currentTime - lastTime >= 1000) {
        onFpsUpdate(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (sceneRef.current?.densitySurface) {
        disposeDensitySurface(sceneRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return;
    }

    state.scene.background = new THREE.Color(backgroundColor);
    state.ambientLight.color = new THREE.Color(themeMode === 'light' ? 0xffffff : 0xc0c0ff);
    state.ambientLight.intensity = themeMode === 'light' ? 0.32 : 0.55;

    const axesVisible = state.axesGroup.visible;

    const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

    disposeGroup(state.axesGroup);
    const refreshedAxes = createEnhancedAxes(quantumNumbers, themeMode === 'dark');
    refreshedAxes.visible = axesVisible;
    state.scene.add(refreshedAxes);
    state.axesGroup = refreshedAxes;

    // Update bond axis color
    const bondAxisColor = themeMode === 'dark' ? 0x888888 : 0x444444;
    state.bondAxis.setColor(bondAxisColor);
  }, [backgroundColor, themeMode]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return;
    }
    const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };
    updateDensitySurface(state, {
      enabled: showDensitySurface,
      resolution: densityResolution,
      bondLength,
      orbitalType,
      themeMode,
      quantumNumbers,
    });
  }, [showDensitySurface, densityResolution, themeMode, bondLength, orbitalType]);

  // Update molecular orbital when bond length changes
  useEffect(() => {
    const state = sceneRef.current;
    if (!state || state.bondLength === bondLength) {
      return;
    }

    const { scene, particles, atomA, atomB, nucleusA, nucleusB, bondAxis } = state;
    const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };

    // Remove old particles
    scene.remove(particles);
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();

    // Generate new particles with updated bond length
    const sample = generateMolecularOrbitalSample({
      atomA,
      atomB,
      quantumNumbers,
      particleCount,
      bondLength,
      themeMode: themeModeRef.current,
      orbitalType,
    });

    const { positions, colors, basePositions, allValidPositions, amplitudes, metadata } = sample;

    // Reinitialize transition progress
    const transitionProgress = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      transitionProgress[i] = 1.0;
    }

    // Create new particle system
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('phase', new THREE.BufferAttribute(amplitudes, 1));

    // Add opacity attribute
    const opacities = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      opacities[i] = 1.0;
    }
    geometry.setAttribute('alpha', new THREE.BufferAttribute(opacities, 1));

    const phasePalette = getPhaseColorPalette(themeModeRef.current, orbitalType);
    const positiveColorVec = new THREE.Vector3(...phasePalette.positive);
    const negativeColorVec = new THREE.Vector3(...phasePalette.negative);

    const particleSize = performanceMode ? 0.15 : 0.25;
    const glowIntensity = performanceMode ? 0.2 : 0.5;
    const colorBoost = performanceMode ? 1.3 : 1.8;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointSize: { value: particleSize },
        glowIntensity: { value: glowIntensity },
        colorBoost: { value: colorBoost },
        positiveColor: { value: positiveColorVec },
        negativeColor: { value: negativeColorVec },
      },
      vertexShader: `
        attribute float alpha;
        attribute float phase;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vPhase;
        uniform float pointSize;

        void main() {
          vColor = color;
          vAlpha = alpha;
          vPhase = clamp(phase, -1.0, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vPhase;
        uniform float glowIntensity;
        uniform float colorBoost;
        uniform vec3 positiveColor;
        uniform vec3 negativeColor;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = glow * vAlpha;

          float phaseMix = clamp(vPhase * 0.5 + 0.5, 0.0, 1.0);
          vec3 phaseColor = mix(negativeColor, positiveColor, phaseMix);
          vec3 blended = mix(phaseColor, vColor, 0.35);
          vec3 boostedColor = blended * (colorBoost + glow * glowIntensity);

          gl_FragColor = vec4(boostedColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      vertexColors: true,
    });

    const newParticles = new THREE.Points(geometry, material);
    scene.add(newParticles);

    // Update nuclei positions
    nucleusA.position.set(-bondLength / 2, 0, 0);
    nucleusB.position.set(bondLength / 2, 0, 0);

    // Update bond axis
    const bondAxisOrigin = new THREE.Vector3(-bondLength / 2 - 0.5, 0, 0);
    bondAxis.position.copy(bondAxisOrigin);
    bondAxis.setLength(bondLength + 1, 0.3, 0.2);

    // Update state
    state.particles = newParticles;
    state.basePositions = basePositions;
    state.transitionProgress = transitionProgress;
    state.allValidPositions = allValidPositions;
    state.amplitudes = amplitudes;
    state.bondLength = bondLength;
    state.orbitalType = orbitalType;
    state.densityResolution = densityResolution;
    state.amplitudeScale = metadata.amplitudeScale;
    state.overlap = metadata.overlap;
    state.normalization = metadata.normalization;
    updateDensitySurface(state, {
      enabled: showDensitySurface,
      resolution: densityResolution,
      bondLength,
      orbitalType,
      themeMode: themeModeRef.current,
      quantumNumbers,
    });
  }, [bondLength, particleCount, performanceMode, orbitalType, showDensitySurface, densityResolution, themeMode]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

function getPhaseColorPalette(themeMode: ThemeMode, orbitalType: MolecularOrbitalType): {
  positive: [number, number, number];
  negative: [number, number, number];
} {
  const isDark = themeMode === 'dark';

  const bondingPositive: [number, number, number] = isDark ? [0.25, 0.85, 1.0] : [0.15, 0.55, 0.95];
  const bondingNegative: [number, number, number] = isDark ? [1.0, 0.35, 0.4] : [0.86, 0.25, 0.28];

  const antibondingPositive: [number, number, number] = isDark ? [1.0, 0.58, 0.35] : [0.95, 0.45, 0.25];
  const antibondingNegative: [number, number, number] = isDark ? [0.2, 0.6, 1.0] : [0.12, 0.42, 0.88];

  if (orbitalType === 'sigma') {
    return { positive: bondingPositive, negative: bondingNegative };
  }

  return { positive: antibondingPositive, negative: antibondingNegative };
}

function disposeDensitySurface(state: SceneState | null): void {
  if (!state?.densitySurface) {
    return;
  }

  state.scene.remove(state.densitySurface);
  state.densitySurface.geometry.dispose();
  if (Array.isArray(state.densitySurface.material)) {
    state.densitySurface.material.forEach((mat) => mat.dispose());
  } else {
    state.densitySurface.material.dispose();
  }
  state.densitySurface = null;
}

interface DensitySurfaceOptions {
  enabled: boolean;
  resolution: number;
  bondLength: number;
  orbitalType: MolecularOrbitalType;
  themeMode: ThemeMode;
  quantumNumbers: QuantumNumbers;
}

function updateDensitySurface(state: SceneState | null, options: DensitySurfaceOptions): void {
  if (!state) {
    return;
  }

  if (!options.enabled) {
    disposeDensitySurface(state);
    return;
  }

  const resolution = Math.max(16, Math.min(48, Math.floor(options.resolution)));
  const extent = Math.max(4, options.bondLength * 1.6);
  const overlap = calculateOverlapIntegral1s(options.bondLength);
  const normalization = calculateBondingNormalization(overlap, options.orbitalType);

  const palette = getPhaseColorPalette(options.themeMode, options.orbitalType);
  const surfaceColor = options.themeMode === 'dark' ? 0x2d9fff : 0x0b60b0;
  const emissiveColor = options.themeMode === 'dark' ? 0x071f33 : 0x08243b;

  let surface = state.densitySurface;
  if (!surface || surface.resolution !== resolution) {
    disposeDensitySurface(state);
    const material = new THREE.MeshPhongMaterial({
      color: surfaceColor,
      emissive: emissiveColor,
      opacity: 0.24,
      transparent: true,
      shininess: 35,
      side: THREE.DoubleSide,
    });
    surface = new MarchingCubes(resolution, material, false, false);
    surface.position.set(0, 0, 0);
    state.scene.add(surface);
    state.densitySurface = surface;
  } else {
    const material = surface.material as THREE.MeshPhongMaterial;
    material.color.set(surfaceColor);
    material.emissive.set(emissiveColor);
  }

  surface.scale.set(extent, extent, extent);

  const field = surface.field;
  const size = resolution;
  const posA = { x: -options.bondLength / 2, y: 0, z: 0 };
  const posB = { x: options.bondLength / 2, y: 0, z: 0 };

  let idx = 0;
  let maxDensity = 0;
  for (let zIndex = 0; zIndex < size; zIndex++) {
    const normalizedZ = zIndex / (size - 1);
    const z = (normalizedZ - 0.5) * 2 * extent;
    for (let yIndex = 0; yIndex < size; yIndex++) {
      const normalizedY = yIndex / (size - 1);
      const y = (normalizedY - 0.5) * 2 * extent;
      for (let xIndex = 0; xIndex < size; xIndex++, idx++) {
        const normalizedX = xIndex / (size - 1);
        const x = (normalizedX - 0.5) * 2 * extent;

        const density = calculateMolecularOrbitalDensity({
          type: options.orbitalType,
          atomA: state.atomA,
          atomB: state.atomB,
          quantumNumbers: options.quantumNumbers,
          position: { x, y, z },
          posA,
          posB,
          overlap,
          normalization,
        });

        field[idx] = density;
        if (density > maxDensity) {
          maxDensity = density;
        }
      }
    }
  }

  const isolationFactor = options.orbitalType === 'sigma' ? 0.38 : 0.24;
  surface.isolation = maxDensity > 0 ? isolationFactor * maxDensity : isolationFactor;
  surface.update();

  // Slightly tint material towards the nodal colors to reinforce phase colouring
  const material = surface.material as THREE.MeshPhongMaterial;
  material.color.lerp(new THREE.Color().setRGB(...palette.positive), 0.15);
}
