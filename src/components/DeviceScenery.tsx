import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import heartUrl from '../assets/about/heart.webp'
import GlbProp, { LILIES_URL } from './GlbProp'

/**
 * A little painted still life around the two devices on the Projects page (Ana: "um cenário ao redor
 * deles bonitinho na estética do site", 2026-10-14): a cream tabletop, a pink mug, Ana's succulents model, two pastel books, a pencil — the desk's painterly shader and ink outline — plus soft
 * contact shadows under the devices and a few glass hearts and paper stars drifting slowly above.
 * Desktop: one long table under both devices. Narrow: the table only under the MacBook (the phone
 * floats above it, as before), props tucked beside it.
 */
const PAINT = { keyDir: [1.2, 1.6, 1.4] as [number, number, number], bands: 3, paint: 0.12, patch: 0.2, patchScale: 16, spec: 0.3, rimStrength: 0.5, keyColor: '#e6d9d0' }
const C = { table: '#5b5070', /* deep dusty lilac — the painterly key light lifts it two tones; cream/light lilac read as a white slab against the dark page */ tableSide: '#4a4160', mug: '#f2a0b4', mugIn: '#f8d2da', pot: '#e4b4a2', soil: '#5a4038', leaf: '#a9d9c6', leaf2: '#8cc6ae', book1: '#cdbdf0', book2: '#f6c8d3', pages: '#f7f1e6', pencil: '#f3d27a', tip: '#e9c1a4', lead: '#2b2630' }

function mk(geo: THREE.BufferGeometry, color: string, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color }))
  m.userData.color = color
  m.position.set(...pos)
  if (rot) m.rotation.set(...rot)
  return m
}

/** the props, built from primitives so the painterly shader does the work */
function Props({ narrow, top, lapX, phoneX, table }: { narrow: boolean; top: number; lapX: number; phoneX: number; table: { w: number; d: number; x: number; z: number } }) {
  const group = useMemo(() => {
    const g = new THREE.Group()
    const add = (m: THREE.Mesh) => { g.add(m); return m }
    // the tabletop: a thick slab with rounded corners (built here so the painterly pass below covers it)
    add(mk(new RoundedBoxGeometry(table.w, 0.07, table.d, 4, 0.03), C.table, [table.x, top - 0.035, table.z]))
    // mug, right of the MacBook
    const mx = lapX + (narrow ? 0.42 : 0.6), mz = narrow ? -0.42 : 0.42
    add(mk(new THREE.CylinderGeometry(0.075, 0.068, 0.15, 24), C.mug, [mx, top + 0.075, mz]))
    add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24), C.mugIn, [mx, top + 0.142, mz]))
    add(mk(new THREE.TorusGeometry(0.045, 0.013, 10, 24), C.mug, [mx + 0.08, top + 0.08, mz], [0, 0, 0]))
    // two books, between the devices (desktop) or in front of the MacBook's left corner (narrow)
    const bx = narrow ? lapX - 0.02 : (phoneX + lapX) / 2 - 0.2, bz = narrow ? 0.64 : 0.32
    add(mk(new THREE.BoxGeometry(0.3, 0.045, 0.22), C.book1, [bx, top + 0.0225, bz], [0, 0.18, 0]))
    add(mk(new THREE.BoxGeometry(0.28, 0.03, 0.2), C.pages, [bx, top + 0.045, bz], [0, 0.18, 0]))
    add(mk(new THREE.BoxGeometry(0.25, 0.04, 0.19), C.book2, [bx + 0.02, top + 0.08, bz - 0.01], [0, -0.12, 0]))
    // a pencil in front of the MacBook
    const ex = lapX + (narrow ? 0.34 : 0.1), ez = narrow ? 0.6 : 0.5
    add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), C.pencil, [ex, top + 0.012, ez], [0, 0, Math.PI / 2 - 0.25]))
    add(mk(new THREE.ConeGeometry(0.012, 0.035, 8), C.tip, [ex + 0.163, top + 0.012 - 0.042, ez], [0, 0, -Math.PI / 2 - 0.25]))
    add(mk(new THREE.ConeGeometry(0.004, 0.012, 8), C.lead, [ex + 0.183, top + 0.012 - 0.047, ez], [0, 0, -Math.PI / 2 - 0.25]))
    return g
  }, [narrow, top, lapX, phoneX, table])
  usePainterly(group, PAINT)
  useOutline(group, 0.004, '#120d12')
  useEffect(() => { group.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || m.userData.isHull) return; const sm = m.material as THREE.ShaderMaterial; if (sm.uniforms?.baseColor && m.userData.color) sm.uniforms.baseColor.value.set(m.userData.color) }) })
  return <primitive object={group} />
}

const SUCC_URL = '/models/succulents.glb'
useGLTF.preload(SUCC_URL)
/**
 * Ana's succulents (Sketchfab GLB → draco + 512px webp, 566 KB). The file is Y-up with the pot's base
 * at y 0 and spans x −3.3…4.9, z −3.4…4.4, 9 tall; `scale` brings it to table size and the offset
 * centres the pot. Unlit with its own textures (like the devices), no outline.
 */
