import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useEthereal } from './EtherealMaterial'
import heartUrl from '../assets/about/heart.webp'
import GlbProp, { LILIES_URL } from './GlbProp'

/**
 * The Projects scenery, second take (Ana found the tabletop "feio e nada criativo", 2026-10-14).
 * Concept: prototypes are ideas still up in the air — so each device lives on its own little floating
 * island in a night sky. Painted clouds drift behind at different depths, pebbles orbit the islands,
 * Ana's lilies and succulents grow on the grassy edges, and glass hearts and paper stars hover like
 * fireflies. Islands and clouds use the ethereal shader (soft wrap light, rosy fresnel, rock tips dissolving into
 * the night) and the scene gets a touch of bloom — Ana asked for "algo mais ethereal" over the painterly look.
 */
const ETHER = { keyDir: [1.0, 1.6, 1.2] as [number, number, number], lightColor: '#fff4ea', shadeColor: '#9a8fcb', glowColor: '#f2a0b4', glow: 0.5 }
const CLOUD_ETHER = { keyDir: [1.0, 1.6, 1.2] as [number, number, number], lightColor: '#fff8f2', shadeColor: '#b4a9d8', glowColor: '#f6cfe0', glow: 0.7, opacity: 0.92 }
const C = { rock: '#b9acdc', rockDeep: '#a496cf', grass: '#b4e0cf', grass2: '#8fcab2', pebble: '#cfc3ea', cloud: '#f6efe6', cloudPink: '#f5d9e1', cloudLilac: '#e3d8f2' }

function mk(geo: THREE.BufferGeometry, color: string, pos: [number, number, number], rot?: [number, number, number], scale?: [number, number, number]) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color }))
  m.userData.color = color
  m.position.set(...pos)
  if (rot) m.rotation.set(...rot)
  if (scale) m.scale.set(...scale)
  return m
}
/** push every mesh's base colour into its painterly material (the shader reads `baseColor`, not the texture) */
function usePaintColors(group: THREE.Object3D) {
  useEffect(() => { group.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || m.userData.isHull) return; const sm = m.material as THREE.ShaderMaterial; if (sm.uniforms?.baseColor && m.userData.color) sm.uniforms.baseColor.value.set(m.userData.color) }) })
}
/** a little hand-made wobble so the rock and grass do not read as lathe-perfect */
function wobble(geo: THREE.BufferGeometry, amt: number, seed: number) {
  const p = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const n = Math.sin(v.x * 7.3 + seed) * Math.cos(v.z * 6.1 - seed) + Math.sin(v.y * 9.7 + v.x * 3.1)
    const k = 1 + n * amt
    p.setXYZ(i, v.x * k, v.y, v.z * k)
  }
  p.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

