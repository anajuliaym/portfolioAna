import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { usePainterly } from './PainterlyMaterial'
import { useOutline } from './Outline'
import { usePhoneModel } from './Phone'
import { useI18n } from '../i18n'
import type { Proto } from '../pages/content'

/**
 * The Projects page: two painted devices float in the dark — Ana's phone (mobile prototypes) and a
 * notebook (web prototypes), each with a paper tag and a wallpaper on its screen. Clicking one flies the
 * camera to the device; the page then lays a device-shaped panel (DeviceDock) over it where the
 * prototypes are listed and opened — a Figma embed or screenshots — so you browse as if holding it.
 */
export type Mode = null | 'mobile' | 'web'
const PAINT = { keyDir: [1.4, 1.5, 1.2] as [number, number, number], bands: 3, paint: 0.1, patch: 0.1, patchScale: 22, spec: 0.2, rimStrength: 0.45, keyColor: '#f6e2c6' }
const PHONE_PX = { w: 390, h: 780 } // wallpaper texture size (phone screen proportions)
const LAPTOP_PX = { w: 1200, h: 740 }
const LAP = { w: 0.62, d: 0.42, t: 0.02, lidH: 0.40, lidT: 0.014, open: 1.85 } // laptop dims (world) and lid angle from closed

/** idle wallpaper drawn on the 3D screen: the category name, big, on the site's dark gradient */
function wallpaper(label: string, sub: string, w: number, h: number, big: number) {
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
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4
  return tex
}

/* ------------------------------------------------------------------ devices */

function PhoneDevice({ active, dim, onPick, label, sub }: { active: boolean; dim: boolean; onPick: () => void; label: string; sub: string }) {
  const { holder, face, offset } = usePhoneModel()
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { const el = g.current; if (!el) return; el.position.y = THREE.MathUtils.damp(el.position.y, active ? 0 : Math.sin(performance.now() * 0.0009) * 0.012, 4, dt) })
  // the model lies flat (face +y); +90° about X turns +y into +z, so the face looks at the camera
  const H = face.size.z, W = face.size.x
  const tex = useMemo(() => wallpaper(label, sub, PHONE_PX.w, PHONE_PX.h, 44), [label, sub])
  return (
    <group ref={g}>
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, H / 2 + 0.02, 0]}>
        <group position={offset}>
          <primitive object={holder} />
          <mesh position={[face.center.x, face.center.y + 0.0006, face.center.z]} rotation={[-Math.PI / 2, 0, 0]} onClick={(e) => { e.stopPropagation(); onPick() }} onPointerOver={() => { if (!active) document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
            <planeGeometry args={[W * 0.97, H * 0.97]} />
            <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={dim ? 0.35 : 1} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function Laptop({ active, dim, onPick, label, sub }: { active: boolean; dim: boolean; onPick: () => void; label: string; sub: string }) {
  const body = useMemo(() => {
    const g = new THREE.Group()
    const mk = (geo: THREE.BufferGeometry, color: string) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color })); m.userData.color = color; return m }
    const base = mk(new THREE.BoxGeometry(LAP.w, LAP.t, LAP.d), '#e9e2d3'); base.position.set(0, LAP.t / 2, 0); g.add(base)
    const keys = mk(new THREE.BoxGeometry(LAP.w * 0.78, 0.004, LAP.d * 0.42), '#3a3540'); keys.position.set(0, LAP.t + 0.002, -0.03); g.add(keys)
    const pad = mk(new THREE.BoxGeometry(LAP.w * 0.26, 0.003, LAP.d * 0.26), '#d9d1c1'); pad.position.set(0, LAP.t + 0.002, LAP.d * 0.28); g.add(pad)
    // lid, hinged at the back edge
    const lid = new THREE.Group(); lid.position.set(0, LAP.t, -LAP.d / 2); lid.rotation.x = -(Math.PI - LAP.open) // 0 = lying flat forward; open ≈ 106°
    const shell = mk(new THREE.BoxGeometry(LAP.w, LAP.lidH, LAP.lidT), '#e9e2d3'); shell.position.set(0, LAP.lidH / 2, 0); lid.add(shell)
    lid.name = 'lid'; g.add(lid)
    return g
  }, [])
  usePainterly(body, PAINT)
  useOutline(body, 0.0024, '#120d12')
  useEffect(() => { body.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || m.userData.isHull) return; const sm = m.material as THREE.ShaderMaterial; if (sm.uniforms?.baseColor && m.userData.color) sm.uniforms.baseColor.value.set(m.userData.color) }) })
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => { const el = g.current; if (!el) return; el.position.y = THREE.MathUtils.damp(el.position.y, active ? 0 : Math.sin(performance.now() * 0.0007 + 1.3) * 0.01, 4, dt) })
  const sw = LAP.w * 0.94, sh = LAP.lidH * 0.9
  const lidRot = -(Math.PI - LAP.open)
  const tex = useMemo(() => wallpaper(label, sub, LAPTOP_PX.w, LAPTOP_PX.h, 96), [label, sub])
  return (
    <group ref={g}>
      <group position={[0, -0.18, 0.05]}>
        <primitive object={body} />
        {/* the screen sits on the lid's inner face; same transform chain as the lid */}
        <group position={[0, LAP.t, -LAP.d / 2]} rotation={[lidRot, 0, 0]}>
          <group position={[0, LAP.lidH / 2 + 0.01, LAP.lidT / 2 + 0.0006]}>
            <mesh onClick={(e) => { e.stopPropagation(); onPick() }} onPointerOver={() => { if (!active) document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
              <planeGeometry args={[sw, sh]} />
              <meshBasicMaterial map={tex} toneMapped={false} transparent opacity={dim ? 0.35 : 1} />
            </mesh>
          </group>
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
