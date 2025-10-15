import * as THREE from 'three';
import type { QuantumNumbers } from '../../../../services/quantum-engine/src/index.js';
import {
  computeNodalConfiguration,
  type NodalConfiguration,
} from './nodalConfig.js';

export function createNodalPlanes(
  quantumNumbers: QuantumNumbers,
  isDarkBackground: boolean,
  extent: number,
  config?: NodalConfiguration,
): THREE.Group {
  const nodalGroup = new THREE.Group();
  const nodalColor = isDarkBackground ? 0xffffff : 0x333333;
  const nodalOpacity = isDarkBackground ? 0.12 : 0.15;
  const planeSize = extent * 2.5;
  const planeSegments = 10;

  const structure = config ?? computeNodalConfiguration(quantumNumbers, extent);

  for (const sphere of structure.spheres) {
    const geometry = new THREE.SphereGeometry(sphere.radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: nodalColor,
      wireframe: true,
      transparent: true,
      opacity: nodalOpacity * 0.8,
      depthWrite: false,
    });
    nodalGroup.add(new THREE.Mesh(geometry, material));
  }

  const basePlaneGeometry = new THREE.PlaneGeometry(planeSize, planeSize, planeSegments, planeSegments);
  for (const plane of structure.planes) {
    const material = new THREE.MeshBasicMaterial({
      color: nodalColor,
      transparent: true,
      opacity: nodalOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(basePlaneGeometry.clone(), material);
    mesh.rotation.set(...plane.rotation);
    nodalGroup.add(mesh);
  }

  for (const cone of structure.cones) {
    const geometry = new THREE.ConeGeometry(cone.radius, cone.height, 16, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: nodalColor,
      transparent: true,
      opacity: nodalOpacity * 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      wireframe: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(...cone.rotation);
    mesh.position.set(...cone.position);
    nodalGroup.add(mesh);
  }

  return nodalGroup;
}
