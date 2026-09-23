import { useEffect, useState } from 'react'
import PageShell from '../components/PageShell'
import Devices, { type Mode } from '../components/Devices'
import DeviceDock from '../components/DeviceDock'
import { useI18n } from '../i18n'
import { protos } from './content'

/**
 * Projetos = prototypes. Two painted devices (Ana's phone, a notebook) carry the two categories;
 * pick one and the camera flies to its screen, where the prototypes are listed and browsed as if on
 * the device itself. Esc or the button brings the devices back.
 */
export default function Projects() {
  const { lang, t } = useI18n()
  const [mode, setMode] = useState<Mode>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode(null) }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  return (
    <PageShell index="01" title={t('hs_projects')} className="projects" aside={<p className="pj-sub">{t('pj_sub')}</p>}>
      <Devices mode={mode} setMode={setMode} protos={protos[lang]} />
      <DeviceDock mode={mode} items={mode === 'web' ? protos[lang].web : protos[lang].mobile} onExit={() => setMode(null)} />
    </PageShell>
  )
}
