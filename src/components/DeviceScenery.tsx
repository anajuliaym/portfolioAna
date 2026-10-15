import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useEthereal } from './EtherealMaterial'
import heartUrl from '../assets/about/heart.webp'
import GlbProp, { LILIES_URL } from './GlbProp'

/**
 * The Projects scenery, fourth take (2026-10-15). Ana rejected the tabletop ("feio"), the lathe islands
 * ("cores mortas") and the per-device islands carved into clearings ("completamente horrível") — carving
 * the model to fit a device deforms it and never looks right. So the model is left INTACT:
 *
 *  - one hero island (Ana's Meshy "Skyfall Eden") far behind the devices, rising out of a sea of
 *    pink/peach clouds, a warm glow behind it — the composition of her reference render;
 *  - the two devices float in front, each resting on a soft cloud cushion (prototypes = ideas in the air);
 *  - her lilies grow out of the MacBook's cloud; glass hearts and paper stars drift like fireflies.
 *
 * Clouds use the ethereal shader; the island is lit (MeshStandard) by the scene lights in Devices.tsx and
 * dissolves into the cloud sea at its base.
 */
const CLOUD = { keyDir: [0.6, 1.4, 1.6] as [number, number, number], lightColor: '#f3e4ea', shadeColor: '#8f7aa8', glowColor: '#ffb7cc', glow: 0.6, opacity: 0.95 } // tinted, not white: white puffs blew out under the bloom
const TINTS = ['#f6e6ee', '#f4cfdc', '#ddd0f2', '#f6dccd']

/** a cloud = a cluster of flattened spheres; `seed` varies the puffs */
function cloudGroup(seed: number, w: number, tint: string, flat = 0.62) {
  const g = new THREE.Group()
  const n = 7
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5
    const k = Math.min(1, w / 1.4) // puff size follows the cloud's width
    const r = ((0.2 + 0.08 * Math.sin(seed * 3.1 + i * 1.7)) * (1 - Math.abs(t) * 0.8) + 0.05) * k
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial())
    m.userData.color = tint
    m.position.set(t * w, Math.abs(Math.sin(seed * 5 + i)) * r * 0.35, Math.sin(seed * 7 + i * 2.3) * 0.12)
    m.scale.set(1.25, flat, 1)
    g.add(m)
  }
  return g
}

/** the soft cushion each device rests on: its top sits at y 0 of the group */
function Cushion({ x, y, z, w, seed }: { x: number; y: number; z: number; w: number; seed: number }) {
  const group = useMemo(() => {
    const g = new THREE.Group()
    const k = Math.min(1, w / 1.4)
    const a = cloudGroup(seed, w, TINTS[0], 0.45); a.position.y = -0.07 * k; g.add(a)
    const b = cloudGroup(seed + 2, w * 0.7, TINTS[1], 0.5); b.position.set(w * 0.1, -0.15 * k, -0.06); g.add(b)
    const c = cloudGroup(seed + 4, w * 0.5, TINTS[2], 0.55); c.position.set(-w * 0.18, -0.21 * k, 0.04); g.add(c)
    // the cushion's highest puff sits just under the device's base, never over it
    g.updateMatrixWorld(true)
    const top = new THREE.Box3().setFromObject(g).max.y
    g.children.forEach((ch) => { ch.position.y -= top + 0.004 })
    return g
  }, [w, seed])
  useEthereal(group, CLOUD)
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { const el = ref.current; if (el) el.position.y = y + Math.sin(clock.elapsedTime * 0.7 + seed) * 0.006 })
  return <group ref={ref} position={[x, y, z]}><primitive object={group} /></group>
}

/** the sea of clouds the island rises from, drifting slowly sideways */
function CloudSea({ narrow }: { narrow: boolean }) {
  const specs = useMemo(() => {
    const rows = narrow
      ? [[-0.8, -1.25, -2.6, 1.2], [0.7, -1.3, -3.0, 1.4], [0.0, -1.45, -2.2, 1.0], [0.9, 1.05, -3.4, 0.9], [-0.9, 0.85, -3.2, 0.8]]
      : [[-1.9, -0.95, -2.8, 1.3], [-0.5, -1.05, -3.2, 1.6], [0.8, -1.0, -2.9, 1.4], [2.0, -0.9, -3.1, 1.3], [-1.2, -1.15, -2.3, 1.0], [1.4, -1.2, -2.4, 1.1], [-2.3, 0.5, -3.6, 0.9], [2.3, 0.65, -3.8, 1.0]]
    return rows.map(([x, y, z, w], i) => ({ x, y, z, w, seed: i * 1.37 + 0.4, tint: TINTS[i % TINTS.length], speed: 0.012 + (i % 3) * 0.006 }))
  }, [narrow])
  const group = useMemo(() => {
    const g = new THREE.Group()
    specs.forEach((c) => { const cl = cloudGroup(c.seed, c.w, c.tint, 0.55); cl.position.set(c.x, c.y, c.z); cl.userData.spec = c; g.add(cl) })
    return g
  }, [specs])
  useEthereal(group, CLOUD)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, span = narrow ? 3.4 : 6
    group.children.forEach((cl, i) => {
      const c = cl.userData.spec as { x: number; y: number; speed: number }
      cl.position.x = ((c.x + t * c.speed + span / 2) % span + span) % span - span / 2
      cl.position.y = c.y + Math.sin(t * 0.25 + i) * 0.02
    })
  })
  return <primitive object={group} />
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

