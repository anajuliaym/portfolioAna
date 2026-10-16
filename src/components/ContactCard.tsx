import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useI18n } from '../i18n'

/**
 * Contact = Ana's business card (chosen 2026-10-16 over five other ideas, after the cork board was dropped as
 * "bagunçado"): one cream card floating in 3D, lit for real — paper with fibre grain and a satin laminate, a
 * GLASS heart in relief (transmission), soft studio light from Lightformers, a contact shadow and a blurred
 * reflection on a dark lacquered table. It tilts toward the pointer and flips on click: front = name, role,
 * e-mail (click copies); back = the social links (click opens) and "escreva um recado" pointing to the form below.
 */

export const CARD = { w: 1.0, h: 0.58, t: 0.012, r: 0.05 }
const TEX_W = 2000, TEX_H = 1160 // 2000 px across 1.0 world → 1 px = 0.0005

type Hit = { kind: 'email' } | { kind: 'link'; href: string }
export type CardProps = { email: string; links: [string, string][]; onEmail: () => void; flipped: boolean; setFlipped: (v: boolean) => void; copied: boolean }

/* ---------- textures: the printed faces, drawn on canvases in the site's type ---------- */
function paperBase(g: CanvasRenderingContext2D, w: number, h: number) {
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#f7f1e6'); bg.addColorStop(1, '#ebe2d3')
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  // paper fibre: faint speckles
  g.globalAlpha = 0.07
  for (let i = 0; i < 2600; i++) { g.fillStyle = i % 3 ? '#6b5a4a' : '#ffffff'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1) }
  g.globalAlpha = 1
}
function frontCanvas(email: string, lang: 'pt' | 'en') {
  const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H
  const g = c.getContext('2d')!
  paperBase(g, TEX_W, TEX_H)
  g.fillStyle = '#1b1620'
  g.font = "400 196px 'Butler', 'Instrument Serif', Georgia, serif"
  g.fillText('Ana Julia', 150, 420)
  g.fillStyle = '#6b5a6e'
  g.font = '500 40px Inter, system-ui, sans-serif'
  const role = lang === 'pt' ? 'PRODUCT DESIGNER · DESENVOLVEDORA' : 'PRODUCT DESIGNER · DEVELOPER'
  drawTracked(g, role, 160, 520, 10)
  // e-mail, bottom-left, with a hairline over it
  g.fillStyle = '#3f6b6a'; g.fillRect(150, 930, 520, 2)
  g.fillStyle = '#3f6b6a'
  g.font = '500 44px Inter, system-ui, sans-serif'
  g.fillText(email, 150, 1005)
  // a small lily mark top-right (four petals)
  g.fillStyle = '#f2a0b4'
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.beginPath(); g.ellipse(1760 + Math.cos(a) * 26, 200 + Math.sin(a) * 26, 30, 16, a, 0, Math.PI * 2); g.fill() }
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(1760, 200, 11, 0, Math.PI * 2); g.fill()
  return c
}
function backCanvas(links: [string, string][], lang: 'pt' | 'en') {
  const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H
  const g = c.getContext('2d')!
  paperBase(g, TEX_W, TEX_H)
  g.fillStyle = '#9a6a7c'
  g.font = '500 36px Inter, system-ui, sans-serif'
  drawTracked(g, lang === 'pt' ? 'ME ENCONTRA EM' : 'FIND ME ON', 150, 230, 9)
  g.font = "400 112px 'Butler', 'Instrument Serif', Georgia, serif"
  links.forEach(([name], i) => {
    const y = 420 + i * 160
    g.fillStyle = '#1b1620'; g.fillText(name, 150, y)
    g.fillStyle = '#3f6b6a'; g.font = '400 60px Inter, system-ui, sans-serif'; g.fillText('↗', 150 + g.measureText(name).width * 1.65 + 40, y - 8)
    g.font = "400 112px 'Butler', 'Instrument Serif', Georgia, serif"
    g.fillStyle = 'rgba(27,22,32,.12)'; g.fillRect(150, y + 34, 760, 2)
  })
  g.fillStyle = '#6b5a6e'
  g.font = '500 34px Inter, system-ui, sans-serif'
  drawTracked(g, lang === 'pt' ? 'OU ESCREVE UM RECADO AQUI EMBAIXO ↓' : 'OR LEAVE A NOTE BELOW ↓', 150, 1030, 8)
  g.fillStyle = '#9a6a7c'
  drawTracked(g, 'SÃO PAULO · BR', 1080, 230, 9)
  return c
}
function drawTracked(g: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  let cx = x
  for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + tracking }
}
/** rounded-rect alpha mask so the printed faces follow the card's corners */
function maskCanvas() {
  const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H
  const g = c.getContext('2d')!
  const r = (CARD.r / CARD.w) * TEX_W
  g.fillStyle = '#000'; g.fillRect(0, 0, TEX_W, TEX_H)
  g.fillStyle = '#fff'; g.beginPath(); g.roundRect(0, 0, TEX_W, TEX_H, r); g.fill()
  return c
}
function roughnessCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},0,0,.12)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 1) }
  return c
}

