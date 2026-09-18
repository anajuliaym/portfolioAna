import { useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { TITLE_URLS } from '../components/Arcade'
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
        <p>{g.desc}</p>
        {link
          ? <a className="btn" href={link} target="_blank" rel="noopener">{g.embed ? t('gw_external') : ui[lang].play} ↗</a>
          : !g.embed && <span className="meta game-soon">{t('coming')}</span>}
      </div>
    </PageShell>
  )
}

/** The game itself, running in the GX.games runner. Poster until the runner reports load. */
function Embed({ src, poster, title }: { src: string; poster?: string; title: string }) {
  const { t } = useI18n()
  const box = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  // one play session id per visit, like the GX.games page would generate
  const url = useMemo(() => `${src}&gamePlayId=${crypto.randomUUID()}`, [src])
  const full = () => { box.current?.requestFullscreen?.() }
  return (
    <div className="game-embed-wrap">
      <div className="game-embed" ref={box} style={poster && !loaded ? { backgroundImage: `url(${poster})` } : undefined}>
        <iframe
          src={url}
          title={title}
          allow="cross-origin-isolated; autoplay; fullscreen; gamepad"
          allowFullScreen
          scrolling="no"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setLoaded(true)}
        />
        {!loaded && <span className="meta game-embed-loading">{t('gw_loading')}</span>}
      </div>
      <div className="game-embed-bar">
        <span className="meta">{t('gw_embed_hint')}</span>
        <button type="button" className="meta" onClick={full}>{t('gw_full')} ⛶</button>
      </div>
    </div>
  )
}
