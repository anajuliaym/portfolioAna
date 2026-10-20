import * as THREE from 'three'

/**
 * Wear for the claw machine's standard/physical materials: a tri-planar grime texture in world space (the model's UVs are
 * an atlas, useless for tiling) modulates roughness (smudges, polished spots) and darkens the colour a little, more toward
 * the floor where shoes and mops hit the cabinet. Same noise for every part, so the dirt is continuous across seams.
 */
let NOISE: THREE.Texture | null = null
function noiseTexture() {
  if (NOISE) return NOISE
  // periodic value-noise fBm (wraps exactly, so the tiles never show)
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!, img = g.createImageData(S, S)
  let seed = 7
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const octaves = [4, 8, 16, 32, 64].map((n) => ({ n, v: Float32Array.from({ length: n * n }, r) }))
  const fade = (t: number) => t * t * (3 - 2 * t)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let sum = 0, amp = 1, norm = 0
    for (const { n, v } of octaves) {
      const fx = (x / S) * n, fy = (y / S) * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fade(fx - x0), ty = fade(fy - y0)
      const at = (i: number, j: number) => v[((j % n) * n) + (i % n)]
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx
      sum += (a + (b - a) * ty) * amp; norm += amp; amp *= 0.55
    }
    const k = (y * S + x) * 4, val = (sum / norm) * 255
    img.data[k] = img.data[k + 1] = img.data[k + 2] = val; img.data[k + 3] = 255
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping
  NOISE = t
  return t
}

export type WearOptions = { scale?: number; rough?: number; grime?: number; floorY?: number }

export function addWear<T extends THREE.MeshStandardMaterial>(mat: T, o: WearOptions = {}): T {
  const uniforms = {
    wearTex: { value: noiseTexture() },
    wearScale: { value: o.scale ?? 1.6 },
    wearRough: { value: o.rough ?? 0.22 },
    wearGrime: { value: o.grime ?? 0.12 },
    wearFloor: { value: o.floorY ?? -0.86 },
  }
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWearP;\nvarying vec3 vWearN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWearP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWearN = normalize(mat3(modelMatrix) * objectNormal);')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWearP;
varying vec3 vWearN;
uniform sampler2D wearTex;
uniform float wearScale, wearRough, wearGrime, wearFloor;
float wear3() {
  vec3 w = pow(abs(normalize(vWearN)), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5);
  vec3 p = vWearP * wearScale;
  return texture2D(wearTex, p.yz).r * w.x + texture2D(wearTex, p.xz).r * w.y + texture2D(wearTex, p.xy).r * w.z;
}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
float wearN = wear3();
float wearLow = 1.0 - smoothstep(wearFloor, wearFloor + 0.45, vWearP.y);
diffuseColor.rgb *= 1.0 - wearGrime * smoothstep(0.35, 0.85, wearN) - wearLow * 0.16 * wearN;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + (wearN - 0.5) * wearRough * 2.0 + wearLow * 0.12, 0.03, 1.0);`)
  }
  mat.customProgramCacheKey = () => 'wear'
  return mat
}
