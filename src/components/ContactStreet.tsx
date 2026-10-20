import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshReflectorMaterial, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { SceneReady } from './SceneReady'
import { useOnScreen } from './useOnScreen'
import { useAdaptiveDpr } from './AdaptiveDpr'
import { Glints, Hearts, Lantern, StringLights, radial } from './Decor'
import Glow from './Glow'
import lilyArt from '../assets/card/lily.webp'
import tileArt from '../assets/tiles/01-petalas.jpg'
import posterBike from '../assets/posters/poster-02.webp'
import posterRadio from '../assets/posters/poster-12.webp'
import { useTexture } from '@react-three/drei'

/**
 * Contact = a Japanese back street at night (Ana picked idea 1 on 2026-10-20 — "a caixa de correio" — from the Figma
 * concept in docs/ideias-contato/img/1-caixa-de-correio.jpg, and sent her mailbox model). Metres, y up, the camera looks
 * at a shop wall facing +z: the vending machine, her mailbox repainted in pink enamel (the brass shows through on the
 * relief), a cork notice board with her card. To the left an alley runs away into the fog under lanterns, fairy lights
 * and wires. The asphalt is wet: puddles mirror the lights.
 * Performance (the Skills lesson): four real lights + hemisphere; everything else glows (emissive, additive sprites).
 */
const BG = '#0d0c13'
const MAILBOX_URL = '/models/mailbox.glb'
const VENDING_URL = '/models/vending.glb'
const WALL = { x0: -0.25, x1: 4.6, h: 3.6 } // the shop front, at z = 0
const ALLEY = { x0: -2.7, x1: -0.25, z1: -16 } // runs from the street (z ≈ 3) into the distance
export const MAILBOX_AT = new THREE.Vector3(2.15, 1.46, 0)

const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

/** plaster with grime: soft blotches, drips under the ledges, a darker wet band along the bottom */
function plaster(base: string, seed: number, w = 1024, h = 512) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!, r = rnd(seed)
  g.fillStyle = base; g.fillRect(0, 0, w, h)
  for (let i = 0; i < 260; i++) {
    const x = r() * w, y = r() * h, s = 20 + r() * 120
    const gr = g.createRadialGradient(x, y, 0, x, y, s)
    const dark = r() < 0.6
    gr.addColorStop(0, dark ? `rgba(40,28,30,${0.05 + r() * 0.08})` : `rgba(255,245,235,${0.03 + r() * 0.05})`); gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2)
  }
  for (let i = 0; i < 40; i++) { // drips
    const x = r() * w, y = r() * h * 0.6, l = 40 + r() * 160
    const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(40,30,30,.16)'); gr.addColorStop(1, 'rgba(40,30,30,0)')
    g.fillStyle = gr; g.fillRect(x, y, 2 + r() * 4, l)
  }
  const wet = g.createLinearGradient(0, h * 0.82, 0, h); wet.addColorStop(0, 'rgba(20,14,18,0)'); wet.addColorStop(1, 'rgba(20,14,18,.45)')
  g.fillStyle = wet; g.fillRect(0, 0, w, h)
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1.5, 1.5) }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8
  return t
}

/** wet asphalt: grain + puddles. Returns colour and roughness (puddles are glossy, the rest matte-damp) */
function asphalt() {
  const S = 1024, r = rnd(5)
  const col = document.createElement('canvas'); col.width = col.height = S
  const g = col.getContext('2d')!
  g.fillStyle = '#26232b'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 26000; i++) { const v = 20 + r() * 50; g.fillStyle = `rgba(${v},${v - 2},${v + 4},.5)`; g.fillRect(r() * S, r() * S, 2, 2) }
  const rough = document.createElement('canvas'); rough.width = rough.height = S
  const q = rough.getContext('2d')!
  q.fillStyle = '#b8b8b8'; q.fillRect(0, 0, S, S)
  for (let i = 0; i < 22; i++) { // puddles: irregular blobs of near-zero roughness
    const x = r() * S, y = r() * S, rx = 40 + r() * 170, ry = rx * (0.35 + r() * 0.5)
    q.save(); q.translate(x, y); q.rotate(r() * Math.PI); q.filter = 'blur(10px)'
    q.fillStyle = '#141414'; q.beginPath(); q.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); q.fill()
    q.beginPath(); q.ellipse(rx * 0.5, ry * 0.3, rx * 0.5, ry * 0.6, 0, 0, Math.PI * 2); q.fill(); q.restore()
    g.save(); g.translate(x, y); g.fillStyle = 'rgba(10,9,14,.35)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore()
  }
  const mk = (c: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 6); t.anisotropy = 8; return t }
  return { map: mk(col, true), roughnessMap: mk(rough, false) }
}

