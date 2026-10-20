import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Html, Lightformer, useGLTF } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { useOutline } from './Outline'
import { logoGeometry, logoMaterial } from './SkillLogos'
import { useI18n } from '../i18n'
import type { Tool } from '../pages/content'
import lilyArt from '../assets/card/lily.webp'

/**
 * Skills = a claw machine full of Ana's 3D logos (2026-10-20: she picked "máquina de pelúcia" and sent
 * `claw_machine_with_textures.glb`, "mas dá uma mudada no visual exterior"). The model is Sketchfab's, stripped of
 * its plushies and of its texture atlas (third-party characters, a "STAR CATCHER" sign) by `scripts/prep-claw.mjs`;
 * every part is recoloured here in her palette (sage cabinet, cream frame, pink table, teal rails), with a sign
 * "Skills" on the top plate and her lily drawing on the side.
 *
 * Everything below works in the model's own units (cm; cabinet x −102…103, y −85…165, front at z ≈ 100).
 * The claw follows the pointer over the pit; a click (or Space) drops it; it grabs the logo underneath, carries it to
 * the chute (front-left) and the logo pops out of the prize door with its paper tag. A tiny sphere physics (no
 * library) keeps the logos piled, tumbling and occasionally slipping out of the claw.
 */

const MACHINE_URL = '/models/claw.glb'
const SCALE = 0.01
const R = 18 // logo collision radius (cm)
const FLOOR = -1.8 // pit floor
const PIT = { x0: -86, x1: 86, z0: -84, z1: 92 }
const CHUTE = { x0: -87.8, x1: -22.6, z0: 50.1, z1: 96.3, top: 35.4 }
const CHUTE_DROP = { x: -55, z: 73 }
const DOOR = new THREE.Vector3(-47.8, -48, 150) // in front of the prize door
const CLAW0 = { x: 18.2, z: 8.2, bottom: 85.4 }
const RAIL = { x0: -70, x1: 72, z0: -70, z1: 82 }
const PIPE = { top: 133.3, bottom: 102.4 }
const G = -980

const COLORS: [RegExp, string, ('plastic' | 'chrome' | 'felt')?][] = [
  [/^box_low/, '#a9c79f'], [/^frame_low/, '#f3ebdc'], [/^rails_low_boxblue2/, '#3f6b6a'], [/^rails_low_boxsilver/, '#e4e7ee', 'chrome'],
  [/^clawbox_low/, '#4f7f7b'], [/^wall_low/, '#efe6d6'], [/^table1_low_boxpink1/, '#f2a0b4'], [/^table1_low_boxpink2/, '#f7d2db'],
  [/^table2_low/, '#94b48b'], [/^plate_low/, '#f6c9d4'], [/^hole_low/, '#2b2226'], [/^controller_low_boxblue/, '#3f6b6a'],
  [/^controller_low_boxsilver/, '#e4e7ee', 'chrome'], [/^controller_low_controller/, '#f2a0b4'], [/^pipes_low/, '#e4e7ee', 'chrome'],
  [/^claw_low/, '#e4e7ee', 'chrome'], [/^ufo1?_low/, '#f2a0b4'], [/^yellowplane_low/, '#efe5d3', 'felt'],
]

type Phase = 'idle' | 'down' | 'close' | 'up' | 'carry' | 'open'
type Body = { id: string; p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion; held: boolean; won: boolean; gone: boolean }

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const inChute = (x: number, z: number) => x > CHUTE.x0 && x < CHUTE.x1 && z > CHUTE.z0 && z < CHUTE.z1
const spawn = (b: Body, i: number) => {
  let x = 0, z = 0
  do { x = rand(PIT.x0 + R, PIT.x1 - R); z = rand(PIT.z0 + R, PIT.z1 - R) } while (inChute(x, z) || (x < CHUTE.x1 + R && z > CHUTE.z0 - R))
  b.p.set(x, 60 + i * 18 + rand(0, 20), z); b.v.set(0, 0, 0)
  b.q.setFromEuler(new THREE.Euler(rand(-1, 1), rand(-3, 3), rand(-1, 1)))
  b.held = false; b.won = false; b.gone = false
}

