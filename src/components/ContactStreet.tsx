import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, useGLTF, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { SceneReady } from './SceneReady'
import { useOnScreen } from './useOnScreen'
import { useAdaptiveDpr } from './AdaptiveDpr'
import { LOW_POWER, useGLRecovery } from './glRecovery'
import { Glints, Hearts, Lantern, StringLights, radial } from './Decor'
import StreetDressing from './StreetDressing'
import { asphaltRoughness, photoMaps, plankMaps, timberMaps, withRepeat } from './StreetTextures'
import plasterUrl from '../assets/street/plaster.jpg'
import asphaltUrl from '../assets/street/asphalt.jpg'
import paversUrl from '../assets/street/pavers.jpg'
import shojiUrl from '../assets/street/shoji.jpg'
import GlbProp, { LILIES_URL } from './GlbProp'
import tileArt from '../assets/tiles/01-petalas.jpg'
import posterBike from '../assets/posters/poster-02.webp'
import posterRadio from '../assets/posters/poster-12.webp'

/**
 * Contact = a Japanese back street at dusk (Ana picked idea 1 on 2026-10-20 — "a caixa de correio" — from the Figma concept
 * in docs/ideias-contato/img/1-caixa-de-correio.jpg, and sent her mailbox model).
 * Third composition, after "muito escuro / parece terror" and then "o chão marrom, a parede suja, não chega nem perto da
 * imagem": like the concept, the camera looks DOWN the street — wet asphalt in the middle reflecting the lanterns, grey
 * stone pavements, clean machiya-style fronts (cream plaster in dusty-rose timber, her pink relief tiles at the bottom).
 * Her mailbox stands on a pink post on the right pavement, big in the foreground, under a pink neon "deixe um recado ↓";
 * Instagram / LinkedIn / e-mail hang as coquette plaques with satin bows from a string across the street; the vending
 * machine glows further down, a prop. Metres, y up, the street runs toward −z.
 * Performance (the Skills lesson): a handful of real lights; lanterns, bulbs, windows and the neon core only glow.
 */
const BG = '#262538' // dusky indigo: night, but a soft one
const HAZE = '#6b5c82' // the street's far end: lilac dusk haze
const PLASTER_R: [number, number, number] = [246, 234, 226], PLANKS_R: [number, number, number] = [222, 168, 176]
const PLASTER_L: [number, number, number] = [234, 220, 222], PLANKS_L: [number, number, number] = [214, 172, 180]
const MAILBOX_URL = '/models/mailbox.glb'
const VENDING_URL = '/models/vending.glb'
const ROAD = { x0: -1.15, x1: 0.8 } // asphalt
const STREET_ROAD: [number, number] = [ROAD.x0, ROAD.x1]
const R = 1.65 // right facades (face −x)
const L = -2.05 // left facades (face +x)
const KERB = 0.1 // pavement height
const Z0 = 9, Z1 = -20 // street extent (it runs on behind the camera, for the phones' wider view)
/** the mailbox on its post, right pavement, in the foreground (Ana: "muito maior… a ênfase no mailbox"): 95 cm */
export const MAILBOX_AT = new THREE.Vector3(1.12, 1.36, 1.55)
const MAILBOX_H = 0.95
const MAILBOX_YAW = -0.42 // turned toward the camera

/** what the street offers the visitor */
export type StreetProps = {
  email: string
  links: [string, string][]
  copied: boolean
  labels: { letterKicker: string; letter: string; copy: string; copied: string; open: string }
  onLetter: () => void
  onCopy: () => void
  /** where the mailbox's slot is on screen (client px), kept up to date every frame: the letter rises from it and the envelope flies back into it */
  slot?: MutableRefObject<{ x: number; y: number } | null>
  /** bumped when a letter goes in: the mailbox gives a little jolt */
  poke?: number
}

const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const tex = (c: HTMLCanvasElement, srgb = true, repeat?: [number, number]) => {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) }
  return t
}

/* ---------------------------------------------------------------------------------------------- ground */

function Ground() {
  const zc = (Z0 + Z1) / 2, zl = Z0 - Z1
  const [asph, pav] = useTexture([asphaltUrl, paversUrl])
  const road = useMemo(() => {
    const m = photoMaps(asph, (ROAD.x1 - ROAD.x0) / 2.2, zl / 2.2)
    const roughnessMap = asphaltRoughness().clone(); roughnessMap.repeat.set((ROAD.x1 - ROAD.x0) / 3, zl / 3); roughnessMap.needsUpdate = true
    return { ...m, roughnessMap }
  }, [asph, zl])
  const right = useMemo(() => photoMaps(pav, (R - ROAD.x1) / 1.8, zl / 1.8), [pav, zl])
  const left = useMemo(() => photoMaps(pav, (ROAD.x0 - L) / 1.8, zl / 1.8), [pav, zl])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(ROAD.x0 + ROAD.x1) / 2, 0, zc]} receiveShadow>
        <planeGeometry args={[ROAD.x1 - ROAD.x0, zl]} />
        {/* the one mirror of the scene: the wet road carries the lanterns, the neon, the sky and the lit end of the street */}
        <MeshReflectorMaterial map={road.map} roughnessMap={road.roughnessMap} bumpMap={road.bumpMap} bumpScale={0.6} roughness={1} metalness={0}
          blur={[160, 40]} resolution={512} mixBlur={0.5} mixStrength={1.6} mixContrast={1} mirror={0.6} depthScale={0} />
      </mesh>
      {/* pavements a kerb's height up, granite kerbstones along the edge */}
      {([[ROAD.x1, R, right], [L, ROAD.x0, left]] as const).map(([a, b, m], i) => (
        <group key={i}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(a + b) / 2, KERB, zc]} receiveShadow>
            <planeGeometry args={[b - a, zl]} /><meshStandardMaterial map={m.map} bumpMap={m.bumpMap} bumpScale={1.5} roughness={0.6} envMapIntensity={0.7} />
          </mesh>
          <mesh position={[i ? b - 0.06 : a + 0.06, KERB / 2, zc]} castShadow receiveShadow><boxGeometry args={[0.12, KERB, zl]} /><meshStandardMaterial color="#a39ea8" roughness={0.75} /></mesh>
        </group>
      ))}
    </group>
  )
}

