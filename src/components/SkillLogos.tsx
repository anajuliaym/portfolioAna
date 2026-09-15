import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { LOGOS } from './logoPaths'
import { useI18n } from '../i18n'
import type { Tool } from '../pages/content'

const ACCENT = '#a6c69a'
const CAM_Z = 6
const FOCUS_Z = 1.2
const FOCUS_SCALE = 2.4
const ease = [0.16, 1, 0.3, 1] as const
const SPOT = '#ffc27a'

type Mode = 'idle' | 'focus' | 'away'

const seeded = (i: number) => ((Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1 + 1) % 1

/**
 * Extrudes a 24×24 SVG path into a 1-unit-wide "inflated" badge: deep rounded bevels
 * plus smoothed normals give the pillowy clay look (SVG y points down, so flip it).
 */
function logoGeometry(id: string) {
  const { d, fillRule = 'nonzero' } = LOGOS[id]
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill-rule="${fillRule}"/></svg>`)
  const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p))
  // no negative bevelOffset: shrinking thin strokes makes the bevel self-intersect and tear
  const raw = new THREE.ExtrudeGeometry(shapes, { depth: 3, bevelEnabled: true, bevelThickness: 1.8, bevelSize: 1.1, bevelSegments: 8, curveSegments: 10 })
  // flip with a rotation, not a negative scale: mirroring would invert the winding and cull the front faces
  raw.scale(1 / 24, 1 / 24, 1 / 24)
  raw.rotateX(Math.PI)
  raw.center()
  raw.deleteAttribute('normal')
  raw.deleteAttribute('uv')
  const geo = mergeVertices(raw)
  geo.computeVertexNormals()
  raw.dispose()
  return geo
}

function useLayout(n: number) {
  const { width, height, aspect } = useThree((s) => s.viewport)
  return useMemo(() => {
    const rows = aspect > 1.4 ? 2 : aspect > 0.85 ? 3 : 4
    const cols = Math.ceil(n / rows)
    const cell = Math.min((width * 0.88) / cols, (height * 0.82) / rows)
    const pts: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols)
      const c = i % cols
      const inRow = Math.min(cols, n - r * cols)
      pts.push([
        (c - (inRow - 1) / 2) * cell + (seeded(i) - 0.5) * cell * 0.2,
        ((rows - 1) / 2 - r) * cell * 0.95 + (seeded(i + 11) - 0.5) * cell * 0.2,
        (seeded(i + 23) - 0.5) * 0.5,
      ])
    }
    return { pts, size: cell * 0.6, narrow: aspect < 0.9 }
  }, [n, width, height, aspect])
}

function Logo({
  tool, index, base, size, mode, focusX, focusY, focusScale, hovered, onHover, onSelect,
}: {
  tool: Tool; index: number; base: [number, number, number]; size: number; mode: Mode; focusX: number; focusY: number; focusScale: number; hovered: boolean
  onHover: (id: string | null) => void; onSelect: (t: Tool) => void
}) {
  const geo = useMemo(() => logoGeometry(tool.id), [tool.id])
  const tint = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 }
    new THREE.Color(LOGOS[tool.id].color).getHSL(hsl)
    const base = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.1), Math.min(0.55, hsl.l))
    return { base, hot: base.clone().lerp(new THREE.Color('#ffffff'), 0.25) }
  }, [tool.id])
  // glossy clay: soft base with a wet clearcoat on top
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: tint.base, roughness: 0.14, metalness: 0, reflectivity: 1, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.7,
    sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color('#bcd8ff'),
  }), [tint])
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])
  const ref = useRef<THREE.Group>(null)
  const phase = index * 1.7

  useFrame((state, dt) => {
    const g = ref.current
    if (!g) return
    const t = state.clock.elapsedTime
    let px = base[0], py = base[1] + Math.sin(t * 0.8 + phase) * 0.05, pz = base[2]
    let rx = hovered ? 0 : Math.cos(t * 0.6 + phase) * 0.18
    let ry = hovered ? 0 : Math.sin(t * 0.45 + phase) * 0.35
    let s = (hovered ? 1.28 : 1) * size
    let k = 5
    if (mode === 'focus') {
      // come forward to the camera, slow turntable
      px = focusX; py = focusY + Math.sin(t * 0.7) * 0.02; pz = FOCUS_Z
      rx = Math.sin(t * 0.4) * 0.08; ry = Math.sin(t * 0.5) * 0.22
      s = size * focusScale; k = 4
    } else if (mode === 'away') {
      // scatter outwards and shrink out of the frame
      px = base[0] * 3; py = base[1] * 3; pz = base[2] - 2
      s = 0.0001; k = 4
    }
    g.position.x = THREE.MathUtils.damp(g.position.x, px, k, dt)
    g.position.y = THREE.MathUtils.damp(g.position.y, py, k, dt)
    g.position.z = THREE.MathUtils.damp(g.position.z, pz, k, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, rx, 5, dt)
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ry, 5, dt)
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 6, dt))
    g.visible = g.scale.x > 0.01
    mat.color.lerp(hovered ? tint.hot : tint.base, 1 - Math.exp(-6 * dt))
  })

  return (
    <group ref={ref} position={base} scale={size}>
      <mesh
        geometry={geo}
        material={mat}
        onPointerOver={(e) => { e.stopPropagation(); onHover(tool.id) }}
        onPointerOut={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); onSelect(tool) }}
      />
      {hovered && mode === 'idle' && (
        <Html center position={[0, 0.72, 0]} zIndexRange={[50, 0]} style={{ pointerEvents: 'none' }}>
          <div className="logo-label">{tool.name}</div>
        </Html>
      )}
    </group>
  )
}

const beamShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color; uniform float fade;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      // brighter near the source, soft towards the rim of the cone
      float edge = pow(abs(dot(vN, vV)), 1.4);
      float a = pow(vUv.y, 1.2) * edge * 0.95 * fade;
      gl_FragColor = vec4(color * a, a);
    }`,
}
const glowShader = {
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color; uniform float fade;
    varying vec2 vUv;
    void main() {
      float d = length(vUv - 0.5) * 2.0;
      float a = smoothstep(1.0, 0.0, d);
      a = a * a * 0.9 * fade;
      gl_FragColor = vec4(color * a, a);
    }`,
}

/** Warm spotlight on the focused logo: a real light from above plus a visible cone and a pool of light behind it. */
function Spotlight({ r }: { r: number }) {
  const light = useRef<THREE.SpotLight>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  const beam = useMemo(() => new THREE.ShaderMaterial({ ...beamShader, uniforms: { color: { value: new THREE.Color(SPOT) }, fade: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), [])
  const glow = useMemo(() => new THREE.ShaderMaterial({ ...glowShader, uniforms: { color: { value: new THREE.Color(SPOT) }, fade: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [])
  useEffect(() => () => { beam.dispose(); glow.dispose() }, [beam, glow])
  useFrame((state, dt) => {
    const breathe = 0.92 + Math.sin(state.clock.elapsedTime * 1.3) * 0.08
    beam.uniforms.fade.value = THREE.MathUtils.damp(beam.uniforms.fade.value, breathe, 2.5, dt)
    glow.uniforms.fade.value = THREE.MathUtils.damp(glow.uniforms.fade.value, breathe, 2.5, dt)
    if (light.current) light.current.intensity = THREE.MathUtils.damp(light.current.intensity, 22 * breathe, 2.5, dt)
  })
  const h = r * 5.2
  return (
    <>
      <primitive object={target} position={[0, 0, 0]} />
      <spotLight ref={light} target={target} position={[0.4, r * 4.5, 2.2]} angle={0.42} penumbra={0.9} decay={2} distance={0} color={SPOT} intensity={0} />
      <mesh position={[0, r * 1.1, 0.25]} rotation={[-0.22, 0, 0]} material={beam}>
        <coneGeometry args={[r * 1.7, h, 48, 1, true]} />
      </mesh>
      <mesh position={[0, -r * 0.1, -0.35]} material={glow}>
        <planeGeometry args={[r * 4.2, r * 4.2]} />
      </mesh>
    </>
  )
}

/** Thin rings orbiting the focused logo. */
function Rings({ r }: { r: number }) {
  const a = useRef<THREE.Mesh>(null)
  const b = useRef<THREE.Mesh>(null)
  useFrame((state, dt) => {
    if (a.current) a.current.rotation.z += dt * 0.35
    if (b.current) { b.current.rotation.z -= dt * 0.6; b.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.35 }
  })
  return (
    <>
      <mesh ref={a}>
        <ringGeometry args={[r, r + 0.006, 96, 1, 0, Math.PI * 1.35]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>
      <mesh ref={b}>
        <ringGeometry args={[r * 1.16, r * 1.16 + 0.004, 96, 1, 0, Math.PI * 0.55]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>
    </>
  )
}

type Callout = { side: 'left' | 'right' | 'up' | 'down'; pts: [number, number][]; kicker?: string; value?: string; text?: string; delay: number }

/** 2D HUD anchored to the focused logo: lines drawn out of it with the tool's details at their ends. */
function Hud({ tool, R, reach, narrow, focusX, focusY }: { tool: Tool; R: number; reach: number; narrow: boolean; focusX: number; focusY: number }) {
  const { t, lang } = useI18n()
  const level = `${tool.level} / 5${tool.since ? ` · ${t('sk_since')} ${tool.since}` : ''}`
  if (!Number.isFinite(R)) return null
  const callouts: Callout[] = narrow
    ? [
        { side: 'up', pts: [[-0.5 * R, -0.75 * R], [-0.8 * R, -1.1 * R], [-0.8 * R, -1.1 * R - 22]], kicker: t('sk_level'), value: level, delay: 0.35 },
        { side: 'up', pts: [[0.5 * R, -0.75 * R], [0.8 * R, -1.1 * R], [0.8 * R, -1.1 * R - 22]], kicker: t('sk_area'), value: tool.area[lang], delay: 0.5 },
        { side: 'down', pts: [[0, 0.95 * R], [0, 1.25 * R], [0, 1.25 * R + 24]], text: tool.desc[lang], delay: 0.65 },
      ]
    : [
        // logo sits on the left; the three lines fan out to the right
        { side: 'right', pts: [[0.7 * R, -0.5 * R], [1.35 * R, -1.0 * R], [1.35 * R + reach, -1.0 * R]], kicker: t('sk_level'), value: level, delay: 0.35 },
        { side: 'right', pts: [[0.82 * R, 0], [1.55 * R, 0], [1.55 * R + reach, 0]], kicker: t('sk_area'), value: tool.area[lang], delay: 0.5 },
        { side: 'right', pts: [[0.7 * R, 0.5 * R], [1.35 * R, 1.0 * R], [1.35 * R + reach, 1.0 * R]], text: tool.desc[lang], delay: 0.65 },
      ]

  return (
    <group position={[focusX, focusY, FOCUS_Z]}>
      <Html center zIndexRange={[50, 0]} style={{ pointerEvents: 'none' }}>
        <div className="hud">
          <svg width="1" height="1" aria-hidden>
            {callouts.map((c, i) => (
              <g key={i}>
                <motion.path
                  d={`M${c.pts[0][0]} ${c.pts[0][1]} L${c.pts[1][0]} ${c.pts[1][1]} L${c.pts[2][0]} ${c.pts[2][1]}`}
                  fill="none" stroke={ACCENT} strokeWidth="1.2"
                  initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: c.delay, duration: 0.55, ease }}
                />
                <motion.circle cx={c.pts[0][0]} cy={c.pts[0][1]} r="3" fill={ACCENT}
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: c.delay, duration: 0.3 }} />
                <motion.circle cx={c.pts[2][0]} cy={c.pts[2][1]} r="2.5" fill="none" stroke={ACCENT} strokeWidth="1.2"
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: c.delay + 0.45, duration: 0.3 }} />
              </g>
            ))}
          </svg>
          {callouts.map((c, i) => (
            <motion.div
              key={i}
              className="hud-anchor"
              style={{ left: c.pts[2][0], top: c.pts[2][1] }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: c.delay + 0.4, duration: 0.5, ease }}
            >
              <div className={`hud-label ${c.side}`}>
                {c.kicker && <span className="meta">{c.kicker}</span>}
                {c.value && <b>{c.value}</b>}
                {c.text && <p>{c.text}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </Html>
    </group>
  )
}

function Cloud({ tools, selected, onSelect }: { tools: Tool[]; selected: Tool | null; onSelect: (t: Tool | null) => void }) {
  const { pts, size } = useLayout(tools.length)
  const { size: css, viewport } = useThree()
  const [hovered, setHovered] = useState<string | null>(null)
  const group = useRef<THREE.Group>(null)
  // below ~1000px the side callouts don't fit, so the HUD stacks vertically around a slightly smaller logo
  const narrow = css.width < 1000
  const focusScale = narrow ? 2.0 : FOCUS_SCALE
  const focusY = narrow ? 0.3 : 0
  // px per world unit at the focus depth, so the HUD can start its lines at the logo's edge
  const depthK = (CAM_Z - FOCUS_Z) / CAM_Z
  const pxPerUnit = css.height / (viewport.height * depthK)
  // wide: park the logo on the left so the callouts have the right half of the stage
  const focusX = narrow ? 0 : -viewport.width * depthK * 0.22
  const R = size * focusScale * 0.5 * pxPerUnit
  const centerPx = css.width / 2 + focusX * pxPerUnit
  const reach = THREE.MathUtils.clamp(css.width - centerPx - 1.55 * R - 360, 40, 160)

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
    return () => { document.body.style.cursor = '' }
  }, [hovered])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const amt = selected ? 0.04 : 1
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.12 * amt, 3, dt)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.08 * amt, 3, dt)
  })

  return (
    <group ref={group}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[2, 4, 4]} intensity={1.5} color="#fff1dc" />
      <directionalLight position={[-3, -1.5, 2]} intensity={0.7} color="#7fb8ff" />
      <Environment resolution={256} frames={1}>
        {/* big soft key from above, then thin bright strips that draw crisp highlights on the glossy coat */}
        <Lightformer form="rect" intensity={4} color="#fff3dd" position={[0, 5, 2]} scale={[8, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={6} color="#ffffff" position={[-2, 3, 5]} scale={[6, 0.35, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color="#9fc8ff" position={[3, -1, 4]} scale={[4, 0.25, 1]} rotation={[0, 0, 0.5]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.2} color="#7fb6ff" position={[-5, -2, 1]} scale={[3, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="circle" intensity={5} color="#ffffff" position={[4, 2, 4]} scale={1.2} target={[0, 0, 0]} />
      </Environment>
      {tools.map((tool, i) => (
        <Logo
          key={tool.id} tool={tool} index={i} base={pts[i]} size={size} focusX={focusX} focusY={focusY} focusScale={focusScale}
          mode={selected ? (selected.id === tool.id ? 'focus' : 'away') : 'idle'}
          hovered={hovered === tool.id && !selected}
          onHover={setHovered}
          onSelect={(t) => onSelect(selected?.id === t.id ? null : t)}
        />
      ))}
      {selected && (
        <group position={[focusX, focusY, FOCUS_Z]}>
          <Spotlight r={size * focusScale * 0.5} />
          <Rings r={size * focusScale * 0.68} />
        </group>
      )}
      {selected && <Hud key={selected.id} tool={selected} R={R} reach={reach} narrow={narrow} focusX={focusX} focusY={focusY} />}
    </group>
  )
}

export default function SkillLogos({ tools }: { tools: Tool[] }) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<Tool | null>(null)

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  return (
    <>
      <div className="skills-stage">
        <Canvas
          camera={{ position: [0, 0, CAM_Z], fov: 30 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, alpha: true, toneMapping: 3, premultipliedAlpha: false }}
          onPointerMissed={() => setSelected(null)}
        >
          <Suspense fallback={null}>
            <Cloud tools={tools} selected={selected} onSelect={setSelected} />
          </Suspense>
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.45} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
          </EffectComposer>
        </Canvas>
        {selected && (
          <button className="hud-close meta" onClick={() => setSelected(null)}>{t('close')}</button>
        )}
      </div>
      <span className="meta skills-hint">{selected ? t('sk_back') : t('sk_hint')}</span>
    </>
  )
}