function Ground() {
  const { map, roughnessMap } = useMemo(asphalt, [])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.9, 0, -6]} receiveShadow>
      <planeGeometry args={[9, 22]} />
      {/* the one mirror of the scene: puddles reflect the vending machine, the lanterns and the bulbs */}
      <MeshReflectorMaterial map={map} roughnessMap={roughnessMap} roughness={1} metalness={0} color="#c4bfcc"
        blur={[220, 60]} resolution={512} mixBlur={0.7} mixStrength={4} mixContrast={1.25} mirror={0.85} depthScale={0} />
    </mesh>
  )
}

/** a plaster wall plane (repeat in metres), facing +z after `rotation` */
function WallPlane({ w, h, pos, rot = [0, 0, 0], base, seed }: { w: number; h: number; pos: [number, number, number]; rot?: [number, number, number]; base: string; seed: number }) {
  // repeat only sideways: the wet band and the drips belong at the bottom of the wall, once
  const map = useMemo(() => { const t = plaster(base, seed, 1024, 1024); t.repeat.set(w / 3.2, 1); t.wrapT = THREE.ClampToEdgeWrapping; return t }, [base, seed, w, h])
  return (
    <mesh position={pos} rotation={rot} receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={map} roughness={0.92} />
    </mesh>
  )
}

/** a lit window in the alley: warm glass with a blind, a dark frame */
function AlleyWindow({ z, y, side, w = 0.8, h = 0.9, warm = true }: { z: number; y: number; side: 'l' | 'r'; w?: number; h?: number; warm?: boolean }) {
  const x = side === 'l' ? ALLEY.x0 + 0.01 : ALLEY.x1 - 0.01
  const ry = side === 'l' ? Math.PI / 2 : -Math.PI / 2
  const glass = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128
    const g = c.getContext('2d')!
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, warm ? '#ffd9a6' : '#cfe6e0'); gr.addColorStop(1, warm ? '#f2a36e' : '#7fb3ad')
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
    g.fillStyle = 'rgba(60,35,30,.35)'; for (let yy = 4; yy < 128; yy += 9) g.fillRect(0, yy, 128, 3) // blind slats
    g.fillStyle = 'rgba(40,28,28,.8)'; g.fillRect(62, 0, 4, 128); g.fillRect(0, 62, 128, 4) // mullions
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [warm])
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 0, -0.005]}><planeGeometry args={[w + 0.1, h + 0.1]} /><meshStandardMaterial color="#2a2124" roughness={0.7} /></mesh>
      <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={glass} color={new THREE.Color(1.6, 1.6, 1.6)} toneMapped={false} /></mesh>
    </group>
  )
}

/** air conditioner box on a bracket, a common back-street sight */
function ACUnit({ pos, rotY = 0 }: { pos: [number, number, number]; rotY?: number }) {
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh castShadow><boxGeometry args={[0.7, 0.5, 0.26]} /><meshStandardMaterial color="#d9d3c6" roughness={0.6} /></mesh>
      <mesh position={[0.12, 0, 0.131]}><circleGeometry args={[0.19, 24]} /><meshStandardMaterial color="#5d5a57" roughness={0.5} metalness={0.4} /></mesh>
      <mesh position={[-0.27, -0.27, -0.05]}><boxGeometry args={[0.04, 0.04, 0.3]} /><meshStandardMaterial color="#3b3533" /></mesh>
      <mesh position={[0.27, -0.27, -0.05]}><boxGeometry args={[0.04, 0.04, 0.3]} /><meshStandardMaterial color="#3b3533" /></mesh>
    </group>
  )
}

/** a vertical drain pipe with brackets */
function Pipe({ x, z, h = 3.4, r = 0.035 }: { x: number; z: number; h?: number; r?: number }) {
  return (
    <group position={[x, h / 2, z]}>
      <mesh castShadow><cylinderGeometry args={[r, r, h, 10]} /><meshStandardMaterial color="#8d8a86" roughness={0.45} metalness={0.5} /></mesh>
      {[-1.2, 0, 1.2].map((y) => <mesh key={y} position={[0, y, -r]}><boxGeometry args={[r * 2.6, 0.04, r * 1.4]} /><meshStandardMaterial color="#4a4542" /></mesh>)}
    </group>
  )
}

