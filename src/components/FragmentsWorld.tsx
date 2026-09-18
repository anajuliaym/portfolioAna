import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import { shots, SHOT_URLS } from '../pages/fragments'

/**
 * "The garden of memory": the Fragments page's living backdrop, in the style of the game's title
 * screen — pastel sky, drifting clouds, a green hill with a lily — where a plant grows from seed
 * to tree as the visitor scrolls the whole page, and the game's screens float in as memory
 * fragments, one phase at a time. Fixed behind the page (portal to <body>); the content sits on
 * paper panels in front of it. The plant and hill use the site's painted shader; the fragments
 * stay crisp (unlit). On wide screens the garden lives to the right of the text column.
 */

const PAINT = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.12, rimStrength: 0.45, keyColor: '#f6e2c6' }

type Shared = { p: number; mx: number; my: number; side: number }

/* ---------------------------------------------------------------- textures */

function gradientTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#7fb4d6'); g.addColorStop(0.45, '#bcdcea'); g.addColorStop(0.72, '#e7ecdf'); g.addColorStop(1, '#f6ead3')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function cloudTexture(seed: number) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128
  const ctx = c.getContext('2d')!
  let s = seed >>> 0
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  ctx.filter = 'blur(6px)'
  for (let i = 0; i < 9; i++) {
    const x = 40 + r() * 176, y = 50 + r() * 40, rx = 22 + r() * 40, ry = 14 + r() * 22
    ctx.fillStyle = `rgba(255, 250, 240, ${0.55 + r() * 0.4})`
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.filter = 'none'
  ctx.globalCompositeOperation = 'source-atop'
  const g = ctx.createLinearGradient(0, 20, 0, 128); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(200,214,224,.9)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

/* ---------------------------------------------------------------- scene bits */

function Sky() {
  const tex = useMemo(gradientTexture, [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh scale={[80, 80, 80]}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} fog={false} />
    </mesh>
  )
}

function Clouds({ shared }: { shared: Shared }) {
  const group = useRef<THREE.Group>(null)
  const items = useMemo(() => {
    let s = 11; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    return Array.from({ length: 14 }, (_, i) => ({
      tex: cloudTexture(i * 7 + 3),
      x: -22 + r() * 44, y: -3 + r() * 9, z: -18 - r() * 16, w: 7 + r() * 9, speed: 0.08 + r() * 0.12, phase: r() * 10, op: 0.65 + r() * 0.35,
    }))
  }, [])
  useEffect(() => () => items.forEach((c) => c.tex.dispose()), [items])
  useFrame(({ clock }) => {
    const g = group.current; if (!g) return
    const t = clock.elapsedTime
    g.children.forEach((m, i) => {
      const c = items[i]
      m.position.x = ((c.x + t * c.speed + 30) % 60) - 30
      m.position.y = c.y + Math.sin(t * 0.3 + c.phase) * 0.15 + shared.p * 1.2
    })
    g.position.x = THREE.MathUtils.damp(g.position.x, shared.mx * 0.8, 2, 1 / 60)
  })
  return (
    <group ref={group}>
      {items.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]}>
          <planeGeometry args={[c.w, c.w * 0.5]} />
          <meshBasicMaterial map={c.tex} transparent opacity={c.op} depthWrite={false} toneMapped={false} fog={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Hill, lily and the growing plant, all built from primitives and painted with the site's shader. */
function Garden({ shared }: { shared: Shared }) {
  const parts = useRef<{ stem: THREE.Mesh; leaves: THREE.Group[]; flower: THREE.Group; canopy: THREE.Group; seed: THREE.Mesh; plant: THREE.Group; lily: THREE.Group } | null>(null)
  const group = useMemo(() => {
    const g = new THREE.Group()
    const mat = (color: string) => new THREE.MeshStandardMaterial({ color })
    const mk = (geo: THREE.BufferGeometry, color: string) => { const m = new THREE.Mesh(geo, mat(color)); m.userData.color = color; return m }
    const hill = mk(new THREE.SphereGeometry(7.5, 40, 28), '#8fbf7a'); hill.position.set(0.6, -7.55, 0); hill.scale.set(2.2, 1, 1.5); g.add(hill)
    const hill2 = mk(new THREE.SphereGeometry(5, 32, 20), '#7fb06c'); hill2.position.set(-6, -5.6, -3); hill2.scale.set(1.6, 1, 1.3); g.add(hill2)
    // the lily from the title screen
    const lily = new THREE.Group(); lily.position.set(3.1, -0.15, 0.6)
    const lstem = mk(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8), '#5f9a5a'); lstem.position.y = 0.8; lily.add(lstem)
    for (let i = 0; i < 6; i++) {
      const petal = mk(new THREE.SphereGeometry(0.34, 14, 10), '#f2a0b4'); petal.scale.set(0.42, 1, 0.16)
      petal.position.set(Math.cos((i / 6) * Math.PI * 2) * 0.32, 1.85, Math.sin((i / 6) * Math.PI * 2) * 0.32)
      petal.lookAt(petal.position.clone().multiplyScalar(2).setY(2.6)); lily.add(petal)
    }
    const pistil = mk(new THREE.SphereGeometry(0.13, 10, 8), '#f6dc9a'); pistil.position.y = 1.78; lily.add(pistil)
    for (let i = 0; i < 3; i++) { const leaf = mk(new THREE.SphereGeometry(0.42, 12, 8), '#6faa62'); leaf.scale.set(1, 0.18, 0.4); leaf.position.set(-0.5 + i * 0.5, 0.35 + i * 0.25, 0.1 * i); leaf.rotation.z = 0.5 - i * 0.5; lily.add(leaf) }
    g.add(lily)
    // the growing plant
    const plant = new THREE.Group(); plant.position.set(-0.4, -0.05, 0.4); g.add(plant)
    const seed = mk(new THREE.SphereGeometry(0.22, 12, 10), '#8a6a52'); seed.scale.set(1, 0.7, 0.8); seed.position.y = 0.05; plant.add(seed)
    const stemGeo = new THREE.CylinderGeometry(0.05, 0.11, 1, 10); stemGeo.translate(0, 0.5, 0)
    const stem = mk(stemGeo, '#6fa86a'); plant.add(stem)
    const leaves: THREE.Group[] = []
    const heights = [0.22, 0.36, 0.5, 0.63, 0.75, 0.86]
    heights.forEach((h, i) => {
      const lg = new THREE.Group(); lg.userData.h = h
      const side = i % 2 ? 1 : -1
      const leaf = mk(new THREE.SphereGeometry(0.38, 14, 10), i % 2 ? '#8fc47c' : '#7db86e'); leaf.scale.set(1, 0.22, 0.5); leaf.position.x = side * 0.36
      leaf.rotation.z = side * 0.55; lg.add(leaf); lg.rotation.y = i * 0.9; lg.scale.setScalar(0); plant.add(lg); leaves.push(lg)
    })
    const flower = new THREE.Group()
    for (let i = 0; i < 7; i++) {
      const petal = mk(new THREE.SphereGeometry(0.3, 14, 10), '#f4b8cb'); petal.scale.set(0.45, 1, 0.16)
      const a = (i / 7) * Math.PI * 2
      petal.position.set(Math.cos(a) * 0.26, 0.05, Math.sin(a) * 0.26)
      petal.lookAt(new THREE.Vector3(Math.cos(a) * 2, 0.9, Math.sin(a) * 2)); flower.add(petal)
    }
    const center = mk(new THREE.SphereGeometry(0.12, 10, 8), '#f6dc9a'); flower.add(center)
    flower.scale.setScalar(0); plant.add(flower)
    const canopy = new THREE.Group()
    const balls: [number, number, number, number][] = [[0, 0.3, 0, 0.9], [-0.6, 0.05, 0.2, 0.62], [0.62, 0.1, -0.1, 0.66], [0.1, 0.05, 0.6, 0.55], [-0.15, 0.1, -0.6, 0.55], [0.05, 0.85, 0.05, 0.5]]
    balls.forEach(([x, y, z, r], i) => { const b = mk(new THREE.SphereGeometry(r, 16, 12), i % 2 ? '#7fb56e' : '#93c283'); b.position.set(x, y, z); canopy.add(b) })
    for (let i = 0; i < 5; i++) { const dot = mk(new THREE.SphereGeometry(0.07, 8, 6), '#f4b8cb'); dot.position.set(Math.cos(i * 1.3) * 0.7, 0.2 + Math.sin(i * 2.1) * 0.5, Math.sin(i * 1.3) * 0.7); canopy.add(dot) }
    canopy.scale.setScalar(0); plant.add(canopy)
    parts.current = { stem, leaves, flower, canopy, seed, plant, lily }
    return g
  }, [])
  usePainterly(group, PAINT)
  useOutline(group, 0.0024, '#120d12')
  // the painted shader has no per-mesh colour: hand each material its base colour
  useEffect(() => {
    group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.isHull) return
      const sm = m.material as THREE.ShaderMaterial
      if (sm.uniforms?.baseColor && m.userData.color) sm.uniforms.baseColor.value.set(m.userData.color)
    })
  })
  useFrame((_, dt) => {
    const P = parts.current; if (!P) return
    const g = shared.p
    // on wide screens the plant stands to the right of the text column
    P.plant.position.x = THREE.MathUtils.damp(P.plant.position.x, -0.4 + shared.side, 3, dt)
    P.lily.position.x = THREE.MathUtils.damp(P.lily.position.x, 3.1 + shared.side * 0.6, 3, dt)
    const grow = THREE.MathUtils.smoothstep(g, 0.04, 0.9)
    const H = 0.15 + grow * 3.1
    const trunk = 1 + THREE.MathUtils.smoothstep(g, 0.78, 1) * 1.6
    P.stem.scale.set(trunk, H, trunk)
    P.seed.scale.setScalar(Math.max(0, 1 - g * 6))
    P.leaves.forEach((lg) => {
      const h = lg.userData.h as number
      const target = THREE.MathUtils.smoothstep(H, h * 3.25 - 0.1, h * 3.25 + 0.35)
      const s = THREE.MathUtils.damp(lg.scale.x, target * (1 + trunk * 0.25), 6, dt)
      lg.scale.setScalar(Math.max(0.0001, s)); lg.position.y = h * H
    })
    const bloom = THREE.MathUtils.smoothstep(g, 0.56, 0.72) * (1 - THREE.MathUtils.smoothstep(g, 0.84, 0.95))
    const fs = THREE.MathUtils.damp(P.flower.scale.x, bloom, 6, dt); P.flower.scale.setScalar(Math.max(0.0001, fs)); P.flower.position.y = H + 0.05
    const cs = THREE.MathUtils.damp(P.canopy.scale.x, THREE.MathUtils.smoothstep(g, 0.82, 0.97), 5, dt); P.canopy.scale.setScalar(Math.max(0.0001, cs)); P.canopy.position.y = H - 0.2
    group.rotation.z = Math.sin(performance.now() * 0.0006) * 0.01
  })
  return <primitive object={group} />
}