/** dusk over the rooftops: deep blue overhead fading to a rosy glow where the street ends */
function Sky() {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 256
    const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 256)
    gr.addColorStop(0, '#2c3160'); gr.addColorStop(0.55, '#5a4f86'); gr.addColorStop(0.85, '#b47b9c'); gr.addColorStop(1, '#e8a6a8')
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256)
    return tex(c)
  }, [])
  return (
    <>
      {/* a dome-ish backdrop: a big curved plane behind and above the street, unfogged */}
      <mesh position={[(L + R) / 2, 6, Z1 - 2]}><planeGeometry args={[30, 16]} /><meshBasicMaterial map={map} fog={false} toneMapped={false} /></mesh>
      <mesh position={[(L + R) / 2, 6.5, (Z0 + Z1) / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[12, Z0 - Z1 + 4]} /><meshBasicMaterial color="#262a52" fog={false} toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </>
  )
}

/**
 * Where the street meets a lit cross-street: a soft warm glow on the ground and a hazy bright gap between the last
 * houses — so the road runs INTO something (Ana: "o chão tá preto, ele vai pro nada").
 */
function StreetEnd() {
  const glow = useMemo(() => radial([[0, 'rgba(255,214,186,1)'], [0.35, 'rgba(250,180,170,.45)'], [1, 'rgba(240,160,170,0)']]), [])
  // the cross-street, painted: a hazy warm glow low down, two rows of roof silhouettes with lit windows, fading up
  const map = useMemo(() => {
    const W = 512, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d')!, r = rnd(9)
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8a6f9c'); sky.addColorStop(0.6, '#d49aa8'); sky.addColorStop(1, '#f4c6b6')
    g.fillStyle = sky; g.fillRect(0, 0, W, H)
    const row = (base: number, col: string, win: string, n: number) => {
      let x = -20
      while (x < W) {
        const w = 50 + r() * 70, top = base - 40 - r() * 90
        g.fillStyle = col; g.fillRect(x, top, w, H - top)
        g.beginPath(); g.moveTo(x - 8, top); g.lineTo(x + w / 2, top - 18 - r() * 10); g.lineTo(x + w + 8, top); g.fill() // a pitched roof
        for (let k = 0; k < n; k++) if (r() < 0.55) { g.fillStyle = win; g.fillRect(x + 8 + r() * (w - 24), top + 14 + r() * (H - top - 60), 10, 12); g.fillStyle = col }
        x += w + 2
      }
    }
    row(330, '#9c7d9a', 'rgba(255,220,180,.9)', 3)
    row(400, '#7c6282', 'rgba(255,214,170,1)', 4)
    const mist = g.createLinearGradient(0, H * 0.55, 0, H); mist.addColorStop(0, 'rgba(244,198,182,0)'); mist.addColorStop(1, 'rgba(244,198,182,.85)')
    g.fillStyle = mist; g.fillRect(0, 0, W, H)
    return tex(c)
  }, [])
  return (
    <>
      <mesh position={[(L + R) / 2, 2.4, Z1 + 0.05]}><planeGeometry args={[R - L + 0.2, 4.8]} /><meshBasicMaterial map={map} fog={false} toneMapped={false} /></mesh>
      <sprite position={[(ROAD.x0 + ROAD.x1) / 2, 0.6, Z1 + 0.4]} scale={[5, 2.4, 1]}><spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} opacity={0.55} /></sprite>
    </>
  )
}

/* ---------------------------------------------------------------------------------------------- facades */

const timberMat = () => { const t = timberMaps(); return { map: t.map, bumpMap: t.bumpMap, bumpScale: 1.2, roughness: 0.7 } }

/**
 * A machiya front, built in 3D (Ana: "a parede tá muito simples"): lime plaster above, painted planks below, real
 * timber posts every `bay` metres, a beam and a rail standing proud of the wall so the lamps rake across them.
 */
function Facade({ side, z0, z1, h, plaster, planks, bay = 1.8 }: { side: 'r' | 'l'; z0: number; z1: number; h: number; plaster: [number, number, number]; planks?: [number, number, number]; bay?: number }) {
  const len = z0 - z1, low = 1.05, zc = (z0 + z1) / 2
  const plasterTex = useTexture(plasterUrl)
  const up = useMemo(() => photoMaps(plasterTex, len / 2, (h - low) / 2), [plasterTex, len, h])
  const tint = useMemo(() => new THREE.Color(`rgb(${plaster.join(',')})`), [plaster])
  const down = useMemo(() => planks && withRepeat(plankMaps(planks), len / 1.1, 1), [planks, len])
  const wood = useMemo(timberMat, [])
  const x = side === 'r' ? R : L, dir = side === 'r' ? -1 : 1, rot = side === 'r' ? -Math.PI / 2 : Math.PI / 2
  const posts = useMemo(() => { const out: number[] = []; for (let z = z0; z >= z1; z -= bay) out.push(z); return out }, [z0, z1, bay])
  return (
    <group>
      <mesh position={[x, low + (h - low) / 2, zc]} rotation={[0, rot, 0]} receiveShadow>
        <planeGeometry args={[len, h - low]} /><meshStandardMaterial map={up.map} bumpMap={up.bumpMap} bumpScale={3} roughness={0.92} color={tint} />
      </mesh>
      <mesh position={[x, low / 2, zc]} rotation={[0, rot, 0]} receiveShadow>
        <planeGeometry args={[len, low]} />
        {down ? <meshStandardMaterial map={down.map} bumpMap={down.bumpMap} bumpScale={2} roughness={0.7} /> : <meshStandardMaterial map={up.map} bumpMap={up.bumpMap} bumpScale={3} roughness={0.92} color={tint} />}
      </mesh>
      {posts.map((z) => <mesh key={z} position={[x + dir * 0.04, h / 2, z]} castShadow receiveShadow><boxGeometry args={[0.08, h, 0.12]} /><meshStandardMaterial {...wood} /></mesh>)}
      {[low, 2.62].map((y) => <mesh key={y} position={[x + dir * 0.035, y, zc]} castShadow receiveShadow><boxGeometry args={[0.07, y === low ? 0.07 : 0.12, len]} /><meshStandardMaterial {...wood} /></mesh>)}
    </group>
  )
}

/** the eave over a row of shops: a timber fascia with a little grey tile roof edge */
function Eave({ x, y }: { x: number; y: number }) {
  const wood = useMemo(timberMat, [])
  const dir = x > 0 ? -1 : 1, zc = (Z0 + Z1) / 2, zl = Z0 - Z1
  return (
    <group>
      <mesh position={[x + dir * 0.28, y, zc]} castShadow receiveShadow><boxGeometry args={[0.56, 0.05, zl]} /><meshStandardMaterial {...wood} /></mesh>
      <mesh position={[x + dir * 0.28, y + 0.1, zc]} rotation={[0, 0, dir * 0.32]} castShadow><boxGeometry args={[0.66, 0.05, zl]} /><meshStandardMaterial color="#6f6a7a" roughness={0.5} metalness={0.2} /></mesh>
    </group>
  )
}

