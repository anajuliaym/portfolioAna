import { useMemo, useRef, useState } from 'react'
import { ThreeEvent, useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import heartUrl from '../assets/about/heart.webp'
import GlbProp, { LILIES_URL } from './GlbProp'

/**
 * The Projects scenery, sixth take — the water-lily pond Ana chose (2026-10-15), built from her own
 * Meshy models: a floating garden pond (mossy stone rim, still water) and a mint lily-pad plate.
 * The phone and the MacBook each rest on a pad floating on the water; a mirror-like reflector lies on
 * the pond's water so the devices, pads and lilies reflect; the pointer sends ripples across it; the
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
export const WATER_Y = 0.13 * POND_SC
export const WATER_R = 0.55 * POND_SC
/** the pad model: 1.9 wide, flat top at y ≈ 0.03, cupped rim to 0.07 */
const PAD_TOP = 0.03 / 1.9

/** where things sit — shared with Devices.tsx so the camera and the tags agree with the scenery */
export const LAYOUT = {
  desktop: {
    phone: { x: -0.56, z: 0.3, pad: 0.6 },
    lap: { x: 0.4, z: -0.1, pad: 1.36 },
    lilies: [{ x: 0.98, z: 0.6, pad: 0.46 }, { x: -0.92, z: -0.5, pad: 0.4 }, { x: 0.1, z: 0.86, pad: 0.34 }],
    pads: [{ x: -1.0, z: 0.1, pad: 0.3 }, { x: 0.95, z: -0.62, pad: 0.26 }, { x: -0.35, z: -0.72, pad: 0.3 }, { x: 0.6, z: 0.82, pad: 0.22 }],
  },
  narrow: {
    phone: { x: -0.18, z: 0.72, pad: 0.6 },
    lap: { x: 0.18, z: -0.4, pad: 1.3 },
    lilies: [{ x: 0.78, z: 0.5, pad: 0.4 }, { x: -0.8, z: -0.3, pad: 0.34 }],
    pads: [{ x: 0.85, z: -0.5, pad: 0.26 }, { x: -0.85, z: 0.35, pad: 0.24 }],
  },
}
/** a pad's origin sits so its underside (0.09 deep per model unit) clears the mirror — it floats ON the water, not through it */
export const padBaseY = (pad: number) => WATER_Y + 0.004 + (0.09 / 1.9) * pad + 0.006
/** y of a device base resting on a pad of width `pad` */
export const padTopY = (pad: number) => padBaseY(pad) + PAD_TOP * pad

function Pond() {
  const { scene } = useGLTF(POND_URL)
  const root = useMemo(() => {
    const r = scene.clone(true)
    r.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const src = m.material as THREE.MeshStandardMaterial; m.material = new THREE.MeshStandardMaterial({ map: src.map ?? null, roughness: 0.92, metalness: 0 }) })
    return r
  }, [scene])
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const el = ref.current; if (el) el.position.y = Math.sin(clock.elapsedTime * 0.35) * 0.012 })
  return <group ref={ref}><primitive object={root} scale={POND_SC} /></group>
}

function Pad({ x, z, width, seed, children }: { x: number; z: number; width: number; seed: number; children?: React.ReactNode }) {
  const { scene } = useGLTF(PAD_URL)
  const root = useMemo(() => {
    const r = scene.clone(true)
    r.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const src = m.material as THREE.MeshStandardMaterial; m.material = new THREE.MeshStandardMaterial({ map: src.map ?? null, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }) })
    return r
  }, [scene])
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const el = ref.current; if (!el) return
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

