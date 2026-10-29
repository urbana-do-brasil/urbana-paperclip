import type { CompanySkill } from '@paperclipai/shared';
import { Link } from '@/lib/router';
import { useTranslation } from '@/i18n';
export function SkillSourceProvenance({ skill }: { skill: CompanySkill }) {
  const { t } = useTranslation();
  const id = skill.metadata?.skillSourceId ?? skill.metadata?.legacySkillSourceId;
  if (typeof id !== 'string') return null;
  const state = skill.metadata?.skillSourceState;
  const label = !skill.metadata?.skillSourceId ? t('skillDetail.sourceProvenance.refreshToSync') : state === 'removed' ? t('skillDetail.sourceProvenance.removed')
    : state === 'not_syncing' ? t('skillDetail.sourceProvenance.notSyncing')
    : state === 'update_failed' ? t('skillDetail.sourceProvenance.updateFailed') : t('skillDetail.sourceProvenance.syncedFromGitHub');
  return <div className="flex flex-col gap-1 py-3 text-xs text-muted-foreground">
    <span>{label}</span>
    <span className="break-all font-mono">{String(skill.metadata?.skillSourcePath ?? '')}{skill.sourceRef ? ` · ${skill.sourceRef.slice(0, 8)}` : ''}</span>
    <Link to={`/skills/sources/${id}`} className="text-foreground underline">{t('skillDetail.sourceProvenance.manageSource')}</Link>
  </div>;
}
