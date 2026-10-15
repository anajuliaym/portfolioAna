import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useOutline } from './Outline'
import { useI18n } from '../i18n'
import Scenery, { LAYOUT, padTopY } from './DeviceScenery'
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
const PHONE_PX = { w: 390, h: 780 } // wallpaper texture size (phone screen proportions)
const LAPTOP_PX = { w: 1200, h: 820 } // MacBook screen proportions (0.31 × 0.2136)
const IPHONE_URL = '/models/iphone.glb'
const MACBOOK_URL = '/models/macbook.glb'
/**
 * MacBook screen, measured from the mesh (vertices whose UVs fall in the texture's screen area, in the
 * model's world space after Sketchfab's root rotation): the hinge line sits at z −0.111 (y ≈ 0), the lid
 * top at (y 0.196, z −0.186) → lid length 0.2136 leaning back 20.6°; width 0.31.
 */
const MAC = { hingeZ: -0.111, lidLen: 0.2136, tilt: -0.359, w: 0.31, scale: 2.8 } // ×2.8 → 0.87 wide, lid top ≈ +0.27 above the base
/**
 * iPhone screen: the 'MobilePhone_Phone_Emission_0' mesh IS the display (plus the camera island). Its
 * home-screen pixels live in the texture at u 0.034…0.471, v 0.014…0.986 (of 1024 px), with the
 * image's top mapped to the phone's bottom — so the wallpaper is drawn flipped vertically.
 */
const IPHONE_SCREEN = { x: 35, y: 14, w: 447, h: 996, tex: 1024, scale: 3.1 } // the model is 0.147 tall (real size); ×3.1 ≈ 0.46, matching the MacBook's height next to it (Ana: "maior e alinhados", 2026-10-14) — the MacBook
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
  g.fillStyle = '#f3eee4'; g.font = `400 ${big}px 'Butler', 'Instrument Serif', Georgia, serif`
  const words = label.split(' ')
  words.forEach((word, i) => g.fillText(word, w * 0.09, h * 0.42 + big * 1.05 * (i + 1)))
  return c
}
function wallpaper(label: string, sub: string, w: number, h: number, big: number) {
  const tex = new THREE.CanvasTexture(wallpaperCanvas(label, sub, w, h, big)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  return tex
}
/**
 * The devices keep their own textures, unlit: Ana's models already carry baked shading, and the painterly
 * shader over them turned the MacBook's keyboard into a mosaic (per-cell band flips on near-white
 * aluminium) — Ana: "faltou a textura", 2026-10-02. Double-sided like the glTF; the ink outline stays.
 */
function useFlatTextured(root: THREE.Object3D) {
  useMemo(() => {
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.userData.isHull) return
      const src = m.material as THREE.MeshStandardMaterial
      if (m.userData.origMap === undefined) m.userData.origMap = src.map ?? null
      m.material = new THREE.MeshBasicMaterial({ map: m.userData.origMap as THREE.Texture | null, color: src.color ?? '#ffffff', side: THREE.DoubleSide, toneMapped: false })
    })
  }, [root])
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
  useFlatTextured(root)
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
      <group scale={IPHONE_SCREEN.scale} position={[0, 0, 0]} onClick={(e) => { e.stopPropagation(); onPick() }} {...hover(active)}>
        <primitive object={root} />
      </group>
    </group>
  )
}

function Laptop({ active, dim, onPick, label, sub }: { active: boolean; dim: boolean; onPick: () => void; label: string; sub: string }) {
  const { scene } = useGLTF(MACBOOK_URL)
  const root = useMemo(() => scene.clone(true), [scene])
  useFlatTextured(root)
  useOutline(root, 0.0016, '#120d12')
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { const el = g.current; if (!el) return; el.position.y = THREE.MathUtils.damp(el.position.y, active ? 0 : Math.sin(performance.now() * 0.0007 + 1.3) * 0.01, 4, dt) })
  const tex = useMemo(() => wallpaper(label, sub, LAPTOP_PX.w, LAPTOP_PX.h, 96), [label, sub])
  return (
    <group ref={g}>
      <group scale={MAC.scale} position={[0, -0.27, 0.06]} /* base 0.27 below the group origin so the MacBook's visual centre sits at y 0, level with the phone */ onClick={(e) => { e.stopPropagation(); onPick() }} {...hover(active)}>
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
  const { camera, size, gl } = useThree()
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const shift = useRef(0)
  useFrame((_, dt) => {
    const Lo = narrow ? LAYOUT.narrow : LAYOUT.desktop
    const phone = [Lo.phone.x, padTopY(Lo.phone.pad) + 0.23, Lo.phone.z]
    const lap = [Lo.lap.x, padTopY(Lo.lap.pad) + 0.27, Lo.lap.z]
    let pos: number[], at: number[]
    const head = document.querySelector('.page.projects .page-head') as HTMLElement | null
    const headPx = head ? Math.max(0, head.getBoundingClientRect().bottom - gl.domElement.getBoundingClientRect().top) : 0
    // the camera looks down a little so the MacBook's keyboard shows (level with the base it was an edge)
    if (mode === 'mobile') { pos = [phone[0], phone[1] + 0.12, 0.72]; at = [phone[0], phone[1], 0] }
    else if (mode === 'web') { pos = [lap[0], lap[1] + 0.55, 1.05]; at = [lap[0], lap[1] - 0.02, -0.06] }
    else {
      // aim at the middle of the scene; the view offset below centres it in the space under the title
      // pull back for squarer viewports AND for the height the title takes (the scene lives in what is left)
      const free = Math.max(0.35, (size.height - headPx) / size.height)
      const fit = narrow ? 1 : Math.max(1, 1.45 / (size.width / size.height), 0.8 / free)
      // looking down at the pond from the front, the devices on their pads in the middle of the frame
      // close in on the devices: they are the subject, the pond is the setting
      pos = narrow ? [0, 3.9, 4.3] : [0, 1.25 * fit, 2.7 * fit]; at = [0, narrow ? 0.3 : 0.3, 0.05] // narrow: more from above, so the two pads do not overlap
    }
    target.set(pos[0], pos[1], pos[2])
    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x, 3.2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y, 3.2, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 3.2, dt)
    look.x = THREE.MathUtils.damp(look.x, at[0], 3.2, dt); look.y = THREE.MathUtils.damp(look.y, at[1], 3.2, dt); look.z = THREE.MathUtils.damp(look.z, at[2], 3.2, dt)
    camera.lookAt(look)
    // The canvas is the whole page, but the title block covers its top. Shift the image down by half the
    // header's height (measured, so it holds for every screen height) — the scene is then centred in the
    // free space under the title. No shift while a device is open.
    const want = mode ? 0 : headPx * 0.5
    shift.current = THREE.MathUtils.damp(shift.current, want, 3.2, dt)
    const cam = camera as THREE.PerspectiveCamera
    cam.setViewOffset(size.width, size.height, 0, -shift.current, size.width, size.height)
  })
  return null
}

