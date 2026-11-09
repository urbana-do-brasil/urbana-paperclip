import { useCallback, useEffect } from "react";
import { History } from "lucide-react";
import { useSearchParams } from "@/lib/router";
import { useCompany } from "../../context/CompanyContext";
import { useBreadcrumbs } from "../../context/BreadcrumbContext";
import { EmptyState } from "../../components/EmptyState";
import { AuditFeed, type AuditFeedMode } from "./AuditFeed.production";
import { RoutineAuditActivity } from "./RoutineAuditActivity";
import { auditScopeFromSearchParams } from "./audit-navigation";
import { useTranslation } from "react-i18next";

/**
 * Company activity page — the single merged surface for `/:company/activity`
 * (PAP-16302). It replaces both the old 200-row activity list and the separate
 * `/audit` page: all company readers get the shared all-actors feed, and callers
 * with `audit:view_agent_actions` can switch to the privileged agent-action
 * audit. The mode lives in `?mode=` so `/audit` deep links can preset it and
 * links stay shareable. The server enforces both tiers regardless.
 */
export function CompanyActivity() {
  const { t } = useTranslation();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = auditScopeFromSearchParams(searchParams);
  const mode: AuditFeedMode = searchParams.get("mode") === "agents" ? "agents" : "all";

  useEffect(() => {
    setBreadcrumbs([{ label: t("organizationActivity.title") }]);
  }, [setBreadcrumbs, t]);

  const handleModeChange = useCallback(
    (next: AuditFeedMode) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === "agents") params.set("mode", "agents");
          else params.delete("mode");
          return params;
        },
        // The mode is a view toggle, not a navigation step — don't stack history
        // entries the back button has to walk through.
        { replace: true },
      );
    },
    [setSearchParams],
  );

  if (!selectedCompanyId) {
    return <EmptyState icon={History} message={t("organizationActivity.selectOrganization")} />;
  }

  // The streamlined AuditHub gives routine links a combined routine-scoped
  // feed (routine + its triggers/runs). Preserve that scope in the production
  // shell instead of silently dropping its entityId in the older company feed.
  if (scope.entityType === "routine" && scope.entityId) {
    return <RoutineAuditActivity companyId={selectedCompanyId} routineId={scope.entityId} />;
  }

  return <AuditFeed companyId={selectedCompanyId} mode={mode} onModeChange={handleModeChange} />;
}
