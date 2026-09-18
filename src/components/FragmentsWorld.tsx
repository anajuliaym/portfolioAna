import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Kuwahara } from './Kuwahara'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'

/**
 * "The garden of memory": the Fragments page's living backdrop, in the style of the game's title
 * screen — pastel sky, drifting clouds, a green hill with a lily — where a plant grows from seed
 * to tree as the visitor scrolls the phase cards. Fixed behind the page (portal to <body>); the
 * content sits on paper panels in front of it. Everything painted with the site's shader plus a
 * Kuwahara pass. On wide screens the plant stands to the right of the text column.
 */

// bolder than the hero: fewer, wobblier light bands and big visible brush dabs
const PAINT = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.26, patch: 0.32, patchScale: 9, spec: 0.22, rimStrength: 0.55, keyColor: '#f6e2c6' }
// terrain gets even larger strokes, like a gouache hill
const TERRAIN = { patch: 0.4, patchScale: 3.2, paint: 0.34 }

type Shared = { p: number; g: number; step: number; mx: number; my: number; side: number }

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

function sunTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, 'rgba(255, 244, 214, 1)'); g.addColorStop(0.25, 'rgba(255, 232, 190, .7)'); g.addColorStop(1, 'rgba(255, 220, 170, 0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function Sun() {
  const tex = useMemo(sunTexture, [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh position={[-14, 11, -28]}>
      <planeGeometry args={[22, 22]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
    </mesh>
  )
}

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
      x: -22 + r() * 44, y: -1 + r() * 8, z: -18 - r() * 16, w: 7 + r() * 9, speed: 0.08 + r() * 0.12, phase: r() * 10, op: 0.65 + r() * 0.35,
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
  const parts = useRef<{ stem: THREE.Mesh; leaves: THREE.Group[]; flower: THREE.Group; canopy: THREE.Group; seed: THREE.Mesh; plant: THREE.Group; lily: THREE.Group; petals: THREE.Group } | null>(null)
  const group = useMemo(() => {
    const g = new THREE.Group()
    const mat = (color: string) => new THREE.MeshStandardMaterial({ color })
    const mk = (geo: THREE.BufferGeometry, color: string) => { const m = new THREE.Mesh(geo, mat(color)); m.userData.color = color; return m }
    const hill = mk(new THREE.SphereGeometry(7.5, 40, 28), '#8fbf7a'); hill.position.set(0.6, -7.55, 0); hill.scale.set(2.2, 1, 1.5); hill.userData.terrain = true; g.add(hill)
    const hill2 = mk(new THREE.SphereGeometry(5, 32, 20), '#7fb06c'); hill2.position.set(-6, -5.6, -3); hill2.scale.set(1.6, 1, 1.3); hill2.userData.terrain = true; g.add(hill2)
    // the lily from the title screen
    const lily = new THREE.Group(); lily.position.set(5.4, -0.5, -1.6); lily.scale.setScalar(0.85)
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
    const plant = new THREE.Group(); plant.position.set(3.1, -0.15, 0.6); g.add(plant)
    const seed = mk(new THREE.SphereGeometry(0.13, 12, 10), '#8a6a52'); seed.scale.set(1, 0.7, 0.8); seed.position.y = 0.02; plant.add(seed)
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

    // --- the rest of the garden, so wide screens are not bare
    let rs = 5; const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296 }
    // height of the main hill's surface at (x, z)
    const hillY = (x: number, z: number) => { const nx = (x - 0.6) / (7.5 * 2.2), nz = z / (7.5 * 1.5); const t = 1 - nx * nx - nz * nz; return t > 0 ? -7.55 + 7.5 * Math.sqrt(t) : -10 }
    // far hills
    const far1 = mk(new THREE.SphereGeometry(9, 32, 20), '#9ccb8b'); far1.position.set(12, -8.6, -14); far1.scale.set(1.8, 0.7, 1); far1.userData.terrain = true; g.add(far1)
    const far2 = mk(new THREE.SphereGeometry(8, 32, 20), '#a7d094'); far2.position.set(-13, -8.2, -16); far2.scale.set(1.9, 0.6, 1); far2.userData.terrain = true; g.add(far2)
    // bushes on the back hill
    for (let i = 0; i < 6; i++) {
      const bx = -9 + rnd() * 20, bz = -3.5 - rnd() * 2
      const by = hillY(bx, bz); if (by < -9) continue
      for (let k = 0; k < 3; k++) { const b = mk(new THREE.SphereGeometry(0.45 + rnd() * 0.35, 12, 9), k ? '#7fb56e' : '#93c283'); b.position.set(bx + (rnd() - 0.5) * 0.9, by + 0.15 + rnd() * 0.2, bz + (rnd() - 0.5) * 0.6); b.scale.y = 0.8; g.add(b) }
    }
    // a field of small flowers (instanced): stems + heads with their own pastel colours
    const palette = ['#f4b8cb', '#f6dc9a', '#cfbfea', '#fbe7ee', '#f2a0b4', '#ffe7c2']
    const N = 70
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.022, 1, 5).translate(0, 0.5, 0), mat('#6faa62'), N); stems.userData.color = '#6faa62'
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), mat('#ffffff'), N); heads.userData.color = '#ffffff'
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), C = new THREE.Color()
    let placed = 0
    for (let tries = 0; tries < N * 4 && placed < N; tries++) {
      const x = -10 + rnd() * 22, z = -3.2 + rnd() * 5.2
      if (Math.abs(x - 3.1) < 1.4 && Math.abs(z - 0.6) < 1.4) continue // leave room for the growing plant
      const y = hillY(x, z); if (y < -9) continue
      const h = 0.14 + rnd() * 0.26
      P.set(x, y - 0.02, z); S.set(1, h, 1); M.compose(P, Q, S); stems.setMatrixAt(placed, M)
      P.set(x, y - 0.02 + h, z); S.set(1, 0.7, 1); M.compose(P, Q, S); heads.setMatrixAt(placed, M)
      heads.setColorAt(placed, C.set(palette[(rnd() * palette.length) | 0]))
      placed++
    }
    stems.count = heads.count = placed
    g.add(stems); g.add(heads)
    // grass tufts (instanced cones), swaying via the painted shader's wind
    const GN = 220
    const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.24, 5).translate(0, 0.11, 0), mat('#7fb56e'), GN); grass.userData.color = '#7fb56e'; grass.userData.sway = 0.04
    let gp = 0
    for (let tries = 0; tries < GN * 3 && gp < GN; tries++) {
      const x = -11 + rnd() * 24, z = -3.6 + rnd() * 6.4
      if (Math.abs(x - 3.1) < 0.8 && Math.abs(z - 0.6) < 0.8) continue
      const y = hillY(x, z); if (y < -9) continue
      P.set(x, y - 0.03, z); Q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.6, rnd() * Math.PI, (rnd() - 0.5) * 0.6)); S.set(0.9 + rnd() * 0.8, 0.6 + rnd() * 0.7, 0.9 + rnd() * 0.8)
      M.compose(P, Q, S); grass.setMatrixAt(gp, M); gp++
    }
    grass.count = gp; Q.identity(); g.add(grass)
    // big leaves in the foreground, framing the picture from below
    const fg = new THREE.Group(); fg.name = 'foreground'
    const fl1 = mk(new THREE.SphereGeometry(1, 18, 12), '#5f9a5a'); fl1.scale.set(2.6, 0.5, 1.1); fl1.position.set(-4.2, -0.9, 4.6); fl1.rotation.set(0.2, 0.3, 0.35); fg.add(fl1)
    const fl2 = mk(new THREE.SphereGeometry(1, 18, 12), '#6faa62'); fl2.scale.set(2.2, 0.45, 1); fl2.position.set(4.8, -1.1, 4.8); fl2.rotation.set(0.15, -0.4, -0.3); fg.add(fl2)
    g.add(fg)
    // petals drifting in the air
    const petals = new THREE.Group(); petals.name = 'petals'
    for (let i = 0; i < 18; i++) {
      const pt = mk(new THREE.SphereGeometry(0.06, 8, 6), i % 3 ? '#f4b8cb' : '#fbe7ee'); pt.scale.set(1.3, 0.35, 0.8)
      pt.position.set(-8 + rnd() * 16, 0.6 + rnd() * 4.5, -6 + rnd() * 5); pt.userData.seed = rnd() * 10; petals.add(pt)
    }
    g.add(petals)
    parts.current = { stem, leaves, flower, canopy, seed, plant, lily, petals }
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
      if (sm.uniforms?.sway && m.userData.sway) sm.uniforms.sway.value = m.userData.sway
      if (m.userData.terrain && sm.uniforms?.patchAmt) { sm.uniforms.patchAmt.value = TERRAIN.patch; sm.uniforms.patchScale.value = TERRAIN.patchScale; sm.uniforms.paint.value = TERRAIN.paint }
    })
  })
  useFrame((_, dt) => {
    const P = parts.current; if (!P) return
    // growth target per phase card: sprout, plant, flower, tree — eased so it grows before your eyes
    const goal = [0.02, 0.3, 0.52, 0.68, 1][Math.min(4, shared.step)]
    shared.g = THREE.MathUtils.damp(shared.g, goal, 1.1, dt)
    const g = shared.g
    // on wide screens the plant stands to the right of the text column
    P.plant.position.x = THREE.MathUtils.damp(P.plant.position.x, 3.1 + shared.side, 3, dt)
    P.lily.position.x = THREE.MathUtils.damp(P.lily.position.x, 5.4 + shared.side * 0.5, 3, dt)
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
    const t = performance.now() * 0.001
    P.petals.children.forEach((pt, i) => {
      const k = pt.userData.seed as number
      pt.position.x += Math.sin(t * 0.4 + k) * 0.004 + 0.003
      pt.position.y += Math.cos(t * 0.6 + k * 1.7) * 0.003
      if (pt.position.x > 9) pt.position.x = -9
      pt.rotation.set(Math.sin(t * 0.7 + k) * 0.8, t * 0.3 + i, Math.cos(t * 0.5 + k) * 0.6)
    })
    group.rotation.z = Math.sin(t * 0.6) * 0.008
  })
  return <primitive object={group} />
}

