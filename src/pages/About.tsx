import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { about } from './content'
import Badge from '../components/Badge'
import Timeline from '../components/Timeline'

const ease = [0.16, 1, 0.3, 1] as const
/** every collage piece drops in with a little settle, staggered by `d` */
const drop = (d: number, rot = 0) => ({
  initial: { opacity: 0, y: 26, rotate: rot - 4, scale: 0.97 },
  whileInView: { opacity: 1, y: 0, rotate: rot, scale: 1 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.8, ease, delay: d },
})

/** a glitter star sticker (the references' hero prop): SVG with a sparkle noise fill */
function Star({ className, hue = 'sage' }: { className?: string; hue?: 'sage' | 'pink' | 'ink' }) {
  const id = `glit-${hue}`
  return (
    <svg className={`ab-star ${hue} ${className ?? ''}`} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="3" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 9 -4.2" result="sparks" />
          <feComposite in="sparks" in2="SourceGraphic" operator="in" result="s" />
          <feBlend in="SourceGraphic" in2="s" mode="screen" />
        </filter>
      </defs>
      <path filter={`url(#${id})`} d="M50 4 L60.5 36.5 L95 38 L67.5 58.5 L78 92 L50 72 L22 92 L32.5 58.5 L5 38 L39.5 36.5 Z" />
    </svg>
  )
}

/** strip of translucent tape */
const Tape = ({ className }: { className?: string }) => <span className={`ab-tape ${className ?? ''}`} aria-hidden />

export default function About() {
  const { lang } = useI18n()
  const a = about[lang]
  const c = a.collage
  return (
    <PageShell className="about">
      <div className="two-col about-cols">
        <div className="about-side">
          <Badge />
        </div>
        <div className="ab">
          {/* 1 — type lockup: the sentence builds into two big words */}
          <motion.section className="ab-hero" {...drop(0)}>
            <h2 className="about-heading">{a.heading}</h2>
            <p className="ab-pre">{c.hero.pre}</p>
            <div className="ab-lockup" aria-label={`${c.hero.a} ${c.hero.amp} ${c.hero.b}`}>
              <span className="ab-big">{c.hero.a}</span>
              <span className="ab-amp">{c.hero.amp}</span>
              <span className="ab-chip">{c.hero.b}</span>
            </div>
            <Star className="s-hero" hue="pink" />
          </motion.section>

          <div className="ab-row">
            {/* 2 — lined paper note with a paperclip */}
            <motion.article className="ab-note" {...drop(0.1, -1.6)}>
              <span className="ab-clip" aria-hidden />
              {/* one flowing sentence: the opening phrase is set in serif inline, so it never reads as a cut title */}
              <p><span className="ab-lead">{c.note.title}</span> {c.note.body}</p>
              <Star className="s-note" hue="sage" />
            </motion.article>

            {/* 3 — a browser window for the technical side */}
            <motion.article className="ab-win" {...drop(0.2, 1.4)}>
              <div className="ab-win-bar" aria-hidden>
                <i /><i /><i />
                <span className="ab-url">{c.window.url}</span>
              </div>
              <div className="ab-win-body">
                <h3>{c.window.title}</h3>
                <p>{c.window.body}</p>
              </div>
            </motion.article>
          </div>

          {/* 4 — ticket stubs + second lockup */}
          <motion.section className="ab-mix" {...drop(0.1)}>
            <ul className="ab-tickets" aria-label={c.tickets.join(', ')}>
              {c.tickets.map((t, i) => (
                <motion.li key={t} className={`ab-ticket ${i % 2 ? 'alt' : ''}`} {...drop(0.15 + i * 0.07, i % 2 ? 2.2 : -2.6)}>
                  <span className="ab-ticket-no">{String(i + 1).padStart(2, '0')}</span>
                  {t}
                </motion.li>
              ))}
            </ul>
            <p className="ab-pre">{c.mix.pre}</p>
            <p className="ab-lockup2">
              <span className="ab-serif">{c.mix.a}</span>
              <span className="ab-chip dark">{c.mix.b}</span>
            </p>
          </motion.section>

          {/* 5 — taped sticky note with the circled quote (the one accent Ana kept) */}
          <motion.section className="ab-sticky" {...drop(0.1, 1.2)}>
            <Tape className="t-left" /><Tape className="t-right" />
            <p>
              {c.closing.pre}{' '}
              <span className="mk-big">
                {c.closing.quote}
                <svg className="mk-ring" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden>
                  <motion.path
                    d="M104 9 C 168 3, 199 28, 191 50 C 182 74, 66 79, 24 62 C -8 49, 14 12, 84 8"
                    fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.8 }} transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.5 }}
                  />
                </svg>
              </span>{' '}
              {c.closing.post}
            </p>
          </motion.section>

        </div>
      </div>
      {/* outside the two columns on purpose: the badge stays with the collage and does not follow this part */}
      <Timeline items={a.experiences} kicker={a.xpKicker} title={a.xpTitle} intro={a.xpIntro} flip={a.xpFlip} back={a.xpBack} did={a.xpDid} stampHere={a.xpStampHere} />
    </PageShell>
  )
}