function Succulents({ x, z, top, scale }: { x: number; z: number; top: number; scale: number }) {
  const { scene } = useGLTF(SUCC_URL)
  const root = useMemo(() => {
    const r = scene.clone(true)
    r.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.isHull) return
      const src = m.material as THREE.MeshStandardMaterial
      if (m.userData.origMap === undefined) m.userData.origMap = src.map ?? null
      m.material = new THREE.MeshBasicMaterial({ map: m.userData.origMap as THREE.Texture | null, color: src.color ?? '#ffffff', side: THREE.DoubleSide, toneMapped: false })
    })
    return r
  }, [scene])
  // no ink outline here: the leaves are paper-thin double-sided sheets and the inverted hull showed as
  // black shards between them (Ana: "tenebrosa", 2026-10-14); the painted textures carry the look alone
  return (
    <group position={[x, top, z]} scale={scale}>
      <primitive object={root} position={[-0.78, 0, -0.5]} />
    </group>
  )
}

/** soft contact shadow: a radial-gradient disc lying on the table */
function Shadow({ x, z, y, w, d }: { x: number; z: number; y: number; w: number; d: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256
    const g = c.getContext('2d')!
    const r = g.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, 'rgba(20,14,24,.55)'); r.addColorStop(0.6, 'rgba(20,14,24,.25)'); r.addColorStop(1, 'rgba(20,14,24,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c); return t
  }, [])
  return (
    <mesh position={[x, y + 0.003, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  )
}

/** glass hearts and paper stars drifting slowly above the table */
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
  const items = useMemo(() => {
    const list: { x: number; y: number; z: number; s: number; heart: boolean; ph: number; tint: string }[] = []
    const spots: [number, number, number][] = narrow
      ? [[-0.55, 0.95, -0.3], [0.6, 0.75, -0.2], [-0.5, 0.05, 0.1], [0.62, 0.2, 0.2], [0.1, 1.15, -0.4], [-0.62, -0.35, 0.3]]
      : [[-1.25, 0.5, -0.3], [-0.2, 0.62, -0.35], [1.2, 0.55, -0.2], [0.05, 0.3, -0.5], [-1.05, 0.05, 0.4], [1.3, 0.1, 0.35], [0.5, 0.75, -0.6]]
    spots.forEach(([x, y, z], i) => list.push({ x, y, z, s: i % 3 === 0 ? 0.13 : 0.08, heart: i % 3 === 0, ph: i * 1.7, tint: ['#f7efe0', '#f2a0b4', '#a9d9c6', '#cdbdf0'][i % 4] }))
    return list
  }, [narrow])
  const refs = useRef<(THREE.Sprite | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    refs.current.forEach((s, i) => { if (!s) return; const it = items[i]; s.position.y = it.y + Math.sin(t * 0.6 + it.ph) * 0.03; s.material.rotation = it.heart ? Math.sin(t * 0.5 + it.ph) * 0.15 : t * 0.2 + it.ph })
  })
  return (
    <>
      {items.map((it, i) => (
        <sprite key={i} ref={(el) => { refs.current[i] = el }} position={[it.x, it.y, it.z]} scale={[it.s, it.s, 1]}>
          <spriteMaterial map={it.heart ? heart : star} color={it.heart ? '#ffffff' : it.tint} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  )
}

export default function Scenery({ narrow, phonePos, lapPos, top }: { narrow: boolean; phonePos: [number, number, number]; lapPos: [number, number, number]; top: number }) {
  const table = useMemo(() => narrow ? { w: 1.3, d: 1.5, x: lapPos[0], z: lapPos[2] + 0.06 } : { w: 2.9, d: 1.2, x: (phonePos[0] + lapPos[0]) / 2, z: 0 }, [narrow, phonePos, lapPos])
  return (
    <group>
      <Shadow x={lapPos[0]} z={lapPos[2] + 0.08} y={top} w={1.1} d={0.95} />
      {!narrow && <Shadow x={phonePos[0]} z={phonePos[2]} y={top} w={0.5} d={0.4} />}
      <Props narrow={narrow} top={top} lapX={lapPos[0]} phoneX={phonePos[0]} table={table} />
      {narrow
        ? <Succulents x={lapPos[0] - 0.4} z={0.6} top={top} scale={0.026} />
        : <Succulents x={phonePos[0] - 0.5} z={-0.05} top={top} scale={0.032} />} {/* ~0.29 tall: Ana found 0.05 "muito grande" */}
      {/* Ana's lilies, laid on the table beside the MacBook (she loves lilies, 2026-10-14) */}
      {!narrow && <GlbProp url={LILIES_URL} x={lapPos[0] + 0.66} z={-0.28} top={top} height={0.62} rotation={[0, -0.5, 0]} />}
      <group position={[0, narrow ? lapPos[1] + 0.5 : 0, 0]}><Floaters narrow={narrow} /></group>
    </group>
  )
}
