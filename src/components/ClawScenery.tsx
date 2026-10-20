import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import heartUrl from '../assets/about/heart.webp'
import posterA from '../assets/posters/poster-05.webp'
import posterB from '../assets/posters/poster-09.webp'
import posterC from '../assets/posters/poster-10.webp'
import posterD from '../assets/posters/poster-13.webp'
import posterE from '../assets/posters/poster-03.webp'

/**
 * The claw machine's corner. First version (2026-10-20) borrowed the pond's night sky — moon, stars, aqua/blue haze —
 * and Ana hated it ("não gosto dessa estética de universo, super brega"); then a dark empty room was "muito morto, traga
 * vida". Now: a corner of the same arcade as the Games page — glazed pink relief-tile wall, cream/sage checker floor, her
 * posters taped up, a string of fairy lights, a pink neon heart, two paper lanterns — with her glass hearts and soft
 * glints floating around the machine.
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

const WALL_Z = -1.75

const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

/** cream / sage checker with worn grout and grime (the arcade's floor), reflecting a little */
function Floor() {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512
    const g = c.getContext('2d')!, r = rnd(7), n = 8, s = 512 / n
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const dark = (i + j) % 2 === 1, k = 0.9 + r() * 0.12
      g.fillStyle = dark ? `rgb(${(112 * k) | 0},${(132 * k) | 0},${(84 * k) | 0})` : `rgb(${(226 * k) | 0},${(224 * k) | 0},${(200 * k) | 0})`
      g.fillRect(i * s, j * s, s, s)
      g.fillStyle = 'rgba(60,70,40,.25)'; g.fillRect(i * s, j * s, s, 2); g.fillRect(i * s, j * s, 2, s)
    }
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(60,70,40,${r() * 0.14})`; g.fillRect(r() * 512, r() * 512, 3, 3) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); t.anisotropy = 8
    return t
  }, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y - 0.002, -2]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <MeshReflectorMaterial
        map={map} color="#b8b3a6" roughness={0.5} metalness={0} envMapIntensity={0.4}
        blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={0.9} mirror={0.3} depthScale={0}
      />
    </mesh>
  )
}

/**
 * The back wall: glazed relief tiles, interleaved (Ana, 2026-10-20: "troca os green tiles para esse rosa", then "intercala
 * entre esses"). Every image in `src/assets/tiles/` is one tile; they are laid out in a BLOCK×BLOCK pattern where no tile
 * touches a copy of itself (index = (i + 2j) mod n: neighbours differ by 1 and 2, and the block of n×n repeats seamlessly), baked into one canvas (colour) plus its blurred luminance (bump = the relief), and that block
 * repeats over the wall. Drop a new tile image in the folder and it joins the pattern.
 */
const TILE_URLS = Object.values(import.meta.glob('../assets/tiles/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default', query: '?url' })) as string[]
const TILE_SIZE = 0.42
function Wall() {
  const imgs = useLoader(THREE.ImageLoader, TILE_URLS) as HTMLImageElement[]
  const [map, bump] = useMemo(() => {
    const n = imgs.length, BLOCK = n >= 3 ? n : 4, px = 256, S = px * BLOCK
    const col = document.createElement('canvas'); col.width = col.height = S
    const g = col.getContext('2d')!
    // a shuffled diagonal pattern: neighbours (also across the repeat seam) are always different tiles when n ≥ 3
    for (let j = 0; j < BLOCK; j++) for (let i = 0; i < BLOCK; i++) {
      const img = imgs[n >= 3 ? (i + 2 * j) % n : (i + j) % n]
      const sq = Math.min(img.width, img.height)
      g.save(); g.translate(i * px + px / 2, j * px + px / 2)
      if (n === 1) g.rotate(((i + j) % 4) * (Math.PI / 2)) // one tile alone: turn it, so the wall isn't a stamp
      g.drawImage(img, (img.width - sq) / 2, (img.height - sq) / 2, sq, sq, -px / 2, -px / 2, px, px)
      g.restore()
    }
    const bmp = document.createElement('canvas'); bmp.width = bmp.height = S
    const b = bmp.getContext('2d')!
    b.filter = 'grayscale(1) blur(1.2px) contrast(1.6)'; b.drawImage(col, 0, 0)
    const mk = (c: HTMLCanvasElement, srgb: boolean) => {
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.anisotropy = 8
      if (srgb) t.colorSpace = THREE.SRGBColorSpace
      return t
    }
    const out = [mk(col, true), mk(bmp, false)]
    out.forEach((t) => t.repeat.set(14 / (TILE_SIZE * BLOCK), 6 / (TILE_SIZE * BLOCK)))
    return out
  }, [imgs])
  return (
    <mesh position={[0, FLOOR_Y + 3, WALL_Z]} receiveShadow>
      <planeGeometry args={[14, 6]} />
      <meshPhysicalMaterial map={map} bumpMap={bump} bumpScale={2.2} roughness={0.32} clearcoat={0.6} clearcoatRoughness={0.18} />
    </mesh>
  )
}

/** her posters taped to the tiles, a little crooked */
function Posters() {
  const maps = useTexture([posterA, posterB, posterC, posterD, posterE])
  useMemo(() => maps.forEach((m) => { m.colorSpace = THREE.SRGBColorSpace; m.anisotropy = 8 }), [maps])
  const items: [number, number, number, number][] = [
    // x, y (centre), height, tilt
    [-2.6, 0.45, 0.85, 0.05], [-1.55, 1.55, 0.72, -0.07], [-3.4, 1.05, 0.8, -0.04], [2.3, 1.2, 1.0, -0.05], [3.05, 0.25, 0.78, 0.06],
  ]
  return (
    <>
      {items.map(([x, y, h, rot], i) => {
        const img = maps[i].image as HTMLImageElement, w = h * (img.width / img.height)
        return (
          <group key={i} position={[x, y, WALL_Z + 0.012 + i * 0.002]} rotation={[0, 0, rot]}>
            <mesh receiveShadow><planeGeometry args={[w, h]} /><meshStandardMaterial map={maps[i]} roughness={0.7} /></mesh>
            {/* tape on two corners */}
            {[[-1, 1], [1, 1]].map(([sx, sy], k) => (
              <mesh key={k} position={[(sx * w) / 2 - sx * 0.02, (sy * h) / 2 - 0.02, 0.003]} rotation={[0, 0, sx * 0.6]}>
                <planeGeometry args={[0.16, 0.05]} /><meshStandardMaterial color="#efe6cf" transparent opacity={0.72} roughness={0.6} />
              </mesh>
            ))}
          </group>
        )
      })}
    </>
  )
}

/** a string of warm fairy lights draped across the wall in two swags; bulbs twinkle */
function FairyLights() {
  const { curve, bulbs } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const hooks = [-3.6, -1.2, 1.3, 3.7], top = 2.25
    for (let k = 0; k < hooks.length - 1; k++) {
      const a = hooks[k], b = hooks[k + 1]
      for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector3(a + (b - a) * t, top - Math.sin(Math.PI * t) * 0.42, WALL_Z + 0.06 + Math.sin(Math.PI * t) * 0.08)) }
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const bulbs = Array.from({ length: 34 }, (_, i) => ({ p: curve.getPointAt((i + 0.5) / 34), ph: i * 2.3 }))
    return { curve, bulbs }
  }, [])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const base = useMemo(() => new THREE.Color('#ffc983'), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const k = 2.2 + Math.sin(t * 1.1 + bulbs[i].ph) * 0.8 + Math.pow(Math.max(0, Math.sin(t * 0.37 + bulbs[i].ph * 1.7)), 12) * 2
      ;(m.material as THREE.MeshBasicMaterial).color.copy(base).multiplyScalar(k)
    })
  })
  return (
    <group>
      <mesh><tubeGeometry args={[curve, 160, 0.006, 5, false]} /><meshStandardMaterial color="#2b2622" roughness={0.6} /></mesh>
      {bulbs.map((b, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el }} position={[b.p.x, b.p.y - 0.03, b.p.z]}>
          <sphereGeometry args={[0.022, 10, 8]} /><meshBasicMaterial color="#ffc983" toneMapped={false} />
        </mesh>
      ))}
      {/* the string washes the tiles with warm light */}
      <pointLight position={[-2.4, 1.9, WALL_Z + 0.5]} color="#ffbf80" intensity={1.6} distance={3.2} decay={2} />
      <pointLight position={[2.5, 1.9, WALL_Z + 0.5]} color="#ffbf80" intensity={1.6} distance={3.2} decay={2} />
    </group>
  )
}

/** a pink neon heart on the wall, left of the machine; buzzes now and then */
function NeonHeart() {
  const curve = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * Math.PI * 2
      const x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      pts.push(new THREE.Vector3(x * 0.018, y * 0.018, 0))
    }
    return new THREE.CatmullRomCurve3(pts, true)
  }, [])
  const tube = useRef<THREE.MeshBasicMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const pink = useMemo(() => new THREE.Color('#ff8fb3'), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const flick = Math.sin(t * 0.7) > 0.985 ? 0.35 + Math.random() * 0.4 : 1 // a rare flicker, like a real tube
    tube.current?.color.copy(pink).multiplyScalar(2.6 * flick)
    if (light.current) light.current.intensity = 1.4 * flick
  })
  return (
    <group position={[-2.5, 1.45, WALL_Z + 0.06]} rotation={[0, 0, 0.08]}>
      <mesh><tubeGeometry args={[curve, 200, 0.014, 8, true]} /><meshBasicMaterial ref={tube} color="#ff8fb3" toneMapped={false} /></mesh>
      <pointLight ref={light} position={[0, 0, 0.25]} color="#ff7aa6" intensity={1.4} distance={2.2} decay={2} />
    </group>
  )
}

/** two paper lanterns hanging in front of the wall (the arcade's), glowing */
function Lantern({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256
    const g = c.getContext('2d')!
    g.fillStyle = color; g.fillRect(0, 0, 64, 256)
    g.fillStyle = 'rgba(70,40,40,.28)'; for (let yy = 6; yy < 256; yy += 14) g.fillRect(0, yy, 64, 2)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [color])
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (g.current) g.current.rotation.z = Math.sin(clock.elapsedTime * 0.6 + x) * 0.025 })
  return (
    <group ref={g} position={[x, 3.4, z]}>
      <mesh position={[0, (y - 3.4) / 2, 0]}><cylinderGeometry args={[0.006, 0.006, 3.4 - y, 5]} /><meshStandardMaterial color="#2b2026" /></mesh>
      <group position={[0, y - 3.4, 0]}>
        <mesh scale={[1, 0.82, 1]}><sphereGeometry args={[0.26, 24, 18]} /><meshStandardMaterial map={map} emissiveMap={map} emissive="#ffd9a8" emissiveIntensity={1.2} roughness={0.9} /></mesh>
        <mesh position={[0, 0.23, 0]}><cylinderGeometry args={[0.07, 0.08, 0.05, 12]} /><meshStandardMaterial color="#2b2026" roughness={0.8} /></mesh>
        <mesh position={[0, -0.23, 0]}><cylinderGeometry args={[0.08, 0.07, 0.05, 12]} /><meshStandardMaterial color="#2b2026" roughness={0.8} /></mesh>
        <pointLight color="#ffc890" intensity={2.2} distance={3.5} decay={2} />
      </group>
    </group>
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
      <Wall />
      <Posters />
      <FairyLights />
      <NeonHeart />
      <Lantern x={-3.15} y={1.68} z={-0.7} color="#f4b8cb" />
      <Lantern x={2.9} y={1.72} z={-0.8} color="#f3e2b8" />
      <Floor />
      <Spill />
      <Hearts />
      <Glints />
    </group>
  )
}
