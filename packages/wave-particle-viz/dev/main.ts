import { WaveParticleVisualizer } from '../src/WaveParticleVisualizer';
import type { QuantumNumbers } from '../../../services/quantum-engine/src/index';
import { HydrogenLikeAtom } from '../../../services/quantum-engine/src/index';

// Simple quantum engine interface for the demo
class SimpleQuantumEngine {
  calculateOrbital(atomicNumber: number, quantumNumbers: QuantumNumbers) {
    // For demo purposes, use hydrogen-like approximation
    const atom = new HydrogenLikeAtom(atomicNumber);
    return atom.calculateAll(quantumNumbers);
  }
}

// Initialize the demo
async function initDemo() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Create quantum engine
  const quantumEngine = new SimpleQuantumEngine();

  // Create visualizer
  const visualizer = new WaveParticleVisualizer(canvas, quantumEngine);

  // Setup UI controls
  setupControls(visualizer);

  // Initialize with hydrogen 1s orbital
  const initialQuantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0 };
  await visualizer.setOrbital(1, initialQuantumNumbers); // Hydrogen

  // Start animation loop
  animate();

  function animate() {
    visualizer.render();
    requestAnimationFrame(animate);
  }
}

function setupControls(visualizer: WaveParticleVisualizer) {
  // Element selection
  const elementSelect = document.getElementById('element') as HTMLSelectElement;
  elementSelect.addEventListener('change', async () => {
    const atomicNumber = parseInt(elementSelect.value);
    const quantumNumbers = getCurrentQuantumNumbers();
    await visualizer.setOrbital(atomicNumber, quantumNumbers);
    updateInfo(atomicNumber, quantumNumbers);
  });

  // Quantum number controls
  const nSelect = document.getElementById('n') as HTMLSelectElement;
  const lSelect = document.getElementById('l') as HTMLSelectElement;
  const mSelect = document.getElementById('m') as HTMLSelectElement;

  nSelect.addEventListener('change', updateOrbital);
  lSelect.addEventListener('change', updateOrbital);
  mSelect.addEventListener('change', updateOrbital);

  // Visual controls
  const particleCountSlider = document.getElementById('particleCount') as HTMLInputElement;
  const noiseIntensitySlider = document.getElementById('noiseIntensity') as HTMLInputElement;
  const animationSpeedSlider = document.getElementById('animationSpeed') as HTMLInputElement;
  const slicingEnabledCheckbox = document.getElementById('slicingEnabled') as HTMLInputElement;

  particleCountSlider.addEventListener('input', () => {
    visualizer.setParticleCount(parseInt(particleCountSlider.value));
    updateSliderValue('particleCount', particleCountSlider.value);
  });

  noiseIntensitySlider.addEventListener('input', () => {
    visualizer.setNoiseIntensity(parseFloat(noiseIntensitySlider.value));
    updateSliderValue('noiseIntensity', noiseIntensitySlider.value);
  });

  animationSpeedSlider.addEventListener('input', () => {
    visualizer.setAnimationSpeed(parseFloat(animationSpeedSlider.value));
    updateSliderValue('animationSpeed', animationSpeedSlider.value);
  });

  slicingEnabledCheckbox.addEventListener('change', () => {
    visualizer.setSlicingEnabled(slicingEnabledCheckbox.checked);
  });

  async function updateOrbital() {
    const atomicNumber = parseInt(elementSelect.value);
    const quantumNumbers = getCurrentQuantumNumbers();
    await visualizer.setOrbital(atomicNumber, quantumNumbers);
    updateInfo(atomicNumber, quantumNumbers);
  }

  function getCurrentQuantumNumbers(): QuantumNumbers {
    return {
      n: parseInt(nSelect.value),
      l: parseInt(lSelect.value),
      m: parseInt(mSelect.value)
    };
  }

  function updateSliderValue(id: string, value: string) {
    const display = document.getElementById(`${id}Value`);
    if (display) {
      display.textContent = value;
    }
  }

  function updateInfo(atomicNumber: number, quantumNumbers: QuantumNumbers) {
    const infoDiv = document.getElementById('orbital-info');
    if (infoDiv) {
      const orbitalName = getOrbitalName(quantumNumbers);
      const elementName = getElementName(atomicNumber);
      infoDiv.innerHTML = `
        <strong>Current Orbital:</strong> ${elementName} ${orbitalName}<br>
        <strong>Quantum Numbers:</strong> n=${quantumNumbers.n}, l=${quantumNumbers.l}, m=${quantumNumbers.m}
      `;
    }
  }

  function getOrbitalName(qn: QuantumNumbers): string {
    const subshells = ['s', 'p', 'd', 'f', 'g', 'h'];
    return `${qn.n}${subshells[qn.l] || qn.l}`;
  }

  function getElementName(z: number): string {
    const elements = [
      '', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
      'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'
    ];
    return elements[z] || `Z=${z}`;
  }

  // Initialize displays
  updateSliderValue('particleCount', particleCountSlider.value);
  updateSliderValue('noiseIntensity', noiseIntensitySlider.value);
  updateSliderValue('animationSpeed', animationSpeedSlider.value);
  updateInfo(1, { n: 1, l: 0, m: 0 });
}

// Performance monitoring
function setupPerformanceMonitoring() {
  const fpsDisplay = document.getElementById('fps');
  const memoryDisplay = document.getElementById('memory');

  let lastTime = performance.now();
  let frameCount = 0;

  function updatePerformance() {
    frameCount++;
    const currentTime = performance.now();

    if (currentTime - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      if (fpsDisplay) {
        fpsDisplay.textContent = `${fps} FPS`;
      }

    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    if (memoryDisplay && perf.memory) {
      const usedMB = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
        memoryDisplay.textContent = `${usedMB} MB`;
      }

      frameCount = 0;
      lastTime = currentTime;
    }

    requestAnimationFrame(updatePerformance);
  }

  updatePerformance();
}

// Error handling
window.addEventListener('error', (event) => {
  console.error('Demo error:', event.error);
  const errorDiv = document.getElementById('error-display');
  if (errorDiv) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = `Error: ${event.error.message}`;
  }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initDemo().catch(error => {
    console.error('Failed to initialize demo:', error);
    const errorDiv = document.getElementById('error-display');
    if (errorDiv) {
      errorDiv.style.display = 'block';
      errorDiv.textContent = `Failed to initialize: ${error.message}`;
    }
  });

  setupPerformanceMonitoring();
});
