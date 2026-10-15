import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import heartUrl from '../assets/about/heart.webp'
import GlbProp, { LILIES_URL } from './GlbProp'

/**
 * The Projects scenery, fifth take (2026-10-15). Ana wants the devices ON the islands, and her
 * volumetric cloud (cloud_test.glb). Rules learned the hard way:
 *  - never deform her island to make room (the carved clearings were "horrível");
 *  - so each device gets its own intact island, turned and shifted (searched on a height map) so the
 *    canopy under the device is as even as possible, and raised until the device sits just ABOVE the
 *    highest point under it — nothing can pierce the screen;
 *  - her cloud fills the small gap between canopy and device like a nest, and a sea of the same cloud
 *    lies under the islands, where their rock dissolves.
 */
const ISLAND_URL = '/models/island.glb'
const CLOUD_URL = '/models/cloud.glb'
useGLTF.preload(ISLAND_URL)
useGLTF.preload(CLOUD_URL)

/**
 * Ana's cloud: 400 crossed planes with a soft puff texture. Normalised to `width`; `top` puts its upper
 * edge at a world y (for the nests), otherwise it is centred on `position`.
 */
function Cloud({ position, width, tint = '#ffffff', opacity = 1, top, drift = 0, seed = 0, squash = 1 }: { position: [number, number, number]; width: number; tint?: string; opacity?: number; top?: number; drift?: number; seed?: number; squash?: number }) {
  const { scene } = useGLTF(CLOUD_URL)
  const { root, scale, offset } = useMemo(() => {
    const r = scene.clone(true)
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      m.material = new THREE.MeshBasicMaterial({ map: src.map ?? null, color: tint, transparent: true, opacity: 0.55 * opacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, vertexColors: false })
      m.renderOrder = 2
    })
    r.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(r)
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
    const sc = width / Math.max(size.x, size.z)
    const oy = top === undefined ? -c.y : -box.max.y
    return { root: r, scale: sc, offset: [-c.x, oy, -c.z] as [number, number, number] }
  }, [scene, width, tint, opacity, top])
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const el = ref.current; if (!el) return
    const t = clock.elapsedTime
    el.position.x = position[0] + Math.sin(t * 0.05 + seed) * drift
    el.position.y = (top ?? position[1]) + Math.sin(t * 0.35 + seed) * 0.008
    el.rotation.y = seed + t * 0.01
  })
  return (
    <group ref={ref} position={[position[0], top ?? position[1], position[2]]} scale={[scale, scale * squash, scale]}>
      <group position={offset}><primitive object={root} /></group>
    </group>
  )
}

/**
 * An intact island under a device. On a max-height map of the island's top, search 24 turns × 13×13 spots
 * for the one where the canopy under the device's footprint is most even (small max − p25), the whole
 * footprint is over the island, and little stands just in front of the device (so the trees end up behind
 * it). Then lift the island so that max sits `gap` under the device's base. Returns the uneven depth so the
 * nest cloud can be sized to hide it.
 */
