import type { QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';

export interface NodalSphereDescriptor {
  kind: 'sphere';
  radius: number;
}

export interface NodalPlaneDescriptor {
  kind: 'plane';
  rotation: [number, number, number];
}

export interface NodalConeDescriptor {
  kind: 'cone';
  rotation: [number, number, number];
  position: [number, number, number];
  height: number;
  radius: number;
}

export interface NodalConfiguration {
  spheres: NodalSphereDescriptor[];
  planes: NodalPlaneDescriptor[];
  cones: NodalConeDescriptor[];
}

export function computeNodalConfiguration(
  quantumNumbers: QuantumNumbers,
  extent: number,
): NodalConfiguration {
  const { n, l, m } = quantumNumbers;
  const config: NodalConfiguration = {
    spheres: [],
    planes: [],
    cones: [],
  };

  const radialNodes = n - l - 1;
  if (radialNodes > 0) {
    for (let i = 1; i <= radialNodes; i++) {
      const nodeRadius = extent * (i / (radialNodes + 1));
      config.spheres.push({ kind: 'sphere', radius: nodeRadius });
    }
  }

  if (l === 0) {
    return config;
  }

  const addPlane = (rx: number, ry: number, rz: number) => {
    config.planes.push({ kind: 'plane', rotation: [rx, ry, rz] });
  };

  if (l === 1) {
    if (m === 0) {
      addPlane(0, 0, 0);
    } else if (m === 1) {
      addPlane(0, Math.PI / 2, 0);
    } else if (m === -1) {
      addPlane(Math.PI / 2, 0, 0);
    }
    return config;
  }

  if (l === 2) {
    if (m === 0) {
      const coneAngle = Math.acos(1 / Math.sqrt(3));
      const coneHeight = extent * 1.5;
      const coneRadius = coneHeight * Math.tan(coneAngle);
      config.cones.push({
        kind: 'cone',
        rotation: [0, 0, 0],
        position: [0, coneHeight / 2, 0],
        height: coneHeight,
        radius: coneRadius,
      });
      config.cones.push({
        kind: 'cone',
        rotation: [0, 0, Math.PI],
        position: [0, -coneHeight / 2, 0],
        height: coneHeight,
        radius: coneRadius,
      });
    } else if (m === 1) {
      addPlane(0, 0, 0);
      addPlane(0, Math.PI / 2, 0);
    } else if (m === -1) {
      addPlane(0, 0, 0);
      addPlane(Math.PI / 2, 0, 0);
    } else if (m === 2) {
      addPlane(Math.PI / 2, 0, 0);
      addPlane(0, Math.PI / 2, 0);
    } else if (m === -2) {
      addPlane(0, 0, Math.PI / 4);
      addPlane(0, 0, -Math.PI / 4);
    }
    return config;
  }

  if (l === 3) {
    switch (m) {
      case 0:
        addPlane(0, 0, 0);
        addPlane(Math.PI / 3, 0, 0);
        addPlane(-Math.PI / 3, 0, 0);
        break;
      case 1:
        addPlane(0, Math.PI / 2, 0);
        addPlane(0, Math.PI / 2 + Math.PI / 6, 0);
        addPlane(0, Math.PI / 2 - Math.PI / 6, 0);
        break;
      case -1:
        addPlane(Math.PI / 2, 0, 0);
        addPlane(Math.PI / 2 + Math.PI / 6, 0, 0);
        addPlane(Math.PI / 2 - Math.PI / 6, 0, 0);
        break;
      case 2:
        addPlane(0, 0, 0);
        addPlane(0, 0, Math.PI / 3);
        addPlane(0, 0, -Math.PI / 3);
        break;
      case -2:
        addPlane(0, 0, Math.PI / 4);
        addPlane(0, 0, -Math.PI / 4);
        addPlane(0, 0, 0);
        break;
      case 3:
        addPlane(0, Math.PI / 2, 0);
        addPlane(0, Math.PI / 2 + Math.PI / 3, 0);
        addPlane(0, Math.PI / 2 - Math.PI / 3, 0);
        break;
      case -3:
        addPlane(Math.PI / 2, 0, 0);
        addPlane(Math.PI / 2 + Math.PI / 3, 0, 0);
        addPlane(Math.PI / 2 - Math.PI / 3, 0, 0);
        break;
      default:
        for (let i = 0; i < 3; i++) {
          addPlane(0, 0, (i * Math.PI) / 3);
        }
        break;
    }
    return config;
  }

  const planeCount = Math.max(3, Math.min(l, 4));
  for (let i = 0; i < planeCount; i++) {
    addPlane(0, 0, (i * Math.PI) / planeCount);
  }
  return config;
}
