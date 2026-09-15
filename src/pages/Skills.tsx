import PageShell from '../components/PageShell'
import SkillLogos from '../components/SkillLogos'
import { useI18n } from '../i18n'
import { tools, ui } from './content'

export default function Skills() {
  const { lang, t } = useI18n()
  return (
    <PageShell index="04" title={t('hs_skills')} lead={ui[lang].skillsLead}>
      <SkillLogos tools={tools} />
    </PageShell>
  )
}
