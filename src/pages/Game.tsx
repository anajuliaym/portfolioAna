import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { TITLE_URLS } from '../components/Arcade'
import FragmentsDossier from '../components/FragmentsDossier'
import { games, ROUTES, ui } from './content'

/** One game, reached by inserting a coin in its arcade cabinet: /jogos/1, /jogos/2… */
export default function Game() {
  const { lang, t } = useI18n()
  const { n } = useParams()
  const i = Number(n) - 1
  const list = games[lang]
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return <Navigate to={ROUTES.games} replace />
  const g = list[i]
  const link = g.link && g.link !== '#' ? g.link : null
  return (
    <PageShell index={`05.${i + 1}`} title={g.title} backTo={ROUTES.games} backLabel={t('gw_back_arcade')}>
      <div className="game-page">
        <span className="meta">{g.engine} · {g.platform} · {g.year}</span>
        {g.embed && <Embed src={g.embed} poster={TITLE_URLS[i]} title={g.title} />}
        {link
          ? <a className="btn" href={link} target="_blank" rel="noopener">{g.embed ? t('gw_external') : ui[lang].play} ↗</a>
          : !g.embed && <span className="meta game-soon">{t('coming')}</span>}
        {g.dossier === 'fragments' ? <FragmentsDossier /> : <p>{g.desc}</p>}
      </div>
    </PageShell>
  )
}

/**
 * The game itself, running in the GX.games runner. Poster until the runner reports load.
 * Keyboard: the runner calls preventDefault on mousedown, so a click inside the iframe never
 * moves focus into it and keys keep going to our page. A transparent layer takes the first click,
 * focuses the iframe by hand and gets out of the way; it comes back whenever focus leaves the game.
 */
function Embed({ src, poster, title }: { src: string; poster?: string; title: string }) {
  const { t } = useI18n()
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [focused, setFocused] = useState(false)
  // one play session id per visit, like the GX.games page would generate
  const url = useMemo(() => `${src}&gamePlayId=${crypto.randomUUID()}`, [src])
  const grab = () => { frame.current?.focus(); setFocused(document.activeElement === frame.current) }
  useEffect(() => {
    // the parent window blurs when the iframe takes focus, and focuses again when the user clicks elsewhere
    const onBlur = () => { if (document.activeElement === frame.current) setFocused(true) }
    const onFocus = () => setFocused(false)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => { window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus) }
  }, [])
  const full = () => { box.current?.requestFullscreen?.().then(grab).catch(() => {}) }
  return (
    <div className="game-embed-wrap">
      <div className="game-embed" ref={box} style={poster && !loaded ? { backgroundImage: `url(${poster})` } : undefined}>
        <iframe
          ref={frame}
          src={url}
          title={title}
          allow="cross-origin-isolated; autoplay; fullscreen; gamepad"
          allowFullScreen
          scrolling="no"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => { setLoaded(true); grab() }}
        />
        {!loaded && <span className="meta game-embed-loading">{t('gw_loading')}</span>}
        {loaded && !focused && (
          <button type="button" className="game-focus" onPointerDown={(e) => { e.preventDefault(); grab() }} aria-label={t('gw_click_play')}>
            <span className="meta">{t('gw_click_play')}</span>
          </button>
        )}
      </div>
      <div className="game-embed-bar">
        <span className="meta">{focused ? t('gw_embed_on') : t('gw_embed_hint')}</span>
        <button type="button" className="meta" onClick={full}>{t('gw_full')} ⛶</button>
      </div>
    </div>
  )
}