/** sagging cables crossing the alley */
function Wires() {
  const curves = useMemo(() => [[2.95, -1.2, 0.35], [3.1, -4.5, 0.5], [2.8, -8, 0.3], [3.2, -11, 0.45]].map(([y, z, sag]) => {
    const pts = Array.from({ length: 16 }, (_, i) => { const t = i / 15; return new THREE.Vector3(ALLEY.x0 + (ALLEY.x1 - ALLEY.x0) * t, y - Math.sin(Math.PI * t) * sag, z + t * 0.6) })
    return new THREE.CatmullRomCurve3(pts)
  }), [])
  return <>{curves.map((c, i) => <mesh key={i}><tubeGeometry args={[c, 40, 0.008, 4, false]} /><meshStandardMaterial color="#141216" roughness={0.6} /></mesh>)}</>
}

/** Ana's mailbox in pink enamel: where the relief is steep (normal map), the paint has worn off to the brass */
function Mailbox() {
  const { scene } = useGLTF(MAILBOX_URL)
  const model = useMemo(() => {
    const m = scene.clone(true)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = mesh.receiveShadow = true
      const src = mesh.material as THREE.MeshStandardMaterial
      const mat = src.clone()
      mat.envMapIntensity = 0.9
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uPaint = { value: new THREE.Color('#f4a3ba') }
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uPaint;\nfloat mbWear;')
          .replace('#include <map_fragment>', `#include <map_fragment>
#ifdef USE_NORMALMAP
  vec3 mbN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
  mbWear = smoothstep(0.09, 0.32, length(mbN.xy));
#else
  mbWear = 0.0;
#endif
  float mbLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
  vec3 mbPaint = uPaint * (0.5 + mbLum * 1.05); // the brass texture's grime and shading carry into the paint
  diffuseColor.rgb = mix(mbPaint, diffuseColor.rgb * 1.25, mbWear);`)
          .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = mix(0.04, metalnessFactor, mbWear);')
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.34, roughnessFactor, mbWear);')
      }
      mat.customProgramCacheKey = () => 'mailbox-enamel'
      mesh.material = mat
    })
    return m
  }, [scene])
  // model: 0.8 × 0.96 × 0.45, centred → 58 cm tall (the star of the street), its back against the wall
  const s = 0.58 / 0.96
  return (
    <group position={[MAILBOX_AT.x, MAILBOX_AT.y, 0.225 * s + 0.01]} scale={s}>
      <primitive object={model} />
    </group>
  )
}

/** Ana's vending machine (the arcade's), its lit panel the brightest thing on the street */
function Vending() {
  const { scene } = useGLTF(VENDING_URL)
  const model = useMemo(() => {
    const m = scene.clone(true)
    m.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true } })
    return m
  }, [scene])
  const s = 1.85 / 4.4
  return (
    <group position={[0.72, 0, 0.36]} scale={s}>
      <primitive object={model} />
    </group>
  )
}

