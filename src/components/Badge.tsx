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
 * The whole sheet is scaled with `--bs` (set in JS from the column width).
 */

const IMG = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/badge/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>)
    .map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
)

/**
 * Sheet units = the holder image's own pixels (527×1055), shifted right by OX so the charm chain
 * (which hangs to the left of the holder) fits in the box. Sheet box: 766×1055.
 */
const OX = 239
const SHEET = { w: 766, h: 1055 }
const HOLDER = { x: OX, y: 0, w: 527 }
const CARD = { x: OX + 66, y: 344, w: 422, h: 662 } // the cream card printed inside the holder image
const PHOTO = { x: OX + 87, y: 400, w: 380 } // Ana's photo + stickers + name (one image)
const ROLE = { x: OX + 162, y: 836, w: 210 } // "Product Designer", centred under the name printed in the photo image
const SIGN = { x: OX + 177, y: 872, w: 180 } // Ana's signature
const PLASTIC = { x: OX + 37, y: 215, w: 473, opacity: 0.85 } // wrinkled-plastic highlights over the pocket
const CLIP = { x: OX + 296, y: 140 } // the badge hangs from the hook here; above it the cord, fold and hook top stay straight
const LANYARD = { x: OX + 230, y: 0, w: 140 } // lanyard.webp: strap + fold + hook top cut from the holder photo (holder.webp is blank above y=135)
const CHARMS = { x: OX - 123, y: 55, w: 420, ox: 358, oy: 7 } // the keychain's S-hook grips the left arm of the clip ring (holder x≈260, y≈100); it lives outside the badge body because the ring is static
const STRAP = { x: OX + 282, w: 48 } // strap.webp tiles the photo's own woven cord upward; its bottom row equals the lanyard's top row

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
    const fit = () => { const max = window.innerWidth <= 1000 ? 0.6 : 0.75; el.style.setProperty('--bs', String(clamp(el.clientWidth / SHEET.w, 0.4, max))) }
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
    // wait for every layer to be decoded (capped at 5 s) so the badge never drops in pieces — on a
    // cold load the charms arrived before the holder and fell alone
    const decoded = Promise.all(Object.values(IMG).map((src) => { const im = new Image(); im.src = src; return im.decode().catch(() => undefined) }))
    const capped = Promise.race([decoded, new Promise((r) => setTimeout(r, 5000))])
    const started = performance.now()
    let t0 = 0, t1 = 0, alive = true
    capped.then(() => {
      if (!alive) return
      const wait = Math.max(0, REVEAL_MS * 0.35 + 250 - (performance.now() - started))
      t0 = window.setTimeout(() => { setReady(true); dropY.set(0) }, wait)
      t1 = window.setTimeout(() => swing.set(0), wait + 400) // let go once it is falling
    })
    return () => { alive = false; clearTimeout(t0); clearTimeout(t1) }
  }, [reduced, dropY, swing])

  const lanyardRot = useTransform([lanyardS, idle], ([a, b]: number[]) => a * 0.16 + b)
  const badgeRot = useTransform([swingS, idle], ([a, b]: number[]) => a + b * 0.5)
  const charmRot = useTransform([charmS, idle], ([b, c]: number[]) => b * 0.9 + c * 0.9)

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
        ref={rig} className="badge-rig" style={{ y: dropY, rotate: lanyardRot, transformOrigin: `${CLIP.x}px -1700px` }}
        onPointerMove={onMove} onPointerLeave={onLeave} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <div className="badge-scale">
          <div className="badge-strap" style={{ left: STRAP.x, width: STRAP.w, backgroundImage: `url(${IMG.strap})` }} />
          <img className="badge-lanyard" src={IMG.lanyard} alt="" draggable={false} style={{ left: LANYARD.x, top: LANYARD.y, width: LANYARD.w }} />
          <motion.div
            className="badge-body" style={{ rotate: badgeRot, rotateX: tiltX, rotateY: tiltY, transformOrigin: `${CLIP.x}px ${CLIP.y}px` }}
            onPointerDown={onDown}
          >
            <img className="badge-holder" src={IMG.holder} alt="" draggable={false} style={{ left: HOLDER.x, top: HOLDER.y, width: HOLDER.w }} />
            <img className="badge-layer" src={IMG.paper} alt="" draggable={false} style={{ left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, mixBlendMode: 'multiply', opacity: 0.5, transform: 'translateZ(4px)' }} />
            <img className="badge-layer" src={IMG.photo} alt="" draggable={false} style={{ left: PHOTO.x, top: PHOTO.y, width: PHOTO.w, transform: 'translateZ(9px)' }} />
            <img className="badge-layer" src={IMG.role} alt="" draggable={false} style={{ left: ROLE.x, top: ROLE.y, width: ROLE.w, transform: 'translateZ(9px)' }} />
            <img className="badge-layer" src={IMG.signature} alt="" draggable={false} style={{ left: SIGN.x, top: SIGN.y, width: SIGN.w, transform: 'translateZ(9px)' }} />
            <img className="badge-layer" src={IMG.plastic} alt="" draggable={false} style={{ left: PLASTIC.x, top: PLASTIC.y, width: PLASTIC.w, mixBlendMode: 'screen', opacity: PLASTIC.opacity, transform: 'translateZ(15px)' }} />
            <motion.div className="badge-sheen" style={{ left: HOLDER.x + 12, top: 130, width: HOLDER.w - 24, height: 900, background: sheen, transform: 'translateZ(16px)' }} />
          </motion.div>
          <motion.img
            className="badge-charms" src={IMG.charms} alt="" draggable={false}
            style={{ left: CHARMS.x, top: CHARMS.y, width: CHARMS.w, rotate: charmRot, transformOrigin: `${CHARMS.ox}px ${CHARMS.oy}px`, translateZ: 26 }}
          />
        </div>
      </motion.div>
    </div>
  )
}
