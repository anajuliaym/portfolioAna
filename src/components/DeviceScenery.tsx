import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import RippleWater from './RippleWater'
import { makeClay } from './ClayMaterial'
import { makePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import * as THREE from 'three'
import heartUrl from '../assets/about/heart.webp'

/**
 * The Projects scenery, sixth take — the water-lily pond Ana chose (2026-10-15), built from her own
 * Meshy models: a floating garden pond (mossy stone rim, still water) and a mint lily-pad plate.
 * The phone and the MacBook each rest on a pad floating on the water; a mirror-like reflector lies on
 * the pond's water so the devices, pads and lilies reflect; the
 * moon glows behind, glass hearts and paper stars hover like fireflies. Everything is lit (the
 * textures are pastel) by the lights in Devices.tsx.
 */
const POND_URL = '/models/pond.glb'
const PAD_URL = '/models/lilypad.glb'
useGLTF.preload(POND_URL)
useGLTF.preload(PAD_URL)

/** the pond model: 1.9 wide, water surface at y 0.13 inside r ≈ 0.55, rim up to 0.43 (measured) */
const POND = { width: 4.0 }
const POND_SC = POND.width / 1.9
/** which shader dresses the pond model — Ana is comparing (2026-10-15): 'painterly' (the site's) vs 'clay' */
const POND_SHADER: 'painterly' | 'clay' = 'painterly'
/** the pond model's own (flat) water plane sits at 0.284 world = 0.135·POND_SC (measured from its vertices, 2026-10-15); our water goes just above it */
export const WATER_Y = 0.135 * POND_SC
export const WATER_R = 0.64 * POND_SC // the model's flat plane reaches r ≈ 1.3 world; beyond it the banks are higher and hide the disc
/** the pad model: 1.9 wide, flat top at y ≈ 0.03, cupped rim to 0.07 */
const PAD_TOP = 0.03 / 1.9

/** where things sit — shared with Devices.tsx so the camera and the tags agree with the scenery */
export const LAYOUT = {
  desktop: {
    phone: { x: -0.62, z: 0.34, pad: 0.7 },
    lap: { x: 0.42, z: -0.1, pad: 1.45 }, // wide enough that the MacBook's corners (half-diagonal 0.6) stay on the flat centre; the cupped rim pierced its base
    pads: [{ x: -1.02, z: -0.3, pad: 0.3 }, { x: 1.0, z: 0.78, pad: 0.26 }, { x: -0.3, z: -0.95, pad: 0.26 }, { x: 0.05, z: 0.95, pad: 0.22 }, { x: -1.0, z: 0.75, pad: 0.22 }],
  },
  narrow: {
    phone: { x: -0.18, z: 0.78, pad: 0.7 },
    lap: { x: 0.18, z: -0.42, pad: 1.4 },
    pads: [{ x: 0.95, z: 0.55, pad: 0.26 }, { x: -0.9, z: 0.2, pad: 0.24 }, { x: -0.85, z: -0.95, pad: 0.2 }],
  },
}
/** a pad's origin sits so its underside (0.09 deep per model unit) clears the mirror — it floats ON the water, not through it */
export const padBaseY = (pad: number) => WATER_Y + 0.004 + (0.09 / 1.9) * pad + 0.006
/**
 * Highest point of the pad's surface within radius `r` (world units) of its centre, measured on the real
 * geometry — the top is not flat (a bulge in the middle, dips, the cupped rim), so an estimate let the leaf
 * poke through the MacBook's base. Cached per (pad width, r).
 */
const padHeightCache = new Map<string, number>()
export function usePadSurfaceY(pad: number, r: number) {
  const { scene } = useGLTF(PAD_URL)
  return useMemo(() => {
    const key = `${pad}|${r}`
    const hit = padHeightCache.get(key); if (hit !== undefined) return hit
    const sc = pad / 1.9, rr = r / sc
    let top = -Infinity
    const v = new THREE.Vector3()
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return
      const pa = m.geometry.attributes.position
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); m.localToWorld(v); if (v.x * v.x + v.z * v.z <= rr * rr && v.y > top) top = v.y }
    })
    const y = padBaseY(pad) + (Number.isFinite(top) ? top : 0.03) * sc + 0.004
    padHeightCache.set(key, y)
    return y
  }, [scene, pad, r])
}
/** y of a device base resting on a pad of width `pad` (estimate; Devices.tsx uses the measured usePadSurfaceY) */
export const padTopY = (pad: number) => padBaseY(pad) + PAD_TOP * pad

