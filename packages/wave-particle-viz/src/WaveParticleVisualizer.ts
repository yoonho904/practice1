/**
 * Main Wave-Particle Visualizer
 * Orchestrates physics simulation and rendering for electron droplet visualization
 */

import * as THREE from 'three';
import { HydrogenLikeAtom, type QuantumNumbers } from '@bio-sim/quantum-engine';
import { WaveParticleSystem, type WaveParticleConfig } from './systems/WaveParticleSystem.js';
import { DropletRenderer, type DropletRenderConfig } from './renderers/DropletRenderer.js';

export interface VisualizationControls {
  /** Orbital selection */
  quantumNumbers: QuantumNumbers;
  /** Element atomic number */
  atomicNumber: number;
  /** Ion charge */
  ionCharge: number;
  /** Noise strength (0 = pure wave, 1 = pure noise) */
  noiseStrength: number;
  /** Animation speed */
  animationSpeed: number;
  /** Wave following strength */
  waveFollowing: number;
  /** Particle count */
  particleCount: number;
  /** Droplet color */
  dropletColor: string;
  /** Enable orbital slicing */
  enableSlicing: boolean;
  /** Slice rotation (for orbital views) */
  sliceRotation: { x: number; y: number; z: number };
  /** Slice thickness */
  sliceThickness: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  particleCount: number;
  visibleParticles: number;
  averageDensity: number;
  memoryUsage: number;
}

/**
 * High-level wave-particle visualization system
 * Provides simple API for complex quantum visualization
 */
