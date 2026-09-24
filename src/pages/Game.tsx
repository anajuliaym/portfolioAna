import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { TITLE_URLS } from '../components/titles'
import FragmentsDossier from '../components/FragmentsDossier'
import { games, ROUTES, ui } from './content'
import { fragmentsGame } from './fragments'
import fragmentsTitle from '../assets/titles/01-fragments.jpg?url'

// build-time constant: in the Fragments-only build Rollup drops the other games and their title images
const ONLY_FRAGMENTS = import.meta.env.VITE_ONLY === 'fragments'

/**
 * One game, reached by inserting a coin in its arcade cabinet: /jogos/1, /jogos/2…
 * With `only`, the page stands alone (the Fragments-only build): the game is picked by its
 * dossier, and there is no arcade to go back to.
 */
export default function Game({ only }: { only?: 'fragments' }) {
  const { lang, t } = useI18n()
  const { n } = useParams()
  const list = ONLY_FRAGMENTS ? [fragmentsGame[lang]] : games[lang]
  const posters = ONLY_FRAGMENTS ? [fragmentsTitle] : TITLE_URLS
  const i = only ? list.findIndex((g) => g.dossier === only) : Number(n) - 1
  const [playing, setPlaying] = useState(false)
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return <Navigate to={ROUTES.games} replace />
  const g = list[i]
  const link = g.link && g.link !== '#' ? g.link : null
  const garden = g.dossier === 'fragments'
  return (
    <PageShell index={only ? undefined : `05.${i + 1}`} title={g.title} backTo={only ? null : ROUTES.games} backLabel={t('gw_back_arcade')} className={garden ? 'garden' : ''}>
      <div className="game-page">
        <span className="meta">{g.engine} · {g.platform} · {g.year}</span>
        {g.embed && <Embed src={g.embed} poster={posters[i]} title={g.title} onPlaying={setPlaying} />}
        {/* games without a playable build show their title screen instead of an embed */}
        {!g.embed && posters[i] && <img className="game-poster" src={posters[i]} alt={g.title} loading="lazy" />}
        {link
          ? <a className="btn" href={link} target="_blank" rel="noopener">{g.embed ? t('gw_external') : ui[lang].play} ↗</a>
          : !g.embed && !posters[i] && <span className="meta game-soon">{t('coming')}</span>}
        {garden ? <FragmentsDossier paused={playing} /> : <p>{g.desc}</p>}
      </div>
    </PageShell>
  )
}

/**
 * The game itself, running in the GX.games runner — but only after the visitor presses play:
 * until then it is a poster, so nothing loads or makes a sound on arrival. Once started, the
 * runner has no audio API we can reach (cross-origin), so we do not grant autoplay: sound
 * begins only after the visitor interacts inside the game.
 * Keyboard: the runner calls preventDefault on mousedown, so a click inside the iframe never
 * moves focus into it and keys keep going to our page. We focus it by hand and keep a
 * transparent "click to play" layer that comes back whenever focus leaves the game.
 */
function Embed({ src, poster, title, onPlaying }: { src: string; poster?: string; title: string; onPlaying: (v: boolean) => void }) {
  const { t } = useI18n()
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [started, setStarted] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [focused, setFocused] = useState(false)
  // one play session id per visit, like the GX.games page would generate
  const url = useMemo(() => `${src}&gamePlayId=${crypto.randomUUID()}`, [src])
  const grab = () => { frame.current?.focus(); setFocused(document.activeElement === frame.current) }
  useEffect(() => {
    const onBlur = () => { if (document.activeElement === frame.current) setFocused(true) }
    const onFocus = () => setFocused(false)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => { window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus) }
  }, [])
  // while the game is loaded, the rest of the page goes quiet: the 3D garden freezes and the grain
  // stops, so the runner keeps the GPU/CPU it needs and its audio does not crackle
  useEffect(() => {
    onPlaying(started)
    document.body.classList.toggle('game-running', started)
    return () => document.body.classList.remove('game-running')
  }, [started, onPlaying])
  const full = () => { box.current?.requestFullscreen?.().then(grab).catch(() => {}) }
  return (
    <div className="game-embed-wrap">
      <div className="game-embed" ref={box} style={poster && !loaded ? { backgroundImage: `url(${poster})` } : undefined}>
        {started && (
          <iframe
            ref={frame}
            src={url}
            title={title}
            allow="cross-origin-isolated; fullscreen; gamepad"
            allowFullScreen
            scrolling="no"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => { setLoaded(true); grab() }}
          />
        )}
        {!started && (
          <button type="button" className="game-start" onClick={() => setStarted(true)}>
            <span className="game-start-btn"><i /> {t('gw_play_here')}</span>
          </button>
        )}
        {started && !loaded && <span className="meta game-embed-loading">{t('gw_loading')}</span>}
        {loaded && !focused && (
          <button type="button" className="game-focus" onPointerDown={(e) => { e.preventDefault(); grab() }} aria-label={t('gw_click_play')}>
            <span className="meta">{t('gw_click_play')}</span>
          </button>
        )}
      </div>
      <div className="game-embed-bar">
        <span className="meta">{!started ? t('gw_sound_hint') : focused ? t('gw_embed_on') : t('gw_embed_hint')}</span>
        <button type="button" className="meta" onClick={full} disabled={!started}>{t('gw_full')} ⛶</button>
      </div>
    </div>
  )
}
