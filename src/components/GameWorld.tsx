import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { Html, useGLTF, useAnimations } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import { Kuwahara } from './Kuwahara'
import ArcadeRoom, { Cabinet } from './Arcade'
import { useI18n } from '../i18n'

export type WorldGame = { title: string; engine: string; platform: string; year: string; desc: string; link?: string; hue: number }

const PLAYER_URL = '/models/player.glb'
const PLAYER_SCALE = 2.4 // GLB is 1.75 units tall
const TILE_GAP = 6.5 // distance between cabinets along x
const TILE_R = 1.7 // standing this close to a cabinet "wakes" it
const SPEED = 5
// side view: camera fixed in height/depth, follows the player on x only
const CAM = { y: 4.6, z: 12.5, lookY: 2.6, fov: 34 }
const FOCUS = { y: 3.5, z: 9.2, lookY: 2.8 } // leaning towards a cabinet's screen
const FLOOR_Y = 0 // the arcade floor
const STAND_Z = 1.2 // the player walks along this line, in front of the cabinets
const STAND_OFF = 1.9 // she stops just right of a cabinet's screen, so the screen stays visible

const tileX = (i: number) => i * TILE_GAP

type Keys = { left: boolean; right: boolean }

/** Ana's rigged character (Mixamo skeleton, clips "Idle" and "Walk"). */
function Rig({ speed }: { speed: React.MutableRefObject<number> }) {
  const { scene, animations } = useGLTF(PLAYER_URL)
  // exactly the hero's look (see Character.tsx): painted shading + ink outline
  usePainterly(scene, { keyDir: [1.4, 1.5, 1.2], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.12, rimStrength: 0.45, keyColor: '#f6e2c6' })
  useOutline(scene, 0.0024, '#120d12')
  const root = useRef<THREE.Group>(null)
  const { actions } = useAnimations(animations, root)
  const current = useRef<'Idle' | 'Walk' | null>(null)
  const frames = useRef(0)
  const skinned = useMemo(() => {
    let sk: THREE.SkinnedMesh | undefined
    scene.traverse((o) => { if (!sk && (o as THREE.SkinnedMesh).isSkinnedMesh) sk = o as THREE.SkinnedMesh })
    return sk
  }, [scene])

  useFrame(() => {
    const walk = actions.Walk, idle = actions.Idle
    if (!walk || !idle) return
    // feet on the floor: measure the posed mesh a few frames in (the bind pose sits much lower than the animated one)
    if (frames.current++ === 12 && skinned && root.current) {
      skinned.computeBoundingBox()
      const box = skinned.boundingBox!.clone().applyMatrix4(skinned.matrixWorld)
      root.current.position.y += FLOOR_Y - box.min.y
    }
    const next = speed.current > 0.35 ? 'Walk' : 'Idle'
    if (next !== current.current) {
      const from = current.current ? actions[current.current] : null
      const to = actions[next]!
      to.reset().setEffectiveWeight(1).play()
      if (from) from.crossFadeTo(to, 0.25, false)
      current.current = next
    }
    walk.timeScale = 0.6 + (speed.current / SPEED) * 0.7
  })

  return (
    <group ref={root} scale={PLAYER_SCALE}>
      <primitive object={scene} />
    </group>
  )
}

function Player({ keys, count, locked, onSpace, playerRef }: { keys: React.MutableRefObject<Keys>; count: number; locked: boolean; onSpace: (i: number | null) => void; playerRef: React.MutableRefObject<THREE.Group | null> }) {
  const vel = useRef(0)
  const speed = useRef(0)
  const heading = useRef(Math.PI / 2)
  const space = useRef<number | null>(null)
  const maxX = tileX(count - 1) + STAND_OFF + 2

  useFrame((_, rawDt) => {
    const g = playerRef.current
    if (!g) return
    const dt = Math.min(rawDt, 0.05) // no giant steps after a stalled frame / tab switch
    const k = keys.current
    const want = locked ? 0 : ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * SPEED
    vel.current = THREE.MathUtils.damp(vel.current, want, 8, dt)
    g.position.x = THREE.MathUtils.clamp(g.position.x + vel.current * dt, -2, maxX)
    speed.current = Math.abs(vel.current)
    if (speed.current > 0.3) heading.current = vel.current > 0 ? Math.PI / 2 : -Math.PI / 2
    // still: face the camera; with a cabinet open: turn to the machine on her left
    const target = speed.current > 0.3 ? heading.current : locked ? -Math.PI / 2 : 0
    let d = target - g.rotation.y
    d = Math.atan2(Math.sin(d), Math.cos(d))
    g.rotation.y += d * Math.min(1, dt * 8)
    // which space are we on?
    let on: number | null = null
    for (let i = 0; i < count; i++) if (Math.abs(g.position.x - (tileX(i) + STAND_OFF)) < TILE_R) on = i
    if (on !== space.current) { space.current = on; onSpace(on) }
  })

  return (
    <group ref={playerRef} position={[-2.6, 0, STAND_Z]} rotation={[0, 0, 0]}>
      <Rig speed={speed} />
    </group>
  )
}

