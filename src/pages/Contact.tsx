import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import PageShell from '../components/PageShell'
import ContactStreet from '../components/ContactStreet'
import LetterForm from '../components/LetterForm'
import { useI18n } from '../i18n'
import { contact } from './content'

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Contact = the back street with Ana's mailbox (step 2, 2026-10-23). The street is the whole page: the hanging plaques
 * open her links and copy the e-mail, and the mailbox (or its neon sign) brings the letter up out of its slot, over the
 * dimmed street. Sealing it turns the letter into an envelope (LetterForm), which then flies back into the slot; the
 * mailbox gives a little jolt and a note confirms it went. Esc, the × or a click outside puts the letter back.
 */
export default function Contact() {
  const { lang, t } = useI18n()
  const c = contact[lang]
  const reduce = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const slot = useRef<{ x: number; y: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [flying, setFlying] = useState(false)
  const [from, setFrom] = useState({ x: 0, y: 0 })
  const [poke, setPoke] = useState(0)
  const [done, setDone] = useState<null | 'sent' | 'mailto'>(null)
  const [round, setRound] = useState(0) // a fresh letter each time

  const copy = async () => {
    try { await navigator.clipboard.writeText(c.email) } catch { /* the mailto link still works */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  // the slot, relative to the centre of the screen: where the letter comes from and where the envelope goes
  const fromSlot = () => {
    const s = slot.current
    return s ? { x: s.x - window.innerWidth / 2, y: s.y - window.innerHeight / 2 } : { x: 0, y: window.innerHeight * 0.3 }
  }
  const openLetter = () => { setFrom(fromSlot()); setDone(null); setFlying(false); setRound((r) => r + 1); setOpen(true) }
  const close = useCallback(() => { if (!flying) setOpen(false) }, [flying])
  const onLanded = useCallback((r: 'sent' | 'mailto') => { setFrom(fromSlot()); setDone(r); setFlying(true) }, [])
  const posted = () => { setOpen(false); setFlying(false); setPoke((p) => p + 1) }

  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, close])

  return (
    <PageShell index="03" title={t('hs_contact')} className="contact">
      <ContactStreet email={c.email} links={c.links} copied={copied} onCopy={copy} onLetter={openLetter} slot={slot} poke={poke}
        labels={{ letterKicker: t('ct_tag_letter_k'), letter: t('ct_tag_letter'), letterShort: t('ct_tag_letter_short'), copy: t('ct_tag_copy'), copied: t('ct_tag_copied'), open: t('ct_tag_open') }} />

      {/* after posting: a note at the foot of the street */}
      <AnimatePresence>
        {done && !open && (
          <motion.div key="done" className="ct-toast" role="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.5, ease, delay: reduce ? 0 : 0.35 }}>
            <strong>{done === 'sent' ? t('lt_sent_title') : t('lt_mailto_title')}</strong>
            <p>{done === 'sent' ? t('lt_sent_body') : t('lt_mailto_body')}</p>
            <div className="ct-toast-actions">
              <button type="button" onClick={openLetter}>{t('lt_again')}</button>
              <button type="button" className="ct-toast-x" onClick={() => setDone(null)} aria-label={t('lt_close')}>×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the letter over the street, portalled so `position: fixed` is not caught by the page wrapper's transform */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div key="letter" className="ct-modal" role="dialog" aria-modal="true" aria-label={t('lt_msg_label')}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.35 }}>
              <motion.div className="ct-modal-veil" onClick={close} animate={{ opacity: flying ? 0 : 1 }} transition={{ duration: 0.6, delay: flying ? 0.35 : 0 }} />
              <motion.div
                className="ct-modal-card"
                initial={reduce ? { opacity: 0 } : { x: from.x, y: from.y, scale: 0.08, rotate: -8, opacity: 0 }}
                animate={flying
                  ? (reduce ? { opacity: 0 } : { x: from.x, y: from.y, scale: 0.06, rotate: -12, opacity: [1, 1, 0] })
                  : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { x: from.x, y: from.y, scale: 0.08, rotate: -8, opacity: 0 }}
                transition={flying ? { duration: reduce ? 0.2 : 0.9, ease: [0.55, 0, 0.75, 0.2], times: [0, 0.8, 1] } : { duration: reduce ? 0.2 : 0.75, ease }}
                onAnimationComplete={() => { if (flying) posted() }}
              >
                {!flying && <button type="button" className="ct-modal-x" onClick={close} aria-label={t('lt_close')}>×</button>}
                <LetterForm key={round} email={c.email} onLanded={onLanded} autoFocus />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </PageShell>
  )
}
