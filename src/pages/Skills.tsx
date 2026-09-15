import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { skills, ui } from './content'

export default function Skills() {
  const { lang, t } = useI18n()
  return (
    <PageShell index="04" title={t('hs_skills')} lead={ui[lang].skillsLead}>
      <div className="skills">
        {skills[lang].map((g, gi) => (
          <motion.section
            key={g.group}
            className="skill-group"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * gi, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3>{g.group}</h3>
            <ul>
              {g.items.map((s) => (
                <li key={s.name}>
                  <span>{s.name}</span>
                  <span className="level" aria-label={`${s.level}/5`}>
                    {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= s.level ? 'on' : ''} />)}
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>
    </PageShell>
  )
}
