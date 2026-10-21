import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
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
import GlbProp, { LILIES_URL } from './GlbProp'
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
const BG = '#2a2131' // a dusky mauve dusk, not a black night (Ana: "ficou muito escuro… parece terror")
const MAILBOX_URL = '/models/mailbox.glb'
const VENDING_URL = '/models/vending.glb'
const WALL = { x0: -0.25, x1: 6.4, h: 3.6 } // the shop front, at z = 0
const ALLEY = { x0: -2.7, x1: -0.25, z1: -16 } // runs from the street (z ≈ 3) into the distance
/** the mailbox is THE thing on this street (Ana, 2026-10-20: "tem que ser muito maior… a ênfase no mailbox"): 95 cm */
export const MAILBOX_AT = new THREE.Vector3(2.0, 1.42, 0)
const MAILBOX_H = 0.95
const BOARD_AT: [number, number, number] = [3.72, 1.5, 0.03]
const BOARD = { w: 1.9, h: 1.3 }

/** what the street offers the visitor (passed down: drei's Html renders in its own React root, no context in there) */
export type StreetProps = {
  email: string
  links: [string, string][]
  copied: boolean
  labels: { letterKicker: string; letter: string; copy: string; copied: string; open: string }
  onLetter: () => void
  onCopy: () => void
}

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
  g.fillStyle = '#4a404c'; g.fillRect(0, 0, S, S)
  for (let i = 0; i < 26000; i++) { const v = 20 + r() * 50; g.fillStyle = `rgba(${v},${v - 2},${v + 4},.5)`; g.fillRect(r() * S, r() * S, 2, 2) }
  const rough = document.createElement('canvas'); rough.width = rough.height = S
  const q = rough.getContext('2d')!
  q.fillStyle = '#b8b8b8'; q.fillRect(0, 0, S, S)
  for (let i = 0; i < 22; i++) { // puddles: irregular blobs of near-zero roughness
    const x = r() * S, y = r() * S, rx = 40 + r() * 170, ry = rx * (0.35 + r() * 0.5)
    q.save(); q.translate(x, y); q.rotate(r() * Math.PI); q.filter = 'blur(10px)'
    q.fillStyle = '#141414'; q.beginPath(); q.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); q.fill()
    q.beginPath(); q.ellipse(rx * 0.5, ry * 0.3, rx * 0.5, ry * 0.6, 0, 0, Math.PI * 2); q.fill(); q.restore()
    g.save(); g.translate(x, y); g.fillStyle = 'rgba(30,24,34,.12)'; g.filter = 'blur(14px)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill(); g.restore()
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
      <MeshReflectorMaterial map={map} roughnessMap={roughnessMap} roughness={1} metalness={0} color="#e6dde6"
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
function Mailbox({ onLetter }: { onLetter: () => void }) {
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
  // model: 0.8 × 0.96 × 0.45, centred → MAILBOX_H tall, its back against the wall; clicking it opens the letter
  const s = MAILBOX_H / 0.96
  return (
    <group position={[MAILBOX_AT.x, MAILBOX_AT.y, 0.225 * s + 0.01]} scale={s}
      onClick={(e) => { e.stopPropagation(); onLetter() }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}>
      <primitive object={model} />
    </group>
  )
}

/** Ana's vending machine (the arcade's) — only a prop now (Ana: "ela não pode ter tanto destaque"): in the corner by the
 * alley, its panel dimmed to a third so it stops being the brightest thing on the street */
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
        mat.emissiveIntensity = (mat.emissiveIntensity ?? 1) * 0.32
        mat.color?.multiplyScalar(0.82)
        return mat
      })
      mesh.material = Array.isArray(mesh.material) ? mats : mats[0]
    })
    return m
  }, [scene])
  const s = 1.85 / 4.4
  return (
    <group position={[5.55, 0, 0.36]} scale={s}>
      <primitive object={model} />
    </group>
  )
}

const serif = "'Butler', 'Instrument Serif', Georgia, serif"

