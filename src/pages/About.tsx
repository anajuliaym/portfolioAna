import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { about } from './content'

export default function About() {
  const { lang, t } = useI18n()
  const a = about[lang]
  return (
    <PageShell index="02" title={t('hs_about')}>
      <div className="two-col">
        <div className="prose">
          {a.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          <dl className="facts">
            {a.facts.map(([k, v]) => (
              <div key={k}><dt className="meta">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </div>
        <div>
          <div className="portrait">
            <span className="meta">foto</span>
          </div>
          <ol className="timeline">
            {a.timeline.map(([y, txt]) => (
              <li key={y}><span className="meta">{y}</span><span>{txt}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </PageShell>
  )
}
