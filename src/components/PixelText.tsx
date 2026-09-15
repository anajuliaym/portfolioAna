import { useEffect, useRef } from 'react'

/**
 * Renders text at a tiny size on a canvas, thresholds the antialiasing away and
 * scales it up with `image-rendering: pixelated` — a pixelated version of any
 * font, like the "PARADISE" poster. Text stays accessible via aria-label.
 */
export default function PixelText({
  text,
  fontFamily = '"Instrument Serif"',
  fontStyle = 'normal',
  baseSize = 26,
  color = '#f3eee4',
  minScale = 2,
  maxScale = 3.2,
  className,
}: {
  text: string
  fontFamily?: string
  fontStyle?: string
  baseSize?: number
  color?: string
  minScale?: number
  maxScale?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let alive = true
    const font = `${fontStyle} 400 ${baseSize}px ${fontFamily}`

    const draw = () => {
      const c = ref.current
      if (!c) return
      const ctx = c.getContext('2d')!
      ctx.font = font
      const m = ctx.measureText(text)
      const w = Math.ceil(m.width) + 4
      const h = Math.ceil(baseSize * 1.3)
      c.width = w
      c.height = h
      ctx.font = font
      ctx.fillStyle = color
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(text, 2, Math.round(baseSize * 0.98))
      // hard pixels: kill antialiasing
      const img = ctx.getImageData(0, 0, w, h)
      const d = img.data
      for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 90 ? 255 : 0
      ctx.putImageData(img, 0, 0)
      // scale with the viewport so the name fits on phones too
      const scale = Math.max(minScale, Math.min(maxScale, window.innerWidth / (w * 1.15)))
      c.style.width = `${w * scale}px`
      c.style.height = `${h * scale}px`
    }

    const ready = (document as any).fonts?.load ? (document as any).fonts.load(font) : Promise.resolve()
    ready.then(() => alive && draw()).catch(() => alive && draw())
    window.addEventListener('resize', draw)
    return () => {
      alive = false
      window.removeEventListener('resize', draw)
    }
  }, [text, fontFamily, fontStyle, baseSize, color, minScale, maxScale])

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={text}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  )
}
