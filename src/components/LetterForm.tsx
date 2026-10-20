import { FormEvent, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'
import { LIMITS, mailtoHref, sendLetter, type Letter } from '../api'
import lilyArt from '../assets/card/lily.webp'

/**
 * "Deixa um recado" as a letter on Ana's paper (her watercolour-paper scan, `assets/contact/paper.webp`).
 * Sending goes straight from the site through EmailJS (`src/api.ts`); while the keys are not set it falls back to the
 * visitor's mail app. While it sends, the letter slides away and the ENVELOPE FRONT comes up, big and legible
 * (Ana, 2026-10-20: "o envelope ficou feio, não dá nem para ler"): her name as the address, the sender in the corner, a
 * stamp with her lily, and a postmark that lands when the letter has really gone.
 */
type Phase = 'write' | 'sending' | 'sent' | 'mailto' | 'error'
const ease = [0.22, 1, 0.36, 1] as const
const MIN_ANIM = 1400

export default function LetterForm({ email }: { email: string }) {
  const { lang, t } = useI18n()
  const reduce = useReducedMotion()
  const [f, setF] = useState({ name: '', from: '', msg: '', hp: '' })
  const [phase, setPhase] = useState<Phase>('write')
  const [note, setNote] = useState('')
  const today = useMemo(() => new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), [lang])
  const shortDate = useMemo(() => new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date()), [lang])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (phase === 'sending') return
    const letter: Letter = { name: f.name, email: f.from, message: f.msg, date: today, lang, honeypot: f.hp }
    setNote('')
    setPhase('sending')
    const started = Date.now()
    const wait = () => new Promise((r) => window.setTimeout(r, Math.max(0, (reduce ? 0 : MIN_ANIM) - (Date.now() - started))))
    try {
      const res = await sendLetter(letter)
      await wait()
      if (res === 'sent') setPhase('sent')
      else if (res === 'not-configured') { setPhase('mailto'); window.setTimeout(() => { window.location.href = mailtoHref(email, letter) }, 700) }
      else { setNote(res === 'cooldown' ? t('lt_err_wait') : t('lt_err_invalid')); setPhase('error') }
    } catch {
      await wait()
      setNote(t('lt_err_send'))
      setPhase('error')
    }
  }
  const again = () => { setF({ name: '', from: '', msg: '', hp: '' }); setNote(''); setPhase('write') }

  const away = phase === 'sending' || phase === 'sent' || phase === 'mailto'
  const landed = phase === 'sent' || phase === 'mailto'

  return (
    <div className="lt-desk">
      <motion.form
        className="lt-paper"
        onSubmit={submit}
        initial={false}
        animate={away ? { y: 60, opacity: 0, rotate: 0, scale: 0.97 } : { y: 0, opacity: 1, rotate: -0.8, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.7, ease }}
        style={{ pointerEvents: away ? 'none' : 'auto' }}
        aria-hidden={away}
      >
        <div className="lt-head">
          <span className="lt-to"><small>{t('lt_to')}</small>Ana Julia</span>
          <span className="lt-date">São Paulo, {today}</span>
        </div>

        <label className="lt-field">
          <small>{t('lt_from')}</small>
          <input required name="name" autoComplete="name" maxLength={LIMITS.name} placeholder={t('mu_name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} readOnly={away} />
        </label>
        <label className="lt-field">
          <small>{t('lt_reply')}</small>
          <input required type="email" name="email" autoComplete="email" maxLength={LIMITS.email} placeholder={t('mu_email')} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} readOnly={away} />
        </label>
        {/* honeypot: invisible to people, tempting to bots */}
        <label className="lt-hp" aria-hidden>
          Empresa <input tabIndex={-1} autoComplete="off" name="company" value={f.hp} onChange={(e) => setF({ ...f, hp: e.target.value })} />
        </label>

        <label className="lt-body">
          <span className="sr">{t('lt_msg_label')}</span>
          <textarea required rows={6} maxLength={LIMITS.message} placeholder={t('lt_msg_ph')} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} readOnly={away} />
        </label>

        {phase === 'error' && note && (
          <p className="lt-err" role="alert">{note} <a href={`mailto:${email}`}>{email}</a></p>
        )}

        <div className="lt-foot">
          <span className="lt-sign">{f.name ? `— ${f.name}` : ''}</span>
          <button type="submit" className="lt-send" aria-disabled={phase === 'sending'}>{t('lt_send')} <i aria-hidden>→</i></button>
        </div>
      </motion.form>

      {/* the envelope front: comes up as the letter goes in */}
      <AnimatePresence>
        {away && (
          <motion.div key="env" className="lt-env" initial={{ y: 70, opacity: 0, rotate: 2 }} animate={{ y: 0, opacity: 1, rotate: -1.2 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: reduce ? 0 : 0.8, ease, delay: reduce ? 0 : 0.25 }}>
            <div className="lt-env-from">
              <small>{t('lt_env_from')}</small>
              <span>{f.name}</span>
              <em>{f.from}</em>
            </div>
            <div className="lt-stamp" aria-hidden>
              <img src={lilyArt} alt="" loading="lazy" decoding="async" />
              <small>São Paulo</small>
            </div>
            <motion.div
              className="lt-postmark" aria-hidden initial={false}
              animate={landed ? { scale: 1, opacity: 1, rotate: -14 } : { scale: 1.5, opacity: 0, rotate: -30 }}
              transition={{ type: 'spring', stiffness: 240, damping: 15, delay: landed && !reduce ? 0.2 : 0 }}
            >
              <span>{t('lt_postmark')}</span>
              <b>{shortDate}</b>
            </motion.div>
            <div className="lt-env-to">
              <span className="lt-env-name">Ana Julia</span>
              <span className="lt-env-addr">São Paulo · Brasil</span>
            </div>
            <div className="lt-env-status" role="status">
              {phase === 'sending' && <span className="lt-dots">{t('lt_sending')}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {landed && (
          <motion.div className="lt-done" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: reduce ? 0 : 0.5, duration: 0.5, ease }}>
            <strong>{phase === 'sent' ? t('lt_sent_title') : t('lt_mailto_title')}</strong>
            <p>{phase === 'sent' ? t('lt_sent_body') : t('lt_mailto_body')}</p>
            <button type="button" onClick={again}>{t('lt_again')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