/* ------------------------------------------------------------------ scene */

/** resolves once the display font is usable by canvas text (it paints with Georgia otherwise) */
function useDisplayFont() {
  const [ready, setReady] = useState(() => document.fonts.check("40px 'Butler'"))
  useEffect(() => { if (!ready) document.fonts.load("40px 'Butler'").then(() => setReady(true), () => setReady(true)) }, [ready])
  return ready
}

export default function Devices({ mode, setMode, protos }: { mode: Mode; setMode: (m: Mode) => void; protos: { mobile: Proto[]; web: Proto[] } }) {
  const { t } = useI18n()
  const fontReady = useDisplayFont()
  const [narrow, setNarrow] = useState(() => window.innerWidth < 760)
  useEffect(() => { const f = () => setNarrow(window.innerWidth < 760); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  // side by side on desktop, both centred on y 0 (same height); stacked on narrow screens
  // each device rests on a lily pad of the pond (DeviceScenery.LAYOUT); its centre is half its height above the pad
  const Lo = narrow ? LAYOUT.narrow : LAYOUT.desktop
  const phonePos: [number, number, number] = [Lo.phone.x, padTopY(Lo.phone.pad) + 0.23, Lo.phone.z]
  const lapPos: [number, number, number] = [Lo.lap.x, padTopY(Lo.lap.pad) + 0.27, Lo.lap.z]
  return (
    <div className={`dv-stage ${mode ? 'in-device' : ''}`}>
      <Canvas camera={{ position: [0, 0.08, 2.3], fov: 34 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, toneMapping: THREE.NoToneMapping }} onPointerMissed={() => mode && setMode(null)}>
        <color attach="background" args={['#0c0d12']} />{/* exactly the page's --bg; no tone mapping on this canvas so the clear colour comes out as the page colour, edge-free */}
        {/* moonlit pond: cool sky dome, a warm low moon from the back-right, a soft pink fill from the front */}
        <hemisphereLight color="#cfe0ff" groundColor="#3a2e4a" intensity={1.3} />
        <directionalLight position={[2, 3.5, -3]} color="#ffe6cc" intensity={2.2} />
        <directionalLight position={[-2, 2, 4]} color="#f2a0b4" intensity={0.9} />
        <Suspense fallback={null} key={fontReady ? 'font' : 'nofont'}>{/* remount once the display font is in so the wallpapers repaint with it */}
          {/* floating islands under each device: the phone's base is 0.23 below its centre, the MacBook's 0.27 */}
          <Scenery narrow={narrow} />
          <group position={phonePos}>
            <PhoneDevice active={mode === 'mobile'} dim={mode === 'web'} onPick={() => setMode('mobile')} label={t('pj_mobile')} sub={`01 · ${protos.mobile.length} ${t('pj_list')}`} />
            {mode === null && (
              <Html position={[0, 0.36, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
                <button type="button" className="dv-tag" style={{ pointerEvents: 'auto' }} onClick={() => setMode('mobile')}><small>01</small>{t('pj_mobile')}<i>→</i></button>
              </Html>
            )}
          </group>
          <group position={lapPos}>
            <Laptop active={mode === 'web'} dim={mode === 'mobile'} onPick={() => setMode('web')} label={t('pj_web')} sub={`02 · ${protos.web.length} ${t('pj_list')}`} />
            {mode === null && (
              <Html position={[0, 0.4, 0]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
                <button type="button" className="dv-tag" style={{ pointerEvents: 'auto' }} onClick={() => setMode('web')}><small>02</small>{t('pj_web')}<i>→</i></button>
              </Html>
            )}
          </group>
        </Suspense>
        <Rig mode={mode} narrow={narrow} />
        {/* a little bloom: the moon, the glass hearts and the screens' highlights glow softly */}
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.45} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
