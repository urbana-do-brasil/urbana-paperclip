import type {
  Issue,
  IssuePriority,
  IssueStatus,
  RoutineRunSummary,
  RoutineTrigger,
} from "@paperclipai/shared";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "@paperclipai/shared";
import { CalendarClock, Clock3, Play, Repeat, UserRound } from "lucide-react";
import { IssueRow } from "@/components/IssueRow";
import { MarkdownBody } from "@/components/MarkdownBody";
import { StatusBadge } from "@/components/StatusBadge";
import { i18n, t as translate, useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { createIssueDetailLocationState } from "@/lib/issueDetailBreadcrumb";
import { Link } from "@/lib/router";
import {
  routineDetailHref,
} from "./RoutineContextualSidebar";
import { useRoutineDetail } from "./routine-sections/context";

export type RoutineScheduleSummary = {
  label: string;
  detail: string;
  nextRunAt: Date | null;
};

export function formatRoutineTimestamp(value: Date | string, locale = i18n.language) {
  const displayLocale = locale.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
  return new Date(value).toLocaleString(displayLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function summarizeRoutineSchedule(triggers: RoutineTrigger[]): RoutineScheduleSummary {
  const schedules = triggers.filter((trigger) => trigger.kind === "schedule" && trigger.enabled);
  const nextRunAt = schedules
    .map((trigger) => trigger.nextRunAt ? new Date(trigger.nextRunAt) : null)
    .filter((value): value is Date => value !== null && Number.isFinite(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;

  if (schedules.length === 0) {
    const webhooks = triggers.filter((trigger) => trigger.kind === "webhook" && trigger.enabled);
    if (webhooks.length > 0) {
      return {
        label: translate("routines.detail.overview.activeWebhook", { count: webhooks.length }),
        detail: translate("routines.detail.overview.runsOnIncomingRequests"),
        nextRunAt: null,
      };
    }
    return {
      label: translate("routines.detail.overview.noActiveSchedule"),
      detail: translate("routines.detail.overview.manualRunsOnly"),
      nextRunAt: null,
    };
  }

  const first = schedules[0]!;
  return {
    label: translate("routines.detail.overview.activeSchedule", { count: schedules.length }),
    detail: first.cronExpression
      ? `${first.cronExpression}${first.timezone ? ` · ${first.timezone}` : ""}`
      : first.label ?? translate("routines.detail.overview.scheduledTrigger"),
    nextRunAt,
  };
}

function normalizeIssueStatus(value: string): IssueStatus {
  return ISSUE_STATUSES.includes(value as IssueStatus) ? value as IssueStatus : "todo";
}

function normalizeIssuePriority(value: string): IssuePriority {
  return ISSUE_PRIORITIES.includes(value as IssuePriority) ? value as IssuePriority : "medium";
}

/** Display-only adapter for the canonical task row; run summaries intentionally carry compact task data. */
export function routineRunIssue(
  summary: NonNullable<RoutineRunSummary["linkedIssue"]>,
  run: RoutineRunSummary,
  companyId: string,
  projectId: string | null,
): Issue {
  return {
    ...summary,
    companyId,
    projectId,
    projectWorkspaceId: null,
    goalId: null,
    parentId: null,
    description: null,
    status: normalizeIssueStatus(summary.status),
    workMode: "standard",
    priority: normalizeIssuePriority(summary.priority),
    reviewPolicy: null,
    assigneeAgentId: null,
    assigneeUserId: null,
    checkoutRunId: null,
    executionRunId: null,
    executionAgentNameKey: null,
    executionLockedAt: null,
    createdByAgentId: null,
    createdByUserId: null,
    responsibleUserId: null,
    issueNumber: null,
    originKind: "routine_execution",
    originId: run.routineId,
    originRunId: run.id,
    requestDepth: 0,
    billingCode: null,
    assigneeAdapterOverrides: null,
    executionWorkspaceId: null,
    executionWorkspacePreference: null,
    executionWorkspaceSettings: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hiddenAt: null,
    createdAt: run.triggeredAt,
  };
}

function OverviewFact({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Clock3;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="min-w-0 text-sm font-medium text-foreground">{value}</div>
      {detail ? <div className="min-w-0 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

export function RoutineOverview() {
  const { t, i18n } = useTranslation();
  const { routine, routineRuns, currentAssignee, hasLiveRun } = useRoutineDetail();
  const schedule = summarizeRoutineSchedule(routine.triggers);
  const hasWebhook = routine.triggers.some((trigger) => trigger.kind === "webhook" && trigger.enabled);
  const sortedRuns = [...(routineRuns ?? [])].sort(
    (left, right) => new Date(right.triggeredAt).getTime() - new Date(left.triggeredAt).getTime(),
  );
  const lastRun = sortedRuns[0] ?? null;
  const recentRuns = sortedRuns.slice(0, 5);
  const detailOrigin = createIssueDetailLocationState(
    routine.title,
    routineDetailHref(routine.id),
    "issues",
  );
  const automationState = routine.status === "archived"
    ? "archived"
    : !routine.assigneeAgentId
      ? "draft"
      : routine.status;
  const automationStateLabel = t(`routines.detail.status.${automationState}`);
  const runStatusLabel = (status: string) => {
    const statusKey: Record<string, string> = {
      received: "routineActivity.status.received",
      coalesced: "routineActivity.status.coalesced",
      skipped: "routineActivity.status.skipped",
      issue_created: "routineActivity.status.issueCreated",
      completed: "routineActivity.status.completed",
      failed: "routineActivity.status.failed",
      succeeded: "routines.detail.overview.runSucceeded",
    };
    const key = statusKey[status];
    return key ? t(key) : status.replaceAll("_", " ");
  };
  const formatTimestamp = (value: Date | string) => formatRoutineTimestamp(value, i18n.language);

  return (
    <div className="flex flex-col gap-6" data-routine-overview-mode="read">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewFact
          icon={Repeat}
          label={t("routines.detail.overview.state")}
          value={<StatusBadge status={automationState} label={automationStateLabel} />}
          detail={hasLiveRun ? t("routines.detail.overview.runIsActive") : t("routines.detail.overview.noActiveRun")}
        />
        <OverviewFact
          icon={CalendarClock}
          label={t("routines.detail.sections.triggers")}
          value={schedule.label}
          detail={<span className="font-mono">{schedule.detail}</span>}
        />
        <OverviewFact
          icon={Clock3}
          label={t("routines.detail.overview.nextRun")}
          value={schedule.nextRunAt ? formatTimestamp(schedule.nextRunAt) : hasWebhook ? t("routines.detail.overview.onWebhookDelivery") : t("routines.detail.overview.notScheduled")}
          detail={schedule.nextRunAt ? t("routines.detail.overview.scheduled") : hasWebhook ? t("routines.detail.overview.waitingForRequest") : t("routines.detail.overview.addOrEnableSchedule")}
        />
        <OverviewFact
          icon={Play}
          label={t("routines.detail.overview.lastRun")}
          value={lastRun ? <StatusBadge status={lastRun.status} label={runStatusLabel(lastRun.status)} /> : t("routines.detail.overview.noRunsYet")}
          detail={lastRun ? formatTimestamp(lastRun.triggeredAt) : t("routines.detail.overview.runManuallyOrWait")}
        />
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="routine-agent-heading">
        <h2 id="routine-agent-heading" className="text-sm font-semibold">{t("routines.detail.overview.defaultAgent")}</h2>
        {currentAssignee ? (
          <Link
            to={`/agents/${currentAssignee.urlKey ?? currentAssignee.id}`}
            className="flex w-fit items-center gap-2 rounded-md text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {currentAssignee.name}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">{t("routines.detail.overview.noDefaultAgent")}</p>
        )}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="routine-description-heading">
        <h2 id="routine-description-heading" className="text-sm font-semibold">{t("routines.detail.overview.description")}</h2>
        {routine.description?.trim() ? (
          <MarkdownBody className="text-sm text-foreground" linkIssueReferences>
            {routine.description}
          </MarkdownBody>
        ) : (
          <p className="text-sm text-muted-foreground">{t("routines.detail.overview.noDescription")}</p>
        )}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="routine-recent-runs-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="routine-recent-runs-heading" className="text-sm font-semibold">{t("routines.detail.overview.recentRuns")}</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to={routineDetailHref(routine.id, "runs")}>{t("routines.detail.overview.viewAllRuns")}</Link>
          </Button>
        </div>
        {recentRuns.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("routines.detail.overview.noRunsDescription")}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {recentRuns.map((run) => run.linkedIssue ? (
              <IssueRow
                key={run.id}
                issue={routineRunIssue(run.linkedIssue, run, routine.companyId, routine.projectId)}
                issueLinkState={detailOrigin}
                presentation="task"
                metadata={(
                  <span className="flex items-center gap-2">
                    <StatusBadge status={run.status} label={runStatusLabel(run.status)} />
                    <span className="font-mono text-xs text-muted-foreground">{formatTimestamp(run.triggeredAt)}</span>
                  </span>
                )}
              />
            ) : (
              <div key={run.id} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-sm">
                <StatusBadge status={run.status} label={runStatusLabel(run.status)} />
                <span className="min-w-0 flex-1 truncate">{run.trigger?.label ?? t("routines.detail.overview.routineRun")}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatTimestamp(run.triggeredAt)}</span>
              </div>
            ))}
          </div>
        )}
        <Button variant="link" size="sm" className="w-fit px-0" asChild>
          <Link to={routineDetailHref(routine.id, "activity")}>{t("routines.detail.overview.viewActivity")}</Link>
        </Button>
      </section>
    </div>
  );
}
