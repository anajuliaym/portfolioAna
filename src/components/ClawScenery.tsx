import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import heartUrl from '../assets/about/heart.webp'

/**
 * The claw machine's corner. First version (2026-10-20) borrowed the pond's night sky — moon, stars, aqua/blue haze —
 * and Ana hated it ("não gosto dessa estética de universo, super brega"). Now: a dark, neutral room, one warm light from
 * above pooling on the floor, the machine lit from inside, and her glass hearts and soft glints floating around it.
 * World units: the cabinet spans x −1.02…1.03, y −0.855…1.65, the glass front at z ≈ 1.0 (before the machine's yaw).
 */
export const FLOOR_Y = -0.855

const radial = (stops: [number, string][]) => {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  stops.forEach(([o, col]) => r.addColorStop(o, col))
  g.fillStyle = r; g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** dark floor with a blurred reflection of the machine; nearly the page colour, so the fog melts it into the night */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.002, -2]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <MeshReflectorMaterial
        color="#07090c" roughness={0.9} metalness={0} envMapIntensity={0}
        blur={[360, 90]} resolution={512} mixBlur={1} mixStrength={1.4} mirror={0.4} depthScale={0}
      />
    </mesh>
  )
}

/** the pool of the overhead light on the floor, brightest just in front of the machine */
function Spill() {
  const tex = useMemo(() => radial([[0, 'rgba(255,230,205,.32)'], [0.45, 'rgba(255,220,195,.1)'], [1, 'rgba(12,13,18,0)']]), [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.1, FLOOR_Y + 0.003, 0.9]}>
      <planeGeometry args={[4.4, 3.2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
    </mesh>
  )
}

/** her glass hearts drifting slowly around the machine, some in front of it, some behind */
function Hearts() {
  const heart = useTexture(heartUrl)
  const items = useMemo(() => [
    [-1.6, 1.3, 0.2, 0.22], [1.7, 1.1, 0.4, 0.17], [-1.45, -0.25, 1.0, 0.16], [1.6, -0.4, -0.5, 0.2],
    [0.95, 1.95, -0.8, 0.12], [-0.9, 1.95, -0.5, 0.14], [1.95, 0.3, 1.2, 0.24], [-2.0, 0.55, -1.0, 0.11],
  ].map(([x, y, z, s], i) => ({ x, y, z, s, ph: i * 1.9 })), [])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((sp, i) => {
      if (!sp) return
      const it = items[i]
      sp.position.set(it.x + Math.sin(t * 0.21 + it.ph) * 0.05, it.y + Math.sin(t * 0.5 + it.ph) * 0.07, it.z)
      sp.material.rotation = Math.sin(t * 0.4 + it.ph) * 0.2
    })
  })
  return (
    <>
      {items.map((it, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} position={[it.x, it.y, it.z]} scale={[it.s, it.s * 0.89, 1]}>
          <spriteMaterial map={heart} transparent depthWrite={false} fog={false} />
        </sprite>
      ))}
    </>
  )
}

/** soft glints twinkling in the air (bright enough for the bloom) */
function Glints({ n = 22 }: { n?: number }) {
  const tex = useMemo(() => radial([[0, 'rgba(255,250,240,1)'], [0.18, 'rgba(255,240,225,.75)'], [1, 'rgba(255,240,225,0)']]), [])
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({
    x: Math.sin(i * 12.9898) * 2.0, y: -0.5 + ((i * 0.618) % 1) * 2.7, z: -1.0 + ((i * 0.37) % 1) * 2.6,
    sp: 0.2 + (i % 4) * 0.07, ph: i * 1.7, s: 0.02 + (i % 3) * 0.012,
    tint: ['#fff3e0', '#ffd6e2', '#e6fff4'][i % 3],
  })), [n])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((sp, i) => {
      if (!sp) return
      const s = seeds[i]
      sp.position.set(s.x + Math.sin(t * s.sp + s.ph) * 0.1, s.y + Math.sin(t * s.sp * 0.7 + s.ph * 2) * 0.12, s.z)
      // a slow twinkle: mostly dim, now and then a bright flash
      const k = Math.max(0, Math.sin(t * (0.6 + (i % 5) * 0.15) + s.ph))
      sp.material.opacity = 0.15 + Math.pow(k, 6) * 0.85
      sp.scale.setScalar(s.s * (0.7 + Math.pow(k, 6) * 0.8))
    })
  })
  return (
    <>
      {seeds.map((s, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} scale={[s.s, s.s, 1]}>
          <spriteMaterial map={tex} color={s.tint} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
        </sprite>
      ))}
    </>
  )
}

export default function ClawScenery() {
  return (
    <group>
      <Floor />
      <Spill />
      <Hearts />
      <Glints />
    </group>
  )
}