/** Events come from <body>: only count them when the pointer is really over the canvas, not over a paper panel. */
const onCanvas = (e: Event) => (e.target as HTMLElement | null)?.tagName === 'CANVAS'

/** One memory fragment: a polaroid in 3D. Unlit so the pixel art stays crisp. */
function Fragment({ id, target, pos, tilt, onOpen, shared }: { id: string; target: number; pos: [number, number, number]; tilt: number; onOpen: () => void; shared: Shared }) {
  const tex = useTexture(SHOT_URLS[id])
  useEffect(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true }, [tex])
  const g = useRef<THREE.Group>(null)
  const vis = useRef(0)
  const [hover, setHover] = useState(false)
  const paper = useRef<THREE.MeshBasicMaterial>(null)
  const pic = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }, dt) => {
    const o = g.current; if (!o) return
    vis.current = THREE.MathUtils.damp(vis.current, target, 2.6, dt)
    const v = vis.current
    const t = clock.elapsedTime
    // wide screens: gather the fragments on the garden's side, clear of the text column
    const x = pos[0] * (shared.side ? 0.6 : 1) + shared.side
    o.position.set(x + (1 - v) * pos[0] * 0.8, pos[1] + (1 - v) * 1.6 + Math.sin(t * 0.7 + pos[0]) * 0.06, pos[2] - (1 - v) * 3)
    o.rotation.set(Math.sin(t * 0.5 + pos[1]) * 0.03, tilt + (1 - v) * 0.6, Math.sin(t * 0.4 + pos[2]) * 0.02)
    const s = THREE.MathUtils.damp(o.scale.x, (hover ? 1.1 : 1) * (0.2 + v * 0.8), 8, dt)
    o.scale.setScalar(Math.max(0.0001, s))
    o.visible = v > 0.02
    if (paper.current) paper.current.opacity = v
    if (pic.current) pic.current.opacity = v
  })
  return (
    <group ref={g} position={pos}>
      <mesh position={[0, -0.06, -0.012]}>
        <planeGeometry args={[1.72, 1.16]} />
        <meshBasicMaterial ref={paper} color={hover ? '#fbf3e3' : '#efe4cd'} transparent toneMapped={false} />
      </mesh>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); if (!onCanvas(e.nativeEvent)) return; setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
        onClick={(e) => { e.stopPropagation(); if (vis.current > 0.6 && onCanvas(e.nativeEvent)) onOpen() }}
      >
        <planeGeometry args={[1.6, 0.9]} />
        <meshBasicMaterial ref={pic} map={tex} transparent toneMapped={false} />
      </mesh>
      {hover && <pointLight position={[0, 0, 0.8]} color="#ffd9a8" intensity={4} distance={4} decay={2} />}
    </group>
  )
}

