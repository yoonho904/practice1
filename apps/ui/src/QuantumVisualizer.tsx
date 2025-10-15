import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { HydrogenLikeAtom, type QuantumNumbers } from '../../../services/quantum-engine/src/index.js';
import { createEnhancedAxes } from './helpers/createEnhancedAxes.js';
import { createNodalPlanes } from './helpers/createNodalPlanes.js';
import { createDensityIsosurface, resolveDensityResolution } from './helpers/createDensityIsosurface.js';
import type { ThemeMode } from './themes/theme.js';
import {
  computeNodalConfiguration,
  type NodalConfiguration,
} from './helpers/nodalConfig.js';
import type { UseOrbitalPreloaderReturn } from './hooks/useOrbitalPreloader.js';
import { cloneOrbitalSamplingResult } from './physics/orbitalSampling.js';
import type { DensityFieldData } from './physics/densityField.js';
import { ensureDensityField } from './physics/densityFieldCache.js';

export type VisualizationMode = 'wave-flow' | 'static' | 'phase-rotation';
export type DistributionType = 'accurate' | 'aesthetic';

interface Props {
  atomicNumber: number;
  quantumNumbers: QuantumNumbers;
  particleCount: number;
  noiseIntensity: number;
  animationSpeed: number;
  visualizationMode: VisualizationMode;
  distributionType: DistributionType;
  showAxes: boolean;
  showNodalPlanes: boolean;
  performanceMode: boolean;
  onFpsUpdate: (fps: number) => void;
  themeMode: ThemeMode;
  backgroundColor: number;
  showDensityVisualization: boolean;
  densityGridResolution: number;
  densityMinThreshold: number;
  densityMaxThreshold: number;
  preloader?: UseOrbitalPreloaderReturn;
}

interface SceneState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  particles: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  atom: HydrogenLikeAtom;
  quantumNumbers: QuantumNumbers;
  time: number;
  basePositions: Float32Array;
  transitionProgress: Float32Array;
  allValidPositions: Float32Array;
  axesGroup: THREE.Group;
  nodalPlanesGroup: THREE.Group;
  ambientLight: THREE.AmbientLight;
  extent: number;
  nodalConfig: NodalConfiguration;
  maxProbability: number;
  densityField?: DensityFieldData;
  densityVisualization?: THREE.Object3D;
}

