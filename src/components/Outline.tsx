import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * Ink outline via inverted hull ("solidify" trick from Blender): a back-facing
 * copy of every mesh, pushed out along its normals by a screen-constant width.
 */
const vertex = /* glsl */ `
  uniform float width;
  uniform float wobble;
  uniform float wscale;
  uniform float seed;
  uniform float time;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3) + seed);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    float depth = max(-mv.z, 0.6);
    float w = width;
    vec3 jitter = vec3(0.0);
    if (wobble > 0.0) {
      // hand-drawn line: thickness swings with noise (going negative breaks the stroke), plus a sideways wander
      vec3 q = position * wscale + time;
      w *= 1.0 + (noise(q) * 2.0 - 1.0) * wobble;
      jitter = (vec3(noise(q * 1.7 + 11.0), noise(q * 1.7 + 23.0), 0.0) * 2.0 - 1.0) * width * wobble * 0.5;
    }
    mv.xyz += (n * w + jitter) * depth;
    gl_Position = projectionMatrix * mv;
  }
`
const fragment = /* glsl */ `
  uniform vec3 color;
  void main() {
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/** `sketch` turns the clean hull into a wobbly ink line: wobble 0..1+ (how uneven), scale (wiggles per unit), seed. */
export type Sketch = { wobble: number; scale?: number; seed?: number }

export function makeOutlineMaterial(width = 0.0035, color = '#130e12', sketch?: Sketch) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      width: { value: width },
      color: { value: new THREE.Color(color) },
      wobble: { value: sketch?.wobble ?? 0 },
      wscale: { value: sketch?.scale ?? 14 },
      seed: { value: sketch?.seed ?? 0 },
      time: { value: 0 },
    },
    side: THREE.BackSide,
    depthWrite: true,
  })
}

export function useOutline(object: THREE.Object3D, width = 0.0035, color = '#130e12') {
  const mat = useMemo(() => makeOutlineMaterial(width, color), [width, color])

  useEffect(() => {
    const hulls: THREE.Mesh[] = []
    object.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || mesh.userData.isHull) return
      const hull = new THREE.Mesh(mesh.geometry, mat)
      hull.userData.isHull = true
      hull.renderOrder = -1
      hulls.push(hull)
    })
    // add as children so they follow the original transforms
    hulls.forEach((h) => {
      const parentMesh = object.getObjectByProperty('geometry', h.geometry) as THREE.Mesh | undefined
      parentMesh?.add(h)
    })
    return () => hulls.forEach((h) => h.parent?.remove(h))
  }, [object, mat])
}