const heartShape = () => {
  const s = new THREE.Shape()
  const x = 0, y = 0
  s.moveTo(x, y - 0.5)
  s.bezierCurveTo(x, y - 0.5, x - 0.6, y - 0.9, x - 1.0, y - 0.3)
  s.bezierCurveTo(x - 1.4, y + 0.3, x - 0.6, y + 0.9, x, y + 1.0)
  s.bezierCurveTo(x + 0.6, y + 0.9, x + 1.4, y + 0.3, x + 1.0, y - 0.3)
  s.bezierCurveTo(x + 0.6, y - 0.9, x, y - 0.5, x, y - 0.5)
  return s
}

function useDisplayFont() {
  const [ready, setReady] = useState(() => document.fonts.check("40px 'Butler'"))
  useEffect(() => { if (!ready) document.fonts.load("40px 'Butler'").then(() => setReady(true), () => setReady(true)) }, [ready])
  return ready
}

/* ---------- the card ---------- */
function Card({ email, links, onEmail, flipped, setFlipped }: CardProps) {
  const { lang } = useI18n()
  const fontReady = useDisplayFont()
  const group = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const { size } = useThree()
  const pointer = useRef({ x: 0, y: 0 })
  const [hover, setHover] = useState<string | null>(null)

  const tex = useMemo(() => {
    const mk = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }
    const front = mk(frontCanvas(email, lang))
    const back = mk(backCanvas(links, lang))
    const mask = new THREE.CanvasTexture(maskCanvas())
    const rough = new THREE.CanvasTexture(roughnessCanvas()); rough.wrapS = rough.wrapT = THREE.RepeatWrapping; rough.repeat.set(3, 2)
    return { front, back, mask, rough }
    // redrawn once the display font is in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, links, lang, fontReady])

  const body = useMemo(() => {
    const s = new THREE.Shape()
    const { w, h, r } = CARD
    s.moveTo(-w / 2 + r, -h / 2)
    s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
    s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
    s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
    const g = new THREE.ExtrudeGeometry(s, { depth: CARD.t, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 16 })
    g.translate(0, 0, -CARD.t / 2)
    return g
  }, [])

  const heart = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.5, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.16, bevelSegments: 6, curveSegments: 24 })
    g.center(); g.scale(0.055, 0.055, 0.055); g.rotateX(Math.PI) // point down
    return g
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => { pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1) }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state, dt) => {
    const g = group.current, inn = inner.current
    if (!g || !inn) return
    const t = state.clock.elapsedTime
    // hover: a slow float
    g.position.y = THREE.MathUtils.damp(g.position.y, 0.02 + Math.sin(t * 0.9) * 0.012, 3, dt)
    // flip + tilt toward the pointer
    const targetY = (flipped ? Math.PI : 0) + pointer.current.x * 0.22 + Math.sin(t * 0.5) * 0.03
    const targetX = -pointer.current.y * 0.16 + Math.cos(t * 0.7) * 0.02
    inn.rotation.y = THREE.MathUtils.damp(inn.rotation.y, targetY, 4.5, dt)
    inn.rotation.x = THREE.MathUtils.damp(inn.rotation.x, targetX, 4.5, dt)
    document.body.style.cursor = hover ? 'pointer' : ''
  })

  const narrow = size.width < 760
  const scale = narrow ? Math.min(1, (size.width / size.height) * 1.9) : 1

  const hitHandlers = (hit: Hit, id: string) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(id) },
    onPointerOut: () => setHover((h) => (h === id ? null : h)),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (hit.kind === 'email') onEmail()
      else window.open(hit.href, '_blank', 'noopener')
    }
  })

  return (
    <group ref={group} scale={scale}>
      <group ref={inner} onClick={(e) => { e.stopPropagation(); setFlipped(!flipped) }} onPointerOver={() => setHover('card')} onPointerOut={() => setHover(null)}>
        {/* the paper body: cream, a little satin (laminate) */}
        <mesh geometry={body} castShadow receiveShadow>
          <meshPhysicalMaterial color="#efe6d6" roughness={0.62} roughnessMap={tex.rough} clearcoat={0.35} clearcoatRoughness={0.4} sheen={0.4} sheenColor="#fff6ec" />
        </mesh>
        {/* printed faces (rounded alpha mask) */}
        <mesh position={[0, 0, CARD.t / 2 + 0.0022]} receiveShadow>
          <planeGeometry args={[CARD.w, CARD.h]} />
          <meshPhysicalMaterial map={tex.front} alphaMap={tex.mask} transparent roughness={0.55} roughnessMap={tex.rough} clearcoat={0.4} clearcoatRoughness={0.35} />
        </mesh>
        <mesh position={[0, 0, -CARD.t / 2 - 0.0022]} rotation={[0, Math.PI, 0]} receiveShadow>
          <planeGeometry args={[CARD.w, CARD.h]} />
          <meshPhysicalMaterial map={tex.back} alphaMap={tex.mask} transparent roughness={0.55} roughnessMap={tex.rough} clearcoat={0.4} clearcoatRoughness={0.35} />
        </mesh>
        {/* the glass heart, in relief at the bottom-right of the front */}
        <mesh geometry={heart} position={[0.37, -0.17, CARD.t / 2 + 0.03]} castShadow>
          <meshPhysicalMaterial color="#ffd9e3" transmission={1} thickness={0.25} roughness={0.04} ior={1.5} clearcoat={1} clearcoatRoughness={0.04} attenuationColor="#f2a0b4" attenuationDistance={1.0} envMapIntensity={1.8} specularIntensity={1} />
        </mesh>
        {/* hit zones: e-mail (front), links (back) */}
        <mesh position={[-0.14, -0.215, CARD.t / 2 + 0.004]} {...hitHandlers({ kind: 'email' }, 'email')} visible={!flipped}>
          <planeGeometry args={[0.62, 0.08]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {links.map(([name, href], i) => (
          <mesh key={name} position={[0.2, 0.235 - i * 0.08 - 0.045, -CARD.t / 2 - 0.004]} rotation={[0, Math.PI, 0]} {...hitHandlers({ kind: 'link', href }, name)} visible={flipped}>
            <planeGeometry args={[0.46, 0.075]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Studio() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        {/* a big cream softbox above, a cool strip to the left, a pink rim from behind-right, a sage bounce below */}
        <Lightformer form="rect" intensity={5} color="#fff3e2" position={[0, 4, 3]} scale={[7, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color="#dfe8ff" position={[-4, 2, 2]} scale={[1.2, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={4} color="#f2a0b4" position={[4, 1.5, -3]} scale={[3, 1, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.5} color="#a6c69a" position={[0, -3, 2]} scale={4} target={[0, 0, 0]} />
      </Environment>
      <directionalLight position={[1.5, 3, 2.5]} intensity={1.6} color="#fff1e0" castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0003} shadow-camera-near={0.5} shadow-camera-far={8} shadow-camera-left={-1.5} shadow-camera-right={1.5} shadow-camera-top={1.5} shadow-camera-bottom={-1.5} />
      <ambientLight intensity={0.15} />
    </>
  )
}

export default function ContactCard(props: CardProps) {
  return (
    <Canvas shadows camera={{ position: [0, 0.45, 2.1], fov: 28 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
      {/* fog in the page colour dissolves the table's horizon: no band, only the reflection under the card */}
      <fog attach="fog" args={['#0c0d12', 1.6, 4.2]} />
      <Suspense fallback={null}>
        <Studio />
        <group position={[0, -0.05, 0]}>
          <Card {...props} />
        </group>
        {/* the dark lacquered table: a blurred reflection of the card, and its soft contact shadow */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]}>
          <planeGeometry args={[8, 8]} />
          {/* the table is the page colour itself (no lit band): only the blurred reflection is visible */}
          <MeshReflectorMaterial blur={[500, 160]} resolution={1024} mixBlur={1} mixStrength={2.2} roughness={1} depthScale={0.8} minDepthThreshold={0.3} maxDepthThreshold={1.2} color="#08090d" metalness={0} mirror={0.35} envMapIntensity={0} />
        </mesh>
        <ContactShadows position={[0, -0.415, 0]} opacity={0.75} scale={4} blur={2.6} far={1.2} color="#05050a" />
      </Suspense>
    </Canvas>
  )
}
