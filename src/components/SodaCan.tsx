import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, View, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * The vending machine's cans (Ana, 2026-10-26): "Cel Shaded Soda Cans" by bicho.salem (Sketchfab, CC BY 4.0), one per
 * game, with a label made from the game's title screen. The model's cel look is painted into its texture and shown
 * unlit, so the cans keep exactly that: a `MeshBasicMaterial` with the atlas, the label band repainted per game.
 *
 * Atlas (1024², glTF uv, origin top-left): the label wraps the whole can between rows 296 and 678 — row 300 is the
 * bottom of the can, row 676 the top (the image is upside down on the can), u runs around once, and u 0.5 faces −z.
 * Everything outside the band (lid, rim, base) stays as the model has it.
 */

const CAN_URL = '/models/can.glb'
const BAND = { top: 296, bottom: 678 } // atlas rows covered by the label
const INK = '#2a2026'
const CREAM = '#f7f0e4'

function mix(a: string, b: string, t: number) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()
}

/** The label, drawn upright (W × H, left = back seam, centre = the side facing the viewer). */
function drawLabel(img: HTMLImageElement | null, tint: string, code: string, title: string) {
  const W = 1024, H = BAND.bottom - BAND.top
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  // the model's cel bands: flat tones, darkest at the top of the can
  const bands: [number, number][] = [[0, 0.62], [0.2, 0.42], [0.42, 0.2], [0.66, 0]]
  bands.forEach(([y, k], i) => { g.fillStyle = mix(tint, INK, k); g.fillRect(0, y * H, W, ((bands[i + 1]?.[0] ?? 1) - y) * H) })
  // thin cream rules under the lid, broken like the originals'
  g.fillStyle = CREAM
  for (let row = 0; row < 3; row++) for (let x = (row * 37) % 90; x < W; x += 70 + ((x * 7 + row * 13) % 60)) g.fillRect(x, 10 + row * 9, 40 + ((x + row * 31) % 50), 4)
  // bubbles on the back
  g.strokeStyle = CREAM; g.lineWidth = 4
  const bubbles = [[70, 120, 22], [150, 220, 34], [200, 110, 14], [90, 300, 16], [860, 140, 26], [940, 250, 18], [820, 290, 12], [980, 95, 12]]
  for (const [x, y, r] of bubbles) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke() }
  // the code, big, on both sides of the back seam
  g.font = '800 92px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineWidth = 6; g.lineJoin = 'round'; g.strokeStyle = INK; g.fillStyle = CREAM
  for (const x of [232, 792]) { g.strokeText(code, x, 190); g.fillText(code, x, 190) }
  // the game's title screen as a sticker on the front: cream border, hard cel shadow
  const ih = 226, iw = Math.round(ih * 16 / 9), ix = (W - iw) / 2, iy = 56
  const round = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r) }
  g.fillStyle = mix(tint, INK, 0.8); round(ix - 10 + 9, iy - 10 + 9, iw + 20, ih + 20, 20); g.fill()
  g.fillStyle = CREAM; round(ix - 10, iy - 10, iw + 20, ih + 20, 20); g.fill()
  g.save(); round(ix, iy, iw, ih, 12); g.clip()
  if (img) {
    const s = Math.max(iw / img.width, ih / img.height)
    g.drawImage(img, ix + (iw - img.width * s) / 2, iy + (ih - img.height * s) / 2, img.width * s, img.height * s)
  } else { g.fillStyle = mix(tint, INK, 0.3); g.fillRect(ix, iy, iw, ih) }
  g.restore()
  // the cream strip along the bottom with the game's name
  g.fillStyle = CREAM; g.fillRect(0, 306, W, 46)
  g.fillStyle = INK; g.font = 'italic 36px Butler, "Instrument Serif", Georgia, serif'
  g.fillText(title, W / 2, 331)
  g.font = '700 18px Inter, system-ui, sans-serif'
  for (const x of [150, 874]) g.fillText(`${code} · ANA JULIA`, x, 330)
  return c
}

function useCanTexture(base: THREE.Texture | null, titleUrl: string | undefined, tint: string, code: string, title: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!titleUrl) return
    const im = new Image(); im.src = titleUrl
    im.onload = () => setImg(im)
    return () => { im.onload = null }
  }, [titleUrl])
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => { document.fonts?.ready.then(() => setFontsReady(true)) }, [])
  const tex = useMemo(() => {
    const src = base?.image as CanvasImageSource & { width: number; height: number } | undefined
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024
    const g = c.getContext('2d')!
    if (src) g.drawImage(src, 0, 0, 1024, 1024)
    // the shoulder above the label (the model paints it in its own colour): the label's darkest band
    g.fillStyle = mix(tint, INK, 0.62); g.fillRect(0, BAND.bottom - 2, 1024, 738 - BAND.bottom)
    // the label goes on upside down: atlas row BAND.bottom is the top of the can
    g.save(); g.translate(0, BAND.bottom); g.scale(1, -1)
    g.drawImage(drawLabel(img, tint, code, title), 0, 0)
    g.restore()
    const t = new THREE.CanvasTexture(c)
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
    return t
    // fontsReady: redraw once the serif has loaded
  }, [base, img, tint, code, title, fontsReady]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

function Can({ titleUrl, tint, code, title, hot }: { titleUrl?: string; tint: string; code: string; title: string; hot: boolean }) {
  const { scene } = useGLTF(CAN_URL)
  const mesh = useMemo(() => {
    let m: THREE.Mesh | undefined
    scene.traverse((o) => { if (!m && (o as THREE.Mesh).isMesh) m = o as THREE.Mesh })
    return m!
  }, [scene])
  const base = (mesh.material as THREE.MeshStandardMaterial).map
  const map = useCanTexture(base, titleUrl, tint, code, title)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map, toneMapped: false }), [map])
  useEffect(() => () => mat.dispose(), [mat])
  const ref = useRef<THREE.Group>(null)
  const sway = useRef(0)
  useFrame(({ clock }, dt) => {
    const g = ref.current
    if (!g) return
    // idle: a slow sway that shows the label; hovered: it turns all the way round
    sway.current = hot ? sway.current + dt * 2.4 : THREE.MathUtils.damp(sway.current, Math.sin(clock.elapsedTime * 0.7 + code.charCodeAt(1)) * 0.5, 2, dt)
    g.rotation.y = Math.PI + sway.current
    g.position.y = THREE.MathUtils.damp(g.position.y, hot ? 0.08 : 0, 6, dt)
  })
  return (
    <group ref={ref}>
      <mesh geometry={mesh.geometry} material={mat} position={[0, -0.934, 0]} />
    </group>
  )
}

/** One can, drawn into the shared canvas where this element sits in the page. */
export function CanView({ className, ...can }: { className?: string; titleUrl?: string; tint: string; code: string; title: string; hot: boolean }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 0.04, 3.9]} fov={30} />
      <Can {...can} />
    </View>
  )
}

/** The canvas the `CanView`s draw into: transparent, over the page, ignores the pointer. Mount it while the cans show. */
export function CanCanvas() {
  return createPortal(
    <Canvas className="can-canvas" dpr={[1, 2]} gl={{ alpha: true, antialias: true }} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 7 }}>
      <View.Port />
    </Canvas>,
    document.body,
  )
}

useGLTF.preload(CAN_URL)
