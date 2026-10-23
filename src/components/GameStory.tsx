import { useEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'
import { stories, type StoryId } from '../pages/gameStories'
import hallsArt from '../assets/games/kardec-halls.webp'

/**
 * The page body for Memorize It! and Kardec's House. Second version (2026-10-23, Ana: "não quero imagens estáticas, nem
 * mini-jogo, nem timeline: só o vídeo do jogo tocando em loop, como a primeira coisa, e o texto; cards como os do
 * Fragments; as lanternas atrás mais presentes"). So: each game's world behind the page (a pixel forest / the
 * candle-lit corridor of the house with a lamp at the pointer), the gameplay looping silently in a framed screen (sound
 * on request), then the story on Fragments' paper card. Copy in pages/gameStories.ts.
 */

const ease = [0.16, 1, 0.3, 1] as const

export default function GameStory({ id }: { id: StoryId }) {
  const { lang } = useI18n()
  const s = stories[id]
  return (
    <div className={`gs gs-${id}`}>
      {id === 'memorize' ? <ForestBackdrop /> : <MansionBackdrop />}
      <GameVideo id={id} />
      <motion.section className="paper gs-about" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7, ease }}>
        <span className="meta frag-kicker">{s.kicker[lang]}</span>
        <div className="frag-about-grid">
          <div className="frag-text">{s.about[lang].map((p, i) => <p key={i}>{p}</p>)}</div>
          <dl className="frag-facts">{s.facts[lang].map(([k, v]) => <div key={k}><dt className="meta">{k}</dt><dd>{v}</dd></div>)}</dl>
        </div>
      </motion.section>
    </div>
  )
}

/**
 * the gameplay, playing on a loop without sound while it is on screen, with the browser's own controls (Ana,
 * 2026-10-23: "coloque os controles de visualização: pausar, voltar etc."): play/pause, the timeline to scrub, sound,
 * full screen. Scrolling away pauses it; coming back resumes it, unless the visitor paused it themselves.
 */
function GameVideo({ id }: { id: StoryId }) {
  const v = stories[id].video
  const ref = useRef<HTMLVideoElement>(null)
  const userPaused = useRef(false)
  const auto = useRef(false) // the pause/play we cause ourselves, not to be read as the visitor's choice
  const reduce = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return
    const io = new IntersectionObserver(([e]) => {
      auto.current = true
      if (e.isIntersecting && !userPaused.current) el.play().catch(() => {}).finally(() => { auto.current = false })
      else if (!e.isIntersecting) { el.pause(); auto.current = false }
      else auto.current = false
    }, { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [reduce])
  return (
    <motion.figure className="gs-video" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.3 }}>
      <video
        ref={ref} src={v.src} poster={v.poster} muted loop playsInline controls preload="metadata" controlsList="nodownload"
        onPause={() => { if (!auto.current) userPaused.current = true }}
        onPlay={() => { if (!auto.current) userPaused.current = false }}
        aria-label={id === 'memorize' ? 'Memorize It! gameplay' : 'Kardec’s House gameplay'}
      />
    </motion.figure>
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
      {/* the forest floor: green under the front pines, so no sky shows above the ground however far the page scrolls */}
      <div className="gs-grass" />
      <svg className="gs-l gs-l4" viewBox="0 0 800 200" preserveAspectRatio="xMidYMax slice">{Array.from({ length: 28 }, (_, i) => pine(i * 29 + 10, 110 + ((i * 53) % 50), i % 2 ? '#3f6b50' : '#4d7d5c'))}</svg>
      <div className="gs-ground" />
      {[6, 31, 58, 88].map((x, i) => <i key={x} className="gs-coin" style={{ left: `${x}%`, top: `${46 + ((i * 17) % 22)}%`, animationDelay: `${i * 0.7}s` } as CSSProperties} />)}
    </div>,
    document.body,
  )
}

/** Kardec's House: the candle-lit corridor of the house behind the page, the candles glowing; the pointer carries a lamp */
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
    <div className="gs-mansion" ref={ref} aria-hidden>
      {/* the corridor frame sits as a 16:9 picture covering the screen; the candle glows ride on it at the candles' spots */}
      <div className="gs-mansion-pic" style={{ backgroundImage: `url(${hallsArt})` }}>
        {[[35, 30], [78, 31], [92, 31]].map(([x, y]) => <i key={x} className="gs-candle" style={{ left: `${x}%`, top: `${y}%` }} />)}
      </div>
      <div className="gs-mansion-dark" />
      <div className="gs-grain" />
    </div>,
    document.body,
  )
}
