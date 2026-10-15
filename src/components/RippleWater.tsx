import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Water } from 'three/examples/jsm/objects/Water.js'

/**
 * The pond's water (Ana, 2026-10-15): "faça a água assim" → nhtoby311/WaterSurface's `WaterSurfaceSimple`,
 * which is three.js' `Water` (planar reflection of the whole scene, distorted by a flowing normal map, sun
 * specular, water colour mixed in by Fresnel) — and "coloque esse efeito na água" → React Bits'
 * `RippleDistortion` (ogl): instanced ripple quads (gaussian brush × concentric rings, growing and fading)
 * accumulate into a displacement buffer, and the image is pushed along a direction that SWIRLS with the
 * amount, plus tint, glint and chromatic dispersion. Here the ripple buffer is painted where the pointer
 * touches the water (R3F raycast → mesh uv) and it distorts the REFLECTION instead of an image.
 */

const MAX_WAVES = 100
const START_SCALE = 1.5
const LIFE_CONSTANT = Math.log(500)
const TAU = Math.PI * 2

// --- the ripple brush (ported from RippleDistortion) ------------------------------------------------
const waveVertex = /* glsl */ `
attribute vec2 iOffset;
attribute vec2 iScale;
attribute float iOpacity;
varying vec2 vUv;
varying float vOpacity;
void main() {
  vUv = uv;
  vOpacity = iOpacity;
  gl_Position = vec4(iOffset + position.xy * iScale, 0.0, 1.0);
}`

const waveFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying float vOpacity;
uniform float uRings;
const float PI = 3.141592653589793;
const float EDGE = 0.006737947;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float brush = (exp(-r * 5.0) - EDGE) / (1.0 - EDGE);
  brush *= 0.55 + 0.45 * cos(sqrt(r) * PI * 2.0 * uRings);
  gl_FragColor = vec4(vec3(brush * vOpacity * vOpacity), 1.0);
}`

// --- a tileable water normal map, generated (no asset to ship) ----------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeWaterNormals(size = 256, seed = 7, slope = 2.2): THREE.DataTexture {
  const rnd = mulberry32(seed)
  const h = new Float32Array(size * size)
  const octaves = [4, 8, 16, 32]
  let amp = 1
  for (const cells of octaves) {
    const g = new Float32Array(cells * cells)
    for (let i = 0; i < g.length; i++) g[i] = rnd()
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * cells, y0 = Math.floor(fy), y1 = (y0 + 1) % cells
      const ty = fy - y0, sy = ty * ty * (3 - 2 * ty)
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells, x0 = Math.floor(fx), x1 = (x0 + 1) % cells
        const tx = fx - x0, sx = tx * tx * (3 - 2 * tx)
        const a = g[y0 * cells + x0], b = g[y0 * cells + x1], c = g[y1 * cells + x0], d = g[y1 * cells + x1]
        h[y * size + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy)
      }
    }
    amp *= 0.5
  }
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x + size - 1) % size)], r = h[y * size + ((x + 1) % size)]
      const u = h[((y + size - 1) % size) * size + x], d = h[((y + 1) % size) * size + x]
      const nx = -(r - l) * slope * size * 0.02, ny = -(d - u) * slope * size * 0.02
      const len = Math.hypot(nx, ny, 1)
      const o = (y * size + x) * 4
      data[o] = ((nx / len) * 0.5 + 0.5) * 255
      data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255
      data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255
      data[o + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

// --- the water shader: three.js Water + the ripple composite -------------------------------------------
const hexToRGB = (hex: string) => new THREE.Color(hex)

function patchShaders(material: THREE.ShaderMaterial) {
  material.vertexShader = material.vertexShader
    .replace('varying vec4 worldPosition;', 'varying vec4 worldPosition;\nvarying vec2 vUv;')
    .replace('void main() {', 'void main() {\n\tvUv = uv;')
  material.fragmentShader = material.fragmentShader
    .replace(
      'varying vec4 worldPosition;',
      /* glsl */ `varying vec4 worldPosition;
