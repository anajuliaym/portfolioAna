import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { radial, StringLights, Lantern, Hearts, Glints } from './Decor'
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
      {/* glossy tiles from the room's reflections (no mirror pass: that rendered the whole scene a second time) */}
      <meshStandardMaterial map={map} color="#b8b3a6" roughness={0.38} metalness={0} envMapIntensity={0.8} />
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

/** the string of fairy lights across the wall (two swags) + the two broad washes that stand in for every bulb and lantern
 * (each point light is paid by every pixel of the scene) */
const FAIRY_HOOKS: [number, number, number][] = [[-3.6, 2.25, WALL_Z + 0.06], [-1.2, 2.25, WALL_Z + 0.06], [1.3, 2.25, WALL_Z + 0.06], [3.7, 2.25, WALL_Z + 0.06]]
function FairyLights() {
  return (
    <group>
      <StringLights hooks={FAIRY_HOOKS} sag={0.42} bulge={0.08} />
      <pointLight position={[-2.3, 1.7, WALL_Z + 0.7]} color="#ffbf80" intensity={5} distance={5.5} decay={2} />
      <pointLight position={[2.4, 1.7, WALL_Z + 0.7]} color="#ffbf80" intensity={5} distance={5.5} decay={2} />
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

const HEARTS: [number, number, number, number][] = [
  [-1.6, 1.3, 0.2, 0.22], [1.7, 1.1, 0.4, 0.17], [-1.45, -0.25, 1.0, 0.16], [1.6, -0.4, -0.5, 0.2],
  [0.95, 1.95, -0.8, 0.12], [-0.9, 1.95, -0.5, 0.14], [1.95, 0.3, 1.2, 0.24], [-2.0, 0.55, -1.0, 0.11],
]

export default function ClawScenery() {
  return (
    <group>
      <Wall />
      <Posters />
      <FairyLights />
      <NeonHeart />
      <Lantern x={-1.6} y={1.6} z={-0.9} color="#f4b8cb" />{/* clear of the logo in the top-left corner */}
      <Lantern x={2.9} y={1.45} z={-0.8} color="#f3e2b8" />
      {/* Ana: "aumente as luzes, está muito escuro — talvez mais lanternas" */}
      <Lantern x={-3.4} y={1.25} z={-1.1} color="#f3e2b8" />
      <Lantern x={1.75} y={1.72} z={-1.2} color="#f4b8cb" />
      <Lantern x={4.0} y={1.15} z={-0.5} color="#f4b8cb" />
      <Floor />
      <Spill />
      <Hearts items={HEARTS} />
      <Glints box={[0, 2, -0.5, 2.2, -1, 1.6]} />
    </group>
  )
}

// warm the caches when this chunk is prefetched, so the page opens without waiting on images
useLoader.preload(THREE.ImageLoader, TILE_URLS)
useTexture.preload([posterA, posterB, posterC, posterD, posterE])

