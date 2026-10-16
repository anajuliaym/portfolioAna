import { FormEvent, useState } from 'react'
import PageShell from '../components/PageShell'
import ContactCard from '../components/ContactCard'
import { useI18n } from '../i18n'
import { contact } from './content'

/**
 * Contact = Ana's business card in 3D (2026-10-16; the cork board was dropped as "bagunçado"). The card carries
 * name, role and e-mail on the front (click copies) and the social links on the back (click opens); it flips on
 * click. Below it, an editorial one-line form: the note goes out through the mail client (no backend).
 */
export default function Contact() {
  const { lang, t } = useI18n()
  const c = contact[lang]
  const [flipped, setFlipped] = useState(false)
  const [copied, setCopied] = useState(false)
  const [f, setF] = useState({ name: '', email: '', msg: '' })
  const [sent, setSent] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(c.email) } catch { /* fine */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const body = encodeURIComponent(`${f.msg}\n\n— ${f.name} (${f.email})`)
    setSent(true)
    window.location.href = `mailto:${c.email}?subject=${encodeURIComponent('Portfolio')}&body=${body}`
    window.setTimeout(() => { setSent(false); setF({ name: '', email: '', msg: '' }) }, 3000)
  }

  return (
    <PageShell index="03" title={t('hs_contact')} className="contact" aside={<p className="pj-sub">{t('cc_sub')}</p>}>
      <div className="cc-stage">
        <ContactCard email={c.email} links={c.links} onEmail={copy} flipped={flipped} setFlipped={setFlipped} copied={copied} />
        <p className={`cc-hint${copied ? ' is-copied' : ''}`} aria-live="polite">{copied ? t('mu_copied') : flipped ? t('cc_hint_back') : t('cc_hint')}</p>
      </div>

      <form className="cc-form" onSubmit={submit}>
        <span className="meta">{t('cc_note')}</span>
        <div className="cc-row">
          <input required placeholder={t('mu_name')} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input required type="email" placeholder={t('mu_email')} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <textarea required rows={2} placeholder={t('mu_msg')} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} />
        <button type="submit" className="cc-send">{sent ? t('cc_sent') : t('cc_send')} <i aria-hidden>→</i></button>
      </form>
    </PageShell>
  )
}