const ISLAND_URL = '/models/island.glb'
useGLTF.preload(ISLAND_URL)

/**
 * Ana's island, untouched: lit with the scene lights, its base dissolving into the cloud sea, turning very
 * slowly so its waterfalls catch the light. `width` = world width, `base` = world y where it fades out.
 */
function HeroIsland({ x, y, z, width, fade }: { x: number; y: number; z: number; width: number; fade: [number, number] }) {
  const { scene } = useGLTF(ISLAND_URL)
  const { root, scale, offset } = useMemo(() => {
    const r = scene.clone(true)
    const box = new THREE.Box3().setFromObject(r)
    const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      const mat = new THREE.MeshStandardMaterial({ map: src.map ?? null, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, transparent: true })
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uFade = { value: new THREE.Vector2(fade[0], fade[1]) }
        sh.vertexShader = 'varying float vWy;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWy = (modelMatrix * vec4(transformed, 1.0)).y;')
        sh.fragmentShader = 'varying float vWy; uniform vec2 uFade;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragColor.a *= smoothstep(uFade.x, uFade.y, vWy);')
      }
      m.material = mat
    })
    return { root: r, scale: width / Math.max(size.x, size.z), offset: [-c.x, -c.y, -c.z] as [number, number, number] }
  }, [scene, width, fade[0], fade[1]])
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const el = ref.current; if (!el) return
    const t = clock.elapsedTime
    el.rotation.y = -0.5 + Math.sin(t * 0.08) * 0.35
    el.position.y = y + Math.sin(t * 0.4) * 0.025
  })
  return (
    <group ref={ref} position={[x, y, z]} scale={scale}>
      <group position={offset}><primitive object={root} /></group>
    </group>
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
 * `phoneTop` / `lapTop`: the y of each device's base — each cushion's top sits exactly there.
 */
export default function Scenery({ narrow, phonePos, lapPos, phoneTop, lapTop }: { narrow: boolean; phonePos: [number, number, number]; lapPos: [number, number, number]; phoneTop: number; lapTop: number }) {
  const island = narrow
    ? { x: 0.05, y: -0.05, z: -3.0, width: 1.5, fade: [-1.0, -0.45] as [number, number] }
    : { x: -0.16, y: -0.2, z: -3.0, width: 1.3, fade: [-0.9, -0.45] as [number, number] }
  return (
    <group>
      {/* a warm sunset glow behind the island and a cooler lilac halo around it */}
      <Glow x={island.x + 0.2} y={island.y + 0.35} z={island.z - 1.2} s={narrow ? 4.2 : 5.2} inner="rgba(255,206,186,.85)" outer="rgba(214,140,170,.35)" />
      <Glow x={island.x - 0.6} y={island.y - 0.6} z={island.z - 0.8} s={narrow ? 3.2 : 4.2} inner="rgba(190,160,235,.4)" outer="rgba(150,120,210,.12)" />
      <HeroIsland x={island.x} y={island.y} z={island.z} width={island.width} fade={island.fade} />
      <CloudSea narrow={narrow} />
      {/* each device rests on its own cloud */}
      <Cushion x={phonePos[0]} y={phoneTop} z={phonePos[2] + 0.02} w={0.5} seed={1.1} />
      <Cushion x={lapPos[0]} y={lapTop} z={lapPos[2] + 0.04} w={1.05} seed={3.7} />
      {/* Ana's lilies, growing out of the MacBook's cloud at its back-right */}
      <GlbProp url={LILIES_URL} x={lapPos[0] + 0.5} z={lapPos[2] - 0.22} top={lapTop - 0.02} height={narrow ? 0.4 : 0.5} rotation={[0, -0.5, 0]} />
      <group position={[0, narrow ? lapPos[1] + 0.5 : 0, 0]}><Floaters narrow={narrow} /></group>
    </group>
  )
}