/**
 * Her contacts as coquette shop signs (Ana, 2026-10-20: the cork board "parece um negócio de terror; o meu é aesthetic,
 * coquete"): three cream plaques with a scalloped edge and a pink filet, each hanging from a satin ribbon tied in a bow —
 * Instagram, LinkedIn and, wider, the e-mail. Painted on one canvas each (ribbon + bow + plaque, alpha-cut), they sway a
 * little; under the pointer they swing, lift and brighten; a click opens / copies.
 */
function signTexture(w: number, h: number, title: string, sub: string, action: string) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  const top = 250, px = 40, ph = h - top - 30, pw = w - px * 2
  // satin ribbons from the bow to the plaque's shoulders
  const bx = w / 2, by = 70
  for (const ex of [px + pw * 0.2, px + pw * 0.8]) {
    const gr = g.createLinearGradient(bx, by, ex, top); gr.addColorStop(0, '#f6b9cb'); gr.addColorStop(0.5, '#fbd6e1'); gr.addColorStop(1, '#ee9fb7')
    g.strokeStyle = gr; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by + 10); g.lineTo(ex, top + 14); g.stroke()
  }
  // the bow: two loops, two tails, a knot
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
  // the plaque: scalloped cream edge
  g.fillStyle = '#fbf4ea'
  g.beginPath(); g.roundRect(px + 14, top + 14, pw - 28, ph - 28, 26); g.fill()
  const sc = 18
  for (let x = px + sc; x <= px + pw - sc; x += sc * 2) { g.beginPath(); g.arc(x, top + sc, sc, 0, Math.PI * 2); g.arc(x, top + ph - sc, sc, 0, Math.PI * 2); g.fill() }
  for (let y = top + sc; y <= top + ph - sc; y += sc * 2) { g.beginPath(); g.arc(px + sc, y, sc, 0, Math.PI * 2); g.arc(px + pw - sc, y, sc, 0, Math.PI * 2); g.fill() }
  // pink filet + tiny hearts in the corners
  g.strokeStyle = '#f0a8bd'; g.lineWidth = 5; g.beginPath(); g.roundRect(px + 44, top + 44, pw - 88, ph - 88, 18); g.stroke()
  const heart = (x: number, y: number, s: number) => { g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-14, -6, -6, -16, 0, -8); g.bezierCurveTo(6, -16, 14, -6, 0, 6); g.fillStyle = '#f2a0b4'; g.fill(); g.restore() }
  heart(px + 70, top + 70, 1.2); heart(px + pw - 70, top + 70, 1.2); heart(px + 70, top + ph - 66, 1.2); heart(px + pw - 70, top + ph - 66, 1.2)
  // text
  g.textAlign = 'center'
  g.fillStyle = '#3b2a35'
  let fs = 132; g.font = `italic 400 ${fs}px ${serif}`
  while (g.measureText(title).width > pw - 150 && fs > 60) { fs -= 4; g.font = `italic 400 ${fs}px ${serif}` }
  g.fillText(title, w / 2, top + ph * 0.5 + fs * 0.18)
  let ss = 36; g.font = `600 ${ss}px Inter, system-ui, sans-serif`
  while (g.measureText(sub).width > pw - 150 && ss > 20) { ss -= 2; g.font = `600 ${ss}px Inter, system-ui, sans-serif` }
  g.fillStyle = '#9a6a7c'; g.fillText(sub, w / 2, top + ph * 0.5 + fs * 0.18 + ss * 1.6)
  g.font = '700 26px Inter, system-ui, sans-serif'; g.fillStyle = '#d4789a'; g.fillText(action, w / 2, top + ph - 66)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