varying vec2 vUv;
uniform sampler2D uDisplacement;
uniform vec2 uTexel;
uniform float uStrength;
uniform float uSwirl;
uniform float uDispersion;
uniform float uGlint;
uniform float uTintAmount;
uniform float uReflect;
uniform vec3 uTint;
uniform vec3 uHighlight;
const float TAU = 6.283185307179586;`
    )
    // the ripples also bend the surface normal (so the sun specular and Fresnel react to them)
    .replace(
      'vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
      /* glsl */ `float amount = texture2D(uDisplacement, vUv).r;
					float ex = texture2D(uDisplacement, vUv + vec2(uTexel.x, 0.0)).r - texture2D(uDisplacement, vUv - vec2(uTexel.x, 0.0)).r;
					float ey = texture2D(uDisplacement, vUv + vec2(0.0, uTexel.y)).r - texture2D(uDisplacement, vUv - vec2(0.0, uTexel.y)).r;
					vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) + vec3( -ex, 0.0, ey ) * 6.0 );`
    )
    // the swirling push on the reflection, with optional chromatic split
    .replace(
      'vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );',
      /* glsl */ `float theta0 = amount * uSwirl * TAU;
					vec2 push = vec2( sin( theta0 ), cos( theta0 ) ) * amount * uStrength;
					vec2 muv = mirrorCoord.xy / mirrorCoord.w + distortion + push;
					vec3 reflectionSample;
					if ( uDispersion > 0.001 ) {
						float split = uDispersion * 0.25;
						reflectionSample.r = texture2D( mirrorSampler, muv + push * split ).r;
						reflectionSample.g = texture2D( mirrorSampler, muv ).g;
						reflectionSample.b = texture2D( mirrorSampler, muv - push * split ).b;
					} else {
						reflectionSample = texture2D( mirrorSampler, muv ).rgb;
					}`
    )
    .replace('float rf0 = 0.3;', 'float rf0 = uReflect;')
    // tint of the disturbed water + the sheen riding the ripple shoulders
    .replace(
      'vec3 outgoingLight = albedo;',
      /* glsl */ `if ( uTintAmount > 0.001 ) {
						albedo = mix( albedo, albedo * uTint * 1.9, clamp( amount * 1.6, 0.0, 1.0 ) * uTintAmount );
					}
					if ( uGlint > 0.001 ) {
						vec3 rn = normalize( vec3( -ex * 26.0, -ey * 26.0, 1.0 ) );
						vec3 light = normalize( vec3( -0.35, 0.55, 1.0 ) );
						float raw = pow( max( dot( rn, light ), 0.0 ), 22.0 );
						float flatSpec = pow( max( light.z, 0.0 ), 22.0 );
						albedo += uHighlight * clamp( ( raw - flatSpec ) / max( 1.0 - flatSpec, 0.0001 ), 0.0, 1.0 ) * uGlint;
					}
					vec3 outgoingLight = albedo;`
    )
}

export interface RippleWaterProps {
  radius: number
  y?: number
  /** three.js Water */
  color?: string
  sunColor?: string
  sunDirection?: [number, number, number]
  /** how far the flowing normal map bends the reflection */
  flow?: number
  /** normal-map tiles across the pond */
  waves?: number
  /** flow speed multiplier */
  speed?: number
  /** Fresnel floor: how much reflection at steep angles */
  reflectivity?: number
  resolution?: number
  /** RippleDistortion (sizes in world units) */
  brushSize?: number
  strength?: number
  swirl?: number
  rings?: number
  spread?: number
  fade?: number
  spacing?: number
  dispersion?: number
  glint?: number
  tint?: string
  tintAmount?: number
  highlightColor?: string
  trigger?: 'hover' | 'click' | 'both'
  clickStrength?: number
  fieldSize?: number
  enabled?: boolean
}

interface Wave { x: number; y: number; scale: number; target: number; size: number; opacity: number }

export default function RippleWater({
  radius,
  y = 0,
  color = '#5fc9cf',
  sunColor = '#ffe6cc',
  sunDirection = [2, 3.5, -3],
  flow = 0.035,
  waves = 60,
  speed = 0.35,
  reflectivity = 0.5,
  resolution = 1024,
  brushSize = 0.5,
  strength = 0.08,
  swirl = 1,
  rings = 4,
  spread = 5,
  fade = 3,
  spacing = 0.05,
  dispersion = 0.6,
  glint = 0.5,
  tint = '#f2a0b4',
  tintAmount = 0.25,
  highlightColor = '#fff4e6',
  trigger = 'both',
  clickStrength = 2,
  fieldSize = 512,
  enabled = true
}: RippleWaterProps) {
  const gl = useThree((s) => s.gl)
  const diameter = radius * 2
  const cfg = useRef({ brushSize, spread, fade, spacing, clickStrength, trigger, enabled, speed })
  cfg.current = { brushSize, spread, fade, spacing, clickStrength, trigger, enabled, speed }

  const reduceMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])

  const sim = useMemo(() => {
    // the displacement field
    const field = new THREE.WebGLRenderTarget(fieldSize, fieldSize, {
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    })
    const offsets = new Float32Array(MAX_WAVES * 2)
    const scales = new Float32Array(MAX_WAVES * 2)
    const opacities = new Float32Array(MAX_WAVES)
    const geometry = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(2, 2)
    geometry.setAttribute('position', quad.getAttribute('position'))
    geometry.setAttribute('uv', quad.getAttribute('uv'))
    geometry.setIndex(quad.getIndex())
    geometry.setAttribute('iOffset', new THREE.InstancedBufferAttribute(offsets, 2))
    geometry.setAttribute('iScale', new THREE.InstancedBufferAttribute(scales, 2))
    geometry.setAttribute('iOpacity', new THREE.InstancedBufferAttribute(opacities, 1))
    geometry.instanceCount = MAX_WAVES
    const waveMaterial = new THREE.ShaderMaterial({
      vertexShader: waveVertex,
      fragmentShader: waveFragment,
      uniforms: { uRings: { value: rings } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendEquation: THREE.AddEquation
    })
    const waveMesh = new THREE.Mesh(geometry, waveMaterial)
    waveMesh.frustumCulled = false
    const waveScene = new THREE.Scene()
    waveScene.add(waveMesh)
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const wavesArr: Wave[] = Array.from({ length: MAX_WAVES }, () => ({ x: 0, y: 0, scale: START_SCALE, target: START_SCALE, size: 1, opacity: 0 }))

    // the water
    const normals = makeWaterNormals()
    const water = new Water(new THREE.CircleGeometry(radius, 96), {
      textureWidth: resolution,
      textureHeight: resolution,
      waterNormals: normals,
      sunDirection: new THREE.Vector3(...sunDirection).normalize(),
      sunColor: new THREE.Color(sunColor),
      waterColor: new THREE.Color(color),
      distortionScale: flow,
      fog: false
    })
    const material = water.material as THREE.ShaderMaterial
    patchShaders(material)
    Object.assign(material.uniforms, {
      uDisplacement: { value: field.texture },
      uTexel: { value: new THREE.Vector2(1 / fieldSize, 1 / fieldSize) },
      uStrength: { value: strength },
      uSwirl: { value: swirl },
      uDispersion: { value: dispersion },
      uGlint: { value: glint },
      uTintAmount: { value: tintAmount },
      uReflect: { value: reflectivity },
      uTint: { value: hexToRGB(tint) },
      uHighlight: { value: hexToRGB(highlightColor) }
    })
    material.uniforms.size.value = waves
    material.needsUpdate = true
    water.rotation.x = -Math.PI / 2

    return { field, offsets, scales, opacities, geometry, waveMaterial, waveMesh, waveScene, ortho, waves: wavesArr, water, material, normals, current: 0, prevX: 0, prevY: 0, wasAlive: true }
    // the heavy objects are rebuilt only for structural props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, resolution, fieldSize])

  // Dispose on unmount — DEFERRED, because React StrictMode (dev) mounts → unmounts → remounts with the same
  // memoised objects: disposing the mirror texture synchronously left Water's framebuffer pointing at a deleted
  // texture and the reflection was black forever (the "reflexo desliga" of 2026-10-15).
  const pendingDispose = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(pendingDispose.current)
    const s = sim
    return () => {
      pendingDispose.current = window.setTimeout(() => {
        s.field.dispose(); s.geometry.dispose(); s.waveMaterial.dispose(); s.normals.dispose(); s.material.dispose()
        s.water.geometry.dispose()
        ;(s.material.uniforms.mirrorSampler.value as THREE.Texture | null)?.dispose()
      }, 0)
    }
  }, [sim])

  // live uniforms
  useEffect(() => {
    const u = sim.material.uniforms
    sim.waveMaterial.uniforms.uRings.value = rings
    u.uStrength.value = strength; u.uSwirl.value = swirl; u.uDispersion.value = dispersion; u.uGlint.value = glint
    u.uTintAmount.value = tintAmount; u.uReflect.value = reflectivity; u.distortionScale.value = flow; u.size.value = waves
    ;(u.uTint.value as THREE.Color).set(tint); (u.uHighlight.value as THREE.Color).set(highlightColor)
    ;(u.waterColor.value as THREE.Color).set(color); (u.sunColor.value as THREE.Color).set(sunColor)
    ;(u.sunDirection.value as THREE.Vector3).set(...sunDirection).normalize()
  }, [sim, rings, strength, swirl, dispersion, glint, tintAmount, reflectivity, flow, waves, tint, highlightColor, color, sunColor, sunDirection])

  const setNewWave = (u: number, v: number, power: number) => {
    const c = cfg.current
    const w = sim.waves[sim.current]
    sim.current = (sim.current + 1) % MAX_WAVES
    w.x = u; w.y = v
    w.scale = START_SCALE * power
    w.target = START_SCALE * Math.max(1, c.spread) * power
    w.size = Math.max(0.01, c.brushSize) / diameter // in field units (0..1)
    w.opacity = 1
  }

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const c = cfg.current
    if (!c.enabled || reduceMotion || c.trigger === 'click' || !e.uv) return
    const step = Math.max(0.001, c.spacing) / diameter
    if (Math.abs(e.uv.x - sim.prevX) > step || Math.abs(e.uv.y - sim.prevY) > step) {
      setNewWave(e.uv.x, e.uv.y, 1)
      sim.prevX = e.uv.x; sim.prevY = e.uv.y
    }
  }
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const c = cfg.current
    if (!c.enabled || reduceMotion || c.trigger === 'hover' || !e.uv) return
    setNewWave(e.uv.x, e.uv.y, Math.max(1, c.clickStrength))
  }

  useFrame((_, dt) => {
    const delta = Math.min(0.05, dt)
    const c = cfg.current
    sim.material.uniforms.time.value += delta * c.speed
    const growth = reduceMotion ? 0 : 1 - Math.exp(-delta * 1.09)
    const decay = reduceMotion ? 1 : Math.exp((-delta * LIFE_CONSTANT) / Math.max(0.15, c.fade))
    const { waves: ws, offsets, scales, opacities } = sim
    let alive = 0
    for (let i = 0; i < MAX_WAVES; i++) {
      const w = ws[i]
      if (w.opacity <= 0) { opacities[i] = 0; scales[i * 2] = 0; scales[i * 2 + 1] = 0; continue }
      w.opacity *= decay
      w.scale += (w.target - w.scale) * growth
      if (w.opacity < 0.002) { w.opacity = 0; opacities[i] = 0; scales[i * 2] = 0; scales[i * 2 + 1] = 0; continue }
      const half = (w.scale * w.size) / 2
      offsets[i * 2] = w.x * 2 - 1
      offsets[i * 2 + 1] = w.y * 2 - 1
      scales[i * 2] = half * 2
      scales[i * 2 + 1] = half * 2
      opacities[i] = w.opacity
      alive++
    }
    sim.geometry.getAttribute('iOffset').needsUpdate = true
    sim.geometry.getAttribute('iScale').needsUpdate = true
    sim.geometry.getAttribute('iOpacity').needsUpdate = true
    // repaint the field (also when nothing is alive, once, so it clears)
    if (alive > 0 || sim.wasAlive) {
      const prev = gl.getRenderTarget()
      gl.setRenderTarget(sim.field)
      gl.clear(true, false, false)
      gl.render(sim.waveScene, sim.ortho)
      gl.setRenderTarget(prev)
    }
    sim.wasAlive = alive > 0
  })

  return <primitive object={sim.water} position={[0, y, 0]} onPointerMove={onMove} onPointerDown={onDown} />
}