/** her pink relief tiles along the bottom of the right-hand shop (the Skills arcade's tile) */
function TileBand({ z0, z1 }: { z0: number; z1: number }) {
  const t = useTexture(tileArt)
  const [map, bump] = useMemo(() => {
    const m = t.clone(); m.colorSpace = THREE.SRGBColorSpace; m.wrapS = m.wrapT = THREE.RepeatWrapping
    m.repeat.set((z0 - z1) / 0.28, 0.9 / 0.28); m.anisotropy = 8; m.needsUpdate = true
    const b = m.clone(); b.colorSpace = THREE.NoColorSpace; b.needsUpdate = true
    return [m, b]
  }, [t, z0, z1])
  return (
    <mesh position={[R - 0.008, KERB + 0.45, (z0 + z1) / 2]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
      <planeGeometry args={[z0 - z1, 0.9]} />
      <meshPhysicalMaterial map={map} bumpMap={bump} bumpScale={1.4} roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.2} />
    </mesh>
  )
}

/**
 * Ana's shoji photo is amber and orange-brown; the street is blush and plum. Gradient-map it once by luminance: the
 * lattice becomes dusty plum, the paper a blush cream (Ana: "muda o tom, não ficou combinando com o resto da cena").
 */
let shojiCache: THREE.Texture | null = null
function shojiInPalette(img: HTMLImageElement) {
  if (shojiCache) return shojiCache
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')!; g.drawImage(img, 0, 0, S, S)
  const d = g.getImageData(0, 0, S, S), px = d.data
  const stops: [number, [number, number, number]][] = [[0, [52, 32, 44]], [0.35, [116, 78, 92]], [0.62, [214, 168, 178]], [1, [255, 244, 238]]]
  for (let i = 0; i < px.length; i += 4) {
    const l = Math.min(1, (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 235)
    let k = 1; while (k < stops.length - 1 && l > stops[k][0]) k++
    const [t0, a] = stops[k - 1], [t1, b] = stops[k], f = Math.min(1, Math.max(0, (l - t0) / (t1 - t0)))
    px[i] = a[0] + (b[0] - a[0]) * f; px[i + 1] = a[1] + (b[1] - a[1]) * f; px[i + 2] = a[2] + (b[2] - a[2]) * f
  }
  g.putImageData(d, 0, 0)
  shojiCache = tex(c)
  return shojiCache
}

/** a lit shoji window (Ana's texture: paper panes in a wooden lattice, glowing from inside), set in a dark frame */
function FacadeWindow({ side, z, y, w = 0.95, h = 0.95, warm = true }: { side: 'r' | 'l'; z: number; y: number; w?: number; h?: number; warm?: boolean }) {
  const x = side === 'l' ? L + 0.01 : R - 0.01
  const shoji = useTexture(shojiUrl)
  const map = useMemo(() => shojiInPalette(shoji.image as HTMLImageElement), [shoji])
  // most rooms glow blush; a "cool" one has a lilac lamp inside
  const glow = useMemo(() => warm ? new THREE.Color(1.25, 1.2, 1.2) : new THREE.Color(1.02, 1, 1.28), [warm])
  return (
    <group position={[x, y, z]} rotation={[0, side === 'l' ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.004]}><planeGeometry args={[w + 0.12, h + 0.12]} /><meshStandardMaterial color="#6e4f4c" roughness={0.7} /></mesh>
      <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={map} color={glow} toneMapped={false} /></mesh>
      <mesh position={[0, -h / 2 - 0.07, 0.03]} castShadow><boxGeometry args={[w + 0.16, 0.035, 0.08]} /><meshStandardMaterial color="#6e4f4c" roughness={0.7} /></mesh>
    </group>
  )
}

/** a noren — the split cloth curtain over a shop door — in soft pink, with a white lily mark */
function Noren({ z, side = 'r' }: { z: number; side?: 'r' | 'l' }) {
  const map = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 400
    const g = c.getContext('2d')!
    g.fillStyle = '#f3b8c8'; g.fillRect(0, 0, 512, 400)
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(170, 120, 6, 280); g.clearRect(338, 120, 6, 280) // the splits
    g.fillStyle = '#fff4f0'; g.font = "italic 400 120px 'Instrument Serif', Georgia, serif"; g.textAlign = 'center'; g.fillText('花', 256, 250)
    return tex(c)
  }, [])
  const x = side === 'r' ? R - 0.06 : L + 0.06
  return (
    <group position={[x, 2.05, z]} rotation={[0, side === 'r' ? -Math.PI / 2 : Math.PI / 2, 0]}>
      <mesh position={[0, -0.1, 0]}><planeGeometry args={[1.0, 0.78]} /><meshStandardMaterial map={map} transparent alphaTest={0.5} side={THREE.DoubleSide} roughness={0.9} /></mesh>
      <mesh position={[0, 0.3, 0.01]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.015, 0.015, 1.1, 8]} /><meshStandardMaterial color="#7a5a4a" /></mesh>
      {/* the door glow behind it */}
      <mesh position={[0, -0.75, -0.03]}><planeGeometry args={[0.9, 1.9]} /><meshBasicMaterial color={new THREE.Color('#ffd7b0').multiplyScalar(1.2)} toneMapped={false} /></mesh>
    </group>
  )
}

function ACUnit({ pos, rotY = 0 }: { pos: [number, number, number]; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh castShadow><boxGeometry args={[0.7, 0.5, 0.26]} /><meshStandardMaterial color="#e8e2da" roughness={0.6} /></mesh>
      <mesh position={[0.12, 0, 0.131]}><circleGeometry args={[0.19, 24]} /><meshStandardMaterial color="#8a8582" roughness={0.5} metalness={0.4} /></mesh>
    </group>
  )
}

