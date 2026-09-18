import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ForwardedRef, type MouseEvent } from 'react'
import { AnimatePresence, animate, motion, useInView } from 'framer-motion'
import { useI18n } from '../i18n'
import { dossier, ENDING, FE_LABEL, phases, shots, SHOT_URLS, type FE, type Phase } from '../pages/fragments'
import FragmentsBackdrop from './FragmentsWorld'

/**
 * The Fragments page body, living inside the "garden of memory" (FragmentsBackdrop, fixed behind
 * everything): paper panels over the sky with what the game is, Layla's four phases (each card,
 * as it scrolls past the middle of the screen, grows the plant in the garden one stage), an
 * interactive gallery of "memory fragments" (tilting polaroids with filters) and the study's
 * results as animated counters. One shared lightbox serves the phase cards and the gallery.
 * All copy lives in pages/fragments.ts.
 */

type Filter = { kind: 'all' } | { kind: 'phase'; key: Phase['key'] } | { kind: 'fe'; fe: FE }
const FE_COLOR: Record<FE, string> = { wm: '#5e8f52', ic: '#c97d3a', cf: '#7d5fb8' } // deeper on paper
const ease = [0.16, 1, 0.3, 1] as const

export default function FragmentsDossier({ paused }: { paused: boolean }) {
  const { lang } = useI18n()
  const d = dossier[lang]
  const [filter, setFilter] = useState<Filter>({ kind: 'all' })
  const [open, setOpen] = useState<string | null>(null)
  const [openList, setOpenList] = useState<string[]>(shots.map((s) => s.id))
  const show = (id: string, list: string[]) => { setOpenList(list); setOpen(id) }
  const all = useMemo(() => shots.map((s) => s.id), [])

  // which phase cards have passed the middle of the screen → which fragments the garden shows
  const [step, setStep] = useState(0)
  useEffect(() => {
    const cards = () => Array.from(document.querySelectorAll<HTMLElement>('[data-phase-step]'))
    const onScroll = () => {
      const line = window.innerHeight * 0.8 // a card counts as soon as its top enters the lower fifth of the screen
      let s = 0
      cards().forEach((c) => { if (c.getBoundingClientRect().top < line) s = Math.max(s, Number(c.dataset.phaseStep)) })
      setStep((prev) => (prev === s ? prev : s))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  return (
    <div className="frag">
      <FragmentsBackdrop step={step} paused={paused || open !== null} />

      <section className="frag-about paper">
        <span className="meta frag-kicker">{d.kicker}</span>
        <div className="frag-about-grid">
          <div className="frag-text">{d.about.map((p, i) => <p key={i}>{p}</p>)}</div>
          <dl className="frag-facts">
            {d.facts.map(([k, v]) => <div key={k}><dt className="meta">{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      </section>

      <section className="frag-phases">
        <div className="paper frag-phases-intro">
          <span className="meta">Fragments</span>
          <h2>{d.world.title}</h2>
          <p>{d.world.intro}</p>
          <small className="meta frag-world-scroll">{d.world.scroll} ↓</small>
        </div>
        {phases.map((ph, i) => (
          <motion.article
            key={ph.key}
            className={`paper frag-phase ${step === ph.n ? 'on' : ''}`}
            data-phase-step={ph.n}
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-12%' }}
            transition={{ duration: 0.7, ease, delay: 0.05 }}
          >
            <span className="meta">{d.world.step} 0{ph.n} · {ph.period[lang]}</span>
            <h3>{ph.name[lang]}</h3>
            <span className="frag-chips">{ph.fe.map((fe) => <i key={fe} style={{ '--c': FE_COLOR[fe] } as CSSProperties}>{FE_LABEL[lang][fe]}</i>)}</span>
            <p>{ph.mechanic[lang]}</p>
            <div className="frag-phase-shots">
              {shots.filter((s) => s.phase === ph.key).map((s) => (
                <button key={s.id} type="button" onClick={() => show(s.id, all)} aria-label={s.caption[lang]}>
                  <img src={SHOT_URLS[s.id]} alt="" loading="lazy" />
                </button>
              ))}
            </div>
            {i === 0 && <small className="meta">{d.world.tap}</small>}
          </motion.article>
        ))}
      </section>

      <Gallery filter={filter} setFilter={setFilter} onOpen={show} />
      <Results />
      <p className="meta frag-credits paper">{d.credits}</p>

      <Lightbox list={openList} open={open} setOpen={setOpen} />
    </div>
  )
}

/* ---------------------------------------------------------------- gallery */

function matches(shot: (typeof shots)[number], f: Filter) {
  if (f.kind === 'all') return true
  if (shot.phase === 'title') return false
  const ph = phases.find((p) => p.key === shot.phase)!
  return f.kind === 'phase' ? shot.phase === f.key : ph.fe.includes(f.fe)
}

// forwardRef: AnimatePresence's popLayout mode measures exiting children through a ref
const Card = forwardRef(function Card({ shot, i, onOpen }: { shot: (typeof shots)[number]; i: number; onOpen: () => void }, fwd: ForwardedRef<HTMLButtonElement>) {
  const { lang } = useI18n()
  const ref = useRef<HTMLButtonElement | null>(null)
  const setRef = (el: HTMLButtonElement | null) => { ref.current = el; if (typeof fwd === 'function') fwd(el); else if (fwd) fwd.current = el }
  const ph = phases.find((p) => p.key === shot.phase)
  const onMove = (e: MouseEvent) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 16).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(x * 100 + 50).toFixed(1)}%`)
    el.style.setProperty('--gy', `${(y * 100 + 50).toFixed(1)}%`)
  }
  const onLeave = () => { const el = ref.current; if (!el) return; el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg') }
  return (
    <motion.button
      ref={setRef}
      type="button"
      className="frag-card"
      style={{ '--tilt': `${((i * 37) % 9) - 4}deg` } as CSSProperties}
      layout
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onOpen}
      aria-label={shot.caption[lang]}
    >
      <span className="frag-card-img"><img src={SHOT_URLS[shot.id]} alt="" loading="lazy" /><i className="frag-glare" /></span>
      <span className="frag-card-cap">
        <b>{ph ? ph.name[lang] : 'Fragments'}</b>
        <small>{shot.caption[lang]}</small>
      </span>
    </motion.button>
  )
})

function Gallery({ filter, setFilter, onOpen }: { filter: Filter; setFilter: (f: Filter) => void; onOpen: (id: string, list: string[]) => void }) {
  const { lang } = useI18n()
  const d = dossier[lang]
  const list = useMemo(() => shots.filter((s) => matches(s, filter)), [filter])
  const is = (f: Filter) => JSON.stringify(f) === JSON.stringify(filter)
  return (
    <section className="frag-gallery">
      <div className="frag-gallery-head paper">
        <div><h2>{d.galleryTitle}</h2><p className="meta">{d.galleryHint}</p></div>
        <div className="frag-filters" role="group">
          <button type="button" className={is({ kind: 'all' }) ? 'on' : ''} onClick={() => setFilter({ kind: 'all' })}>{d.all}</button>
          {phases.map((ph) => <button key={ph.key} type="button" className={is({ kind: 'phase', key: ph.key }) ? 'on' : ''} onClick={() => setFilter({ kind: 'phase', key: ph.key })}>{ph.name[lang]}</button>)}
          {(['wm', 'ic', 'cf'] as FE[]).map((fe) => <button key={fe} type="button" className={`fe ${is({ kind: 'fe', fe }) ? 'on' : ''}`} style={{ '--c': FE_COLOR[fe] } as CSSProperties} onClick={() => setFilter({ kind: 'fe', fe })}>{FE_LABEL[lang][fe]}</button>)}
        </div>
      </div>
      <motion.div className="frag-grid" layout>
        <AnimatePresence mode="popLayout">
          {list.map((s, i) => <Card key={s.id} shot={s} i={i} onOpen={() => onOpen(s.id, list.map((x) => x.id))} />)}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}

/* ---------------------------------------------------------------- lightbox */

function Lightbox({ list, open, setOpen }: { list: string[]; open: string | null; setOpen: (id: string | null) => void }) {
  const { lang } = useI18n()
  const lb = useRef<HTMLDivElement>(null)
  const idx = open ? list.indexOf(open) : -1
  const step = useCallback((k: number) => { if (idx < 0 || !list.length) return; setOpen(list[(idx + k + list.length) % list.length]) }, [idx, list, setOpen])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1) }
    window.addEventListener('keydown', onKey)
    // the embedded game may hold the keyboard: pull focus back to the page so arrows and Esc reach us
    if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === 'IFRAME') document.activeElement.blur()
    lb.current?.focus()
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, step, setOpen])
  const cur = open ? shots.find((s) => s.id === open) : null
  const ph = cur && phases.find((p) => p.key === cur.phase)
  return (
    <AnimatePresence>
      {cur && (
        <motion.div ref={lb} tabIndex={-1} className="frag-lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
          <motion.figure key={cur.id} initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.4, ease }} onClick={(e) => e.stopPropagation()}>
            <img src={SHOT_URLS[cur.id]} alt={cur.caption[lang]} />
            <figcaption>
              <span className="meta">{ph ? `0${ph.n} · ${ph.name[lang]} · ${ph.period[lang]}` : 'Fragments'}</span>
              <p>{cur.caption[lang]}</p>
              {ph && <span className="frag-chips">{ph.fe.map((fe) => <i key={fe} style={{ '--c': FE_COLOR[fe] } as CSSProperties}>{FE_LABEL[lang][fe]}</i>)}</span>}
            </figcaption>
          </motion.figure>
          {list.length > 1 && <>
            <button type="button" className="frag-lb-nav prev" onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="previous">←</button>
            <button type="button" className="frag-lb-nav next" onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="next">→</button>
          </>}
          <button type="button" className="frag-lb-close meta" onClick={() => setOpen(null)}>Esc</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------------------------------------------------------------- results */

function Counter({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10%' })
  useEffect(() => {
    if (!inView || !ref.current) return
    const c = animate(0, to, { duration: 1.6, ease, onUpdate: (v) => { if (ref.current) ref.current.textContent = v.toFixed(decimals).replace('.', ',') + suffix } })
    return () => c.stop()
  }, [inView, to, decimals, suffix])
  return <span ref={ref}>0{suffix}</span>
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 30, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 72 72" className="frag-ring" aria-hidden>
      <circle cx="36" cy="36" r={r} stroke="rgba(26,20,24,.1)" strokeWidth="6" fill="none" />
      <motion.circle cx="36" cy="36" r={r} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - pct / 100) }} viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 1.6, ease }} transform="rotate(-90 36 36)" />
    </svg>
  )
}

function Results() {
  const { lang } = useI18n()
  const d = dossier[lang]
  const total = ENDING.peace + ENDING.tragic
  return (
    <section className="frag-results paper">
      <h2>{d.resultsTitle}</h2>
      <p className="frag-text">{d.resultsIntro}</p>

      <div className="frag-fes">
        {d.fes.map((f) => (
          <div className="frag-fe" key={f.fe}>
            <div className="frag-fe-num"><Ring pct={f.pct} color={FE_COLOR[f.fe]} /><b><Counter to={f.pct} decimals={f.pct % 1 ? 1 : 0} suffix="%" /></b></div>
            <span className="meta" style={{ color: FE_COLOR[f.fe] }}>{FE_LABEL[lang][f.fe]}</span>
            <p>{f.label}</p>
          </div>
        ))}
      </div>

      <div className="frag-geq">
        <span className="meta">Game Experience Questionnaire · {d.geqScale} · n = 30</span>
        <ul>
          {d.geq.map((g, i) => (
            <li key={g.label} className={g.value < 2 ? 'low' : ''}>
              <span>{g.label}</span>
              <span className="frag-bar"><motion.i initial={{ scaleX: 0 }} whileInView={{ scaleX: g.value / 4 }} viewport={{ once: true, margin: '-10%' }} transition={{ delay: i * 0.06, duration: 1.2, ease }} /></span>
              <b>{g.value.toFixed(1).replace('.', ',')}</b>
            </li>
          ))}
        </ul>
      </div>

      <div className="frag-ending">
        <h3>{d.endingTitle}</h3>
        <p className="frag-text">{d.endingText}</p>
        <div className="frag-split" role="img" aria-label={`${ENDING.peace} × ${ENDING.tragic}`}>
          <motion.span className="peace" initial={{ flexGrow: 1 }} whileInView={{ flexGrow: ENDING.peace }} viewport={{ once: true }} transition={{ duration: 1.4, ease }}>
            <b><Counter to={ENDING.peace} /></b><small>{d.peace}</small>
          </motion.span>
          <motion.span className="tragic" initial={{ flexGrow: 1 }} whileInView={{ flexGrow: ENDING.tragic }} viewport={{ once: true }} transition={{ duration: 1.4, ease }}>
            <b><Counter to={ENDING.tragic} /></b><small>{d.tragic}</small>
          </motion.span>
        </div>
        <span className="meta">{Math.round((ENDING.peace / total) * 100)}% · {Math.round((ENDING.tragic / total) * 100)}%</span>
      </div>
    </section>
  )
}
