/**
 * Vertex shader for electron droplets
 * Optimized for performance with instanced rendering
 */

attribute vec3 position;
attribute float opacity;
attribute float size;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;
uniform float globalScale;

varying float vOpacity;
varying vec2 vUv;
varying float vDistance;

void main() {
  // Calculate distance from camera for depth-based effects
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDistance = length(mvPosition.xyz);

  // Pass opacity to fragment shader
  vOpacity = opacity;

  // Calculate UV coordinates for circular droplet shape
  vUv = vec2(0.5, 0.5);

  // Size attenuation based on distance
  float sizeAttenuation = globalScale * size / vDistance;

  // Add subtle pulsing based on time and position
  float pulse = 1.0 + 0.1 * sin(time * 2.0 + position.x + position.y + position.z);
  sizeAttenuation *= pulse;

  // Final position
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = sizeAttenuation;
}