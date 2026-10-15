import * as THREE from 'three'

/**
 * "Soft clay" for Ana's Meshy pond (2026-10-15: "um shader mais bonito, de maneira que não dê para ver que
 * ele está mal feito"). The model's texture stays, but the lighting is built to forgive lumpy geometry:
 * wrap-around diffuse with no hard terminator, a lilac hemisphere instead of black shade, a broad soft sheen
 * like fired clay, a pink/lilac fresnel on the silhouettes, pastel colour grading and a whisper of grain.
 * Low contrast + smooth gradients = the facets and bumps stop reading as errors and read as sculpted clay.
 */
export type ClayOptions = {
  map: THREE.Texture | null
  keyDir?: [number, number, number]
  keyColor?: string
  skyColor?: string
  groundColor?: string
  rimColor?: string
  rim?: number
  sheen?: number
  /** 0 = texture as is, 1 = fully pastel-graded */
  pastel?: number
  saturation?: number
}

const vertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vWp;
  varying vec2 vUv;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWp = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform float hasMap;
  uniform vec3 keyDir;
  uniform vec3 keyColor;
  uniform vec3 skyColor;
  uniform vec3 groundColor;
  uniform vec3 rimColor;
  uniform float rimAmt;
  uniform float sheenAmt;
  uniform float pastel;
  uniform float saturation;
  varying vec3 vN;
  varying vec3 vWp;
  varying vec2 vUv;
  float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 N = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 V = normalize(cameraPosition - vWp);
    vec3 L = normalize(keyDir);

    vec3 albedo = hasMap > 0.5 ? texture2D(map, vUv).rgb : vec3(0.8);
    // colour grading: lift the darks and push toward a chalky pastel, then re-saturate a touch
    float lum = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
    vec3 chalk = mix(albedo, vec3(lum), 0.2) * 0.82 + 0.16;
    albedo = mix(albedo, chalk, pastel);
    albedo = mix(vec3(dot(albedo, vec3(0.2126, 0.7152, 0.0722))), albedo, saturation);

    // wrap diffuse: no terminator line, nothing truly dark
    float wrap = dot(N, L) * 0.5 + 0.5;
    wrap = smoothstep(0.0, 1.0, wrap);
    vec3 hemi = mix(groundColor, skyColor, N.y * 0.5 + 0.5);
    vec3 light = hemi * 0.72 + keyColor * wrap * 0.68;

    // broad, soft sheen (clay / matte glaze)
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 14.0) * sheenAmt;

    // fresnel rim: lilac-pink on the silhouettes, where the moon and the pond glow catch the edges
    float f = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);

    vec3 col = albedo * light + keyColor * spec + rimColor * f * rimAmt;
    col *= 1.0 + (noise(vWp.xz * 70.0 + vWp.y * 23.0) - 0.5) * 0.045;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function makeClay(o: ClayOptions) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      map: { value: o.map },
      hasMap: { value: o.map ? 1 : 0 },
      keyDir: { value: new THREE.Vector3(...(o.keyDir ?? [2, 3.5, -3])) },
      keyColor: { value: new THREE.Color(o.keyColor ?? '#ffe9d6') },
      skyColor: { value: new THREE.Color(o.skyColor ?? '#d9d4f2') },
      groundColor: { value: new THREE.Color(o.groundColor ?? '#6e5a86') },
      rimColor: { value: new THREE.Color(o.rimColor ?? '#f2a0b4') },
      rimAmt: { value: o.rim ?? 0.32 },
      sheenAmt: { value: o.sheen ?? 0.14 },
      pastel: { value: o.pastel ?? 0.45 },
      saturation: { value: o.saturation ?? 1.22 }
    },
    side: THREE.FrontSide
  })
  mat.toneMapped = true
  return mat
}
