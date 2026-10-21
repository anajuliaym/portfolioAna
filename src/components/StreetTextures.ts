import * as THREE from 'three'

/**
 * Surface textures for the Contact street (Ana, 2026-10-20: "a parede tá muito simples, quero uma textura mais real").
 * Plaster, asphalt and pavers are photo-like tiles generated in Figma (src/assets/street/); the painted planks, the
 * timber and the puddles' roughness are procedural (the generator refused the wood). Procedural ones tile seamlessly
 * (periodic value noise), come with a bump map, and are built once and cached.
 */

const hash = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
/** periodic value noise: `px` × `py` cells across the tile, so the texture wraps */
function vnoise(x: number, y: number, px: number, py: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const mx = (a: number) => ((a % px) + px) % px, my = (a: number) => ((a % py) + py) % py
  const a = hash(mx(xi), my(yi), s), b = hash(mx(xi + 1), my(yi), s), c = hash(mx(xi), my(yi + 1), s), d = hash(mx(xi + 1), my(yi + 1), s)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
/** fractal noise over the unit tile (u, v in 0…1), base frequency `f` (integer, so it tiles), anisotropy sx/sy */
function fbm(u: number, v: number, f: number, oct: number, s: number, sx = 1, sy = 1) {
  let sum = 0, amp = 0.5, norm = 0
  for (let o = 0; o < oct; o++) {
    const fx = f * sx * (1 << o), fy = f * sy * (1 << o)
    sum += amp * vnoise(u * fx, v * fy, Math.round(fx), Math.round(fy), s + o * 17)
    norm += amp; amp *= 0.5
  }
  return sum / norm
}

type Maps = { map: THREE.Texture; bumpMap: THREE.Texture; roughnessMap?: THREE.Texture }
const CACHE = new Map<string, Maps>()

function canvasTex(w: number, h: number, paint: (px: Uint8ClampedArray, i: number, u: number, v: number) => void, srgb: boolean) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!, img = g.createImageData(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) paint(img.data, (y * w + x) * 4, x / w, y / h)
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}
const put = (px: Uint8ClampedArray, i: number, r: number, g: number, b: number) => { px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255 }

/** vertical painted planks (dusty rose by default): grain shows through the paint, darker gaps, plank-to-plank tone */
export function plankMaps(paint: [number, number, number] = [214, 160, 166], planks = 6): Maps {
  const key = 'planks' + paint.join() + planks
  const hit = CACHE.get(key); if (hit) return hit
  const S = 512, height = new Float32Array(S * S)
  const map = canvasTex(S, S, (px, i, u, v) => {
    const pu = u * planks, n = Math.floor(pu), f = pu - n
    const tone = 0.92 + hash(n, 0, 7) * 0.12
    const grain = fbm(u, v, 2, 4, 11 + n, 12, 0.5) // long streaks along the plank
    const knot = fbm(u, v, 3, 2, 31 + n)
    const gap = f < 0.035 || f > 0.965 ? 1 : 0
    const edge = Math.min(f, 1 - f) < 0.08 ? 0.05 : 0 // rounded plank edges catch less light
    height[i / 4] = gap ? 0 : 0.55 + (grain - 0.5) * 0.5 - edge * 3
    const k = gap ? 0.4 : tone * (0.88 + (grain - 0.5) * 0.28 + (knot - 0.5) * 0.08 - edge)
    put(px, i, paint[0] * k, paint[1] * k, paint[2] * k)
  }, true)
  const bumpMap = canvasTex(S, S, (px, i) => { const h = height[i / 4] * 255; put(px, i, h, h, h) }, false)
  const out = { map, bumpMap }; CACHE.set(key, out); return out
}

/** stained timber for posts and beams: a soft rose-taupe (never brown), strong grain along the length */
export function timberMaps(): Maps {
  const hit = CACHE.get('timber'); if (hit) return hit
  const S = 256, height = new Float32Array(S * S)
  const map = canvasTex(S, S, (px, i, u, v) => {
    const grain = fbm(u, v, 2, 4, 51, 10, 0.5)
    height[i / 4] = grain
    const k = 0.75 + (grain - 0.5) * 0.5
    put(px, i, 196 * k, 156 * k, 162 * k)
  }, true)
  const bumpMap = canvasTex(S, S, (px, i) => { const h = height[i / 4] * 255; put(px, i, h, h, h) }, false)
  const out = { map, bumpMap }; CACHE.set('timber', out); return out
}

/** where the road is wet: glossy puddles and damp zones as a roughness map (dark = mirror), to sit under the photo texture */
export function asphaltRoughness(): THREE.Texture {
  const hit = CACHE.get('asphalt'); if (hit) return hit.map
  const S = 512
  const map = canvasTex(S, S, (px, i, u, v) => {
    const damp = fbm(u, v, 3, 4, 73)
    const puddle = Math.min(1, Math.max(0, (damp - 0.6) / 0.08))
    const r = 0.85 - Math.min(1, Math.max(0, (damp - 0.45) / 0.15)) * 0.4 - puddle * 0.4
    const h = Math.max(0, r) * 255; put(px, i, h, h, h)
  }, false)
  CACHE.set('asphalt', { map, bumpMap: map }); return map
}

/** a photo texture (from the Figma generator) as a tiled colour map plus itself as a bump map */
export function photoMaps(t: THREE.Texture, rx: number, ry: number): Maps {
  const map = t.clone(); map.colorSpace = THREE.SRGBColorSpace
  const bumpMap = t.clone(); bumpMap.colorSpace = THREE.NoColorSpace
  for (const m of [map, bumpMap]) { m.wrapS = m.wrapT = THREE.RepeatWrapping; m.repeat.set(rx, ry); m.anisotropy = 8; m.needsUpdate = true }
  return { map, bumpMap }
}

/** a copy of a cached set with its own repeat (the cache is shared, the repeat is per surface) */
export function withRepeat(m: Maps, rx: number, ry: number): Maps {
  const r = (t?: THREE.Texture) => { if (!t) return undefined; const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c }
  return { map: r(m.map)!, bumpMap: r(m.bumpMap)!, roughnessMap: r(m.roughnessMap) }
}