/**
 * The water's outline = the pond model's own flat water plane (all three vertices at local y 0,135 ± 0,002),
 * so there is no disc edge showing over the model's dark surface (Ana, 2026-10-15: "ficou com essa borda").
 * World scale, flattened, in the xy plane (rotated −90° by RippleWater like the disc); square uv over the bbox so the ripple field keeps circles circular.
 */
function usePondWaterGeometry() {
  const { scene } = useGLTF(POND_URL)
  return useMemo(() => {
    let mesh: THREE.Mesh | null = null, best = 0
    scene.updateMatrixWorld(true)
    scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry.attributes.position.count > best) { best = m.geometry.attributes.position.count; mesh = m } })
    const g = new THREE.BufferGeometry()
    if (!mesh) return { geometry: g, extent: WATER_R * 2 }
    const m = mesh as THREE.Mesh
    const pos = m.geometry.attributes.position, idx = m.geometry.index
    const n = idx ? idx.count : pos.count
    const at = (k: number) => (idx ? idx.getX(k) : k)
    const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
    const out: number[] = []
    // the model's water is not perfectly flat (Meshy): vertices sit in [LEVEL−0.006, LEVEL+0.002]; a tight
    // tolerance picked only slivers at the shoreline. Horizontal faces only (|n.y| > 0.9) keep the banks out.
    const LEVEL = 0.135, LO = LEVEL - 0.006, HI = LEVEL + 0.002
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nrm = new THREE.Vector3()
    for (let i = 0; i < n; i += 3) {
      let flat = true
      for (let j = 0; j < 3; j++) { v[j].fromBufferAttribute(pos, at(i + j)).applyMatrix4(m.matrixWorld); if (v[j].y < LO || v[j].y > HI) { flat = false; break } }
      if (!flat) continue
      nrm.crossVectors(e1.subVectors(v[1], v[0]), e2.subVectors(v[2], v[0])).normalize()
      if (Math.abs(nrm.y) < 0.9) continue
      // authored in the xy plane like CircleGeometry (Water assumes that + rotation.x −90°): local y = −world z
      for (let j = 0; j < 3; j++) out.push(v[j].x * POND_SC, -v[j].z * POND_SC, 0)
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3))
    g.computeBoundingBox()
    const bb = g.boundingBox!
    const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2
    const extent = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y)
    const uv: number[] = []
    for (let i = 0; i < out.length; i += 3) uv.push((out[i] - cx) / extent + 0.5, (out[i + 1] - cy) / extent + 0.5)
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.computeVertexNormals()
    return { geometry: g, extent }
  }, [scene])
}

function Pond({ children }: { children?: React.ReactNode }) {
  const { scene } = useGLTF(POND_URL)
  const root = useMemo(() => {
    const r = scene.clone(true)
    r.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      // 'painterly' = the site's shader (desk/character parameters) + ink outline; 'clay' = ClayMaterial.ts (soft, forgiving)
      m.material = POND_SHADER === 'painterly'
        // subtler than the desk (Ana, 2026-10-15: "gostei mais, mas deixa mais sutil"): more bands, less paint/patch, thinner ink
        ? makePainterly(src.map ?? null, { keyDir: [1.4, 1.5, 1.2], bands: 5, paint: 0.05, patch: 0.05, patchScale: 22, patchVar: 0.05, spec: 0.1, rimStrength: 0.3, keyColor: '#f6e2c6' })
        : makeClay({ map: src.map ?? null })
    })
    return r
  }, [scene])
  useOutline(root, POND_SHADER === 'painterly' ? 0.0013 / POND_SC : 0, '#120d12')
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const el = ref.current; if (el) el.position.y = Math.sin(clock.elapsedTime * 0.35) * 0.012 })
  // the water rides inside the same bobbing group: 4 mm above the model's plane at every moment
  return <group ref={ref}><primitive object={root} scale={POND_SC} />{children}</group>
}

