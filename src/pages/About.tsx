import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { about } from './content'
import Badge from '../components/Badge'

export default function About() {
  const { lang } = useI18n()
  const a = about[lang]
  return (
    <PageShell className="about">
      <div className="two-col about-cols">
        <div className="about-side">
          <Badge />
        </div>
        <div className="prose">
          {a.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          <dl className="facts">
            {a.facts.map(([k, v]) => (
              <div key={k}><dt className="meta">{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
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
