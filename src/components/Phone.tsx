import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import type { Origin } from './Transition'

/**
 * A phone lying face-up on the desk (right-front, where the pot and the tablet used to be). It is
 * the "Contato" hotspot: clicking the screen opens /contato. The model is Ana's low-poly phone
 * (public/models/phone.glb, Sketchfab, draco 8.7 KB) normalised at load time — the case mesh's world
 * rotation is cancelled so its authored axes (y thickness, z length) become up and depth, and it lies flat
 * — painted with the desk shader (case recoloured to a pale pink) and outlined in ink. The screen is
 * a plane laid over the model's face mesh with an unlit canvas lock screen: time and a "1 nova
 * mensagem" card with the contact e-mail, so the object reads as "contact" at a glance.
 */
const URL = '/models/phone.glb'
const LENGTH = 0.285 // desk units, along the desk depth
const PAINT = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.2, rimStrength: 0.45, keyColor: '#f6e2c6' }
/** recolour the model's flat materials to the desk palette (by material name in the file) */
const COLORS: Record<string, string> = { PhoneCase_Mat: '#e9b7c3', PhoneButton_Mat: '#6b6570', PhoneFace_Mat: '#15121a', Camera_Light1: '#f6dc9a' }

function lockScreen(label: string) {
  const c = document.createElement('canvas'); c.width = 270; c.height = 570
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, 0, 570); bg.addColorStop(0, '#2b3452'); bg.addColorStop(1, '#0f1220')
  g.fillStyle = bg; g.fillRect(0, 0, 270, 570)
  const glow = g.createRadialGradient(190, 420, 10, 190, 420, 220); glow.addColorStop(0, 'rgba(242,160,180,.55)'); glow.addColorStop(1, 'rgba(242,160,180,0)')
  g.fillStyle = glow; g.fillRect(0, 0, 270, 570)
  g.fillStyle = '#f3eee4'; g.textAlign = 'center'
  g.font = '500 20px Inter, system-ui, sans-serif'; g.fillText('ter, 22 set', 135, 92)
  g.font = '300 76px Inter, system-ui, sans-serif'; g.fillText('21:07', 135, 170)
  g.fillStyle = 'rgba(255,255,255,.14)'
  const r = 18, x = 22, y = 236, w = 226, h = 92
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill()
  g.fillStyle = '#a6c69a'; g.beginPath(); g.arc(50, 268, 12, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#f3eee4'; g.textAlign = 'left'
  g.font = '600 15px Inter, system-ui, sans-serif'; g.fillText(label, 72, 274)
  g.font = '400 14px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(243,238,228,.75)'; g.fillText('anajuliayagutimatilha@gmail.com', 40, 306)
  g.fillStyle = 'rgba(243,238,228,.5)'; g.fillRect(95, 548, 80, 5)
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  return tex
}

/** Ana's phone model normalised (flat, face up, 0.285 long, footprint centred, underside at y=0 after `offset`), painted */
export function usePhoneModel() {
  const { scene } = useGLTF(URL)
  const { holder, face, offset } = useMemo(() => {
    // work on a clone: the memo must be idempotent (StrictMode runs it twice, HMR re-runs it) and the
    // maths below reads the file's pristine transforms — mutating the cached gltf scene broke both
    const root = scene.clone(true)
    // keep only the case and the face: the back camera block sat under the phone and poked out beside it,
    // and the side buttons / front camera are placed by their own node transforms and floated off the edge
    ;['Phone_Camera', 'Camera_1', 'Camera_2', 'Camera_Light', 'Power_Button', 'Volume_Up', 'Volume_Down', 'Camera_Front'].forEach((n) => { const o = root.getObjectByName(n); o?.parent?.remove(o) })
    root.updateMatrixWorld(true)
    const caseMesh = root.getObjectByName('Phone_Case_PhoneCase_Mat_0') as THREE.Mesh
    const faceMesh = root.getObjectByName('Phone_Case_PhoneFace_Mat_0') as THREE.Mesh
    // The file's node chain rotates the phone (FBX export). Undo that exact rotation instead of guessing from
    // a bounding box: the case geometry is authored flat (local 30 × 5 × 60: x width, y thickness, z length),
    // so once its world rotation is cancelled, local y is up and local z is the desk depth.
    const wpos = new THREE.Vector3(), wrot = new THREE.Quaternion(), wscl = new THREE.Vector3()
    caseMesh.matrixWorld.decompose(wpos, wrot, wscl)
    const pivot = new THREE.Group(); pivot.add(root)
    root.position.copy(wpos).negate() // case centre (local origin) → pivot origin
    pivot.quaternion.copy(wrot).invert()
    const holder = new THREE.Group(); holder.add(pivot)
    holder.scale.setScalar(LENGTH / (60 * wscl.z))
    holder.updateMatrixWorld(true)
    // flat colours from the file → desk palette, remembered for the painted shader
    root.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const name = (m.material as THREE.Material).name; m.userData.color = COLORS[name] ?? '#e9b7c3' })
    // where the screen face ended up (holder space), to lay the lock screen over it
    // the face mesh is a shell (its geometry runs from y -3.7 to +1.98), so the screen goes at its TOP,
    // not its centre — at the centre the plane sat inside the case and the top read as plain pink
    const fb = new THREE.Box3().setFromObject(faceMesh)
    const cb = new THREE.Box3().setFromObject(caseMesh)
    const cc = cb.getCenter(new THREE.Vector3())
    const face = { center: new THREE.Vector3((fb.min.x + fb.max.x) / 2, fb.max.y, (fb.min.z + fb.max.z) / 2), size: fb.getSize(new THREE.Vector3()) }
    // offset that puts the case's footprint centre at the group origin and its underside on the tabletop
    const offset = new THREE.Vector3(-cc.x, -cb.min.y, -cc.z)
    return { holder, face, offset }
  }, [scene])
  usePainterly(holder, PAINT)
  useOutline(holder, 0.0024, '#120d12')
  useEffect(() => {
    holder.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || m.userData.isHull) return; const sm = m.material as THREE.ShaderMaterial; if (sm.uniforms?.baseColor && m.userData.color) sm.uniforms.baseColor.value.set(m.userData.color) })
  })
  return { holder, face, offset }
}

export default function Phone({
  position = [0.68, -0.367, 0.5] as [number, number, number], rotation = -0.38, label = '1 nova mensagem', onSelect,
}: { position?: [number, number, number]; rotation?: number; label?: string; onSelect?: (origin: Origin) => void }) {
  const { holder, face, offset } = usePhoneModel()
  const screen = useMemo(() => lockScreen(label), [label])
  const pick = (e: { stopPropagation: () => void; nativeEvent: MouseEvent }) => { e.stopPropagation(); onSelect?.({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }) }
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group position={offset}>
      <primitive object={holder} />
      {/* the lock screen, a hair above the model's own (black) face */}
      <mesh
        position={[face.center.x, face.center.y + 0.0006, face.center.z]} rotation={[-Math.PI / 2, 0, 0]}
        onClick={pick}
        onPointerOver={() => { document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { document.body.style.cursor = '' }}
      >
        <planeGeometry args={[face.size.x * 0.97, face.size.z * 0.97]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      </group>
      <pointLight position={[0, 0.06, 0]} color="#c9b6ff" intensity={0.35} distance={0.5} decay={2} />
    </group>
  )
}

useGLTF.preload(URL)