export function QuantumVisualizer({
  atomicNumber,
  quantumNumbers,
  particleCount,
  noiseIntensity,
  animationSpeed,
  visualizationMode,
  distributionType,
  showAxes,
  showNodalPlanes,
  performanceMode,
  onFpsUpdate,
  themeMode,
  backgroundColor,
  showDensityVisualization,
  densityGridResolution,
  densityMinThreshold,
  densityMaxThreshold,
  preloader: _preloader,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<SceneState | null>(null);
  const preloader = _preloader;

  // Use refs for values that need to be accessed in animation loop
  const noiseIntensityRef = useRef(noiseIntensity);
  const animationSpeedRef = useRef(animationSpeed);
  const visualizationModeRef = useRef(visualizationMode);
  const distributionTypeRef = useRef(distributionType);
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

function disposeObject(object: THREE.Object3D | undefined) {
  if (!object) {
    return;
  }

  object.traverse((child) => {
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

  if (object.parent) {
    object.parent.remove(object);
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
    distributionTypeRef.current = distributionType;
  }, [distributionType]);

  useEffect(() => {
    themeModeRef.current = themeMode;
  }, [themeMode]);

  useEffect(() => {
    if (!preloader) {
      return;
    }

    preloader.setCalculator(async (request) => {
      try {
        const atomInstance = new HydrogenLikeAtom(request.atomicNumber);
        const sample = generateOrbitalParticles(
          atomInstance,
          request.quantumNumbers,
          request.particleCount,
          request.distributionType,
          request.isDarkBackground ? 'dark' : 'light',
        );

        const resolution = resolveDensityResolution(densityGridResolution, request.distributionType);
        const field = ensureDensityField(
          request.atomicNumber,
          atomInstance,
          request.quantumNumbers,
          sample.extent,
          sample.maxProbability,
          resolution,
        );
        sample.densityField = field;
        return cloneOrbitalSamplingResult(sample);
      } catch (error) {
        console.warn('Orbital preloader calculator error', error);
        return null;
      }
    });
  }, [preloader, densityGridResolution, distributionType]);

  // Update axes visibility
  useEffect(() => {
    const state = sceneRef.current;
    if (state) {
      state.axesGroup.visible = showAxes;
    }
  }, [showAxes]);

  // Update nodal planes visibility
  useEffect(() => {
    const state = sceneRef.current;
    if (state) {
      state.nodalPlanesGroup.visible = showNodalPlanes;
    }
  }, [showNodalPlanes]);

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
    // Scale camera distance based on orbital size
    const cameraDistance = 15 + (quantumNumbers.n - 1) * 5;
    camera.position.set(cameraDistance, cameraDistance * 0.66, cameraDistance);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Add orbit controls for manual rotation (supports both mouse and touch)
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 150; // Increased for higher n orbitals

    // Mobile touch controls
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,      // Single finger: rotate
      TWO: THREE.TOUCH.DOLLY_PAN,   // Two fingers: zoom and pan
    };

    // Create atom
    const atom = new HydrogenLikeAtom(atomicNumber);

    const isDarkScene = themeMode === 'dark';
    const cachedSample = preloader?.getCachedOrbital ? preloader.getCachedOrbital() : null;
    const sample = cachedSample
      ? cloneOrbitalSamplingResult(cachedSample)
      : generateOrbitalParticles(
          atom,
          quantumNumbers,
          particleCount,
          distributionTypeRef.current,
          themeModeRef.current,
        );

    if (!cachedSample && preloader) {
      preloader.cacheOrbital(sample);
    }

    const {
      positions,
      colors,
      basePositions,
      allValidPositions,
      extent,
      maxProbability,
      nodalConfig,
      densityField,
    } = sample;

    // Initialize target positions and transition progress for wave-flow mode
    const transitionProgress = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      transitionProgress[i] = 1.0; // Fully transitioned initially
    }

    // Create particle system with opacity control
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Add opacity attribute for individual particle fade in/out
    const opacities = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      opacities[i] = 1.0; // Start fully visible
    }
    geometry.setAttribute('alpha', new THREE.BufferAttribute(opacities, 1));

    // Performance optimizations - scale with orbital size
    const orbitalScale = Math.max(1, quantumNumbers.n / 2);
    const particleSize = (performanceMode ? 0.15 : 0.25) * orbitalScale;

    // Boost brightness for low Z atoms (harder to see with fewer/farther particles)
    const lowZBoost = atomicNumber <= 2 ? 1.5 : 1.0;
    const glowIntensity = (performanceMode ? 0.2 : 0.5) * lowZBoost;
    const colorBoost = (performanceMode ? 1.3 : 1.8) * lowZBoost;

    // Create custom shader material for per-particle opacity and neon glow
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointSize: { value: particleSize },
        glowIntensity: { value: glowIntensity },
        colorBoost: { value: colorBoost },
      },
      vertexShader: `
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float pointSize;

        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float glowIntensity;
        uniform float colorBoost;

        void main() {
          // Circular point shape with soft edges
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          // Glow effect (reduced in performance mode)
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = glow * vAlpha;

          // Boost color intensity (reduced in performance mode)
          vec3 boostedColor = vColor * (colorBoost + glow * glowIntensity);

          // Emissive glow
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

    // Add nucleus
    const nucleusGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const nucleusMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    scene.add(nucleus);

    // Add subtle ambient light
    const ambientLight = new THREE.AmbientLight(
      themeMode === 'light' ? 0xffffff : 0xc0c0ff,
      themeMode === 'light' ? 0.32 : 0.55,
    );
    scene.add(ambientLight);

    const axesGroup = createEnhancedAxes(quantumNumbers, isDarkScene);
    axesGroup.visible = showAxes;
    scene.add(axesGroup);

    const nodalPlanesGroup = createNodalPlanes(quantumNumbers, isDarkScene, extent, nodalConfig);
    nodalPlanesGroup.visible = showNodalPlanes;
    scene.add(nodalPlanesGroup);

    let densityVisualization: THREE.Object3D | undefined;
    if (showDensityVisualization) {
      densityVisualization = createDensityIsosurface({
        atom,
        atomicNumber,
        quantumNumbers,
        extent,
        gridResolution: densityGridResolution,
        minDensity: densityMinThreshold,
        maxDensity: densityMaxThreshold,
        isDarkBackground: isDarkScene,
        orbitalColor: getOrbitalColor(quantumNumbers, themeMode),
        distributionType: distributionTypeRef.current,
        maxProbability,
        precomputedField: densityField,
      });
      scene.add(densityVisualization);
    }

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      particles,
      atom,
      quantumNumbers,
      time: 0,
      basePositions,
      transitionProgress,
      allValidPositions,
      axesGroup,
      nodalPlanesGroup,
      ambientLight,
      extent,
      maxProbability,
      densityField,
      nodalConfig,
      densityVisualization,
    };

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

      // Update controls
      controls.update();

      // Update time using current animation speed from ref
      state.time += 0.01 * animationSpeedRef.current;
      const animationTime = state.time; // Use updated time

      // Get current parameters from refs
      const currentNoiseIntensity = noiseIntensityRef.current;
      const currentMode = visualizationModeRef.current;
      const distributionMode = distributionTypeRef.current;
      const isAesthetic = distributionMode === 'aesthetic';

      // Update particle positions and opacity based on visualization mode
      const positions = particles.geometry.attributes.position.array as Float32Array;
      const alphas = particles.geometry.attributes.alpha.array as Float32Array;

      if (currentMode === 'static') {
        // Option 1: Time-independent quantum state (physically accurate)
        // Particles stay in fixed positions representing probability density
        for (let i = 0; i < positions.length / 3; i++) {
          const idx = i * 3;
          // Reset to base positions
          positions[idx] = basePositions[idx];
          positions[idx + 1] = basePositions[idx + 1];
          positions[idx + 2] = basePositions[idx + 2];

          // Subtle quantum uncertainty "jitter"
          const jitter = currentNoiseIntensity * (isAesthetic ? 0 : 0.05);
          positions[idx] += (Math.random() - 0.5) * jitter;
          positions[idx + 1] += (Math.random() - 0.5) * jitter;
          positions[idx + 2] += (Math.random() - 0.5) * jitter;

          // Constant opacity (no fading)
          alphas[i] = 1.0;
        }
      } else if (currentMode === 'phase-rotation') {
        // Option 2: Phase-driven rotation based on angular momentum
        // Energy-dependent rotation: E = -Z²/(2n²) determines frequency
        const { n, m } = quantumNumbers;
        const energy = -(atomicNumber ** 2) / (2 * n ** 2); // In Hartree units
        // Scale up rotation speed significantly for visible rotation
        const rotationSpeed = Math.abs(energy) * 5.0 * animationSpeedRef.current;

        // Rotation around z-axis based on m quantum number
        const rotationAngle = animationTime * rotationSpeed * Math.max(Math.abs(m), 0.5);

        for (let i = 0; i < positions.length / 3; i++) {
          const idx = i * 3;
          const baseX = basePositions[idx];
          const baseY = basePositions[idx + 1];
          const baseZ = basePositions[idx + 2];

          // Rotate around z-axis (angular momentum direction)
          const cosAngle = Math.cos(rotationAngle);
          const sinAngle = Math.sin(rotationAngle);

          positions[idx] = baseX * cosAngle - baseY * sinAngle;
          positions[idx + 1] = baseX * sinAngle + baseY * cosAngle;
          positions[idx + 2] = baseZ;

          // Add subtle quantum jitter
          const jitter = currentNoiseIntensity * (isAesthetic ? 0 : 0.05);
          positions[idx] += (Math.random() - 0.5) * jitter;
          positions[idx + 1] += (Math.random() - 0.5) * jitter;
          positions[idx + 2] += (Math.random() - 0.5) * jitter;

          // Constant opacity
          alphas[i] = 1.0;
        }
      } else {
        // Default: Wave-flow mode (random teleportation like stadium crowd wave)
        // Particles teleport between positions randomly, creating wave-like density patterns
        for (let i = 0; i < positions.length / 3; i++) {
          const idx = i * 3;

          // Each particle has a random chance to teleport to a new location
          // This creates a "crowd wave" effect with random density variations
          const teleportProbability = (isAesthetic ? 0 : 0.02) * animationSpeedRef.current;

          if (Math.random() < teleportProbability && allValidPositions && allValidPositions.length > 0) {
            // Fade out
            transitionProgress[i] = 0;

            // Pick a random new position from the pool
            const randomIndex = Math.floor(Math.random() * (allValidPositions.length / 3));
            const randomIdx = randomIndex * 3;

            // Teleport to new position
            basePositions[idx] = allValidPositions[randomIdx];
            basePositions[idx + 1] = allValidPositions[randomIdx + 1];
            basePositions[idx + 2] = allValidPositions[randomIdx + 2];
          }

          // Fade in progress
          if (transitionProgress[i] < 1.0) {
            transitionProgress[i] = Math.min(transitionProgress[i] + 0.05 * animationSpeedRef.current, 1.0);
          }

          // Set position (with subtle jitter)
          const jitter = isAesthetic ? 0 : currentNoiseIntensity * 0.1;
          if (isAesthetic) {
            positions[idx] = basePositions[idx];
            positions[idx + 1] = basePositions[idx + 1];
            positions[idx + 2] = basePositions[idx + 2];
          } else {
            positions[idx] = basePositions[idx] + (Math.random() - 0.5) * jitter;
            positions[idx + 1] = basePositions[idx + 1] + (Math.random() - 0.5) * jitter;
            positions[idx + 2] = basePositions[idx + 2] + (Math.random() - 0.5) * jitter;
          }

          // Fade in after teleport
          const fade = transitionProgress[i];
          alphas[i] = isAesthetic ? 1 : 0.3 + fade * 0.7;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.alpha.needsUpdate = true;

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
      disposeObject(densityVisualization);
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
    const nodalVisible = state.nodalPlanesGroup.visible;

    disposeGroup(state.axesGroup);
    const refreshedAxes = createEnhancedAxes(state.quantumNumbers, themeMode === 'dark');
    refreshedAxes.visible = axesVisible;
    state.scene.add(refreshedAxes);
    state.axesGroup = refreshedAxes;

    disposeGroup(state.nodalPlanesGroup);
    const refreshedNodal = createNodalPlanes(state.quantumNumbers, themeMode === 'dark', state.extent, state.nodalConfig);
    refreshedNodal.visible = nodalVisible;
    state.scene.add(refreshedNodal);
    state.nodalPlanesGroup = refreshedNodal;

    disposeObject(state.densityVisualization);
    state.densityVisualization = undefined;
    if (showDensityVisualization) {
      const density = createDensityIsosurface({
        atom: state.atom,
        quantumNumbers: state.quantumNumbers,
        extent: state.extent,
        gridResolution: densityGridResolution,
        minDensity: densityMinThreshold,
        maxDensity: densityMaxThreshold,
        isDarkBackground: themeMode === 'dark',
        orbitalColor: getOrbitalColor(state.quantumNumbers, themeMode),
        distributionType: distributionTypeRef.current,
        atomicNumber,
        maxProbability: state.maxProbability,
        precomputedField: state.densityField,
      });
      state.scene.add(density);
      state.densityVisualization = density;
    }
  }, [backgroundColor, themeMode, showDensityVisualization, densityGridResolution, densityMinThreshold, densityMaxThreshold, atomicNumber]);

  useEffect(() => {
    if (!showDensityVisualization) {
      return;
    }

    const state = sceneRef.current;
    if (!state) {
      return;
    }

    if (!(state.maxProbability > 0)) {
      return;
    }

    const resolution = resolveDensityResolution(densityGridResolution, distributionTypeRef.current);
    state.densityField = ensureDensityField(
      atomicNumber,
      state.atom,
      state.quantumNumbers,
      state.extent,
      state.maxProbability,
      resolution,
    );
  }, [showDensityVisualization, densityGridResolution, atomicNumber, quantumNumbers.n, quantumNumbers.l, quantumNumbers.m, distributionType]);

  // Update orbital when quantum numbers change
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) {
      return;
    }

    const { scene, particles } = state;

    // Remove old particles
    scene.remove(particles);
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();

    disposeObject(state.densityVisualization);
    state.densityVisualization = undefined;

    // Create new atom
    const newAtom = new HydrogenLikeAtom(atomicNumber);
    state.atom = newAtom;

    const cachedSample = preloader?.getCachedOrbital ? preloader.getCachedOrbital() : null;
    const sample = cachedSample
      ? cloneOrbitalSamplingResult(cachedSample)
      : generateOrbitalParticles(
          newAtom,
          quantumNumbers,
          particleCount,
          distributionTypeRef.current,
          themeModeRef.current,
        );

    if (!cachedSample && preloader) {
      preloader.cacheOrbital(sample);
    }

    const {
      positions,
      colors,
      basePositions,
      allValidPositions,
      extent,
      maxProbability,
      nodalConfig,
      densityField,
    } = sample;

    // Reinitialize transition progress
    const transitionProgress = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      transitionProgress[i] = 1.0;
    }

    // Create new particle system
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Add opacity attribute for fade in/out
    const opacities = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      opacities[i] = 1.0;
    }
    geometry.setAttribute('alpha', new THREE.BufferAttribute(opacities, 1));

    // Performance optimizations (use same settings as initial load)
    const particleSize = performanceMode ? 0.12 : 0.18;
    const glowIntensity = performanceMode ? 0.15 : 0.3;
    const colorBoost = performanceMode ? 1.0 : 1.2;

    // Create custom shader material for per-particle opacity and neon glow
    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointSize: { value: particleSize },
        glowIntensity: { value: glowIntensity },
        colorBoost: { value: colorBoost },
      },
      vertexShader: `
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float pointSize;

        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float glowIntensity;
        uniform float colorBoost;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = glow * vAlpha;

          vec3 boostedColor = vColor * (colorBoost + glow * glowIntensity);

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
    state.particles = newParticles;
    state.basePositions = basePositions;
    state.transitionProgress = transitionProgress;
    state.allValidPositions = allValidPositions;
    state.extent = extent;
    state.quantumNumbers = quantumNumbers;
    state.nodalConfig = nodalConfig;
    state.maxProbability = maxProbability;
    state.densityField = densityField;

    disposeGroup(state.axesGroup);
    const newAxesGroup = createEnhancedAxes(quantumNumbers, themeModeRef.current === 'dark');
    newAxesGroup.visible = showAxes;
    scene.add(newAxesGroup);
    state.axesGroup = newAxesGroup;

    disposeGroup(state.nodalPlanesGroup);
    const newNodalGroup = createNodalPlanes(quantumNumbers, themeModeRef.current === 'dark', extent, nodalConfig);
    newNodalGroup.visible = showNodalPlanes;
    scene.add(newNodalGroup);
    state.nodalPlanesGroup = newNodalGroup;

    if (showDensityVisualization) {
      const density = createDensityIsosurface({
        atom: state.atom,
        quantumNumbers,
        extent,
        gridResolution: densityGridResolution,
        minDensity: densityMinThreshold,
        maxDensity: densityMaxThreshold,
        isDarkBackground: themeModeRef.current === 'dark',
        orbitalColor: getOrbitalColor(quantumNumbers, themeModeRef.current),
        distributionType: distributionTypeRef.current,
        atomicNumber,
        maxProbability,
        precomputedField: densityField,
      });
      scene.add(density);
      state.densityVisualization = density;
    }
  }, [atomicNumber, distributionType, particleCount, performanceMode, quantumNumbers, themeMode, showAxes, showNodalPlanes, showDensityVisualization, densityGridResolution, densityMinThreshold, densityMaxThreshold, preloader]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/**
 * Get neon color for orbital configuration based on quantum numbers
 */