/** a cork board with her card pinned to it (the 3D card itself comes in the next step) */
function NoticeBoard() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 768; c.height = 560
    const g = c.getContext('2d')!, r = rnd(17)
    g.fillStyle = '#b98b5c'; g.fillRect(0, 0, 768, 560)
    for (let i = 0; i < 16000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(110,70,40,${r() * 0.35})` : `rgba(230,190,140,${r() * 0.3})`; g.fillRect(r() * 768, r() * 560, 2 + r() * 3, 2 + r() * 3) }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const card = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 580
    const g = c.getContext('2d')!
    g.fillStyle = '#f4eee2'; g.fillRect(0, 0, 1000, 580)
    g.fillStyle = '#1b1620'; g.font = "400 96px 'Butler', 'Instrument Serif', Georgia, serif"; g.fillText('Ana Julia', 70, 200)
    g.fillStyle = '#6b5a6e'; g.font = '600 26px Inter, system-ui, sans-serif'; g.fillText('PRODUCT DESIGNER', 74, 260)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
    const img = new Image(); img.onload = () => { g.globalAlpha = 0.9; g.drawImage(img, 560, 60, 420, 430); t.needsUpdate = true }; img.src = lilyArt
    return t
  }, [])
  return (
    <group position={[3.35, 1.42, 0.03]}>
      <mesh castShadow position={[0, 0, 0]}><boxGeometry args={[0.86, 0.64, 0.04]} /><meshStandardMaterial color="#6a4a35" roughness={0.7} /></mesh>
      <mesh position={[0, 0, 0.021]}><planeGeometry args={[0.78, 0.56]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
      <mesh position={[-0.04, 0.02, 0.027]} rotation={[0, 0, -0.06]} castShadow><planeGeometry args={[0.5, 0.29]} /><meshStandardMaterial map={card} roughness={0.75} /></mesh>
      <mesh position={[-0.04, 0.17, 0.035]}><sphereGeometry args={[0.018, 12, 10]} /><meshStandardMaterial color="#f2a0b4" roughness={0.2} /></mesh>
    </group>
  )
}

/** the bottom metre of the shop front in Ana's glazed pink relief tiles (the Skills arcade's), with a wooden cap rail */
const TILE = 0.3, WAINSCOT = 0.96
function Wainscot() {
  const tex = useTexture(tileArt)
  const [map, bump] = useMemo(() => {
    const m = tex.clone(); m.colorSpace = THREE.SRGBColorSpace; m.wrapS = m.wrapT = THREE.RepeatWrapping
    m.repeat.set((WALL.x1 - WALL.x0) / TILE, WAINSCOT / TILE); m.anisotropy = 8; m.needsUpdate = true
    const b = m.clone(); b.colorSpace = THREE.NoColorSpace; b.needsUpdate = true
    return [m, b]
  }, [tex])
  const w = WALL.x1 - WALL.x0
  return (
    <group>
      <mesh position={[(WALL.x0 + WALL.x1) / 2, WAINSCOT / 2, 0.012]} receiveShadow>
        <planeGeometry args={[w, WAINSCOT]} />
        <meshPhysicalMaterial map={map} bumpMap={bump} bumpScale={1.6} roughness={0.3} clearcoat={0.5} clearcoatRoughness={0.2} />
      </mesh>
      <mesh position={[(WALL.x0 + WALL.x1) / 2, WAINSCOT + 0.02, 0.03]} castShadow><boxGeometry args={[w, 0.05, 0.05]} /><meshStandardMaterial color="#5b4033" roughness={0.6} /></mesh>
    </group>
  )
}

/** a little caged wall lamp over the mailbox — where the warm spot comes from */
function Sconce() {
  return (
    <group position={[MAILBOX_AT.x, 2.3, 0.02]}>
      <mesh position={[0, 0, 0.02]}><boxGeometry args={[0.12, 0.12, 0.04]} /><meshStandardMaterial color="#2c2628" roughness={0.5} metalness={0.4} /></mesh>
      <mesh position={[0, -0.05, 0.12]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.012, 0.18, 8]} /><meshStandardMaterial color="#2c2628" metalness={0.5} roughness={0.4} /></mesh>
      <mesh position={[0, -0.1, 0.2]}><sphereGeometry args={[0.055, 16, 12]} /><meshBasicMaterial color={new THREE.Color('#ffd09a').multiplyScalar(3)} toneMapped={false} /></mesh>
      <mesh position={[0, -0.05, 0.2]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.11, 0.08, 18, 1, true]} /><meshStandardMaterial color="#2c2628" side={THREE.DoubleSide} metalness={0.5} roughness={0.4} /></mesh>
    </group>
  )
}

/** two of her arcade posters pasted on the shop front, a bit weathered */
function WallPosters() {
  const maps = useTexture([posterBike, posterRadio])
  useMemo(() => maps.forEach((m) => { m.colorSpace = THREE.SRGBColorSpace; m.anisotropy = 8 }), [maps])
  const items: [number, number, number, number][] = [[1.25, 1.62, 0.62, -0.03], [4.05, 1.55, 0.56, 0.04]]
  return (
    <>
      {items.map(([x, y, h, rot], i) => {
        const img = maps[i].image as HTMLImageElement, w = h * (img.width / img.height)
        return (
          <mesh key={i} position={[x, y, 0.014 + i * 0.002]} rotation={[0, 0, rot]} receiveShadow>
            <planeGeometry args={[w, h]} /><meshStandardMaterial map={maps[i]} roughness={0.85} color="#e9e1d8" />
          </mesh>
        )
      })}
    </>
  )
}

/** warm pools of light on the wet ground (additive decals), under the lamp and in front of the vending machine */
function Pools() {
  const warm = useMemo(() => radial([[0, 'rgba(255,205,160,.42)'], [0.45, 'rgba(255,190,140,.12)'], [1, 'rgba(255,190,140,0)']]), [])
  const cool = useMemo(() => radial([[0, 'rgba(210,235,255,.32)'], [0.5, 'rgba(190,220,255,.08)'], [1, 'rgba(190,220,255,0)']]), [])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[MAILBOX_AT.x, 0.004, 0.9]}><planeGeometry args={[2.6, 2]} /><meshBasicMaterial map={warm} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.72, 0.005, 1.1]}><planeGeometry args={[2.2, 1.8]} /><meshBasicMaterial map={cool} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
    </>
  )
}

/** the sconce's light: a spot aimed down the wall at the mailbox and the ground in front (its target has to be in the
 * scene, or three keeps aiming it at the origin) */
function LampSpot() {
  const light = useRef<THREE.SpotLight>(null)
  const { scene } = useThree()
  useEffect(() => {
    const l = light.current; if (!l) return
    l.target.position.set(MAILBOX_AT.x, 0.7, 0.55); scene.add(l.target)
    return () => { scene.remove(l.target) }
  }, [scene])
  return <spotLight ref={light} position={[MAILBOX_AT.x, 2.2, 0.32]} angle={0.95} penumbra={0.9} intensity={14} distance={6} decay={2} color="#ffc995" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
}

function Camera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    if (aspect >= 1.15) { cam.position.set(1.05, 1.5, 5.3); cam.lookAt(1.25, 1.12, 0) }
    else { cam.position.set(2.0, 1.45, 5.6); cam.lookAt(2.0, 1.15, 0) } // phones: the mailbox and the board in the middle
    cam.updateProjectionMatrix()
  }, [camera, size.width, size.height])
  // the camera breathes a little with the pointer
  const base = useRef<THREE.Vector3 | null>(null)
  useFrame(({ pointer }, dt) => {
    if (!base.current) base.current = camera.position.clone()
    camera.position.x = THREE.MathUtils.damp(camera.position.x, base.current.x + pointer.x * 0.12, 2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, base.current.y + pointer.y * 0.06, 2, dt)
  })
  useEffect(() => { base.current = null }, [size.width, size.height])
  return null
}

function Street() {
  const bokeh = useMemo(() => radial([[0, 'rgba(255,214,170,.9)'], [0.3, 'rgba(255,190,140,.3)'], [1, 'rgba(255,190,140,0)']]), [])
  const far: [number, number, number, number][] = [[-1.9, 1.6, -13, 0.5], [-0.9, 2.1, -14, 0.4], [-1.4, 1.1, -12, 0.35], [-0.6, 1.4, -15, 0.6], [-2.2, 2.4, -14.5, 0.45]]
  return (
    <group>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 6, 17]} />
      {/* the night: dim cool sky, the street's own lights do the rest */}
      <hemisphereLight color="#6a74a0" groundColor="#2a2228" intensity={0.6} />
      {/* 1 · the vending machine's cool glow */}
      <pointLight position={[0.72, 1.15, 1.25]} color="#e2f4ff" intensity={4} distance={4.2} decay={2} />
      {/* 2 · a warm lamp over the mailbox (shadows on the wall) */}
      <LampSpot />
      {/* 3 · the lanterns down the alley */}
      <pointLight position={[-1.45, 2.35, -2.2]} color="#ffb070" intensity={5} distance={7} decay={2} />
      <Environment resolution={128} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2} color="#ffd2a6" position={[2, 3, 3]} scale={[3, 1, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#bfe0ff" position={[-3, 1.5, 2]} scale={[1, 3, 1]} target={[0, 0, 0]} />
      </Environment>

      <Ground />
      {/* shop front + the side of the same building (alley's right) + the alley's far wall (left) */}
      <WallPlane w={WALL.x1 - WALL.x0} h={WALL.h} pos={[(WALL.x0 + WALL.x1) / 2, WALL.h / 2, 0]} base="#d8c0b4" seed={3} />
      <WallPlane w={-ALLEY.z1} h={WALL.h + 1} pos={[ALLEY.x1, (WALL.h + 1) / 2, ALLEY.z1 / 2]} rot={[0, -Math.PI / 2, 0]} base="#8e7a74" seed={8} />
      <WallPlane w={-ALLEY.z1 + 3} h={WALL.h + 1.4} pos={[ALLEY.x0, (WALL.h + 1.4) / 2, (ALLEY.z1 + 3) / 2]} rot={[0, Math.PI / 2, 0]} base="#76655f" seed={11} />
      {/* a canopy edge over the shop front and a kerb */}
      <mesh position={[(WALL.x0 + WALL.x1) / 2, 2.62, 0.22]} castShadow><boxGeometry args={[WALL.x1 - WALL.x0, 0.08, 0.46]} /><meshStandardMaterial color="#3f3a40" roughness={0.6} /></mesh>
      <mesh position={[(WALL.x0 + WALL.x1) / 2, 0.06, 0.14]} receiveShadow><boxGeometry args={[WALL.x1 - WALL.x0, 0.12, 0.28]} /><meshStandardMaterial color="#6e6670" roughness={0.85} /></mesh>

      <Wainscot />
      <WallPosters />
      <Pools />
      <Vending />
      <Mailbox />
      <Sconce />
      <NoticeBoard />
      <Pipe x={1.62} z={0.05} />
      <ACUnit pos={[3.9, 2.95, 0.16]} />
      <ACUnit pos={[ALLEY.x0 + 0.16, 2.6, -3.4]} rotY={Math.PI / 2} />
      <ACUnit pos={[ALLEY.x1 - 0.16, 2.2, -6.5]} rotY={-Math.PI / 2} />
      <AlleyWindow side="l" z={-1.6} y={1.7} />
      <AlleyWindow side="r" z={-4.2} y={1.9} w={0.6} warm={false} />
      <AlleyWindow side="l" z={-7.4} y={2.1} />
      <AlleyWindow side="r" z={-10} y={1.6} />
      <Wires />

      {/* lanterns down the alley, fairy lights across it and along the shop's canopy */}
      <Lantern x={-1.55} y={2.35} z={0.9} top={3.9} color="#f4b8cb" size={0.2} />
      <Lantern x={-1.3} y={2.4} z={-2.2} top={3.9} color="#f3e2b8" size={0.2} />
      <Lantern x={-1.6} y={2.45} z={-5.2} top={3.9} color="#f4b8cb" size={0.2} />
      <Lantern x={-1.35} y={2.5} z={-8.6} top={3.9} color="#f3e2b8" size={0.2} />
      <Lantern x={3.85} y={2.25} z={0.7} top={2.62} color="#f3e2b8" size={0.17} />
      <StringLights hooks={[[ALLEY.x0, 3.05, 0.4], [ALLEY.x1, 3.05, -0.2]]} sag={0.35} count={16} r={0.018} />
      <StringLights hooks={[[ALLEY.x0, 3.2, -3.4], [ALLEY.x1, 3.2, -3.9]]} sag={0.4} count={16} r={0.018} />
      <StringLights hooks={[[0.0, 2.6, 0.46], [1.6, 2.6, 0.46], [3.0, 2.6, 0.46], [4.5, 2.6, 0.46]]} sag={0.18} count={30} r={0.016} />

      {/* the end of the alley, out of focus */}
      {far.map(([x, y, z, s], i) => (
        <sprite key={i} position={[x, y, z]} scale={[s, s, 1]}>
          <spriteMaterial map={bokeh} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} opacity={0.55} />
        </sprite>
      ))}
      <Glow x={-1.4} y={1.7} z={-15.5} s={5} inner="rgba(255,200,160,.22)" outer="rgba(120,130,180,.08)" />

      <Hearts items={[[-1.9, 1.9, 0.6, 0.16], [2.75, 2.05, 0.6, 0.12], [-0.9, 1.25, 1.4, 0.13], [4.1, 1.55, 0.8, 0.15], [-1.2, 2.6, -1.5, 0.1]]} />
      <Glints n={18} box={[0.6, 2.6, 0.4, 2.8, -3, 1.6]} />
    </group>
  )
}

export default function ContactStreet() {
  const box = useRef<HTMLDivElement>(null)
  const onScreen = useOnScreen(box)
  const [dpr] = useAdaptiveDpr(1.5)
  return (
    <div ref={box} className="ct-street">
      <Canvas shadows dpr={dpr} frameloop={onScreen ? 'always' : 'never'} camera={{ position: [1.05, 1.5, 5.3], fov: 38, near: 0.05, far: 40 }} gl={{ antialias: false, alpha: false, toneMapping: THREE.NoToneMapping }}>
        <Camera />
        <Suspense fallback={null}>
          <SceneReady />{/* holds the page curtain until this scene has drawn */}
          <Street />
        </Suspense>
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={0.45} distanceFalloff={0.8} intensity={3} halfRes quality="low" />
          <Bloom intensity={0.6} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.AGX} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  )
}

useGLTF.preload(MAILBOX_URL)
useGLTF.preload(VENDING_URL)