/** a floating island: grassy top (its surface at y 0), rocky underside tapering down, pebbles orbiting */
function Island({ x, y, z, r, seed }: { x: number; y: number; z: number; r: number; seed: number }) {
  const group = useMemo(() => {
    const g = new THREE.Group()
    const d = r * 1.1 // depth of the rock
    // profile from the tip up to the rim: LatheGeometry winds outward-facing normals for increasing y (reversed, only the ink hull showed — a black silhouette)
    const profile = [new THREE.Vector2(0.001, -d), new THREE.Vector2(r * 0.28, -0.88 * d), new THREE.Vector2(r * 0.58, -0.62 * d), new THREE.Vector2(r * 0.86, -0.3 * d), new THREE.Vector2(r, -0.06 * d), new THREE.Vector2(r * 1.02, 0)]
    g.add(mk(wobble(new THREE.LatheGeometry(profile, 36), 0.045, seed), C.rock, [0, 0, 0]))
    // a darker chunk pokes out of the underside
    g.add(mk(new THREE.SphereGeometry(r * 0.38, 16, 12), C.rockDeep, [r * 0.35, -d * 0.55, -r * 0.2], undefined, [1, 0.7, 1]))
    // grass: a soft dome, raised a little so its rim overhangs the rock
    g.add(mk(wobble(new THREE.CylinderGeometry(r * 1.06, r * 1.0, 0.05, 36), 0.03, seed + 2), C.grass, [0, -0.02, 0]))
    // pebbles that will orbit
    const orbit = new THREE.Group(); orbit.name = 'orbit'
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + seed
      const pb = mk(new THREE.SphereGeometry(r * (0.07 + (i % 2) * 0.03), 10, 8), C.pebble, [Math.cos(a) * r * 1.35, -d * (0.25 + 0.15 * i), Math.sin(a) * r * 1.35], undefined, [1, 0.75, 1.1])
      orbit.add(pb)
    }
    g.add(orbit)
    return g
  }, [r, seed])
  // the rock's tip dissolves into the night: fade over the lower 70% of the underside
  useEthereal(group, { ...ETHER, fade: [y - r * 1.1, y - r * 0.22] })
  usePaintColors(group)
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const el = ref.current; if (!el) return
    const orbit = group.getObjectByName('orbit'); if (orbit) orbit.rotation.y = t * 0.12 + seed
    orbit?.children.forEach((c, i) => { c.position.y = -r * 1.1 * (0.25 + 0.15 * i) + Math.sin(t * 0.8 + i * 1.3 + seed) * 0.02 })
    void dt
  })
  return (
    <group ref={ref} position={[x, y, z]}>
      <primitive object={group} />
    </group>
  )
}

/** painted clouds drifting across the back of the sky at a few depths */
function Clouds({ narrow }: { narrow: boolean }) {
  const specs = useMemo(() => {
    const list: { x: number; y: number; z: number; s: number; color: string; speed: number; puffs: [number, number, number, number][] }[] = []
    const puffSets: [number, number, number, number][][] = [
      [[0, 0, 0, 0.3], [-0.32, -0.06, 0.05, 0.22], [0.3, -0.05, 0.02, 0.24], [0.1, 0.14, -0.05, 0.2], [-0.12, 0.1, 0.04, 0.17]],
      [[0, 0, 0, 0.26], [-0.26, -0.04, 0, 0.2], [0.24, -0.06, 0.03, 0.18], [0.04, 0.12, 0, 0.16]],
      [[0, 0, 0, 0.22], [-0.2, -0.03, 0, 0.16], [0.18, -0.04, 0, 0.15]],
    ]
    const cols = [C.cloud, C.cloudPink, C.cloudLilac]
    const base = narrow
      ? [[-0.7, 0.85, -1.6, 0.55], [0.8, 0.2, -2.2, 0.7], [-0.9, -0.9, -1.9, 0.6], [0.7, -1.45, -1.5, 0.5], [0.1, 1.1, -2.6, 0.8]]
      : [[-1.9, 0.35, -1.8, 0.7], [1.7, 0.45, -2.2, 0.8], [-0.4, 0.55, -2.8, 1.0], [2.1, -0.5, -1.6, 0.6], [-2.2, -0.75, -1.5, 0.55], [0.6, -1.05, -2.4, 0.75]]
    base.forEach(([x, y, z, s], i) => list.push({ x, y, z, s, color: cols[i % 3], speed: 0.02 + (i % 3) * 0.012, puffs: puffSets[i % 3] }))
    return list
  }, [narrow])
  const group = useMemo(() => {
    const g = new THREE.Group()
    specs.forEach((c) => {
      const cl = new THREE.Group(); cl.position.set(c.x, c.y, c.z); cl.scale.setScalar(c.s); cl.userData.spec = c
      c.puffs.forEach(([px, py, pz, pr]) => cl.add(mk(new THREE.SphereGeometry(pr, 18, 14), c.color, [px, py, pz], undefined, [1.25, 0.8, 1])))
      g.add(cl)
    })
    return g
  }, [specs])
  useEthereal(group, CLOUD_ETHER)
  usePaintColors(group)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    group.children.forEach((cl, i) => {
      const c = cl.userData.spec as { x: number; y: number; speed: number }
      const span = narrow ? 2.6 : 5.2
      cl.position.x = ((c.x + t * c.speed + span / 2) % span + span) % span - span / 2
      cl.position.y = c.y + Math.sin(t * 0.3 + i) * 0.03
    })
  })
  return <primitive object={group} />
}

