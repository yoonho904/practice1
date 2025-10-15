import * as THREE from 'three';
import { describe, expect, it, afterEach } from 'vitest';
import type { HydrogenLikeAtom, QuantumNumbers } from '../../../../../services/quantum-engine/src/index.js';
import { createDensityIsosurface, resolveDensityResolution } from '../createDensityIsosurface.js';
import { clearDensityFieldCache } from '../../physics/densityFieldCache.js';

class GaussianAtom {
  calculateProbabilityDensity(
    _quantumNumbers: QuantumNumbers,
    x: number,
    y: number,
    z: number,
  ): number {
    const r2 = x * x + y * y + z * z;
    return Math.exp(-r2);
  }
}

function luminance(color: THREE.Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

describe('createDensityIsosurface', () => {
  const quantumNumbers: QuantumNumbers = { n: 1, l: 0, m: 0, s: 0.5 };
  const orbitalColor = { r: 0.4, g: 0.7, b: 1.0 };

  afterEach(() => {
    clearDensityFieldCache();
  });

  it('creates layered translucent meshes that respect density bounds', () => {
    const group = createDensityIsosurface({
      atom: new GaussianAtom() as unknown as HydrogenLikeAtom,
      atomicNumber: 1,
      quantumNumbers,
      extent: 1.4,
      gridResolution: 24,
      minDensity: 0.2,
      maxDensity: 0.75,
      isDarkBackground: true,
      orbitalColor,
      distributionType: 'accurate',
      maxProbability: 1,
    });

    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.children.length).toBeGreaterThan(0);

    let previousIso = -Infinity;
    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      expect(mesh).toBeInstanceOf(THREE.Mesh);
      const material = mesh.material as THREE.MeshBasicMaterial;

      // GPU Optimization: Transparency is only enabled when opacity < 0.95
      if (material.opacity < 0.95) {
        expect(material.transparent).toBe(true);
      }
      expect(material.opacity).toBeGreaterThan(0);
      expect(material.opacity).toBeLessThanOrEqual(1);

      const { isoLevel, opacity } = mesh.userData as { isoLevel: number; opacity: number };
      expect(isoLevel).toBeGreaterThanOrEqual(0.2 - 1e-3);
      expect(isoLevel).toBeLessThanOrEqual(0.75 + 1e-3);
      expect(isoLevel).toBeGreaterThan(previousIso);

      expect(opacity).toBeCloseTo(material.opacity, 5);
      previousIso = isoLevel;
    }
  });

  it('uses a brighter palette for dark backgrounds than for light ones', () => {
    const commonOptions = {
      atom: new GaussianAtom() as unknown as HydrogenLikeAtom,
      quantumNumbers,
      extent: 1.6,
      gridResolution: 28,
      minDensity: 0.1,
      maxDensity: 0.95,
      orbitalColor,
      distributionType: 'aesthetic' as const,
    };

    const darkGroup = createDensityIsosurface({
      ...commonOptions,
      atomicNumber: 1,
      isDarkBackground: true,
      maxProbability: 1,
    });
    const lightGroup = createDensityIsosurface({
      ...commonOptions,
      atomicNumber: 1,
      isDarkBackground: false,
      maxProbability: 1,
    });

    const darkMesh = darkGroup.children.at(-1) as THREE.Mesh;
    const lightMesh = lightGroup.children.at(-1) as THREE.Mesh;

    const darkMaterial = darkMesh.material as THREE.MeshBasicMaterial;
    const lightMaterial = lightMesh.material as THREE.MeshBasicMaterial;

    expect(luminance(darkMaterial.color)).toBeGreaterThan(luminance(lightMaterial.color));
    expect(darkMaterial.opacity).toBeGreaterThan(lightMaterial.opacity);
  });

  it('uses flattened render order for GPU optimization', () => {
    const group = createDensityIsosurface({
      atom: new GaussianAtom() as unknown as HydrogenLikeAtom,
      atomicNumber: 1,
      quantumNumbers,
      extent: 1.5,
      gridResolution: 28,
      minDensity: 0.1,
      maxDensity: 0.8,
      isDarkBackground: true,
      orbitalColor,
      distributionType: 'aesthetic',
      maxProbability: 1,
    });

    const renderOrders = new Set<number>();
    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      renderOrders.add(mesh.renderOrder);
    }

    // All bubbles should use the same render order (flattened)
    expect(renderOrders.size).toBe(1);
    expect(Array.from(renderOrders)[0]).toBe(40);
  });

  it('optimizes transparency based on opacity threshold', () => {
    const group = createDensityIsosurface({
      atom: new GaussianAtom() as unknown as HydrogenLikeAtom,
      atomicNumber: 1,
      quantumNumbers,
      extent: 1.3,
      gridResolution: 32,
      minDensity: 0.05,
      maxDensity: 0.95,
      isDarkBackground: false,
      orbitalColor,
      distributionType: 'accurate',
      maxProbability: 1,
    });

    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshBasicMaterial;

      // Transparency should only be enabled when opacity < 0.95
      if (material.opacity >= 0.95) {
        expect(material.transparent).toBe(false);
        expect(material.depthWrite).toBe(true);
      } else {
        expect(material.transparent).toBe(true);
        expect(material.depthWrite).toBe(false);
      }

      // All materials should use single-sided rendering
      expect(material.side).toBe(THREE.FrontSide);
    }
  });

  it('uses adaptive resolution with higher limits for large orbitals', () => {
    // Test aesthetic mode
    const aestheticRes = resolveDensityResolution(60, 'aesthetic');
    expect(aestheticRes).toBeGreaterThan(120); // Old limit was 120
    expect(aestheticRes).toBeLessThanOrEqual(150); // New limit for aesthetic

    // Test accurate mode
    const accurateRes = resolveDensityResolution(80, 'accurate');
    expect(accurateRes).toBeGreaterThan(120); // Old limit was 120
    expect(accurateRes).toBeLessThanOrEqual(180); // New limit for accurate

    // Test lower bounds still work
    expect(resolveDensityResolution(10, 'aesthetic')).toBeGreaterThanOrEqual(36);
    expect(resolveDensityResolution(10, 'accurate')).toBeGreaterThanOrEqual(36);
  });

  it('applies Laplacian smoothing to reduce faceted appearance', () => {
    const group = createDensityIsosurface({
      atom: new GaussianAtom() as unknown as HydrogenLikeAtom,
      atomicNumber: 1,
      quantumNumbers,
      extent: 2.0,
      gridResolution: 48,
      minDensity: 0.15,
      maxDensity: 0.85,
      isDarkBackground: true,
      orbitalColor: { r: 0.5, g: 0.8, b: 1.0 },
      distributionType: 'aesthetic',
      maxProbability: 1,
    });

    expect(group.children.length).toBeGreaterThan(0);

    // Verify that geometries have proper vertex normals (recomputed after smoothing)
    for (const child of group.children) {
      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry as THREE.BufferGeometry;

      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.index).toBeDefined();

      // Check that geometry is valid after smoothing
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
      expect(geometry.attributes.normal.count).toBe(geometry.attributes.position.count);
    }
  });
});