/** sagging cables crossing the street, high up */
function Wires() {
  const curves = useMemo(() => [[3.55, -2.5, 0.35], [3.7, -6.5, 0.5], [3.45, -10, 0.3], [3.8, -14, 0.45]].map(([y, z, sag]) => {
    const pts = Array.from({ length: 16 }, (_, i) => { const t = i / 15; return new THREE.Vector3(L + (R - L) * t, y - Math.sin(Math.PI * t) * sag, z + t * 0.5) })
    return new THREE.CatmullRomCurve3(pts)
  }), [])
  return <>{curves.map((c, i) => <mesh key={i}><tubeGeometry args={[c, 40, 0.008, 4, false]} /><meshStandardMaterial color="#2a2630" roughness={0.6} /></mesh>)}</>
}

/** two of her posters on the left-hand shop front */
function WallPosters() {
  const maps = useTexture([posterBike, posterRadio])
  useMemo(() => maps.forEach((m) => { m.colorSpace = THREE.SRGBColorSpace; m.anisotropy = 8 }), [maps])
  const items: [number, number, number][] = [[0.2, 1.55, 0.6], [-1.2, 1.7, 0.48]] // z, y, height
  return (
    <>
      {items.map(([z, y, h], i) => {
        const img = maps[i].image as HTMLImageElement, w = h * (img.width / img.height)
        return (
          <mesh key={i} position={[L + 0.012, y, z]} rotation={[0, Math.PI / 2, i ? 0.04 : -0.03]} receiveShadow>
            <planeGeometry args={[w, h]} /><meshStandardMaterial map={maps[i]} roughness={0.85} color="#efe7df" />
          </mesh>
        )
      })}
    </>
  )
}

/* ---------------------------------------------------------------------------------------------- the mailbox */

/**
 * Ana's mailbox in pink enamel on a pink post. The cast relief (its normals leave the box's axes) is polished brass —
 * so the flowers and "MAIL" read clearly (the model's texture is flat; the relief is geometry) (Ana: "os detalhes estão na mesma cor do resto,
 * não dá pra entender o que tá escrito").
 */
/** the slot, in the mailbox group's frame (the model's mouth sits high on its front face) */
const SLOT_WORLD = new THREE.Vector3(0, 0.2, 0.16).applyEuler(new THREE.Euler(0, MAILBOX_YAW, 0)).add(MAILBOX_AT)

function Mailbox({ onLetter, slot, poke = 0 }: { onLetter: () => void; slot?: StreetProps['slot']; poke?: number }) {
  const { scene } = useGLTF(MAILBOX_URL)
  const s = MAILBOX_H / 0.96
  const box = useRef<THREE.Group>(null)
  const poked = useRef({ n: poke, t: -1 })
  const { camera, gl } = useThree()
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }) => {
    const g = box.current
    if (!g) return
    // the jolt when a letter drops in: a damped wobble and a small squash
    if (poked.current.n !== poke) { poked.current = { n: poke, t: clock.elapsedTime } }
    const k = poked.current.t < 0 ? 99 : clock.elapsedTime - poked.current.t
    const w = Math.exp(-k * 5) * Math.sin(k * 22)
    g.rotation.z = w * 0.06
    g.scale.setScalar(s * (1 + Math.exp(-k * 7) * 0.05 * Math.cos(k * 18)))
    if (slot) {
      tmp.copy(SLOT_WORLD).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      slot.current = { x: r.left + (tmp.x * 0.5 + 0.5) * r.width, y: r.top + (-tmp.y * 0.5 + 0.5) * r.height }
    }
  })
  const model = useMemo(() => {
    const m = scene.clone(true)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = mesh.receiveShadow = true
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
      mat.envMapIntensity = 1.1
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uPaint = { value: new THREE.Color('#f5a8be') }
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vObjN;')
          .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  vObjN = objectNormal;')
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uPaint;\nvarying vec3 vObjN;\nfloat mbWear;')
          .replace('#include <map_fragment>', `#include <map_fragment>
  // the box's panels face the object axes; the cast relief (flowers, letters, rims) does not — that is the brass
  vec3 mbN = abs(normalize(vObjN));
  float mbAxis = max(mbN.x, max(mbN.y, mbN.z));
  mbWear = smoothstep(0.996, 0.955, mbAxis);
  float mbLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 mbPaint = uPaint * (0.55 + mbLum * 0.9);
  vec3 mbBrass = vec3(1.0, 0.8, 0.46) * (0.7 + mbLum * 0.8);
  diffuseColor.rgb = mix(mbPaint, mbBrass, mbWear);`)
          .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = mix(0.05, 1.0, mbWear);')
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.34, 0.26, mbWear);')
      }
      mat.customProgramCacheKey = () => 'mailbox-enamel-v3'
      mesh.material = mat
    })
    return m
  }, [scene])
  const postTop = MAILBOX_AT.y - MAILBOX_H / 2
  return (
    <group>
      {/* the post: pink, with a round foot */}
      <mesh position={[MAILBOX_AT.x, KERB + (postTop - KERB) / 2, MAILBOX_AT.z]} castShadow><cylinderGeometry args={[0.055, 0.065, postTop - KERB, 20]} /><meshStandardMaterial color="#e996ae" roughness={0.35} /></mesh>
      <mesh position={[MAILBOX_AT.x, KERB + 0.03, MAILBOX_AT.z]} castShadow><cylinderGeometry args={[0.16, 0.18, 0.06, 28]} /><meshStandardMaterial color="#e48ea7" roughness={0.4} /></mesh>
      <mesh position={[MAILBOX_AT.x, postTop - 0.02, MAILBOX_AT.z]} rotation={[0, MAILBOX_YAW, 0]} castShadow><boxGeometry args={[0.5, 0.04, 0.3]} /><meshStandardMaterial color="#e996ae" roughness={0.35} /></mesh>
      <group ref={box} position={MAILBOX_AT.toArray()} rotation={[0, MAILBOX_YAW, 0]} scale={s}
        onClick={(e) => { e.stopPropagation(); onLetter() }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}>
        <primitive object={model} />
      </group>
    </group>
  )
}

