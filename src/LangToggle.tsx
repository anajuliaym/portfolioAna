import { useI18n } from './i18n'

export function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div className="lang" role="group" aria-label="language">
      <button className={lang === 'pt' ? 'on' : ''} onClick={() => setLang('pt')}>PT</button>
      <span>/</span>
      <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
    </div>
  )
}