/** soft contact shadow: a radial-gradient disc lying on the grass */
function Shadow({ x, z, y, w, d }: { x: number; z: number; y: number; w: number; d: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, 'rgba(20,14,24,.5)'); r.addColorStop(0.6, 'rgba(20,14,24,.22)'); r.addColorStop(1, 'rgba(20,14,24,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh position={[x, y + 0.004, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

/** a soft lilac haze hanging under each island, so the fading rock melts into mist */
function Mist({ x, y, z, s }: { x: number; y: number; z: number; s: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, 'rgba(190,170,230,.5)'); r.addColorStop(0.5, 'rgba(170,150,220,.18)'); r.addColorStop(1, 'rgba(170,150,220,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  return (
    <sprite position={[x, y, z]} scale={[s * 2.6, s * 1.4, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

/** a pale moon behind everything: a soft radial glow */
function Moon({ narrow }: { narrow: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(256, 256, 40, 256, 256, 256); r.addColorStop(0, 'rgba(246,222,232,.95)'); r.addColorStop(0.22, 'rgba(236,210,236,.55)'); r.addColorStop(0.55, 'rgba(180,160,220,.12)'); r.addColorStop(1, 'rgba(180,160,220,0)')
    g.fillStyle = r; g.fillRect(0, 0, 512, 512)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  return (
    <sprite position={narrow ? [0.75, 1.05, -3.2] : [1.5, 0.55, -3.4]} scale={[2.0, 2.0, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

/** glass hearts and paper stars drifting like fireflies, plus a dusting of tiny far stars */
function Floaters({ narrow }: { narrow: boolean }) {
  const heart = useTexture(heartUrl)
  const star = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = '#f7efe0'
    g.beginPath()
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, r = i % 2 ? 18 : 60; g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r) }
    g.closePath(); g.fill()
    g.strokeStyle = 'rgba(18,13,18,.55)'; g.lineWidth = 3; g.stroke()
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  const dot = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 32
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(16, 16, 1, 16, 16, 16); r.addColorStop(0, 'rgba(255,245,235,1)'); r.addColorStop(0.4, 'rgba(255,245,235,.5)'); r.addColorStop(1, 'rgba(255,245,235,0)')
    g.fillStyle = r; g.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(c)
  }, [])
  const items = useMemo(() => {
    const list: { x: number; y: number; z: number; s: number; heart: boolean; ph: number; tint: string }[] = []
    const spots: [number, number, number][] = narrow
      ? [[-0.55, 0.95, -0.3], [0.6, 0.75, -0.2], [-0.5, 0.05, 0.1], [0.62, 0.2, 0.2], [0.1, 1.15, -0.4], [-0.62, -0.35, 0.3], [0.5, -1.0, 0.1]]
      : [[-1.25, 0.5, -0.3], [-0.2, 0.62, -0.35], [1.2, 0.55, -0.2], [0.05, 0.3, -0.5], [-1.05, -0.55, 0.4], [1.3, -0.65, 0.35], [0.5, 0.75, -0.6], [-0.1, -0.9, 0.2]]
    spots.forEach(([x, y, z], i) => list.push({ x, y, z, s: i % 3 === 0 ? 0.13 : 0.08, heart: i % 3 === 0, ph: i * 1.7, tint: ['#f7efe0', '#f2a0b4', '#a9d9c6', '#cdbdf0'][i % 4] }))
    return list
  }, [narrow])
  const dots = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: Math.sin(i * 12.9898) * 3.2, y: Math.cos(i * 78.233) * 1.9 + 0.2, z: -3 - (i % 5) * 0.4, s: 0.03 + (i % 3) * 0.015, ph: i })), [])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const dotRefs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((s, i) => { if (!s) return; const it = items[i]; s.position.y = it.y + Math.sin(t * 0.6 + it.ph) * 0.04; s.position.x = it.x + Math.sin(t * 0.25 + it.ph) * 0.03; s.material.rotation = it.heart ? Math.sin(t * 0.5 + it.ph) * 0.15 : t * 0.2 + it.ph })
    dotRefs.current.forEach((s, i) => { if (!s) return; s.material.opacity = 0.45 + Math.sin(t * 1.3 + dots[i].ph) * 0.35 })
  })
  return (
    <>
      {items.map((it, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} position={[it.x, it.y, it.z]} scale={[it.s, it.s, 1]}>
          <spriteMaterial map={it.heart ? heart : star} color={it.heart ? '#ffffff' : it.tint} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {dots.map((d, i) => (
        <sprite key={`d${i}`} ref={(el) => { dotRefs.current[i] = el }} position={[d.x, d.y, d.z]} scale={[d.s, d.s, 1]}>
          <spriteMaterial map={dot} transparent depthWrite={false} toneMapped={false} opacity={0.6} />
        </sprite>
      ))}
    </>
  )
}

const ISLAND_URL = '/models/island.glb'
useGLTF.preload(ISLAND_URL)

/**
 * Ana's floating island (Meshy "Skyfall Eden", 2026-10-15; compressed with scripts/compress-model.mjs to
 * ~1 MB: unlit base colour only, meshopt-simplified, draco, webp). Normalised like GlbProp — `width` is its
 * world width — and placed so that the top of its landing surface (a ray cast down at its centre) sits
 * exactly at `top`, where the device's base is. Its own textures, unlit; a mist sprite hangs underneath.
 */
function IslandModel({ x, z, top, width, footprint }: { x: number; z: number; top: number; width: number; footprint: { w: number; d: number } }) {
  const { scene } = useGLTF(ISLAND_URL)
  const { root, scale, offset, rotation } = useMemo(() => {
    const r = scene.clone(true)
    r.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(r)
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
    const sc = width / Math.max(size.x, size.z)
    // top-surface height map from the vertices (max y per cell) — cheap, and good enough for a dense mesh
    const N = 44
    const H = new Float32Array(N * N).fill(NaN)
    const v = new THREE.Vector3()
    r.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return
      const pa = m.geometry.attributes.position
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i); m.localToWorld(v)
        const ix = Math.min(N - 1, Math.floor((v.x - box.min.x) / size.x * N)), iz = Math.min(N - 1, Math.floor((v.z - box.min.z) / size.z * N))
        const k = iz * N + ix
        if (!(H[k] >= v.y)) H[k] = v.y
      }
    })
    const hAt = (lx: number, lz: number) => { // island-local (unscaled) x/z → surface y, NaN off the island
      const ix = Math.floor((lx - box.min.x) / size.x * N), iz = Math.floor((lz - box.min.z) / size.z * N)
      if (ix < 0 || iz < 0 || ix >= N || iz >= N) return NaN
      return H[iz * N + ix]
    }
    // search rotation + landing point: the device footprint must sit on ground that is as flat as
    // possible, with nothing tall just in front of it (so the tree band goes to the back).
    // P = island-local point that ends up under the device centre; q = device-relative sample (island units)
    const fw = footprint.w / sc, fd = footprint.d / sc
    let best = { score: Infinity, rot: 0, px: c.x, pz: c.z, landing: box.max.y }
    const tall = size.y * 0.06 // anything this much above the ground under the device would poke through it
    for (let ri = 0; ri < 24; ri++) {
      const rot = (ri / 24) * Math.PI * 2, cs = Math.cos(-rot), sn = Math.sin(-rot)
      const L = (P: [number, number], qx: number, qz: number) => hAt(P[0] + qx * cs - qz * sn, P[1] + qx * sn + qz * cs)
      for (let oi = -5; oi <= 5; oi++) for (let oj = -5; oj <= 5; oj++) {
        const P: [number, number] = [c.x + (oi / 5) * size.x * 0.3, c.z + (oj / 5) * size.z * 0.3]
        const hs: number[] = []; let miss = 0
        for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) {
          const h = L(P, (a / 6 - 0.5) * fw, (b / 6 - 0.5) * fd)
          if (Number.isNaN(h)) miss++; else hs.push(h)
        }
        if (miss > 0) continue // the whole footprint must be over the island
        hs.sort((p, q) => p - q)
        const ground = hs[Math.floor(hs.length * 0.25)] // the device rests on the ground, not on the tree tops
        const poke = hs.filter((h) => h > ground + tall).length // samples that would pierce the device
        let front = 0
        for (let a = 0; a <= 6; a++) { const h = L(P, (a / 6 - 0.5) * fw, fd * 0.85); if (!Number.isNaN(h) && h > ground + tall) front++ }
        const score = poke * 3 + front * 1.5 + miss * 0.4 + (hs[hs.length - 1] - ground) * 0.5
        if (score < best.score) best = { score, rot, px: P[0], pz: P[1], landing: ground }
      }
    }
    if (!Number.isFinite(best.score)) { // nothing qualified: rest on the island's typical ground level, centred
      const all = Array.from(H).filter((h) => !Number.isNaN(h)).sort((p, q) => p - q)
      best = { score: 0, rot: 0, px: c.x, pz: c.z, landing: all[Math.floor(all.length * 0.3)] ?? box.max.y }
    }
    // carve the clearing: anything that would rise through the device inside its footprint (plus a soft
    // margin) is pressed down to the landing level — the island has no natural clearing the MacBook's size
    {
      const cs = Math.cos(best.rot), sn = Math.sin(best.rot) // island-local → device-relative is R(+rot)
      const margin = Math.min(fw, fd) * 0.35
      const w = new THREE.Vector3()
      r.traverse((o) => {
        const m = o as THREE.Mesh; if (!m.isMesh) return
        const pa = m.geometry.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < pa.count; i++) {
          w.fromBufferAttribute(pa, i); m.localToWorld(w)
          const lx = w.x - best.px, lz = w.z - best.pz
          const qx = lx * cs - lz * sn, qz = lx * sn + lz * cs
          const dx = Math.max(0, Math.abs(qx) - fw / 2), dz = Math.max(0, Math.abs(qz) - fd / 2)
          const d = Math.hypot(dx, dz)
          if (d > margin || w.y <= best.landing) continue
          const t = d / margin, k = t * t * (3 - 2 * t) // 0 inside the footprint → fully flat; 1 at the margin → untouched
          w.y = best.landing + (w.y - best.landing) * k
          m.worldToLocal(w); pa.setXYZ(i, w.x, w.y, w.z)
        }
        pa.needsUpdate = true
        m.geometry.computeVertexNormals()
      })
    }
    const bottom = top - (best.landing - box.min.y) * sc
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      if (m.userData.origMap === undefined) m.userData.origMap = src.map ?? null
      // lit (not unlit like the other props): the hemisphere + key light give the terrain relief, like the
      // reference render — flat textures read as dead colours (Ana, 2026-10-15)
      const mat = new THREE.MeshStandardMaterial({ map: m.userData.origMap as THREE.Texture | null, color: '#ffffff', roughness: 0.95, metalness: 0, side: THREE.DoubleSide, transparent: true })
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uGlow = { value: new THREE.Color('#f2a0b4') }
        sh.uniforms.uFade = { value: new THREE.Vector2(bottom + (top - bottom) * 0.55, bottom + (top - bottom) * 0.92) } // the waterfalls hang low and read as white pillars: only the upper 45% of the underside stays
        sh.vertexShader = 'varying vec3 vNrm; varying vec3 vWpos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vNrm = normalize(mat3(modelMatrix) * normal); vWpos = (modelMatrix * vec4(position, 1.0)).xyz;')
        sh.fragmentShader = 'varying vec3 vNrm; varying vec3 vWpos; uniform vec3 uGlow; uniform vec2 uFade;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n { vec3 N = normalize(vNrm) * (gl_FrontFacing ? 1.0 : -1.0); float f = pow(1.0 - clamp(dot(N, normalize(cameraPosition - vWpos)), 0.0, 1.0), 2.5); gl_FragColor.rgb += uGlow * f * 0.45; gl_FragColor.a *= smoothstep(uFade.x, uFade.y, vWpos.y); }')
      }
      m.material = mat
    })
    if (import.meta.env.DEV) console.log('[island]', { rot: +best.rot.toFixed(2), px: +(best.px - c.x).toFixed(2), pz: +(best.pz - c.z).toFixed(2), score: +best.score.toFixed(2) })
    // the search/carve map device-relative points to island-local with a standard 2D rotation by −rot on
    // (x, z), which is three's Ry(+rot) — so the island must be rendered with Ry(−rot). (Rendering +rot put the
    // carved clearing on the far side of the island: devices floating, terrain off to one side — Ana, 2026-10-15)
    return { root: r, scale: sc, rotation: -best.rot, offset: [-best.px, -best.landing, -best.pz] as [number, number, number] }
  }, [scene, width, footprint.w, footprint.d, top])
  const probe = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const g = probe.current; if (!g) return
    const t = setTimeout(() => {
      g.updateMatrixWorld(true)
      const meshes: THREE.Object3D[] = []; g.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o) })
      const ray = new THREE.Raycaster(); const gaps: string[] = []
      for (const [fx, fz] of [[0, 0], [-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
        const wx = x + fx * footprint.w, wz = z + fz * footprint.d
        ray.set(new THREE.Vector3(wx, top + 2, wz), new THREE.Vector3(0, -1, 0))
        const h = ray.intersectObjects(meshes, false)[0]
        gaps.push(h ? (top - h.point.y).toFixed(3) : 'none')
      }
      console.log('[island fit] gap below device (centre, corners):', gaps.join(' '))
    }, 500)
    return () => clearTimeout(t)
  }, [x, z, top, footprint.w, footprint.d])
  return (
    <group ref={probe} position={[x, top, z]} scale={scale}>
      <group rotation={[0, rotation, 0]}>
        <group position={offset}><primitive object={root} /></group>
      </group>
    </group>
  )
}