function Pad({ x, z, width, seed, still = false, children }: { x: number; z: number; width: number; seed: number; still?: boolean; children?: React.ReactNode }) {
  const { scene } = useGLTF(PAD_URL)
  const root = useMemo(() => {
    const r = scene.clone(true)
    r.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const src = m.material as THREE.MeshStandardMaterial; m.material = new THREE.MeshStandardMaterial({ map: src.map ?? null, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }) })
    return r
  }, [scene])
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const el = ref.current; if (!el || still) return // a pad under a device keeps still: the device does not ride it
    const t = clock.elapsedTime
    el.position.y = padBaseY(width) + Math.sin(t * 0.5 + seed) * 0.004
    el.rotation.z = Math.sin(t * 0.4 + seed) * 0.01; el.rotation.x = Math.cos(t * 0.45 + seed * 1.3) * 0.01
  })
  return (
    <group ref={ref} position={[x, padBaseY(width), z]} rotation={[0, seed, 0]}>
      <primitive object={root} scale={width / 1.9} />
      {children}
    </group>
  )
}

/**
 * the water: three.js `Water` (planar reflection + flowing normals, the base of nhtoby311/WaterSurface) with
 * React Bits' RippleDistortion ported into its shader — pointer ripples swirl the reflection (2026-10-15)
 */
function Water() {
  const { geometry, extent } = usePondWaterGeometry()
  return (
    <RippleWater
      geometry={geometry}
      extent={extent}
      radius={WATER_R}
      y={WATER_Y + 0.004}
      color="#5fc9cf"
      sunColor="#ffe6cc"
      sunDirection={[2, 3.5, -3]}
      flow={0.035}
      waves={60}
      speed={0.35}
      reflectivity={0.5}
      brushSize={0.5}
      strength={0.08}
      swirl={1}
      rings={4}
      spread={5}
      fade={3}
      spacing={0.05}
      dispersion={0.6}
      glint={0.5}
      tint="#f2a0b4"
      tintAmount={0.25}
      highlightColor="#fff4e6"
      trigger="both"
    />
  )
}

