import { Suspense, useEffect, useMemo } from 'react'
import { PerspectiveCamera, RenderTexture, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import type { Origin } from './Transition'

/**
 * A tabletop painter's easel on the desk, holding a "photo" of Ana's character: a portrait of the
 * hero model rendered live into a texture with its own texture and studio lights. The easel itself (three legs in an A-frame, ledge,
 * crossbar, frame, palette and brush) is built from primitives and painted with exactly the
 * desk's shader and ink outline. It is the "About" hotspot: clicking the picture opens /sobre.
 * Desk-local coordinates (the desk top is at y ≈ -0.33).
 */

const PAINT = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.12, rimStrength: 0.45, keyColor: '#f6e2c6' }
const CHARACTER_URL = '/models/character.glb'
const PIC = { w: 0.1, h: 0.13 } // the picture inside the frame (portrait orientation)
/** Ana's photo for the easel: any image dropped in src/assets/about; without one, the 3D portrait of the character shows. */
const PHOTO_URL = (Object.values(import.meta.glob('../assets/about/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default', query: '?url' })) as string[])[0]
const PIC_POS: [number, number, number] = [0, 0.185, 0.035]
const PIC_TILT = -0.16

/**
 * The hero character framed as a head-and-shoulders portrait — a "photo": the model's own
 * texture under soft studio light (the painted shader does not draw inside a render texture).
 */
function Portrait() {
  const { scene } = useGLTF(CHARACTER_URL)
  const model = useMemo(() => {
    // the hero already swapped this model's materials for the painted shader: rebuild plain ones
    // from the original textures. Read those from the *source* scene — Object3D.clone copies
    // userData through JSON, which turns a Texture into a dead plain object (and crashes the renderer)
    const maps = new Map<string, THREE.Texture | null>()
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || mesh.userData.isHull) return
      const orig = mesh.userData.origMap as THREE.Texture | null | undefined
      maps.set(mesh.uuid, orig instanceof THREE.Texture ? orig : ((mesh.material as THREE.MeshStandardMaterial).map ?? null))
    })
    const m = scene.clone(true)
    const hulls: THREE.Object3D[] = []
    const srcMeshes: THREE.Mesh[] = []; scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.userData.isHull) srcMeshes.push(o as THREE.Mesh) })
    const dstMeshes: THREE.Mesh[] = []
    m.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; if (mesh.userData.isHull) hulls.push(mesh); else dstMeshes.push(mesh) })
    dstMeshes.forEach((mesh, i) => { mesh.material = new THREE.MeshStandardMaterial({ map: maps.get(srcMeshes[i]?.uuid) ?? null, roughness: 0.75, metalness: 0 }) })
    hulls.forEach((h) => h.parent?.remove(h))
    return m
  }, [scene])
  return (
    <group position={[0, -0.55, 0]} scale={1.4}>
      <primitive object={model} />
    </group>
  )
}

/** The photo itself, cover-cropped to the frame's proportions. */
function Photo() {
  const tex = useTexture(PHOTO_URL)
  useEffect(() => {
    const img = tex.image as { width: number; height: number }
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8
    const frameAspect = PIC.w / PIC.h, imgAspect = img.width / img.height
    if (imgAspect > frameAspect) { tex.repeat.set(frameAspect / imgAspect, 1); tex.offset.set((1 - frameAspect / imgAspect) / 2, 0) }
    else { tex.repeat.set(1, imgAspect / frameAspect); tex.offset.set(0, (1 - imgAspect / frameAspect) / 2 + 0.06) } // a touch higher: faces sit in the upper part
    tex.needsUpdate = true
  }, [tex])
  return <meshBasicMaterial map={tex} toneMapped={false} />
}