function DeviceIsland({ x, z, base, width, footprint, fade, onDepth }: { x: number; z: number; base: number; width: number; footprint: { w: number; d: number }; fade: number; onDepth?: (d: number) => void }) {
  const { scene } = useGLTF(ISLAND_URL)
  const fit = useMemo(() => {
    const r = scene.clone(true)
    r.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(r)
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
    const sc = width / Math.max(size.x, size.z)
    const N = 48
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
    // fill pin-holes in the height map (cells no vertex fell into), so the search does not see gaps inside the island
    for (let pass = 0; pass < 3; pass++) {
      const copy = H.slice()
      for (let iz = 1; iz < N - 1; iz++) for (let ix = 1; ix < N - 1; ix++) {
        const k = iz * N + ix; if (!Number.isNaN(copy[k])) continue
        let n = 0, mx = -Infinity
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const h = copy[(iz + dz) * N + ix + dx]; if (!Number.isNaN(h)) { n++; mx = Math.max(mx, h) } }
        if (n >= 4) H[k] = mx
      }
    }
    const hAt = (lx: number, lz: number) => {
      const ix = Math.floor((lx - box.min.x) / size.x * N), iz = Math.floor((lz - box.min.z) / size.z * N)
      if (ix < 0 || iz < 0 || ix >= N || iz >= N) return NaN
      return H[iz * N + ix]
    }
    const fw = footprint.w / sc, fd = footprint.d / sc
    let best = { score: Infinity, rot: 0, px: c.x, pz: c.z, top: box.max.y, depth: 0 }
    for (let ri = 0; ri < 24; ri++) {
      const rot = (ri / 24) * Math.PI * 2, cs = Math.cos(-rot), sn = Math.sin(-rot)
      const L = (px: number, pz: number, qx: number, qz: number) => hAt(px + qx * cs - qz * sn, pz + qx * sn + qz * cs)
      for (let oi = -6; oi <= 6; oi++) for (let oj = -6; oj <= 6; oj++) {
        const px = c.x + (oi / 6) * size.x * 0.32, pz = c.z + (oj / 6) * size.z * 0.32
        const hs: number[] = []; let miss = 0
        for (let a = 0; a <= 6; a++) for (let b = 0; b <= 6; b++) {
          const h = L(px, pz, (a / 6 - 0.5) * fw, (b / 6 - 0.5) * fd)
          if (Number.isNaN(h)) miss++; else hs.push(h)
        }
        if (miss > 2) continue
        hs.sort((p, q) => p - q)
        const hi = hs[hs.length - 1], lo = hs[Math.floor(hs.length * 0.25)]
        let front = 0
        for (let a = 0; a <= 6; a++) { const h = L(px, pz, (a / 6 - 0.5) * fw, fd * 0.5 + fd * 0.45); if (!Number.isNaN(h) && h > hi) front += h - hi }
        const score = (hi - lo) + front * 2 + miss * 0.05
        if (score < best.score) best = { score, rot, px, pz, top: hi, depth: hi - lo }
      }
    }
    // the base dissolves into the cloud sea
    const bottomWorld = base - (best.top - box.min.y) * sc
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      const mat = new THREE.MeshStandardMaterial({ map: src.map ?? null, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, transparent: true })
      const f0 = bottomWorld + (base - bottomWorld) * fade, f1 = bottomWorld + (base - bottomWorld) * Math.min(0.95, fade + 0.35)
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uFade = { value: new THREE.Vector2(f0, f1) }
        sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWy = (modelMatrix * vec4(transformed, 1.0)).y;')
        sh.fragmentShader = 'varying float vWy; uniform vec2 uFade;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= smoothstep(uFade.x, uFade.y, vWy);')
      }
      m.material = mat
    })
    if (import.meta.env.DEV) console.log('[device island]', { rot: +best.rot.toFixed(2), unevenness: +(best.depth * sc).toFixed(3), score: +best.score.toFixed(3) })
    // render rotation is −rot: the search maps device → island with three's Ry(+rot) (see CLAUDE.md)
    return { root: r, scale: sc, rotation: -best.rot, offset: [-best.px, -best.top, -best.pz] as [number, number, number], depth: best.depth * sc }
  }, [scene, width, footprint.w, footprint.d, base, fade])
  useEffect(() => { onDepth?.(fit.depth) }, [fit.depth, onDepth])
  const ref = useRef<THREE.Group>(null)
  return (
    <group ref={ref} position={[x, base - 0.004, z]} scale={fit.scale}>
      <group rotation={[0, fit.rotation, 0]}>
        <group position={fit.offset}><primitive object={fit.root} /></group>
      </group>
    </group>
  )
}

