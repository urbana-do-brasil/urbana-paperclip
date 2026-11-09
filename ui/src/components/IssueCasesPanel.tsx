import { useQuery } from "@tanstack/react-query";
import { Link, useCaseHref } from "@/lib/router";
import { casesApi, type CaseLinkRole, type CaseStatus } from "@/api/cases";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

const ROLE_LABEL_KEYS: Record<CaseLinkRole, string> = {
  origin: "caseManagement.issueLinks.roles.origin",
  work: "caseManagement.issueLinks.roles.work",
  reference: "caseManagement.issueLinks.roles.reference",
};

const STATUS_LABEL_KEYS: Record<CaseStatus, string> = {
  draft: "caseManagement.collection.statuses.draft",
  in_progress: "caseManagement.collection.statuses.inProgress",
  in_review: "caseManagement.collection.statuses.inReview",
  approved: "caseManagement.collection.statuses.approved",
  done: "caseManagement.collection.statuses.done",
  cancelled: "caseManagement.collection.statuses.cancelled",
};

/**
 * Issue-page right-rail section (P4 §5): the cases linked to this issue, each
 * with its link role + case status. Self-gates on the experimental Cases flag
 * and renders nothing when the flag is off or no cases are linked, so it can be
 * dropped into the issue properties panel unconditionally.
 */
export function IssueCasesPanel({ issueId }: { issueId: string }) {
  const { t } = useTranslation();
  const caseHref = useCaseHref();
  const { data: experimentalSettings } = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });
  const enabled = experimentalSettings?.enableCases === true;

  const casesQuery = useQuery({
    queryKey: queryKeys.cases.forIssue(issueId),
    queryFn: () => casesApi.listForIssue(issueId),
    enabled: enabled && !!issueId,
  });

  const links = casesQuery.data ?? [];
  if (enabled && casesQuery.isError && !casesQuery.data) {
    return (
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("caseManagement.collection.title")}</h3>
        <p className="text-xs text-destructive">{t("caseManagement.issueLinks.loadError")}</p>
        <Button variant="outline" size="sm" onClick={() => void casesQuery.refetch()}>{t("caseManagement.collection.retry")}</Button>
      </section>
    );
  }
  if (!enabled || links.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("caseManagement.collection.title")}</h3>
      <div className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.id}
            to={caseHref(link.case.identifier)}
            className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/50"
          >
            <span className="font-mono text-xs text-muted-foreground shrink-0">{link.case.identifier}</span>
            <span className="min-w-0 flex-1 truncate" title={link.case.title}>{link.case.title}</span>
            <Badge variant="secondary" className="shrink-0">{ROLE_LABEL_KEYS[link.role] ? t(ROLE_LABEL_KEYS[link.role]) : link.role}</Badge>
            <StatusBadge status={link.case.status} label={STATUS_LABEL_KEYS[link.case.status] ? t(STATUS_LABEL_KEYS[link.case.status]) : undefined} />
          </Link>
        ))}
      </div>
    </section>
  );
}
