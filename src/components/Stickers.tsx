import * as THREE from 'three'

/**
 * Worn vinyl stickers for the claw machine (Ana, 2026-10-20: "coloque uns adesivos nele … mas os adesivos têm que estar
 * realistas — com dobras, sujeira etc."). Everything is generated from her images on canvases:
 * - the shape: a die-cut blob around the art (`die`), a print with a white margin (`rect`) or a round one (`circle`);
 * - the print, aged: yellowed, grime in blotches and along the edge, fingerprints, rubbed-off scratches, chipped edges;
 * - creases: a highlight/shadow pair with the ink cracked along the fold, raised in the bump map;
 * - roughness: glossy vinyl, matte where it is dirty, scratched or creased;
 * - geometry: subdivided plane with ridges along the creases, air bubbles and an optional corner curling up (the back
 *   of the sticker is white paper).
 * Units are centimetres, like the machine model; the sticker lies in xy facing +z.
 */
export type StickerSpec = {
  img: HTMLImageElement
  kind: 'die' | 'rect' | 'circle'
  /** height in cm (the width follows the image) */
  h: number
  /** 0 = brand new, 1 = years on an arcade floor */
  age: number
  seed: number
  /** folds, as lines in uv (0…1) */
  creases?: [number, number, number, number][]
  /** a corner coming loose: 0 bottom-left, 1 bottom-right, 2 top-right, 3 top-left; len = fraction of the short side */
  peel?: { corner: 0 | 1 | 2 | 3; len: number }
  bubbles?: number
}

const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }

/** soft blotchy noise: random cells upscaled with smoothing, a few octaves */
function blotches(w: number, h: number, r: () => number, cells = 10) {
  const out = canvas(w, h), g = out.getContext('2d')!
  for (let o = 0; o < 3; o++) {
    const n = cells * (1 << o), small = canvas(n, Math.max(2, Math.round((n * h) / w))), sg = small.getContext('2d')!
    const img = sg.createImageData(small.width, small.height)
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255 }
    sg.putImageData(img, 0, 0)
    g.globalAlpha = o === 0 ? 1 : 0.5 / o
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'
    g.drawImage(small, 0, 0, w, h)
  }
  g.globalAlpha = 1
  return out
}

/** the sticker's outline as a white mask */
function silhouette(spec: StickerSpec, W: number, H: number, art: { x: number; y: number; w: number; h: number }) {
  const m = canvas(W, H), g = m.getContext('2d')!
  if (spec.kind === 'die') {
    // blur the art's alpha and threshold it at low res: a smooth blob around the drawing, like a real die-cut
    const k = 4, sw = Math.ceil(W / k), sh = Math.ceil(H / k), s = canvas(sw, sh), sg = s.getContext('2d')!
    sg.filter = `blur(${Math.round(Math.min(sw, sh) * 0.05)}px)`
    sg.drawImage(spec.img, art.x / k, art.y / k, art.w / k, art.h / k)
    sg.filter = 'none'
    const d = sg.getImageData(0, 0, sw, sh)
    for (let i = 0; i < d.data.length; i += 4) { const on = d.data[i + 3] > 3; d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = on ? 255 : 0 }
    sg.putImageData(d, 0, 0)
    g.filter = 'blur(1.5px)'; g.imageSmoothingEnabled = true; g.drawImage(s, 0, 0, W, H); g.filter = 'none'
  } else if (spec.kind === 'circle') {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(W / 2, H / 2, Math.min(W, H) / 2 - 2, 0, Math.PI * 2); g.fill()
  } else {
    const rad = Math.min(W, H) * 0.045
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, rad); g.fill()
  }
  return m
}

