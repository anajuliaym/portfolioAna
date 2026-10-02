import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import { useI18n } from '../i18n'
import type { Proto } from '../pages/content'

/**
 * The Projects page: two painted devices float in the dark — an iPhone (mobile prototypes) and a
 * MacBook Pro (web prototypes), Ana's models (Sketchfab GLBs, compressed into public/models with
 * gltf-transform `unlit` + `optimize --compress draco --texture-compress webp`), each with a paper
 * tag and a wallpaper on its screen. Clicking one flies the
 * camera to the device; the page then lays a device-shaped panel (DeviceDock) over it where the
 * prototypes are listed and opened — a Figma embed or screenshots — so you browse as if holding it.
 */
export type Mode = null | 'mobile' | 'web'
// neutral fill/rim: the painterly defaults (blue fill, mint rim) tinted the MacBook's silver green
const PAINT = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.2, rimStrength: 0.22, keyColor: '#f8ecd9', fillColor: '#8e93a8', shadowColor: '#3a3c4a', rimColor: '#ece7ef' }
const PHONE_PX = { w: 390, h: 780 } // wallpaper texture size (phone screen proportions)
const LAPTOP_PX = { w: 1200, h: 820 } // MacBook screen proportions (0.31 × 0.2136)
const IPHONE_URL = '/models/iphone.glb'
const MACBOOK_URL = '/models/macbook.glb'
/**
 * MacBook screen, measured from the mesh (vertices whose UVs fall in the texture's screen area, in the
 * model's world space after Sketchfab's root rotation): the hinge line sits at z −0.111 (y ≈ 0), the lid
 * top at (y 0.196, z −0.186) → lid length 0.2136 leaning back 20.6°; width 0.31.
 */
const MAC = { hingeZ: -0.111, lidLen: 0.2136, tilt: -0.359, w: 0.31, scale: 2 }
/**
 * iPhone screen: the 'MobilePhone_Phone_Emission_0' mesh IS the display (plus the camera island). Its
 * home-screen pixels live in the texture at u 0.034…0.471, v 0.014…0.986 (of 1024 px), with the
 * image's top mapped to the phone's bottom — so the wallpaper is drawn flipped vertically.
 */
const IPHONE_SCREEN = { x: 35, y: 14, w: 447, h: 996, tex: 1024, scale: 2.3 } // the model is 0.147 tall (real size); ×2.3 ≈ 0.34, a bit more presence next to the MacBook
useGLTF.preload(IPHONE_URL)
useGLTF.preload(MACBOOK_URL)

/** idle wallpaper drawn on the 3D screen: the category name, big, on the site's dark gradient */
function wallpaperCanvas(label: string, sub: string, w: number, h: number, big: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#2b3452'); bg.addColorStop(1, '#0f1220')
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  const glow = g.createRadialGradient(w * 0.8, h * 0.85, 10, w * 0.8, h * 0.85, w * 0.7); glow.addColorStop(0, 'rgba(242,160,180,.5)'); glow.addColorStop(1, 'rgba(242,160,180,0)')
  g.fillStyle = glow; g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(243,238,228,.6)'; g.font = `500 ${Math.round(big * 0.22)}px Inter, system-ui, sans-serif`; g.textAlign = 'left'
  g.fillText(sub.toUpperCase(), w * 0.09, h * 0.42)
  g.fillStyle = '#f3eee4'; g.font = `italic 400 ${big}px 'Instrument Serif', Georgia, serif`
  const words = label.split(' ')
  words.forEach((word, i) => g.fillText(word, w * 0.09, h * 0.42 + big * 1.05 * (i + 1)))
  return c
}
function wallpaper(label: string, sub: string, w: number, h: number, big: number) {
  const tex = new THREE.CanvasTexture(wallpaperCanvas(label, sub, w, h, big)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  return tex
}
const hover = (active: boolean) => ({ onPointerOver: () => { if (!active) document.body.style.cursor = 'pointer' }, onPointerOut: () => { document.body.style.cursor = '' } })

/* ------------------------------------------------------------------ devices */

function PhoneDevice({ active, dim, onPick, label, sub }: { active: boolean; dim: boolean; onPick: () => void; label: string; sub: string }) {
  const { scene } = useGLTF(IPHONE_URL)
  const root = useMemo(() => {
    // clone: the cached gltf must stay pristine (StrictMode / HMR re-run this)
    const r = scene.clone(true)
    // the glass layer over the screen would turn opaque under the painterly shader — drop it
    const drop: THREE.Object3D[] = []
    r.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).name === 'Phone_Alpha') drop.push(m) })
    drop.forEach((o) => o.parent?.remove(o))
    return r
  }, [scene])
  usePainterly(root, PAINT) // keeps the model's own textures as base colour
  useOutline(root, 0.0016, '#120d12')
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true }), [])
  useEffect(() => {
    // the display mesh gets an unlit copy of its texture with the wallpaper painted over the home screen
    const mesh = root.getObjectByName('MobilePhone_Phone_Emission_0') as THREE.Mesh | undefined
    const src = mesh?.userData.origMap as THREE.Texture | undefined
    if (!mesh || !src?.image) return
    const { x, y, w, h, tex: size } = IPHONE_SCREEN
    const c = document.createElement('canvas'); c.width = c.height = size
    const g = c.getContext('2d')!
    g.drawImage(src.image as CanvasImageSource, 0, 0, size, size)
    g.save(); g.translate(x, y + h); g.scale(1, -1) // texture top = phone bottom
    g.drawImage(wallpaperCanvas(label, sub, PHONE_PX.w, PHONE_PX.h, 44), 0, 0, w, h)
    g.restore()
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4
    screenMat.map?.dispose(); screenMat.map = t; screenMat.needsUpdate = true
    mesh.material = screenMat
  }, [root, label, sub, screenMat])
  useEffect(() => { screenMat.opacity = dim ? 0.35 : 1 }, [dim, screenMat])
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { const el = g.current; if (!el) return; el.position.y = THREE.MathUtils.damp(el.position.y, active ? 0 : Math.sin(performance.now() * 0.0009) * 0.012, 4, dt) })
  return (
    <group ref={g}>
      {/* the model already stands upright facing +z, centred on its own origin */}
      <group scale={IPHONE_SCREEN.scale} position={[0, 0.16, 0]} onClick={(e) => { e.stopPropagation(); onPick() }} {...hover(active)}>
        <primitive object={root} />
      </group>
    </group>
  )
}

