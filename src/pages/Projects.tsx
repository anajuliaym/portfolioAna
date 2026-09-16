import { useState } from 'react'
import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { projects, ui } from './content'

export default function Projects() {
  const { lang, t } = useI18n()
  const list = projects[lang]
  const tags = [ui[lang].all, ...Array.from(new Set(list.map((p) => p.tag)))]
  const [tag, setTag] = useState(tags[0])
  const shown = tag === tags[0] ? list : list.filter((p) => p.tag === tag)

  return (
    <PageShell
      index="01"
      title={t('hs_projects')}
      aside={
        <div className="filters">
          {tags.map((x) => (
            <button key={x} className={x === tag ? 'on' : ''} onClick={() => setTag(x)}>{x}</button>
          ))}
          <span className="meta">{ui[lang].count(shown.length)}</span>
        </div>
      }
    >
      <div className="grid">
        {shown.map((p, i) => (
          <motion.article
            key={p.title}
            className="card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="thumb" style={{ background: `linear-gradient(135deg, hsl(${p.hue} 40% 14%), hsl(${p.hue} 70% 55%))` }}>
              <span className="meta">{p.year}</span>
            </div>
            <div className="card-body">
              <span className="meta">{p.tag}</span>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </PageShell>
  )
}