export function stickerTextures(spec: StickerSpec) {
  const r = rng(spec.seed)
  const ar = spec.img.width / spec.img.height
  const MAX = 1024
  const W = ar >= 1 ? MAX : Math.round(MAX * ar), H = ar >= 1 ? Math.round(MAX / ar) : MAX
  const pad = spec.kind === 'die' ? Math.round(Math.min(W, H) * 0.075) : spec.kind === 'rect' ? Math.round(Math.min(W, H) * 0.045) : 0
  const art = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 }

  const shape = silhouette(spec, W, H, art)

  // chips along the edge (eaten out of the shape itself, so map, back and alpha all agree)
  const sg = shape.getContext('2d')!
  sg.globalCompositeOperation = 'destination-out'
  const chips = Math.round(6 + spec.age * 26)
  for (let i = 0; i < chips; i++) {
    const side = Math.floor(r() * 4), t = r()
    const x = side === 0 ? t * W : side === 1 ? W : side === 2 ? t * W : 0
    const y = side === 0 ? 0 : side === 1 ? t * H : side === 2 ? H : t * H
    sg.beginPath(); sg.arc(x, y, 3 + r() * (6 + spec.age * 12), 0, Math.PI * 2); sg.fill()
  }
  sg.globalCompositeOperation = 'source-over'

  // ---- colour
  const c = canvas(W, H), g = c.getContext('2d')!
  g.fillStyle = '#f5f1e8'; g.fillRect(0, 0, W, H)
  if (spec.kind === 'die') g.drawImage(spec.img, art.x, art.y, art.w, art.h)
  else {
    // cover-fit the art in its box (circle: clipped round)
    const s = Math.max(art.w / spec.img.width, art.h / spec.img.height), iw = spec.img.width * s, ih = spec.img.height * s
    g.save(); g.beginPath()
    if (spec.kind === 'circle') g.arc(W / 2, H / 2, Math.min(W, H) / 2 - 2, 0, Math.PI * 2); else g.roundRect(art.x, art.y, art.w, art.h, Math.min(W, H) * 0.02)
    g.clip(); g.drawImage(spec.img, art.x + (art.w - iw) / 2, art.y + (art.h - ih) / 2, iw, ih); g.restore()
  }
  // sun-faded and yellowed
  g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,250,240,${0.05 + spec.age * 0.12})`; g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'multiply'; g.fillStyle = `rgba(244,234,212,${0.1 + spec.age * 0.3})`; g.fillRect(0, 0, W, H)
  // grime in blotches
  const noise = blotches(W, H, r, 6 + Math.floor(r() * 6))
  const grime = canvas(W, H), gg = grime.getContext('2d')!
  gg.drawImage(noise, 0, 0); gg.globalCompositeOperation = 'multiply'; gg.fillStyle = '#c4b298'; gg.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.1 + spec.age * 0.22; g.drawImage(grime, 0, 0); g.globalAlpha = 1
  // dirt collected along the edge: the shape minus a blurred, shrunk copy of it
  const edge = canvas(W, H), eg = edge.getContext('2d')!
  eg.drawImage(shape, 0, 0); eg.globalCompositeOperation = 'source-in'; eg.fillStyle = '#6e5a46'; eg.fillRect(0, 0, W, H)
  eg.globalCompositeOperation = 'destination-out'; eg.filter = `blur(${Math.round(Math.min(W, H) * 0.03)}px)`
  eg.drawImage(shape, W * 0.025, H * 0.025, W * 0.95, H * 0.95); eg.filter = 'none'
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.3 + spec.age * 0.35; g.drawImage(edge, 0, 0); g.globalAlpha = 1
  // fingerprints / smudges
  for (let i = 0; i < 2 + Math.round(spec.age * 4); i++) {
    const x = r() * W, y = r() * H, rr = Math.min(W, H) * (0.05 + r() * 0.08)
    const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(120,104,90,.22)'); gr.addColorStop(1, 'rgba(120,104,90,0)')
    g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, 0.7); g.translate(-x, -y); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore()
  }
  // rubbed-off scratches and scuffs (the white paper shows through)
  g.globalCompositeOperation = 'screen'
  const scratches: [number, number, number, number, number][] = []
  for (let i = 0; i < 8 + Math.round(spec.age * 30); i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = Math.min(W, H) * (0.04 + r() * 0.18), lw = 0.6 + r() * 1.6
    scratches.push([x, y, a, l, lw])
    g.strokeStyle = `rgba(255,252,246,${0.25 + r() * 0.4})`; g.lineWidth = lw
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 10, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 10, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke()
  }
  for (let i = 0; i < 3 + Math.round(spec.age * 6); i++) {
    const x = r() * W, y = r() * H, rr = Math.min(W, H) * (0.02 + r() * 0.05)
    const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(255,250,240,${0.2 + spec.age * 0.3})`); gr.addColorStop(1, 'rgba(255,250,240,0)')
    g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2)
  }
  // creases: a light ridge next to a shadow, the ink cracked along it
  g.globalCompositeOperation = 'source-over'
  for (const [u0, v0, u1, v1] of spec.creases ?? []) {
    const x0 = u0 * W, y0 = (1 - v0) * H, x1 = u1 * W, y1 = (1 - v1) * H
    const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny), ox = (nx / nl) * 3, oy = (ny / nl) * 3
    g.lineCap = 'round'
    g.strokeStyle = 'rgba(60,45,35,.28)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0 + ox, y0 + oy); g.lineTo(x1 + ox, y1 + oy); g.stroke()
    g.strokeStyle = 'rgba(255,253,248,.75)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
    // cracked ink: short broken white dashes along the fold
    const n = Math.round(nl / 14)
    for (let i = 0; i < n; i++) {
      if (r() < 0.45) continue
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t
      g.fillStyle = `rgba(250,246,238,${0.5 + r() * 0.4})`; g.beginPath(); g.ellipse(x + (r() - 0.5) * 4, y + (r() - 0.5) * 4, 2 + r() * 5, 1 + r() * 1.5, Math.atan2(y1 - y0, x1 - x0), 0, Math.PI * 2); g.fill()
    }
  }
  g.globalCompositeOperation = 'destination-in'; g.drawImage(shape, 0, 0); g.globalCompositeOperation = 'source-over'

  // ---- roughness (green channel): glossy vinyl, matte where dirty / scratched / creased
  const rc = canvas(W, H), rg = rc.getContext('2d')!
  rg.fillStyle = `rgb(${70 + spec.age * 50},${70 + spec.age * 50},${70 + spec.age * 50})`; rg.fillRect(0, 0, W, H)
  rg.globalCompositeOperation = 'lighter'; rg.globalAlpha = 0.25 + spec.age * 0.25; rg.drawImage(noise, 0, 0); rg.globalAlpha = 0.6; rg.drawImage(edge, 0, 0)
  rg.globalAlpha = 1; rg.strokeStyle = 'rgba(120,120,120,.8)'
  for (const [x, y, a, l, lw] of scratches) { rg.lineWidth = lw + 0.6; rg.beginPath(); rg.moveTo(x, y); rg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); rg.stroke() }
  for (const [u0, v0, u1, v1] of spec.creases ?? []) { rg.lineWidth = 7; rg.beginPath(); rg.moveTo(u0 * W, (1 - v0) * H); rg.lineTo(u1 * W, (1 - v1) * H); rg.stroke() }
  rg.globalCompositeOperation = 'source-over'

  // ---- bump: fine paper tooth, raised creases, sunken scratches
  const bc = canvas(W, H), bg = bc.getContext('2d')!
  bg.fillStyle = '#808080'; bg.fillRect(0, 0, W, H)
  const tooth = bg.createImageData(W, H)
  for (let i = 0; i < tooth.data.length; i += 4) { const v = 128 + (r() - 0.5) * 18; tooth.data[i] = tooth.data[i + 1] = tooth.data[i + 2] = v; tooth.data[i + 3] = 255 }
  bg.putImageData(tooth, 0, 0)
  bg.lineCap = 'round'
  for (const [u0, v0, u1, v1] of spec.creases ?? []) {
    bg.strokeStyle = 'rgba(255,255,255,.55)'; bg.lineWidth = 9; bg.beginPath(); bg.moveTo(u0 * W, (1 - v0) * H); bg.lineTo(u1 * W, (1 - v1) * H); bg.stroke()
    bg.strokeStyle = 'rgba(255,255,255,.9)'; bg.lineWidth = 2.5; bg.stroke()
  }
  bg.strokeStyle = 'rgba(0,0,0,.45)'
  for (const [x, y, a, l, lw] of scratches) { bg.lineWidth = lw; bg.beginPath(); bg.moveTo(x, y); bg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); bg.stroke() }

  // ---- back: plain white paper in the same shape
  const back = canvas(W, H), kg = back.getContext('2d')!
  kg.drawImage(shape, 0, 0); kg.globalCompositeOperation = 'source-in'; kg.fillStyle = '#e8e3d8'; kg.fillRect(0, 0, W, H)

  const tex = (cv: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
  return { map: tex(c, true), roughnessMap: tex(rc, false), bumpMap: tex(bc, false), backMap: tex(back, true), aspect: W / H }
}