/** a soft radial glow sprite (the moon, a lilac halo); fades to the page colour at its edge */
function Glow({ x, y, z, s, inner, outer }: { x: number; y: number; z: number; s: number; inner: string; outer: string }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(256, 256, 0, 256, 256, 256)
    r.addColorStop(0, inner); r.addColorStop(0.35, outer); r.addColorStop(1, 'rgba(12,13,18,0)')
    g.fillStyle = r; g.fillRect(0, 0, 512, 512)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [inner, outer])
  return (
    <sprite position={[x, y, z]} scale={[s, s, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

/** glass hearts and paper stars drifting like fireflies, plus a dusting of tiny far stars */
function Floaters({ narrow }: { narrow: boolean }) {
  const heart = useTexture(heartUrl)
  const star = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = '#f7efe0'
    g.beginPath()
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? 18 : 60; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r) }
    g.closePath(); g.fill()
    g.strokeStyle = 'rgba(18,13,18,.55)'; g.lineWidth = 3; g.stroke()
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const dot = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 32
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(16, 16, 1, 16, 16, 16); r.addColorStop(0, 'rgba(255,245,235,1)'); r.addColorStop(0.4, 'rgba(255,245,235,.5)'); r.addColorStop(1, 'rgba(255,245,235,0)')
    g.fillStyle = r; g.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(c)
  }, [])
  const items = useMemo(() => {
    const list: { x: number; y: number; z: number; s: number; heart: boolean; ph: number; tint: string }[] = []
    const spots: [number, number, number][] = narrow
      ? [[-0.55, 0.95, -0.3], [0.6, 0.75, -0.2], [-0.5, 0.05, 0.1], [0.62, 0.2, 0.2], [0.1, 1.15, -0.4], [-0.62, -0.35, 0.3], [0.5, -1.0, 0.1]]
      : [[-1.25, 0.5, -0.3], [-0.2, 0.62, -0.35], [1.2, 0.55, -0.2], [0.05, 0.3, -0.5], [-1.05, -0.55, 0.4], [1.3, -0.65, 0.35], [0.5, 0.75, -0.6], [-0.1, -0.9, 0.2]]
    spots.forEach(([x, y, z], i) => list.push({ x, y, z, s: i % 3 === 0 ? 0.13 : 0.08, heart: i % 3 === 0, ph: i * 1.7, tint: ['#f7efe0', '#f2a0b4', '#a9d9c6', '#cdbdf0'][i % 4] }))
    return list
  }, [narrow])
  const dots = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: Math.sin(i * 12.9898) * 3.2, y: Math.cos(i * 78.233) * 1.9 + 0.2, z: -3 - (i % 5) * 0.4, s: 0.03 + (i % 3) * 0.015, ph: i })), [])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const dotRefs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((s, i) => { if (!s) return; const it = items[i]; s.position.y = it.y + Math.sin(t * 0.6 + it.ph) * 0.04; s.position.x = it.x + Math.sin(t * 0.25 + it.ph) * 0.03; s.material.rotation = it.heart ? Math.sin(t * 0.5 + it.ph) * 0.15 : t * 0.2 + it.ph })
    dotRefs.current.forEach((s, i) => { if (!s) return; s.material.opacity = 0.45 + Math.sin(t * 1.3 + dots[i].ph) * 0.35 })
  })
  return (
    <>
      {items.map((it, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} position={[it.x, it.y, it.z]} scale={[it.s, it.s, 1]}>
          <spriteMaterial map={it.heart ? heart : star} color={it.heart ? '#ffffff' : it.tint} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {dots.map((d, i) => (
        <sprite key={`d${i}`} ref={(el) => { dotRefs.current[i] = el }} position={[d.x, d.y, d.z]} scale={[d.s, d.s, 1]}>
          <spriteMaterial map={dot} transparent depthWrite={false} toneMapped={false} opacity={0.6} />
        </sprite>
      ))}
    </>
  )
}

/** little lights wandering over the water — bright enough for the bloom to catch them */
function Fireflies({ n = 16 }: { n?: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 64
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,250,225,1)'); r.addColorStop(0.3, 'rgba(255,240,200,.7)'); r.addColorStop(1, 'rgba(255,240,200,0)')
    g.fillStyle = r; g.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(c)
  }, [])
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({ a: i * 2.4, r: 0.5 + (i % 5) * 0.22, h: 0.12 + (i % 4) * 0.1, sp: 0.04 + (i % 3) * 0.02, ph: i * 1.3, tint: i % 3 === 0 ? '#ffd9a8' : i % 3 === 1 ? '#c8ffe6' : '#ffc6d9' })), [n])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((sp, i) => {
      if (!sp) return
      const s = seeds[i]
      sp.position.set(Math.cos(s.a + t * s.sp) * s.r, WATER_Y + s.h + Math.sin(t * 0.5 + s.ph) * 0.04, Math.sin(s.a + t * s.sp * 0.8) * s.r)
      sp.material.opacity = 0.35 + Math.sin(t * 0.9 + s.ph) * 0.25
    })
  })
  return (
    <>
      {seeds.map((s, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} scale={[0.032, 0.032, 1]}>
          <spriteMaterial map={tex} color={s.tint} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  )
}

export default function Scenery({ narrow }: { narrow: boolean }) {
  const L = narrow ? LAYOUT.narrow : LAYOUT.desktop
  return (
    <group>
      <Glow x={0.6} y={narrow ? 2.6 : 2.1} z={-4.5} s={narrow ? 4 : 5} inner="rgba(255,228,214,.9)" outer="rgba(214,150,180,.3)" />
      <Glow x={-1.2} y={0.2} z={-3.2} s={4} inner="rgba(170,150,230,.32)" outer="rgba(140,110,200,.1)" />
      <Pond><Water /></Pond>
      {/* the devices' pads (the devices themselves are placed by Devices.tsx at padTopY) */}
      <Pad x={L.phone.x} z={L.phone.z} width={L.phone.pad} seed={0.4} still />
      <Pad x={L.lap.x} z={L.lap.z} width={L.lap.pad} seed={2.2} still />
      {/* empty pads drifting around */}
      {L.pads.map((p, i) => <Pad key={`e${i}`} x={p.x} z={p.z} width={p.pad} seed={5.2 + i * 0.9} />)}
      <Fireflies n={narrow ? 9 : 12} />
      <group position={[0, WATER_Y, 0]}><Floaters narrow={narrow} /></group>
    </group>
  )
}
