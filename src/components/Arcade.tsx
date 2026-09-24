import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { WorldGame } from './GameWorld'
import { makePainterly } from './PainterlyMaterial'
import coinFaceUrl from '../assets/arcade/coin-face.webp'
import coinEdgeUrl from '../assets/arcade/coin-edge.webp'
import { TITLE_URLS } from './titles'

/**
 * A small retro Japanese arcade: checkered floor, a cluttered wall of posters, paper lanterns,
 * humming fluorescent tubes, pastel cabinets (Ana's `arcade.glb`, recoloured per game) and a
 * tea vending machine closing the row. Standard materials + real lights; only the player keeps
 * the painted shader.
 */

const CAB_URL = '/models/arcade.glb'
const WALL_URL = '/textures/mosaic.jpg' // glossy sage glass mosaic, cropped to whole tiles (64 px per tile)
const TILE = 0.11 // world size of one mosaic tile
const CAB_H = 4.3 // world height of a cabinet
const CAB_S = CAB_H / 228 // the GLB is 228 units tall, ~97 wide, ~95 deep
const WALL_Z = -2.3
const CAB_Z = WALL_Z + 0.98 // cabinet centre: the back almost touches the wall
export const CEIL_Y = 6.6

/** Pastel cabinet colours, cycled per game (red stays an accent on this site, never the main colour). */
export const PASTELS = ['#f4b8cb', '#b9e3c9', '#efe3c2', '#cfbfea']
const POSTER_BG = ['#f4c3d2', '#bde5cf', '#f1e4c3', '#d3c5ea', '#9fd5d3', '#f6dc9a', '#e9d6bd']
const POSTER_INK = ['#3a2d33', '#3f6b6a', '#6b4a3d', '#e88fd0', '#5eaef5', '#a6c69a', '#f0b07f']

type State = 'idle' | 'near' | 'open'

/** The games' real title screens, one per machine in file order, shown on the CRTs. */
/** Ana's poster images: anything dropped in src/assets/posters shows up on the wall. */
const POSTER_URLS = Object.values(import.meta.glob('../assets/posters/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default', query: '?url' })) as string[]

/* ---------------------------------------------------------- textures */

function canvasTex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) }
  return t
}