/** subdivided plane: crease ridges, air bubbles and a curled corner */
function stickerGeometry(spec: StickerSpec, w: number, h: number) {
  const geo = new THREE.PlaneGeometry(w, h, 48, 48)
  const p = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute
  const r = rng(spec.seed * 7 + 3)
  const bubbles = Array.from({ length: spec.bubbles ?? 0 }, () => ({ u: 0.15 + r() * 0.7, v: 0.15 + r() * 0.7, s: 0.03 + r() * 0.05, a: 0.08 + r() * 0.14 }))
  const corner = spec.peel ? [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]][spec.peel.corner] : null
  const L = spec.peel ? spec.peel.len * Math.min(w, h) : 0
  const R = L * 0.85
  const dir = corner ? new THREE.Vector2(-corner[0], -corner[1]).normalize() : null
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = 0.08
    const u = uv.getX(i), v = uv.getY(i)
    for (const [u0, v0, u1, v1] of spec.creases ?? []) {
      const ax = (u1 - u0) * w, ay = (v1 - v0) * h, px = (u - u0) * w, py = (v - v0) * h
      const t = THREE.MathUtils.clamp((px * ax + py * ay) / (ax * ax + ay * ay), 0, 1)
      const d = Math.hypot(px - ax * t, py - ay * t)
      z += 0.14 * Math.exp(-((d / 0.45) ** 2))
    }
    for (const b of bubbles) { const d = Math.hypot((u - b.u) * w, (v - b.v) * h) / (b.s * Math.min(w, h)); z += b.a * Math.exp(-d * d) }
    if (corner && dir) {
      // distance from the fold line toward the corner; bend that part up around a cylinder of radius R
      const q = L - ((x - corner[0]) * dir.x + (y - corner[1]) * dir.y)
      if (q > 0) {
        const th = q / R, back = q - R * Math.sin(th)
        x += dir.x * back; y += dir.y * back; z += R * (1 - Math.cos(th))
      }
    }
    p.setXYZ(i, x, y, z)
  }
  geo.computeVertexNormals()
  return geo
}

export function makeSticker(spec: StickerSpec) {
  const t = stickerTextures(spec)
  const h = spec.h, w = h * t.aspect
  const geo = stickerGeometry(spec, w, h)
  const front = new THREE.MeshPhysicalMaterial({
    map: t.map, roughnessMap: t.roughnessMap, roughness: 1, bumpMap: t.bumpMap, bumpScale: 0.35,
    clearcoat: 0.35 - spec.age * 0.2, clearcoatRoughness: 0.35 + spec.age * 0.3, alphaTest: 0.5,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  })
  const backMat = new THREE.MeshStandardMaterial({ map: t.backMap, roughness: 0.95, alphaTest: 0.5, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  const g = new THREE.Group()
  const a = new THREE.Mesh(geo, front), b = new THREE.Mesh(geo, backMat)
  a.receiveShadow = b.receiveShadow = true
  if (spec.peel) a.castShadow = b.castShadow = true // only a lifted corner throws a shadow worth having
  g.add(a, b)
  return g
}