function SideCam({ playerRef, focusX }: { playerRef: React.MutableRefObject<THREE.Group | null>; focusX: number | null }) {
  const look = useMemo(() => new THREE.Vector3(0, CAM.lookY, 0), [])
  useFrame(({ camera }, dt) => {
    const p = playerRef.current
    if (!p) return
    const open = focusX !== null
    const tx = open ? focusX! - 0.4 : p.position.x
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 3.5, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, open ? FOCUS.y : CAM.y, 3, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, open ? FOCUS.z : CAM.z, 3, dt)
    look.x = THREE.MathUtils.damp(look.x, tx, 3.5, dt)
    look.y = THREE.MathUtils.damp(look.y, open ? FOCUS.lookY : CAM.lookY, 3, dt)
    camera.lookAt(look)
  })
  return null
}

const KEYMAP: Record<string, 'left' | 'right' | 'action' | 'back'> = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyE: 'action', Enter: 'action', Space: 'action', Escape: 'back',
}

export default function GameWorld({ games }: { games: WorldGame[] }) {
  const { t } = useI18n()
  const [active, setActive] = useState(false) // keyboard captured?
  const [space, setSpace] = useState<number | null>(null) // space the player stands on
  const [open, setOpen] = useState<number | null>(null) // projection opened for a closer look
  const keys = useRef<Keys>({ left: false, right: false })
  const playerRef = useRef<THREE.Group | null>(null)
  const current = open !== null ? games[open] : null

  useEffect(() => {
    if (!active) return
    const down = (e: KeyboardEvent) => {
      const k = KEYMAP[e.code]
      if (!k) return
      e.preventDefault()
      if (k === 'left' || k === 'right') keys.current[k] = true
      else if (k === 'action') {
        if (open !== null) { const g = games[open]; if (g.link) window.open(g.link, '_blank', 'noopener') }
        else if (space !== null) setOpen(space)
      } else if (k === 'back') {
        if (open !== null) setOpen(null)
        else setActive(false)
      }
    }
    const up = (e: KeyboardEvent) => { const k = KEYMAP[e.code]; if (k === 'left' || k === 'right') keys.current[k] = false }
    const blur = () => { keys.current = { left: false, right: false } }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); blur() }
  }, [active, open, space, games])

  // walking away closes the projection
  useEffect(() => { if (open !== null && space !== open) setOpen(null) }, [space, open])

  return (
    <div className={`world-stage ${active ? 'active' : ''}`} onPointerDown={() => setActive(true)} tabIndex={0} onFocus={() => setActive(true)}>
      <Canvas camera={{ position: [-1, CAM.y, CAM.z], fov: CAM.fov }} dpr={[1, 1.5]} gl={{ antialias: false, alpha: true, toneMapping: 3, premultipliedAlpha: false }} onPointerMissed={() => setOpen(null)}>
        <Suspense fallback={null}>
          <ArcadeRoom count={games.length} tileX={tileX} gap={TILE_GAP} />
          {games.map((g, i) => (
            <Cabinet key={g.title} game={g} x={tileX(i)} state={open === i ? 'open' : space === i ? 'near' : 'idle'} onOpen={() => setOpen(i)} />
          ))}
          <Player keys={keys} count={games.length} locked={open !== null} onSpace={setSpace} playerRef={playerRef} />
          <SideCam playerRef={playerRef} focusX={open !== null ? tileX(open) : null} />
        </Suspense>
        <EffectComposer multisampling={0}>
          <Kuwahara radius={1} />
          <Bloom intensity={0.45} luminanceThreshold={0.7} luminanceSmoothing={0.35} mipmapBlur />
        </EffectComposer>
      </Canvas>

      <div className="world-hint meta">{active ? (open !== null ? t('gw_keys_open') : t('gw_keys')) : t('gw_start')}</div>

      {current && (
        <aside className="world-detail">
          <button className="close meta" onClick={() => setOpen(null)}>{t('close')}</button>
          <span className="meta">{current.engine} · {current.platform} · {current.year}</span>
          <h3>{current.title}</h3>
          <p>{current.desc}</p>
          {current.link && <a className="btn" href={current.link} target="_blank" rel="noopener">{t('gw_play')} ▶ <small>E</small></a>}
        </aside>
      )}
    </div>
  )
}

useGLTF.preload(PLAYER_URL)
