import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { about } from './content'
import Badge from '../components/Badge'

const ease = [0.16, 1, 0.3, 1] as const
const MARK = /(\*[^*]+\*|_[^_]+_|~[^~]+~|==[^=]+==)/g

/**
 * Renders a paragraph with its inline marks as scrapbook objects, in the language of the badge and
 * of the one accent Ana liked (the doodled circle):
 *   *x*        a die-cut sticker (cream paper, white border, shadow) that peels in and can be picked
 *              up and dragged — it springs back to its place in the sentence
 *   _x|note_   the phrase gets a tiny asterisk doodle; hovering (or tapping) pops a handwritten pen
 *              note with an arrow, like marginalia
 *   ~x~        handwriting (Caveat), as if Ana wrote over the printed text
 *   ==x==      the big circled phrase
 */
function Sticker({ children, tilt }: { children: React.ReactNode; tilt: number }) {
  return (
    <motion.span
      className="stk"
      drag dragSnapToOrigin dragElastic={0.6} dragMomentum={false}
      whileDrag={{ scale: 1.1, rotate: 0, zIndex: 5, boxShadow: '0 4px 0 rgba(0,0,0,.25), 0 22px 30px rgba(0,0,0,.5)' }}
      whileHover={{ scale: 1.04, rotate: 0 }}
      initial={{ opacity: 0, scale: 0.4, rotate: tilt - 16 }} whileInView={{ opacity: 1, scale: 1, rotate: tilt }}
      viewport={{ once: true, amount: 0.6 }} transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.15 }}
    >
      {children}
    </motion.span>
  )
}

function Noted({ phrase, note }: { phrase: string; note: string }) {
  const [on, setOn] = useState(false)
  return (
    <span className={`noted ${on ? 'on' : ''}`} onClick={() => setOn((v) => !v)} onMouseLeave={() => setOn(false)}>
      {phrase}
      <svg className="noted-mark" viewBox="0 0 24 24" aria-hidden><path d="M12 3 L12.6 10.2 L19 6.5 L13.6 12 L19 17.5 L12.6 13.8 L12 21 L11.4 13.8 L5 17.5 L10.4 12 L5 6.5 L11.4 10.2 Z" /></svg>
      <span className="note" aria-hidden>
        <svg className="note-arrow" viewBox="0 0 60 40" aria-hidden>
          <path d="M56 4 C 40 6, 22 14, 10 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 22 L 10 33 L 20 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {note}
      </span>
    </span>
  )
}

function FunText({ text, tilt }: { text: string; tilt: { n: number } }) {
  return (
    <>
      {text.split(MARK).map((part, i) => {
        if (!part) return null
        const m = part[0]
        if (m === '*') return <Sticker key={i} tilt={tilt.n++ % 2 ? 1.8 : -2.2}>{part.slice(1, -1)}</Sticker>
        if (m === '_') { const [phrase, note = ''] = part.slice(1, -1).split('|'); return <Noted key={i} phrase={phrase} note={note} /> }
        if (m === '~') return <span key={i} className="mk-hand">{part.slice(1, -1)}</span>
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
  const tilt = { n: 0 }
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
              <FunText text={p} tilt={tilt} />
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
