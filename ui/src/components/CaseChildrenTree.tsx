import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link, useCaseHref } from "@/lib/router";
import type { CaseStatus, CaseSummary } from "@/api/cases";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { CaseCopyableToken } from "@/components/CaseIdentifierKey";
import { useTranslation } from "@/i18n";
import { formatNumber } from "@/lib/utils";

const CASE_STATUS_KEYS: Record<CaseStatus, string> = {
  draft: "caseManagement.collection.statuses.draft",
  in_progress: "caseManagement.collection.statuses.inProgress",
  in_review: "caseManagement.collection.statuses.inReview",
  approved: "caseManagement.collection.statuses.approved",
  done: "caseManagement.collection.statuses.done",
  cancelled: "caseManagement.collection.statuses.cancelled",
};

type CaseRelationRow = Pick<CaseSummary, "id" | "identifier" | "title" | "caseType" | "status"> & {
  key?: string | null;
};

/**
 * Children tree (P4 §3): the parent's direct child cases with type + status
 * chips. Display only — no rollup semantics. Renders nothing structural beyond
 * a flat list; nesting depth is intentionally one level in v1.
 */
export function CaseChildrenTree({
  children,
  maxVisible,
}: {
  children: CaseRelationRow[];
  maxVisible?: number;
}) {
  const { t } = useTranslation();
  const caseHref = useCaseHref();
  const [expanded, setExpanded] = useState(false);
  if (children.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("caseManagement.properties.noChildren")}</p>;
  }

  const shouldCap = maxVisible != null && children.length > maxVisible;
  const visibleChildren = shouldCap && !expanded ? children.slice(0, maxVisible) : children;
  const hiddenCount = children.length - visibleChildren.length;

  return (
    <div className="space-y-1">
      <ul className="space-y-1">
        {visibleChildren.map((child) => (
          <li key={child.id}>
            <Link
              to={caseHref(child.identifier)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent/50"
            >
              <CaseCopyableToken
                value={child.identifier}
                label="case ID"
                className="shrink-0 font-mono text-xs text-muted-foreground"
                containerClassName="shrink-0"
                stopPropagation
              />
              <span className="min-w-0 flex-1 truncate" title={child.title}>{child.title}</span>
              <Badge variant="secondary" className="shrink-0">{child.caseType}</Badge>
              <StatusBadge status={child.status} label={CASE_STATUS_KEYS[child.status] ? t(CASE_STATUS_KEYS[child.status]) : undefined} />
            </Link>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => setExpanded(true)}
        >
          <ChevronDown className="h-3.5 w-3.5" />
          {t("caseManagement.properties.showMore", { count: hiddenCount, formattedCount: formatNumber(hiddenCount) })}
        </Button>
      ) : null}
    </div>
  );
}