/**
 * `phoneTop` / `lapTop`: the y of each device's base — the islands' grass surfaces sit exactly there.
 */
export default function Scenery({ narrow, phonePos, lapPos, phoneTop, lapTop }: { narrow: boolean; phonePos: [number, number, number]; lapPos: [number, number, number]; phoneTop: number; lapTop: number }) {
  const pr = narrow ? 0.38 : 0.46, lr = narrow ? 0.62 : 0.7
  return (
    <group>
      <Moon narrow={narrow} />
      <Clouds narrow={narrow} />
      {/* the phone's island, with the succulents beside it */}
      <IslandModel x={phonePos[0]} z={phonePos[2]} top={phoneTop} width={pr * 2.2} footprint={{ w: 0.3, d: 0.22 }} />{/* the island finds its own flattest spot under the device, trees behind */}
      <Mist x={phonePos[0]} y={phoneTop - pr * 0.9} z={phonePos[2] - 0.1} s={pr} />
      <Shadow x={phonePos[0]} z={phonePos[2]} y={phoneTop} w={0.5} d={0.42} />
      {/* the MacBook's island, lilies growing at its back edge */}
      <IslandModel x={lapPos[0]} z={lapPos[2]} top={lapTop} width={lr * 2.4} footprint={{ w: 0.88, d: 0.62 }} />
      <Mist x={lapPos[0]} y={lapTop - lr * 0.9} z={lapPos[2] - 0.1} s={lr} />
      <Shadow x={lapPos[0]} z={lapPos[2] + 0.08} y={lapTop} w={1.05} d={0.9} />
      <GlbProp url={LILIES_URL} x={lapPos[0] + lr * 0.78} z={lapPos[2] - lr * 0.4} top={lapTop} height={narrow ? 0.42 : 0.55} rotation={[0, -0.5, 0]} />
      <group position={[0, narrow ? lapPos[1] + 0.5 : 0, 0]}><Floaters narrow={narrow} /></group>
    </group>
  )
}
