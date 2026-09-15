import { useEffect, useMemo, useState } from 'react'
import { ThreeEvent, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useI18n } from '../i18n'
import type { SelectFn } from './DeskScene'

/**
 * The monitor screen, drawn into a canvas and mapped onto a plane sitting on the
 * monitor face — so the tower, plants and the painterly post-processing treat it
 * like any other object in the scene.
 *
 * Geometry (fitted from the mesh): the screen is a flat quad facing +z,
 * x -0.635..0.455, y -0.20..0.38 (centre [-0.09, 0.09], 1.09 × 0.58 units), surface at z ≈ -0.206.
 */
const W = 880
const H = 468
const S = 2 // texture pixels per layout pixel

const FONTS = ['italic 400 22px "Instrument Serif"', '400 13px "Inter"', '500 13px "Inter"']

type Strings = { logo: string; tabs: [string, string, string]; meta: string; kicker: string; title: string; cards: [string, string, string] }
type Palette = { bg: string; ink: string; muted: string; accent: string }

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draws text with CSS-like letter spacing (em) and returns its width; pass draw=false to measure. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, em: number, draw = true) {
  const gap = size * em
  let w = 0
  for (const ch of text) {
    if (draw) ctx.fillText(ch, x + w, y)
    w += ctx.measureText(ch).width + gap
  }
  return w - gap
}

function gradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, deg: number, stops: [number, string][]) {
  const a = (deg * Math.PI) / 180
  const dx = Math.sin(a), dy = -Math.cos(a)
  const len = Math.abs(w * dx) + Math.abs(h * dy)
  const cx = x + w / 2, cy = y + h / 2
  const g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2)
  for (const [o, c] of stops) g.addColorStop(o, c)
  return g
}

function draw(canvas: HTMLCanvasElement, s: Strings, p: Palette, active: number, hover: boolean) {
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(S, 0, 0, S, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  roundRect(ctx, 0, 0, W, H, 6)
  ctx.clip()
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'

  // top bar
  ctx.fillStyle = 'rgba(243, 238, 228, .08)'
  ctx.fillRect(0, 62, W, 1)
  ctx.font = 'italic 400 22px "Instrument Serif", Georgia, serif'
  ctx.fillStyle = p.ink
  ctx.fillText(s.logo, 30, 39)
  const tabs = s.tabs.map((txt, i) => ({ txt: txt.toUpperCase(), bold: i === 0 }))
  const tabW = tabs.map((tb) => {
    ctx.font = `${tb.bold ? 500 : 400} 13px "Inter", system-ui, sans-serif`
    return spaced(ctx, tb.txt, 0, 0, 13, 0.12, false)
  })
  let tx = W / 2 - (tabW.reduce((a, b) => a + b, 0) + 26 * (tabs.length - 1)) / 2
  tabs.forEach((tb, i) => {
    ctx.font = `${tb.bold ? 500 : 400} 13px "Inter", system-ui, sans-serif`
    ctx.fillStyle = tb.bold ? p.ink : p.muted
    spaced(ctx, tb.txt, tx, 36, 13, 0.12)
    tx += tabW[i] + 26
  })
  ctx.font = '400 11px "Inter", system-ui, sans-serif'
  ctx.fillStyle = p.muted
  const meta = s.meta.toUpperCase()
  spaced(ctx, meta, W - 30 - spaced(ctx, meta, 0, 0, 11, 0.12, false), 35, 11, 0.12)

  // heading
  ctx.font = '400 11px "Inter", system-ui, sans-serif'
  ctx.fillStyle = p.accent
  const kw = spaced(ctx, s.kicker.toUpperCase(), 30, 124, 11, 0.18)
  ctx.font = 'italic 400 44px "Instrument Serif", Georgia, serif'
  ctx.fillStyle = p.ink
  ctx.fillText(s.title, 30 + kw + 18, 124)

  // cards
  const top = 151
  const colW = (W - 60 - 32) / 3
  const thumbH = H - top - 10 - 17
  const thumbs: [string, string][] = [['#2a2340', '#5f7cff'], ['#1e2c24', p.accent], ['#2a3052', p.ink]]
  for (let i = 0; i < 3; i++) {
    const x = 30 + i * (colW + 16)
    const y = top + (active === i ? -6 : 0)
    ctx.globalAlpha = active === i ? 1 : 0.85
    ctx.fillStyle = gradient(ctx, x, y, colW, thumbH, 135, [[0, thumbs[i][0]], [1, thumbs[i][1]]])
    roundRect(ctx, x, y, colW, thumbH, 4)
    ctx.fill()
    ctx.globalAlpha = 1
    const cy = y + thumbH + 10 + 13
    ctx.font = '400 11px "Inter", system-ui, sans-serif'
    ctx.fillStyle = p.muted
    const nw = spaced(ctx, `0${i + 1}`, x, cy, 11, 0.16)
    ctx.font = '400 14px "Inter", system-ui, sans-serif'
    ctx.fillStyle = p.ink
    ctx.fillText(s.cards[i], x + nw + 10, cy)
  }

  // cursor
  ctx.strokeStyle = p.ink
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc((W * (22 + active * 26)) / 100 + 7, H * 0.76 - 7, 6, 0, Math.PI * 2)
  ctx.stroke()

  // glare + inset border
  ctx.fillStyle = gradient(ctx, 0, 0, W, H, 115, [[0, 'rgba(255,255,255,.07)'], [0.35, 'rgba(255,255,255,0)'], [0.7, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.03)']])
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
  ctx.lineWidth = 1
  if (hover) {
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = p.accent
  } else {
    ctx.strokeStyle = 'rgba(243, 238, 228, .06)'
  }
  roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 6)
  ctx.stroke()
  ctx.globalAlpha = 1
}

export default function ScreenPreview({ onSelect }: { onSelect: SelectFn }) {
  const { t, lang } = useI18n()
  const gl = useThree((s) => s.gl)
  const [tick, setTick] = useState(0)
  const [hover, setHover] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 2600)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let on = true
    Promise.all(FONTS.map((f) => document.fonts.load(f))).catch(() => {}).finally(() => on && setFontsReady(true))
    return () => { on = false }
  }, [])

  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = W * S
    canvas.height = H * S
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = gl.capabilities.getMaxAnisotropy()
    return { canvas, texture }
  }, [gl])
  useEffect(() => () => texture.dispose(), [texture])

  useEffect(() => {
    const strings: Strings = {
      logo: 'Ana Julia',
      tabs: [t('scr_tab1'), t('scr_tab2'), t('scr_tab3')],
      meta: t('scr_meta'),
      kicker: t('scr_kicker'),
      title: t('scr_title'),
      cards: [t('scr_card1'), t('scr_card2'), t('scr_card3')],
    }
    const palette: Palette = { bg: '#101118', ink: cssVar('--ink'), muted: cssVar('--muted'), accent: cssVar('--accent') }
    draw(canvas, strings, palette, tick % 3, hover)
    texture.needsUpdate = true
  }, [canvas, texture, t, lang, tick, hover, fontsReady])

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => { document.body.style.cursor = '' }
  }, [hover])

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect('projects', { x: e.clientX, y: e.clientY })
  }

  return (
    <mesh position={[-0.09, 0.09, -0.199]} onClick={click} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <planeGeometry args={[1.09, 0.58]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent />
    </mesh>
  )
}
