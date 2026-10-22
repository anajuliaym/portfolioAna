import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import { useI18n } from '../i18n'
import { usePainterly } from './PainterlyMaterial'
import { Kuwahara } from './Kuwahara'
import { useOnScreen } from './useOnScreen'
import { useAdaptiveDpr } from './AdaptiveDpr'
import { useOutline } from './Outline'
import Easel from './Easel'
import Phone from './Phone'
import ScreenPreview from './ScreenPreview'
import GlbProp, { LILIES_URL } from './GlbProp'
import type { Origin } from './Transition'

const URL = '/models/desk.glb'

export type HotspotId = 'projects' | 'about' | 'contact' | 'skills' | 'games'
export type SelectFn = (id: HotspotId, origin?: Origin) => void

// Anchor of each clickable object on the desk (desk-local coordinates).
/** `within`: name of the object the pin may land on (default: anything in the scene); `drop`: lower the pin this much below the found top */
export const HOTSPOTS: { id: HotspotId; pos: [number, number, number]; obj: string; within?: string; drop?: number; center?: boolean; single?: boolean }[] = [
  { id: 'projects', pos: [-0.09, 0.43, -0.21], obj: 'monitor' },
  { id: 'about', pos: [-0.8, 0.2, 0.14], obj: 'easel (Ana\'s photo) — the easel\'s peak is a thin finial well above the frame, so the pin drops to the frame top (Ana: "mais para baixo", 2026-10-02)', within: 'easel', drop: 0.07 },
  { id: 'contact', pos: [0.68, -0.3, 0.5], obj: 'phone (right-front, where the pot and tablet were) — pin in the middle of the phone', within: 'phone', center: true },
  { id: 'skills', pos: [0.72, 0.14, 0.0], obj: 'pc tower' },
  { id: 'games', pos: [-0.575, -0.26, 0.355], obj: 'controller — single ray at its middle (its bounds in the desk mesh: x −0.75…−0.40, z 0.23…0.475)', single: true },
]

/**
 * Regions of the desk mesh to cut away (desk-local boxes): the little succulent pot right of the
 * tower and the flat tablet in front of it — Ana wanted both gone (2026-09-18). The desk is one
 * merged mesh, so we drop the triangles whose centroid falls inside and that are small (the
 * tabletop's big faces stay even where a box overlaps the surface).
 */
const CUTS: { min: [number, number, number]; max: [number, number, number]; size: number }[] = [
  { min: [0.63, -0.376, 0.29], max: [0.93, 0.05, 0.51], size: 0.12 }, // pot with succulents
  { min: [0.5, -0.4, 0.49], max: [0.8, -0.3, 0.75], size: 0.2 }, // flat tablet (its faces reach 0.17)
]
function cutDesk(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || mesh.userData.isHull) return
    const geo = mesh.geometry
    if (geo.userData.cut || !geo.index) return
    const pos = geo.attributes.position
    const idx = geo.index.array
    const keep: number[] = []
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    for (let i = 0; i < idx.length; i += 3) {
      a.fromBufferAttribute(pos, idx[i]); b.fromBufferAttribute(pos, idx[i + 1]); c.fromBufferAttribute(pos, idx[i + 2])
      const cx = (a.x + b.x + c.x) / 3, cy = (a.y + b.y + c.y) / 3, cz = (a.z + b.z + c.z) / 3
      const size = Math.max(Math.abs(a.x - b.x), Math.abs(b.x - c.x), Math.abs(a.z - b.z), Math.abs(b.z - c.z), Math.abs(a.y - b.y), Math.abs(b.y - c.y))
      const inside = CUTS.some((k) => size < k.size && cx > k.min[0] && cx < k.max[0] && cy > k.min[1] && cy < k.max[1] && cz > k.min[2] && cz < k.max[2])
      if (!inside) keep.push(idx[i], idx[i + 1], idx[i + 2])
    }
    geo.setIndex(keep)
    geo.userData.cut = true
  })
}

function Desk() {
  const { scene } = useGLTF(URL)
  useMemo(() => cutDesk(scene), [scene])
  usePainterly(scene, { keyDir: [1.4, 1.5, 1.2], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.12, rimStrength: 0.45, keyColor: '#f6e2c6' })
  useOutline(scene, 0.0024, '#120d12')
  return <primitive object={scene} />
}