function HangingSign({ tex, hook, w, h, phase, onPick }: { tex: THREE.Texture; hook: [number, number, number]; w: number; h: number; phase: number; onPick: () => void }) {
  const g = useRef<THREE.Group>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const hot = useRef(false)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime, k = hot.current ? 1 : 0
    if (g.current) {
      g.current.rotation.z = Math.sin(t * 0.9 + phase) * (0.012 + k * 0.03)
      g.current.position.z = THREE.MathUtils.damp(g.current.position.z, hook[2] + k * 0.04, 10, dt)
      g.current.scale.setScalar(THREE.MathUtils.damp(g.current.scale.x, 1 + k * 0.04, 10, dt))
    }
    if (mat.current) mat.current.emissiveIntensity = THREE.MathUtils.damp(mat.current.emissiveIntensity, 0.12 + k * 0.25, 10, dt)
  })
  return (
    <group ref={g} position={hook}>
      <mesh position={[0, 0.012, -0.01]}><cylinderGeometry args={[0.012, 0.012, 0.03, 10]} /><meshStandardMaterial color="#d9b48a" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, -h / 2 + 0.06, 0]} castShadow
        onClick={(e) => { e.stopPropagation(); onPick() }}
        onPointerOver={(e) => { e.stopPropagation(); hot.current = true; document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { hot.current = false; document.body.style.cursor = '' }}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial ref={mat} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.12} transparent alphaTest={0.5} roughness={0.55} />
      </mesh>
    </group>
  )
}

function ContactSigns({ email, links, copied, labels, onCopy }: StreetProps) {
  const insta = links.find(([n]) => /insta/i.test(n))
  const linked = links.find(([n]) => /linked/i.test(n))
  const handle = insta ? '@' + insta[1].replace(/\/+$/, '').split('/').pop() : ''
  const open = (href?: string) => { if (href) window.open(href, '_blank', 'noopener,noreferrer') }
  const tex = useMemo(() => ({
    insta: signTexture(700, 760, 'Instagram', handle, labels.open.toUpperCase() + ' ↗'),
    linked: signTexture(700, 760, 'LinkedIn', 'Ana Julia Yaguti Matilha', labels.open.toUpperCase() + ' ↗'),
  }), [handle, labels.open])
  const mail = useMemo(() => signTexture(1200, 700, 'e-mail', email, copied ? labels.copied.toUpperCase() + ' ✓' : labels.copy.toUpperCase() + ' ⧉'), [email, copied, labels.copy, labels.copied])
  return (
    <group>
      <HangingSign tex={tex.insta} hook={[3.05, 2.42, 0.03]} w={0.66} h={0.66 * 760 / 700} phase={0} onPick={() => open(insta?.[1])} />
      <HangingSign tex={tex.linked} hook={[4.0, 2.42, 0.03]} w={0.66} h={0.66 * 760 / 700} phase={1.7} onPick={() => open(linked?.[1])} />
      <HangingSign tex={mail} hook={[3.52, 1.62, 0.03]} w={1.06} h={1.06 * 700 / 1200} phase={3.1} onPick={onCopy} />
    </group>
  )
}

/** a long ceramic planter at the foot of the wall, with her pink lilies (the desk's bouquet) — she loves lilies */
function Planter() {
  return (
    <group>
      <mesh position={[MAILBOX_AT.x, 0.17, 0.24]} castShadow receiveShadow><boxGeometry args={[1.2, 0.34, 0.32]} /><meshStandardMaterial color="#f7ebe6" roughness={0.4} /></mesh>
      <mesh position={[MAILBOX_AT.x, 0.31, 0.24]}><boxGeometry args={[1.24, 0.04, 0.35]} /><meshStandardMaterial color="#efc6d2" roughness={0.35} /></mesh>
      <GlbProp url={LILIES_URL} x={MAILBOX_AT.x - 0.3} z={0.24} top={0.3} height={0.62} rotation={[0, 0.4, 0]} />
      <GlbProp url={LILIES_URL} x={MAILBOX_AT.x + 0.32} z={0.25} top={0.3} height={0.56} rotation={[0, -1.1, 0]} />
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

/** two of her arcade posters pasted on the shop front, a bit weathered */
function WallPosters() {
  const maps = useTexture([posterBike, posterRadio])
  useMemo(() => maps.forEach((m) => { m.colorSpace = THREE.SRGBColorSpace; m.anisotropy = 8 }), [maps])
  const items: [number, number, number, number][] = [[0.55, 1.7, 0.56, -0.03], [1.12, 2.02, 0.38, 0.05]]
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.55, 0.005, 1.1]}><planeGeometry args={[1.6, 1.4]} /><meshBasicMaterial map={cool} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
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
    l.target.position.set(MAILBOX_AT.x, 0.6, 0.7); scene.add(l.target)
    return () => { scene.remove(l.target) }
  }, [scene])
  return <spotLight ref={light} position={[MAILBOX_AT.x, 2.55, 0.42]} angle={0.85} penumbra={0.9} intensity={26} distance={6} decay={2} color="#ffc995" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
}

