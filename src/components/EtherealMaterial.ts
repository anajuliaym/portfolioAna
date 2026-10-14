import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/**
 * A soft, dreamy material for the Projects sky (Ana: "algo mais ethereal", 2026-10-14): no toon bands —
 * a smooth wrap-around light, a pink/lilac fresnel glow on the silhouettes, and an optional fade where
 * the geometry dissolves into the night (the islands' rocky tips, the clouds' undersides).
 */
export type EtherealOptions = {
  keyDir?: [number, number, number]
  lightColor?: string
  shadeColor?: string
  glowColor?: string
  glow?: number
  /** world-space y range where alpha goes 0 → 1 (bottom fade); omit for opaque */
  fade?: [number, number]
  opacity?: number
}

const vertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vWp;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWp = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const fragment = /* glsl */ `
  uniform vec3 baseColor;
  uniform vec3 keyDir;
  uniform vec3 lightColor;
  uniform vec3 shadeColor;
  uniform vec3 glowColor;
  uniform float glowAmt;
  uniform float fade0;
  uniform float fade1;
  uniform float opacity;
  varying vec3 vN;
  varying vec3 vWp;
  float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 N = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 V = normalize(cameraPosition - vWp);
    vec3 L = normalize(keyDir);
    // wrap lighting: nothing goes truly dark, the shade side turns lilac instead of black
    float l = dot(N, L) * 0.5 + 0.5;
    l = smoothstep(0.05, 0.95, l);
    vec3 col = baseColor * mix(shadeColor, lightColor, l);
    // fresnel glow on the silhouette
    float f = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.2);
    col += glowColor * f * glowAmt;
    // a whisper of grain so flat areas do not look vector-clean
    col *= 1.0 + (noise(vWp.xz * 90.0 + vWp.y * 30.0) - 0.5) * 0.05;
    float a = opacity * (fade1 > fade0 ? smoothstep(fade0, fade1, vWp.y) : 1.0);
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function makeEthereal(o: EtherealOptions = {}) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      baseColor: { value: new THREE.Color('#c9c2b8') },
      keyDir: { value: new THREE.Vector3(...(o.keyDir ?? [1.0, 1.6, 1.2])) },
      lightColor: { value: new THREE.Color(o.lightColor ?? '#fff6ec') },
      shadeColor: { value: new THREE.Color(o.shadeColor ?? '#8f84c2') },
      glowColor: { value: new THREE.Color(o.glowColor ?? '#f2a0b4') },
      glowAmt: { value: o.glow ?? 0.55 },
      fade0: { value: o.fade ? o.fade[0] : 0 },
      fade1: { value: o.fade ? o.fade[1] : 0 },
      opacity: { value: o.opacity ?? 1 },
    },
    transparent: !!o.fade || (o.opacity ?? 1) < 1,
    side: THREE.DoubleSide,
  })
  mat.toneMapped = true
  return mat
}

/** replace every material under `scene` with the ethereal shader, base colour from mesh.userData.color */
export function useEthereal(scene: THREE.Object3D, o: EtherealOptions = {}) {
  const mats = useMemo(() => {
    const list: THREE.ShaderMaterial[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.userData.isHull) return
      const m = makeEthereal(o)
      if (mesh.userData.color) m.uniforms.baseColor.value.set(mesh.userData.color)
      mesh.material = m
      list.push(m)
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])
  useEffect(() => { scene.traverse((obj) => { const mesh = obj as THREE.Mesh; if (!mesh.isMesh || mesh.userData.isHull) return; const sm = mesh.material as THREE.ShaderMaterial; if (sm.uniforms?.baseColor && mesh.userData.color) sm.uniforms.baseColor.value.set(mesh.userData.color) }) })
  return mats
}