function getOrbitalColor(
  quantumNumbers: QuantumNumbers,
  mode: ThemeMode,
): { r: number; g: number; b: number } {
  const { n, l } = quantumNumbers;

  const subshellColorsDark = [
    { r: 0.55, g: 1.0, b: 0.65 },
    { r: 0.35, g: 0.82, b: 1.0 },
    { r: 1.0, g: 0.58, b: 0.15 },
    { r: 1.0, g: 0.5, b: 1.0 },
    { r: 1.0, g: 0.97, b: 0.45 },
    { r: 0.75, g: 0.95, b: 1.0 },
  ];

  const subshellColorsLight = [
    { r: 0.28, g: 0.78, b: 0.38 },
    { r: 0.28, g: 0.6, b: 0.98 },
    { r: 0.98, g: 0.48, b: 0.12 },
    { r: 0.9, g: 0.4, b: 0.9 },
    { r: 0.98, g: 0.88, b: 0.25 },
    { r: 0.35, g: 0.82, b: 0.95 },
  ];

  const palette = mode === 'light' ? subshellColorsLight : subshellColorsDark;
  const baseColor = palette[l] || palette[0];
  const brightnessFactor = mode === 'light'
    ? 0.9 + (n / 45) * 0.05
    : 1.05 + (n / 30) * 0.08;

  return {
    r: Math.min(baseColor.r * brightnessFactor, 1.0),
    g: Math.min(baseColor.g * brightnessFactor, 1.0),
    b: Math.min(baseColor.b * brightnessFactor, 1.0),
  };
}

