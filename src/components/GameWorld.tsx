import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { SceneReady } from './SceneReady'
import { Canvas, useFrame } from '@react-three/fiber'
import { useAdaptiveDpr } from './AdaptiveDpr'
import { useGLTF, useAnimations } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import ArcadeRoom, { Cabinet, PASTELS, VENDING_OFF } from './Arcade'
import { TITLE_URLS } from './titles'
import { useI18n } from '../i18n'
import { useTransition } from './Transition'
import { ROUTES } from '../pages/content'
import { useGLRecovery } from './glRecovery'
import { CanCanvas, CanView } from './SodaCan'

export type WorldGame = { title: string; engine: string; platform: string; year: string; desc: string; link?: string; hue: number; kind?: string; pitch?: string }

const PLAYER_URL = '/models/player.glb'
const PLAYER_SCALE = 2.4 // GLB is 1.75 units tall
const TILE_GAP = 3.6 // distance between cabinets along x (they're ~1.85 wide)
const TILE_R = 2.3 // touching a cabinet (it's ~1.85 wide, she's ~0.6) "wakes" it — the nearest one wins
const SPEED = 5
// side view: camera fixed in height/depth, follows the player on x only
const CAM = { y: 4.6, z: 12.5, lookY: 2.6, fov: 34 }
const FOCUS = { y: 2.95, z: 4.1, lookY: 2.55 } // zoomed onto a cabinet: screen + control panel fill the frame
// at the vending machine: the whole machine in frame, pushed left on wide screens so the menu sits beside it
const VEND_FOCUS = { y: 2.3, z: 6.7, lookY: 2.0 }
// opening a machine: zoom in, insert a coin, and the moment it drops the page wipes to the game
const ZOOM_MS = 750
const COIN_MS = 950 // the coin disappears into the slot at ~0.9 s of its animation
const FLOOR_Y = 0 // the arcade floor
const STAND_Z = 1.2 // the player walks along this line, in front of the cabinets
const STAND_OFF = 1.7 // she stops just right of a cabinet's screen, so the screen stays visible

const tileX = (i: number) => i * TILE_GAP
const VEND_STAND = 1.5 // she stops this far left of the vending machine
const VEND_BIAS = 0.35 // the vending machine's zone is a little smaller than a cabinet's

type Keys = { left: boolean; right: boolean }
/** Where she is walking on her own (point and click): stop at x, then open that machine if any. */
type Walk = { x: number; open: number | null }