/** Deterministic little RNG so the room looks the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

/** Cream / sage checker with grime, 8x8 tiles per texture (green picked from the mosaic wall). */
function makeFloor() {
  const c = document.createElement('canvas'); c.width = c.height = 512
  const ctx = c.getContext('2d')!
  const r = rng(7)
  const n = 8, s = 512 / n
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const dark = (i + j) % 2 === 1
    const k = 0.9 + r() * 0.12
    ctx.fillStyle = dark ? `rgb(${112 * k | 0},${132 * k | 0},${84 * k | 0})` : `rgb(${226 * k | 0},${224 * k | 0},${200 * k | 0})`
    ctx.fillRect(i * s, j * s, s, s)
    // worn edge
    ctx.fillStyle = 'rgba(60, 70, 40, 0.22)'
    ctx.fillRect(i * s, j * s, s, 2); ctx.fillRect(i * s, j * s, 2, s)
  }
  for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(60, 70, 40, ${r() * 0.14})`; ctx.fillRect(r() * 512, r() * 512, 3, 3) }
  return c
}

/** Paper lantern skin: pastel with fine horizontal ribs. */
function makeLantern(color: string) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = color; ctx.fillRect(0, 0, 64, 256)
  ctx.fillStyle = 'rgba(70, 40, 40, 0.28)'
  for (let y = 6; y < 256; y += 14) ctx.fillRect(0, y, 64, 2)
  return c
}

/** A framed poster: pastel ground, one bold geometric composition, text-like bars. */
function makePoster(seed: number) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 352
  const ctx = c.getContext('2d')!
  const r = rng(seed)
  const bg = POSTER_BG[(r() * POSTER_BG.length) | 0]
  let ink = POSTER_INK[(r() * POSTER_INK.length) | 0]
  if (ink === bg) ink = '#3a2d33'
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 352)
  const kind = (r() * 4) | 0
  ctx.fillStyle = ink
  if (kind === 0) { // sun + band
    ctx.beginPath(); ctx.arc(128, 130, 70 + r() * 20, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = POSTER_INK[(r() * POSTER_INK.length) | 0]; ctx.fillRect(0, 210, 256, 28)
  } else if (kind === 1) { // diagonal stripes
    ctx.save(); ctx.translate(128, 150); ctx.rotate(-0.6)
    for (let i = -6; i < 6; i++) if (i % 2) ctx.fillRect(i * 28, -260, 16, 520)
    ctx.restore()
    ctx.fillStyle = bg; ctx.fillRect(60, 90, 136, 120); ctx.fillStyle = ink; ctx.fillRect(72, 102, 112, 96)
  } else if (kind === 2) { // dot grid + triangle
    for (let i = 0; i < 7; i++) for (let j = 0; j < 8; j++) { ctx.beginPath(); ctx.arc(30 + i * 33, 28 + j * 30, 4, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = POSTER_INK[(r() * POSTER_INK.length) | 0]
    ctx.beginPath(); ctx.moveTo(128, 60); ctx.lineTo(220, 230); ctx.lineTo(36, 230); ctx.closePath(); ctx.fill()
  } else { // character-ish blob with eyes
    ctx.beginPath(); ctx.ellipse(128, 150, 78, 90, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#f3eee4'; ctx.beginPath(); ctx.arc(104, 135, 14, 0, Math.PI * 2); ctx.arc(152, 135, 14, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#1a1418'; ctx.beginPath(); ctx.arc(108, 137, 6, 0, Math.PI * 2); ctx.arc(156, 137, 6, 0, Math.PI * 2); ctx.fill()
  }
  // title bars
  ctx.fillStyle = ink
  ctx.fillRect(24, 268, 150 + r() * 60, 18)
  ctx.fillRect(24, 296, 90 + r() * 80, 10)
  ctx.fillRect(24, 314, 60 + r() * 60, 10)
  // aged paper vignette
  const g = ctx.createRadialGradient(128, 176, 80, 128, 176, 260)
  g.addColorStop(0, 'rgba(120, 90, 60, 0)'); g.addColorStop(1, 'rgba(120, 90, 60, 0.35)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 352)
  return c
}

/**
 * The cabinet texture is baked pink/red. Keep its shading but push every saturated pixel to a
 * pastel tint; greys, whites and the dark buttons stay as they are.
 */
const RECOLOUR_CACHE = new Map<string, THREE.CanvasTexture>()
function recolour(src: THREE.Texture, hex: string) {
  const key = `${src.uuid}:${hex}`
  const hit = RECOLOUR_CACHE.get(key)
  if (hit) return hit
  const img = src.image as CanvasImageSource & { width: number; height: number }
  const w = img.width, h = img.height
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const id = ctx.getImageData(0, 0, w, h); const d = id.data
  const tr = parseInt(hex.slice(1, 3), 16), tg = parseInt(hex.slice(3, 5), 16), tb = parseInt(hex.slice(5, 7), 16)
  // reference brightness = mean luminance of the saturated (pink) pixels
  let sum = 0, cnt = 0
  const lumOf = (i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  const satOf = (i: number) => { const mx = Math.max(d[i], d[i + 1], d[i + 2]); return mx ? (mx - Math.min(d[i], d[i + 1], d[i + 2])) / mx : 0 }
  for (let i = 0; i < d.length; i += 64) if (satOf(i) > 0.22) { sum += lumOf(i); cnt++ }
  const ref = cnt ? sum / cnt : 150
  for (let i = 0; i < d.length; i += 4) {
    const s = satOf(i)
    if (s < 0.22) continue
    const k = Math.pow(lumOf(i) / ref, 0.85)
    const mix = Math.min(1, (s - 0.22) / 0.25)
    d[i] = d[i] + (Math.min(255, tr * k) - d[i]) * mix
    d[i + 1] = d[i + 1] + (Math.min(255, tg * k) - d[i + 1]) * mix
    d[i + 2] = d[i + 2] + (Math.min(255, tb * k) - d[i + 2]) * mix
  }
  ctx.putImageData(id, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.flipY = false // glTF convention, like the source
  t.wrapS = src.wrapS; t.wrapT = src.wrapT
  t.anisotropy = 4
  RECOLOUR_CACHE.set(key, t) // one pixel pass per tint, shared by every cabinet of that colour
  return t
}

/**
 * The CRT picture: the game's real title screen when we have one (cover-cropped, focus a bit left
 * of centre where titles usually sit), otherwise a chunky generated attract screen. Redrawn on
 * state changes and coin blinks.
 */
function drawScreen(c: HTMLCanvasElement, game: WorldGame | null, state: State, blink: boolean, pic?: HTMLImageElement | null) {
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height
  if (!game) { ctx.fillStyle = '#0c0f12'; ctx.fillRect(0, 0, W, H); return }
  if (pic && pic.complete && pic.naturalWidth) {
    const iw = pic.naturalWidth, ih = pic.naturalHeight
    let cw = iw, ch = ih
    if (iw / ih > W / H) cw = ih * (W / H); else ch = iw / (H / W)
    const cx = Math.min(iw - cw, Math.max(0, iw * 0.47 - cw / 2))
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(pic, cx, (ih - ch) / 2, cw, ch, 0, 0, W, H)
    // CRT vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85)
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)')
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
    // status bar over the picture
    ctx.font = `bold ${Math.round(H * 0.075)}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (state === 'near' && blink) {
      ctx.fillStyle = 'rgba(12, 13, 18, 0.72)'; ctx.fillRect(0, H * 0.82, W, H * 0.13)
      ctx.fillStyle = '#f6dc9a'; ctx.fillText('INSERT COIN', W / 2, H * 0.885)
    } else if (state === 'open') {
      ctx.fillStyle = 'rgba(12, 13, 18, 0.72)'; ctx.fillRect(0, H * 0.82, W, H * 0.13)
      ctx.fillStyle = blink ? '#f6dc9a' : '#b9e3c9'; ctx.fillText(blink ? 'CREDIT  1' : 'PRESS START', W / 2, H * 0.885)
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1)
    return
  }
  const hue = game.hue
  ctx.fillStyle = `hsl(${hue}, 45%, 13%)`; ctx.fillRect(0, 0, W, H)
  // sky stars
  const r = rng(hue)
  ctx.fillStyle = `hsl(${hue}, 60%, 75%)`
  for (let i = 0; i < 26; i++) ctx.fillRect((r() * W) | 0, (r() * (H * 0.55)) | 0, 2, 2)
  // ground + platforms
  ctx.fillStyle = `hsl(${hue}, 50%, 42%)`; ctx.fillRect(0, H - 22, W, 22)
  ctx.fillStyle = `hsl(${hue}, 55%, 60%)`; ctx.fillRect(0, H - 22, W, 3)
  ctx.fillStyle = `hsl(${(hue + 40) % 360}, 55%, 55%)`
  ctx.fillRect(26, H - 54, 30, 6); ctx.fillRect(84, H - 74, 34, 6); ctx.fillRect(126, H - 46, 24, 6)
  // little hero
  ctx.fillStyle = '#f4b8cb'; ctx.fillRect(36, H - 70, 10, 10); ctx.fillRect(38, H - 60, 6, 6)
  ctx.fillStyle = '#1a1418'; ctx.fillRect(43, H - 67, 2, 2)
  // title
  ctx.fillStyle = '#f3eee4'
  ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const title = game.title.toUpperCase()
  ctx.fillText(title.length > 12 ? title.slice(0, 12) : title, W / 2, 30)
  ctx.fillStyle = `hsl(${hue}, 70%, 80%)`; ctx.fillRect(W / 2 - 40, 40, 80, 2)
  ctx.font = 'bold 9px monospace'
  if (state === 'idle') { ctx.fillStyle = 'rgba(243, 238, 228, 0.7)'; ctx.fillText(`${game.year} · ${game.engine.toUpperCase()}`, W / 2, 56) }
  else if (state === 'near') { if (blink) { ctx.fillStyle = '#f6dc9a'; ctx.fillText('INSERT COIN', W / 2, 56) } }
  else { ctx.fillStyle = '#f6dc9a'; ctx.fillText(blink ? 'CREDIT  1' : 'PRESS START', W / 2, 56) }
  // scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
  for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1)
}

