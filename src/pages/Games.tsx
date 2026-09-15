import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { games, ui } from './content'

export default function Games() {
  const { lang, t } = useI18n()
  return (
    <PageShell index="05" title={t('hs_games')} lead={ui[lang].gamesLead}>
      <div className="grid games">
        {games[lang].map((g, i) => (
          <motion.article
            key={g.title}
            className="card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="thumb" style={{ background: `linear-gradient(135deg, hsl(${g.hue} 40% 14%), hsl(${g.hue} 70% 55%))` }}>
              <span className="meta">{g.year}</span>
              {g.link && <a className="play" href={g.link}>{ui[lang].play} ▶</a>}
            </div>
            <div className="card-body">
              <span className="meta">{g.engine} · {g.platform}</span>
              <h3>{g.title}</h3>
              <p>{g.desc}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </PageShell>
  )
}
