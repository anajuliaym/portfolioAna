import { FormEvent, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { contact } from './content'
import anaUrl from '../assets/about/ana.webp'
import heartUrl from '../assets/about/heart.webp'
import lilyUrl from '../assets/postcards/lily-pink.webp'

/**
 * Contact = Ana's cork board (chosen by her over 11 other ideas, 2026-10-15): a polaroid, a lily
 * postcard, washi tape, her social links as paper tags and her e-mail as a torn strip, all pinned
 * with glass hearts and draggable. The visitor writes on a notepad; "pin it" turns the note into a
 * post-it that flies onto the board, then the mail client opens with the message (no backend).
 */
const TAG_TINTS: Record<string, string> = { Instagram: '#f6c8d3', LinkedIn: '#bfe3d5', ArtStation: '#d8ccf0', GitHub: '#f6ead2' }

type Note = { id: number; text: string; from: string; x: number; y: number; rot: number }

export default function Contact() {
  const { lang, t } = useI18n()
  const c = contact[lang]
  const board = useRef<HTMLDivElement>(null)
  const [f, setF] = useState({ name: '', email: '', msg: '' })
  const [copied, setCopied] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [pinned, setPinned] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(c.email); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* the mailto link still works */ }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const id = Date.now()
    // the note lands in a free-ish spot on the board (left-middle on wide screens)
    setNotes((n) => [...n, { id, text: f.msg, from: f.name, x: 31 + Math.random() * 5, y: 60 + Math.random() * 6, rot: -6 + Math.random() * 12 }])
    setPinned(true)
    const body = encodeURIComponent(`${f.msg}\n\n— ${f.name} (${f.email})`)
    window.setTimeout(() => { window.location.href = `mailto:${c.email}?subject=${encodeURIComponent('Portfolio')}&body=${body}` }, 900)
    window.setTimeout(() => { setPinned(false); setF({ name: '', email: '', msg: '' }) }, 3200)
  }

  const Pin = ({ x = '50%' }: { x?: string }) => <img className="mu-pin" src={heartUrl} alt="" draggable={false} style={{ left: x }} />
  const drag = { drag: true, dragConstraints: board, dragElastic: 0.08, dragMomentum: false, whileHover: { scale: 1.03, zIndex: 5 }, whileDrag: { scale: 1.06, zIndex: 6, cursor: 'grabbing' } } as const

  return (
    <PageShell index="03" title={t('hs_contact')} className="contact" aside={<p className="pj-sub">{t('mu_sub')}</p>}>
      <div className="mural" ref={board}>
        <span className="mu-tape mu-tape-a" aria-hidden /><span className="mu-tape mu-tape-b" aria-hidden />

        {/* the intro post-it */}
        <motion.div className="mu-item mu-note mu-intro" style={{ left: '7%', top: '9%', ['--rot' as string]: '-3deg' }} {...drag}>
          <Pin />{t('mu_intro')}
        </motion.div>

        {/* polaroid */}
        <motion.figure className="mu-item mu-polaroid" style={{ left: '32%', top: '8%', ['--rot' as string]: '2.5deg' }} {...drag}>
          <span className="mu-washi" aria-hidden />
          <img src={anaUrl} alt="Ana Julia" draggable={false} />
          <figcaption>{t('mu_caption')}</figcaption>
        </motion.figure>

        {/* lily postcard */}
        <motion.div className="mu-item mu-card" style={{ right: '7%', top: '10%', ['--rot' as string]: '-4deg' }} {...drag}>
          <Pin x="18%" /><img src={lilyUrl} alt="" draggable={false} />
        </motion.div>

        {/* e-mail: a torn strip */}
        <motion.div className="mu-item mu-strip" style={{ left: '52%', top: '14%', ['--rot' as string]: '-1.5deg' }} {...drag}>
          <Pin x="12%" />
          <a href={`mailto:${c.email}`} onClick={(e) => { e.preventDefault(); copy() }}>{c.email}</a>
          <small>{copied ? t('mu_copied') : t('mu_copy')}</small>
        </motion.div>

        {/* social links as paper tags */}
        {c.links.map(([name, href], i) => (
          <motion.a
            key={name} className="mu-item mu-tag" href={href} target="_blank" rel="noreferrer"
            style={{ left: `${54 + (i % 2) * 22}%`, top: `${46 + Math.floor(i / 2) * 23}%`, ['--rot' as string]: `${[-5, 3, 4, -2][i % 4]}deg`, ['--tint' as string]: TAG_TINTS[name] ?? '#f6ead2' }}
            {...drag}
          >
            <Pin x="14%" />{name}<i aria-hidden>↗</i>
          </motion.a>
        ))}

        {/* the notepad */}
        <motion.form className="mu-item mu-pad" style={{ left: '7%', top: '42%', ['--rot' as string]: '1.5deg' }} onSubmit={submit} drag dragListener={false} dragConstraints={board}>
          <span className="mu-washi" aria-hidden />
          <input required placeholder={t('mu_name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input required type="email" placeholder={t('mu_email')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <textarea required rows={4} placeholder={t('mu_msg')} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} />
          <button type="submit" className="mu-btn"><img src={heartUrl} alt="" draggable={false} />{pinned ? t('mu_pinned') : t('mu_pin')}</button>
        </motion.form>

        {/* notes the visitor pinned this visit */}
        <AnimatePresence>
          {notes.map((n) => (
            <motion.div
              key={n.id} className="mu-item mu-note mu-sent" style={{ left: `${n.x}%`, top: `${n.y}%`, ['--rot' as string]: `${n.rot}deg` }}
              initial={{ opacity: 0, scale: 0.6, y: 120, rotate: 20 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }}
              {...drag}
            >
              <Pin />{n.text}<b>— {n.from}</b>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </PageShell>
  )
}
