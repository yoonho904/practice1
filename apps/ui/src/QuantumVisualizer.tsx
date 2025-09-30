import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { HydrogenLikeAtom, type QuantumNumbers } from '../../../services/quantum-engine/src/index';

export type VisualizationMode = 'wave-flow' | 'static' | 'phase-rotation';

interface Props {
  atomicNumber: number;
  quantumNumbers: QuantumNumbers;
  particleCount: number;
  noiseIntensity: number;
  animationSpeed: number;
  visualizationMode: VisualizationMode;
  showAxes: boolean;
  showNodalPlanes: boolean;
  performanceMode: boolean;
  onFpsUpdate: (fps: number) => void;
}

export function QuantumVisualizer({
  atomicNumber,
  quantumNumbers,
  particleCount,
  noiseIntensity,
  animationSpeed,
  visualizationMode,
  showAxes,
  showNodalPlanes,
  performanceMode,
  onFpsUpdate,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    particles: THREE.Points;
    atom: HydrogenLikeAtom;
    time: number;
    basePositions: Float32Array;
    targetPositions: Float32Array;
    transitionProgress: Float32Array;
  } | null>(null);

  // Use refs for values that need to be accessed in animation loop
  const noiseIntensityRef = useRef(noiseIntensity);
  const animationSpeedRef = useRef(animationSpeed);
  const visualizationModeRef = useRef(visualizationMode);

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

  // Update axes visibility
  useEffect(() => {
    if (sceneRef.current?.axesGroup) {
      (sceneRef.current as any).axesGroup.visible = showAxes;
    }
  }, [showAxes]);

  // Update nodal planes visibility
  useEffect(() => {
    if (sceneRef.current?.nodalPlanesGroup) {
      (sceneRef.current as any).nodalPlanesGroup.visible = showNodalPlanes;
    }
  }, [showNodalPlanes]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

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

    // Add orbit controls for manual rotation
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 150; // Increased for higher n orbitals

    // Create atom
    const atom = new HydrogenLikeAtom(atomicNumber);

    // Generate particles using proper Monte Carlo rejection sampling
    const { positions, colors, basePositions, allValidPositions } = generateOrbitalParticles(
      atom,
      quantumNumbers,
      particleCount
    );

    // Initialize target positions and transition progress for wave-flow mode
    const targetPositions = new Float32Array(particleCount * 3);
    const transitionProgress = new Float32Array(particleCount);

    // Start with basePositions as targets
    for (let i = 0; i < particleCount * 3; i++) {
      targetPositions[i] = basePositions[i];
    }
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
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Create XYZ axes (initially hidden)
    const axesGroup = new THREE.Group();
    const axisLength = 20;
    const axisWidth = 0.05;

    // X axis (red)
    const xGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = Math.PI / 2;
    axesGroup.add(xAxis);

    // Y axis (green)
    const yGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    axesGroup.add(yAxis);

    // Z axis (blue)
    const zGeometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.7 });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    axesGroup.add(zAxis);

    axesGroup.visible = showAxes;
    scene.add(axesGroup);

    // Create nodal planes group (initially hidden)
    const nodalPlanesGroup = new THREE.Group();
    const planeSize = 15;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Add nodal planes based on quantum numbers
    const { n, l, m } = quantumNumbers;

    // XY plane (z=0) for certain orbitals
    if (l > 0 && m === 0) {
      const xyPlane = new THREE.Mesh(planeGeometry, planeMaterial);
      nodalPlanesGroup.add(xyPlane);
    }

    // XZ plane (y=0) for p_x orbital
    if (l === 1 && Math.abs(m) === 1) {
      const xzPlane = new THREE.Mesh(planeGeometry, planeMaterial);
      xzPlane.rotation.x = Math.PI / 2;
      nodalPlanesGroup.add(xzPlane);
    }

    // YZ plane (x=0) for p_y orbital
    if (l === 1 && Math.abs(m) === 1) {
      const yzPlane = new THREE.Mesh(planeGeometry, planeMaterial);
      yzPlane.rotation.y = Math.PI / 2;
      nodalPlanesGroup.add(yzPlane);
    }

    nodalPlanesGroup.visible = showNodalPlanes;
    scene.add(nodalPlanesGroup);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      particles,
      atom,
      time: 0,
      basePositions,
      targetPositions,
      transitionProgress,
      allValidPositions,
      axesGroup,
      nodalPlanesGroup
    } as any;

    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      if (!sceneRef.current) return;

      const {
        scene,
        camera,
        renderer,
        controls,
        particles,
        time,
        basePositions,
        targetPositions,
        transitionProgress,
        allValidPositions
      } = sceneRef.current as any;

      // Update controls
      controls.update();

      // Update time using current animation speed from ref
      sceneRef.current.time += 0.01 * animationSpeedRef.current;
      const animationTime = sceneRef.current.time; // Use updated time

      // Get current parameters from refs
      const currentNoiseIntensity = noiseIntensityRef.current;
      const currentMode = visualizationModeRef.current;

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
          const jitter = currentNoiseIntensity * 0.05;
          positions[idx] += (Math.random() - 0.5) * jitter;
          positions[idx + 1] += (Math.random() - 0.5) * jitter;
          positions[idx + 2] += (Math.random() - 0.5) * jitter;

          // Constant opacity (no fading)
          alphas[i] = 1.0;
        }
      } else if (currentMode === 'phase-rotation') {
        // Option 2: Phase-driven rotation based on angular momentum
        // Energy-dependent rotation: E = -Z²/(2n²) determines frequency
        const { n, l, m } = quantumNumbers;
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
          const jitter = currentNoiseIntensity * 0.05;
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
          const teleportProbability = 0.02 * animationSpeedRef.current; // 2% chance per frame (adjusted by speed)

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
          const jitter = currentNoiseIntensity * 0.1;
          positions[idx] = basePositions[idx] + (Math.random() - 0.5) * jitter;
          positions[idx + 1] = basePositions[idx + 1] + (Math.random() - 0.5) * jitter;
          positions[idx + 2] = basePositions[idx + 2] + (Math.random() - 0.5) * jitter;

          // Fade in after teleport
          const fade = transitionProgress[i];
          alphas[i] = 0.3 + fade * 0.7;
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
    };
  }, []);

  // Update orbital when quantum numbers change
  useEffect(() => {
    if (!sceneRef.current) return;

    const { scene, particles } = sceneRef.current;

    // Remove old particles
    scene.remove(particles);
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();

    // Create new atom
    const newAtom = new HydrogenLikeAtom(atomicNumber);
    sceneRef.current.atom = newAtom;

    // Generate new particles with proper sampling
    const { positions, colors, basePositions, allValidPositions } = generateOrbitalParticles(
      newAtom,
      quantumNumbers,
      particleCount
    );

    // Reinitialize target positions and transition progress
    const targetPositions = new Float32Array(particleCount * 3);
    const transitionProgress = new Float32Array(particleCount);
    for (let i = 0; i < particleCount * 3; i++) {
      targetPositions[i] = basePositions[i];
    }
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

    const newParticles = new THREE.Points(geometry, material);
    scene.add(newParticles);
    sceneRef.current.particles = newParticles;
    sceneRef.current.basePositions = basePositions;
    (sceneRef.current as any).targetPositions = targetPositions;
    (sceneRef.current as any).transitionProgress = transitionProgress;
    (sceneRef.current as any).allValidPositions = allValidPositions;
  }, [atomicNumber, quantumNumbers.n, quantumNumbers.l, quantumNumbers.m, particleCount]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

/**
 * Get neon color for orbital configuration based on quantum numbers
 */
function getOrbitalColor(quantumNumbers: QuantumNumbers): { r: number; g: number; b: number } {
  const { n, l } = quantumNumbers;

  // Vibrant neon colors by subshell type (l value)
  const subshellColors = [
    { r: 0.2, g: 1.0, b: 0.3 },  // s orbital - neon green
    { r: 0.2, g: 0.5, b: 1.0 },  // p orbital - electric blue
    { r: 1.0, g: 0.3, b: 0.1 },  // d orbital - neon orange/red
    { r: 1.0, g: 0.2, b: 1.0 },  // f orbital - hot magenta
    { r: 1.0, g: 1.0, b: 0.0 },  // g orbital - bright yellow
    { r: 0.0, g: 1.0, b: 1.0 },  // h orbital - cyan
  ];

  const baseColor = subshellColors[l] || subshellColors[0];

  // Boost brightness for neon effect - always very bright
  const brightnessFactor = 0.9 + (n / 20) * 0.1;

  return {
    r: Math.min(baseColor.r * brightnessFactor, 1.0),
    g: Math.min(baseColor.g * brightnessFactor, 1.0),
    b: Math.min(baseColor.b * brightnessFactor, 1.0),
  };
}

/**
 * Generate particles distributed according to orbital probability density
 * Uses proper Monte Carlo rejection sampling with actual wave function
 */
function generateOrbitalParticles(
  atom: HydrogenLikeAtom,
  quantumNumbers: QuantumNumbers,
  count: number
): {
  positions: Float32Array;
  colors: Float32Array;
  basePositions: Float32Array;
  allValidPositions: Float32Array;
} {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);

  // Generate a larger pool of valid positions for dynamic redistribution
  const poolSize = count * 5; // 5x more positions than particles
  const validPositionsPool: number[] = [];

  // Get color for this orbital configuration
  const orbitalColor = getOrbitalColor(quantumNumbers);

  // Determine sampling radius based on quantum numbers
  // Use a very tight radius focused on the highest-density regions
  // Most probable radius for n,l is approximately n² - l(l+1)/2 in Bohr radii
  // Use factor of 2.0 to really concentrate particles in the "petals"
  const { n, l, m } = quantumNumbers;

  // Validate quantum numbers
  if (l >= n) {
    console.error(`Invalid quantum numbers: l=${l} must be < n=${n}`);
    // Return minimal safe data
    const fallbackPositions = new Float32Array(count * 3);
    const fallbackColors = new Float32Array(count * 3);
    return {
      positions: fallbackPositions,
      colors: fallbackColors,
      basePositions: fallbackPositions,
      allValidPositions: fallbackPositions,
    };
  }

  if (Math.abs(m) > l) {
    console.error(`Invalid quantum numbers: |m|=${Math.abs(m)} must be <= l=${l}`);
    // Return minimal safe data
    const fallbackPositions = new Float32Array(count * 3);
    const fallbackColors = new Float32Array(count * 3);
    return {
      positions: fallbackPositions,
      colors: fallbackColors,
      basePositions: fallbackPositions,
      allValidPositions: fallbackPositions,
    };
  }

  const mostProbableRadius = Math.max(n * n - l * (l + 1) / 2, 1); // Ensure at least 1
  const maxRadius = Math.max(mostProbableRadius * 2.2, n * n * 1.8, 3); // Ensure minimum radius of 3

  let particlesGenerated = 0;
  let attempts = 0;
  const maxAttempts = count * 1000; // Prevent infinite loops

  // Find maximum probability density for rejection sampling
  // Sample more densely in the inner region where probability is highest
  let maxProbability = 0;
  const samplePoints = 3000; // More samples for better max finding
  for (let i = 0; i < samplePoints; i++) {
    // Bias sampling toward inner regions where orbital density is higher
    // Use power of 0.5 to concentrate more samples near the nucleus
    const u = Math.random();
    const r = maxRadius * Math.pow(u, 0.5);

    // Proper uniform sampling on sphere
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

  // Add small epsilon to avoid division by zero
  if (maxProbability === 0) {
    maxProbability = 1e-10;
  }

  // Monte Carlo rejection sampling with enhanced acceptance for shape clarity
  // First pass: generate initial particle positions AND build the pool
  while ((particlesGenerated < count || validPositionsPool.length < poolSize * 3) && attempts < maxAttempts * 2) {
    attempts++;

    // Sample random position with strong bias toward high-density regions
    // Use power of 0.4 to heavily concentrate particles near the peak regions
    // This creates very crisp, pronounced orbital shapes
    const u = Math.random();
    const r = maxRadius * Math.pow(u, 0.4);

    // Proper uniform sampling on sphere surface
    const cosTheta = 2 * Math.random() - 1;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
    const phi = Math.random() * Math.PI * 2;

    const x = r * sinTheta * Math.cos(phi);
    const y = r * sinTheta * Math.sin(phi);
    const z = r * cosTheta;

    // Calculate probability density at this point
    const probability = atom.calculateProbabilityDensity(quantumNumbers, x, y, z);
    const normalizedProbability = probability / maxProbability;

    // Very aggressive filtering for crisp, pronounced shapes
    // Use a steep power function (0.15) and threshold to eliminate outliers
    const enhancedProbability = Math.pow(normalizedProbability, 0.15);

    // Dynamic threshold based on quantum numbers
    // Lower threshold for complex orbitals (high l) and lower n to avoid sampling failures
    const baseThreshold = 0.05;
    const threshold = l > 2 || n < 3 ? baseThreshold * 0.6 : baseThreshold;

    if (normalizedProbability > threshold && Math.random() < enhancedProbability) {
      // Add to valid positions pool (for dynamic redistribution)
      if (validPositionsPool.length < poolSize * 3) {
        validPositionsPool.push(x, y, z);
      }

      // Add to initial particle positions
      if (particlesGenerated < count) {
        const idx = particlesGenerated * 3;

        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;

        basePositions[idx] = x;
        basePositions[idx + 1] = y;
        basePositions[idx + 2] = z;

        // Apply orbital-specific color with slight variation for depth
        const variation = 0.85 + Math.random() * 0.15;
        colors[idx] = orbitalColor.r * variation;
        colors[idx + 1] = orbitalColor.g * variation;
        colors[idx + 2] = orbitalColor.b * variation;

        particlesGenerated++;
      }
    }
  }

  // If we couldn't generate enough particles, try again with relaxed constraints
  if (particlesGenerated < count * 0.8) {
    console.warn(
      `Only generated ${particlesGenerated}/${count} particles with strict sampling. Retrying with relaxed constraints.`
    );

    // Retry with more lenient threshold
    const relaxedThreshold = threshold * 0.3;
    const remainingAttempts = count * 2000;

    for (let i = 0; i < remainingAttempts && particlesGenerated < count; i++) {
      const u = Math.random();
      const r = maxRadius * Math.pow(u, 0.4);

      const cosTheta = 2 * Math.random() - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
      const phi = Math.random() * Math.PI * 2;

      const x = r * sinTheta * Math.cos(phi);
      const y = r * sinTheta * Math.sin(phi);
      const z = r * cosTheta;

      const probability = atom.calculateProbabilityDensity(quantumNumbers, x, y, z);
      const normalizedProb = probability / maxProbability;

      // Relaxed acceptance with less aggressive power
      const relaxedEnhanced = Math.pow(normalizedProb, 0.25);

      if (normalizedProb > relaxedThreshold && Math.random() < relaxedEnhanced) {
        // Add to pool
        if (validPositionsPool.length < poolSize * 3) {
          validPositionsPool.push(x, y, z);
        }

        // Add to initial positions
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

  // Last resort: if still not enough, log error but return what we have
  if (particlesGenerated < count * 0.5) {
    console.error(
      `Failed to generate sufficient particles: ${particlesGenerated}/${count} for n=${n}, l=${l}. This may cause visual artifacts.`
    );
  }

  // Convert pool to Float32Array
  const allValidPositions = new Float32Array(validPositionsPool);

  console.log(`Generated ${particlesGenerated} particles with pool of ${validPositionsPool.length / 3} valid positions`);

  return { positions, colors, basePositions, allValidPositions };
}
