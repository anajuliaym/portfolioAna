import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'
import { KARDEC_LINES, stories, ui, type Chapter, type StoryId } from '../pages/gameStories'
import hannahSprite from '../assets/games/kardec/hannah.gif'

/**
 * The page body for Memorize It! and Kardec's House (2026-10-23, Ana: "uma página bonitinha que nem a do Fragments,
 * interativa igual"). Each game gets its own world behind the page (a pixel forest / a dark mansion that follows the
 * pointer like a lamp), the gameplay video from her Canva site with clickable chapters, a small interactive piece in
 * the spirit of the game (Memorize It!: the coin-memory mechanic as a mini game; Kardec's House: the opening dialogue
 * and a lantern to search a dark corridor) and a gallery of stills from the video. Copy in pages/gameStories.ts.
 */

const STILLS = {
  memorize: import.meta.glob('../assets/games/memorize/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>,
  kardec: import.meta.glob('../assets/games/kardec/*.webp', { eager: true, import: 'default', query: '?url' }) as Record<string, string>,
}
const still = (id: StoryId, file: string) => STILLS[id][`../assets/games/${id}/${file}.webp`]
const ease = [0.16, 1, 0.3, 1] as const
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function GameStory({ id }: { id: StoryId }) {
  const { lang } = useI18n()
  const s = stories[id]
  const u = ui[lang]
  return (
    <div className={`gs gs-${id}`}>
      {id === 'memorize' ? <ForestBackdrop /> : <MansionBackdrop />}

      <motion.section className="gs-card gs-about" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
        <span className="meta gs-kicker">{s.kicker[lang]}</span>
        <div className="gs-about-grid">
          <div className="gs-text">{s.about[lang].map((p, i) => <p key={i}>{p}</p>)}</div>
          <dl className="gs-facts">{s.facts[lang].map(([k, v]) => <div key={k}><dt className="meta">{k}</dt><dd>{v}</dd></div>)}</dl>
        </div>
      </motion.section>

      <ChapterPlayer id={id} />

      {id === 'memorize' ? <MemoryGame /> : <><Dialogue /><Lantern /></>}

      <Gallery id={id} label={u.gallery} />
    </div>
  )
}

/* ------------------------------------------------------------------ worlds behind the page */

/** Memorize It!'s forest, as in the game: a mint sky, stepped grey mountains and rows of pixel pines, in parallax */
function ForestBackdrop() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce) return
    let raf = 0
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => ref.current?.style.setProperty('--sy', String(window.scrollY))) }
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [reduce])
  // a mountain ridge in 10-unit "pixels" (stepped, like the game's grey mountains), over an 800-wide strip
  const ridge = (seed: number, base: number, amp: number) => {
    const pts: string[] = ['0,200']
    for (let x = 0; x <= 800; x += 10) {
      const t = x / 800
      const y = base - amp * (0.55 * Math.abs(Math.sin(t * Math.PI * 2.4 + seed)) + 0.3 * Math.abs(Math.sin(t * Math.PI * 5.1 + seed * 2)) + 0.15 * Math.sin(t * 23 + seed))
      const q = Math.round(y / 6) * 6
      pts.push(`${x},${q}`, `${x + 10},${q}`)
    }
    pts.push('800,200')
    return pts.join(' ')
  }
  const pine = (x: number, h: number, fill: string) => {
    const w = h * 0.5, steps = 5, pts: string[] = []
    for (let i = 0; i <= steps; i++) { const yy = 200 - (h * i) / steps, ww = (w * (steps - i)) / steps; pts.push(`${x - ww / 2},${yy}`) }
    for (let i = steps; i >= 0; i--) { const yy = 200 - (h * i) / steps, ww = (w * (steps - i)) / steps; pts.push(`${x + ww / 2},${yy}`) }
    return <polygon key={x + fill} points={pts.join(' ')} fill={fill} />
  }
  return createPortal(
    <div className="gs-forest" ref={ref} aria-hidden>
      <svg className="gs-l gs-l1" viewBox="0 0 800 200" preserveAspectRatio="xMidYMax slice"><polygon points={ridge(0.4, 130, 90)} fill="#8f9a96" /></svg>
      <svg className="gs-l gs-l2" viewBox="0 0 800 200" preserveAspectRatio="xMidYMax slice"><polygon points={ridge(1.3, 160, 70)} fill="#6f7774" /></svg>
      <svg className="gs-l gs-l3" viewBox="0 0 800 200" preserveAspectRatio="xMidYMax slice">{Array.from({ length: 44 }, (_, i) => pine(i * 19 + (i % 3) * 4, 70 + ((i * 37) % 40), i % 2 ? '#7fb08a' : '#5e8f6c'))}</svg>
      <svg className="gs-l gs-l4" viewBox="0 0 800 200" preserveAspectRatio="xMidYMax slice">{Array.from({ length: 28 }, (_, i) => pine(i * 29 + 10, 110 + ((i * 53) % 50), i % 2 ? '#3f6b50' : '#4d7d5c'))}</svg>
      <div className="gs-ground" />
      {[6, 31, 58, 88].map((x, i) => <i key={x} className="gs-coin" style={{ left: `${x}%`, top: `${46 + ((i * 17) % 22)}%`, animationDelay: `${i * 0.7}s` } as CSSProperties} />)}
    </div>,
    document.body,
  )
}

