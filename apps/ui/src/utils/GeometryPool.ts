import * as THREE from "three";

interface GeometryKey {
  type: string;
  parameters: string;
}

export class GeometryPool {
  private static instance: GeometryPool;
  private geometries = new Map<string, THREE.BufferGeometry>();
  private materials = new Map<string, THREE.Material>();
  private usageCounts = new Map<string, number>();
  private readonly maxCacheSize = 100;

  private constructor() {}

  static getInstance(): GeometryPool {
    if (!GeometryPool.instance) {
      GeometryPool.instance = new GeometryPool();
    }
    return GeometryPool.instance;
  }

  private createKey(type: string, parameters: any): string {
    return `${type}_${JSON.stringify(parameters)}`;
  }

  getSphereGeometry(radius: number, widthSegments: number, heightSegments: number): THREE.SphereGeometry {
    const key = this.createKey('sphere', { radius, widthSegments, heightSegments });

    let geometry = this.geometries.get(key) as THREE.SphereGeometry;
    if (!geometry) {
      geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
      this.cacheGeometry(key, geometry);
    }

    this.incrementUsage(key);
    return geometry;
  }

  getCylinderGeometry(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments: number
  ): THREE.CylinderGeometry {
    const key = this.createKey('cylinder', { radiusTop, radiusBottom, height, radialSegments });

    let geometry = this.geometries.get(key) as THREE.CylinderGeometry;
    if (!geometry) {
      geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
      this.cacheGeometry(key, geometry);
    }

    this.incrementUsage(key);
    return geometry;
  }

  getTorusGeometry(
    radius: number,
    tube: number,
    radialSegments: number,
    tubularSegments: number
  ): THREE.TorusGeometry {
    const key = this.createKey('torus', { radius, tube, radialSegments, tubularSegments });

    let geometry = this.geometries.get(key) as THREE.TorusGeometry;
    if (!geometry) {
      geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
      this.cacheGeometry(key, geometry);
    }

    this.incrementUsage(key);
    return geometry;
  }

  getIcosahedronGeometry(radius: number, detail: number): THREE.IcosahedronGeometry {
    const key = this.createKey('icosahedron', { radius, detail });

    let geometry = this.geometries.get(key) as THREE.IcosahedronGeometry;
    if (!geometry) {
      geometry = new THREE.IcosahedronGeometry(radius, detail);
      this.cacheGeometry(key, geometry);
    }

    this.incrementUsage(key);
    return geometry;
  }

  getMaterial(
    type: 'lambert' | 'physical' | 'standard',
    parameters: {
      color?: THREE.Color;
      opacity?: number;
      transparent?: boolean;
      emissive?: THREE.Color;
      metalness?: number;
      roughness?: number;
    }
  ): THREE.Material {
    const key = this.createKey(type, {
      color: parameters.color?.getHex(),
      opacity: parameters.opacity,
      transparent: parameters.transparent,
      emissive: parameters.emissive?.getHex(),
      metalness: parameters.metalness,
      roughness: parameters.roughness
    });

    let material = this.materials.get(key);
    if (!material) {
      switch (type) {
        case 'lambert':
          material = new THREE.MeshLambertMaterial(parameters);
          break;
        case 'physical':
          material = new THREE.MeshPhysicalMaterial(parameters);
          break;
        case 'standard':
          material = new THREE.MeshStandardMaterial(parameters);
          break;
        default:
          throw new Error(`Unknown material type: ${type}`);
      }
      this.cacheMaterial(key, material);
    }

    this.incrementUsage(key);
    return material;
  }

  private cacheGeometry(key: string, geometry: THREE.BufferGeometry): void {
    if (this.geometries.size >= this.maxCacheSize) {
      this.evictLeastUsed();
    }

    this.geometries.set(key, geometry);
    this.usageCounts.set(key, 0);
  }

  private cacheMaterial(key: string, material: THREE.Material): void {
    if (this.materials.size >= this.maxCacheSize) {
      this.evictLeastUsedMaterial();
    }

    this.materials.set(key, material);
    this.usageCounts.set(key, 0);
  }

  private incrementUsage(key: string): void {
    const currentCount = this.usageCounts.get(key) || 0;
    this.usageCounts.set(key, currentCount + 1);
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let minUsage = Infinity;

    for (const [key, usage] of this.usageCounts.entries()) {
      if (this.geometries.has(key) && usage < minUsage) {
        minUsage = usage;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      const geometry = this.geometries.get(leastUsedKey);
      geometry?.dispose();
      this.geometries.delete(leastUsedKey);
      this.usageCounts.delete(leastUsedKey);
    }
  }

  private evictLeastUsedMaterial(): void {
    let leastUsedKey = '';
    let minUsage = Infinity;

    for (const [key, usage] of this.usageCounts.entries()) {
      if (this.materials.has(key) && usage < minUsage) {
        minUsage = usage;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      const material = this.materials.get(leastUsedKey);
      material?.dispose();
      this.materials.delete(leastUsedKey);
      this.usageCounts.delete(leastUsedKey);
    }
  }

  getStats(): {
    geometries: number;
    materials: number;
    totalUsage: number;
  } {
    const totalUsage = Array.from(this.usageCounts.values()).reduce((sum, count) => sum + count, 0);

    return {
      geometries: this.geometries.size,
      materials: this.materials.size,
      totalUsage
    };
  }

  clear(): void {
    // Dispose all geometries
    for (const geometry of this.geometries.values()) {
      geometry.dispose();
    }

    // Dispose all materials
    for (const material of this.materials.values()) {
      material.dispose();
    }

    this.geometries.clear();
    this.materials.clear();
    this.usageCounts.clear();
  }
}

export const geometryPool = GeometryPool.getInstance();