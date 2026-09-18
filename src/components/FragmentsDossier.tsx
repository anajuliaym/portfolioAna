import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ForwardedRef, type MouseEvent } from 'react'
import { AnimatePresence, animate, motion, useInView } from 'framer-motion'
import { useI18n } from '../i18n'
import { dossier, ENDING, FE_LABEL, phases, shots, SHOT_URLS, type FE, type Phase } from '../pages/fragments'

/**
 * The Fragments page body: what the game is, Layla's four phases, an interactive gallery of
 * "memory fragments" (tilting polaroids with filters and a lightbox) and the study's results
 * as animated counters. All copy lives in pages/fragments.ts.
 */

type Filter = { kind: 'all' } | { kind: 'phase'; key: Phase['key'] } | { kind: 'fe'; fe: FE }
const FE_COLOR: Record<FE, string> = { wm: '#a6c69a', ic: '#f0b07f', cf: '#cfbfea' }
const ease = [0.16, 1, 0.3, 1] as const

export default function FragmentsDossier() {
  const { lang } = useI18n()
  const d = dossier[lang]
  const [filter, setFilter] = useState<Filter>({ kind: 'all' })
  return (
    <div className="frag">
      <section className="frag-about">
        <span className="meta frag-kicker">{d.kicker}</span>
        <div className="frag-about-grid">
          <div className="frag-text">{d.about.map((p, i) => <p key={i}>{p}</p>)}</div>
          <dl className="frag-facts">
            {d.facts.map(([k, v]) => <div key={k}><dt className="meta">{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      </section>

      <Timeline active={filter.kind === 'phase' ? filter.key : null} onPick={(key) => setFilter((f) => f.kind === 'phase' && f.key === key ? { kind: 'all' } : { kind: 'phase', key })} />
      <Gallery filter={filter} setFilter={setFilter} />
      <Results />
      <p className="meta frag-credits">{d.credits}</p>
    </div>
  )
}

/* ---------------------------------------------------------------- timeline */

function PlantIcon({ stage }: { stage: Phase['key'] }) {
  // one little plant per stage of Layla's life, drawn in the site's accent colours
  const g = '#a6c69a', p = '#f4b8cb', t = '#8a6a52'
  return (
    <svg viewBox="0 0 64 64" className="frag-plant" aria-hidden>
      <line x1="10" y1="56" x2="54" y2="56" stroke={t} strokeWidth="2" strokeLinecap="round" opacity=".6" />
      {stage === 'seed' && (<>
        <ellipse cx="32" cy="52" rx="6" ry="4" fill={t} />
        <path d="M32 50 C32 42 34 38 40 36" stroke={g} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M32 46 C28 44 26 40 27 36 C31 37 33 41 32 46Z" fill={g} />
      </>)}
      {stage === 'plant' && (<>
        <path d="M32 56 C32 42 32 34 32 22" stroke={g} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M32 40 C24 40 19 35 19 28 C27 28 32 33 32 40Z" fill={g} />
        <path d="M32 32 C40 32 45 27 45 20 C37 20 32 25 32 32Z" fill={g} />
      </>)}
      {stage === 'flower' && (<>
        <path d="M32 56 C32 44 32 36 32 26" stroke={g} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M32 42 C25 42 21 38 21 32 C28 32 32 36 32 42Z" fill={g} />
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="32" cy="16" rx="4.5" ry="8" fill={p} transform={`rotate(${a} 32 22)`} />)}
        <circle cx="32" cy="22" r="4" fill="#f6dc9a" />
      </>)}
      {stage === 'tree' && (<>
        <path d="M32 56 L32 34" stroke={t} strokeWidth="5" strokeLinecap="round" />
        <circle cx="32" cy="24" r="14" fill={g} />
        <circle cx="21" cy="30" r="9" fill={g} />
        <circle cx="43" cy="30" r="9" fill={g} />
        <circle cx="26" cy="20" r="2" fill={p} /><circle cx="38" cy="26" r="2" fill={p} /><circle cx="33" cy="14" r="2" fill={p} />
      </>)}
    </svg>
  )
}

function Timeline({ active, onPick }: { active: Phase['key'] | null; onPick: (k: Phase['key']) => void }) {
  const { lang } = useI18n()
  const d = dossier[lang]
  return (
    <section className="frag-timeline">
      <h2>{d.timelineTitle}</h2>
      <ol>
        {phases.map((ph, i) => (
          <motion.li
            key={ph.key}
            className={active === ph.key ? 'on' : active ? 'dim' : ''}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10%' }}
            transition={{ delay: i * 0.08, duration: 0.7, ease }}
          >
            <button type="button" onClick={() => onPick(ph.key)}>
              <motion.span className="frag-plant-wrap" whileHover={{ rotate: [0, -6, 6, -3, 0], scale: 1.08 }} transition={{ duration: 0.7 }}>
                <PlantIcon stage={ph.key} />
              </motion.span>
              <span className="meta">0{ph.n} · {ph.period[lang]}</span>
              <b>{ph.name[lang]}</b>
              <span className="frag-chips">{ph.fe.map((fe) => <i key={fe} style={{ '--c': FE_COLOR[fe] } as CSSProperties}>{FE_LABEL[lang][fe]}</i>)}</span>
              <p>{ph.mechanic[lang]}</p>
            </button>
          </motion.li>
        ))}
      </ol>
    </section>
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
      layoutId={`shot-${shot.id}`}
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

function Gallery({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const { lang } = useI18n()
  const d = dossier[lang]
  const list = useMemo(() => shots.filter((s) => matches(s, filter)), [filter])
  const [open, setOpen] = useState<string | null>(null)
  const lb = useRef<HTMLDivElement>(null)
  const openIdx = open ? list.findIndex((s) => s.id === open) : -1
  const step = useCallback((k: number) => { if (openIdx < 0) return; setOpen(list[(openIdx + k + list.length) % list.length].id) }, [openIdx, list])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1) }
    window.addEventListener('keydown', onKey)
    // the embedded game may hold the keyboard: pull focus back to the page so arrows and Esc reach us
    if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === 'IFRAME') document.activeElement.blur()
    lb.current?.focus()
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, step])
  const is = (f: Filter) => JSON.stringify(f) === JSON.stringify(filter)
  const cur = openIdx >= 0 ? list[openIdx] : null
  const curPh = cur && phases.find((p) => p.key === cur.phase)
  return (
    <section className="frag-gallery">
      <div className="frag-gallery-head">
        <div><h2>{d.galleryTitle}</h2><p className="meta">{d.galleryHint}</p></div>
        <div className="frag-filters" role="group">
          <button type="button" className={is({ kind: 'all' }) ? 'on' : ''} onClick={() => setFilter({ kind: 'all' })}>{d.all}</button>
          {phases.map((ph) => <button key={ph.key} type="button" className={is({ kind: 'phase', key: ph.key }) ? 'on' : ''} onClick={() => setFilter({ kind: 'phase', key: ph.key })}>{ph.name[lang]}</button>)}
          {(['wm', 'ic', 'cf'] as FE[]).map((fe) => <button key={fe} type="button" className={`fe ${is({ kind: 'fe', fe }) ? 'on' : ''}`} style={{ '--c': FE_COLOR[fe] } as CSSProperties} onClick={() => setFilter({ kind: 'fe', fe })}>{FE_LABEL[lang][fe]}</button>)}
        </div>
      </div>
      <motion.div className="frag-grid" layout>
        <AnimatePresence mode="popLayout">
          {list.map((s, i) => <Card key={s.id} shot={s} i={i} onOpen={() => setOpen(s.id)} />)}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {cur && (
          <motion.div ref={lb} tabIndex={-1} className="frag-lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.figure layoutId={`shot-${cur.id}`} onClick={(e) => e.stopPropagation()} transition={{ type: 'spring', stiffness: 220, damping: 28 }}>
              <img src={SHOT_URLS[cur.id]} alt={cur.caption[lang]} />
              <figcaption>
                <span className="meta">{curPh ? `0${curPh.n} · ${curPh.name[lang]} · ${curPh.period[lang]}` : 'Fragments'}</span>
                <p>{cur.caption[lang]}</p>
                {curPh && <span className="frag-chips">{curPh.fe.map((fe) => <i key={fe} style={{ '--c': FE_COLOR[fe] } as CSSProperties}>{FE_LABEL[lang][fe]}</i>)}</span>}
              </figcaption>
            </motion.figure>
            <button type="button" className="frag-lb-nav prev" onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="previous">←</button>
            <button type="button" className="frag-lb-nav next" onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="next">→</button>
            <button type="button" className="frag-lb-close meta" onClick={() => setOpen(null)}>Esc</button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
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
      <circle cx="36" cy="36" r={r} stroke="rgba(243,238,228,.12)" strokeWidth="6" fill="none" />
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
    <section className="frag-results">
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