const LAYOUT: Record<string, { pos: [number, number, number]; tilt: number; step: number }> = {
  '01-titulo': { pos: [-0.6, 4.4, -3.5], tilt: 0.05, step: 0 },
  '02-semente-quarto': { pos: [-2.6, 1.0, 0.6], tilt: 0.28, step: 1 },
  '03-planta-mae': { pos: [2.5, 1.9, 0.2], tilt: -0.26, step: 2 },
  '04-planta-caixotes': { pos: [-2.9, 2.5, -0.4], tilt: 0.3, step: 2 },
  '05-flor-email': { pos: [2.7, 3.2, -0.2], tilt: -0.3, step: 3 },
  '06-flor-popup': { pos: [-2.5, 3.9, 0.1], tilt: 0.24, step: 3 },
  '07-arvore-carro': { pos: [2.6, 4.7, -0.6], tilt: -0.28, step: 4 },
  '08-arvore-gps': { pos: [-2.7, 5.4, -0.8], tilt: 0.26, step: 4 },
}

function Rig({ shared }: { shared: Shared }) {
  const { camera, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(0, 1.2, 0), [])
  useFrame((_, dt) => {
    const p = shared.p
    // wide screens: the garden lives to the right of the text column
    shared.side = size.width > 1000 ? 2.4 : size.width > 720 ? 1.2 : 0
    // the camera rises and backs away as the plant grows into a tree; narrow screens stand further back
    const narrow = size.width < 720 ? 1.6 : 0
    const ty = 1.5 + p * 1.9 + shared.my * 0.25
    const tx = shared.side * 0.55 + shared.mx * 0.5
    const tz = 7.4 + p * 2.8 + narrow
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 3, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, 3, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, 3, dt)
    look.x = THREE.MathUtils.damp(look.x, shared.side * 0.85, 3, dt)
    look.y = THREE.MathUtils.damp(look.y, 1.0 + p * 1.8, 3, dt)
    camera.lookAt(look)
  })
  return null
}