/**
 * The main call, in the street's own language: a pink neon sign in her handwriting-like script on the wall above the
 * mailbox ("deixe um recado ↓"). Core tube in HDR (the bloom makes the glow), a soft halo painted around it, a small pink
 * light so the enamel picks up the colour, and a rare flicker like a real tube.
 */
function NeonSign({ text }: { text: string }) {
  // the script font comes from Google Fonts: redraw once it is really loaded (a canvas won't wait for it)
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
      // the arrow, pointing down at the mailbox
      const ax = W - 140, ay = H / 2 - 40
      g.beginPath(); g.moveTo(ax, ay - 70); g.lineTo(ax, ay + 80); g.moveTo(ax - 38, ay + 42); g.lineTo(ax, ay + 82); g.lineTo(ax + 38, ay + 42); g.stroke()
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
    }
    return { core: make(0, 7, '#fff2f6'), halo: make(16, 22, '#ff86ad'), aspect: W / H }
  }, [text, font])
  const coreMat = useRef<THREE.MeshBasicMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const base = useMemo(() => new THREE.Color('#ffd0df'), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const f = Math.sin(t * 0.55) > 0.988 ? 0.35 + Math.random() * 0.4 : 1
    coreMat.current?.color.copy(base).multiplyScalar(3.4 * f)
    if (light.current) light.current.intensity = 2.2 * f
  })
  const w = 1.35, h = w / aspect
  return (
    <group position={[MAILBOX_AT.x + 0.06, MAILBOX_AT.y + MAILBOX_H / 2 + 0.3, 0.05]} rotation={[0, 0, -0.03]}>
      <mesh position={[0, 0, 0.002]}><planeGeometry args={[w * 1.05, h * 1.1]} /><meshBasicMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.9} /></mesh>
      <mesh position={[0, 0, 0.004]}><planeGeometry args={[w, h]} /><meshBasicMaterial ref={coreMat} map={core} transparent depthWrite={false} toneMapped={false} /></mesh>
      <pointLight ref={light} position={[0, -0.15, 0.35]} color="#ff8fb3" intensity={1.6} distance={2.4} decay={2} />
    </group>
  )
}