export default function Easel({
  position = [-0.84, -0.33, 0.06] as [number, number, number], rotation = 0.6, scale = 1.3, onSelect,
}: { position?: [number, number, number]; rotation?: number; scale?: number; onSelect?: (origin: Origin) => void }) {
  const group = useMemo(() => {
    const g = new THREE.Group()
    const mk = (geo: THREE.BufferGeometry, color: string) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color })); m.userData.color = color; return m }
    const wood = '#8a6a52', dark = '#5e4433'
    // A-frame: the two front legs meet at the top pin; the third leg leans back from the same pin
    const L = 0.34, top = 0.32
    const legGeo = new THREE.CylinderGeometry(0.0045, 0.0062, L, 7); legGeo.translate(0, -L / 2, 0) // hangs down from the pin
    const spread = 0.28 // half-angle between the front legs
    const l1 = mk(legGeo, wood); l1.position.set(0, top, 0.015); l1.rotation.z = spread; g.add(l1)
    const l2 = mk(legGeo, wood); l2.position.set(0, top, 0.015); l2.rotation.z = -spread; g.add(l2)
    const l3 = mk(legGeo, dark); l3.position.set(0, top, 0.0); l3.rotation.x = -0.5; g.add(l3)
    const pin = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 10), dark); pin.position.set(0, top, 0.01); pin.rotation.z = Math.PI / 2; g.add(pin)
    // ledge across the front legs (where the frame rests) and a crossbar higher up
    const ledge = mk(new THREE.BoxGeometry(0.16, 0.012, 0.024), wood); ledge.position.set(0, 0.1, 0.045); g.add(ledge)
    const bar = mk(new THREE.BoxGeometry(0.11, 0.01, 0.012), dark); bar.position.set(0, 0.265, 0.03); g.add(bar)
    // the frame (the picture itself is JSX below, so it can carry the live portrait texture)
    const frame = mk(new THREE.BoxGeometry(PIC.w + 0.018, PIC.h + 0.018, 0.012), '#e9dcc3')
    frame.position.set(...PIC_POS); frame.rotation.x = PIC_TILT; g.add(frame)
    // a tiny palette and brush at the foot
    const palette = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 14), '#efe3c2'); palette.scale.set(1.3, 1, 1); palette.position.set(0.12, 0.0025, 0.07); palette.rotation.y = 0.4; g.add(palette)
    ;['#f2a0b4', '#7fb56e', '#7fb4d6', '#f6dc9a'].forEach((col, i) => { const blob = mk(new THREE.SphereGeometry(0.006, 8, 6), col); blob.position.set(0.12 + Math.cos(i * 1.5) * 0.017, 0.007, 0.07 + Math.sin(i * 1.5) * 0.013); blob.scale.y = 0.5; g.add(blob) })
    const brush = mk(new THREE.CylinderGeometry(0.0022, 0.0022, 0.09, 6), dark); brush.position.set(0.11, 0.006, 0.1); brush.rotation.set(Math.PI / 2, 0, 0.9); g.add(brush)
    return g
  }, [])
  usePainterly(group, PAINT)
  useOutline(group, 0.0024, '#120d12')
  // the painted shader has no per-mesh colour: hand each material its base colour
  useEffect(() => {
    group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.isHull) return
      const sm = m.material as THREE.ShaderMaterial
      if (sm.uniforms?.baseColor && m.userData.color) sm.uniforms.baseColor.value.set(m.userData.color)
    })
  })
  return (
    <primitive object={group} position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* the photo: an unlit plane showing the character portrait, rendered to a texture */}
      <group position={PIC_POS} rotation={[PIC_TILT, 0, 0]}>
        <mesh
          position={[0, 0, 0.0065]}
          onClick={(e) => { e.stopPropagation(); onSelect?.({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }) }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = '' }}
        >
          <planeGeometry args={[PIC.w, PIC.h]} />
          {PHOTO_URL ? <Photo /> : <meshBasicMaterial toneMapped={false}>
            <RenderTexture attach="map" width={396} height={512} frames={240}>
              {/* a warm photo-studio backdrop and soft lights */}
              <color attach="background" args={['#e8dcc4']} />
              <hemisphereLight color="#ffffff" groundColor="#8a7a6a" intensity={1.1} />
              <directionalLight position={[1.2, 2.2, 2.4]} color="#fff1dc" intensity={2.4} />
              <directionalLight position={[-2, 1, 1]} color="#cfe0ff" intensity={0.8} />
              <PerspectiveCamera makeDefault position={[0, 0.6, 1.5]} fov={32} />
              <Suspense fallback={null}>
                <Portrait />
              </Suspense>
            </RenderTexture>
          </meshBasicMaterial>}
        </mesh>
      </group>
    </primitive>
  )
}

if (!PHOTO_URL) useGLTF.preload(CHARACTER_URL)
else useTexture.preload(PHOTO_URL)
