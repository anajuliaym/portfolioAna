import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Experience } from '../pages/content'
import heartUrl from '../assets/about/heart.webp'

const ease = [0.16, 1, 0.3, 1] as const

/**
 * Experiences as postcards: from every place Ana has been, a card sent to herself. The front is a
 * lace-framed picture side with the place and the time; click and it flips to the written side —
 * a handwritten note (what she took from there), a stamp with her glass heart, a postmark with the
 * year and the address lines. Cards lie scattered on a dark linen table, slightly rotated, and are
 * dealt in as you scroll. Inspired by Ana's vintage-postcard references (2026-09-22).
 */
export default function Timeline({ items, kicker, title, intro, flip, back, dear, sign, stampHere }: {
  items: Experience[]; kicker: string; title: string; intro: string; flip: string; back: string; dear: string; sign: string; stampHere: string
}) {
  return (
    <section className="pc" aria-labelledby="xp-title">
      <header className="pc-head">
        <span className="meta">{kicker}</span>
        <h2 id="xp-title">{title}</h2>
        <p className="pc-intro">{intro}</p>
      </header>
      <ol className="pc-list">
        {items.map((it, i) => <Postcard key={it.title} it={it} i={i} flip={flip} back={back} dear={dear} sign={sign} stampHere={stampHere} />)}
      </ol>
    </section>
  )
}

/** a lace doily frame: scalloped edge of little circles, an inner dotted lace line and corner rosettes */
function Lace() {
  const W = 300, H = 200, r = 6, step = 12
  const scallops: string[] = []
  for (let x = step; x < W; x += step) { scallops.push(`M${x} ${r}m-${r} 0a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 -${r * 2} 0`); scallops.push(`M${x} ${H - r}m-${r} 0a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 -${r * 2} 0`) }
  for (let y = step; y < H; y += step) { scallops.push(`M${r} ${y}m-${r} 0a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 -${r * 2} 0`); scallops.push(`M${W - r} ${y}m-${r} 0a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 -${r * 2} 0`) }
  const rosette = (cx: number, cy: number) => (
    <g key={`${cx}-${cy}`} className="pc-rosette">
      {[0, 60, 120, 180, 240, 300].map((a) => <circle key={a} cx={cx + Math.cos((a * Math.PI) / 180) * 9} cy={cy + Math.sin((a * Math.PI) / 180) * 9} r="5" />)}
      <circle cx={cx} cy={cy} r="4" className="pc-rosette-core" />
    </g>
  )
  return (
    <svg className="pc-lace" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <path d={scallops.join('')} className="pc-scallop" />
      <rect x="16" y="16" width={W - 32} height={H - 32} rx="14" className="pc-lace-line" />
      <rect x="24" y="24" width={W - 48} height={H - 48} rx="10" className="pc-lace-dots" />
      {rosette(24, 24)}{rosette(W - 24, 24)}{rosette(24, H - 24)}{rosette(W - 24, H - 24)}
    </svg>
  )
}

function Postcard({ it, i, flip, back, dear, sign, stampHere }: { it: Experience; i: number; flip: string; back: string; dear: string; sign: string; stampHere: string }) {
  const [flipped, setFlipped] = useState(false)
  const tone = ['sage', 'rose', 'cream', 'sage'][i % 4]
  const rot = [-3, 2.4, -1.6, 2.8][i % 4]
  const year = it.period.match(/\d{4}/)?.[0] ?? ''
  const [city] = it.org.split(' · ').slice(-1)
  const notes = [...it.design, ...it.tech]
  return (
    <motion.li
      className={`pc-item ${i % 2 ? 'r' : 'l'}`}
      initial={{ opacity: 0, y: 60, rotate: rot + 10, scale: 0.94 }} whileInView={{ opacity: 1, y: 0, rotate: rot, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.9, ease, delay: (i % 2) * 0.12 }}
    >
      <motion.div className="pc-card" whileHover={{ y: -6, rotate: rot * 0.4 }} transition={{ duration: 0.45, ease }} style={{ ['--rot' as string]: `${rot}deg` }}>
        <motion.div className="pc-faces" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.85, ease }}>
          {/* front: picture side */}
          <div className={`pc-face pc-front ${tone}`} onClick={() => setFlipped(true)} role="button" aria-label={flip} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setFlipped(true)}>
            <Lace />
            <span className="pc-label pc-label-tl">{it.period}</span>
            <div className="pc-front-text">
              <h3>{it.title}</h3>
              <p className="pc-place">{it.org}</p>
            </div>
            <span className="pc-label pc-label-br">{flip} ↻</span>
          </div>
          {/* back: written side */}
          <div className="pc-face pc-back" onClick={() => setFlipped(false)} role="button" aria-label={back} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setFlipped(false)}>
            <span className="pc-script">Postcard</span>
            <div className="pc-back-grid">
              <div className="pc-note">
                <span className="pc-dear">{dear}</span>
                <p>{it.desc}</p>
                {notes.length > 0 && <ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
                <span className="pc-sign">{sign}</span>
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
    </motion.li>
  )
}
