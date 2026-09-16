import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useI18n } from '../i18n'
import type { WorldGame } from './GameWorld'

/**
 * A penthouse arcade at night: a floor-to-ceiling steel-framed window wall over a lit city,
 * warm lamps inside, a plain dark matte floor, and one glowing cabinet per game.
 * Real lights + standard materials here (the painterly shader stays on the character).
 */

const CAB = { w: 2.3, h: 3.7, d: 1.7 }
const WALL_Z = -5.6 // the window wall
const CAB_Z = -2.6
const CEIL_Y = 12

type RoomProps = { count: number; tileX: (i: number) => number; gap: number }

const gameColor = (hue: number, s = 0.55, l = 0.55) => '#' + new THREE.Color().setHSL(hue / 360, s, l).getHexString()

/* ------------------------------------------------------------------ city outside */

const CITY_URL = '/models/city.glb'

type CityRow = { z: number; y: number; scale: number; dim: number; copies: number[]; rot: number[] }
// GLTFLoader strips dots from node names, so match by prefix
const isDome = (o: THREE.Object3D) => o.name.startsWith('Sphere_') // the asset's own sky globe
const isGround = (o: THREE.Object3D) => o.name.startsWith('Plane_') // the diorama's ground disc

/** Ana's low-poly night city (Sketchfab): its sky globe once, huge, as our sky; its buildings tiled in rows behind the glass. */
function City({ cx }: { cx: number }) {
  const { scene } = useGLTF(CITY_URL)
  const rows = useMemo<CityRow[]>(() => [
    { z: -48, y: -9, scale: 4.0, dim: 1.0, copies: [-2.2, -1.1, 0, 1.1, 2.2], rot: [0.4, 1.9, 0, -0.6, 2.6] },
    { z: -88, y: -10, scale: 6.2, dim: 0.75, copies: [-2.6, -1.3, 0.2, 1.5, 2.8], rot: [1.2, 0.2, -0.9, 2.1, 0.7] },
    { z: -140, y: -12, scale: 9.0, dim: 0.55, copies: [-2.4, -0.8, 0.9, 2.3], rot: [0.9, -0.4, 1.8, 2.9] },
  ], [])
  // buildings only, one clone per placement, materials dimmed per depth row (haze)
  const placements = useMemo(() => rows.flatMap((row, ri) => row.copies.map((k, ci) => {
    const obj = scene.clone(true)
    const drop: THREE.Object3D[] = []
    obj.traverse((o) => {
      if (isDome(o) || isGround(o)) { drop.push(o); return }
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      // the asset's emissive factors are weak (and one is missing): every window map glows warm and strong
      if (mat.emissiveMap) { mat.emissive.set('#ffe0b0'); mat.emissiveIntensity = 4.0 * row.dim }
      mat.color.multiplyScalar(0.5 + 0.5 * row.dim)
      m.material = mat
    })
    drop.forEach((o) => o.parent?.remove(o))
    return { obj, pos: [cx + k * 9 * row.scale, row.y, row.z] as [number, number, number], rot: row.rot[ci], scale: row.scale, key: `${ri}-${ci}` }
  })), [scene, rows, cx])
  // the sky: the asset's dome alone (keeping its parent transforms), unlit so it reads as a backdrop
  const dome = useMemo(() => {
    const obj = scene.clone(true)
    let keep: THREE.Mesh | undefined
    const drop: THREE.Object3D[] = []
    obj.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; if (!keep && isDome(o)) keep = m; else drop.push(o) })
    drop.forEach((o) => o.parent?.remove(o))
    if (keep) {
      const src = keep.material as THREE.MeshStandardMaterial
      keep.material = new THREE.MeshBasicMaterial({ map: src.map, color: '#7f8db0', side: THREE.DoubleSide, toneMapped: true, depthWrite: false })
      keep.renderOrder = -10
    }
    return obj
  }, [scene])
  useEffect(() => () => {
    placements.forEach((p) => p.obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) (m.material as THREE.Material).dispose() }))
    dome.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) (m.material as THREE.Material).dispose() })
  }, [placements, dome])
  return (
    <group>
      <primitive object={dome} position={[cx, -30, -60]} scale={40} />
      {placements.map((p) => (
        <primitive key={p.key} object={p.obj} position={p.pos} rotation={[0, p.rot, 0]} scale={p.scale} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ room */

function Room({ count, tileX, gap }: RoomProps) {
  const length = (count + 1) * gap + 12
  const cx = tileX(count - 1) / 2
  const x0 = cx - length / 2
  // steel window grid: verticals every 1.7, horizontals every 2.4
  const grid = useMemo(() => {
    const v: number[] = []
    for (let x = x0; x <= x0 + length + 0.01; x += 1.7) v.push(x)
    const h: number[] = []
    for (let y = 0; y <= CEIL_Y + 0.01; y += 2.4) h.push(y)
    return { v, h }
  }, [x0, length])
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15171d', roughness: 0.5, metalness: 0.7 }), [])
  const plaster = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a3128', roughness: 0.9 }), [])
  const ceiling = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.95 }), [])
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1e1b18', roughness: 0.85, metalness: 0 }), [])
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#6b7d99', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.08, side: THREE.DoubleSide }), [])
  useEffect(() => () => { steel.dispose(); plaster.dispose(); ceiling.dispose(); glass.dispose(); floor.dispose() }, [steel, plaster, ceiling, glass, floor])
  const lamps = useMemo(() => Array.from({ length: count + 1 }, (_, i) => tileX(i - 1) + gap / 2), [count, tileX, gap])
  return (
    <group>
      <City cx={cx} />
      {/* plain matte floor — dark warm concrete, lit only by the lamps and cabinets */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, 4]} material={floor}>
        <planeGeometry args={[length + 20, 40]} />
      </mesh>
      {/* ceiling with a soft cove */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[cx, CEIL_Y, 4]} material={ceiling}>
        <planeGeometry args={[length + 20, 40]} />
      </mesh>
      <mesh position={[cx, CEIL_Y - 0.4, WALL_Z + 6]} material={plaster}>
        <boxGeometry args={[length + 4, 0.8, 0.6]} />
      </mesh>
      {/* the window wall: glass + steel grid, city behind */}
      <mesh position={[cx, CEIL_Y / 2, WALL_Z]} material={glass}>
        <planeGeometry args={[length, CEIL_Y]} />
      </mesh>
      {grid.v.map((x, i) => (
        <mesh key={'v' + i} position={[x, CEIL_Y / 2, WALL_Z]} material={steel}>
          <boxGeometry args={[i % 4 === 0 ? 0.22 : 0.1, CEIL_Y, 0.16]} />
        </mesh>
      ))}
      {grid.h.map((y, i) => (
        <mesh key={'h' + i} position={[cx, y, WALL_Z]} material={steel}>
          <boxGeometry args={[length, i === 0 ? 0.4 : 0.1, 0.16]} />
        </mesh>
      ))}
      <Neon cx={cx} length={length} />
      <Sign cx={cx} />
      <Pinball x={tileX(-1) - 0.6} />
      <Vending x={tileX(count) + 0.4} />
      {/* warm lamps between the cabinets */}
      {lamps.map((x, i) => <Lamp key={i} x={x} />)}
      <ambientLight color="#2c3650" intensity={0.9} />
      <hemisphereLight color="#5b6f94" groundColor="#2a1f18" intensity={0.5} />
      {/* cool city light spilling in through the glass */}
      <directionalLight position={[cx - 10, 9, WALL_Z - 20]} color="#6f86b8" intensity={0.55} />
    </group>
  )
}

