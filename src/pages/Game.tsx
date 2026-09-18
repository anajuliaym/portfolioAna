import { Navigate, useParams } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
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
        <p>{g.desc}</p>
        {link
          ? <a className="btn" href={link} target="_blank" rel="noopener">{ui[lang].play} ▶</a>
          : <span className="meta game-soon">{t('coming')}</span>}
      </div>
    </PageShell>
  )
}