/** Ana's rigged character (Mixamo skeleton, clips "Idle" and "Walk"). */
function Rig({ speed }: { speed: React.MutableRefObject<number> }) {
  const { scene, animations } = useGLTF(PLAYER_URL)
  // exactly the hero's look (see Character.tsx): painted shading + ink outline
  // the hero's look, but with the pale rim light almost off: in the dark arcade it read as a white halo
  usePainterly(scene, { keyDir: [1.4, 1.5, 1.2], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.12, rimStrength: 0.12, rimColor: '#7fa896', keyColor: '#f6e2c6' })
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

function Player({ keys, axis, walk, bounds, locked, spots, onSpace, onArrive, playerRef }: {
  keys: React.MutableRefObject<Keys>; axis: React.MutableRefObject<number>; walk: React.MutableRefObject<Walk | null>
  bounds: [number, number]; locked: boolean; spots: number[]; onSpace: (i: number | null) => void; onArrive: (i: number) => void
  playerRef: React.MutableRefObject<THREE.Group | null>
}) {
  const vel = useRef(0)
  const speed = useRef(0)
  const heading = useRef(Math.PI / 2)
  const space = useRef<number | null>(null)

  useFrame((_, rawDt) => {
    const g = playerRef.current
    if (!g) return
    const dt = Math.min(rawDt, 0.05) // no giant steps after a stalled frame / tab switch
    const k = keys.current
    // keyboard or joystick take over from any point-and-click walk
    const manual = (k.right ? 1 : 0) - (k.left ? 1 : 0) || axis.current
    if (manual !== 0) walk.current = null
    let want = locked ? 0 : manual * SPEED
    const w = walk.current
    if (!locked && w) {
      const dx = w.x - g.position.x
      // arrived: close enough, or nearly still right next to it (the damped velocity can hover around the target)
      if (Math.abs(dx) < 0.15 || (Math.abs(dx) < 0.45 && Math.abs(vel.current) < 0.6)) { walk.current = null; vel.current = 0; if (w.open !== null) onArrive(w.open) }
      else want = Math.sign(dx) * SPEED * Math.min(1, Math.abs(dx) / 0.8) // ease into the stop
    }
    vel.current = THREE.MathUtils.damp(vel.current, want, 8, dt)
    g.position.x = THREE.MathUtils.clamp(g.position.x + vel.current * dt, bounds[0], bounds[1])
    speed.current = Math.abs(vel.current)
    if (speed.current > 0.3) heading.current = vel.current > 0 ? Math.PI / 2 : -Math.PI / 2
    // still: face the camera; with a cabinet open: turn to the machine on her left
    const target = speed.current > 0.3 ? heading.current : locked ? -Math.PI / 2 : 0
    let d = target - g.rotation.y
    d = Math.atan2(Math.sin(d), Math.cos(d))
    g.rotation.y += d * Math.min(1, dt * 8)
    // which machine is she touching? the nearest one, if close enough (the last spot is the vending machine, which
    // gives way to the cabinet next to it)
    let on: number | null = null
    let best = TILE_R
    spots.forEach((x, i) => { const d = Math.abs(g.position.x - x) + (i === spots.length - 1 ? VEND_BIAS : 0); if (d < best) { best = d; on = i } })
    if (on !== space.current) { space.current = on; onSpace(on) }
  })

  return (
    <group ref={playerRef} position={[-1.4, 0, STAND_Z]} rotation={[0, 0, 0]} visible={!locked}>
      <Rig speed={speed} />
    </group>
  )
}

/** Mounted inside the Canvas' Suspense: fires once the scene has actually drawn a few frames. */
function Ready({ onReady }: { onReady: () => void }) {
  const n = useRef(0)
  const done = useRef(false)
  useFrame(() => { if (!done.current && ++n.current > 3) { done.current = true; onReady() } })
  return null
}

type Focus = { x: number; y: number; z: number; lookY: number }
function SideCam({ playerRef, focus }: { playerRef: React.MutableRefObject<THREE.Group | null>; focus: Focus | null }) {
  const look = useMemo(() => new THREE.Vector3(0, CAM.lookY, 0), [])
  useFrame(({ camera }, dt) => {
    const p = playerRef.current
    if (!p) return
    const f = focus ?? { x: p.position.x, y: CAM.y, z: CAM.z, lookY: CAM.lookY }
    const k = focus ? 5 : 3.5
    camera.position.x = THREE.MathUtils.damp(camera.position.x, f.x, k, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, f.y, k, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, f.z, k, dt)
    look.x = THREE.MathUtils.damp(look.x, f.x, k, dt)
    look.y = THREE.MathUtils.damp(look.y, f.lookY, k, dt)
    camera.lookAt(look)
  })
  return null
}

const KEYMAP: Record<string, 'left' | 'right' | 'action' | 'back'> = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyE: 'action', Enter: 'action', Space: 'action', Escape: 'back',
  // fallbacks by `key`, for keyboards/events that don't report a physical `code`
  a: 'left', A: 'left', d: 'right', D: 'right', e: 'action', E: 'action', ' ': 'action',
}
const keyOf = (e: KeyboardEvent) => KEYMAP[e.code] ?? KEYMAP[e.key]

/** Touch joystick (shown on coarse pointers): horizontal drag → -1..1 into `axis`. */
function Joystick({ axis }: { axis: React.MutableRefObject<number> }) {
  const knob = useRef<HTMLDivElement>(null)
  const origin = useRef<number | null>(null)
  const R = 44
  const set = (dx: number) => {
    const d = THREE.MathUtils.clamp(dx, -R, R)
    axis.current = Math.abs(d) / R < 0.15 ? 0 : d / R
    if (knob.current) knob.current.style.transform = `translateX(${d}px)`
  }
  return (
    <div
      className="joy" aria-label="joystick"
      onPointerDown={(e) => { origin.current = e.clientX; try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ } set(0) }}
      onPointerMove={(e) => { if (origin.current !== null) set(e.clientX - origin.current) }}
      onPointerUp={() => { origin.current = null; set(0) }}
      onPointerCancel={() => { origin.current = null; set(0) }}
    >
      <div className="knob" ref={knob} />
    </div>
  )
}