function Hotspot({
  index, id, pos, onSelect, active, setActive,
}: {
  index: number; id: HotspotId; pos: [number, number, number]
  onSelect: SelectFn; active: HotspotId | null; setActive: (id: HotspotId | null) => void
}) {
  const { t } = useI18n()
  const isActive = active === id
  return (
    <Html position={pos} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      {/* a paper tag pinned to the object: cream label with dark type reads over the painted scene,
          the pin marks the exact spot and the short string ties the two */}
      <div
        className={`hotspot ${isActive ? 'active' : ''}`} style={{ ['--rot' as string]: `${index % 2 ? 2.2 : -2.4}deg` }}
        onClick={(e) => onSelect(id, { x: e.clientX, y: e.clientY })}
        onMouseEnter={() => setActive(id)}
        onMouseLeave={() => setActive(null)}
      >
        <span className="label"><small>0{index + 1}</small>{t(`hs_${id}` as const)}<i aria-hidden>→</i></span>
        <span className="string" />
        <span className="pin" />
      </div>
    </Html>
  )
}

/**
 * The tags, with each pin dropped onto the object under it: once the models are in, a ray is cast
 * straight down from a little above each HOTSPOTS point and the pin moves to the first surface it
 * meets. The hand-placed points only have to be roughly over the object — some pins used to hover
 * a few centimetres above it, which from the orbiting camera read as floating (Ana, 2026-10-01).
 */
/** where each pin actually landed (set once by `Hotspots`); the hover zoom dives toward the pin so it stays under the pointer */
const PIN_POS: Partial<Record<HotspotId, [number, number, number]>> = {}

function Hotspots({ onSelect, active, setActive }: { onSelect: SelectFn; active: HotspotId | null; setActive: (id: HotspotId | null) => void }) {
  const scene = useThree((s) => s.scene)
  const [pinned, setPinned] = useState<Record<string, [number, number, number]> | null>(null)
  const ray = useMemo(() => new THREE.Raycaster(), [])
  useFrame(() => {
    if (pinned) return
    scene.updateMatrixWorld(true)
    const meshesIn = (root: THREE.Object3D) => { const out: THREE.Object3D[] = []; root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.userData.isHull) out.push(m) }); return out }
    const all = meshesIn(scene)
    if (all.length < 3) return // models still arriving
    const out: Record<string, [number, number, number]> = {}
    const down = new THREE.Vector3(0, -1, 0), origin = new THREE.Vector3()
    for (const h of HOTSPOTS) {
      let [x, y, z] = h.pos
      const root = h.within ? scene.getObjectByName(h.within) : undefined
      const targets = root ? meshesIn(root) : all
      // `center`: aim at the middle of the named object instead of the hand-placed x/z
      if (h.center && root) { const c = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3()); x = c.x; z = c.z }
      const n = h.single || h.center ? 0 : 3
      // sample a small patch around the point and keep the highest surface: the pin lands on the
      // object's top (monitor bezel, easel frame, tower lid…) instead of the first face under one ray
      let best: THREE.Vector3 | null = null
      for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
        ray.set(origin.set(x + i * 0.025, y + 0.6, z + j * 0.025), down)
        const hit = ray.intersectObjects(targets, false).find((it) => it.point.y <= y + 0.15 && it.point.y >= y - 0.35)
        if (hit && (!best || hit.point.y > best.y)) best = hit.point.clone()
      }
      out[h.id] = best ? [best.x, best.y + 0.004 - (h.drop ?? 0), best.z] : h.pos
    }
    Object.assign(PIN_POS, out)
    setPinned(out)
  })
  return (
    <>
      {HOTSPOTS.map((h, i) => (
        <Hotspot key={h.id} index={i} id={h.id} pos={pinned?.[h.id] ?? h.pos} onSelect={onSelect} active={active} setActive={setActive} />
      ))}
    </>
  )
}

/** Camera orbits the desk as the user scrolls through the section. No dragging. */
/**
 * The close-up each object gets when it is picked (Ana, 2026-10-22: "o zoom da mesa está muito ruim — quero um zoom que
 * vá para o item aumentando bastante, com animação bem smooth"): distance from the object and the elevation to look at
 * it from. Flat things on the desk (phone, controller) are seen from higher up; upright ones (monitor, easel, tower)
 * almost level.
 */
const CLOSE_UP: Record<HotspotId, { at: [number, number, number]; rad: number; el: number }> = {
  // `at` = the object's middle (the hotspot `pos` is where its pin sits, above it)
  projects: { at: [-0.09, 0.2, -0.21], rad: 0.62, el: 0.14 },
  about: { at: [-0.8, 0.06, 0.14], rad: 0.42, el: 0.18 },
  contact: { at: [0.68, -0.36, 0.5], rad: 0.36, el: 0.95 },
  skills: { at: [0.72, -0.06, 0.0], rad: 0.66, el: 0.22 },
  games: { at: [-0.575, -0.34, 0.355], rad: 0.38, el: 0.85 },
}
/** the dive's length; the page curtain starts part-way, so it grows out of the object while the camera still glides in */
export const ZOOM_MS = 1500
const CURTAIN_AT_MS = 650
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

