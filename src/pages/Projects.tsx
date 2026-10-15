import { useEffect, useState } from 'react'
import PageShell from '../components/PageShell'
import Devices, { type Mode } from '../components/Devices'
import DeviceDock from '../components/DeviceDock'
import { useI18n } from '../i18n'
import { protos } from './content'

/**
 * Projetos = prototypes. An iPhone and a MacBook float on lily pads; pick one and the camera flies to
 * its screen, where the prototypes are listed and browsed ON the 3D model's own display (an Html
 * transform plane fitted to the screen). Esc or the button brings the pond back.
 */
export default function Projects() {
  const { lang, t } = useI18n()
  const [mode, setMode] = useState<Mode>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMode(null) }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  return (
    <PageShell index="01" title={t('hs_projects')} className={`projects${mode ? ' in-device' : ''}`}>{/* small title, no subtitle: the pond is the page (Ana, 2026-10-15) */}
      <Devices mode={mode} setMode={setMode} protos={protos[lang]} />
      <DeviceDock mode={mode} onExit={() => setMode(null)} />
    </PageShell>
  )
}
