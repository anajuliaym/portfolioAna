import { Fragment } from 'react'
import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { about } from './content'
import Badge from '../components/Badge'

const ease = [0.16, 1, 0.3, 1] as const
const MARK = /(\*[^*]+\*|_[^_]+_|~[^~]+~|==[^=]+==)/g

/**
 * Renders a paragraph with its inline marks as hand-drawn pen doodles that draw themselves in as
 * they scroll into view: *single wobbly underline* (sage), _double underline_ (pink), ~zigzag
 * scribble~ (sage) and ==a big circled phrase== — the circle is the one accent Ana liked, so the
 * rest follows its language.
 */
function FunText({ text }: { text: string }) {
  return (
    <>
      {text.split(MARK).map((part, i) => {
        if (!part) return null
        const m = part[0]
        if (m === '*' || m === '_' || m === '~') {
          const cls = m === '*' ? 'mk-ul' : m === '_' ? 'mk-ul2' : 'mk-ul3'
          return (
            <motion.span
              key={i} className={cls}
              initial={{ backgroundSize: '0% 0.6em' }} whileInView={{ backgroundSize: '100% 0.6em' }}
              viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.25 }}
            >
              {part.slice(1, -1)}
            </motion.span>
          )
        }
        if (m === '=') {
          return (
            <span key={i} className="mk-big">
              {part.slice(2, -2)}
              <svg className="mk-ring" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden>
                <motion.path
                  d="M104 9 C 168 3, 199 28, 191 50 C 182 74, 66 79, 24 62 C -8 49, 14 12, 84 8"
                  fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.8 }} transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.4 }}
                />
              </svg>
            </span>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

export default function About() {
  const { lang } = useI18n()
  const a = about[lang]
  return (
    <PageShell className="about">
      <div className="two-col about-cols">
        <div className="about-side">
          <Badge />
        </div>
        <div className="prose fun">
          <h2 className="about-heading">
            {a.heading}
            {/* hand-drawn sparkles, like the stickers on the badge */}
            <svg className="about-spark s1" viewBox="0 0 24 24" aria-hidden><path d="M12 2 C12.6 8 15 10.4 22 12 C15 13.6 12.6 16 12 22 C11.4 16 9 13.6 2 12 C9 10.4 11.4 8 12 2 Z" /></svg>
            <svg className="about-spark s2" viewBox="0 0 24 24" aria-hidden><path d="M12 2 C12.6 8 15 10.4 22 12 C15 13.6 12.6 16 12 22 C11.4 16 9 13.6 2 12 C9 10.4 11.4 8 12 2 Z" /></svg>
            <svg className="about-spark s3" viewBox="0 0 24 24" aria-hidden><path d="M12 21 C 6 16, 2 12.5, 2 8.5 C 2 5.5, 4.4 3.5, 7 3.5 C 9 3.5, 10.8 4.6, 12 6.4 C 13.2 4.6, 15 3.5, 17 3.5 C 19.6 3.5, 22 5.5, 22 8.5 C 22 12.5, 18 16, 12 21 Z" /></svg>
          </h2>
          {a.paragraphs.map((p) => (
            <motion.p
              key={p}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.7, ease, delay: 0.05 }}
            >
              <FunText text={p} />
            </motion.p>
          ))}
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