function Scene({ shared, step, onOpen }: { shared: Shared; step: number; onOpen: (id: string) => void }) {
  return (
    <>
      <color attach="background" args={['#bcdcea']} />
      <fog attach="fog" args={['#dfe9ea', 14, 40]} />
      <hemisphereLight color="#e6f3fb" groundColor="#6f9a63" intensity={0.9} />
      <directionalLight position={[4, 7, 3]} color="#ffe3bd" intensity={1.5} />
      <Sky />
      <Clouds shared={shared} />
      <Garden shared={shared} />
      {shots.map((s) => {
        const L = LAYOUT[s.id]
        return <Fragment key={s.id} id={s.id} pos={L.pos} tilt={L.tilt} target={step >= L.step ? 1 : 0} onOpen={() => onOpen(s.id)} shared={shared} />
      })}
      <Rig shared={shared} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.3} luminanceThreshold={0.88} luminanceSmoothing={0.3} mipmapBlur />
      </EffectComposer>
    </>
  )
}

/* ---------------------------------------------------------------- backdrop */

/**
 * Fixed behind the whole page. `step` (0 = intro … 4 = last phase) comes from the page: which
 * phase card has scrolled past the middle of the screen. `paused` stops rendering while the game
 * runs, so the two never fight for the GPU. Progress = how far down the page the visitor is.
 */
export default function FragmentsBackdrop({ step, paused, onOpen }: { step: number; paused: boolean; onOpen: (id: string) => void }) {
  const shared = useRef<Shared>({ p: 0, mx: 0, my: 0, side: 0 }).current
  useEffect(() => {
    const onScroll = () => {
      const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      shared.p = THREE.MathUtils.clamp(window.scrollY / total, 0, 1)
    }
    const onMove = (e: PointerEvent) => { shared.mx = e.clientX / window.innerWidth - 0.5; shared.my = -(e.clientY / window.innerHeight - 0.5) }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); window.removeEventListener('pointermove', onMove) }
  }, [shared])
  return createPortal(
    <div className="frag-backdrop" aria-hidden>
      <Canvas camera={{ position: [0, 1.6, 7.6], fov: 36 }} dpr={[1, 1.25]} frameloop={paused ? 'never' : 'always'} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} eventSource={document.body} eventPrefix="client">
        <Suspense fallback={null}>
          <Scene shared={shared} step={step} onOpen={onOpen} />
        </Suspense>
      </Canvas>
    </div>,
    document.body,
  )
}

shots.forEach((s) => useTexture.preload(SHOT_URLS[s.id]))