/* -------------------------------------------------------------------------------------------- the machine */
function Machine({ tools, onWin, dropRef, aimRef }: {
  tools: Tool[]
  onWin: (t: Tool) => void
  dropRef: React.MutableRefObject<(() => void) | null>
  aimRef: React.MutableRefObject<{ x: number; z: number; drop: boolean }>
}) {
  const { lang } = useI18n()
  const { scene } = useGLTF(MACHINE_URL)
  const lily = useMemo(() => new THREE.TextureLoader().load(lilyArt, (t) => { t.colorSpace = THREE.SRGBColorSpace }), [])

  // clone + recolour + re-parent the moving parts
  const rig = useMemo(() => {
    const root = scene.clone(true)
    root.updateMatrixWorld(true)
    const find = (re: RegExp) => { let hit: THREE.Object3D | undefined; root.traverse((o) => { if (!hit && (o as THREE.Mesh).isMesh && re.test(o.name)) hit = o }); return hit }
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.raycast = () => {} // the aim plane and the logos take the pointer, not the cabinet or the glass
      if (/glass/.test(m.name)) {
        m.material = new THREE.MeshPhysicalMaterial({ color: '#eef6f2', transparent: true, opacity: 0.14, roughness: 0.04, metalness: 0, envMapIntensity: 1.6, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide })
        m.userData.isHull = true // no ink outline on the panes
        m.renderOrder = 5
        return
      }
      const rule = COLORS.find(([re]) => re.test(m.name))
      const color = rule?.[1] ?? '#f3ebdc'
      const kind = rule?.[2] ?? 'plastic'
      m.material = kind === 'chrome'
        ? new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.22, envMapIntensity: 1.2 })
        : new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: kind === 'felt' ? 0.95 : 0.5 })
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals()
    })
    // carriage (moves in x/z): carriage box + pipe + claw head; the claw head also moves in y
    const carriage = new THREE.Group(); carriage.position.set(CLAW0.x, 0, CLAW0.z); root.add(carriage); carriage.updateMatrixWorld(true)
    const head = new THREE.Group(); carriage.add(head); head.updateMatrixWorld(true)
    const pipePivot = new THREE.Group(); pipePivot.position.set(0, PIPE.top, 0); carriage.add(pipePivot); pipePivot.updateMatrixWorld(true)
    const box = find(/^clawbox_low/), pipe = find(/^pipes_low/), claw = find(/^claw_low/), ufo = find(/^ufo_low/), ufo1 = find(/^ufo1_low/)
    if (box) carriage.attach(box)
    if (pipe) pipePivot.attach(pipe)
    for (const o of [claw, ufo, ufo1]) if (o) head.attach(o)
    return { root, carriage, head, pipePivot, claw, clawScale: claw ? claw.scale.clone() : new THREE.Vector3(1, 1, 1) }
  }, [scene])
  useOutline(rig.root, 0.0011, '#120d12')

  // the sign on the top plate and the lily on the side
  const sign = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1600; c.height = 260
    const g = c.getContext('2d')!
    g.fillStyle = '#f6c9d4'; g.fillRect(0, 0, 1600, 260)
    g.fillStyle = '#1b1620'; g.font = "400 150px 'Butler', 'Instrument Serif', Georgia, serif"; g.textBaseline = 'middle'
    g.fillText('Skills', 70, 140)
    g.fillStyle = '#6b5a6e'; g.font = '600 38px Inter, system-ui, sans-serif'
    const sub = lang === 'pt' ? 'PEGUE UMA FERRAMENTA' : 'GRAB A TOOL'
    let x = 1530 - [...sub].reduce((a, ch) => a + g.measureText(ch).width + 8, 0)
    for (const ch of sub) { g.fillText(ch, x, 140); x += g.measureText(ch).width + 8 }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    return t
  }, [lang])

  // logos + physics bodies
  const geos = useMemo(() => tools.map((t) => logoGeometry(t.id)), [tools])
  const mats = useMemo(() => tools.map((t) => logoMaterial(t.id)), [tools])
  const bodies = useMemo<Body[]>(() => tools.map((t, i) => { const b: Body = { id: t.id, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), held: false, won: false, gone: false }; spawn(b, i); return b }), [tools])
  const meshes = useRef<(THREE.Group | null)[]>([])
  const [hover, setHover] = useState<string | null>(null)

  // claw state
  const st = useRef({ phase: 'idle' as Phase, t: 0, drop: 0, depth: 0, held: -1 as number, slip: false, cx: CLAW0.x, cz: CLAW0.z })
  const reduce = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])

  const startDrop = () => { const s = st.current; if (s.phase === 'idle') { s.phase = 'down'; s.t = 0 } }
  useEffect(() => { dropRef.current = () => { aimRef.current.drop = true } }, [dropRef, aimRef])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const s = st.current
    const aim = aimRef.current
    // ---- carriage
    let tx = aim.x, tz = aim.z
    if (s.phase === 'carry' || s.phase === 'open') { tx = CHUTE_DROP.x; tz = CHUTE_DROP.z }
    if (s.phase === 'idle' || s.phase === 'carry') {
      s.cx = THREE.MathUtils.damp(s.cx, THREE.MathUtils.clamp(tx, RAIL.x0, RAIL.x1), 3.2, dt)
      s.cz = THREE.MathUtils.damp(s.cz, THREE.MathUtils.clamp(tz, RAIL.z0, RAIL.z1), 3.2, dt)
    }
    if (s.phase === 'idle' && aim.drop && Math.hypot(s.cx - tx, s.cz - tz) < 4) { aim.drop = false; startDrop() }
    rig.carriage.position.set(s.cx, 0, s.cz)

    // ---- claw head
    const bottom = () => CLAW0.bottom - s.drop
    if (s.phase === 'down') {
      if (s.t === 0) {
        // how deep: the highest logo under the claw, else the floor
        let top = FLOOR + 6
        bodies.forEach((b) => { if (!b.gone && !b.won && Math.hypot(b.p.x - s.cx, b.p.z - s.cz) < R + 8) top = Math.max(top, b.p.y + R * 0.4) })
        s.depth = CLAW0.bottom - top
      }
      s.t += dt
      s.drop = Math.min(s.depth, s.drop + dt * 95)
      if (s.drop >= s.depth) { s.phase = 'close'; s.t = 0 }
    } else if (s.phase === 'close') {
      s.t += dt
      if (s.t > 0.35) {
        // grab the nearest logo whose top is inside the claw
        let best = -1, bd = Infinity
        bodies.forEach((b, i) => { const d = Math.hypot(b.p.x - s.cx, b.p.z - s.cz); if (!b.gone && !b.won && d < R + 6 && Math.abs(b.p.y + R * 0.4 - bottom()) < 22 && d < bd) { bd = d; best = i } })
        if (best >= 0 && Math.random() < 0.88) { s.held = best; bodies[best].held = true; s.slip = !reduce && Math.random() < 0.14 }
        s.phase = 'up'; s.t = 0
      }
    } else if (s.phase === 'up') {
      s.drop = Math.max(0, s.drop - dt * 75)
      if (s.slip && s.held >= 0 && s.drop < s.depth * 0.45) { const b = bodies[s.held]; b.held = false; b.v.set(rand(-40, 40), 0, rand(-40, 40)); s.held = -1; s.slip = false }
      if (s.drop <= 0) { s.phase = s.held >= 0 ? 'carry' : 'idle'; s.t = 0 }
    } else if (s.phase === 'carry') {
      if (Math.hypot(s.cx - CHUTE_DROP.x, s.cz - CHUTE_DROP.z) < 3) { s.phase = 'open'; s.t = 0 }
    } else if (s.phase === 'open') {
      s.t += dt
      if (s.t > 0.15 && s.held >= 0) { const b = bodies[s.held]; b.held = false; b.v.set(0, -40, 0); s.held = -1 }
      if (s.t > 0.6) { s.phase = 'idle'; aim.x = CHUTE_DROP.x + 30; aim.z = CHUTE_DROP.z - 40 }
    }
    rig.head.position.y = -s.drop
    rig.pipePivot.scale.y = (PIPE.top - PIPE.bottom + s.drop) / (PIPE.top - PIPE.bottom)
    const closed = s.phase === 'close' || s.phase === 'up' || s.phase === 'carry'
    if (rig.claw) {
      // the prongs squeeze in (the claw is one mesh: a scale around its own centre reads as closing)
      const k = closed ? 0.8 : 1, base = rig.clawScale
      rig.claw.scale.x = THREE.MathUtils.damp(rig.claw.scale.x, base.x * k, 10, dt)
      rig.claw.scale.y = THREE.MathUtils.damp(rig.claw.scale.y, base.y * k, 10, dt)
    }

    // ---- physics (4 substeps)
    const n = 4, h = dt / n
    for (let k = 0; k < n; k++) {
      bodies.forEach((b, i) => {
        if (b.gone) return
        if (b.held) { b.p.set(s.cx, bottom() - R * 0.2, s.cz); b.v.set(0, 0, 0); return }
        if (b.won) return
        b.v.y += G * h
        b.v.multiplyScalar(Math.exp(-0.6 * h))
        b.p.addScaledVector(b.v, h)
        const ch = inChute(b.p.x, b.p.z)
        if (ch && b.p.y < CHUTE.top) {
          // inside the chute: walls hold it, no floor — it falls to the prize door
          b.p.x = THREE.MathUtils.clamp(b.p.x, CHUTE.x0 + R * 0.6, CHUTE.x1 - R * 0.6)
          b.p.z = THREE.MathUtils.clamp(b.p.z, CHUTE.z0 + R * 0.6, CHUTE.z1 - R * 0.6)
          if (b.p.y < -40) { b.won = true; b.p.copy(DOOR); b.v.set(0, 0, 0); onWin(tools[i]) }
          return
        }
        // pit walls
        if (b.p.x < PIT.x0 + R) { b.p.x = PIT.x0 + R; b.v.x *= -0.3 } else if (b.p.x > PIT.x1 - R) { b.p.x = PIT.x1 - R; b.v.x *= -0.3 }
        if (b.p.z < PIT.z0 + R) { b.p.z = PIT.z0 + R; b.v.z *= -0.3 } else if (b.p.z > PIT.z1 - R) { b.p.z = PIT.z1 - R; b.v.z *= -0.3 }
        // the chute box seen from outside, below its rim
        if (!ch && b.p.y < CHUTE.top + R && b.p.x < CHUTE.x1 + R && b.p.z > CHUTE.z0 - R) {
          const dx = CHUTE.x1 + R - b.p.x, dz = b.p.z - (CHUTE.z0 - R)
          if (b.p.y > CHUTE.top) { b.p.y = CHUTE.top + R; b.v.y = Math.max(0, b.v.y) * 0.2; b.v.x += 30 * h * 60 }
          else if (dx < dz) { b.p.x = CHUTE.x1 + R; b.v.x = Math.abs(b.v.x) * 0.3 } else { b.p.z = CHUTE.z0 - R; b.v.z = -Math.abs(b.v.z) * 0.3 }
        }
        // floor
        if (b.p.y < FLOOR + R * 0.7) { b.p.y = FLOOR + R * 0.7; if (b.v.y < 0) b.v.y *= -0.15; b.v.x *= 0.9; b.v.z *= 0.9 }
      })
      // logo-logo
      for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i], b = bodies[j]
        if (a.gone || b.gone || a.won || b.won) continue
        const d = a.p.distanceTo(b.p), min = R * 1.55
        if (d > 0 && d < min) {
          const nrm = b.p.clone().sub(a.p).divideScalar(d), push = (min - d) / 2
          if (!a.held) a.p.addScaledVector(nrm, -push * (b.held ? 2 : 1))
          if (!b.held) b.p.addScaledVector(nrm, push * (a.held ? 2 : 1))
          const rel = b.v.clone().sub(a.v).dot(nrm)
          if (rel < 0) { const imp = nrm.multiplyScalar(rel * 0.55); if (!a.held) a.v.add(imp); if (!b.held) b.v.sub(imp) }
        }
      }
    }
    // ---- draw
    const t = performance.now() / 1000
    bodies.forEach((b, i) => {
      const g = meshes.current[i]; if (!g) return
      g.visible = !b.gone
      if (b.won) {
        // out of the prize door, bobbing toward the camera
        g.position.set(DOOR.x, DOOR.y + Math.sin(t * 2) * 3, DOOR.z)
        g.quaternion.slerp(new THREE.Quaternion(), 1 - Math.exp(-4 * dt))
        g.rotateY(dt * 0.8)
        return
      }
      // roll with the horizontal speed
      const w = new THREE.Vector3(b.v.z, 0, -b.v.x).multiplyScalar(dt / R)
      const len = w.length()
      if (len > 1e-5) b.q.premultiply(new THREE.Quaternion().setFromAxisAngle(w.divideScalar(len), len))
      g.position.copy(b.p); g.quaternion.copy(b.q)
    })
  })

  // pointer → aim (local cm), click → drop
  const toLocal = (e: ThreeEvent<PointerEvent | MouseEvent>) => { const p = e.point.clone(); rig.root.parent?.worldToLocal(p); return p }
  const onAim = (e: ThreeEvent<PointerEvent>) => { const p = toLocal(e); aimRef.current.x = p.x; aimRef.current.z = p.z }
  const onDrop = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); const p = toLocal(e); aimRef.current.x = p.x; aimRef.current.z = p.z; aimRef.current.drop = true }

  // respawn a won logo once its tag has been closed (parent bumps `respawn`)
  useEffect(() => {
    const onRespawn = (ev: Event) => {
      const id = (ev as CustomEvent<string>).detail
      const i = bodies.findIndex((b) => b.id === id)
      if (i >= 0) spawn(bodies[i], 3)
    }
    window.addEventListener('claw:respawn', onRespawn)
    return () => window.removeEventListener('claw:respawn', onRespawn)
  }, [bodies])

  return (
    <group scale={SCALE}>
      <primitive object={rig.root} />
      {/* sign on the plate's front face, lily on the right side */}
      <mesh position={[-0.8, 144, 105.8]}><planeGeometry args={[160, 26]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      <mesh position={[103, 40, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[150, 140]} /><meshBasicMaterial map={lily} transparent opacity={0.6} depthWrite={false} /></mesh>
      {/* the aim plane (invisible) inside the glass */}
      <mesh position={[0, 55, 4]} rotation={[-Math.PI / 2, 0, 0]} onPointerMove={onAim} onClick={onDrop}>
        <planeGeometry args={[176, 176]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {tools.map((tool, i) => (
        <group key={tool.id} ref={(el) => { meshes.current[i] = el }}>
          <mesh
            geometry={geos[i]} material={mats[i]} scale={37}
            onPointerOver={(e) => { e.stopPropagation(); setHover(tool.id); document.body.style.cursor = 'pointer' }}
            onPointerOut={() => { setHover((h) => (h === tool.id ? null : h)); document.body.style.cursor = '' }}
            onClick={(e) => { e.stopPropagation(); const b = bodies[i]; if (b.won) return; aimRef.current.x = b.p.x; aimRef.current.z = b.p.z; aimRef.current.drop = true }}
          />
          {hover === tool.id && !bodies[i].won && (
            <Html center position={[0, 28, 0]} zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}><div className="logo-label">{tool.name}</div></Html>
          )}
        </group>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------------------------------------- camera + page */
function FitCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const t2 = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    const aspect = size.width / size.height
    // the whole cabinet (2.5 tall + sign, 2.05 wide) with air around it, seen a little from the right and above
    const d = Math.max(2.85 / 0.84 / t2, 2.4 / 0.8 / (t2 * aspect))
    cam.position.set(d * 0.2, 0.38 + d * 0.13, d)
    cam.lookAt(0, 0.34, 0.1)
    cam.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  return null
}

export default function ClawMachine({ tools }: { tools: Tool[] }) {
  const { t, lang } = useI18n()
  const [won, setWon] = useState<Tool | null>(null)
  const [found, setFound] = useState<Set<string>>(() => new Set())
  const [list, setList] = useState(false)
  const dropRef = useRef<(() => void) | null>(null)
  const aimRef = useRef({ x: CLAW0.x, z: CLAW0.z, drop: false })
  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches, [])

  // a new prize sends the previous one (still bobbing at the door) back into the pit
  const onWin = (tool: Tool) => { setWon((prev) => { if (prev && prev.id !== tool.id) window.dispatchEvent(new CustomEvent('claw:respawn', { detail: prev.id })); return tool }); setFound((f) => new Set(f).add(tool.id)) }
  const close = () => { if (won) window.dispatchEvent(new CustomEvent('claw:respawn', { detail: won.id })); setWon(null) }

  // keyboard: arrows aim, space/enter drop, esc closes the tag
  useEffect(() => {
    const keys = new Set<string>()
    let raf = 0, last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const a = aimRef.current, v = 90 * dt
      if (keys.has('ArrowLeft')) a.x -= v
      if (keys.has('ArrowRight')) a.x += v
      if (keys.has('ArrowUp')) a.z -= v
      if (keys.has('ArrowDown')) a.z += v
      a.x = THREE.MathUtils.clamp(a.x, RAIL.x0, RAIL.x1); a.z = THREE.MathUtils.clamp(a.z, RAIL.z0, RAIL.z1)
      raf = requestAnimationFrame(loop)
    }
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key.startsWith('Arrow')) { keys.add(e.key); e.preventDefault() }
      if ((e.key === ' ' || e.key === 'Enter') && !won) { aimRef.current.drop = true; e.preventDefault() }
      if (e.key === 'Escape') { setWon(null); setList(false) }
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key)
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); cancelAnimationFrame(raf) }
  }, [won])

  const shown = won
  return (
    <div className="cw">
      <div className="cw-stage">
        <Canvas shadows camera={{ position: [0.6, 1.2, 4.2], fov: 30 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
          <FitCamera />
          <Suspense fallback={null}>
            <Environment resolution={256} frames={1}>
              <Lightformer form="rect" intensity={4} color="#fff3e2" position={[0, 4, 3]} scale={[7, 3, 1]} target={[0, 0, 0]} />
              <Lightformer form="rect" intensity={2.5} color="#dfe8ff" position={[-4, 2, 2]} scale={[1.2, 5, 1]} target={[0, 0, 0]} />
              <Lightformer form="rect" intensity={3} color="#f2a0b4" position={[4, 1.5, -3]} scale={[3, 1, 1]} target={[0, 0, 0]} />
            </Environment>
            <ambientLight intensity={0.35} />
            <directionalLight position={[2.5, 4, 3.5]} intensity={1.7} color="#fff1e0" castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#a6d6be" />
            <Machine tools={tools} onWin={onWin} dropRef={dropRef} aimRef={aimRef} />
            <ContactShadows position={[0, -0.855, 0]} opacity={0.6} scale={4} blur={2.4} far={1.2} color="#05050a" />
          </Suspense>
        </Canvas>
      </div>

      <div className="cw-ui">
        <p className="cw-hint">{coarse ? t('cw_hint_touch') : t('cw_hint')}</p>
        <div className="cw-side">
          <span className="cw-count">{t('cw_found').replace('{n}', String(found.size)).replace('{t}', String(tools.length))}</span>
          <button type="button" className="cw-list-btn" onClick={() => setList((v) => !v)} aria-expanded={list}>{list ? t('cw_hide_list') : t('cw_show_list')}</button>
        </div>
        <button type="button" className="cw-drop" onClick={() => { aimRef.current.drop = true }} aria-label={t('cw_drop')}>{t('cw_drop')}</button>
      </div>

      <AnimatePresence>
        {list && (
          <motion.ul className="cw-list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            {tools.map((tool) => (
              <li key={tool.id}><button type="button" className={found.has(tool.id) ? 'is-found' : ''} onClick={() => { setWon(tool); setFound((f) => new Set(f).add(tool.id)) }}>{tool.name}</button></li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shown && (
          <motion.div className="cw-prize" role="dialog" aria-labelledby="cw-prize-name" initial={{ opacity: 0, y: 24, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} exit={{ opacity: 0, y: 16 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
            <span className="cw-prize-kicker">{shown.area[lang]}</span>
            <h3 id="cw-prize-name">{shown.name}</h3>
            <div className="cw-level" aria-label={`${t('sk_level')} ${shown.level}/5`}>
              <small>{t('sk_level')}</small>
              {[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= shown.level ? 'on' : ''} />)}
            </div>
            <p>{shown.desc[lang]}</p>
            <button type="button" onClick={close}>{t('cw_again')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

useGLTF.preload(MACHINE_URL)
