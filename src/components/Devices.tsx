import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { SceneReady } from './SceneReady'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useAdaptiveDpr } from './AdaptiveDpr'
import { useGLRecovery } from './glRecovery'
import { Html, useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useOutline } from './Outline'
import { makeClay } from './ClayMaterial'
import { useI18n } from '../i18n'
import Scenery, { LAYOUT, usePadSurfaceY } from './DeviceScenery'
import type { Proto } from '../pages/content'
import { Screen } from './DeviceDock'
import { I18nContext } from '../i18n'

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
const IPHONE_SCREEN = { x: 35, y: 14, w: 447, h: 996, tex: 1024, scale: 3.1, /* the display rectangle in world units (model cm × 0.01 × scale): */ wz: 0.361 * 0.031, ww: 5.95 * 0.031, wh: 14.23 * 0.031 } // the model is 0.147 tall (real size); ×3.1 ≈ 0.46, matching the MacBook's height next to it (Ana: "maior e alinhados", 2026-10-14) — the MacBook
useGLTF.preload(IPHONE_URL)
useGLTF.preload(MACBOOK_URL)

/** idle wallpaper drawn on the 3D screen: the category name, big, on the site's dark gradient */
/** the wallpaper: the pond's own night — navy to aqua, a cream moon glow, soft mint pads (Ana, 2026-10-15: "mais harmônico com a cena") */
function wallpaperCanvas(label: string, sub: string, w: number, h: number, big: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#141a30'); bg.addColorStop(0.55, '#24445c'); bg.addColorStop(1, '#3f8e92')
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  const moon = g.createRadialGradient(w * 0.78, h * 0.18, 0, w * 0.78, h * 0.18, w * 0.55); moon.addColorStop(0, 'rgba(255,236,220,.55)'); moon.addColorStop(0.35, 'rgba(170,200,215,.18)'); moon.addColorStop(1, 'rgba(170,200,215,0)')
  g.fillStyle = moon; g.fillRect(0, 0, w, h)
  // soft mint pads floating at the bottom
  const pads: [number, number, number, number][] = [[0.2, 0.86, 0.26, .55], [0.62, 0.92, 0.2, .45], [0.92, 0.8, 0.16, .35], [0.42, 0.74, 0.1, .3]]
  for (const [px, py, pr, pa] of pads) {
    const r = w * pr
    const pad = g.createRadialGradient(w * px, h * py, r * 0.2, w * px, h * py, r); pad.addColorStop(0, `rgba(166,214,190,${pa})`); pad.addColorStop(1, 'rgba(166,214,190,0)')
    g.fillStyle = pad; g.fillRect(0, 0, w, h)
  }
  // a pink haze and a few stars
  const haze = g.createRadialGradient(w * 0.15, h * 0.55, 0, w * 0.15, h * 0.55, w * 0.5); haze.addColorStop(0, 'rgba(242,160,180,.18)'); haze.addColorStop(1, 'rgba(242,160,180,0)')
  g.fillStyle = haze; g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,245,235,.7)'
  for (let i = 0; i < 26; i++) { const sx = ((i * 97) % 101) / 101, sy = ((i * 53) % 89) / 89 * 0.5; g.globalAlpha = 0.3 + ((i * 31) % 7) / 10; g.beginPath(); g.arc(w * sx, h * sy, 1 + ((i * 13) % 3) * 0.6, 0, Math.PI * 2); g.fill() }
  g.globalAlpha = 1
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
      // the unlit-optimised GLBs carry no vertex normals; the lit shader needs them (normalize(0) = NaN → Bloom painted the whole frame black)
      if (!m.geometry.attributes.normal) m.geometry.computeVertexNormals()
      // 2026-10-15 (Ana: "os aparelhos parecem deslocados do resto"): the baked textures stay, but through the
      // scene's soft-clay light (ClayMaterial) — lilac shade, warm key, pink rim, a touch of pastel — so the
      // aluminium and glass sit in the same painted night as the pond. No bands/patches, so no mosaic on white.
      m.material = makeClay({ map: m.userData.origMap as THREE.Texture | null, side: THREE.DoubleSide, pastel: 0.3, saturation: 1.08, rim: 0.3, sheen: 0.22, keyDir: [1.4, 1.5, 1.2], keyColor: '#f6e2c6' })
    })
  }, [root])
}
const hover = (active: boolean) => ({ onPointerOver: () => { if (!active) document.body.style.cursor = 'pointer' }, onPointerOut: () => { document.body.style.cursor = '' } })

