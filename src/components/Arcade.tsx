import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { WorldGame } from './GameWorld'

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

/** Pastel cabinet colours, cycled per game (no red anywhere). */
export const PASTELS = ['#f4b8cb', '#b9e3c9', '#efe3c2', '#cfbfea']
const POSTER_BG = ['#f4c3d2', '#bde5cf', '#f1e4c3', '#d3c5ea', '#9fd5d3', '#f6dc9a', '#e9d6bd']
const POSTER_INK = ['#3a2d33', '#3f6b6a', '#6b4a3d', '#e88fd0', '#5eaef5', '#a6c69a', '#f0b07f']

type State = 'idle' | 'near' | 'open'

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
function recolour(src: THREE.Texture, hex: string) {
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
  return t
}

/** Chunky pixel-art attract screen for a game, redrawn on state changes and coin blinks. */
function drawScreen(c: HTMLCanvasElement, game: WorldGame | null, state: State, blink: boolean) {
  const ctx = c.getContext('2d')!
  const W = c.width, H = c.height
  if (!game) { ctx.fillStyle = '#0c0f12'; ctx.fillRect(0, 0, W, H); return }
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
  useEffect(() => () => { model.mats.forEach((m) => m.dispose()); model.texs.forEach((t) => t.dispose()) }, [model])
  return model.g
}

function CabinetBody({ x, tint, game, state, coin = false, onOpen }: { x: number; tint: string; game: WorldGame | null; state: State; coin?: boolean; onOpen?: () => void }) {
  const model = useCabinetModel(tint)
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 160; c.height = 144; return c }, [])
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t }, [canvas])
  useEffect(() => () => tex.dispose(), [tex])
  const blink = useRef(true)
  const clock = useRef(0)
  useEffect(() => { drawScreen(canvas, game, state, true); tex.needsUpdate = true }, [canvas, tex, game, state])
  useFrame((_, dt) => {
    if (state === 'idle') return
    clock.current += dt
    if (clock.current > 0.55) { clock.current = 0; blink.current = !blink.current; drawScreen(canvas, game, state, blink.current); tex.needsUpdate = true }
  })
  const bright = !game ? 0.35 : state === 'idle' ? 0.55 : state === 'near' ? 1.0 : 1.2
  const glow = !game ? 0 : state === 'idle' ? 0.8 : state === 'near' ? 6 : 9
  const glowColor = game ? `hsl(${game.hue}, 60%, 65%)` : '#ffffff'
  return (
    <group position={[x, 0, CAB_Z]} rotation={[0, -Math.PI / 2, 0]} scale={CAB_S}>
      <group position={[5, -0.3, -342]}>
        <primitive object={model}
          onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); if (game) onOpen?.() }}
          onPointerOver={(e: { nativeEvent: Event }) => { if (game) (e.nativeEvent.target as HTMLElement).style.cursor = 'pointer' }}
          onPointerOut={(e: { nativeEvent: Event }) => { (e.nativeEvent.target as HTMLElement).style.cursor = '' }} />
        {/* the CRT: a quad laid on the slanted screen face, poking 1.5 units out of it */}
        <group position={[-12.75, 162.4, 341.8]} rotation={[0, 0, 0.2075]}>
          <mesh rotation={[0, Math.PI / 2, 0]} position={[1.5, 0, 0]}
            onClick={(e) => { e.stopPropagation(); if (game) onOpen?.() }}
            onPointerOver={(e) => { if (game) (e.nativeEvent.target as HTMLElement).style.cursor = 'pointer' }}
            onPointerOut={(e) => { (e.nativeEvent.target as HTMLElement).style.cursor = '' }}>
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
        <mesh>
          <cylinderGeometry args={[3.3, 3.3, 0.9, 28]} />
          <meshStandardMaterial color="#f2c96a" emissive="#c9922e" emissiveIntensity={1.1} roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.3, 2.3, 0.3, 28]} />
          <meshStandardMaterial color="#d9ad4e" emissive="#8a5f1c" emissiveIntensity={0.8} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <cylinderGeometry args={[2.3, 2.3, 0.3, 28]} />
          <meshStandardMaterial color="#d9ad4e" emissive="#8a5f1c" emissiveIntensity={0.8} roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
      <pointLight ref={light} position={[56, 100, -22]} color="#ffc070" intensity={0} distance={4 / CAB_S} decay={2} />
    </group>
  )
}

/** One interactive cabinet per game. */
export function Cabinet({ game, x, tint, state, coin, onOpen }: { game: WorldGame; x: number; tint: string; state: State; coin: boolean; onOpen: () => void }) {
  return <CabinetBody x={x} tint={tint} game={game} state={state} coin={coin} onOpen={onOpen} />
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

type PosterSpec = { x: number; y: number; w: number; h: number; seed: number; rot: number; z: number; url?: string }

function PosterFrame({ x, y, w, h, rot, z, tex }: PosterSpec & { tex: THREE.Texture }) {
  return (
    <group position={[x, y, WALL_Z + 0.03 + z]} rotation={[0, 0, rot]}>
      <mesh position={[0, 0, -0.004]}>
        <boxGeometry args={[w + 0.06, h + 0.06, 0.006]} />
        <meshStandardMaterial color="#3a2a24" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.0005]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
    </group>
  )
}

function ImagePoster(p: PosterSpec & { url: string }) {
  const tex = useTexture(p.url)
  useEffect(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true }, [tex])
  const img = tex.image as { width: number; height: number } | undefined
  const h = img && img.width ? p.w * (img.height / img.width) : p.h // keep the print's own proportions
  return <PosterFrame {...p} h={h} tex={tex} />
}

