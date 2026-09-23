import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import { useI18n } from '../i18n'
import { usePainterly } from './PainterlyMaterial'
import { Kuwahara } from './Kuwahara'
import { useOutline } from './Outline'
import Easel from './Easel'
import Phone from './Phone'
import ScreenPreview from './ScreenPreview'
import type { Origin } from './Transition'

const URL = '/models/desk.glb'

export type HotspotId = 'projects' | 'about' | 'contact' | 'skills' | 'games'
export type SelectFn = (id: HotspotId, origin?: Origin) => void

// Anchor of each clickable object on the desk (desk-local coordinates).
export const HOTSPOTS: { id: HotspotId; pos: [number, number, number]; obj: string }[] = [
  { id: 'projects', pos: [-0.09, 0.43, -0.21], obj: 'monitor' },
  { id: 'about', pos: [-0.8, 0.2, 0.14], obj: 'easel (Ana\'s photo) — pin at the easel top so the tag does not cover the photo' },
  { id: 'contact', pos: [0.68, -0.3, 0.5], obj: 'phone (right-front, where the pot and tablet were)' },
  { id: 'skills', pos: [0.72, 0.14, 0.0], obj: 'pc tower' },
  { id: 'games', pos: [-0.62, -0.26, 0.36], obj: 'controller' },
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

/** Camera orbits the desk as the user scrolls through the section. No dragging. */
function ScrollCamera({ progress, hover, focus }: { progress: MotionValue<number>; hover: HotspotId | null; focus: [number, number, number] | null }) {
  const az = useRef(-0.75)
  const el = useRef(0.42)
  const rad = useRef(3.4)
  const look = useRef(new THREE.Vector3(0, -0.05, 0))
  const lookTarget = new THREE.Vector3()
  const tmp = new THREE.Vector3()

  useFrame((state, dt) => {
    const p = progress.get()
    // sweep from the front-left to the right side of the desk, coming a bit closer in the middle
    let tAz = -0.75 + p * 1.6 + Math.sin(state.clock.elapsedTime * 0.25) * 0.03
    let tEl = 0.42 - Math.sin(p * Math.PI) * 0.12
    // pull back on narrow (portrait) viewports so the whole desk stays in frame
    const aspect = state.size.width / state.size.height
    const fit = Math.max(1, 1.5 / aspect)
    let tRad = (3.4 - Math.sin(p * Math.PI) * 0.7 - (hover ? 0.15 : 0)) * fit
    let k = 3
    if (focus) {
      // dive towards the clicked object while the page transition covers the screen
      lookTarget.set(focus[0], focus[1], focus[2])
      tRad = 0.9
      tEl = Math.max(0.2, tEl - 0.1)
      tAz = az.current + 0.25
      k = 4.5
    } else {
      lookTarget.set(0, -0.05, 0)
    }
    look.current.x = THREE.MathUtils.damp(look.current.x, lookTarget.x, k, dt)
    look.current.y = THREE.MathUtils.damp(look.current.y, lookTarget.y, k, dt)
    look.current.z = THREE.MathUtils.damp(look.current.z, lookTarget.z, k, dt)
    az.current = THREE.MathUtils.damp(az.current, tAz, k, dt)
    el.current = THREE.MathUtils.damp(el.current, tEl, k, dt)
    rad.current = THREE.MathUtils.damp(rad.current, tRad, k, dt)
    tmp.set(
      look.current.x + Math.sin(az.current) * Math.cos(el.current) * rad.current,
      look.current.y + Math.sin(el.current) * rad.current,
      look.current.z + Math.cos(az.current) * Math.cos(el.current) * rad.current,
    )
    state.camera.position.copy(tmp)
    state.camera.lookAt(look.current)
  })
  return null
}

export default function DeskScene({ onSelect }: { onSelect: SelectFn }) {
  const { t } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState<HotspotId | null>(null)
  const [focus, setFocus] = useState<HotspotId | null>(null)
  const select: SelectFn = (id, origin) => {
    setFocus(id)
    onSelect(id, origin)
  }
  const focusPos = focus ? HOTSPOTS.find((h) => h.id === focus)!.pos : null
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const headO = useTransform(scrollYProgress, [0.15, 0.3], [0, 1])
  const headY = useTransform(scrollYProgress, [0.15, 0.3], [20, 0])

  return (
    <section className="desk" id="desk" ref={ref}>
      <div className="desk-sticky">
        <Canvas
          camera={{ position: [-2.2, 1.4, 2.6], fov: 32 }}
          dpr={[1, 1.75]}
          gl={{ antialias: false, alpha: false, toneMapping: 3 }}
        >
          <color attach="background" args={['#0c0d12']} />
          <Suspense fallback={null}>
            <group position={[0, 0, 0]}>
              <Desk />
              {/* mini easel between the books (back-left) and the controller (front-left), facing the camera */}
              <Easel position={[-0.82, -0.33, 0.08]} rotation={0.6} scale={1.7} onSelect={(origin) => select('about', origin)} />
              {/* the phone is the Contact hotspot (the keyboard used to be) */}
              <Phone position={[0.68, -0.36, 0.5]} rotation={-0.38} label={t('phone_msg')} onSelect={(origin) => select('contact', origin)} />
              <ScreenPreview onSelect={select} />
              {HOTSPOTS.map((h, i) => (
                <Hotspot key={h.id} index={i} id={h.id} pos={h.pos} onSelect={select} active={active} setActive={setActive} />
              ))}
            </group>
          </Suspense>
          <ScrollCamera progress={scrollYProgress} hover={active} focus={focusPos} />
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
