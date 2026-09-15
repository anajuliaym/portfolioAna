import * as THREE from 'three'
import { useMemo } from 'react'

/**
 * Stylized "painted" shading: quantized light bands with soft, noisy edges,
 * a cool shadow tint, a warm key light, a pale teal rim and a painterly speculars.
 */
export type PainterlyOptions = {
  keyDir?: [number, number, number]
  keyColor?: string
  shadowColor?: string
  fillColor?: string
  rimColor?: string
  bands?: number
  paint?: number
  rim?: number
  /** strength of the voronoi "brush patch" normal jitter (0..0.5) */
  patch?: number
  /** size of the patches (higher = smaller patches) */
  patchScale?: number
  /** highlight strength (default 0.4) */
  spec?: number
  /** rim light strength (default 1) */
  rimStrength?: number
}

const vertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vWp;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWp = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform float hasMap;
  uniform vec3 baseColor;
  uniform vec3 keyDir;
  uniform vec3 keyColor;
  uniform vec3 shadowColor;
  uniform vec3 fillColor;
  uniform vec3 rimColor;
  uniform float bands;
  uniform float paint;
  uniform float rimPower;
  uniform float patchAmt;
  uniform float specAmt;
  uniform float rimAmt;
  uniform float patchScale;
  uniform float time;
  varying vec3 vN;
  varying vec3 vWp;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  vec3 hash3(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx);
  }
  // random value per voronoi cell (nearest feature point) -> flat brush patches
  vec3 cellRand(vec3 p) {
    vec3 q = p * patchScale;
    vec3 i = floor(q);
    vec3 f = fract(q);
    float md = 8.0;
    vec3 best = vec3(0.5);
    for (int z = -1; z <= 1; z++)
      for (int y = -1; y <= 1; y++)
        for (int x = -1; x <= 1; x++) {
          vec3 g = vec3(float(x), float(y), float(z));
          vec3 o = hash3(i + g);
          vec3 r = g + o - f;
          float d = dot(r, r);
          if (d < md) { md = d; best = hash3(i + g + 7.7); }
        }
    return best;
  }

  void main() {
    vec4 tex = hasMap > 0.5 ? texture2D(map, vUv) : vec4(baseColor, 1.0);
    vec3 albedo = tex.rgb;
    vec3 cr = cellRand(vWp);
    // "custom normals": each patch tilts the normal a little, like a brush dab
    vec3 N = normalize(normalize(vN) + (cr - 0.5) * patchAmt);
    vec3 V = normalize(cameraPosition - vWp);
    vec3 L = normalize(keyDir);

    // brush wobble breaks the perfectly smooth shading edges
    float wob = (noise(vWp.xy * 9.0 + vWp.z * 4.0) - 0.5) * paint;

    float d = dot(N, L) * 0.5 + 0.5 + wob;
    float q = floor(d * bands) / bands;
    float f = fract(d * bands);
    q += smoothstep(0.42, 0.58, f) / bands;
    q = clamp(q, 0.0, 1.0);
    vec3 light = mix(shadowColor, keyColor, q);

    // cold fill light from the opposite side (warm key / cold fill)
    float fillT = clamp(dot(N, normalize(vec3(-L.x, 0.2, -L.z))) * 0.5 + 0.5, 0.0, 1.0);
    fillT = floor(fillT * 2.0 + wob * 2.0) / 2.0;
    light += fillColor * fillT * 0.6;

    vec3 col = albedo * light;

    // rim
    float rim = pow(1.0 - max(dot(N, V), 0.0), rimPower);
    rim = smoothstep(0.35, 0.85, rim + wob * 0.6);
    col += rimColor * rim * rimAmt;

    // painterly highlight
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 24.0 + cr.y * 30.0);
    spec = smoothstep(0.3, 0.5, spec + wob * 0.8 + (cr.x - 0.5) * 0.15);
    col += keyColor * spec * specAmt;
    // per-patch value variation, like uneven paint coverage
    col *= 0.94 + cr.z * 0.12;

    // canvas grain
    col *= 1.0 + (noise(vUv * 420.0) - 0.5) * 0.10;

    gl_FragColor = vec4(col, tex.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function makePainterly(map: THREE.Texture | null, o: PainterlyOptions = {}) {
  if (map) map.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      map: { value: map },
      hasMap: { value: map ? 1 : 0 },
      baseColor: { value: new THREE.Color('#c9c2b8') },
      keyDir: { value: new THREE.Vector3(...(o.keyDir ?? [1.2, 1.6, 1.0])) },
      keyColor: { value: new THREE.Color(o.keyColor ?? '#ffe6c4').multiplyScalar(1.3) },
      shadowColor: { value: new THREE.Color(o.shadowColor ?? '#2a3052') },
      fillColor: { value: new THREE.Color(o.fillColor ?? '#5f7cff') },
      rimColor: { value: new THREE.Color(o.rimColor ?? '#a9d9c6') },
      bands: { value: o.bands ?? 3 },
      paint: { value: o.paint ?? 0.12 },
      rimPower: { value: o.rim ?? 3.0 },
      patchAmt: { value: o.patch ?? 0.22 },
      specAmt: { value: o.spec ?? 0.4 },
      rimAmt: { value: o.rimStrength ?? 1.0 },
      patchScale: { value: o.patchScale ?? 14 },
      time: { value: 0 },
    },
  })
  mat.toneMapped = true
  return mat
}

/** Replace every material in a loaded scene with the painterly shader (keeps the base color texture). */
export function usePainterly(scene: THREE.Object3D, o: PainterlyOptions = {}) {
  const mats = useMemo(() => {
    const list: THREE.ShaderMaterial[] = []
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const src = mesh.material as THREE.MeshStandardMaterial
      // remember the original texture so re-running (HMR / StrictMode) keeps it
      if (mesh.userData.origMap === undefined) mesh.userData.origMap = src.map ?? null
      const m = makePainterly(mesh.userData.origMap as THREE.Texture | null, o)
      mesh.material = m
      mesh.castShadow = false
      mesh.receiveShadow = false
      list.push(m)
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])
  return mats
}
