import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import type { HydrogenLikeAtom, QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';
import type { DensityFieldData } from '../physics/densityField.js';
import { ensureDensityField, getCachedDensityField } from '../physics/densityFieldCache.js';

/**
 * Laplacian smoothing algorithm to reduce faceted/blocky appearance from marching cubes.
 * This iteratively averages each vertex position with its neighbors.
 *
 * @param geometry - BufferGeometry to smooth
 * @param iterations - Number of smoothing passes (more = smoother but may lose detail)
 * @param lambda - Smoothing factor (0-1, higher = more smoothing per iteration)
 */
function laplacianSmooth(geometry: THREE.BufferGeometry, iterations: number, lambda: number): void {
  if (!geometry.index) {
    return; // Need indexed geometry
  }

  const positionAttribute = geometry.attributes.position;
  const indexArray = geometry.index.array;
  const vertexCount = positionAttribute.count;

  // Build adjacency list: which vertices are connected to each vertex
  const adjacency: Set<number>[] = Array.from({ length: vertexCount }, () => new Set<number>());

  for (let i = 0; i < indexArray.length; i += 3) {
    const a = indexArray[i];
    const b = indexArray[i + 1];
    const c = indexArray[i + 2];

    adjacency[a].add(b);
    adjacency[a].add(c);
    adjacency[b].add(a);
    adjacency[b].add(c);
    adjacency[c].add(a);
    adjacency[c].add(b);
  }

  // Temporary arrays for smoothing
  const newPositions = new Float32Array(vertexCount * 3);
  const vertex = new THREE.Vector3();
  const neighbor = new THREE.Vector3();
  const smoothed = new THREE.Vector3();

  // Perform multiple smoothing iterations
  for (let iter = 0; iter < iterations; iter++) {
    // For each vertex, compute the average of its neighbors
    for (let i = 0; i < vertexCount; i++) {
      const neighbors = adjacency[i];
      if (neighbors.size === 0) {
        // Isolated vertex - keep original position
        newPositions[i * 3] = positionAttribute.getX(i);
        newPositions[i * 3 + 1] = positionAttribute.getY(i);
        newPositions[i * 3 + 2] = positionAttribute.getZ(i);
        continue;
      }

      // Current vertex position
      vertex.set(positionAttribute.getX(i), positionAttribute.getY(i), positionAttribute.getZ(i));

      // Average neighbor positions
      smoothed.set(0, 0, 0);
      for (const neighborIdx of neighbors) {
        neighbor.set(
          positionAttribute.getX(neighborIdx),
          positionAttribute.getY(neighborIdx),
          positionAttribute.getZ(neighborIdx),
        );
        smoothed.add(neighbor);
      }
      smoothed.divideScalar(neighbors.size);

      // Blend between original and averaged position
      vertex.lerp(smoothed, lambda);

      newPositions[i * 3] = vertex.x;
      newPositions[i * 3 + 1] = vertex.y;
      newPositions[i * 3 + 2] = vertex.z;
    }

    // Copy smoothed positions back to geometry
    for (let i = 0; i < vertexCount; i++) {
      positionAttribute.setXYZ(i, newPositions[i * 3], newPositions[i * 3 + 1], newPositions[i * 3 + 2]);
    }
  }

  positionAttribute.needsUpdate = true;
}

export interface DensityIsosurfaceOptions {
  atom: HydrogenLikeAtom;
  atomicNumber: number;
  quantumNumbers: QuantumNumbers;
  extent: number;
  gridResolution: number;
  minDensity: number;
  maxDensity: number;
  isDarkBackground: boolean;
  orbitalColor: { r: number; g: number; b: number };
  distributionType: 'accurate' | 'aesthetic';
  maxProbability: number;
  precomputedField?: DensityFieldData;
}

/**
 * Generates translucent density "bubbles" that wrap the particle cloud.
 * The geometry is produced with Marching Cubes so the surfaces hug the sampled
 * hydrogenic probability density while maintaining the original heat-map palette.
 */
export function createDensityIsosurface(options: DensityIsosurfaceOptions): THREE.Group {
  const {
    atom,
    atomicNumber,
    quantumNumbers,
    extent,
    gridResolution,
    minDensity,
    maxDensity,
    isDarkBackground,
    orbitalColor,
    distributionType,
    maxProbability,
    precomputedField,
  } = options;

  const targetResolution = resolveDensityResolution(gridResolution, distributionType);

  let densityField: DensityFieldData | undefined = precomputedField;
  if (!densityField || densityField.resolution < targetResolution - 1) {
    densityField = getCachedDensityField(atomicNumber, quantumNumbers, targetResolution, extent, maxProbability) ??
      ensureDensityField(atomicNumber, atom, quantumNumbers, extent, maxProbability, targetResolution);
  }

  const isoLevels = computeIsoLevels(minDensity, maxDensity, distributionType, densityField.maxSample);

  const group = new THREE.Group();
  group.name = 'density-bubbles';

  const maxThreshold = isoLevels[isoLevels.length - 1];
  const minThreshold = isoLevels[0];
  const baseScale = distributionType === 'aesthetic' ? 1.08 : 1.04;
  const expansionStep = distributionType === 'aesthetic' ? 0.018 : 0.012;

  // GPU Optimization: Use a single flattened render order for all density bubbles
  // to prevent constant GPU resorting during rendering
  const DENSITY_RENDER_ORDER = 40;

  isoLevels.forEach((isoLevel, index) => {
    const { material, opacity } = createBubbleMaterial({
      isoLevel,
      minThreshold,
      maxThreshold,
      isDarkBackground,
      orbitalColor,
      maxSample: densityField!.maxSample,
    });

    const resolution = densityField!.resolution;
    const maxPolyCount = Math.max(20000, resolution * resolution * 18);
    const bubble = new MarchingCubes(resolution, material, false, false, maxPolyCount);
    bubble.reset();

    const fieldClone = densityField!.field.slice();
    bubble.field.set(fieldClone);
    bubble.isolation = isoLevel;
    bubble.blur(distributionType === 'aesthetic' ? 1.8 : 1.2);
    bubble.update();

    const geometry = bubble.geometry.clone();
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
    }

    // Apply Laplacian smoothing to reduce faceted appearance from marching cubes
    // Higher iterations = smoother but may lose detail
    const smoothingIterations = distributionType === 'aesthetic' ? 3 : 2;
    laplacianSmooth(geometry, smoothingIterations, 0.5);

    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    const expansion = baseScale + index * expansionStep;
    const scale = extent * expansion;
    mesh.scale.set(scale, scale, scale);
    // Use single flattened render order to reduce GPU sorting overhead
    mesh.renderOrder = DENSITY_RENDER_ORDER;
    mesh.userData.isoLevel = isoLevel;
    mesh.userData.opacity = opacity;
    mesh.name = `density-bubble-${index}`;

    group.add(mesh);

    bubble.geometry.dispose();
  });

  return group;
}

