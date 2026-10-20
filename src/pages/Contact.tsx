import { useState } from 'react'
import PageShell from '../components/PageShell'
import ContactCard from '../components/ContactCard'
import LetterForm from '../components/LetterForm'
import { useI18n } from '../i18n'
import { contact } from './content'
import lilyArt from '../assets/card/lily.webp'

/**
 * Contact = a stationery set (2026-10-20): Ana's 3D business card (front: name + her lily drawing; back: "Vamos
 * conversar?" in sage foil + the links) and, below it, a letter in the same cream paper that folds into an envelope
 * sealed with a sage-foil "AJ" (`LetterForm`). Next to the letter, the direct ways to reach her. Her lily, inverted to
 * cream ink, sits very faint behind the section; soft sage/teal glows give the night some depth.
 */
export default function Contact() {
  const { lang, t } = useI18n()
  const c = contact[lang]
  const [flipped, setFlipped] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try { await navigator.clipboard.writeText(c.email) } catch { /* the mailto link still works */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <PageShell index="03" title={t('hs_contact')} className="contact" aside={<p className="pj-sub">{t('cc_sub')}</p>}>
      <div className="ct-glow" aria-hidden />
      <div className="cc-stage">
        <ContactCard email={c.email} links={c.links} onEmail={copy} flipped={flipped} setFlipped={setFlipped} copied={copied} />
        <p className={`cc-hint${copied ? ' is-copied' : ''}`} aria-live="polite">{copied ? t('mu_copied') : flipped ? t('cc_hint_back') : t('cc_hint')}</p>
      </div>

      <section className="ct-letter" aria-labelledby="ct-letter-title">
        <img className="ct-lily" src={lilyArt} alt="" aria-hidden loading="lazy" />
        <div className="ct-intro">
          <span className="ct-kicker">{t('lt_kicker')}</span>
          <h2 id="ct-letter-title">{t('lt_title_a')}<br />{t('lt_title_b')}</h2>
          <p>{t('lt_body')}</p>
          <dl className="ct-direct">
            <div>
              <dt>{t('lt_direct_mail')}</dt>
              <dd><button type="button" onClick={copy}>{c.email}<i aria-hidden>{copied ? '✓' : '⧉'}</i></button></dd>
            </div>
            <div>
              <dt>{t('lt_direct_social')}</dt>
              <dd className="ct-links">{c.links.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noopener noreferrer">{name}<i aria-hidden>↗</i></a>)}</dd>
            </div>
            <div>
              <dt>{t('lt_direct_where')}</dt>
              <dd>São Paulo, Brasil</dd>
            </div>
          </dl>
        </div>
        <LetterForm email={c.email} />
      </section>
    </PageShell>
  )
}
