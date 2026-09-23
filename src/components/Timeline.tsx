import { useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import type { Experience } from '../pages/content'
import heartUrl from '../assets/about/heart.webp'

/** Ana's postcard fronts (lace frames on tinted paper), by file name */
/** Ana's watercolour stickers (cut from her sheet; s18/s26/s30/s32 were merged clusters and were dropped) */
const STK = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/stickers/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>)
    .map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
)
type Stk = { id: string; x: string; y: string; w: number; r: number; d?: number }
/** stickers in the empty half of each row (opposite the card) and one riding a corner of each card */
const EMPTY: Stk[][] = [
  [{ id: 's07', x: '60%', y: '4%', w: 118, r: -8 }, { id: 's01', x: '78%', y: '44%', w: 128, r: 6 }, { id: 's12', x: '58%', y: '74%', w: 60, r: -14, d: 1 }],
  [{ id: 's13', x: '5%', y: '6%', w: 112, r: 7 }, { id: 's25', x: '30%', y: '52%', w: 78, r: -6, d: 1 }, { id: 's33', x: '10%', y: '72%', w: 68, r: 10 }],
  [{ id: 's15', x: '62%', y: '2%', w: 92, r: 9 }, { id: 's10', x: '80%', y: '38%', w: 124, r: -7, d: 1 }, { id: 's19', x: '58%', y: '78%', w: 54, r: 0 }],
  [{ id: 's31', x: '6%', y: '8%', w: 124, r: -6 }, { id: 's24', x: '28%', y: '54%', w: 104, r: 8, d: 1 }, { id: 's02', x: '8%', y: '76%', w: 82, r: 12 }],
]
const NEAR: Stk[] = [
  { id: 's23', x: '-22px', y: 'auto', w: 96, r: -12 }, // book on the IB card's bottom-left
  { id: 's34', x: 'auto', y: '-26px', w: 118, r: 8 }, // laptop over the CC card's top-right
  { id: 's14', x: 'auto', y: 'auto', w: 92, r: -9 }, // instax on the PCA card's bottom-right
  { id: 's04', x: '-26px', y: '-24px', w: 112, r: -14 }, // hibiscus on the Fragments card's top-left
]
const HEAD: Stk[] = [{ id: 's00', x: '70%', y: '0%', w: 128, r: -10 }, { id: 's29', x: '86%', y: '38%', w: 130, r: 8, d: 1 }, { id: 's08', x: '66%', y: '58%', w: 118, r: 12 }]

function Sticker({ s, near, side }: { s: Stk; near?: boolean; side?: 'l' | 'r' }) {
  const style: React.CSSProperties = { width: s.w, ['--r' as string]: `${s.r}deg`, ['--d' as string]: `${(s.d ?? 0) * -2.3}s` }
  if (near) {
    // corner placement: 'auto' means the opposite edge
    if (s.x === 'auto') style.right = -24; else style.left = s.x
    if (s.y === 'auto') style.bottom = -22; else style.top = s.y
  } else { style.left = s.x; style.top = s.y }
  return (
    <motion.img
      className={`pc-stk ${near ? 'near' : ''} ${side ?? ''}`} src={STK[s.id]} alt="" draggable={false} style={style}
      initial={{ opacity: 0, scale: 0.5, rotate: s.r - 20 }} whileInView={{ opacity: 1, scale: 1, rotate: s.r }}
      viewport={{ once: true, amount: 0.4 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.2 }}
      whileHover={{ scale: 1.1, rotate: s.r + 6 }} drag dragMomentum={false} whileDrag={{ scale: 1.15, zIndex: 5 }}
    />
  )
}

const COVERS = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/postcards/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>)
    .map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]),
)

const ease = [0.16, 1, 0.3, 1] as const

/**
 * Experiences as postcards: from every place Ana has been, a card sent to herself. The front is one
 * of Ana's own lace postcard fronts (src/assets/postcards) with the role, the place and the time; click and it flips to the written
 * side — the professional content (role, place, period, what she did), a stamp with her glass heart,
 * a postmark with the year and the address lines. The postcard is the visual; the copy is her CV. Cards lie scattered on a dark linen table, slightly rotated, and are
 * dealt in as you scroll. Inspired by Ana's vintage-postcard references (2026-09-22).
 */