/** a recessed downlight under the canopy — where the warm spot on the mailbox comes from */
function Downlight() {
  return (
    <mesh position={[MAILBOX_AT.x, 2.575, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.06, 20]} /><meshBasicMaterial color={new THREE.Color('#ffe2bd').multiplyScalar(2.4)} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Camera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    const aspect = size.width / size.height
    // the mailbox a little left of centre, the board to its right, the alley's dark mouth on the left for the title
    if (aspect >= 1.15) { cam.position.set(1.85, 1.55, 5.3); cam.lookAt(2.15, 1.32, 0) }
    else { cam.position.set(2.85, 1.5, 8.2); cam.lookAt(2.85, 1.3, 0) } // phones: back off until the mailbox and the board both fit
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

function Street(props: StreetProps) {
  const bokeh = useMemo(() => radial([[0, 'rgba(255,214,170,.9)'], [0.3, 'rgba(255,190,140,.3)'], [1, 'rgba(255,190,140,0)']]), [])
  const far: [number, number, number, number][] = [[-1.9, 1.6, -13, 0.5], [-0.9, 2.1, -14, 0.4], [-1.4, 1.1, -12, 0.35], [-0.6, 1.4, -15, 0.6], [-2.2, 2.4, -14.5, 0.45]]
  return (
    <group>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 8, 22]} />
      {/* the night: dim cool sky, the street's own lights do the rest */}
      <hemisphereLight color="#ffe1ec" groundColor="#6a5060" intensity={0.95} />
      {/* a soft pink-cream fill from the street side: nothing on the wall falls into black */}
      <directionalLight position={[1.5, 3, 6]} color="#fff0f3" intensity={0.75} />
      {/* 1 · the vending machine's cool glow */}
      <pointLight position={[5.55, 1.15, 1.2]} color="#e2f4ff" intensity={1.6} distance={3.2} decay={2} />
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
      <WallPlane w={WALL.x1 - WALL.x0} h={WALL.h} pos={[(WALL.x0 + WALL.x1) / 2, WALL.h / 2, 0]} base="#f1dcd4" seed={3} />
      <WallPlane w={-ALLEY.z1} h={WALL.h + 1} pos={[ALLEY.x1, (WALL.h + 1) / 2, ALLEY.z1 / 2]} rot={[0, -Math.PI / 2, 0]} base="#d4b8b4" seed={8} />
      <WallPlane w={-ALLEY.z1 + 3} h={WALL.h + 1.4} pos={[ALLEY.x0, (WALL.h + 1.4) / 2, (ALLEY.z1 + 3) / 2]} rot={[0, Math.PI / 2, 0]} base="#c7aaa8" seed={11} />
      {/* a canopy edge over the shop front and a kerb */}
      <mesh position={[(WALL.x0 + WALL.x1) / 2, 2.62, 0.22]} castShadow><boxGeometry args={[WALL.x1 - WALL.x0, 0.08, 0.46]} /><meshStandardMaterial color="#e9c9d2" roughness={0.6} /></mesh>
      <mesh position={[(WALL.x0 + WALL.x1) / 2, 0.06, 0.14]} receiveShadow><boxGeometry args={[WALL.x1 - WALL.x0, 0.12, 0.28]} /><meshStandardMaterial color="#cbb9bf" roughness={0.85} /></mesh>

      <Wainscot />
      <WallPosters />
      <Pools />
      <Vending />
      <Mailbox onLetter={props.onLetter} />
      <NeonSign text={props.labels.letterKicker} />
      <Downlight />
      <ContactSigns {...props} />
      <Planter />
      <Pipe x={0.86} z={0.05} />
      <ACUnit pos={[4.95, 2.95, 0.16]} />
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
      <Lantern x={5.05} y={2.25} z={0.7} top={2.62} color="#f3e2b8" size={0.17} />
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

export default function ContactStreet(props: StreetProps) {
  const box = useRef<HTMLDivElement>(null)
  const onScreen = useOnScreen(box)
  const [dpr] = useAdaptiveDpr(1.5)
  return (
    <div ref={box} className="ct-street">
      {/* the same four actions for keyboards and screen readers (the scene itself is pointer-only) */}
      <nav className="sr" aria-label="Contato">
        <button type="button" onClick={props.onLetter}>{props.labels.letter}</button>
        {props.links.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noopener noreferrer">{name}</a>)}
        <button type="button" onClick={props.onCopy}>{props.labels.copy}: {props.email}</button>
      </nav>
      <p className="ct-status" role="status" aria-live="polite">{props.copied ? `${props.email} · ${props.labels.copied} ✓` : ''}</p>
      <Canvas shadows dpr={dpr} frameloop={onScreen ? 'always' : 'never'} camera={{ position: [1.05, 1.5, 5.3], fov: 38, near: 0.05, far: 40 }} gl={{ antialias: false, alpha: false, toneMapping: THREE.NoToneMapping }}>
        <Camera />
        <Suspense fallback={null}>
          <SceneReady />{/* holds the page curtain until this scene has drawn */}
          <Street {...props} />
        </Suspense>
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={0.4} distanceFalloff={0.8} intensity={1.6} halfRes quality="low" />
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
