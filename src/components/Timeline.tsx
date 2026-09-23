import { useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import type { Experience } from '../pages/content'
import strapUrl from '../assets/badge/strap.webp'
import heartUrl from '../assets/about/heart.webp'

const ease = [0.16, 1, 0.3, 1] as const

/**
 * Experiences as things hanging from the badge's own lanyard: the woven cord runs down the page and
 * unrolls with the scroll, Ana's glass heart slides along it, and each experience is a paper tag
 * clipped to a metal ring with a short chain — like the charms on the badge's keychain. Tags swing
 * in on their hole with a pendulum spring, tilt on hover, and flip over on click to show the
 * highlights on the back (lined paper). Sides alternate on wide screens.
 */
export default function Timeline({ items, kicker, title, more }: { items: Experience[]; kicker: string; title: string; more: string }) {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 65%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 70, damping: 20, mass: 0.7 })
  const unrolled = useTransform(progress, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`)
  const heartTilt = useTransform(progress, [0, 1], [-14, 14])
  return (
    <section className="xp" aria-labelledby="xp-title">
      <header className="xp-head">
        <span className="meta">{kicker}</span>
        <h2 id="xp-title">{title}</h2>
      </header>
      <ol className="xp-list" ref={ref}>
        <span className="xp-cord" aria-hidden>
          <motion.span className="xp-cord-fill" style={{ height: unrolled, backgroundImage: `url(${strapUrl})` }} />
          <motion.img className="xp-heart" src={heartUrl} alt="" draggable={false} style={{ top: unrolled, rotate: heartTilt }} />
        </span>
        {items.map((it, i) => <Entry key={it.title} it={it} i={i} more={more} />)}
      </ol>
    </section>
  )
}

const Chain = () => (
  <svg className="xp-chain" viewBox="0 0 14 44" aria-hidden>
    <defs>
      <linearGradient id="xp-metal" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#f4f4f6" /><stop offset=".5" stopColor="#9a9ca4" /><stop offset="1" stopColor="#e8e9ee" />
      </linearGradient>
    </defs>
    <ellipse cx="7" cy="7" rx="4.5" ry="6" fill="none" stroke="url(#xp-metal)" strokeWidth="2.2" />
    <ellipse cx="7" cy="22" rx="4.5" ry="6" fill="none" stroke="url(#xp-metal)" strokeWidth="2.2" transform="rotate(90 7 22)" />
    <ellipse cx="7" cy="37" rx="4.5" ry="6" fill="none" stroke="url(#xp-metal)" strokeWidth="2.2" />
  </svg>
)

function Entry({ it, i, more }: { it: Experience; i: number; more: string }) {
  const side = i % 2 ? 'right' : 'left'
  const [flipped, setFlipped] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const onMove = (e: React.PointerEvent) => {
    const el = card.current; if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }
  const rest = side === 'left' ? -2.5 : 2.5
  const canFlip = it.more.length > 0 // tags without highlights have no back and do not flip
  return (
    <li className={`xp-item ${side}`}>
      {/* the ring on the cord */}
      <motion.span
        className="xp-ring" aria-hidden
        initial={{ scale: 0.4, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      />
      {/* chain + tag hang from the ring and swing in like a charm */}
      <motion.div
        className="xp-hang"
        initial={{ rotate: side === 'left' ? -18 : 18, opacity: 0, y: -18 }}
        whileInView={{ rotate: rest, opacity: 1, y: 0 }}
        whileHover={{ rotate: rest * 0.3 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ rotate: { type: 'spring', stiffness: 46, damping: 5.5, mass: 1 }, opacity: { duration: 0.5 }, y: { duration: 0.7, ease } }}
      >
        <Chain />
        <div className={`xp-tag ${flipped ? 'flipped' : ''} ${canFlip ? '' : 'static'}`} ref={card} onPointerMove={onMove} onClick={() => canFlip && setFlipped((v) => !v)}>
          <motion.div className="xp-faces" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.75, ease }}>
            <div className="xp-face xp-front">
              <span className="xp-hole" aria-hidden />
              <span className="xp-stamp">{it.period}</span>
              <h3>{it.title}</h3>
              <p className="xp-org">{it.org}</p>
              <p className="xp-desc">{it.desc}</p>
              <ul className="xp-tags">{it.tags.map((t, k) => <li key={t} className={k % 2 ? 'pink' : ''}>{t}</li>)}</ul>
              {canFlip && <span className="xp-flipcue meta">{more} <i aria-hidden>↻</i></span>}
              <span className="xp-sheen" aria-hidden />
            </div>
            {canFlip && (
              <div className="xp-face xp-back">
                <span className="xp-hole" aria-hidden />
                <span className="xp-stamp">{it.period}</span>
                <h3>{it.title}</h3>
                <ul className="xp-more">{it.more.map((m) => <li key={m}>{m}</li>)}</ul>
                <span className="xp-flipcue meta"><i aria-hidden>↺</i></span>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </li>
  )
}