/* ---------------------------------------------------------- cabinet */

/**
 * Ana's Sketchfab cabinet: two meshes, the painted body and an inverted-hull outline.
 * Local frame: Y up, 228 tall; the front faces +X; width runs along Z (centre ≈ 342).
 * The screen is a slanted quad from (x -4.7, y 124) to (x -20.8, y 201), 86 wide.
 */
function useCabinetModel(tint: string) {
  const { scene } = useGLTF(CAB_URL)
  const model = useMemo(() => {
    const g = scene.clone(true)
    const mats: THREE.Material[] = []
    const texs: THREE.Texture[] = []
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const orig = m.material as THREE.MeshStandardMaterial
      if (m.name.startsWith('Arcade_Outline')) {
        m.material = new THREE.MeshBasicMaterial({ color: '#2b2026', side: orig.side })
      } else {
        const map = orig.map ? recolour(orig.map, tint) : null
        if (map) texs.push(map)
        m.material = new THREE.MeshStandardMaterial({ map, color: map ? '#ffffff' : tint, roughness: 0.6, metalness: 0, side: orig.side })
      }
      mats.push(m.material as THREE.Material)
    })
    return { g, mats, texs }
  }, [scene, tint])
  useEffect(() => () => { model.mats.forEach((m) => m.dispose()) }, [model]) // recoloured textures stay cached
  return model.g
}

