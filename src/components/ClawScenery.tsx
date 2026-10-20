import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import Glow from './Glow'

/**
 * The claw machine's night (Ana, 2026-10-20: "a cena ficou sem vida, sem iluminação bem blend; pegue inspiração da tela
 * de projetos"): the same night as the lily pond — navy sky with a cream moon and aqua/blue haze, fireflies, bloom — and
 * the machine as the light source of its own corner: a warm tube under the top plate lights the display, the glow spills
 * out onto a dark, softly reflecting floor that dissolves into the page colour.
 * World units: the cabinet spans x −1.02…1.03, y −0.855…1.65, the glass front at z ≈ 1.0.
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

/** light falling out of the glass onto the floor in front of the machine */
function Spill() {
  const tex = useMemo(() => radial([[0, 'rgba(255,226,196,.55)'], [0.4, 'rgba(150,215,205,.18)'], [1, 'rgba(12,13,18,0)']]), [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.003, 1.35]}>
      <planeGeometry args={[2.8, 1.6]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
    </mesh>
  )
}

/** fireflies / dust in the light around the cabinet — bright enough for the bloom */
function Motes({ n = 16 }: { n?: number }) {
  const tex = useMemo(() => radial([[0, 'rgba(255,250,228,1)'], [0.3, 'rgba(255,240,205,.7)'], [1, 'rgba(255,240,205,0)']]), [])
  const seeds = useMemo(() => Array.from({ length: n }, (_, i) => ({
    x: Math.sin(i * 12.9898) * 1.75, y: -0.45 + ((i * 0.618) % 1) * 2.3, z: -0.6 + ((i * 0.37) % 1) * 2.2,
    sp: 0.25 + (i % 4) * 0.08, ph: i * 1.7, s: 0.026 + (i % 3) * 0.01,
    tint: ['#ffd9a8', '#c8ffe6', '#ffc6d9', '#d6e8ff'][i % 4],
  })), [n])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((sp, i) => {
      if (!sp) return
      const s = seeds[i]
      sp.position.set(s.x + Math.sin(t * s.sp + s.ph) * 0.12, s.y + Math.sin(t * s.sp * 0.7 + s.ph * 2) * 0.1, s.z + Math.cos(t * s.sp * 0.6 + s.ph) * 0.1)
      sp.material.opacity = 0.3 + Math.sin(t * 0.9 + s.ph) * 0.25
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

/** a dusting of tiny far stars, twinkling */
function Stars() {
  const tex = useMemo(() => radial([[0, 'rgba(255,245,235,1)'], [0.4, 'rgba(255,245,235,.5)'], [1, 'rgba(255,245,235,0)']]), [])
  const dots = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: Math.sin(i * 12.9898) * 5.2, y: 0.4 + Math.abs(Math.cos(i * 78.233)) * 3.2, z: -4.2 - (i % 5) * 0.5, s: 0.03 + (i % 3) * 0.018, ph: i })), [])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => { refs.current.forEach((s, i) => { if (s) s.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 1.3 + dots[i].ph) * 0.3 }) })
  return (
    <>
      {dots.map((d, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} position={[d.x, d.y, d.z]} scale={[d.s, d.s, 1]} renderOrder={-100}>
          <spriteMaterial map={tex} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} fog={false} opacity={0.6} />
        </sprite>
      ))}
    </>
  )
}

export default function ClawScenery() {
  return (
    <group>
      {/* the pond's sky: cream moon top-right, aqua/blue haze low-left, a little pink behind the right side */}
      <Glow backdrop x={1.9} y={2.5} z={-4.6} s={5} inner="rgba(255,236,220,.7)" outer="rgba(170,200,215,.2)" />
      <Glow backdrop x={-2.3} y={0.5} z={-3.6} s={5} inner="rgba(120,205,210,.32)" outer="rgba(80,140,200,.1)" />
      <Glow backdrop x={1.7} y={-0.1} z={-2.6} s={3} inner="rgba(242,160,180,.2)" outer="rgba(242,160,180,.06)" />
      <Stars />

      {/* the machine lights its own corner: a warm tube under the top plate + a cool bounce off the felt */}
      <mesh position={[0, 1.262, 0.9]}>{/* just under the plate (y 1.29), behind the glass (z 0.98) */}
        <boxGeometry args={[1.58, 0.014, 0.02]} />
        <meshBasicMaterial color="#fff6e8" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.2, 0.3]} color="#ffe9d2" intensity={1.7} distance={2.6} decay={1.6} />
      <pointLight position={[-0.3, 0.4, -0.5]} color="#8fd8d0" intensity={0.35} distance={1.6} decay={1.8} />

      <Floor />
      <Spill />
      <Motes />
    </group>
  )
}