/** a little street lamp on the facade, lighting the mailbox (the spot's target has to be in the scene) */
function MailboxLamp() {
  const light = useRef<THREE.SpotLight>(null)
  const { scene } = useThree()
  const pos: [number, number, number] = [R - 0.35, 2.75, MAILBOX_AT.z + 0.3]
  useEffect(() => {
    const l = light.current; if (!l) return
    l.target.position.set(MAILBOX_AT.x - 0.2, 0.6, MAILBOX_AT.z); scene.add(l.target)
    return () => { scene.remove(l.target) }
  }, [scene])
  return (
    <group>
      <mesh position={[R - 0.18, 2.8, MAILBOX_AT.z + 0.3]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, 0.36, 8]} /><meshStandardMaterial color="#3a3038" metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[pos[0], pos[1] - 0.04, pos[2]]}><sphereGeometry args={[0.07, 16, 12]} /><meshBasicMaterial color={new THREE.Color('#ffe0b8').multiplyScalar(2.6)} toneMapped={false} /></mesh>
      <mesh position={[pos[0], pos[1] + 0.03, pos[2]]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.14, 0.1, 20, 1, true]} /><meshStandardMaterial color="#3a3038" side={THREE.DoubleSide} metalness={0.5} roughness={0.4} /></mesh>
      <spotLight ref={light} position={pos} angle={0.75} penumbra={0.85} intensity={30} distance={7} decay={2} color="#ffd2a2" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
    </group>
  )
}

/**
 * The main call: a pink neon "deixe um recado ↓" on a clear acrylic plate hanging from a bracket over the mailbox,
 * facing the street. Core tube in HDR (bloom makes the glow), a painted halo, a small pink light, a rare flicker.
 */
function NeonSign({ text }: { text: string }) {
  const [font, setFont] = useState(0)
  useEffect(() => { document.fonts?.load("190px 'Pinyon Script'").then(() => setFont((n) => n + 1)).catch(() => {}) }, [])
  const { core, halo, aspect } = useMemo(() => {
    const W = 1400, H = 360
    const make = (blur: number, width: number, color: string) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const g = c.getContext('2d')!
      g.filter = blur ? `blur(${blur}px)` : 'none'
      g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'
      g.font = "400 190px 'Pinyon Script', 'Instrument Serif', cursive"; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.strokeText(text, W / 2 - 60, H / 2 - 10)
      const ax = W - 140, ay = H / 2 - 40
      g.beginPath(); g.moveTo(ax, ay - 70); g.lineTo(ax, ay + 80); g.moveTo(ax - 38, ay + 42); g.lineTo(ax, ay + 82); g.lineTo(ax + 38, ay + 42); g.stroke()
      return tex(c)
    }
    return { core: make(0, 7, '#fff2f6'), halo: make(16, 22, '#ff86ad'), aspect: W / H }
  }, [text, font])
  const coreMat = useRef<THREE.MeshBasicMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const base = useMemo(() => new THREE.Color('#ffd0df'), [])
  useFrame(({ clock }) => {
    const f = Math.sin(clock.elapsedTime * 0.55) > 0.988 ? 0.35 + Math.random() * 0.4 : 1
    coreMat.current?.color.copy(base).multiplyScalar(3.4 * f)
    if (light.current) light.current.intensity = 2.4 * f
  })
  const w = 0.92, h = w / aspect
  const at: [number, number, number] = [MAILBOX_AT.x + 0.04, MAILBOX_AT.y + MAILBOX_H / 2 + 0.3, MAILBOX_AT.z + 0.05]
  return (
    <group>
      {/* bracket from the facade + two chains */}
      <mesh position={[(R + at[0] - w / 2) / 2 + 0.2, at[1] + h / 2 + 0.12, at[2]]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, R - at[0] + 0.25, 8]} /><meshStandardMaterial color="#3a3038" metalness={0.5} roughness={0.4} /></mesh>
      {[-0.4, 0.4].map((dx) => <mesh key={dx} position={[at[0] + dx * w * 0.9, at[1] + h / 2 + 0.06, at[2]]}><cylinderGeometry args={[0.004, 0.004, 0.12, 6]} /><meshStandardMaterial color="#3a3038" /></mesh>)}
      <group position={at} rotation={[0, MAILBOX_YAW * 0.6, -0.02]}>
        <mesh><planeGeometry args={[w * 1.06, h * 1.15]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.1} depthWrite={false} /></mesh>
        <mesh position={[0, 0, 0.004]}><planeGeometry args={[w * 1.05, h * 1.1]} /><meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.9} /></mesh>
        <mesh position={[0, 0, 0.008]}><planeGeometry args={[w, h]} /><meshBasicMaterial ref={coreMat} map={core} transparent depthWrite={false} toneMapped={false} /></mesh>
        <pointLight ref={light} position={[0, -0.2, 0.3]} color="#ff8fb3" intensity={2.4} distance={2.6} decay={2} />
      </group>
    </group>
  )
}

/** a long planter at the foot of the shop, between the post and the wall, full of her lilies in several colours */
function Planter() {
  const x = R - 0.22, z = MAILBOX_AT.z - 0.1
  const lilies: [number, number, string | undefined, number][] = [
    // dz, height, tint (undefined = her pink), yaw
    [-0.85, 0.5, '#ffad85', -1.6], [-0.55, 0.62, undefined, 0.4], [-0.2, 0.55, '#fff8f2', -0.9], [0.15, 0.6, '#c6a2f2', 1.7],
    [0.5, 0.56, '#ffad85', -2.3], [0.82, 0.5, undefined, 2.6], [0.95, 0.44, '#fff8f2', 0.9],
  ]
  return (
    <group>
      <mesh position={[x, KERB + 0.16, z]} castShadow receiveShadow><boxGeometry args={[0.34, 0.32, 2.0]} /><meshStandardMaterial color="#f7ece7" roughness={0.4} /></mesh>
      <mesh position={[x, KERB + 0.33, z]}><boxGeometry args={[0.37, 0.04, 2.04]} /><meshStandardMaterial color="#efc6d2" roughness={0.35} /></mesh>
      {lilies.map(([dz, h, tint, yaw], i) => <GlbProp key={i} url={LILIES_URL} x={x} z={z + dz} top={KERB + 0.32} height={h} rotation={[0, yaw, 0]} tint={tint} />)}
    </group>
  )
}

/* ---------------------------------------------------------------------------------------------- contacts */

const serif = "'Butler', 'Instrument Serif', Georgia, serif"

/**
 * Her contacts as coquette plaques (the cork board "parecia um negócio de terror"): cream, scalloped edge, pink filet,
 * hearts in the corners, hanging by a satin ribbon tied in a bow — painted on one canvas each (alpha-cut).
 */