function generateOrbitalParticles(
  atom: HydrogenLikeAtom,
  quantumNumbers: QuantumNumbers,
  count: number,
  distributionType: DistributionType,
  mode: ThemeMode,
): {
  positions: Float32Array;
  colors: Float32Array;
  basePositions: Float32Array;
  allValidPositions: Float32Array;
  extent: number;
  maxProbability: number;
  nodalConfig: NodalConfiguration;
} {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);

  const isAesthetic = distributionType === 'aesthetic';
  const poolSize = count * (isAesthetic ? 5 : 8);
  const validPositionsPool: number[] = [];

  const orbitalColor = getOrbitalColor(quantumNumbers, mode);
  const { n, l, m } = quantumNumbers;

  if (l >= n) {
    console.error(`Invalid quantum numbers: l=${l} must be < n=${n}`);
    const fallbackPositions = new Float32Array(count * 3);
    const fallbackColors = new Float32Array(count * 3);
    return {
      positions: fallbackPositions,
      colors: fallbackColors,
      basePositions: fallbackPositions,
      allValidPositions: fallbackPositions,
      extent: 3,
      maxProbability: 1,
      nodalConfig: computeNodalConfiguration(quantumNumbers, 3),
    };
  }

  if (Math.abs(m) > l) {
    console.error(`Invalid quantum numbers: |m|=${Math.abs(m)} must be <= l=${l}`);
    const fallbackPositions = new Float32Array(count * 3);
    const fallbackColors = new Float32Array(count * 3);
    return {
      positions: fallbackPositions,
      colors: fallbackColors,
      basePositions: fallbackPositions,
      allValidPositions: fallbackPositions,
      extent: 3,
      maxProbability: 1,
      nodalConfig: computeNodalConfiguration(quantumNumbers, 3),
    };
  }

  const mostProbableRadius = Math.max(n * n - l * (l + 1) / 2, 1);
  const radiusScale = isAesthetic ? 2.2 : 6.0;
  const extentScale = isAesthetic ? 1.8 : 4.0;
  const maxRadius = Math.max(mostProbableRadius * radiusScale, n * n * extentScale, 6);

  let particlesGenerated = 0;
  let attempts = 0;
  const maxAttempts = count * 1000;

  let maxProbability = 0;
  const samplePoints = isAesthetic ? 3000 : 12000;
  for (let i = 0; i < samplePoints; i++) {
    const u = Math.random();
    const r = maxRadius * Math.pow(u, isAesthetic ? 0.5 : 1.0);

    const cosTheta = 2 * Math.random() - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = Math.random() * Math.PI * 2;

    const x = r * sinTheta * Math.cos(phi);
    const y = r * sinTheta * Math.sin(phi);
    const z = r * cosTheta;

    const prob = atom.calculateProbabilityDensity(quantumNumbers, x, y, z);
    if (prob > maxProbability) {
      maxProbability = prob;
    }
  }

  if (maxProbability === 0) {
    maxProbability = 1e-10;
  }

  const baseThreshold = isAesthetic ? 0.05 : 0.0004;
  const threshold = (l > 2 || n < 3)
    ? baseThreshold * (isAesthetic ? 0.6 : 0.8)
    : baseThreshold;
  const rejectionPower = isAesthetic ? 0.15 : 0.9;
  const relaxedFactor = isAesthetic ? 0.3 : 0.15;
  const relaxedPower = isAesthetic ? 0.25 : 0.8;

  while ((particlesGenerated < count || validPositionsPool.length < poolSize * 3) && attempts < maxAttempts * 2) {
    attempts++;

    const u = Math.random();
    const r = maxRadius * Math.pow(u, isAesthetic ? 0.4 : 0.7);

    const cosTheta = 2 * Math.random() - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = Math.random() * Math.PI * 2;

    const x = r * sinTheta * Math.cos(phi);
    const y = r * sinTheta * Math.sin(phi);
    const z = r * cosTheta;

    const probability = atom.calculateProbabilityDensity(quantumNumbers, x, y, z);
    const normalizedProbability = probability / maxProbability;

    const enhancedProbability = Math.pow(normalizedProbability, rejectionPower);

    if (normalizedProbability > threshold && Math.random() < enhancedProbability) {
      if (validPositionsPool.length < poolSize * 3) {
        validPositionsPool.push(x, y, z);
      }

      if (particlesGenerated < count) {
        const idx = particlesGenerated * 3;

        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;

        basePositions[idx] = x;
        basePositions[idx + 1] = y;
        basePositions[idx + 2] = z;

        const variation = isAesthetic ? 0.85 + Math.random() * 0.15 : 0.6 + Math.random() * 0.4;
        colors[idx] = orbitalColor.r * variation;
        colors[idx + 1] = orbitalColor.g * variation;
        colors[idx + 2] = orbitalColor.b * variation;

        particlesGenerated++;
      }
    }
  }

  if (particlesGenerated < count * 0.8) {
    console.warn(
      `Only generated ${particlesGenerated}/${count} particles with strict sampling. Retrying with relaxed constraints.`
    );

    const relaxedThreshold = threshold * relaxedFactor;
    const remainingAttempts = count * 2000;

    for (let i = 0; i < remainingAttempts && particlesGenerated < count; i++) {
      const u = Math.random();
      const r = maxRadius * Math.pow(u, isAesthetic ? 0.4 : 0.6);

      const cosTheta = 2 * Math.random() - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      const phi = Math.random() * Math.PI * 2;

      const x = r * sinTheta * Math.cos(phi);
      const y = r * sinTheta * Math.sin(phi);
      const z = r * cosTheta;

      const probability = atom.calculateProbabilityDensity(quantumNumbers, x, y, z);
      const normalizedProb = probability / maxProbability;

      const relaxedEnhanced = Math.pow(normalizedProb, relaxedPower);

      if (normalizedProb > relaxedThreshold && Math.random() < relaxedEnhanced) {
        if (validPositionsPool.length < poolSize * 3) {
          validPositionsPool.push(x, y, z);
        }

        if (particlesGenerated < count) {
          const idx = particlesGenerated * 3;

          positions[idx] = x;
          positions[idx + 1] = y;
          positions[idx + 2] = z;

          basePositions[idx] = x;
          basePositions[idx + 1] = y;
          basePositions[idx + 2] = z;

          const variation = 0.85 + Math.random() * 0.15;
          colors[idx] = orbitalColor.r * variation;
          colors[idx + 1] = orbitalColor.g * variation;
          colors[idx + 2] = orbitalColor.b * variation;

          particlesGenerated++;
        }
      }
    }
  }

  if (particlesGenerated < count * 0.5) {
    console.error(
      `Failed to generate sufficient particles: ${particlesGenerated}/${count} for n=${n}, l=${l}. This may cause visual artifacts.`
    );
  }

  const allValidPositions = new Float32Array(validPositionsPool);

  const nodalConfig = computeNodalConfiguration(quantumNumbers, maxRadius);

  return {
    positions,
    colors,
    basePositions,
    allValidPositions,
    extent: maxRadius,
    maxProbability,
    nodalConfig,
  };
}