function DrawnPoster(p: PosterSpec) {
  const tex = useMemo(() => canvasTex(makePoster(p.seed)), [p.seed])
  useEffect(() => () => tex.dispose(), [tex])
  return <PosterFrame {...p} tex={tex} />
}

function Poster(p: PosterSpec) {
  return p.url ? <ImagePoster {...p} url={p.url} /> : <DrawnPoster {...p} />
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

/** The teal tea vending machine from the reference, boxed out of primitives. */
function Vending({ x }: { x: number }) {
  const cans = useMemo(() => {
    const colors = ['#f0b07f', '#6cc4c4', '#efe3c2', '#e88fd0', '#a6c69a', '#5eaef5']
    const out: { x: number; y: number; c: string }[] = []
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) out.push({ x: -0.16 + c * 0.16, y: 0.55 + r * 0.32, c: colors[(r * 3 + c) % colors.length] })
    return out
  }, [])
  return (
    <group position={[x, 0, CAB_Z + 0.2]}>
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[1.4, 3.5, 1.15]} />
        <meshStandardMaterial color="#4fb4b6" roughness={0.45} />
      </mesh>
      {/* cream header with the tea logo band */}
      <mesh position={[0, 3.2, 0.58]}>
        <boxGeometry args={[1.32, 0.5, 0.02]} />
        <meshStandardMaterial color="#efe6d0" roughness={0.6} />
      </mesh>
      <mesh position={[0.2, 3.2, 0.6]}>
        <boxGeometry args={[0.5, 0.12, 0.01]} />
        <meshStandardMaterial color="#3f6b6a" />
      </mesh>
      {/* glass window with cans */}
      <mesh position={[-0.28, 1.85, 0.5]}>
        <boxGeometry args={[0.66, 1.9, 0.2]} />
        <meshStandardMaterial color="#0f1a1d" roughness={0.3} emissive="#7fd4d8" emissiveIntensity={0.25} />
      </mesh>
      {cans.map((c, i) => (
        <mesh key={i} position={[-0.28 + c.x, c.y + 0.6, 0.55]}>
          <cylinderGeometry args={[0.055, 0.055, 0.2, 10]} />
          <meshStandardMaterial color={c.c} roughness={0.35} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[-0.28, 1.85, 0.61]}>
        <planeGeometry args={[0.66, 1.9]} />
        <meshPhysicalMaterial color="#cfe9ea" transparent opacity={0.18} roughness={0.05} />
      </mesh>
      <pointLight position={[-0.28, 2.2, 0.75]} color="#dff6ff" intensity={2.4} distance={3} decay={2} />
      {/* button panel, coin slot, dispenser */}
      <mesh position={[0.36, 2.1, 0.585]}>
        <boxGeometry args={[0.42, 0.5, 0.02]} />
        <meshStandardMaterial color="#e6ded0" roughness={0.6} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0.24 + i * 0.12, 2.0, 0.6]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 10]} />
          <meshStandardMaterial color={['#f0b07f', '#f6dc9a', '#6cc4c4'][i]} emissive={['#f0b07f', '#f6dc9a', '#6cc4c4'][i]} emissiveIntensity={0.4} />
        </mesh>
      ))}
      <mesh position={[0.36, 1.3, 0.585]}>
        <boxGeometry args={[0.36, 0.42, 0.02]} />
        <meshStandardMaterial color="#8e979c" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[-0.2, 0.55, 0.585]}>
        <boxGeometry args={[0.7, 0.32, 0.03]} />
        <meshStandardMaterial color="#14191b" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.42, 0.16, 1.17]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.8} />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------- room */

type RoomProps = { count: number; tileX: (i: number) => number; gap: number; onFloor?: (x: number) => void }

export default function ArcadeRoom({ count, tileX, gap, onFloor }: RoomProps) {
  const length = (count + 4) * gap + 16
  const cx = tileX(count - 1) / 2
  const x0 = cx - length / 2
  const floorTex = useMemo(() => canvasTex(makeFloor(), [length / 6, 30 / 6]), [length])
  useEffect(() => () => floorTex.dispose(), [floorTex])
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
  // the whole wall is a collage: four staggered, overlapping rows from the floor to the ceiling
  // (the cabinets hide most of the lowest rows, like in a real arcade); images first, drawn fillers after
  const posters = useMemo(() => {
    const r = rng(21)
    const out: PosterSpec[] = []
    const from = x0 + 1, to = x0 + length - 1
    const rows = [5.55, 4.15, 2.75, 1.4]
    let i = 0
    rows.forEach((rowY, ri) => {
      i = 0
      for (let x = from + (ri % 2) * 0.5; x <= to; x += 0.9 + r() * 0.45) {
        const big = r() < 0.4
        const w = big ? 1.05 : 0.82, h = w * 1.42
        // depth level: neighbours in a row cycle through 3 levels and each row has its own block,
        // so no two overlapping posters ever share a depth (otherwise they z-fight and flicker)
        const level = (i % 3) + 3 * (ri % 3)
        out.push({ x: x + (r() - 0.5) * 0.2, y: rowY + (r() - 0.5) * 0.5, w, h, seed: (x * 13 + ri * 7 + 5) | 0, rot: (r() - 0.5) * 0.14, z: level * 0.01, url: POSTER_URLS.length ? POSTER_URLS[(i * 5 + ri) % POSTER_URLS.length] : undefined })
        i++
      }
    })
    return out
  }, [x0, length])

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
      {posters.map((p, i) => <Poster key={i} {...p} />)}
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
useTexture.preload(WALL_URL)
