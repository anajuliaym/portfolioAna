import { useMemo } from 'react'
import PageShell from '../components/PageShell'
import ClawMachine from '../components/ClawMachine'
import { useI18n } from '../i18n'
import { tools } from './content'

/** Skills = a claw machine full of Ana's 3D logos (2026-10-20). The old floating-logos scene stays in SkillLogos.tsx. */
export default function Skills() {
  const { t, lang } = useI18n()
  const list = useMemo(() => tools.map((x) => (x.names ? { ...x, name: x.names[lang] } : x)), [lang])
  return (
    <PageShell index="04" title={t('hs_skills')} className="skills">
      <ClawMachine tools={list} />
    </PageShell>
  )
}