/** the mirror on the water, with ripples spreading from the pointer */
function Water() {
  const [ripples, setRipples] = useState<{ id: number; x: number; z: number; t0: number }[]>([])
  const last = useRef(0)
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const now = performance.now()
    if (now - last.current < 160) return
    last.current = now
    setRipples((r) => [...r.slice(-7), { id: now, x: e.point.x, z: e.point.z, t0: now }])
  }
  const ringRefs = useRef<Map<number, THREE.Mesh>>(new Map())
  useFrame(() => {
    const now = performance.now()
    ringRefs.current.forEach((m, id) => {
      const r = ripples.find((p) => p.id === id); if (!r) return
      const k = (now - r.t0) / 1800
      m.scale.setScalar(0.08 + k * 0.9)
      ;(m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.5 * (1 - k))
    })
    if (ripples.length && now - ripples[0].t0 > 1900) setRipples((r) => r.filter((p) => now - p.t0 <= 1900))
  })
  return (
    <group position={[0, WATER_Y + 0.004, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerMove={onMove}>
        <circleGeometry args={[WATER_R, 64]} />
        {/* crystalline: a pale turquoise that lets the pond's floor show through, sharp reflections */}
        <MeshReflectorMaterial blur={[90, 30]} resolution={1024} mixBlur={0.5} mixStrength={1.1} roughness={0.35} depthScale={0.4} minDepthThreshold={0.6} maxDepthThreshold={1.4} color="#9fe0e4" metalness={0.25} mirror={0.6} transparent opacity={0.78} />
      </mesh>
      {ripples.map((r) => (
        <mesh key={r.id} ref={(el) => { if (el) ringRefs.current.set(r.id, el); else ringRefs.current.delete(r.id) }} position={[r.x, 0.002, r.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.92, 1, 48]} />
          <meshBasicMaterial color="#f6e7ef" transparent opacity={0.5} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
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
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({ a: i * 2.4, r: 0.5 + (i % 5) * 0.22, h: 0.12 + (i % 4) * 0.1, sp: 0.15 + (i % 3) * 0.07, ph: i * 1.3, tint: i % 3 === 0 ? '#ffd9a8' : i % 3 === 1 ? '#c8ffe6' : '#ffc6d9' })), [n])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((sp, i) => {
      if (!sp) return
      const s = seeds[i]
      sp.position.set(Math.cos(s.a + t * s.sp) * s.r, WATER_Y + s.h + Math.sin(t * 1.1 + s.ph) * 0.06, Math.sin(s.a + t * s.sp * 0.8) * s.r)
      sp.material.opacity = 0.55 + Math.sin(t * 2.2 + s.ph) * 0.4
    })
  })
  return (
    <>
      {seeds.map((s, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} scale={[0.07, 0.07, 1]}>
          <spriteMaterial map={tex} color={s.tint} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  )
}

/** low mist lying on the water near the rim */
function Mist() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(128, 64, 8, 128, 64, 120); r.addColorStop(0, 'rgba(225,215,245,.35)'); r.addColorStop(0.6, 'rgba(225,215,245,.12)'); r.addColorStop(1, 'rgba(225,215,245,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  const spots: [number, number, number][] = [[-0.9, 0.05, 0.7], [0.9, 0.04, 0.5], [0.2, 0.06, -0.95], [-0.5, 0.05, -0.8]]
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => { const t = clock.elapsedTime; refs.current.forEach((sp, i) => { if (sp) sp.position.x = spots[i][0] + Math.sin(t * 0.12 + i) * 0.15 }) })
  return (
    <>
      {spots.map((p, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} position={[p[0], WATER_Y + p[1], p[2]]} scale={[1.4, 0.5, 1]}>
          <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
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
      <Pond />
      <Water />
      {/* the devices' pads (the devices themselves are placed by Devices.tsx at padTopY) */}
      <Pad x={L.phone.x} z={L.phone.z} width={L.phone.pad} seed={0.4} />
      <Pad x={L.lap.x} z={L.lap.z} width={L.lap.pad} seed={2.2} />
      {/* empty pads drifting around */}
      {L.pads.map((p, i) => <Pad key={`e${i}`} x={p.x} z={p.z} width={p.pad} seed={5.2 + i * 0.9} />)}
      {/* small pads with Ana's lilies */}
      {L.lilies.map((p, i) => (
        <Pad key={i} x={p.x} z={p.z} width={p.pad} seed={3.1 + i}>
          <GlbProp url={LILIES_URL} x={0} z={0} top={PAD_TOP * p.pad} height={narrow ? 0.3 : 0.36 - i * 0.06} rotation={[0, 0.6 + i, 0]} />
        </Pad>
      ))}
      <Fireflies n={narrow ? 12 : 18} />
      <Mist />
      <group position={[0, WATER_Y, 0]}><Floaters narrow={narrow} /></group>
    </group>
  )
}
