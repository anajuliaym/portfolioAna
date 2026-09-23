import { useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import type { Experience } from '../pages/content'

const ease = [0.16, 1, 0.3, 1] as const
const SAGE = '#a6c69a', PINK = '#f2a0b4'

/**
 * The experiences as a braid of two threads — design (sage) and technology (pink) — the two things
 * Ana says she lives between. The threads run down the page and cross at every experience, tying a
 * knot: that is the concept, each job or course is a place where the two met. Scrolling draws the
 * threads; each knot lights up as they arrive; a card sits beside every knot with a balance bar
 * (how much of each side) and opens into two columns, what came from design and what from code.
 * The thread geometry is measured from the DOM so it always passes exactly through the knots.
 */
export default function Timeline({ items, kicker, title, intro, threads, open, close }: {
  items: Experience[]; kicker: string; title: string; intro: string; threads: [string, string]; open: string; close: string
}) {
  const list = useRef<HTMLOListElement>(null)
  const [geo, setGeo] = useState<{ w: number; h: number; d1: string; d2: string; cx: number; ys: number[] } | null>(null)
  const narrow = typeof window !== 'undefined' && window.innerWidth <= 1000

  useLayoutEffect(() => {
    const el = list.current; if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const knots = [...el.querySelectorAll<HTMLElement>('.br-knot')]
      const ys = knots.map((k) => { const kr = k.getBoundingClientRect(); return kr.top - r.top + kr.height / 2 })
      if (!ys.length) return
      const isNarrow = window.innerWidth <= 1000
      const cx = isNarrow ? 22 : r.width / 2
      const A = isNarrow ? 12 : 34 // how far the threads part between knots
      const w = r.width, h = r.height
      // both threads: from a resting side, through the knot (vertical tangent), to the other side.
      // design starts left, technology right; they swap at every knot → a braid
      const build = (side: number) => {
        let s = side
        let d = `M ${cx + s * A} 0`
        let prevY = 0
        ys.forEach((y, i) => {
          const nextY = i < ys.length - 1 ? (y + ys[i + 1]) / 2 : h
          const t1 = (y - prevY) * 0.5, t2 = (nextY - y) * 0.5
          d += ` C ${cx + s * A} ${prevY + t1}, ${cx} ${y - t1}, ${cx} ${y}`
          s = -s
          d += ` C ${cx} ${y + t2}, ${cx + s * A} ${nextY - t2}, ${cx + s * A} ${nextY}`
          prevY = nextY
        })
        return d
      }
      setGeo({ w, h, cx, ys, d1: build(-1), d2: build(1) })
    }
    measure()
    const ro = new ResizeObserver(measure); ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [items.length])

  const { scrollYProgress } = useScroll({ target: list, offset: ['start 72%', 'end 70%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.8 })

  return (
    <section className="br" aria-labelledby="xp-title">
      <header className="br-head">
        <span className="meta">{kicker}</span>
        <h2 id="xp-title">{title}</h2>
        <p className="br-intro">{intro}</p>
      </header>
      <div className="br-legend" aria-hidden>
        <span className="sage">{threads[0]}</span>
        <span className="pink">{threads[1]}</span>
      </div>
      <ol className="br-list" ref={list}>
        {geo && (
          <svg className="br-threads" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden>
            <defs>
              <filter id="br-glow" x="-50%" y="-5%" width="200%" height="110%"><feGaussianBlur stdDeviation="3" /></filter>
            </defs>
            {/* faint guides of the whole route, then the drawn threads on top */}
            <path d={geo.d1} className="br-guide" />
            <path d={geo.d2} className="br-guide" />
            <motion.path d={geo.d1} className="br-thread sage halo" style={{ pathLength: progress }} filter="url(#br-glow)" />
            <motion.path d={geo.d2} className="br-thread pink halo" style={{ pathLength: progress }} filter="url(#br-glow)" />
            <motion.path d={geo.d1} className="br-thread sage" style={{ pathLength: progress }} />
            <motion.path d={geo.d2} className="br-thread pink" style={{ pathLength: progress }} />
          </svg>
        )}
        {items.map((it, i) => <Knot key={it.title} it={it} i={i} narrow={narrow} openLabel={open} closeLabel={close} threads={threads} />)}
      </ol>
    </section>
  )
}

function Knot({ it, i, narrow, openLabel, closeLabel, threads }: { it: Experience; i: number; narrow: boolean; openLabel: string; closeLabel: string; threads: [string, string] }) {
  const side = narrow ? 'right' : i % 2 ? 'right' : 'left'
  const [open, setOpen] = useState(false)
  const has = it.design.length + it.tech.length > 0
  const pct = Math.round(it.mix * 100)
  return (
    <li className={`br-item ${side}`}>
      {/* the knot: both threads pass through here */}
      <motion.span
        className="br-knot" aria-hidden
        initial={{ scale: 0.3, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.5, margin: '0px 0px -25% 0px' }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      >
        <span className="br-knot-core" />
      </motion.span>
      <span className="br-link" aria-hidden />
      <motion.article
        className={`br-card ${open ? 'open' : ''}`} layout
        initial={{ opacity: 0, y: 26, x: side === 'left' ? -18 : 18 }} whileInView={{ opacity: 1, y: 0, x: 0 }}
        viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8, ease, layout: { duration: 0.45, ease } }}
      >
        {/* balance: how much of this knot was design, how much technology */}
        <div className="br-balance" aria-label={`${100 - pct}% ${threads[0]}, ${pct}% ${threads[1]}`}>
          <motion.span className="sage" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease, delay: 0.2 }} style={{ width: `${100 - pct}%`, transformOrigin: 'left' }} />
          <motion.span className="pink" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease, delay: 0.3 }} style={{ width: `${pct}%`, transformOrigin: 'right' }} />
        </div>
        <span className="br-period meta">{it.period}</span>
        <h3>{it.title}</h3>
        <p className="br-org">{it.org}</p>
        <p className="br-desc">{it.desc}</p>
        {has && (
          <>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div className="br-cols" key="cols" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.45, ease }}>
                  <div className="br-col sage">
                    <span className="br-col-title">{threads[0]}</span>
                    <ul>{it.design.map((d, k) => <motion.li key={d} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + k * 0.07, duration: 0.4, ease }}>{d}</motion.li>)}</ul>
                  </div>
                  <div className="br-col pink">
                    <span className="br-col-title">{threads[1]}</span>
                    <ul>{it.tech.map((d, k) => <motion.li key={d} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + k * 0.07, duration: 0.4, ease }}>{d}</motion.li>)}</ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <button type="button" className="br-toggle meta" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <i aria-hidden><b style={{ background: SAGE }} /><b style={{ background: PINK }} /></i>
              {open ? closeLabel : openLabel}
            </button>
          </>
        )}
      </motion.article>
    </li>
  )
}