function signTexture(w: number, h: number, title: string, sub: string, action: string) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  const top = 250, px = 40, ph = h - top - 30, pw = w - px * 2
  const bx = w / 2, by = 70
  for (const ex of [px + pw * 0.2, px + pw * 0.8]) {
    const gr = g.createLinearGradient(bx, by, ex, top); gr.addColorStop(0, '#f6b9cb'); gr.addColorStop(0.5, '#fbd6e1'); gr.addColorStop(1, '#ee9fb7')
    g.strokeStyle = gr; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by + 10); g.lineTo(ex, top + 14); g.stroke()
  }
  const loop = (dir: number) => {
    g.save(); g.translate(bx, by); g.scale(dir, 1)
    const gr = g.createLinearGradient(0, -40, 80, 30); gr.addColorStop(0, '#fbd3df'); gr.addColorStop(1, '#ee9db5')
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(30, -62, 110, -48, 92, 4); g.bezierCurveTo(80, 40, 30, 22, 0, 0); g.fill()
    g.strokeStyle = 'rgba(180,90,120,.45)'; g.lineWidth = 3; g.stroke()
    g.fillStyle = '#f2a9bf'; g.beginPath(); g.moveTo(6, 8); g.quadraticCurveTo(40, 70, 30, 120); g.lineTo(52, 108); g.quadraticCurveTo(54, 60, 14, 6); g.fill()
    g.restore()
  }
  loop(1); loop(-1)
  g.fillStyle = '#f7c2d2'; g.beginPath(); g.ellipse(bx, by + 2, 20, 17, 0, 0, Math.PI * 2); g.fill()
  g.strokeStyle = 'rgba(180,90,120,.5)'; g.lineWidth = 3; g.stroke()
  g.fillStyle = '#fbf4ea'
  g.beginPath(); g.roundRect(px + 14, top + 14, pw - 28, ph - 28, 26); g.fill()
  const sc = 18
  for (let x = px + sc; x <= px + pw - sc; x += sc * 2) { g.beginPath(); g.arc(x, top + sc, sc, 0, Math.PI * 2); g.arc(x, top + ph - sc, sc, 0, Math.PI * 2); g.fill() }
  for (let y = top + sc; y <= top + ph - sc; y += sc * 2) { g.beginPath(); g.arc(px + sc, y, sc, 0, Math.PI * 2); g.arc(px + pw - sc, y, sc, 0, Math.PI * 2); g.fill() }
  g.strokeStyle = '#f0a8bd'; g.lineWidth = 5; g.beginPath(); g.roundRect(px + 44, top + 44, pw - 88, ph - 88, 18); g.stroke()
  const heart = (x: number, y: number, s: number) => { g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-14, -6, -6, -16, 0, -8); g.bezierCurveTo(6, -16, 14, -6, 0, 6); g.fillStyle = '#f2a0b4'; g.fill(); g.restore() }
  heart(px + 70, top + 70, 1.2); heart(px + pw - 70, top + 70, 1.2); heart(px + 70, top + ph - 66, 1.2); heart(px + pw - 70, top + ph - 66, 1.2)
  g.textAlign = 'center'; g.fillStyle = '#3b2a35'
  let fs = 132; g.font = `italic 400 ${fs}px ${serif}`
  while (g.measureText(title).width > pw - 150 && fs > 60) { fs -= 4; g.font = `italic 400 ${fs}px ${serif}` }
  g.fillText(title, w / 2, top + ph * 0.5 + fs * 0.18)
  let ss = 36; g.font = `600 ${ss}px Inter, system-ui, sans-serif`
  while (g.measureText(sub).width > pw - 150 && ss > 20) { ss -= 2; g.font = `600 ${ss}px Inter, system-ui, sans-serif` }
  g.fillStyle = '#9a6a7c'; g.fillText(sub, w / 2, top + ph * 0.5 + fs * 0.18 + ss * 1.6)
  g.font = '700 26px Inter, system-ui, sans-serif'; g.fillStyle = '#d4789a'; g.fillText(action, w / 2, top + ph - 66)
  return tex(c)
}

/** one plaque, hanging from a hook point: sways; under the pointer it swings, comes forward and brightens */
function HangingSign({ map, hook, w, h, phase, onPick }: { map: THREE.Texture; hook: [number, number, number]; w: number; h: number; phase: number; onPick: () => void }) {
  const g = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const hot = useRef(false)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, k = hot.current ? 1 : 0
    if (g.current) {
      g.current.rotation.z = Math.sin(t * 0.9 + phase) * (0.02 + k * 0.035)
      g.current.rotation.x = Math.sin(t * 0.6 + phase * 2) * 0.03
      g.current.position.z = THREE.MathUtils.damp(g.current.position.z, hook[2] + k * 0.08, 10, dt)
      g.current.scale.setScalar(THREE.MathUtils.damp(g.current.scale.x, 1 + k * 0.05, 10, dt))
    }
    if (mat.current) mat.current.emissiveIntensity = THREE.MathUtils.damp(mat.current.emissiveIntensity, 0.45 + k * 0.3, 10, dt)
  })
  return (
    <group ref={g} position={hook}>
      <mesh position={[0, -h / 2 + 0.06, 0]} castShadow
        onClick={(e) => { e.stopPropagation(); onPick() }}
        onPointerOver={(e) => { e.stopPropagation(); hot.current = true; document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { hot.current = false; document.body.style.cursor = '' }}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial ref={mat} map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={0.45} transparent alphaTest={0.5} side={THREE.DoubleSide} roughness={0.55} />
      </mesh>
    </group>
  )
}

