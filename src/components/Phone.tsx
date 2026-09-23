import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import type { Origin } from './Transition'

/**
 * A phone lying on the desk, face up, where the pot and the tablet used to be (right-front). It is
 * the "Contato" hotspot: clicking it opens /contato. Body and camera bump are primitives painted with
 * the desk's shader and ink outline; the screen is an unlit canvas texture — a lock screen with the
 * time and a "1 nova mensagem" notification, so the object reads as "contact" at a glance.
 * Desk-local units (the tabletop is at y ≈ -0.38 here).
 */
const PAINT = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.2, rimStrength: 0.45, keyColor: '#f6e2c6' }
const W = 0.135, L = 0.285, T = 0.014 // width, length, thickness

function lockScreen(label: string) {
  const c = document.createElement('canvas'); c.width = 270; c.height = 570
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, 0, 570); bg.addColorStop(0, '#2b3452'); bg.addColorStop(1, '#0f1220')
  g.fillStyle = bg; g.fillRect(0, 0, 270, 570)
  // a soft blob of light, like a wallpaper
  const glow = g.createRadialGradient(190, 420, 10, 190, 420, 220); glow.addColorStop(0, 'rgba(242,160,180,.55)'); glow.addColorStop(1, 'rgba(242,160,180,0)')
  g.fillStyle = glow; g.fillRect(0, 0, 270, 570)
  g.fillStyle = '#f3eee4'; g.textAlign = 'center'
  g.font = '500 20px Inter, system-ui, sans-serif'; g.fillText('ter, 22 set', 135, 92)
  g.font = '300 76px Inter, system-ui, sans-serif'; g.fillText('21:07', 135, 170)
  // notification card
  g.fillStyle = 'rgba(255,255,255,.14)'
  const r = 18, x = 22, y = 236, w = 226, h = 92
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill()
  g.fillStyle = '#a6c69a'; g.beginPath(); g.arc(50, 268, 12, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#f3eee4'; g.textAlign = 'left'
  g.font = '600 15px Inter, system-ui, sans-serif'; g.fillText(label, 72, 274)
  g.font = '400 14px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(243,238,228,.75)'; g.fillText('anajuliayagutimatilha@gmail.com', 40, 306)
  // home bar
  g.fillStyle = 'rgba(243,238,228,.5)'; g.fillRect(95, 548, 80, 5)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  return tex
}

export default function Phone({
  position = [0.68, -0.373, 0.5] as [number, number, number], rotation = -0.38, label = '1 nova mensagem', onSelect,
}: { position?: [number, number, number]; rotation?: number; label?: string; onSelect?: (origin: Origin) => void }) {
  const body = useMemo(() => {
    const g = new THREE.Group()
    const mk = (geo: THREE.BufferGeometry, color: string) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color })); m.userData.color = color; return m }
    // the slab itself: a rounded box in warm off-white, painted like the rest of the desk
    g.add(mk(new RoundedBoxGeometry(W, T, L, 4, 0.007), '#efe8da'))
    // camera island on the back corner: a small raised rounded block with two lenses
    const island = mk(new THREE.BoxGeometry(0.036, 0.004, 0.036), '#d9d2c4'); island.position.set(-W / 2 + 0.028, -T / 2 - 0.002, -L / 2 + 0.028); g.add(island)
    ;[[-0.008, -0.008], [0.008, 0.008]].forEach(([dx, dz]) => { const lens = mk(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 12), '#2a2530'); lens.position.set(-W / 2 + 0.028 + dx, -T / 2 - 0.005, -L / 2 + 0.028 + dz); g.add(lens) })
    return g
  }, [])
  usePainterly(body, PAINT)
  useOutline(body, 0.0024, '#120d12')
  useEffect(() => {
    body.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || m.userData.isHull) return; const sm = m.material as THREE.ShaderMaterial; if (sm.uniforms?.baseColor && m.userData.color) sm.uniforms.baseColor.value.set(m.userData.color) })
  })
  const screen = useMemo(() => lockScreen(label), [label])
  const pick = (e: { stopPropagation: () => void; nativeEvent: MouseEvent }) => { e.stopPropagation(); onSelect?.({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }) }
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <primitive object={body} />
      {/* the screen sits a hair above the glass; unlit so the lock screen stays crisp */}
      <mesh
        position={[0, T / 2 + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]}
        onClick={pick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <planeGeometry args={[W - 0.012, L - 0.012]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* a faint glow on the desk from the screen */}
      <pointLight position={[0, 0.06, 0]} color="#c9b6ff" intensity={0.35} distance={0.5} decay={2} />
    </group>
  )
}