function CabinetBody({ x, tint, game, state, coin = false, title, index, onOpen }: { x: number; tint: string; game: WorldGame | null; state: State; coin?: boolean; title?: string; index?: number; onOpen?: () => void }) {
  const model = useCabinetModel(tint)
  const [hover, setHover] = useState(false)
  // the title screen, if we have one: a real picture needs a finer canvas than the pixel attract screen
  const [titleImg, setTitleImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!title) { setTitleImg(null); return }
    const im = new Image(); im.src = title
    im.onload = () => setTitleImg(im)
    return () => { im.onload = null }
  }, [title])
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = title ? 456 : 160; c.height = title ? 400 : 144; return c }, [title])
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t }, [canvas])
  useEffect(() => () => tex.dispose(), [tex])
  const blink = useRef(true)
  const clock = useRef(0)
  useEffect(() => { drawScreen(canvas, game, state, true, titleImg); tex.needsUpdate = true }, [canvas, tex, game, state, titleImg])
  useFrame((_, dt) => {
    if (state === 'idle') return
    clock.current += dt
    if (clock.current > 0.55) { clock.current = 0; blink.current = !blink.current; drawScreen(canvas, game, state, blink.current, titleImg); tex.needsUpdate = true }
  })
  const bright = !game ? 0.35 : state === 'idle' ? 0.55 : state === 'near' ? 1.0 : 1.2
  const glow = !game ? 0 : state === 'idle' ? 0.8 : state === 'near' ? 6 : 9
  const glowColor = game ? `hsl(${game.hue}, 60%, 65%)` : '#ffffff'
  return (
    <group position={[x, 0, CAB_Z]} rotation={[0, -Math.PI / 2, 0]} scale={CAB_S}>
      <group position={[5, -0.3, -342]}>
        <primitive object={model}
          onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); if (game) onOpen?.() }}
          onPointerOver={(e: { nativeEvent: Event }) => { if (game) { setHover(true); (e.nativeEvent.target as HTMLElement).style.cursor = 'pointer' } }}
          onPointerOut={(e: { nativeEvent: Event }) => { setHover(false); (e.nativeEvent.target as HTMLElement).style.cursor = '' }} />
        {/* the CRT: a quad laid on the slanted screen face, poking 1.5 units out of it */}
        <group position={[-12.75, 162.4, 341.8]} rotation={[0, 0, 0.2075]}>
          <mesh rotation={[0, Math.PI / 2, 0]} position={[1.5, 0, 0]}
            onClick={(e) => { e.stopPropagation(); if (game) onOpen?.() }}
            onPointerOver={(e) => { if (game) { setHover(true); (e.nativeEvent.target as HTMLElement).style.cursor = 'pointer' } }}
            onPointerOut={(e) => { setHover(false); (e.nativeEvent.target as HTMLElement).style.cursor = '' }}>
            <planeGeometry args={[82, 72]} />
            <meshBasicMaterial map={tex} toneMapped={false} color={new THREE.Color(bright, bright, bright)} />
          </mesh>
        </group>
      </group>
      {glow > 0 && <pointLight position={[75, 165, 0]} color={glowColor} intensity={glow} distance={5 / CAB_S} decay={2} />}
      {/* coin slot: a dark mouth with a warm lamp above it, on the front below the control panel */}
      <group position={[47, 96, -22]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[10, 14, 2]} />
          <meshStandardMaterial color="#2b2026" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.6]}>
          <boxGeometry args={[1.8, 8.5, 1]} />
          <meshStandardMaterial color="#08070a" />
        </mesh>
        <mesh position={[0, 9.5, 0.6]}>
          <boxGeometry args={[6, 2, 1]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={state === 'idle' ? 0.2 : 1.6} toneMapped={false} />
        </mesh>
      </group>
      {coin && <Coin />}
      {/* the clear signpost: number + name floating over the machine, lit when she's touching it or the mouse is on it */}
      {game && (
        <Html position={[0, 262, 0]} center zIndexRange={[4, 0]} wrapperClass="cab-tag-wrap">
          <div className={`cab-tag ${state !== 'idle' || hover ? 'on' : ''}`}>
            <span className="meta">{index !== undefined ? String(index + 1).padStart(2, '0') : ''} · {game.engine}</span>
            <b>{game.title}</b>
            <i className="line" />
            <i className="chev" />
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Inserting the coin, first person: it starts just in front of the camera, low and to the right
 * (in the viewer's hand, facing them), travels to the slot turning edge-on, and is pushed in — the
 * cabinet body hides it. A warm flash marks the "clink". Lives in the cabinet's outer frame
 * (already centred: front is +X, width along Z, 228 tall); the slot mouth is at (47, 96, -22).
 */
function Coin() {
  const ref = useRef<THREE.Group>(null)
  const [face, edge] = useTexture([coinFaceUrl, coinEdgeUrl])
  const coinGeo = useMemo(() => new THREE.CylinderGeometry(3.3, 3.3, 0.9, 36), [])
  // CylinderGeometry groups: [side, top cap, bottom cap]. The painted shader samples the map
  // straight from the uv, so the face image is pre-rotated (in the asset) to read upright in the hand pose
  const coinMats = useMemo(() => {
    edge.wrapS = THREE.RepeatWrapping; edge.colorSpace = THREE.SRGBColorSpace; edge.needsUpdate = true
    const o = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.14, patch: 0.12, patchScale: 10, spec: 0.5, rimStrength: 0.35, rimColor: '#ffe9a8', keyColor: '#fff1d0', shadowColor: '#6a4a12', fillColor: '#c98a2a' }
    return [makePainterly(edge, o), makePainterly(face, o), makePainterly(face, o)]
  }, [face, edge])
  const light = useRef<THREE.PointLight>(null)
  const t = useRef(0)
  const from = useRef<THREE.Vector3 | null>(null)
  const to = useMemo(() => new THREE.Vector3(38, 96, -22), []) // a little inside the slot, so it is swallowed
  const qHand = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), []) // face to the viewer
  const qSlot = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), []) // edge-on, upright
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() }), [])
  useFrame(({ camera }, dt) => {
    const g = ref.current
    if (!g || !g.parent) return
    if (!from.current) {
      // where the hand is: 0.9 in front of the lens, a bit right and below centre — the camera sees
      // ±17° vertically (fov 34), so the offsets stay under ~10° to be in frame in any aspect ratio
      tmp.f.set(0, 0, -1).applyQuaternion(camera.quaternion)
      tmp.r.set(1, 0, 0).applyQuaternion(camera.quaternion)
      tmp.u.set(0, 1, 0).applyQuaternion(camera.quaternion)
      tmp.p.copy(camera.position).addScaledVector(tmp.f, 0.9).addScaledVector(tmp.r, 0.12).addScaledVector(tmp.u, -0.15)
      g.parent.updateWorldMatrix(true, false) // freshly mounted: its world matrix is still identity on the first frame
      from.current = g.parent.worldToLocal(tmp.p.clone())
    }
    t.current = Math.min(1, t.current + dt / 1.0)
    const k = t.current
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2 // ease in-out
    g.position.lerpVectors(from.current, to, e)
    g.position.y += Math.sin(e * Math.PI) * 5
    g.quaternion.slerpQuaternions(qHand, qSlot, Math.min(1, e * 1.35))
    g.rotation.y += 0.25 * Math.sin(k * Math.PI * 2) // a little wobble of the wrist
    g.visible = k < 0.93
    if (light.current) light.current.intensity = k > 0.84 ? 7 * Math.sin(((k - 0.84) / 0.16) * Math.PI) : 0
  })
  return (
    <group>
      <group ref={ref} position={[120, 120, -22]}>
        {/* a flat cartoon gold coin: Ana's "$" face on both caps, striped edge, painted shader */}
        <mesh geometry={coinGeo} material={coinMats} />
      </group>
      <pointLight ref={light} position={[56, 100, -22]} color="#ffc070" intensity={0} distance={4 / CAB_S} decay={2} />
    </group>
  )
}

