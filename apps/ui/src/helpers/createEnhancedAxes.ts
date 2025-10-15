import * as THREE from 'three';
import type { QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';

/**
 * Create enhanced XYZ axes with grid lines and Bohr radius labels
 *
 * @param quantumNumbers - Current quantum state (n, l, m)
 * @param isDarkBackground - Whether the scene has a dark background
 * @returns THREE.Group containing axes, grids, and labels
 */
export function createEnhancedAxes(quantumNumbers: QuantumNumbers, isDarkBackground: boolean): THREE.Group {
  const axesGroup = new THREE.Group();

  // Calculate orbital extent for dynamic scaling
  const { n, l } = quantumNumbers;
  const mostProbableRadius = Math.max(n * n - l * (l + 1) / 2, 1);
  const extent = Math.max(mostProbableRadius * 2.2, n * n * 1.8, 3);
  const axisLength = 100; // Match grid size - extend across entire viewport

  // Theme-aware colors
  const axisColors = isDarkBackground ? {
    x: 0xff3333,  // Bright red
    y: 0x33ff33,  // Bright green
    z: 0x3333ff,  // Bright blue
    grid: 0x444444,
    labelBg: 0x000000,
    labelText: 0xffffff
  } : {
    x: 0xcc0000,  // Dark red
    y: 0x00aa00,  // Dark green
    z: 0x0000cc,  // Dark blue
    grid: 0xcccccc,
    labelBg: 0xffffff,
    labelText: 0x000000
  };

  const axisWidth = 0.05;

  // Helper to create axis line
  const createAxisLine = (color: number, rotation: [number, number, number], position: [number, number, number]) => {
    const geometry = new THREE.CylinderGeometry(axisWidth, axisWidth, axisLength, 8);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const axis = new THREE.Mesh(geometry, material);
    axis.rotation.set(...rotation);
    axis.position.set(...position);
    return axis;
  };

  // X axis (red)
  axesGroup.add(createAxisLine(axisColors.x, [0, 0, Math.PI / 2], [0, 0, 0]));

  // Y axis (green)
  axesGroup.add(createAxisLine(axisColors.y, [0, 0, 0], [0, 0, 0]));

  // Z axis (blue)
  axesGroup.add(createAxisLine(axisColors.z, [Math.PI / 2, 0, 0], [0, 0, 0]));

  // Grid lines (XY, XZ, YZ planes)
  // Make grid extend across entire viewport instead of scaling with orbital
  const gridSize = 100; // Large fixed size to cover entire visible area
  const gridDivisions = 20; // More divisions for full-screen grid
  const gridOpacity = isDarkBackground ? 0.12 : 0.15; // Slightly more subtle for large grid

  // XY plane grid (z=0)
  const gridXY = new THREE.GridHelper(gridSize, gridDivisions, axisColors.grid, axisColors.grid);
  gridXY.rotation.x = Math.PI / 2;
  gridXY.material.transparent = true;
  gridXY.material.opacity = gridOpacity;
  axesGroup.add(gridXY);

  // XZ plane grid (y=0)
  const gridXZ = new THREE.GridHelper(gridSize, gridDivisions, axisColors.grid, axisColors.grid);
  gridXZ.material.transparent = true;
  gridXZ.material.opacity = gridOpacity;
  axesGroup.add(gridXZ);

  // YZ plane grid (x=0)
  const gridYZ = new THREE.GridHelper(gridSize, gridDivisions, axisColors.grid, axisColors.grid);
  gridYZ.rotation.z = Math.PI / 2;
  gridYZ.material.transparent = true;
  gridYZ.material.opacity = gridOpacity;
  axesGroup.add(gridYZ);

  // Create text labels using canvas sprites
  const createLabel = (text: string, position: THREE.Vector3, color: number) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {return null;}

    canvas.width = 256;
    canvas.height = 96;  // Reduced height to prevent cutoff

    // Background (transparent)
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Text - using Inter font to match UI panels
    context.font = '600 36px Inter, -apple-system, BlinkMacSystemFont, Arial, sans-serif';
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Add text shadow for better visibility
    context.shadowColor = `#${axisColors.labelBg.toString(16).padStart(6, '0')}`;
    context.shadowBlur = 8;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;

    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.95 });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(1.2, 0.6, 1); // Smaller and more compact

    return sprite;
  };

  // Bohr radius constant (for SI conversions)
  const a0_pm = 52.9177; // Bohr radius in picometers

  // Add labels at orbital extent (edges of the orbital) to show its size
  const labelDistance = extent + 1.5; // Position labels just beyond orbital edge
  const labelBohrRadius = extent;

  // X axis labels
  const xLabel = createLabel(
    `X: ${labelBohrRadius.toFixed(1)} a₀\n(${(labelBohrRadius * a0_pm).toFixed(0)} pm)`,
    new THREE.Vector3(labelDistance, 0, 0),
    axisColors.x
  );
  if (xLabel) {axesGroup.add(xLabel);}

  // Y axis labels
  const yLabel = createLabel(
    `Y: ${labelBohrRadius.toFixed(1)} a₀\n(${(labelBohrRadius * a0_pm).toFixed(0)} pm)`,
    new THREE.Vector3(0, labelDistance, 0),
    axisColors.y
  );
  if (yLabel) {axesGroup.add(yLabel);}

  // Z axis labels
  const zLabel = createLabel(
    `Z: ${labelBohrRadius.toFixed(1)} a₀\n(${(labelBohrRadius * a0_pm).toFixed(0)} pm)`,
    new THREE.Vector3(0, 0, labelDistance),
    axisColors.z
  );
  if (zLabel) {axesGroup.add(zLabel);}

  return axesGroup;
}