function ScrollCamera({ progress, hover, focus }: { progress: MotionValue<number>; hover: HotspotId | null; focus: HotspotId | null }) {
  const az = useRef(-0.75)
  const el = useRef(0.42)
  const rad = useRef(3.4)
  const look = useRef(new THREE.Vector3(0, -0.05, 0))
  // hover zoom (Ana, 2026-10-22: "o zoom do hover está muito ruim — quero que vá para o item aumentando bastante, bem
  // smooth"): the camera slides straight toward the hovered object, keeping its orientation, so the object stays under
  // the pointer (its pin does not run away from the mouse) and grows. `mix` eases 0 → 1 → 0; `last` keeps the object
  // while zooming back out.
  const hz = useRef({ mix: 0, last: null as HotspotId | null, at: new THREE.Vector3() })
  const shown = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() }) // the camera as actually shown
  const dive = useRef<{ id: HotspotId; t0: number; pos: THREE.Vector3; look: THREE.Vector3; az: number; el: number } | null>(null)
  const base = new THREE.Vector3()
  const toObj = new THREE.Vector3()
  const goal = new THREE.Vector3()

  useFrame((state, dt) => {
    const cam = state.camera
    if (focus) {
      // a timed, eased dive from wherever the camera is (hover zoom included) to the object's close-up — no damping:
      // damping starts fast and creeps at the end, which read as a jolt
      if (!dive.current || dive.current.id !== focus) {
        dive.current = { id: focus, t0: state.clock.elapsedTime, pos: shown.current.pos.clone(), look: shown.current.look.clone(), az: az.current, el: el.current }
      }
      const d = dive.current
      const e = easeInOut(Math.min(1, (state.clock.elapsedTime - d.t0) / (ZOOM_MS / 1000)))
      const c = CLOSE_UP[focus]
      // face the object from the side the camera is already on, turned a little toward its front (+z)
      const toAz = d.az + Math.atan2(Math.sin(-0.25 - d.az), Math.cos(-0.25 - d.az)) * 0.45
      goal.set(
        c.at[0] + Math.sin(toAz) * Math.cos(c.el) * c.rad,
        c.at[1] + Math.sin(c.el) * c.rad,
        c.at[2] + Math.cos(toAz) * Math.cos(c.el) * c.rad,
      )
      cam.position.lerpVectors(d.pos, goal, e)
      toObj.set(c.at[0], c.at[1], c.at[2])
      shown.current.look.lerpVectors(d.look, toObj, e)
      cam.lookAt(shown.current.look)
      return
    }
    dive.current = null

    const p = progress.get()
    // sweep from the front-left to the right side of the desk, coming a bit closer in the middle
    const tAz = -0.75 + p * 1.6 + Math.sin(state.clock.elapsedTime * 0.25) * 0.03
    const tEl = 0.42 - Math.sin(p * Math.PI) * 0.12
    // pull back on narrow (portrait) viewports so the whole desk stays in frame
    const aspect = state.size.width / state.size.height
    const fit = Math.max(1, 1.5 / aspect)
    const tRad = (3.4 - Math.sin(p * Math.PI) * 0.7) * fit
    const k = 3
    look.current.x = THREE.MathUtils.damp(look.current.x, 0, k, dt)
    look.current.y = THREE.MathUtils.damp(look.current.y, -0.05, k, dt)
    look.current.z = THREE.MathUtils.damp(look.current.z, 0, k, dt)
    az.current = THREE.MathUtils.damp(az.current, tAz, k, dt)
    el.current = THREE.MathUtils.damp(el.current, tEl, k, dt)
    rad.current = THREE.MathUtils.damp(rad.current, tRad, k, dt)
    base.set(
      look.current.x + Math.sin(az.current) * Math.cos(el.current) * rad.current,
      look.current.y + Math.sin(el.current) * rad.current,
      look.current.z + Math.cos(az.current) * Math.cos(el.current) * rad.current,
    )

    // hover zoom: a gentle spring on `mix`, shaped by smoothstep so it eases in and out at both ends
    const h = hz.current
    if (hover) {
      // toward the PIN, not the object's middle: the pin (where the pointer is) then stays put on screen. Aiming at the
      // middle, the tall objects' pins (monitor, tower) slid off the pointer, the hover dropped, the camera backed off,
      // the pin came back… — the "stroke" Ana saw on Projetos and Skills
      const at = PIN_POS[hover] ?? HOTSPOTS.find((x) => x.id === hover)!.pos
      // from rest, aim straight at the object; going from one object to another, the aim glides across
      if (!h.last || h.mix < 0.01) h.at.set(at[0], at[1], at[2])
      else h.at.set(THREE.MathUtils.damp(h.at.x, at[0], 4, dt), THREE.MathUtils.damp(h.at.y, at[1], 4, dt), THREE.MathUtils.damp(h.at.z, at[2], 4, dt))
      h.last = hover
    }
    h.mix = THREE.MathUtils.damp(h.mix, hover ? 1 : 0, 2.6, dt)
    const e = h.mix * h.mix * (3 - 2 * h.mix)
    shown.current.pos.copy(base); shown.current.look.copy(look.current)
    if (h.last && e > 0.0005) {
      // travel 55% of the way to the pin along the line of sight to it: same view direction, much closer
      toObj.copy(h.at).sub(base).multiplyScalar(0.55 * e)
      shown.current.pos.add(toObj); shown.current.look.add(toObj)
    } else if (!hover) h.last = null
    cam.position.copy(shown.current.pos)
    cam.lookAt(shown.current.look)
  })
  return null
}

