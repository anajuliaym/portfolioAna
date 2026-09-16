import PageShell from '../components/PageShell'
import SkillLogos from '../components/SkillLogos'
import { useI18n } from '../i18n'
import { tools } from './content'

export default function Skills() {
  const { t } = useI18n()
  return (
    <PageShell index="04" title={t('hs_skills')}>
      <SkillLogos tools={tools} />
    </PageShell>
  )
}