function Rig({ shared }: { shared: Shared }) {
  const { camera, size } = useThree()
  const look = useMemo(() => new THREE.Vector3(0, 1.2, 0), [])
  useFrame((_, dt) => {
    const p = shared.g // the camera follows the plant, not the scrollbar
    // the plant stands at x = 3.1 + side: to the right of the text column on wide screens, centred on phones
    shared.side = size.width > 1000 ? 0 : size.width > 720 ? -0.8 : -3.1
    const lookX = size.width > 1000 ? 0.7 : size.width > 720 ? 0.9 : 0
    // the camera rises and backs away as the plant grows into a tree; narrow screens stand further back
    const narrow = size.width < 720 ? 1.6 : 0
    const ty = 1.9 + p * 1.9 + shared.my * 0.25
    const tx = lookX * 0.7 + shared.mx * 0.5
    const tz = 7.4 + p * 2.8 + narrow
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 3, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, 3, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, 3, dt)
    look.x = THREE.MathUtils.damp(look.x, lookX, 3, dt)
    look.y = THREE.MathUtils.damp(look.y, 0.8 + p * 1.9, 3, dt)
    camera.lookAt(look)
  })
  return null
}

function Scene({ shared }: { shared: Shared }) {
  return (
    <>
      <color attach="background" args={['#bcdcea']} />
      <fog attach="fog" args={['#dfe9ea', 14, 40]} />
      <hemisphereLight color="#e6f3fb" groundColor="#6f9a63" intensity={0.9} />
      <directionalLight position={[4, 7, 3]} color="#ffe3bd" intensity={1.5} />
      <Sky />
      <Sun />
      <Clouds shared={shared} />
      <Garden shared={shared} />
      <Rig shared={shared} />
      <EffectComposer multisampling={0}>
        <Kuwahara radius={2} />
        <Bloom intensity={0.3} luminanceThreshold={0.88} luminanceSmoothing={0.3} mipmapBlur />
      </EffectComposer>
    </>
  )
}

/* ---------------------------------------------------------------- backdrop */

/**
 * Fixed behind the whole page. `step` (0 = intro … 4 = last phase) comes from the page: which
 * phase card has scrolled past the middle of the screen; it drives the plant's growth. `paused` stops rendering while the game
 * runs, so the two never fight for the GPU. Progress = how far down the page the visitor is.
 */
export default function FragmentsBackdrop({ step, paused }: { step: number; paused: boolean }) {
  const shared = useRef<Shared>({ p: 0, g: 0, step: 0, mx: 0, my: 0, side: 0 }).current
  shared.step = step
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
      <Canvas camera={{ position: [0, 1.6, 7.6], fov: 36 }} dpr={[1, 1.25]} frameloop={paused ? 'never' : 'always'} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <Suspense fallback={null}>
          <Scene shared={shared} />
        </Suspense>
      </Canvas>
    </div>,
    document.body,
  )
}