export default function Timeline({ items, kicker, title, intro, flip, back, did, stampHere }: {
  items: Experience[]; kicker: string; title: string; intro: string; flip: string; back: string; did: string; stampHere: string
}) {
  const list = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 70%', 'end 70%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.8 })
  const travelled = useTransform(progress, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`)
  return (
    <section className="pc" aria-labelledby="xp-title">
      <header className="pc-head">
        <span className="meta">{kicker}</span>
        <h2 id="xp-title">{title}</h2>
        {intro && <p className="pc-intro">{intro}</p>}
        {HEAD.map((st) => <Sticker key={st.id} s={st} />)}
      </header>
      {/* the postal route: a dashed line down the page, travelled as you scroll; each stop is a postmark */}
      <ol className="pc-list" ref={list}>
        <span className="pc-route" aria-hidden>
          <motion.span className="pc-route-fill" style={{ height: travelled }} />
          <motion.span className="pc-route-dot" style={{ top: travelled }} />
        </span>
        {items.map((it, i) => <Postcard key={it.title} it={it} i={i} flip={flip} back={back} did={did} stampHere={stampHere} />)}
      </ol>
    </section>
  )
}

function Postcard({ it, i, flip, back, did, stampHere }: { it: Experience; i: number; flip: string; back: string; did: string; stampHere: string }) {
  const [flipped, setFlipped] = useState(false)
  const rot = [-3, 2.4, -1.6, 2.8][i % 4]
  const year = it.period.match(/\d{4}/)?.[0] ?? ''
  const [city] = it.org.split(' · ').slice(-1)
  const notes = [...it.design, ...it.tech]
  const [startMonth, startYear] = (() => { const first = it.period.split('—')[0].trim().split(' '); return first.length > 1 ? [first[0], first[1]] : ['', first[0]] })()
  return (
    <li className={`pc-item ${i % 2 ? 'r' : 'l'}`}>
      {(EMPTY[i % EMPTY.length] ?? []).map((st) => <Sticker key={st.id} s={st} side={i % 2 ? 'r' : 'l'} />)}
      {/* the stop on the route: a postmark with the date, stamped in as it comes into view */}
      <motion.span
        className="pc-mark" aria-hidden
        initial={{ scale: 1.6, opacity: 0, rotate: -20 }} whileInView={{ scale: 1, opacity: 1, rotate: -8 }}
        viewport={{ once: true, amount: 0.6, margin: '0px 0px -20% 0px' }} transition={{ type: 'spring', stiffness: 420, damping: 20 }}
      >
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="38" /></svg>
        <em>{startMonth}</em><b>{startYear}</b>
      </motion.span>
      <span className="pc-tie" aria-hidden />
      <motion.div
        className="pc-card"
        initial={{ opacity: 0, y: 40, rotate: rot + 8, scale: 0.96 }} whileInView={{ opacity: 1, y: 0, rotate: rot, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.9, ease, delay: 0.1 }}
      >
      <motion.div
        className="pc-card-hover" whileHover={{ y: -6, rotate: rot * 0.4 }} transition={{ duration: 0.45, ease }} style={{ ['--rot' as string]: `${rot}deg` }}
        role="button" tabIndex={0} aria-pressed={flipped} aria-label={flipped ? back : flip}
        onClick={() => setFlipped((v) => !v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((v) => !v) } }}
      >
        <motion.div className="pc-faces" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.85, ease }}>
          {/* front: Ana's lace postcard as the picture side */}
          <div className="pc-face pc-front" style={{ backgroundImage: `url(${COVERS[it.cover]})` }}>
            <span className="pc-label pc-label-tl">{it.period}</span>
            <div className="pc-front-text">
              <h3>{it.title}</h3>
              <p className="pc-place">{it.org}</p>
            </div>
            <span className="pc-label pc-label-br">{flip} ↻</span>
          </div>
          {/* back: written side */}
          <div className="pc-face pc-back">
            <span className="pc-script">Postcard</span>
            <div className="pc-back-grid">
              {/* the written side carries the professional content: role, place, period, what she did */}
              <div className="pc-note">
                <span className="pc-note-role">{it.title}</span>
                <span className="pc-note-org">{it.org} · {it.period}</span>
                <p>{it.desc}</p>
                {notes.length > 0 && (
                  <>
                    <span className="pc-note-did meta">{did}</span>
                    <ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul>
                  </>
                )}
              </div>
              <div className="pc-right">
                <motion.span
                  className="pc-stamp" aria-label={stampHere}
                  initial={false} animate={flipped ? { scale: 1, rotate: -6, opacity: 1 } : { scale: 1.5, rotate: 8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18, delay: flipped ? 0.45 : 0 }}
                >
                  <img src={heartUrl} alt="" draggable={false} />
                  <b>{year}</b>
                </motion.span>
                <motion.span
                  className="pc-postmark" aria-hidden
                  initial={false} animate={flipped ? { opacity: 0.85, scale: 1 } : { opacity: 0, scale: 1.3 }}
                  transition={{ duration: 0.5, ease, delay: flipped ? 0.6 : 0 }}
                >
                  <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="36" /><path d="M8 56 H92 M8 64 H92 M8 72 H92" /></svg>
                  <em>{city}</em><i>{year}</i>
                </motion.span>
                <div className="pc-address">
                  <span>{it.title}</span><span>{it.org}</span><span /><span />
                </div>
              </div>
            </div>
            <span className="pc-label pc-label-br dark">{back} ↺</span>
          </div>
        </motion.div>
      </motion.div>
      {NEAR[i] && <Sticker s={NEAR[i]} near />}
      </motion.div>
    </li>
  )
}
