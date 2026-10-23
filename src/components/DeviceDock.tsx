import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n'
import type { Proto } from '../pages/content'
import type { Mode } from './Devices'

const ease = [0.16, 1, 0.3, 1] as const

/**
 * The device you are "holding": a CSS phone or notebook frame that fades in over the 3D scene once the
 * camera has flown to the device, with the prototype list inside and each prototype opening in place —
 * Figma embed, screenshots, or a placeholder. Crisp, scrollable, and the iframe stays interactive.
 */
/**
 * Retired as an overlay (Ana, 2026-10-15: "é para visualizar no próprio modelo, não numa versão ilustrada"):
 * the prototypes now render on the 3D devices' screens (see Stage in Devices.tsx). What is left here is
 * the exit button and the `Screen` component itself.
 */
export default function DeviceDock({ mode, onExit }: { mode: Mode; onExit: () => void }) {
  const { t } = useI18n()
  // portalled like FlatScreen, so it stays above the full-screen panel on phones (the page wrapper is its own layer)
  return createPortal(
    <AnimatePresence>
      {mode && (
        <motion.button type="button" key="exit" className="dv-exit" onClick={onExit} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, delay: 0.5 }}>
          ← {t('pj_exit')}
        </motion.button>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** the same screen as a flat panel over the device, on touch / narrow screens (see useFlatScreens in Devices.tsx); it
 *  powers on like the 3D one once the camera has arrived */
export function FlatScreen({ kind, items, label }: { kind: 'mobile' | 'web'; items: Proto[]; label: string }) {
  const [lit, setLit] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => setLit(true), 700); return () => window.clearTimeout(t) }, [])
  // portalled to <body>: a transformed/filtered ancestor would turn position: fixed into absolute
  return createPortal(
    <div className={`dv3 dv3-flat ${kind === 'mobile' ? 'dv3-mobile' : 'dv3-web dv3-narrow'}${lit ? ' lit' : ''}`}>
      <div className="dv3-content"><Screen kind={kind} items={items} label={label} /></div>
      <div className="dv3-glass" aria-hidden />
    </div>,
    document.body,
  )
}

/** the prototype list / viewer — rendered on the 3D device's own screen (Html transform in Devices.tsx) */
export function Screen({ kind, items, label }: { kind: 'mobile' | 'web'; items: Proto[]; label: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<Proto | null>(null)
  useEffect(() => setOpen(null), [kind])
  if (open?.app) return <LiveApp proto={open} kind={kind} onBack={() => setOpen(null)} />
  if (open) {
    const figma = open.embed ? decodeURIComponent(open.embed.split('url=')[1] ?? '') : ''
    return (
      <div className="dv-view">
        <header className="dv-bar">
          <button type="button" onClick={() => setOpen(null)}>← {t('pj_back')}</button>
          <span>{open.title}</span>
          {figma && <a href={figma} target="_blank" rel="noopener">{t('pj_open_figma')} ↗</a>}
          {!figma && open.internal && <em className="dv-internal">{t('pj_internal')}</em>}
        </header>
        {open.embed
          ? <iframe className="dv-frame" src={open.embed} title={open.title} allowFullScreen />
          : open.video || open.shots?.length
            ? <div className={`dv-shots ${kind}`}>
                {/* a muted looping screen recording: the prototype in use, without giving access to it */}
                {open.video && <video src={open.video} poster={open.cover} muted autoPlay loop playsInline controls={false} />}
                {open.shots?.map((s) => <img key={s} src={s} alt="" loading="lazy" />)}
              </div>
            : <div className="dv-empty"><span className="meta">{t('pj_empty')}</span><p>{open.desc}</p></div>}
      </div>
    )
  }
  const live = items.some((p) => p.app)
  return (
    <div className={`dv-list${live ? ' has-apps' : ''}`}>
      <header className="dv-list-head">
        <span className="meta">{label}</span><strong>{items.length} {t(items.length === 1 ? 'pj_list_one' : 'pj_list')}</strong>
        {live && <p className="dv-list-hint">{t('pj_apps_hint')}</p>}
      </header>
      <ul>
        {items.map((p, i) => (
          <motion.li key={p.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.07, duration: 0.5, ease }}>
            {p.app
              // a live app: an app-store style card in the app's own colour, icon, live badge and an "open" pill
              ? <button type="button" className="dv-card" style={{ '--acc': p.accent ?? '#f2a0b4' } as React.CSSProperties} onClick={() => setOpen(p)}>
                  <span className="dv-card-top">
                    <span className="dv-icon" aria-hidden>{p.cover && <img src={p.cover} alt="" loading="lazy" />}</span>
                    <span className="dv-card-id"><strong>{p.title}</strong><em className={`dv-live${p.prototype ? ' is-proto' : ''}`}>{t(p.prototype ? 'pj_badge_proto' : 'pj_badge')}</em></span>
                    <span className="dv-get">{t('pj_get')}</span>
                  </span>
                  <small className="dv-desc">{p.desc}</small>
                  <span className="dv-tags">{p.tags.map((x) => <i key={x}>{x}</i>)}</span>
                </button>
              : <button type="button" onClick={() => setOpen(p)}>
                  <span className="dv-thumb" aria-hidden>{p.cover && <img src={p.cover} alt="" loading="lazy" />}</span>
                  <span className="dv-body"><strong>{p.title}</strong><small>{p.desc}</small><span className="dv-tags">{p.tags.map((x) => <i key={x}>{x}</i>)}</span></span>
                  <span className="dv-go">→</span>
                </button>}
          </motion.li>
        ))}
        {/* Ana, 2026-10-22: there is more work, made at her current company and confidential for now — said, not shown */}
        <motion.li className="dv-more" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + items.length * 0.07, duration: 0.5, ease }}>
          <span className="dv-more-lock" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          </span>
          <span className="dv-more-text"><strong>{t('pj_more_title')}</strong><small>{t('pj_more_body')}</small></span>
        </motion.li>
      </ul>
    </div>
  )
}