interface BubbleMaterialOptions {
  isoLevel: number;
  minThreshold: number;
  maxThreshold: number;
  isDarkBackground: boolean;
  orbitalColor: { r: number; g: number; b: number };
  maxSample: number;
}

function createBubbleMaterial(options: BubbleMaterialOptions): {
  material: THREE.MeshBasicMaterial;
  opacity: number;
} {
  const { isoLevel, minThreshold, maxThreshold, isDarkBackground, orbitalColor, maxSample } = options;

  const range = Math.max(maxThreshold - minThreshold, 1e-6);
  const normalizedRange = THREE.MathUtils.clamp((isoLevel - minThreshold) / range, 0, 1);
  const normalized = Math.min(isoLevel / Math.max(maxSample, 1e-6), 1);

  const gradientSample = Math.pow(normalized, 0.9);
  const color = getHeatMapColor(gradientSample, isDarkBackground, orbitalColor);

  const opacity = THREE.MathUtils.lerp(isDarkBackground ? 0.22 : 0.28, isDarkBackground ? 0.6 : 0.45, normalizedRange);

  // GPU Optimization: Only enable transparency when opacity is significantly below 1.0
  // This reduces transparent render passes and improves performance
  const needsTransparency = opacity < 0.95;

  const material = new THREE.MeshBasicMaterial({
    color,
    opacity,
    transparent: needsTransparency,
    depthWrite: !needsTransparency, // Enable depth write for opaque/near-opaque objects
    side: THREE.FrontSide, // Already optimized: single-sided rendering
  });

  return { material, opacity };
}

