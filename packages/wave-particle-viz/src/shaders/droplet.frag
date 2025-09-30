/**
 * Fragment shader for electron droplets
 * Creates smooth, organic droplet appearance with depth
 */

precision highp float;

uniform float time;
uniform vec3 dropletColor;
uniform float fadeDistance;

varying float vOpacity;
varying vec2 vUv;
varying float vDistance;

// Function to create smooth circular droplet shape
float dropletShape(vec2 uv) {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(gl_PointCoord, center);

  // Create soft circular falloff
  float edge = 0.5;
  float softness = 0.1;
  float alpha = 1.0 - smoothstep(edge - softness, edge, dist);

  // Add organic variation
  float variation = 0.05 * sin(time * 3.0 + dist * 20.0);
  alpha += variation;

  return clamp(alpha, 0.0, 1.0);
}

// Function to create inner glow effect
float innerGlow(vec2 uv) {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(gl_PointCoord, center);

  // Bright center that fades outward
  float glow = 1.0 - dist * 2.0;
  glow = clamp(glow, 0.0, 1.0);
  glow = pow(glow, 2.0); // Sharpen the falloff

  return glow;
}

void main() {
  // Calculate droplet shape
  float shape = dropletShape(gl_PointCoord);

  // Early discard for performance
  if (shape < 0.01) {
    discard;
  }

  // Calculate inner glow
  float glow = innerGlow(gl_PointCoord);

  // Combine base color with glow
  vec3 finalColor = dropletColor;
  finalColor += vec3(0.3, 0.3, 0.3) * glow; // Add white glow

  // Distance-based fading
  float distanceFade = 1.0 - clamp(vDistance / fadeDistance, 0.0, 1.0);

  // Final opacity calculation
  float finalOpacity = vOpacity * shape * distanceFade;

  // Enhance brightness for low opacity particles
  finalColor *= (1.0 + (1.0 - vOpacity) * 0.5);

  gl_FragColor = vec4(finalColor, finalOpacity);
}