export default function DeskScene({ onSelect }: { onSelect: SelectFn }) {
  const [dpr] = useAdaptiveDpr(1.75)
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const onScreen = useOnScreen(ref) // the desk (full-screen Kuwahara) sleeps while the hero is on screen
  const [active, setActiveNow] = useState<HotspotId | null>(null)
  // leaving a tag waits a beat: a pointer brushing the tag's edge (or a 1-px slide) must not bounce the zoom
  const leaveT = useRef(0)
  const setActive = (id: HotspotId | null) => {
    window.clearTimeout(leaveT.current)
    if (id) setActiveNow(id)
    else leaveT.current = window.setTimeout(() => setActiveNow(null), 220)
  }
  const [focus, setFocus] = useState<HotspotId | null>(null)
  const select: SelectFn = (id, origin) => {
    if (focus) return // one dive at a time
    setFocus(id)
    // the curtain starts part-way through the dive (at once for reduced motion, where the camera does not fly)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => onSelect(id, origin), reduced ? 0 : CURTAIN_AT_MS)
  }
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const headO = useTransform(scrollYProgress, [0.15, 0.3], [0, 1])
  const headY = useTransform(scrollYProgress, [0.15, 0.3], [20, 0])

  return (
    <section className={`desk${focus ? ' diving' : ''}`} id="desk" ref={ref}>
      <div className="desk-sticky">
        <Canvas
          camera={{ position: [-2.2, 1.4, 2.6], fov: 32 }}
          dpr={dpr}
          frameloop={onScreen ? 'always' : 'never'}
          gl={{ antialias: false, alpha: false, toneMapping: 3 }}
        >
          <color attach="background" args={['#0c0d12']} />
          <Suspense fallback={null}>
            <group position={[0, 0, 0]}>
              <Desk />
              {/* mini easel between the books (back-left) and the controller (front-left), facing the camera */}
              <group name="easel"><Easel position={[-0.82, -0.33, 0.08]} rotation={0.6} scale={1.7} onSelect={(origin) => select('about', origin)} /></group>
              {/* Ana's lilies in the back-left corner, behind the easel (she loves lilies, 2026-10-14) */}
              <GlbProp url={LILIES_URL} x={-0.98} z={-0.18} top={-0.367} height={0.62} rotation={[0, 0.5, 0]} />
              {/* the phone is the Contact hotspot (the keyboard used to be) */}
              <group name="phone"><Phone position={[0.68, -0.367, 0.5]} rotation={-0.38} label={t('phone_msg')} onSelect={(origin) => select('contact', origin)} /></group>
              <ScreenPreview onSelect={select} />
              <Hotspots onSelect={select} active={active} setActive={setActive} />
            </group>
          </Suspense>
          <ScrollCamera progress={scrollYProgress} hover={active} focus={focus} />
          <EffectComposer multisampling={0}>
            <Kuwahara radius={2} />
            <Bloom intensity={0.25} luminanceThreshold={0.85} luminanceSmoothing={0.3} mipmapBlur />
            <Noise opacity={0.05} blendFunction={BlendFunction.SOFT_LIGHT} />
            <Vignette eskil={false} offset={0.2} darkness={0.8} />
          </EffectComposer>
        </Canvas>

        <div className={`desk-ui ${focus ? 'focusing' : ''}`}>
          <motion.div className="desk-head" style={{ opacity: headO, y: headY }}>
            <div>
              <span className="meta">{t('desk_kicker')}</span>
              <h2>{t('desk_title')}</h2>
            </div>
            <p>{t('desk_sub')}</p>
          </motion.div>

          <div className="desk-index">
            {HOTSPOTS.map((h, i) => (
              <button
                key={h.id}
                className={active === h.id ? 'active' : ''}
                onMouseEnter={() => setActive(h.id)}
                onMouseLeave={() => setActive(null)}
                onClick={(e) => select(h.id, { x: e.clientX, y: e.clientY })}
              >
                <small>0{i + 1}</small>{t(`hs_${h.id}` as const)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

useGLTF.preload(URL)
