import { useEffect, useState } from 'react'
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
  return (
    <AnimatePresence>
      {mode && (
        <motion.button type="button" key="exit" className="dv-exit" onClick={onExit} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, delay: 0.5 }}>
          ← {t('pj_exit')}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/** the prototype list / viewer — rendered on the 3D device's own screen (Html transform in Devices.tsx) */
export function Screen({ kind, items, label }: { kind: 'mobile' | 'web'; items: Proto[]; label: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<Proto | null>(null)
  useEffect(() => setOpen(null), [kind])
  if (open?.app) return <LiveApp proto={open} onBack={() => setOpen(null)} />
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
  return (
    <div className="dv-list">
      <header className="dv-list-head"><span className="meta">{label}</span><strong>{items.length} {t('pj_list')}</strong></header>
      <ul>
        {items.map((p, i) => (
          <motion.li key={p.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.07, duration: 0.5, ease }}>
            <button type="button" onClick={() => setOpen(p)}>
              <span className="dv-thumb" aria-hidden>{p.cover && <img src={p.cover} alt="" loading="lazy" />}</span>
              <span className="dv-body"><strong>{p.title}</strong><small>{p.desc}</small><span className="dv-tags">{p.tags.map((x) => <i key={x}>{x}</i>)}</span></span>
              <span className="dv-go">→</span>
            </button>
          </motion.li>
        ))}
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
function LiveApp({ proto, onBack }: { proto: Proto; onBack: () => void }) {
  const { t } = useI18n()
  const [loaded, setLoaded] = useState(false)
  const [about, setAbout] = useState(false)
  const a = proto.about
  return (
    <div className="dv-app">
      <header className="dv-app-bar">
        <button type="button" onClick={onBack} aria-label={t('pj_back')}>←</button>
        {a && <button type="button" onClick={() => setAbout((v) => !v)} aria-expanded={about}>{about ? '✕' : 'ⓘ'} {t('pj_about')}</button>}
      </header>
      <div className="dv-app-body">
        {/* camera: the app asks for it on its own camera screen; same-origin build of Ana's own code */}
        <iframe className={`dv-app-frame${loaded ? ' is-loaded' : ''}`} src={proto.app} title={proto.title} allow="camera" onLoad={() => setLoaded(true)} />
        {!loaded && <div className="dv-app-wait" aria-hidden><span /></div>}
        {a && (
          <AnimatePresence>
            {about && (
              <motion.section className="dv-about" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.55, ease }} aria-label={t('pj_about')}>
                <span className="meta">{t('pj_live')}</span>
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