export default function GameWorld({ games }: { games: WorldGame[] }) {
  const glr = useGLRecovery()
  const [dpr] = useAdaptiveDpr(1.25)
  const { t } = useI18n()
  const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, [])
  const { go } = useTransition()
  // the room fades in once the scene has actually drawn, instead of popping in half-loaded
  const [ready, setReady] = useState(false)
  const [space, setSpace] = useState<number | null>(null) // space the player stands on
  const [open, setOpen] = useState<number | null>(null) // machine we zoomed into
  const [phase, setPhase] = useState<'zoom' | 'coin'>('zoom')
  const stage = useRef<HTMLDivElement>(null)
  const keys = useRef<Keys>({ left: false, right: false })
  const axis = useRef(0)
  const walk = useRef<Walk | null>(null)
  const playerRef = useRef<THREE.Group | null>(null)
  // the vending machine closing the row is one more "machine": index games.length
  const VEND = games.length
  const vendX = tileX(VEND) + VENDING_OFF
  const spots = useMemo(() => [...games.map((_, i) => tileX(i)), tileX(games.length) + VENDING_OFF], [games])
  const bounds = useMemo<[number, number]>(() => [tileX(-1) + 1.4, tileX(games.length - 1) + STAND_OFF + 2], [games.length])
  const menu = open === VEND
  const game = open !== null && !menu ? games[open] : null

  // point and click: a machine → walk up to it, then open; the floor → just walk there
  const pick = (i: number) => {
    if (open !== null) return
    const px = playerRef.current?.position.x ?? 0
    const reach = i === VEND ? TILE_R - VEND_BIAS : TILE_R
    if (Math.abs(px - spots[i]) < reach) setOpen(i)
    else walk.current = { x: i === VEND ? vendX - VEND_STAND : tileX(i) + STAND_OFF, open: i }
  }
  const walkTo = (x: number) => { if (open === null) walk.current = { x: THREE.MathUtils.clamp(x, bounds[0], bounds[1]), open: null } }

  // zoom → the visitor confirms ("Inserir ficha") → coin → the site's circular wipe, from the cabinet's screen, into the
  // game's page. The confirmation step is error prevention (Ana, 2026-10-23: brushing a machine used to send you
  // straight into its page); Esc, "Voltar" or a click on the room backs out. The vending machine opens a menu with every
  // game instead (Ana, 2026-10-26).
  const [askable, setAskable] = useState(false) // the confirm button / menu shows once the zoom has settled
  useEffect(() => {
    if (open === null) return
    setPhase('zoom'); setAskable(false)
    const a = window.setTimeout(() => setAskable(true), ZOOM_MS)
    return () => window.clearTimeout(a)
  }, [open])
  useEffect(() => {
    if (!game || open === null || phase !== 'coin') return
    const b = window.setTimeout(() => {
      const r = stage.current?.getBoundingClientRect()
      const origin = r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.42 } : undefined
      go(`${ROUTES.games}/${open + 1}`, game.title, `05.${open + 1}`, origin)
    }, COIN_MS)
    return () => window.clearTimeout(b)
  }, [phase, open, game, go])
  const insert = () => { if (game && phase === 'zoom') setPhase('coin') }
  const cancel = () => { if (phase === 'zoom') setOpen(null) }

  // from the vending menu: the chosen can drops, then the wipe opens that game's page from where it was
  const [picked, setPicked] = useState<number | null>(null)
  const [hot, setHot] = useState<number | null>(null) // the can under the pointer / keyboard focus turns round
  useEffect(() => { if (!menu) setPicked(null) }, [menu])
  const choose = (i: number, el: HTMLElement) => {
    if (picked !== null) return
    setPicked(i)
    const r = el.getBoundingClientRect()
    window.setTimeout(() => go(`${ROUTES.games}/${i + 1}`, games[i].title, `05.${i + 1}`, { x: r.left + r.width / 2, y: r.top + r.height / 2 }), 520)
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = keyOf(e)
      if (!k) return
      // in the menu, Enter/Space belong to its buttons
      if (menu && k === 'action') return
      e.preventDefault()
      if (k === 'left' || k === 'right') keys.current[k] = true
      else if (k === 'action') {
        if (open === null && space !== null) setOpen(space)
        else if (game && phase === 'zoom') setPhase('coin')
      } else if (k === 'back') {
        if (open !== null && phase === 'zoom' && picked === null) setOpen(null)
        // nothing else to release: the keyboard stays with the arcade while this page is open
      }
    }
    const up = (e: KeyboardEvent) => { const k = keyOf(e); if (k === 'left' || k === 'right') keys.current[k] = false }
    const blur = () => { keys.current = { left: false, right: false } }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); blur() }
  }, [open, space, game, menu, phase, picked])

  // the menu sits beside the machine on wide screens (camera to the right of it), under it on narrow ones
  const wide = typeof window !== 'undefined' && window.innerWidth / window.innerHeight > 1.15
  const focus: Focus | null = open === null ? null
    : menu ? { x: vendX + (wide ? 1.45 : 0), ...VEND_FOCUS, ...(wide ? {} : { y: VEND_FOCUS.y + 0.9, z: VEND_FOCUS.z + 1.6, lookY: VEND_FOCUS.lookY + 0.5 }) }
    : { x: tileX(open), ...FOCUS }

  return (
    <div ref={stage} className={`world-stage active ${ready ? 'ready' : ''} ${open !== null ? 'zoomed' : ''}`}>
      <Canvas key={glr.key} onCreated={glr.onCreated} camera={{ position: [-1, CAM.y, CAM.z], fov: CAM.fov }} dpr={dpr} gl={{ antialias: false, alpha: true, toneMapping: 3, premultipliedAlpha: false }} onPointerMissed={() => { if (picked === null) cancel() }}>
        <Suspense fallback={null}>
          <SceneReady />{/* holds the page curtain until this scene has drawn */}
          <ArcadeRoom count={games.length} tileX={tileX} gap={TILE_GAP} onFloor={walkTo}
            vending={{ state: open === VEND ? 'open' : space === VEND ? 'near' : 'idle', label: { kicker: t('gw_vend_k'), title: t('gw_vend') }, onOpen: () => pick(VEND) }} />
          {games.map((g, i) => (
            <Cabinet key={g.title} game={g} x={tileX(i)} tint={PASTELS[i % PASTELS.length]} state={open === i ? 'open' : space === i ? 'near' : 'idle'} coin={open === i && phase !== 'zoom'} title={TITLE_URLS[i]} index={i} onOpen={() => pick(i)} />
          ))}
          <Player keys={keys} axis={axis} walk={walk} bounds={bounds} spots={spots} locked={open !== null} onSpace={setSpace} onArrive={(i) => setOpen(i)} playerRef={playerRef} />
          <SideCam playerRef={playerRef} focus={focus} />
          <Ready onReady={() => setReady(true)} />
        </Suspense>
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.35} luminanceThreshold={0.9} luminanceSmoothing={0.25} mipmapBlur />
        </EffectComposer>
      </Canvas>

      <div className="world-hint meta">{open !== null ? (menu ? (coarse ? '' : t('gw_menu_keys')) : phase === 'coin' ? t('gw_coin') : coarse ? '' : t('gw_confirm_keys')) : coarse ? t('gw_touch') : t('gw_keys')}</div>

      {/* the explicit step: you have to choose to play */}
      {game && askable && phase === 'zoom' && (
        <div className="arc-confirm" role="dialog" aria-label={game.title}>
          <span className="meta">{t('gw_confirm_k')}</span>
          <strong>{game.title}</strong>
          <div className="arc-confirm-actions">
            <button type="button" className="arc-insert" onClick={insert} autoFocus><i aria-hidden /> {t('gw_insert')}</button>
            <button type="button" className="arc-cancel" onClick={() => setOpen(null)}>{t('gw_cancel')}</button>
          </div>
        </div>
      )}

      {/* the vending machine: every game as one of its selections (A1, A2…), each a 3D can with its title screen */}
      {menu && askable && (
        <div className={`vm-menu ${wide ? 'side' : ''}`} role="dialog" aria-label={t('gw_vend_title')}>
          <header>
            <span className="meta">{t('gw_vend_k')}</span>
            <strong>{t('gw_vend_title')}</strong>
            <p>{t('gw_vend_lead')}</p>
          </header>
          <ul>
            {games.map((g, i) => (
              <li key={g.title}>
                <button type="button" className={`vm-slot ${picked === i ? 'drop' : ''}`} style={{ '--can': PASTELS[i % PASTELS.length] } as React.CSSProperties}
                  onClick={(e) => choose(i, e.currentTarget)} autoFocus={i === 0} disabled={picked !== null && picked !== i}
                  onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot((h) => (h === i ? null : h))} onFocus={() => setHot(i)} onBlur={() => setHot((h) => (h === i ? null : h))}>
                  <CanView className="vm-can" titleUrl={TITLE_URLS[i]} tint={PASTELS[i % PASTELS.length]} code={`A${i + 1}`} title={g.title} hot={hot === i || picked === i} />
                  <span className="vm-txt">
                    <span className="meta">{g.kind ?? g.engine} · {g.year}</span>
                    <b>{g.title}</b>
                    {g.pitch && <span className="vm-pitch">{g.pitch}</span>}
                  </span>
                  <span className="vm-go" aria-hidden>→</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="arc-cancel" onClick={() => setOpen(null)} disabled={picked !== null}>{t('gw_cancel')}</button>
          <CanCanvas />
        </div>
      )}

      {coarse && open === null && <Joystick axis={axis} />}
    </div>
  )
}

useGLTF.preload(PLAYER_URL)