function computeIsoLevels(
  minDensity: number,
  maxDensity: number,
  mode: 'accurate' | 'aesthetic',
  maxSample: number,
): number[] {
  const clampedMin = THREE.MathUtils.clamp(minDensity, 0.01, 0.95);
  const clampedMax = THREE.MathUtils.clamp(maxDensity, clampedMin + 0.03, 0.995);

  const weightStops = mode === 'aesthetic'
    ? [0, 0.25, 0.45, 0.62, 0.78, 0.9, 1]
    : [0, 0.35, 0.6, 0.82, 1];

  const minValue = clampedMin * maxSample;
  const maxValue = clampedMax * maxSample;

  const isoLevels = weightStops
    .map((w) => THREE.MathUtils.lerp(minValue, maxValue, w))
    .filter((level, idx, arr) => idx === 0 || level - arr[idx - 1] > maxSample * 0.005);

  if (isoLevels.length === 0) {
    isoLevels.push((minValue + maxValue) * 0.5);
  }

  return isoLevels;
}

function getHeatMapColor(
  normalizedDensity: number,
  isDarkBackground: boolean,
  orbitalColor: { r: number; g: number; b: number },
): THREE.Color {
  const baseColor = new THREE.Color(orbitalColor.r, orbitalColor.g, orbitalColor.b);

  const gradientLow = new THREE.Color(0.105, 0.027, 0.353);
  const gradientMid1 = new THREE.Color(0.282, 0.114, 0.569);
  const gradientMid2 = new THREE.Color(1.0, 0.496, 0.055);
  const gradientHigh = new THREE.Color(1.0, 0.969, 0.74);

  let gradientColor: THREE.Color;

  if (normalizedDensity < 0.33) {
    gradientColor = gradientLow.clone().lerp(gradientMid1, normalizedDensity / 0.33);
  } else if (normalizedDensity < 0.66) {
    gradientColor = gradientMid1.clone().lerp(gradientMid2, (normalizedDensity - 0.33) / 0.33);
  } else {
    gradientColor = gradientMid2.clone().lerp(gradientHigh, (normalizedDensity - 0.66) / 0.34);
  }

  if (isDarkBackground) {
    return gradientColor.multiplyScalar(0.9).add(baseColor.clone().multiplyScalar(0.35));
  }

  return baseColor.clone().lerp(gradientColor, 0.55);
}

/**
 * Adaptive resolution for marching cubes based on grid resolution and mode.
 * Higher resolutions produce smoother isosurfaces but require more computation.
 * For large orbitals (higher n), we need more resolution to avoid faceted appearance.
 */
export function resolveDensityResolution(gridResolution: number, mode: 'accurate' | 'aesthetic'): number {
  const multiplier = mode === 'aesthetic' ? 2.4 : 1.9;
  const scaled = Math.round(gridResolution * multiplier);

  // Adaptive resolution: allow higher resolution for large orbitals to avoid faceting
  // The max is now adaptive based on the input grid resolution
  const minResolution = 36;
  const maxResolution = mode === 'aesthetic' ? 150 : 180;

  return THREE.MathUtils.clamp(scaled, minResolution, maxResolution);
}