/** Kardec's House: the corridor in the dark behind the page, candles flickering; the pointer carries a lamp */
function MansionBackdrop() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => { ref.current?.style.setProperty('--mx', `${e.clientX}px`); ref.current?.style.setProperty('--my', `${e.clientY}px`) })
    }
    window.addEventListener('pointermove', on, { passive: true })
    return () => { window.removeEventListener('pointermove', on); cancelAnimationFrame(raf) }
  }, [])
  return createPortal(
    <div className="gs-mansion" ref={ref} aria-hidden style={{ backgroundImage: `url(${still('kardec', '110')})` }}>
      <div className="gs-mansion-dark" />
      {[[8, 22], [50, 20], [93, 24]].map(([x, y]) => <i key={x} className="gs-candle" style={{ left: `${x}%`, top: `${y}%` }} />)}
      <div className="gs-grain" />
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ the video, by chapters */

function ChapterPlayer({ id }: { id: StoryId }) {
  const { lang } = useI18n()
  const u = ui[lang]
  const v = stories[id].video
  const video = useRef<HTMLVideoElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(v.duration)
  const current = useMemo(() => { let c = 0; v.chapters.forEach((ch, i) => { if (t >= ch.t) c = i }); return c }, [t, v.chapters])

  const pending = useRef<number | null>(null) // a chapter picked before the video element existed
  const go = (ch: Chapter) => {
    const el = video.current
    if (!el) { pending.current = ch.t; setStarted(true); return }
    el.currentTime = ch.t
    el.play().catch(() => {})
  }
  const toggle = () => { const el = video.current; if (!el) return; if (el.paused) el.play().catch(() => {}); else el.pause() }
  const seek = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), el = video.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur
  }

  return (
    <section className="gs-card gs-player" aria-label={u.chapters}>
      <div className="gs-screen" ref={box}>
        {started
          ? <video ref={video} src={v.src} poster={v.poster} playsInline autoPlay muted={muted} preload="metadata"
              onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => { setDur(e.currentTarget.duration || v.duration); if (pending.current !== null) { e.currentTarget.currentTime = pending.current; pending.current = null } }} onClick={toggle} />
          : <button type="button" className="gs-start" style={{ backgroundImage: `url(${v.poster})` }} onClick={() => go(v.chapters[0])}>
              <span className="gs-start-btn"><i aria-hidden /> {u.watch} · {fmt(v.duration)}</span>
            </button>}
      </div>
      <div className="gs-bar">
        <button type="button" onClick={started ? toggle : () => go(v.chapters[0])} aria-label={playing ? u.pause : u.play}>{playing ? '❚❚' : '▶'}</button>
        <div className="gs-track" onPointerDown={started ? seek : undefined} role="presentation">
          <span className="gs-fill" style={{ width: `${(t / dur) * 100}%` }} />
          {v.chapters.map((ch) => <i key={ch.t} className="gs-tick" style={{ left: `${(ch.t / dur) * 100}%` }} />)}
        </div>
        <span className="gs-time">{fmt(t)} / {fmt(dur)}</span>
        <button type="button" onClick={() => setMuted((m) => !m)} disabled={!started}>{muted ? u.unmute : u.mute}</button>
        <button type="button" onClick={() => box.current?.requestFullscreen?.().catch(() => {})} disabled={!started} aria-label={u.full}>⛶</button>
      </div>
      <ol className="gs-chapters">
        {v.chapters.map((ch, i) => (
          <li key={ch.t}>
            <button type="button" className={started && i === current ? 'on' : ''} onClick={() => go(ch)}>
              <small>{fmt(ch.t)}</small>{ch.label[lang]}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ------------------------------------------------------------------ Memorize It!: the mechanic as a mini game */

type Coin = { id: number; x: number; y: number; old: boolean; hit?: boolean }
type MgPhase = 'intro' | 'look' | 'shoot' | 'wrong' | 'clear' | 'won'
const LEVELS = 5

/** spread n coins over a 6×3 grid of the room, never two in one cell, with a little jitter */
function layout(n: number, avoid: Coin[] = []): { x: number; y: number }[] {
  const cells: [number, number][] = []
  for (let c = 0; c < 6; c++) for (let r = 0; r < 3; r++) cells.push([c, r])
  const used = new Set(avoid.map((a) => `${Math.floor((a.x - 8) / 14)},${Math.floor((a.y - 14) / 22)}`))
  const free = cells.filter(([c, r]) => !used.has(`${c},${r}`)).sort(() => Math.random() - 0.5)
  return free.slice(0, n).map(([c, r]) => ({ x: 8 + c * 14 + Math.random() * 6, y: 14 + r * 22 + Math.random() * 8 }))
}

function MemoryGame() {
  const { lang } = useI18n()
  const u = ui[lang].mg
  const [phase, setPhase] = useState<MgPhase>('intro')
  const [level, setLevel] = useState(1)
  const [coins, setCoins] = useState<Coin[]>([])
  const timer = useRef(0)

  const room = useCallback((lv: number) => {
    window.clearTimeout(timer.current)
    const olds = layout(1 + lv).map((p, i) => ({ id: i, ...p, old: true }))
    setCoins(olds)
    setPhase('look')
    // the next room: the same coins in the same places, plus new ones elsewhere
    timer.current = window.setTimeout(() => {
      const news = layout(1 + Math.ceil(lv / 2), olds).map((p, i) => ({ id: 100 + i, ...p, old: false }))
      setCoins([...olds, ...news])
      setPhase('shoot')
    }, 1600 + lv * 450)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const shoot = (c: Coin) => {
    if (phase !== 'shoot' || c.hit) return
    if (!c.old) { setPhase('wrong'); timer.current = window.setTimeout(() => room(level), 1300); return }
    const next = coins.map((k) => (k.id === c.id ? { ...k, hit: true } : k))
    setCoins(next)
    if (next.filter((k) => k.old && !k.hit).length === 0) {
      if (level >= LEVELS) { setPhase('won'); return }
      setPhase('clear')
      timer.current = window.setTimeout(() => { setLevel(level + 1); room(level + 1) }, 1100)
    }
  }
  const start = () => { setLevel(1); room(1) }

  const msg = phase === 'look' ? u.look : phase === 'shoot' ? u.shoot : phase === 'wrong' ? u.wrong : phase === 'clear' ? u.next : phase === 'won' ? u.won : ''
  return (
    <section className="gs-card gs-mg">
      <header className="gs-head"><span className="meta">Memorize It!</span><h2>{u.title}</h2><p>{u.intro}</p></header>
      <div className={`gs-room is-${phase}`}>
        <span className="gs-room-hud meta">{u.level} {level}/{LEVELS}</span>
        {coins.map((c) => (
          <motion.button
            key={`${level}-${c.id}`} type="button" className={`gs-mgcoin${c.hit ? ' hit' : ''}${phase === 'wrong' && !c.old ? ' bad' : ''}`}
            style={{ left: `${c.x}%`, top: `${c.y}%` }} aria-label={u.coin} onClick={() => shoot(c)} disabled={phase !== 'shoot'}
            initial={{ scale: 0, opacity: 0 }} animate={c.hit ? { scale: 1.6, opacity: 0 } : { scale: 1, opacity: 1 }} transition={{ duration: c.hit ? 0.3 : 0.35, ease }}
          />
        ))}
        {(phase === 'intro' || phase === 'won') && (
          <div className="gs-room-cta">
            {phase === 'won' && <strong>{u.won}</strong>}
            <button type="button" onClick={start}>{phase === 'won' ? u.again : u.start}</button>
          </div>
        )}
        <p className="gs-room-msg" role="status">{phase !== 'intro' && phase !== 'won' ? msg : ''}</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ Kardec's House: the opening and the lantern */

function Dialogue() {
  const { lang } = useI18n()
  const u = ui[lang].dlg
  const [i, setI] = useState(0)
  const [n, setN] = useState(0) // characters typed
  const line = KARDEC_LINES[i]
  const done = n >= line.line.length
  useEffect(() => {
    if (done) return
    const id = window.setTimeout(() => setN((k) => k + 1), 34)
    return () => window.clearTimeout(id)
  }, [n, done])
  const next = useCallback(() => {
    if (!done) { setN(line.line.length); return }
    if (i < KARDEC_LINES.length - 1) { setI(i + 1); setN(0) }
  }, [done, i, line.line.length])
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === 'e' || e.key === 'E') && box.current && box.current.getBoundingClientRect().top < window.innerHeight && box.current.getBoundingClientRect().bottom > 0) next()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [next])
  const scene = i < 3 ? '040' : '080'
  const last = i === KARDEC_LINES.length - 1 && done
  return (
    <section className="gs-card gs-dlg">
      <header className="gs-head"><span className="meta">Kardec’s House</span><h2>{u.title}</h2><p>{u.intro}</p></header>
      <div className="gs-dlg-scene" ref={box} onClick={next} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next() } }}>
        <AnimatePresence mode="wait">
          <motion.img key={scene} src={still('kardec', scene)} alt="" loading="lazy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} />
        </AnimatePresence>
        {/* Hannah's own sprite (from Ana's Canva page) stands by the box while she speaks */}
        <img className={`gs-dlg-portrait${line.who === 'Hannah' ? ' on' : ''}`} src={hannahSprite} alt="" loading="lazy" />
        <div className="gs-dlg-box" aria-live="polite">
          <p><b>{line.who}:</b> {line.line.slice(0, n)}<span className="gs-caret" aria-hidden /></p>
          {last
            ? <button type="button" onClick={(e) => { e.stopPropagation(); setI(0); setN(0) }}>{u.restart} ↺</button>
            : <span className="gs-dlg-next">{u.next.split('E').map((part, k, arr) => <span key={k}>{part}{k < arr.length - 1 && <kbd>E</kbd>}</span>)}</span>}
        </div>
      </div>
    </section>
  )
}

/** a dark corridor (the eye scene) lit only around the pointer; two things to find */
const FINDS = [{ key: 'eye', x: 41, y: 66, r: 11 }, { key: 'hannah', x: 15, y: 76, r: 8 }] as const
function Lantern() {
  const { lang } = useI18n()
  const u = ui[lang].lamp
  const ref = useRef<HTMLDivElement>(null)
  const [found, setFound] = useState<string[]>([])
  const [note, setNote] = useState('')
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100
    ref.current?.style.setProperty('--lx', `${x}%`); ref.current?.style.setProperty('--ly', `${y}%`)
    for (const f of FINDS) {
      if (found.includes(f.key)) continue
      if (Math.hypot(x - f.x, (y - f.y) * (r.height / r.width)) < f.r) {
        const now = [...found, f.key]
        setFound(now)
        setNote(now.length === FINDS.length ? u.all : u[f.key])
      }
    }
  }
  return (
    <section className="gs-card gs-lamp">
      <header className="gs-head"><span className="meta">Kardec’s House</span><h2>{u.title}</h2><p>{u.intro}</p></header>
      <div className={`gs-lamp-scene${found.length === FINDS.length ? ' all' : ''}`} ref={ref} onPointerMove={move} onPointerDown={move}>
        <img src={still('kardec', '126')} alt="" loading="lazy" />
        <div className="gs-lamp-dark" />
        <span className="gs-lamp-count meta">{found.length}/{FINDS.length} {u.found}</span>
        <AnimatePresence>{note && <motion.p key={note} className="gs-lamp-note" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{note}</motion.p>}</AnimatePresence>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ gallery + lightbox */

function Gallery({ id, label }: { id: StoryId; label: string }) {
  const { lang } = useI18n()
  const u = ui[lang]
  const all = stories[id].stills
  const tags = id === 'kardec'
  const [tag, setTag] = useState<'all' | 'game' | 'dev'>('all')
  const list = all.filter((s) => tag === 'all' || s.tag === tag)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => {
    if (open === null) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((o) => (o === null ? o : (o + 1) % list.length))
      if (e.key === 'ArrowLeft') setOpen((o) => (o === null ? o : (o - 1 + list.length) % list.length))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, list.length])
  return (
    <section className="gs-card gs-gallery">
      <header className="gs-head gs-gallery-head">
        <h2>{label}</h2>
        {tags && (
          <div className="gs-filters" role="group">
            {(['all', 'game', 'dev'] as const).map((k) => <button key={k} type="button" className={tag === k ? 'on' : ''} onClick={() => setTag(k)}>{u[k]}</button>)}
          </div>
        )}
      </header>
      <motion.ul layout className="gs-shots">
        <AnimatePresence initial={false}>
          {list.map((s, i) => (
            <motion.li key={s.file} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.35, ease }}
              style={{ '--r': `${((i * 37) % 7) - 3}deg` } as CSSProperties}>
              <button type="button" onClick={() => setOpen(i)}>
                <img src={still(id, s.file)} alt={s.caption[lang]} loading="lazy" />
                <span>{s.caption[lang]}</span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {createPortal(
        <AnimatePresence>
          {open !== null && list[open] && (
            <motion.div key="lb" className={`gs-lb gs-lb-${id}`} role="dialog" aria-modal="true" aria-label={list[open].caption[lang]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
              <motion.figure key={list[open].file} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease }} onClick={(e) => e.stopPropagation()}>
                <img src={still(id, list[open].file)} alt={list[open].caption[lang]} />
                <figcaption>{list[open].caption[lang]} <small>{open + 1}/{list.length}</small></figcaption>
              </motion.figure>
              <button type="button" className="gs-lb-prev" aria-label={u.prev} onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + list.length) % list.length) }}>←</button>
              <button type="button" className="gs-lb-next" aria-label={u.next} onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % list.length) }}>→</button>
              <button type="button" className="gs-lb-x" aria-label={u.close} onClick={() => setOpen(null)}>×</button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </section>
  )
}