export class WaveParticleVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private atom: HydrogenLikeAtom;
  private physicsSystem: WaveParticleSystem;
  private dropletRenderer: DropletRenderer;
  private controls: VisualizationControls;

  // Performance monitoring
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsHistory: number[] = [];

  // Animation
  private animationId: number | null = null;
  private startTime: number = Date.now();

  constructor(
    canvas: HTMLCanvasElement,
    initialControls: Partial<VisualizationControls> = {}
  ) {
    // Initialize controls with defaults
    this.controls = {
      quantumNumbers: { n: 1, l: 0, m: 0, s: 0.5 },
      atomicNumber: 1,
      ionCharge: 0,
      noiseStrength: 0.15,
      animationSpeed: 1.0,
      waveFollowing: 0.8,
      particleCount: 5000,
      dropletColor: '#4CAF50',
      enableSlicing: false,
      sliceRotation: { x: 0, y: 0, z: 0 },
      sliceThickness: 0.5,
      ...initialControls,
    };

    this.initializeThreeJS(canvas);
    this.initializeQuantumSystem();
    this.initializeVisualization();
    this.setupEventHandlers();
  }

  /**
   * Initialize Three.js scene, camera, and renderer
   */
  private initializeThreeJS(canvas: HTMLCanvasElement): void {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a); // Dark background

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Optimize for performance
    this.renderer.sortObjects = false;
    this.renderer.shadowMap.enabled = false;
  }

  /**
   * Initialize quantum calculation system
   */
  private initializeQuantumSystem(): void {
    this.atom = new HydrogenLikeAtom(this.controls.atomicNumber);

    const physicsConfig: Partial<WaveParticleConfig> = {
      particleCount: this.controls.particleCount,
      noiseStrength: this.controls.noiseStrength,
      animationSpeed: this.controls.animationSpeed,
      waveFollowing: this.controls.waveFollowing,
    };

    this.physicsSystem = new WaveParticleSystem(
      this.atom,
      this.controls.quantumNumbers,
      physicsConfig
    );
  }

  /**
   * Initialize visualization rendering
   */
  private initializeVisualization(): void {
    const renderConfig: Partial<DropletRenderConfig> = {
      dropletColor: new THREE.Color(this.controls.dropletColor),
      enableSlicing: this.controls.enableSlicing,
      sliceThickness: this.controls.sliceThickness,
    };

    this.dropletRenderer = new DropletRenderer(
      this.scene,
      this.physicsSystem,
      renderConfig
    );

    // Add some ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    this.scene.add(ambientLight);

    // Add nucleus representation
    this.addNucleusVisualization();
  }

  /**
   * Add simple nucleus visualization
   */
  private addNucleusVisualization(): void {
    const nucleusGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const nucleusMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    this.scene.add(nucleus);
  }

  /**
   * Setup event handlers for interaction
   */
  private setupEventHandlers(): void {
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Handle mouse interactions for orbital slicing
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    const canvas = this.renderer.domElement;
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  /**
   * Handle mouse movement for interactive slicing
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.controls.enableSlicing) {return;}

    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();

    // Convert mouse position to normalized coordinates
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update slice plane based on mouse position
    const slicePlane = new THREE.Vector3(x, y, 0.5).normalize();
    this.dropletRenderer.setSlicePlane(slicePlane, this.controls.sliceThickness);
  }

  /**
   * Start animation loop
   */
  public start(): void {
    if (this.animationId !== null) {return;}

    this.startTime = Date.now();
    this.animate();
  }

  /**
   * Stop animation loop
   */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Animation loop
   */
  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    // Update performance metrics
    this.updatePerformanceMetrics(deltaTime);

    // Update physics simulation
    this.physicsSystem.update(deltaTime);

    // Update rendering
    const elapsedTime = (currentTime - this.startTime) / 1000;
    this.dropletRenderer.update(elapsedTime);

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(deltaTime: number): void {
    this.frameCount++;

    if (deltaTime > 0) {
      const fps = 1 / deltaTime;
      this.fpsHistory.push(fps);

      // Keep only last 60 frames for averaging
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
    }
  }

  /**
   * Update visualization controls
   */
  public updateControls(newControls: Partial<VisualizationControls>): void {
    const oldControls = { ...this.controls };
    this.controls = { ...this.controls, ...newControls };

    // Handle quantum number changes
    if (newControls.quantumNumbers || newControls.atomicNumber || newControls.ionCharge) {
      if (newControls.atomicNumber !== oldControls.atomicNumber) {
        this.atom = new HydrogenLikeAtom(this.controls.atomicNumber);
      }

      // Recreate physics system with new quantum state
      this.physicsSystem = new WaveParticleSystem(
        this.atom,
        this.controls.quantumNumbers,
        {
          particleCount: this.controls.particleCount,
          noiseStrength: this.controls.noiseStrength,
          animationSpeed: this.controls.animationSpeed,
          waveFollowing: this.controls.waveFollowing,
        }
      );

      // Update renderer with new system
      this.dropletRenderer.dispose();
      this.dropletRenderer = new DropletRenderer(this.scene, this.physicsSystem, {
        dropletColor: new THREE.Color(this.controls.dropletColor),
        enableSlicing: this.controls.enableSlicing,
        sliceThickness: this.controls.sliceThickness,
      });
    }

    // Handle physics parameter changes
    if (newControls.noiseStrength !== undefined ||
        newControls.animationSpeed !== undefined ||
        newControls.waveFollowing !== undefined ||
        newControls.particleCount !== undefined) {
      this.physicsSystem.updateConfig({
        noiseStrength: this.controls.noiseStrength,
        animationSpeed: this.controls.animationSpeed,
        waveFollowing: this.controls.waveFollowing,
        particleCount: this.controls.particleCount,
      });
    }

    // Handle rendering changes
    if (newControls.dropletColor ||
        newControls.enableSlicing !== undefined ||
        newControls.sliceThickness !== undefined) {
      this.dropletRenderer.updateConfig({
        dropletColor: new THREE.Color(this.controls.dropletColor),
        enableSlicing: this.controls.enableSlicing,
        sliceThickness: this.controls.sliceThickness,
      });
    }

    // Handle slicing changes
    if (newControls.enableSlicing === false) {
      this.dropletRenderer.disableSlicing();
    }
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const averageFps = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : 0;

    const physicsStats = this.physicsSystem.getStats();
    const renderStats = this.dropletRenderer.getPerformanceInfo();

    return {
      fps: Math.round(averageFps),
      frameTime: averageFps > 0 ? 1000 / averageFps : 0,
      particleCount: renderStats.particleCount,
      visibleParticles: renderStats.visibleParticles,
      averageDensity: physicsStats.averageDensity,
      memoryUsage: (this.renderer.info.memory.geometries + this.renderer.info.memory.textures) * 1024, // Estimate
    };
  }

  /**
   * Get current controls
   */
  public getControls(): VisualizationControls {
    return { ...this.controls };
  }

  /**
   * Take screenshot of current visualization
   */
  public takeScreenshot(): string {
    return this.renderer.domElement.toDataURL('image/png');
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.stop();
    this.dropletRenderer.dispose();
    this.renderer.dispose();

    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
  }
}
