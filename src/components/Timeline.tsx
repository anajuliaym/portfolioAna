import { useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'framer-motion'
import type { Experience } from '../pages/content'

const ease = [0.16, 1, 0.3, 1] as const

/**
 * Experience timeline: a spine that draws itself as you scroll, with a glowing bead riding the
 * scroll position; entries alternate sides on wide screens and slide in from their side. Each card
 * tilts towards the pointer and opens on click to show its highlights. Years sit on the spine as
 * cream paper tags, in the language of the desk hotspots and the About collage.
 */
export default function Timeline({ items, kicker, title, more }: { items: Experience[]; kicker: string; title: string; more: string }) {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 78%', 'end 62%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.6 })
  const spine = useTransform(progress, (v) => `${Math.min(1, Math.max(0, v)) * 100}%`)
  return (
    <section className="xp" aria-labelledby="xp-title">
      <header className="xp-head">
        <span className="meta">{kicker}</span>
        <h2 id="xp-title">{title}</h2>
      </header>
      <ol className="xp-list" ref={ref}>
        <span className="xp-spine" aria-hidden>
          <motion.span className="xp-spine-fill" style={{ height: spine }} />
          <motion.span className="xp-bead" style={{ top: spine }} />
        </span>
        {items.map((it, i) => <Entry key={it.title} it={it} i={i} more={more} />)}
      </ol>
    </section>
  )
}

function Entry({ it, i, more }: { it: Experience; i: number; more: string }) {
  const side = i % 2 ? 'right' : 'left'
  const [open, setOpen] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const onMove = (e: React.PointerEvent) => {
    const el = card.current; if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 6}deg`)
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`)
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  }
  const onLeave = () => { const el = card.current; if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg') } }
  return (
    <motion.li
      className={`xp-item ${side}`}
      initial={{ opacity: 0, x: side === 'left' ? -40 : 40, y: 24 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.9, ease }}
    >
      {/* the year tag, pinned on the spine */}
      <motion.span
        className="xp-year" aria-hidden
        initial={{ scale: 0.6, opacity: 0, rotate: side === 'left' ? -8 : 8 }} whileInView={{ scale: 1, opacity: 1, rotate: side === 'left' ? -2 : 2 }}
        viewport={{ once: true, amount: 0.1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
      >
        {it.period}
      </motion.span>
      <span className="xp-node" aria-hidden><span /></span>
      <motion.div
        ref={card} className={`xp-card ${open ? 'open' : ''}`} layout
        onPointerMove={onMove} onPointerLeave={onLeave} onClick={() => setOpen((v) => !v)}
        whileHover={{ y: -4 }} transition={{ layout: { duration: 0.45, ease } }}
      >
        <span className="xp-glow" aria-hidden />
        <span className="xp-period meta">{it.period}</span>
        <h3>{it.title}</h3>
        <p className="xp-org">{it.org}</p>
        <p className="xp-desc">{it.desc}</p>
        <ul className="xp-tags">{it.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        {it.more.length > 0 && (
          <>
            <AnimatePresence initial={false}>
              {open && (
                <motion.ul
                  className="xp-more" key="more"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.45, ease }}
                >
                  {it.more.map((m, k) => (
                    <motion.li key={m} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + k * 0.06, duration: 0.4, ease }}>{m}</motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
            <button type="button" className="xp-toggle meta" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}>
              {more} <i aria-hidden>{open ? '−' : '+'}</i>
            </button>
          </>
        )}
      </motion.div>
    </motion.li>
  )
}
