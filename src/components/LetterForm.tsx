import { FormEvent, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../i18n'

/**
 * "Deixa um recado" as a letter (Ana, 2026-10-20: "melhore o deixe um recado; o contato ficou muito simples").
 * Same stationery as the 3D card: cream paper with fibre, faint sage ruling and a pink margin line, the visitor's
 * words in handwriting. "Selar e enviar" folds the sheet, slides it into an envelope, closes the flap and presses a
 * sage-foil "AJ" seal; then the mail client opens with the letter ready (no backend — it says so plainly).
 */
type Phase = 'write' | 'fold' | 'sealed'
const ease = [0.22, 1, 0.36, 1] as const

export default function LetterForm({ email }: { email: string }) {
  const { lang, t } = useI18n()
  const reduce = useReducedMotion()
  const [f, setF] = useState({ name: '', from: '', msg: '' })
  const [phase, setPhase] = useState<Phase>('write')
  const today = useMemo(() => new Intl.DateTimeFormat(lang === 'pt' ? 'pt-BR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), [lang])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (phase !== 'write') return
    const body = encodeURIComponent(`${f.msg}\n\n— ${f.name} (${f.from})`)
    const href = `mailto:${email}?subject=${encodeURIComponent(lang === 'pt' ? 'Uma carta pelo portfólio' : 'A letter from your portfolio')}&body=${body}`
    setPhase('fold')
    window.setTimeout(() => setPhase('sealed'), reduce ? 0 : 1500)
    window.setTimeout(() => { window.location.href = href }, reduce ? 200 : 2300)
  }
  const again = () => { setF({ name: '', from: '', msg: '' }); setPhase('write') }

  const folding = phase !== 'write'

  return (
    <div className="lt-desk">
      {/* the envelope sits under the letter; it only shows once the letter starts folding */}
      <motion.div className="lt-env" aria-hidden initial={false} animate={folding ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{ duration: 0.6, ease }}>
        <div className="lt-env-back" />
        <motion.div className="lt-env-flap" initial={false} animate={{ rotateX: phase === 'sealed' ? 0 : 180 }} transition={{ duration: 0.55, ease }} />
        <div className="lt-env-pocket" />
        <motion.div className="lt-seal" initial={false} animate={phase === 'sealed' ? { scale: 1, opacity: 1, rotate: -8 } : { scale: 1.6, opacity: 0, rotate: -20 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: phase === 'sealed' ? 0.35 : 0 }}>
          <span>AJ</span>
        </motion.div>
      </motion.div>

      <motion.form
        className="lt-paper"
        onSubmit={submit}
        initial={false}
        animate={folding
          // folded to ~a quarter of its height around its centre, which is the envelope's centre
          ? { scaleY: 0.26, scaleX: 0.84, y: 0, opacity: phase === 'sealed' ? 0 : 1, rotate: 0 }
          : { scaleY: 1, scaleX: 1, y: 0, opacity: 1, rotate: -0.8 }}
        transition={{ duration: reduce ? 0 : 0.9, ease }}
        style={{ transformOrigin: '50% 50%' }}
      >
        <div className="lt-head">
          <span className="lt-to"><small>{t('lt_to')}</small>Ana Julia</span>
          <span className="lt-date">São Paulo, {today}</span>
        </div>

        <label className="lt-field">
          <small>{t('lt_from')}</small>
          <input required name="name" autoComplete="name" placeholder={t('mu_name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} readOnly={folding} />
        </label>
        <label className="lt-field">
          <small>{t('lt_reply')}</small>
          <input required type="email" name="email" autoComplete="email" placeholder={t('mu_email')} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} readOnly={folding} />
        </label>

        <label className="lt-body">
          <span className="sr">{t('lt_msg_label')}</span>
          <textarea required rows={6} placeholder={t('lt_msg_ph')} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} readOnly={folding} />
        </label>

        <div className="lt-foot">
          <span className="lt-sign">{f.name ? `— ${f.name}` : ''}</span>
          <button type="submit" className="lt-send" aria-disabled={folding}>{t('lt_send')} <i aria-hidden>→</i></button>
        </div>
      </motion.form>

      <AnimatePresence>
        {phase === 'sealed' && (
          <motion.div className="lt-done" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.6, duration: 0.5, ease }}>
            <strong>{t('lt_sent_title')}</strong>
            <p>{t('lt_sent_body')}</p>
            <button type="button" onClick={again}>{t('lt_again')}</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