function Laptop({ active, dim, onPick, label, sub }: { active: boolean; dim: boolean; onPick: () => void; label: string; sub: string }) {
  const { scene } = useGLTF(MACBOOK_URL)
  const root = useMemo(() => scene.clone(true), [scene])
  usePainterly(root, PAINT)
  useOutline(root, 0.0016, '#120d12')
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { const el = g.current; if (!el) return; el.position.y = THREE.MathUtils.damp(el.position.y, active ? 0 : Math.sin(performance.now() * 0.0007 + 1.3) * 0.01, 4, dt) })
  const tex = useMemo(() => wallpaper(label, sub, LAPTOP_PX.w, LAPTOP_PX.h, 96), [label, sub])
  return (
    <group ref={g}>
      <group scale={MAC.scale} position={[0, -0.2, 0.06]} onClick={(e) => { e.stopPropagation(); onPick() }} {...hover(active)}>
        <primitive object={root} />
        {/* the wallpaper plane lies on the lid's inner face: hinge at the back, leaning back with the lid */}
        <group position={[0, 0, MAC.hingeZ]} rotation={[MAC.tilt, 0, 0]}>
          <mesh position={[0, MAC.lidLen / 2 + 0.004, 0.0025]}>
            <planeGeometry args={[MAC.w * 0.93, MAC.lidLen * 0.84]} />
            <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={dim ? 0.35 : 1} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ camera */

function Rig({ mode, narrow }: { mode: Mode; narrow: boolean }) {
  const { camera } = useThree()
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const phone = narrow ? [0, 0.42, 0] : [-0.52, 0.02, 0]
    const lap = narrow ? [0, -0.5, 0] : [0.42, -0.02, 0]
    let pos: number[], at: number[]
    if (mode === 'mobile') { pos = [phone[0], phone[1] + 0.02, 0.58]; at = [phone[0], phone[1] + 0.02, 0] }
    else if (mode === 'web') { pos = [lap[0], lap[1] + 0.12, 0.82]; at = [lap[0], lap[1] + 0.06, -0.1] }
    else { pos = narrow ? [0, 0, 3.1] : [0, 0.08, 2.3]; at = [0, narrow ? -0.02 : -0.02, 0] }
    target.set(pos[0], pos[1], pos[2])
    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x, 3.2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y, 3.2, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 3.2, dt)
    look.x = THREE.MathUtils.damp(look.x, at[0], 3.2, dt); look.y = THREE.MathUtils.damp(look.y, at[1], 3.2, dt); look.z = THREE.MathUtils.damp(look.z, at[2], 3.2, dt)
    camera.lookAt(look)
  })
  return null
}

/* ------------------------------------------------------------------ scene */

export default function Devices({ mode, setMode, protos }: { mode: Mode; setMode: (m: Mode) => void; protos: { mobile: Proto[]; web: Proto[] } }) {
  const { t } = useI18n()
  const [narrow, setNarrow] = useState(() => window.innerWidth < 760)
  useEffect(() => { const f = () => setNarrow(window.innerWidth < 760); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  const phonePos: [number, number, number] = narrow ? [0, 0.42, 0] : [-0.52, 0.02, 0]
  const lapPos: [number, number, number] = narrow ? [0, -0.5, 0] : [0.42, -0.02, 0]
  return (
    <div className={`dv-stage ${mode ? 'in-device' : ''}`}>
      <Canvas camera={{ position: [0, 0.08, 2.3], fov: 34 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }} onPointerMissed={() => mode && setMode(null)}>
        <hemisphereLight color="#e6f3fb" groundColor="#3a3242" intensity={0.7} />
        <directionalLight position={[2, 3, 3]} color="#ffe3bd" intensity={1.2} />
        <Suspense fallback={null}>
          <group position={phonePos}>
            <PhoneDevice active={mode === 'mobile'} dim={mode === 'web'} onPick={() => setMode('mobile')} label={t('pj_mobile')} sub={`01 · ${protos.mobile.length} ${t('pj_list')}`} />
            {mode === null && (
              <Html position={[0, 0.4, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
                <button type="button" className="dv-tag" style={{ pointerEvents: 'auto' }} onClick={() => setMode('mobile')}><small>01</small>{t('pj_mobile')}<i>→</i></button>
              </Html>
            )}
          </group>
          <group position={lapPos}>
            <Laptop active={mode === 'web'} dim={mode === 'mobile'} onPick={() => setMode('web')} label={t('pj_web')} sub={`02 · ${protos.web.length} ${t('pj_list')}`} />
            {mode === null && (
              <Html position={[0, 0.3, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
                <button type="button" className="dv-tag" style={{ pointerEvents: 'auto' }} onClick={() => setMode('web')}><small>02</small>{t('pj_web')}<i>→</i></button>
              </Html>
            )}
          </group>
        </Suspense>
        <Rig mode={mode} narrow={narrow} />
      </Canvas>
    </div>
  )
}