/** the plaques hang from a string of fairy lights across the street, facing whoever walks up it */
const SIGN_LINE = { z: 0.6, y: 2.78, sag: 0.24 } // close to the camera and low: the plaques are the centre of the page
const lineY = (x: number) => { const t = (x - L) / (R - L); return SIGN_LINE.y - Math.sin(Math.PI * t) * SIGN_LINE.sag }
const SIGN_XS = [-1.36, -0.3, 0.72] // Instagram, e-mail, LinkedIn
const SIGN_W = [0.84, 1.3] // the two small plaques, the e-mail one
const SIGN_H = [SIGN_W[0] * 760 / 700, SIGN_W[1] * 700 / 1200]
/** the top corners of each plaque's board (below its ribbon: the top 250 px of the canvas) — the camera keeps them clear of the page title */
const SIGN_CORNERS = SIGN_XS.flatMap((x, i) => {
  const big = i === 1, w = SIGN_W[big ? 1 : 0], h = SIGN_H[big ? 1 : 0]
  const y = lineY(x) - 0.02 + 0.06 - h * 250 / (big ? 700 : 760)
  return [-1, 1].map((sx) => new THREE.Vector3(x + sx * w / 2, y, SIGN_LINE.z + 0.02))
})
function ContactSigns({ email, links, copied, labels, onCopy }: StreetProps) {
  const insta = links.find(([n]) => /insta/i.test(n))
  const linked = links.find(([n]) => /linked/i.test(n))
  const handle = insta ? '@' + insta[1].replace(/\/+$/, '').split('/').pop() : ''
  const open = (href?: string) => { if (href) window.open(href, '_blank', 'noopener,noreferrer') }
  const maps = useMemo(() => ({
    insta: signTexture(700, 760, 'Instagram', handle, labels.open.toUpperCase() + ' ↗'),
    linked: signTexture(700, 760, 'LinkedIn', 'Ana Julia Yaguti Matilha', labels.open.toUpperCase() + ' ↗'),
  }), [handle, labels.open])
  const mail = useMemo(() => signTexture(1200, 700, 'e-mail', email, copied ? labels.copied.toUpperCase() + ' ✓' : labels.copy.toUpperCase() + ' ⧉'), [email, copied, labels.copy, labels.copied])
  const [sw, mw] = SIGN_W, [sh, mh] = SIGN_H, xs = SIGN_XS
  return (
    <group>
      <StringLights hooks={[[L, SIGN_LINE.y, SIGN_LINE.z], [R, SIGN_LINE.y, SIGN_LINE.z]]} sag={SIGN_LINE.sag} count={22} r={0.018} />
      <HangingSign map={maps.insta} hook={[xs[0], lineY(xs[0]) - 0.02, SIGN_LINE.z + 0.02]} w={sw} h={sh} phase={0} onPick={() => open(insta?.[1])} />
      <HangingSign map={mail} hook={[xs[1], lineY(xs[1]) - 0.02, SIGN_LINE.z + 0.02]} w={mw} h={mh} phase={2.1} onPick={onCopy} />
      <HangingSign map={maps.linked} hook={[xs[2], lineY(xs[2]) - 0.02, SIGN_LINE.z + 0.02]} w={sw} h={sh} phase={1.2} onPick={() => open(linked?.[1])} />
    </group>
  )
}

/* ---------------------------------------------------------------------------------------------- props */

/** Ana's vending machine (the arcade's), further down the right pavement — a prop, glowing like the concept's */
function Vending() {
  const { scene } = useGLTF(VENDING_URL)
  const model = useMemo(() => {
    const m = scene.clone(true)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true; mesh.receiveShadow = true
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((src) => {
        const mat = (src as THREE.MeshStandardMaterial).clone()
        mat.emissiveIntensity = (mat.emissiveIntensity ?? 1) * 0.6
        return mat
      })
      mesh.material = Array.isArray(mesh.material) ? mats : mats[0]
    })
    return m
  }, [scene])
  const s = 1.85 / 4.4
  return (
    <group position={[R - 0.36, KERB, -2.4]} rotation={[0, -Math.PI / 2, 0]} scale={s}>
      <primitive object={model} />
    </group>
  )
}

/** warm pools of light on the street (additive decals) under the lamp and the lanterns */
function Pools() {
  const warm = useMemo(() => radial([[0, 'rgba(255,205,165,.38)'], [0.45, 'rgba(255,190,150,.1)'], [1, 'rgba(255,190,150,0)']]), [])
  const items: [number, number, number, number][] = [[MAILBOX_AT.x - 0.3, KERB + 0.004, MAILBOX_AT.z, 2.2], [-0.2, 0.004, -2.4, 2.4], [0.6, KERB + 0.004, -2.4, 1.6]]
  return (
    <>
      {items.map(([x, y, z, s], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, y, z]}><planeGeometry args={[s, s]} /><meshBasicMaterial map={warm} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      ))}
    </>
  )
}

function Camera() {
  const { camera, size, gl } = useThree()
  // the page title is HTML over the canvas: re-fit when it changes size (fonts loading, language)
  const [titleRev, setTitleRev] = useState(0)
  useEffect(() => {
    const h1 = document.querySelector('.page.contact .page-head h1')
    if (!h1) return
    const ro = new ResizeObserver(() => setTitleRev((n) => n + 1)); ro.observe(h1)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    const target = new THREE.Vector3()
    // looking up the street (as in the concept): the mailbox big on the right, the plaques across the street, the
    // vanishing point a little left of centre
    if (aspect >= 1.15) { cam.fov = 42; cam.position.set(-0.45, 1.5, 5.0); target.set(0.45, 1.55, -2) }
    else if (aspect >= 0.75) { cam.fov = 50; cam.position.set(-0.1, 1.5, 6.2); target.set(0.2, 1.95, -2) }
    // phones: a wider lens from further back, tilted up, so both the mailbox and the Instagram plaque stay in frame
    else { cam.fov = 60; cam.position.set(-0.05, 1.5, 7.4); target.set(0.05, 2.15, -2) }
    cam.updateProjectionMatrix()
    // never let a plaque sit under the page title (Ana, 2026-10-20: "Contato" over the Instagram plaque): measure the
    // title's box over the canvas and tilt the camera up while stepping back — the street slides down and shrinks a
    // little — until no plaque corner is inside it
    const h1 = document.querySelector('.page.contact .page-head h1')
    const box = gl.domElement.getBoundingClientRect()
    let right = 0, bottom = 0
    if (h1) {
      bottom = h1.getBoundingClientRect().bottom - box.top + 18
      h1.querySelectorAll('.ch').forEach((ch) => { right = Math.max(right, ch.getBoundingClientRect().right - box.left + 18) })
    }
    const p = new THREE.Vector3()
    for (let k = 0; k < 36; k++) {
      cam.lookAt(target); cam.updateMatrixWorld()
      const hit = SIGN_CORNERS.some((v) => {
        p.copy(v).project(cam)
        return (p.x + 1) / 2 * size.width < right && (1 - p.y) / 2 * size.height < bottom
      })
      if (!hit) break
      target.y += 0.04; cam.position.z += 0.05; cam.position.y += 0.012 // tilt up and step back, so the mailbox and its lilies stay in frame
    }
  }, [camera, gl, size.width, size.height, titleRev])
  const base = useRef<THREE.Vector3 | null>(null)
  useFrame(({ pointer }, dt) => {
    if (!base.current) base.current = camera.position.clone()
    camera.position.x = THREE.MathUtils.damp(camera.position.x, base.current.x + pointer.x * 0.12, 2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, base.current.y + pointer.y * 0.06, 2, dt)
  })
  useEffect(() => { base.current = null }, [size.width, size.height, titleRev])
  return null
}

