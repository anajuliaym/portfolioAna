import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { REVEAL_MS } from './Transition'

/**
 * Ana's ID badge — the layered artwork she designed (clear holder, crumpled cream card, photo,
 * stickers, name, signature, a charm chain), rebuilt in HTML so every layer can move on its own.
 * It drops from the top of the page on its lanyard when /sobre opens, swings on the clip like a
 * two-link pendulum (lanyard + badge), the charms lag behind, it tilts in 3D towards the pointer
 * with a light sheen sliding over the plastic, and it can be grabbed and swung.
 *
 * Coordinates are in "sheet units": the 460×472 box of Ana's composite (holder at 143,16,
 * 216×432). The whole sheet is scaled with `--bs` in CSS.
 */

const IMG = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/badge/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>)
    .map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
)

type Layer = { id: string; x: number; y: number; w: number; z?: number; rot?: number; blend?: 'multiply' | 'screen'; opacity?: number; cls?: string }
/** layers inside the badge, back to front (photo → stickers → texts → plastic) */
const LAYERS: Layer[] = [
  { id: 'photo', x: 210, y: 172, w: 95, z: 8, rot: -1.5, cls: 'badge-photo' },
  { id: 'lily-small', x: 212, y: 162, w: 28, z: 11 },
  { id: 'ball', x: 190, y: 178, w: 20, z: 11 },
  { id: 'lily-big', x: 280, y: 277, w: 42, z: 11 },
  { id: 'heart', x: 257, y: 202, w: 8, z: 11 },
  { id: 'heart', x: 220, y: 235, w: 8, z: 11 },
  { id: 'star-a', x: 307, y: 170, w: 12, z: 11 },
  { id: 'star-b', x: 240, y: 197, w: 7, z: 11 },
  { id: 'star-c', x: 272, y: 265, w: 14, z: 11 },
  { id: 'spark-a', x: 300, y: 255, w: 6, z: 11 },
  { id: 'spark-b', x: 238, y: 212, w: 4, z: 11 },
  { id: 'name', x: 192, y: 325, w: 140, z: 9 },
  { id: 'role', x: 212, y: 341, w: 90, z: 9 },
  { id: 'signature', x: 215, y: 367, w: 80, z: 9 },
  { id: 'plastic', x: 158, y: 104, w: 194, z: 15, blend: 'screen', opacity: 0.85 },
]
const CARD = { x: 177, y: 118, w: 168, h: 305 } // reaches up into the pocket, hiding the sample card printed inside the holder photo
const HOLDER = { x: 143, y: 16, w: 216 }
const CLIP = { x: 268, y: 60 } // the badge hinges here
const CHARMS = { x: 45, y: 90, w: 205, ox: 195, oy: 5 } // hang from the ring at (240, 95)
const STRAP = { x: 252, w: 30 }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export default function Badge() {
  const reduced = useReducedMotion()
  const rig = useRef<HTMLDivElement>(null)
  const slot = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  // sheet scale: fit the 460-unit sheet in the column (capped so it never grows past the artwork's size)
  useEffect(() => {
    const el = slot.current
    if (!el) return
    const fit = () => { const max = window.innerWidth <= 1000 ? 0.78 : 1.15; el.style.setProperty('--bs', String(clamp(el.clientWidth / 460, 0.5, max))) }
    fit()
    const ro = new ResizeObserver(fit); ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 1) the drop: the whole rig falls in from above the viewport and bounces on the lanyard
  const dropY = useSpring(reduced ? 0 : -1400, { stiffness: 64, damping: 12, mass: 1.15 })
  // 2) the swing on the clip: a loose spring around 0 keeps oscillating for a while
  const swing = useMotionValue(reduced ? 0 : 26)
  const swingS = useSpring(swing, { stiffness: 34, damping: 4.2, mass: 1 })
  // the lanyard pivots far above, so it follows the swing only a little and more slowly
  const lanyardS = useSpring(swing, { stiffness: 16, damping: 4, mass: 1.4 })
  // the charms hang from the clip too, lagging behind the badge
  const charmS = useSpring(swingS, { stiffness: 46, damping: 4.6, mass: 0.9 })
  // idle breathing sway
  const idle = useMotionValue(0)
  useAnimationFrame((t) => { if (!reduced) idle.set(Math.sin(t / 1000 * 0.85) * 1.1 + Math.sin(t / 1000 * 0.31) * 0.6) })

  useEffect(() => {
    if (reduced) { setReady(true); return }
    const t0 = window.setTimeout(() => { setReady(true); dropY.set(0) }, REVEAL_MS * 0.35 + 250)
    const t1 = window.setTimeout(() => swing.set(0), REVEAL_MS * 0.35 + 650) // let go once it is falling
    return () => { clearTimeout(t0); clearTimeout(t1) }
  }, [reduced, dropY, swing])

  const lanyardRot = useTransform([lanyardS, idle], ([a, b]: number[]) => a * 0.16 + b)
  const badgeRot = useTransform([swingS, idle], ([a, b]: number[]) => a + b * 0.5)
  const charmRot = useTransform([swingS, charmS, idle], ([a, b, c]: number[]) => (b - a) * 1.5 + c * 0.9)

  // 3) 3D tilt + sheen following the pointer
  const px = useMotionValue(0.5), py = useMotionValue(0.4)
  const tiltX = useSpring(useTransform(py, (v) => -(v - 0.5) * 18), { stiffness: 110, damping: 14 })
  const tiltY = useSpring(useTransform(px, (v) => (v - 0.5) * 26), { stiffness: 110, damping: 14 })
  const sheenX = useTransform(px, (v) => `${v * 100}%`), sheenY = useTransform(py, (v) => `${v * 100}%`)
  const sheen = useMotionTemplate`radial-gradient(circle at ${sheenX} ${sheenY}, rgba(255,255,255,.42) 0%, rgba(255,255,255,.12) 22%, rgba(255,255,255,0) 48%)`

  // 4) grab and swing
  const drag = useRef<{ x0: number; a0: number } | null>(null)
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x0: e.clientX, a0: swingS.get() }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const r = rig.current?.getBoundingClientRect()
    if (r) { px.set(clamp((e.clientX - r.left) / r.width, 0, 1)); py.set(clamp((e.clientY - r.top) / r.height, 0, 1)) }
    if (drag.current) {
      const a = clamp(drag.current.a0 + (e.clientX - drag.current.x0) * 0.28, -48, 48)
      swing.set(a); swingS.jump(a)
    }
  }
  const onUp = () => { if (drag.current) { drag.current = null; swing.set(0) } }
  const onLeave = () => { px.set(0.5); py.set(0.4); onUp() }

  return (
    <div ref={slot} className={`badge-slot ${ready ? 'ready' : ''}`}>
      <motion.div
        ref={rig} className="badge-rig" style={{ y: dropY, rotate: lanyardRot, transformOrigin: `${CLIP.x}px -700px` }}
        onPointerMove={onMove} onPointerLeave={onLeave} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <div className="badge-scale">
          <div className="badge-strap" style={{ left: STRAP.x, width: STRAP.w }} />
          <motion.div
            className="badge-body" style={{ rotate: badgeRot, rotateX: tiltX, rotateY: tiltY, transformOrigin: `${CLIP.x}px ${CLIP.y}px` }}
            onPointerDown={onDown}
          >
            <img className="badge-holder" src={IMG.holder} alt="" draggable={false} style={{ left: HOLDER.x, top: HOLDER.y, width: HOLDER.w }} />
            <div className="badge-card" style={{ left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, transform: 'translateZ(4px)' }}>
              <img src={IMG.paper} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'multiply', opacity: 0.5 }} />
            </div>
            {LAYERS.map((l, i) => (
              <img
                key={`${l.id}-${i}`} className={`badge-layer ${l.cls ?? ''}`} src={IMG[l.id]} alt="" draggable={false}
                style={{ left: l.x, top: l.y, width: l.w, transform: `translateZ(${l.z ?? 0}px) rotate(${l.rot ?? 0}deg)`, mixBlendMode: l.blend, opacity: l.opacity }}
              />
            ))}
            <motion.div className="badge-sheen" style={{ left: HOLDER.x + 6, top: HOLDER.y + 70, width: HOLDER.w - 12, height: 360, background: sheen, transform: 'translateZ(16px)' }} />
            <motion.img
              className="badge-charms" src={IMG.charms} alt="" draggable={false}
              style={{ left: CHARMS.x, top: CHARMS.y, width: CHARMS.w, rotate: charmRot, transformOrigin: `${CHARMS.ox}px ${CHARMS.oy}px`, translateZ: 26 }}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