function Lamp({ x }: { x: number }) {
  const shade = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9d2a8', emissive: '#ffcf8a', emissiveIntensity: 0.75, roughness: 0.9, side: THREE.DoubleSide }), [])
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b08a4a', roughness: 0.35, metalness: 0.9 }), [])
  useEffect(() => () => { shade.dispose(); brass.dispose() }, [shade, brass])
  return (
    <group position={[x, 0, CAB_Z + 0.4]}>
      <mesh position={[0, 0.06, 0]} material={brass}><cylinderGeometry args={[0.32, 0.36, 0.12, 20]} /></mesh>
      <mesh position={[0, 2.0, 0]} material={brass}><cylinderGeometry args={[0.035, 0.035, 3.9, 8]} /></mesh>
      <mesh position={[0, 4.15, 0]} material={shade}><cylinderGeometry args={[0.42, 0.62, 0.7, 24, 1, true]} /></mesh>
      <pointLight position={[0, 4.0, 0]} color="#ffcd88" intensity={26} distance={14} decay={2} />
    </group>
  )
}

/* ------------------------------------------------------------------ arcade dressing */

const NEON = { teal: '#5fd3c7', sage: '#a6c69a', amber: '#ffbf6e', lilac: '#b79be0', pink: '#e88fd0' }

