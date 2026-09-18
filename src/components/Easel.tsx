import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'

/**
 * A tabletop painter's easel sitting on the desk: three splayed wooden legs, a ledge, and a small
 * framed canvas with a painting of the garden from the Fragments page. Built from primitives and
 * painted with exactly the desk's shader and ink outline, so it belongs to the same world.
 * Desk-local coordinates (the desk top is at y ≈ -0.33).
 */

const PAINT = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.12, rimStrength: 0.45, keyColor: '#f6e2c6' }

/** The little painting: sky, clouds, a green hill and a pink flower, in loose brush dabs. */
function paintingTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 200
  const ctx = c.getContext('2d')!
  const sky = ctx.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#7fb4d6'); sky.addColorStop(0.7, '#dfe9ec'); sky.addColorStop(1, '#f6ead3')
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 256, 200)
  let s = 3; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  const dab = (x: number, y: number, w: number, h: number, col: string, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, w, h, (r() - 0.5) * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 }
  for (let i = 0; i < 14; i++) dab(20 + r() * 216, 20 + r() * 70, 18 + r() * 26, 8 + r() * 10, '#fffaf0', 0.8)
  // hill
  ctx.fillStyle = '#8fbf7a'; ctx.beginPath(); ctx.ellipse(150, 260, 230, 130, 0, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 40; i++) dab(r() * 256, 150 + r() * 50, 10 + r() * 16, 5 + r() * 7, i % 2 ? '#7fb56e' : '#9ccb8b', 0.7)
  // flower
  ctx.strokeStyle = '#5f9a5a'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(178, 190); ctx.quadraticCurveTo(186, 150, 182, 108); ctx.stroke()
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; dab(182 + Math.cos(a) * 16, 104 + Math.sin(a) * 14, 12, 7, '#f2a0b4') }
  dab(182, 104, 6, 6, '#f6dc9a')
  dab(160, 172, 16, 6, '#6faa62'); dab(200, 178, 14, 5, '#6faa62')
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}

export default function Easel({ position = [-0.74, -0.33, -0.02] as [number, number, number], rotation = 0.55 }: { position?: [number, number, number]; rotation?: number }) {
  const group = useMemo(() => {
    const g = new THREE.Group()
    const mk = (geo: THREE.BufferGeometry, color: string, map?: THREE.Texture) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, map: map ?? null })); m.userData.color = color; return m
    }
    const wood = '#8a6a52', dark = '#5e4433'
    const H = 0.3 // leg length
    const legGeo = new THREE.CylinderGeometry(0.0045, 0.006, H, 7); legGeo.translate(0, H / 2, 0)
    // two front legs splayed sideways, one back leg leaning away
    const lean = 0.2
    const l1 = mk(legGeo, wood); l1.position.set(-0.075, 0, 0.02); l1.rotation.z = lean; g.add(l1)
    const l2 = mk(legGeo, wood); l2.position.set(0.075, 0, 0.02); l2.rotation.z = -lean; g.add(l2)
    const l3 = mk(legGeo, dark); l3.position.set(0, 0, -0.03); l3.rotation.x = -0.42; g.add(l3)
    // ledge that holds the canvas, and a top crossbar
    const ledge = mk(new THREE.BoxGeometry(0.15, 0.012, 0.022), wood); ledge.position.set(0, 0.1, 0.03); ledge.rotation.x = 0.15; g.add(ledge)
    const bar = mk(new THREE.BoxGeometry(0.12, 0.01, 0.012), dark); bar.position.set(0, 0.235, -0.0); g.add(bar)
    // the canvas, leaning back a little on the ledge
    const canvas = new THREE.Group(); canvas.position.set(0, 0.175, 0.035); canvas.rotation.x = -0.16
    const frame = mk(new THREE.BoxGeometry(0.15, 0.12, 0.012), '#e9dcc3'); canvas.add(frame)
    const pic = mk(new THREE.PlaneGeometry(0.132, 0.102), '#ffffff', paintingTexture()); pic.position.z = 0.0065; canvas.add(pic)
    g.add(canvas)
    // a tiny palette and brush at the foot
    const palette = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 14), '#efe3c2'); palette.scale.set(1.3, 1, 1); palette.position.set(0.11, 0.0025, 0.06); palette.rotation.y = 0.4; g.add(palette)
    ;['#f2a0b4', '#7fb56e', '#7fb4d6', '#f6dc9a'].forEach((col, i) => { const blob = mk(new THREE.SphereGeometry(0.006, 8, 6), col); blob.position.set(0.11 + Math.cos(i * 1.5) * 0.017, 0.007, 0.06 + Math.sin(i * 1.5) * 0.013); blob.scale.y = 0.5; g.add(blob) })
    const brush = mk(new THREE.CylinderGeometry(0.0022, 0.0022, 0.09, 6), dark); brush.position.set(0.1, 0.006, 0.09); brush.rotation.set(Math.PI / 2, 0, 0.9); g.add(brush)
    return g
  }, [])
  usePainterly(group, PAINT)
  useOutline(group, 0.0024, '#120d12')
  // the painted shader has no per-mesh colour: hand each material its base colour (the picture keeps its map)
  useEffect(() => {
    group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.isHull) return
      const sm = m.material as THREE.ShaderMaterial
      if (sm.uniforms?.baseColor && m.userData.color) sm.uniforms.baseColor.value.set(m.userData.color)
    })
  })
  return <primitive object={group} position={position} rotation={[0, rotation, 0]} />
}