/* ------------------------------------------------------------------ devices */

/**
 * Html `transform` scale: with `transform`, 1 CSS px = distanceFactor / 400 world units (measured earlier in
 * this project). So a `px`-wide DOM screen matches a `world`-wide display when distanceFactor = world / px × 400.
 */
const dfFor = (world: number, px: number) => (world / px) * 400
const PHONE_DOM = { w: 390, h: 933 } // 0.1845 × 0.441 world → same aspect
const LAP_DOM = { w: 1100, h: 684 } // 0.807 × 0.502 world
const LAP_DOM_NARROW = { w: 640, h: 398 } // same aspect, fewer px: on a phone the MacBook's screen is only ~350px wide

/**
 * Touch screens and narrow windows get the screen FLAT, not on the 3D display (Ana's iPhone, 2026-10-23): iOS Safari
 * places drei's Html `transform` plane well below the display and leaves iframes inside it blank (the apps only
 * spun). There the camera still flies to the device, and the page shows the same `Screen` as a flat panel over it
 * (FlatScreen in DeviceDock.tsx) — native touch scrolling, iframes that render.
 */
export function useFlatScreens() {
  const test = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760
  const [flat, setFlat] = useState(test)
  useEffect(() => { const f = () => setFlat(test()); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  return flat
}

/**
 * The DOM screen, as something that lives INSIDE the device (Ana, 2026-10-15: "não pode vir por cima, e tem que
 * ter um shader realista"): it mounts dark while the camera is still flying (the 3D wallpaper shows through),
 * then powers on — brightness/blur/scale easing in — and a faint glass layer sits over the content (diagonal
 * reflection, vignette, bezel shadow; lighting only).
 */
function DeviceScreen({ active, className, width, height, children }: { active: boolean; className: string; width: number; height: number; children: React.ReactNode }) {
  const [lit, setLit] = useState(false)
  useEffect(() => {
    if (!active) { setLit(false); return }
    const t = window.setTimeout(() => setLit(true), 700)
    return () => window.clearTimeout(t)
  }, [active])
  return (
    <div className={`dv3 ${className}${lit ? ' lit' : ''}`} style={{ width, height }}>
      <div className="dv3-content">{children}</div>
      <div className="dv3-glass" aria-hidden />
    </div>
  )
}

function PhoneDevice({ active, dim, onPick, label, sub, items, flat }: { active: boolean; dim: boolean; onPick: () => void; label: string; sub: string; items: Proto[]; flat: boolean }) {
  const i18n = useI18n() // drei's Html mounts its own React root: contexts do not cross, so the value is carried over by hand
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
  // the DOM screen is fitted to the display mesh's real bounds (Ana, 2026-10-15: "a tela não está encaixando")
  // — measured in the model, scaled by the group — instead of the hand-estimated 5,95×14,23 cm rectangle
  const fit = useMemo(() => {
    const mesh = root.getObjectByName('MobilePhone_Phone_Emission_0')
    root.updateMatrixWorld(true)
    const S = IPHONE_SCREEN.scale
    if (!mesh) return { x: 0, y: 0, z: IPHONE_SCREEN.wz, w: IPHONE_SCREEN.ww, h: IPHONE_SCREEN.wh }
    const b = new THREE.Box3().setFromObject(mesh)
    return { x: (b.min.x + b.max.x) / 2 * S, y: (b.min.y + b.max.y) / 2 * S, z: b.max.z * S, w: (b.max.x - b.min.x) * S, h: (b.max.y - b.min.y) * S }
  }, [root])
  const domH = Math.round(PHONE_DOM.w * (fit.h / fit.w))
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
      {/* the live screen, on the display itself, once the camera is there */}
      {active && !flat && (
        <Html transform position={[fit.x, fit.y, fit.z + 0.002]} distanceFactor={dfFor(fit.w, PHONE_DOM.w)} zIndexRange={[20, 10]} style={{ pointerEvents: 'auto' }}>
          <I18nContext.Provider value={i18n}><DeviceScreen active={active} className="dv3-mobile" width={PHONE_DOM.w} height={domH}><Screen kind="mobile" items={items} label={label} /></DeviceScreen></I18nContext.Provider>
        </Html>
      )}
    </group>
  )
}

/** the MacBook's screen centre / tilt relative to the Laptop group: hinge → lid centre, through the inner scale 2.8 and offset (see MAC) */
const LAP_SCREEN = { pos: [0, 0.023, -0.353] as [number, number, number], rot: [MAC.tilt, 0, 0] as [number, number, number], ww: MAC.w * 0.93 * MAC.scale, wh: MAC.lidLen * 0.84 * MAC.scale }

function Laptop({ active, dim, onPick, label, sub, items, narrow, flat }: { active: boolean; dim: boolean; onPick: () => void; label: string; sub: string; items: Proto[]; narrow: boolean; flat: boolean }) {
  const dom = narrow ? LAP_DOM_NARROW : LAP_DOM
  const i18n = useI18n()
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
      {active && !flat && (
        <group position={LAP_SCREEN.pos} rotation={LAP_SCREEN.rot}>
          <Html transform position={[0, 0, 0.003]} distanceFactor={dfFor(LAP_SCREEN.ww, dom.w)} zIndexRange={[20, 10]} style={{ pointerEvents: 'auto' }}>
            <I18nContext.Provider value={i18n}><DeviceScreen active={active} className={`dv3-web${narrow ? ' dv3-narrow' : ''}`} width={dom.w} height={dom.h}><Screen kind="web" items={items} label={label} /></DeviceScreen></I18nContext.Provider>
          </Html>
        </group>
      )}
    </group>
  )
}