/** One interactive cabinet per game. */
export function Cabinet({ game, x, tint, state, coin, title, index, onOpen }: { game: WorldGame; x: number; tint: string; state: State; coin: boolean; title?: string; index: number; onOpen: () => void }) {
  return <CabinetBody x={x} tint={tint} game={game} state={state} coin={coin} title={title} index={index} onOpen={onOpen} />
}

/* ---------------------------------------------------------- dressing */

function Lantern({ x, z, color, seed }: { x: number; z: number; color: string; seed: number }) {
  const tex = useMemo(() => canvasTex(makeLantern(color)), [color])
  const warm = seed % 2 ? '#ffb877' : '#ffc890' // amber / honey, alternating
  useEffect(() => () => tex.dispose(), [tex])
  const y = CEIL_Y - 1.25 - (seed % 3) * 0.12
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, (CEIL_Y - y) / 2 + 0.25, 0]}>
        <cylinderGeometry args={[0.012, 0.012, CEIL_Y - y - 0.5, 6]} />
        <meshStandardMaterial color="#2b2026" />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.12, 0.14, 0.08, 12]} />
        <meshStandardMaterial color="#2b2026" roughness={0.8} />
      </mesh>
      <mesh scale={[1, 0.82, 1]}>
        <sphereGeometry args={[0.5, 24, 18]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffd9a8" emissiveIntensity={1.35} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.14, 0.12, 0.08, 12]} />
        <meshStandardMaterial color="#2b2026" roughness={0.8} />
      </mesh>
      <pointLight color={warm} intensity={13} distance={10} decay={2} />
    </group>
  )
}