/** Emissive neon tube. */
function Tube({ color, length, position, rotation = [0, 0, 0], radius = 0.045, intensity = 2.4 }: { color: string; length: number; position: [number, number, number]; rotation?: [number, number, number]; radius?: number; intensity?: number }) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} roughness={0.4} toneMapped={false} />
    </mesh>
  )
}

/** Neon along the ceiling cove and along the cabinets' feet, plus a string of coloured bulbs. */
function Neon({ cx, length }: { cx: number; length: number }) {
  const bulbs = useMemo(() => {
    const colors = [NEON.amber, NEON.teal, NEON.pink, NEON.sage, NEON.lilac]
    return Array.from({ length: Math.floor(length / 1.1) }, (_, i) => ({ x: cx - length / 2 + i * 1.1, y: 7.1 - Math.abs(Math.sin(i * 0.55)) * 0.35, color: colors[i % colors.length] }))
  }, [cx, length])
  return (
    <group>
      {/* a light rail across the window wall, just above the cabinets */}
      <Tube color={NEON.teal} length={length} position={[cx, 7.7, WALL_Z + 0.35]} rotation={[0, 0, Math.PI / 2]} radius={0.05} />
      <Tube color={NEON.lilac} length={length} position={[cx, 0.12, CAB_Z - CAB.d / 2 - 0.25]} rotation={[0, 0, Math.PI / 2]} radius={0.035} intensity={1.8} />
      <pointLight position={[cx, 7.4, WALL_Z + 1.5]} color={NEON.teal} intensity={18} distance={22} decay={2} />
      {/* string lights, sagging a little between hooks */}
      {bulbs.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, CAB_Z + 2.6]}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Neon sign hung under the cove. HTML so the glow stays crisp; sits at the arcade's centre. */
function Sign({ cx }: { cx: number }) {
  return (
    <group position={[cx, 6.2, WALL_Z + 1.2]}>
      <Html center zIndexRange={[15, 0]} style={{ pointerEvents: 'none' }}>
        <div className="neon-sign"><span>ARCADE</span></div>
      </Html>
      <pointLight position={[0, -0.5, 1.5]} color={NEON.pink} intensity={24} distance={16} decay={2} />
    </group>
  )
}

/** A pinball table at one end of the row. */
function Pinball({ x }: { x: number }) {
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1d2233', roughness: 0.5 }), [])
  const play = useMemo(() => new THREE.MeshStandardMaterial({ color: NEON.amber, emissive: NEON.amber, emissiveIntensity: 0.9, roughness: 0.3 }), [])
  const back = useMemo(() => new THREE.MeshStandardMaterial({ color: NEON.pink, emissive: NEON.pink, emissiveIntensity: 1.1, roughness: 0.4 }), [])
  const leg = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c9c2b8', roughness: 0.3, metalness: 0.8 }), [])
  useEffect(() => () => { body.dispose(); play.dispose(); back.dispose(); leg.dispose() }, [body, play, back, leg])
  return (
    <group position={[x, 0, CAB_Z]} rotation={[0, -0.35, 0]}>
      {[-0.55, 0.55].map((dx) => [-0.9, 0.9].map((dz) => (
        <mesh key={`${dx}${dz}`} position={[dx, 0.45, dz]} material={leg}><cylinderGeometry args={[0.04, 0.05, 0.9, 8]} /></mesh>
      )))}
      <mesh position={[0, 1.15, 0]} rotation={[0.12, 0, 0]} material={body}><boxGeometry args={[1.5, 0.5, 2.6]} /></mesh>
      <mesh position={[0, 1.42, 0]} rotation={[0.12, 0, 0]} material={play}><boxGeometry args={[1.3, 0.04, 2.35]} /></mesh>
      <mesh position={[0, 2.3, -1.2]} material={body}><boxGeometry args={[1.5, 1.7, 0.4]} /></mesh>
      <mesh position={[0, 2.35, -0.98]} material={back}><boxGeometry args={[1.25, 1.3, 0.05]} /></mesh>
      <pointLight position={[0, 2.2, 0.6]} color={NEON.amber} intensity={10} distance={7} decay={2} />
    </group>
  )
}

/** A glowing soda machine at the other end. */
function Vending({ x }: { x: number }) {
  const body = useMemo(() => new THREE.MeshStandardMaterial({ color: '#26314a', roughness: 0.45 }), [])
  const face = useMemo(() => new THREE.MeshStandardMaterial({ color: NEON.teal, emissive: NEON.teal, emissiveIntensity: 1.0, roughness: 0.3 }), [])
  const slot = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d1018', roughness: 0.8 }), [])
  useEffect(() => () => { body.dispose(); face.dispose(); slot.dispose() }, [body, face, slot])
  return (
    <group position={[x, 0, CAB_Z]}>
      <mesh position={[0, 1.9, 0]} material={body}><boxGeometry args={[1.5, 3.8, 1.3]} /></mesh>
      <mesh position={[-0.2, 2.35, 0.66]} material={face}><boxGeometry args={[0.85, 2.3, 0.05]} /></mesh>
      <mesh position={[0.5, 2.6, 0.66]} material={slot}><boxGeometry args={[0.35, 1.5, 0.05]} /></mesh>
      <mesh position={[0, 0.55, 0.66]} material={slot}><boxGeometry args={[1.1, 0.5, 0.05]} /></mesh>
      <pointLight position={[0, 2.4, 1.2]} color={NEON.teal} intensity={12} distance={7} decay={2} />
    </group>
  )
}

/* ------------------------------------------------------------------ cabinet */

export function Cabinet({ game, x, state, onOpen }: { game: WorldGame; x: number; state: 'idle' | 'near' | 'open'; onOpen: () => void }) {
  const { t } = useI18n()
  const color = useMemo(() => gameColor(game.hue), [game.hue])
  const bright = useMemo(() => gameColor(game.hue, 0.6, 0.7), [game.hue])
  const mats = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: '#171c28', roughness: 0.55, metalness: 0.1 }),
    side: new THREE.MeshStandardMaterial({ color: gameColor(game.hue, 0.4, 0.34), roughness: 0.5 }),
    panel: new THREE.MeshStandardMaterial({ color: '#232a3a', roughness: 0.4, metalness: 0.2 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#d9d2c4', roughness: 0.25, metalness: 0.8 }),
    marquee: new THREE.MeshStandardMaterial({ color: color, emissive: new THREE.Color(color), emissiveIntensity: 1.2, roughness: 0.6 }),
    screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.25), toneMapped: false }),
  }), [game.hue, color])
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])
  const geos = useMemo(() => ({
    body: new THREE.BoxGeometry(CAB.w, CAB.h, CAB.d),
    side: new THREE.BoxGeometry(0.06, CAB.h - 0.3, CAB.d - 0.2),
    kick: new THREE.BoxGeometry(CAB.w - 0.2, 0.35, CAB.d - 0.3),
    panel: new THREE.BoxGeometry(CAB.w - 0.1, 0.22, 0.9),
    marquee: new THREE.BoxGeometry(CAB.w + 0.1, 0.55, 0.5),
    screenFrame: new THREE.BoxGeometry(1.9, 1.5, 0.12),
    screen: new THREE.PlaneGeometry(1.7, 1.3),
    button: new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12),
    stick: new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8),
    ball: new THREE.SphereGeometry(0.08, 10, 8),
  }), [])
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos])
  const light = useRef<THREE.PointLight>(null)
  const [hover, setHover] = useState(false)
  const lit = state !== 'idle'
  const tmp = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-5 * dt)
    if (state === 'idle') tmp.set(color).multiplyScalar(0.3)
    else tmp.set(bright).multiplyScalar(state === 'open' ? 1.35 : 1.0)
    mats.screen.color.lerp(tmp, k)
    mats.marquee.emissiveIntensity = THREE.MathUtils.damp(mats.marquee.emissiveIntensity, state === 'open' ? 2.4 : lit ? 1.8 : 1.0, 5, dt)
    if (light.current) light.current.intensity = THREE.MathUtils.damp(light.current.intensity, state === 'open' ? 40 : lit ? 24 : 6, 5, dt)
  })

  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (lit) onOpen() }

  return (
    <group position={[x, 0, CAB_Z]}>
      <mesh geometry={geos.body} material={mats.body} position={[0, CAB.h / 2, 0]} />
      <mesh geometry={geos.side} material={mats.side} position={[-CAB.w / 2 - 0.03, CAB.h / 2, 0]} />
      <mesh geometry={geos.side} material={mats.side} position={[CAB.w / 2 + 0.03, CAB.h / 2, 0]} />
      <mesh geometry={geos.kick} material={mats.panel} position={[0, 0.18, CAB.d / 2 - 0.1]} />
      <group position={[0, 2.05, CAB.d / 2 + 0.3]} rotation={[-0.28, 0, 0]}>
        <mesh geometry={geos.panel} material={mats.panel} />
        <mesh geometry={geos.stick} material={mats.chrome} position={[-0.55, 0.25, 0]} />
        <mesh geometry={geos.ball} material={mats.side} position={[-0.55, 0.42, 0]} />
        <mesh geometry={geos.button} material={mats.side} position={[0.15, 0.13, 0]} />
        <mesh geometry={geos.button} material={mats.chrome} position={[0.45, 0.13, -0.1]} />
        <mesh geometry={geos.button} material={mats.side} position={[0.75, 0.13, 0]} />
      </group>
      <group position={[0, 2.85, CAB.d / 2 - 0.2]} rotation={[-0.12, 0, 0]}>
        <mesh geometry={geos.screenFrame} material={mats.panel} />
        <mesh
          geometry={geos.screen}
          material={mats.screen}
          position={[0, 0, 0.07]}
          onClick={click}
          onPointerOver={(e) => { e.stopPropagation(); setHover(true) }}
          onPointerOut={() => setHover(false)}
        />
        {lit && (
          <Html center position={[0, 0, 0.1]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
            <div className={`cab-screen ${state === 'open' ? 'open' : ''} ${hover ? 'hover' : ''}`}>
              <small className="meta">{game.engine} · {game.year}</small>
              {state === 'near' && <span className="meta hint">{t('gw_open')}</span>}
            </div>
          </Html>
        )}
      </group>
      <mesh geometry={geos.marquee} material={mats.marquee} position={[0, CAB.h + 0.2, 0.1]} />
      <Html center position={[0, CAB.h + 0.2, 0.4]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="cab-marquee">{game.title}</div>
      </Html>
      {/* the cabinet's own light, spilling its colour onto the floor and the player */}
      <pointLight ref={light} position={[0, 2.6, CAB.d / 2 + 1.4]} color={bright} intensity={6} distance={9} decay={2} />
    </group>
  )
}

export default function ArcadeRoom(props: RoomProps) {
  return <Room {...props} />
}

useGLTF.preload(CITY_URL)