/**
 * A real app running on the phone (Bora?, 2026-10-22: Ana chose "app real navegável" but worried about weight): the
 * iframe only exists once the visitor opens it, so the portfolio pays nothing until then. A status-bar strip either side
 * of the island carries "back" and "about"; "about" slides the write-up up over the running app (the app keeps its
 * state underneath).
 */
function LiveApp({ proto, kind, onBack }: { proto: Proto; kind: 'mobile' | 'web'; onBack: () => void }) {
  const { t } = useI18n()
  const [loaded, setLoaded] = useState(false)
  const [about, setAbout] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const a = proto.about
  // Chrome does not scroll an iframe that sits inside a CSS 3D transform (drei's Html transform = the phone's screen):
  // the wheel arrives but nothing moves (Ana, 2026-10-22: "não consigo dar scroll dentro do app"). Scroll it by hand,
  // whichever document receives the wheel — the app's own (same origin) or ours over the iframe.
  useEffect(() => {
    const f = frame.current, host = body.current
    if (!loaded || !f || !host) return
    const doc = f.contentDocument, win = f.contentWindow
    if (!doc || !win) return
    const scrollFrom = (start: Element | null, dy: number, dx: number) => {
      for (let el = start; el && el !== doc.documentElement; el = el.parentElement) {
        const st = win.getComputedStyle(el)
        const canY = /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 1
        const canX = /(auto|scroll)/.test(st.overflowX) && el.scrollWidth > el.clientWidth + 1
        if ((canY && dy && (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0)) ||
            (canX && dx && (dx > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 0))) {
          el.scrollBy({ top: dy, left: dx }); return true
        }
      }
      const root = doc.scrollingElement
      if (root && root.scrollHeight > root.clientHeight + 1) { root.scrollBy({ top: dy, left: dx }); return true }
      return false
    }
    const px = (e: WheelEvent, v: number) => e.deltaMode === 1 ? v * 16 : e.deltaMode === 2 ? v * win.innerHeight : v
    // inside the app: from what is under the pointer (maps, the album and other gesture surfaces keep their own wheel)
    const inner = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey) return
      if (scrollFrom(e.target as Element, px(e, e.deltaY), px(e, e.deltaX))) e.preventDefault()
    }
    // over the iframe in our document: map the pointer onto the app (the screen plane faces the camera, so the
    // bounding box is a fair approximation) and scroll from there
    const outer = (e: WheelEvent) => {
      if (e.ctrlKey) return
      const r = f.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * win.innerWidth, y = ((e.clientY - r.top) / r.height) * win.innerHeight
      if (scrollFrom(doc.elementFromPoint(x, y), px(e, e.deltaY), px(e, e.deltaX))) e.preventDefault()
    }
    win.addEventListener('wheel', inner, { passive: false })
    host.addEventListener('wheel', outer, { passive: false })
    return () => { win.removeEventListener('wheel', inner); host.removeEventListener('wheel', outer) }
  }, [loaded])
  return (
    <div className={`dv-app ${kind}${proto.appBar?.dark ? ' is-dark' : ''}`} style={proto.appBar ? { background: proto.appBar.bg } : undefined}>
      <header className="dv-app-bar">
        {/* on the MacBook the strip reads as a browser bar: back, the app's name, about */}
        {kind === 'web' && <span className="dv-app-url">{proto.title}</span>}
        <button type="button" onClick={onBack} aria-label={t('pj_back')}>←</button>
        {a && <button type="button" onClick={() => setAbout((v) => !v)} aria-expanded={about}>{about ? '✕' : 'ⓘ'} {t('pj_about')}</button>}
      </header>
      <div className="dv-app-body" ref={body}>
        {/* camera: the app asks for it on its own camera screen; same-origin build of Ana's own code */}
        <iframe ref={frame} className={`dv-app-frame${loaded ? ' is-loaded' : ''}`} src={proto.app} title={proto.title} allow="camera" onLoad={() => setLoaded(true)} />
        {!loaded && <div className="dv-app-wait" aria-hidden><span /></div>}
        {a && (
          <AnimatePresence>
            {about && (
              <motion.section className="dv-about" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.55, ease }} aria-label={t('pj_about')}>
                <span className="meta">{proto.prototype ? t('pj_badge_proto') : t('pj_live')}</span>
                <h3>{proto.title}</h3>
                <p className="dv-about-lead">{a.lead}</p>
                <ul>{a.points.map((x) => <li key={x}>{x}</li>)}</ul>
                <span className="meta">{t('pj_stack')}</span>
                <div className="dv-tags">{a.stack.map((x) => <i key={x}>{x}</i>)}</div>
                {a.note && <p className="dv-about-note">{a.note}</p>}
                <button type="button" className="dv-about-close" onClick={() => setAbout(false)}>{t('pj_about_close')} ↓</button>
              </motion.section>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