function Street(props: StreetProps) {
  const bokeh = useMemo(() => radial([[0, 'rgba(255,214,170,.9)'], [0.3, 'rgba(255,190,140,.3)'], [1, 'rgba(255,190,140,0)']]), [])
  const far: [number, number, number, number][] = [[-0.6, 1.8, -17, 0.5], [0.4, 2.2, -18, 0.4], [-1.2, 1.3, -16, 0.35], [0.9, 1.5, -19, 0.6], [-0.2, 2.6, -18.5, 0.45]]
  const lanternZ = [-0.9, -3.2, -5.6, -8, -10.4, -12.8]
  return (
    <group>
      <color attach="background" args={[BG]} />
      {/* a lilac haze down the street: the far end dissolves into light, not into black */}
      <fog attach="fog" args={[HAZE, 5, 21]} />
      {/* dusk: a cool sky, a warm street */}
      <hemisphereLight color="#d6dcf6" groundColor="#4c4250" intensity={0.85} />
      <directionalLight position={[-3, 5, 6]} color="#ffe9ef" intensity={0.55} />
      <MailboxLamp />
      {/* the lantern row's warmth on the street, and the vending machine's cool glow */}
      <pointLight position={[-0.2, 2.6, -2.6]} color="#ffb47a" intensity={5} distance={8} decay={2} />
      <pointLight position={[R - 1.1, 1.2, -2.4]} color="#e2f4ff" intensity={2.2} distance={3.5} decay={2} />
      <Environment resolution={128} frames={1} environmentIntensity={0.4}>
        <Lightformer form="rect" intensity={2} color="#ffd2b0" position={[0, 4, -3]} scale={[4, 1, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#c6d4ff" position={[-4, 2, 2]} scale={[1, 3, 1]} target={[0, 0, 0]} />
      </Environment>

      <Sky />
      <StreetEnd />
      <Ground />
      <Facade side="r" z0={Z0} z1={Z1} h={4.2} plaster={PLASTER_R} planks={PLANKS_R} />
      <Facade side="l" z0={Z0} z1={Z1} h={4.4} plaster={PLASTER_L} planks={PLANKS_L} bay={2.2} />
      <TileBand z0={Z0} z1={-1.2} />
      <Eave x={R} y={2.95} />
      <Eave x={L} y={3.15} />

      <Mailbox onLetter={props.onLetter} slot={props.slot} poke={props.poke} />
      <NeonSign text={props.labels.letterKicker} />
      <Planter />
      <ContactSigns {...props} />
      <Vending />
      <Pools />
      <WallPosters />
      <Noren z={-5.2} />
      <Noren z={-3.4} side="l" />
      <FacadeWindow side="r" z={-7.6} y={1.8} />
      <FacadeWindow side="r" z={-11} y={1.7} warm={false} />
      <FacadeWindow side="l" z={1.6} y={1.8} w={0.9} />
      <FacadeWindow side="l" z={-6.8} y={2.0} />
      <FacadeWindow side="l" z={-10.5} y={1.7} warm={false} />
      <ACUnit pos={[R - 0.14, 3.4, -1.0]} rotY={-Math.PI / 2} />
      <ACUnit pos={[L + 0.14, 3.0, -8.6]} rotY={Math.PI / 2} />
      <Wires />
      <StreetDressing R={R} L={L} KERB={KERB} road={STREET_ROAD} />

      {/* paper lanterns hung from the eaves on both sides (as in the concept), a string of bulbs further along */}
      {lanternZ.map((z, i) => <Lantern key={z} x={i % 2 ? L + 0.42 : R - 0.38} y={i % 2 ? 2.6 : 2.45} z={z} top={i % 2 ? 3.12 : 2.92} color={i % 3 === 1 ? '#f3e2b8' : '#f4b8cb'} size={0.2} />)}
      <StringLights hooks={[[L, 3.25, -5.5], [R, 3.25, -6.1]]} sag={0.4} count={18} r={0.018} />
      <StringLights hooks={[[L, 3.3, -9.5], [R, 3.3, -10]]} sag={0.4} count={18} r={0.018} />

      {/* the end of the street, out of focus */}
      {far.map(([x, y, z, s], i) => (
        <sprite key={i} position={[x, y, z]} scale={[s, s, 1]}>
          <spriteMaterial map={bokeh} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} opacity={0.5} />
        </sprite>
      ))}

      <Hearts items={[[0.3, 1.55, 2.4, 0.12], [-0.9, 1.45, 2.2, 0.12], [1.5, 1.9, 2.4, 0.1], [-1.6, 1.85, 0.2, 0.1], [0.75, 0.75, 2.8, 0.1]]} />
      <Glints n={18} box={[-0.2, 1.6, 0.6, 2.9, -4, 2.5]} />
    </group>
  )
}

export default function ContactStreet(props: StreetProps) {
  const box = useRef<HTMLDivElement>(null)
  const onScreen = useOnScreen(box)
  const [dpr] = useAdaptiveDpr(1.5)
  const gl = useGLRecovery()
  return (
    <div ref={box} className="ct-street">
      {/* the same four actions for keyboards and screen readers (the scene itself is pointer-only) */}
      <nav className="sr" aria-label="Contato">
        <button type="button" onClick={props.onLetter}>{props.labels.letter}</button>
        {props.links.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noopener noreferrer">{name}</a>)}
        <button type="button" onClick={props.onCopy}>{props.labels.copy}: {props.email}</button>
      </nav>
      <p className="ct-status" role="status" aria-live="polite">{props.copied ? `${props.email} · ${props.labels.copied} ✓` : ''}</p>
      <Canvas key={gl.key} onCreated={gl.onCreated} shadows dpr={dpr} frameloop={onScreen ? 'always' : 'never'} camera={{ position: [-0.45, 1.5, 5], fov: 42, near: 0.05, far: 45 }} gl={{ antialias: false, alpha: false, toneMapping: THREE.NoToneMapping }}>
        <Camera />
        <Suspense fallback={null}>
          <SceneReady />{/* holds the page curtain until this scene has drawn */}
          <Street {...props} />
        </Suspense>
        <EffectComposer multisampling={0}>
          {LOW_POWER ? <></> : <N8AO aoRadius={0.4} distanceFalloff={0.8} intensity={1.8} halfRes quality="low" />}
          <Bloom intensity={0.65} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.AGX} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

useGLTF.preload(MAILBOX_URL)
useGLTF.preload(VENDING_URL)
useTexture.preload([plasterUrl, asphaltUrl, paversUrl, shojiUrl])