/** warm glow behind the island, like the low sun in Ana's reference; fades to the page colour at its edge */
function Glow({ x, y, z, s, inner, outer }: { x: number; y: number; z: number; s: number; inner: string; outer: string }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 512
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(256, 256, 0, 256, 256, 256)
    r.addColorStop(0, inner); r.addColorStop(0.35, outer); r.addColorStop(1, 'rgba(12,13,18,0)')
    g.fillStyle = r; g.fillRect(0, 0, 512, 512)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [inner, outer])
  return (
    <sprite position={[x, y, z]} scale={[s, s, 1]}>
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

/**
 * `phoneTop` / `lapTop`: the y of each device's base. Each island's canopy peaks just under it; a nest of
 * Ana's cloud sits on top, and a sea of the same cloud lies below.
 */
export default function Scenery({ narrow, phonePos, lapPos, phoneTop, lapTop }: { narrow: boolean; phonePos: [number, number, number]; lapPos: [number, number, number]; phoneTop: number; lapTop: number }) {
  const phoneFoot = useMemo(() => ({ w: 0.26, d: 0.16 }), [])
  const lapFoot = useMemo(() => ({ w: 0.86, d: 0.6 }), [])
  return (
    <group>
      <Glow x={0.1} y={narrow ? 0.3 : 0.25} z={-4.2} s={narrow ? 4.6 : 6} inner="rgba(255,206,186,.8)" outer="rgba(214,140,170,.32)" />
      <Glow x={-0.8} y={-0.4} z={-3.6} s={narrow ? 3.2 : 4.4} inner="rgba(190,160,235,.38)" outer="rgba(150,120,210,.1)" />
      {/* the islands, each fitted under its device */}
      <DeviceIsland x={phonePos[0]} z={phonePos[2]} base={phoneTop} width={narrow ? 1.05 : 1.0} footprint={phoneFoot} fade={0.7} />
      <DeviceIsland x={lapPos[0]} z={lapPos[2]} base={lapTop} width={narrow ? 1.75 : 1.85} footprint={lapFoot} fade={0.7} />
      {/* nests of Ana's cloud between canopy and device */}
      <Cloud position={[phonePos[0], 0, phonePos[2] + 0.02]} top={phoneTop + 0.03} width={0.5} squash={0.45} tint="#fff1f4" opacity={0.9} seed={1.2} />
      <Cloud position={[lapPos[0], 0, lapPos[2] + 0.04]} top={lapTop + 0.035} width={1.25} squash={0.4} tint="#fff1f4" opacity={0.9} seed={3.4} />
      {/* the sea of clouds below */}
      {(narrow
        ? [[-0.5, -1.35, -0.8, 1.8, '#f6d6e2'], [0.6, -1.5, -1.4, 2.0, '#e8dcf6'], [0.0, 0.05, -1.6, 1.3, '#f8e2d6']]
        : [[-1.3, -0.95, -0.9, 2.0, '#f6d6e2'], [0.2, -1.05, -1.5, 2.4, '#e8dcf6'], [1.6, -0.9, -1.0, 2.0, '#f8e2d6'], [-2.3, 0.45, -2.6, 1.4, '#f6d6e2'], [2.4, 0.6, -2.8, 1.5, '#e8dcf6']]
      ).map(([cx, cy, cz, w, tint], i) => (
        <Cloud key={i} position={[cx as number, cy as number, cz as number]} width={w as number} squash={0.55} tint={tint as string} opacity={0.85} drift={0.15} seed={i * 1.7} />
      ))}
      {/* Ana's lilies on the MacBook's island, back right */}
      <GlbProp url={LILIES_URL} x={lapPos[0] + 0.5} z={lapPos[2] - 0.2} top={lapTop - 0.02} height={narrow ? 0.4 : 0.48} rotation={[0, -0.5, 0]} />
      <group position={[0, narrow ? lapPos[1] + 0.5 : 0, 0]}><Floaters narrow={narrow} /></group>
    </group>
  )
}