/** Ceiling fixtures, switched off — the lanterns light the room. */
function Fluorescent({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, CEIL_Y, z]}>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[2.6, 0.12, 0.34]} />
        <meshStandardMaterial color="#e3e1d6" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <boxGeometry args={[2.3, 0.06, 0.12]} />
        <meshStandardMaterial color="#8a8f84" emissive="#c9d4b8" emissiveIntensity={0.08} />
      </mesh>
    </group>
  )
}

type PosterSpec = { x: number; y: number; w: number; h: number; rot: number; z: number; mat: THREE.Material }

function Poster({ x, y, w, h, rot, z, mat, frame }: PosterSpec & { frame: THREE.Material }) {
  return (
    <group position={[x, y, WALL_Z + 0.03 + z]} rotation={[0, 0, rot]}>
      <mesh position={[0, 0, -0.004]} material={frame}>
        <boxGeometry args={[w + 0.06, h + 0.06, 0.006]} />
      </mesh>
      <mesh position={[0, 0, 0.0005]} material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  )
}

function Note({ x, y, rot, color, z = 0.02 }: { x: number; y: number; rot: number; color: string; z?: number }) {
  return (
    <mesh position={[x, y, WALL_Z + z]} rotation={[0, 0, rot]}>
      <planeGeometry args={[0.36, 0.46]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}

function Clock({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, WALL_Z + 0.16]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 32]} />
        <meshStandardMaterial color="#2b2026" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <circleGeometry args={[0.31, 32]} />
        <meshStandardMaterial color="#f3eee4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.1, 0.05]}>
        <boxGeometry args={[0.03, 0.22, 0.01]} />
        <meshStandardMaterial color="#1a1418" />
      </mesh>
      <mesh position={[0.07, 0.04, 0.05]} rotation={[0, 0, -1.1]}>
        <boxGeometry args={[0.03, 0.26, 0.01]} />
        <meshStandardMaterial color="#1a1418" />
      </mesh>
    </group>
  )
}