/* ------------------------------------------------------------------ camera */

function Rig({ mode, narrow, phoneY, lapY }: { mode: Mode; narrow: boolean; phoneY: number; lapY: number }) {
  const { camera, size, gl } = useThree()
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const target = useMemo(() => new THREE.Vector3(), [])
  const shift = useRef(0)
  useFrame((_, dt) => {
    const Lo = narrow ? LAYOUT.narrow : LAYOUT.desktop
    const phone = [Lo.phone.x, phoneY, Lo.phone.z]
    const lap = [Lo.lap.x, lapY, Lo.lap.z]
    let pos: number[], at: number[]
    const head = document.querySelector('.page.projects .page-head') as HTMLElement | null
    const headPx = head ? Math.max(0, head.getBoundingClientRect().bottom - gl.domElement.getBoundingClientRect().top) : 0
    // the camera looks down a little so the MacBook's keyboard shows (level with the base it was an edge)
    // close-ups: the device's display fills the frame (its own screen is the UI now), with a margin for the
    // bezel — the distance comes from the fov and the viewport's aspect, so it holds on any screen
    const cam = camera as THREE.PerspectiveCamera
    const visH = Math.min(size.height, window.innerHeight) // the canvas is taller than the viewport on narrow screens (125svh)
    const tan2full = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    const tan2 = tan2full * (visH / size.height)
    const aspect = size.width / visH
    const fitDist = (w: number, h: number, fill: number) => Math.max(h / (fill * tan2), w / (fill * tan2 * aspect))
    // the visible centre sits above the canvas centre: slide camera AND target down (in view space) by that much,
    // so the screen lands in the middle of what is seen. (A view offset would do it too, but drei's Html transform
    // ignores view offsets and the DOM screen would drift off the model.)
    const slide = (d: number) => ((size.height - visH) / 2 / size.height) * d * tan2full
    if (mode === 'mobile') {
      // the phone fills the visible height (Ana, 2026-10-22: "deixe o celular maior para visualizar o protótipo"; was 0.86)
      const d = fitDist(0.21, 0.5, 0.95), dy = slide(d)
      pos = [phone[0], phone[1] + 0.02 - dy, phone[2] + d]; at = [phone[0], phone[1] - dy, phone[2]]
    }
    else if (mode === 'web') {
      // along the lid's normal (tilt −0.359 → n = (0, .351, .936), up = (0, .936, −.351)), the screen centre in the middle of the frame
      const sx = lap[0], sy = lap[1] + 0.023, sz = lap[2] - 0.353
      const d = fitDist(0.86, 0.54, 0.9), dy = slide(d)
      pos = [sx, sy + 0.351 * d - 0.936 * dy, sz + 0.936 * d + 0.351 * dy]; at = [sx, sy - 0.936 * dy, sz + 0.351 * dy]
    }
    else {
      // aim at the middle of the scene; the view offset below centres it in the space under the title
      // pull back for squarer viewports AND for the height the title takes (the scene lives in what is left)
      const free = Math.max(0.35, (size.height - headPx) / size.height)
      const fit = narrow ? 1 : Math.max(1, 1.45 / (size.width / size.height), 0.8 / free)
      // looking down at the pond from the front, the devices on their pads in the middle of the frame
      // close in on the devices: they are the subject, the pond is the setting
      if (narrow) {
        // phones: the canvas is taller than the screen (125svh), so fit the pond into what is actually visible under the
        // title — short or small phones pull back further (Ana, 2026-10-23: "em telas menores o celular não dá para ver,
        // tem que caber inteiro"). 0.72 = the share of the canvas the pond needs at the reference framing.
        const freeN = Math.max(0.25, (visH - headPx) / size.height)
        const k = Math.max(1, 0.72 / freeN)
        pos = [0, 0.3 + 3.6 * k, 0.05 + 4.25 * k]; at = [0, 0.3, 0.05] // more from above, so the two pads do not overlap
      } else {
        pos = [0, 1.25 * fit, 2.7 * fit]; at = [0, 0.3, 0.05]
      }
    }
    target.set(pos[0], pos[1], pos[2])
    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x, 3.2, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y, 3.2, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 3.2, dt)
    look.x = THREE.MathUtils.damp(look.x, at[0], 3.2, dt); look.y = THREE.MathUtils.damp(look.y, at[1], 3.2, dt); look.z = THREE.MathUtils.damp(look.z, at[2], 3.2, dt)
    camera.lookAt(look)
    // The canvas is the whole page, but the title block covers its top. Shift the image down by half the
    // header's height (measured, so it holds for every screen height) — the scene is then centred in the
    // free space under the title. None inside a device (Html transform does not follow view offsets).
    // narrow: centre the pond in the visible part under the title, not in the taller canvas
    const want = mode ? 0 : narrow ? (headPx + visH) / 2 - size.height / 2 : headPx * 0.5
    shift.current = THREE.MathUtils.damp(shift.current, want, 3.2, dt)
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

/** everything that needs the pad model (positions measured on its geometry) — lives inside the Canvas' Suspense */
function Stage({ mode, setMode, protos, narrow, flat }: { mode: Mode; setMode: (m: Mode) => void; protos: { mobile: Proto[]; web: Proto[] }; narrow: boolean; flat: boolean }) {
  const { t } = useI18n()
  // each device rests on a lily pad of the pond (DeviceScenery.LAYOUT); its centre is half its height above the
  // pad's measured surface under its footprint (half-diagonal) — never an estimate, the leaf poked through the MacBook
  const Lo = narrow ? LAYOUT.narrow : LAYOUT.desktop
  const phoneBase = usePadSurfaceY(Lo.phone.pad, 0.09)
  const lapBase = usePadSurfaceY(Lo.lap.pad, 0.61)
  const phonePos: [number, number, number] = [Lo.phone.x, phoneBase + 0.23, Lo.phone.z]
  const lapPos: [number, number, number] = [Lo.lap.x, lapBase + 0.27, Lo.lap.z]
  return (
    <>
      <Scenery narrow={narrow} />
      <group position={phonePos}>
        <PhoneDevice active={mode === 'mobile'} dim={mode === 'web'} onPick={() => setMode('mobile')} label={t('pj_mobile')} sub={`01 · ${protos.mobile.length} ${t(protos.mobile.length === 1 ? 'pj_list_one' : 'pj_list')}`} items={protos.mobile} flat={flat} />
        {/* paper tag just above the phone's top edge (0.2275), a little forward so the high narrow camera sees it off the glass */}
        {mode === null && (
          <Html position={[0, 0.265, 0.06]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
            <button type="button" className="dv-tag" style={{ pointerEvents: 'auto' }} onClick={() => setMode('mobile')}><small>01</small>{t('pj_mobile')}<i>→</i></button>
          </Html>
        )}
      </group>
      <group position={lapPos}>
        <Laptop active={mode === 'web'} dim={mode === 'mobile'} onPick={() => setMode('web')} label={t('pj_web')} sub={`02 · ${protos.web.length} ${t(protos.web.length === 1 ? 'pj_list_one' : 'pj_list')}`} items={protos.web} narrow={narrow} flat={flat} />
        {/* paper tag clipped to the lid's top edge (centre 0.023,−0.353 + half-lid 0.3 along the tilt → 0.304,−0.458): never over the screen */}
        {mode === null && (
          <Html position={[0, 0.335, -0.455]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
            <button type="button" className="dv-tag" style={{ pointerEvents: 'auto' }} onClick={() => setMode('web')}><small>02</small>{t('pj_web')}<i>→</i></button>
          </Html>
        )}
      </group>
      <Rig mode={mode} narrow={narrow} phoneY={phonePos[1]} lapY={lapPos[1]} />
    </>
  )
}

export default function Devices({ mode, setMode, protos, flat }: { mode: Mode; setMode: (m: Mode) => void; protos: { mobile: Proto[]; web: Proto[] }; flat: boolean }) {
  const [dpr] = useAdaptiveDpr(1.5)
  const fontReady = useDisplayFont()
  const glr = useGLRecovery()
  const [narrow, setNarrow] = useState(() => window.innerWidth < 760)
  useEffect(() => { const f = () => setNarrow(window.innerWidth < 760); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  return (
    <div className={`dv-stage ${mode ? 'in-device' : ''}`}>
      {/* a click on the empty pond leaves the device — but only a click ON the canvas: the paper tags are DOM over it, and
          r3f's missed-click came right after the tag had opened the phone and closed it again (Ana: "a etiqueta deve abrir") */}
      <Canvas key={glr.key} onCreated={glr.onCreated} camera={{ position: [0, 0.08, 2.3], fov: 34 }} dpr={dpr} gl={{ antialias: true, alpha: false, toneMapping: THREE.NoToneMapping }} onPointerMissed={(e) => { if (mode && (e.target as Element | null)?.tagName === 'CANVAS') setMode(null) }}>
        <color attach="background" args={['#0c0d12']} />{/* exactly the page's --bg; no tone mapping on this canvas so the clear colour comes out as the page colour, edge-free */}
        {/* moonlit pond: cool sky dome, a warm low moon from the back-right, a soft pink fill from the front */}
        <hemisphereLight color="#cfe0ff" groundColor="#3a2e4a" intensity={1.3} />
        <directionalLight position={[2, 3.5, -3]} color="#ffe6cc" intensity={2.2} />
        <directionalLight position={[-2, 2, 4]} color="#f2a0b4" intensity={0.9} />
        <Suspense fallback={null} key={fontReady ? 'font' : 'nofont'}>{/* remount once the display font is in so the wallpapers repaint with it */}
          <SceneReady />{/* holds the page curtain until this scene has drawn */}
          <Stage mode={mode} setMode={setMode} protos={protos} narrow={narrow} flat={flat} />
        </Suspense>
        {/* a little bloom: the moon, the glass hearts and the screens' highlights glow softly */}
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.45} luminanceThreshold={0.82} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
