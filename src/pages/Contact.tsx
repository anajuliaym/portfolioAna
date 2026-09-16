import { FormEvent, useState } from 'react'
import PageShell from '../components/PageShell'
import { useI18n } from '../i18n'
import { contact } from './content'

export default function Contact() {
  const { lang, t } = useI18n()
  const c = contact[lang]
  const [f, setF] = useState({ name: '', email: '', msg: '' })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    // no backend yet: opens the visitor's mail client with the message pre-filled
    const body = encodeURIComponent(`${f.msg}\n\n— ${f.name} (${f.email})`)
    window.location.href = `mailto:${c.email}?subject=${encodeURIComponent('Portfolio')}&body=${body}`
  }

  return (
    <PageShell index="03" title={t('hs_contact')}>
      <div className="two-col">
        <div>
          <a className="big-link" href={`mailto:${c.email}`}>{c.email}</a>
          <ul className="links">
            {c.links.map(([name, href]) => (
              <li key={name}><a href={href} target="_blank" rel="noreferrer">{name} <span>↗</span></a></li>
            ))}
          </ul>
        </div>
        <form className="form" onSubmit={submit}>
          <input required placeholder={c.form.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input required type="email" placeholder={c.form.email} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <textarea required rows={6} placeholder={c.form.msg} value={f.msg} onChange={(e) => setF({ ...f, msg: e.target.value })} />
          <button className="btn" type="submit">{c.form.send} →</button>
        </form>
      </div>
    </PageShell>
  )
}