const VENDING_URL = '/models/vending.glb'
const VENDING_H = 3.9 // world height; the GLB is 4.4 tall, 2.2 wide, 1.6 deep, standing on y = 0

/** Ana's vending machine (Sketchfab GLB, PBR with an emissive panel), closing the row on the right. */
function Vending({ x }: { x: number }) {
  const { scene } = useGLTF(VENDING_URL)
  const model = useMemo(() => scene.clone(true), [scene])
  const s = VENDING_H / 4.4
  return (
    <group position={[x, 0, CAB_Z + 0.15]} rotation={[0, VENDING_YAW, 0]} scale={s}>
      <primitive object={model} />
      {/* its lit panel spills a little cool light on the floor */}
      <pointLight position={[0, 2.2 / s, 1.2 / s]} color="#dff6ff" intensity={2.2} distance={3.5 / s} decay={2} />
    </group>
  )
}
// which way the model's front faces: tune here if it shows its back to the camera
const VENDING_YAW = 0

/* ---------------------------------------------------------- room */

type RoomProps = { count: number; tileX: (i: number) => number; gap: number; onFloor?: (x: number) => void }

export default function ArcadeRoom({ count, tileX, gap, onFloor }: RoomProps) {
  const length = (count + 3) * gap + 12
  const cx = tileX(count - 1) / 2
  const x0 = cx - length / 2
  const floorTex = useMemo(() => canvasTex(makeFloor(), [length / 6, 30 / 6]), [length])
  useEffect(() => () => floorTex.dispose(), [floorTex])
  // one material per poster image, shared by every copy on the wall (13 shaders instead of ~160)
  const posterTexs = useTexture(POSTER_URLS.length ? POSTER_URLS : [WALL_URL])
  const posterMats = useMemo(() => {
    const texs = POSTER_URLS.length ? posterTexs : Array.from({ length: 10 }, (_, i) => canvasTex(makePoster(i * 7 + 3)))
    return texs.map((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return new THREE.MeshLambertMaterial({ map: t }) })
  }, [posterTexs])
  const frameMat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#3a2a24' }), [])
  useEffect(() => () => { posterMats.forEach((m) => m.dispose()); frameMat.dispose() }, [posterMats, frameMat])
  const wallTex = useTexture(WALL_URL)
  useEffect(() => {
    const img = wallTex.image as { width: number; height: number }
    wallTex.colorSpace = THREE.SRGBColorSpace
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping
    wallTex.anisotropy = 8
    wallTex.repeat.set(length / ((img.width / 64) * TILE), CEIL_Y / ((img.height / 64) * TILE))
    wallTex.needsUpdate = true
  }, [wallTex, length])

  // dressing positions, spread over the visible stretch of wall
  const lanterns = useMemo(() => Array.from({ length: count + 3 }, (_, i) => ({ x: tileX(i - 1) + gap / 2 - 0.3, color: i % 2 ? '#f4b8cb' : '#f3e2b8', seed: i })), [count, tileX, gap])
  const tubes = useMemo(() => Array.from({ length: Math.ceil(length / 5) }, (_, i) => x0 + 2.5 + i * 5), [length, x0])
  // the whole wall is a collage: three staggered, overlapping rows from above the cabinets to the
  // ceiling (a fourth row was mostly hidden behind the machines and cost a lot of draw calls)
  const posters = useMemo(() => {
    const r = rng(21)
    const out: PosterSpec[] = []
    const from = x0 + 1, to = x0 + length - 1
    const rows = [5.55, 4.15, 2.8]
    let i = 0
    rows.forEach((rowY, ri) => {
      i = 0
      for (let x = from + (ri % 2) * 0.5; x <= to; x += 1.0 + r() * 0.5) {
        const big = r() < 0.4
        const w = big ? 1.05 : 0.82
        const mat = posterMats[(i * 5 + ri) % posterMats.length]
        const img = (mat as THREE.MeshLambertMaterial).map?.image as { width: number; height: number } | undefined
        const h = img && img.width ? w * (img.height / img.width) : w * 1.42
        // depth level: neighbours in a row cycle through 3 levels and each row has its own block,
        // so no two overlapping posters ever share a depth (otherwise they z-fight and flicker)
        const level = (i % 3) + 3 * (ri % 3)
        out.push({ x: x + (r() - 0.5) * 0.2, y: rowY + (r() - 0.5) * 0.5, w, h, rot: (r() - 0.5) * 0.14, z: level * 0.01, mat })
        i++
      }
    })
    return out
  }, [x0, length, posterMats])

  return (
    <group>
      <fog attach="fog" args={['#221a13', 18, 46]} />
      <ambientLight color="#ffb27a" intensity={0.09} />
      <hemisphereLight color="#ffc79a" groundColor="#4a2e1c" intensity={0.12} />

      {/* checkered floor — click it to walk there */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, 4]} onClick={(e) => { e.stopPropagation(); onFloor?.(e.point.x) }}>
        <planeGeometry args={[length, 30]} />
        <meshStandardMaterial map={floorTex} roughness={0.42} />
      </mesh>
      {/* back wall: glossy sage glass mosaic, floor to ceiling */}
      <mesh position={[cx, CEIL_Y / 2, WALL_Z]}>
        <planeGeometry args={[length, CEIL_Y]} />
        <meshStandardMaterial map={wallTex} roughness={0.22} metalness={0.05} />
      </mesh>
      {/* low popcorn ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[cx, CEIL_Y, 4]}>
        <planeGeometry args={[length, 30]} />
        <meshStandardMaterial color="#c9c0ae" roughness={1} />
      </mesh>

      {tubes.map((x, i) => <Fluorescent key={i} x={x} z={1.6} />)}
      {lanterns.map((l, i) => <Lantern key={i} x={l.x} z={0.6} color={l.color} seed={l.seed} />)}
      {posters.map((p, i) => <Poster key={i} {...p} frame={frameMat} />)}
      <Note x={tileX(-1) - 0.2} y={4.75} rot={0.08} color="#f3e6c9" z={0.11} />
      <Note x={tileX(-1) + 0.25} y={4.7} rot={-0.12} color="#f4b8cb" z={0.11} />
      <Note x={tileX(count) + 0.9} y={4.8} rot={0.05} color="#f3e6c9" z={0.11} />
      <Note x={tileX(count) + 1.35} y={4.65} rot={-0.09} color="#b9e3c9" z={0.11} />
      <Clock x={tileX(count) + 1.1} y={5.9} />

      {/* an extra, switched-off cabinet on the left, and the tea machine closing the row */}
      <CabinetBody x={tileX(-1)} tint="#efe3c2" game={null} state="idle" />
      <Vending x={tileX(count) + 0.15} />
    </group>
  )
}

useGLTF.preload(CAB_URL)
useGLTF.preload(VENDING_URL)
useTexture.preload(WALL_URL)
if (POSTER_URLS.length) useTexture.preload(POSTER_URLS)
