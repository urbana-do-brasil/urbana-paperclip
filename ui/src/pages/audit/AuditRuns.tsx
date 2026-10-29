import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { HeartbeatRun, RoutineRunSummary } from "@paperclipai/shared";
import { Activity, CircleDotDashed } from "lucide-react";
import { agentsApi } from "@/api/agents";
import { heartbeatsApi } from "@/api/heartbeats";
import { routinesApi } from "@/api/routines";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/queryKeys";
import { Link, useSearchParams } from "@/lib/router";
import { relativeTime } from "@/lib/utils";
import { formatUiError } from "@/api/error-presentation";
import { useTranslation } from "react-i18next";

const ALL = "__all";
const RUN_LIMIT = 200;
const RUN_SOURCE_KEYS: Record<string, string> = {
  on_demand: "agentRuns.sources.onDemand",
  timer: "agentRuns.sources.timer",
  assignment: "agentRuns.sources.assignment",
  automation: "agentRuns.sources.automation",
  schedule: "routineActivity.sources.schedule",
  manual: "routineActivity.sources.manual",
  api: "routineActivity.sources.api",
  webhook: "routineActivity.sources.webhook",
};
const RUN_STATUS_KEYS: Record<string, string> = {
  queued: "agentRuns.status.queued",
  scheduled_retry: "agentRuns.status.scheduled_retry",
  running: "agentRuns.status.running",
  succeeded: "agentRuns.status.succeeded",
  interrupted: "agentRuns.status.interrupted",
  failed: "agentRuns.status.failed",
  cancelled: "agentRuns.status.cancelled",
  timed_out: "agentRuns.status.timed_out",
  received: "routineActivity.status.received",
  coalesced: "routineActivity.status.coalesced",
  skipped: "routineActivity.status.skipped",
  issue_created: "routineActivity.status.issueCreated",
  completed: "routineActivity.status.completed",
};

function runSummary(run: HeartbeatRun) {
  const result = run.resultJson as { summary?: unknown; result?: unknown } | null;
  const value = result?.summary ?? result?.result ?? run.error;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function runDuration(run: HeartbeatRun) {
  const start = run.startedAt ? new Date(run.startedAt).getTime() : null;
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : null;
  if (start == null || end == null || !Number.isFinite(start) || !Number.isFinite(end)) return null;
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  if (seconds < 60) return { key: "agentRuns.detail.durationSeconds", values: { seconds } };
  const minutes = Math.floor(seconds / 60);
  return {
    key: "agentRuns.detail.durationMinutesSeconds",
    values: { minutes, seconds: seconds % 60 },
  };
}

function readableSource(source: string) {
  return source.replaceAll("_", " ");
}

function runSourceLabel(source: string, t: (key: string) => string) {
  return RUN_SOURCE_KEYS[source] ? t(RUN_SOURCE_KEYS[source]) : readableSource(source);
}

function runStatusLabel(status: string, t: (key: string) => string) {
  return RUN_STATUS_KEYS[status] ? t(RUN_STATUS_KEYS[status]) : readableSource(status);
}

function routineRunTitle(run: RoutineRunSummary, fallback: string) {
  return run.linkedIssue?.title ?? run.trigger?.label ?? fallback;
}

function RoutineScopedRuns({
  runs,
  isLoading,
  error,
  onRetry,
}: {
  runs: RoutineRunSummary[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="border-y border-border py-14 text-center text-sm text-muted-foreground">
        {t("auditHub.loadingRoutineRuns")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 border-y border-border py-14 text-center">
        <p className="text-sm text-muted-foreground">{formatUiError(error)}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>{t("auditHub.retry")}</Button>
      </div>
    );
  }

  if (runs.length === 0) {
    return <EmptyState icon={Activity} message={t("auditHub.noRoutineRuns")} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("auditHub.routineRunsTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("auditHub.routineRunsDescription")}
        </p>
      </div>
      <ul className="divide-y divide-border border-y border-border" aria-label={t("auditHub.routineRunsTitle")}>
        {runs.map((run) => {
          const content = (
            <>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {routineRunTitle(run, t("auditHub.routineRunFallback"))}
                  </span>
                  <StatusBadge status={run.status} label={runStatusLabel(run.status, t)} />
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {run.trigger?.label ?? runSourceLabel(run.source, t)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                <span>{runSourceLabel(run.source, t)}</span>
                <time dateTime={new Date(run.triggeredAt).toISOString()}>
                  {relativeTime(run.triggeredAt)}
                </time>
              </div>
            </>
          );
          const rowClassName = "flex flex-col gap-2 px-1 py-3 text-inherit no-underline transition-colors hover:bg-muted/50 sm:flex-row sm:items-start sm:justify-between sm:px-3";
          return (
            <li key={run.id}>
              {run.linkedIssue ? (
                <Link to={`/issues/${run.linkedIssue.identifier ?? run.linkedIssue.id}`} className={rowClassName}>
                  {content}
                </Link>
              ) : (
                <div className={rowClassName}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        {t("auditHub.showingRecentRoutineRuns", { count: RUN_LIMIT })}
      </p>
    </div>
  );
}

export function AuditRuns({ companyId, routineId }: { companyId: string; routineId?: string }) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentId = searchParams.get("agentId") ?? ALL;
  const status = searchParams.get("runStatus") ?? ALL;
  const agents = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !routineId,
  });
  const runs = useQuery({
    queryKey: queryKeys.audit.runs(companyId, agentId === ALL ? null : agentId),
    queryFn: () =>
      heartbeatsApi.list(companyId, agentId === ALL ? undefined : agentId, RUN_LIMIT, {
        summary: true,
      }),
    refetchInterval: 15_000,
    enabled: !routineId,
  });
  const routineRuns = useQuery({
    queryKey: [...queryKeys.routines.runs(routineId ?? ""), "audit"],
    queryFn: () => routinesApi.listRuns(routineId!, RUN_LIMIT),
    enabled: Boolean(routineId),
    refetchInterval: 15_000,
  });
  const agentById = useMemo(
    () => new Map((agents.data ?? []).map((agent) => [agent.id, agent])),
    [agents.data],
  );
  const statuses = useMemo(
    () => Array.from(new Set((runs.data ?? []).map((run) => run.status))).sort(),
    [runs.data],
  );
  const visibleRuns = useMemo(
    () => (runs.data ?? []).filter((run) => status === ALL || run.status === status),
    [runs.data, status],
  );

  const updateFilter = (key: "agentId" | "runStatus", value: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === ALL) next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  };

  const clearFilters = () => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("agentId");
        next.delete("runStatus");
        return next;
      },
      { replace: true },
    );
  };

  if (routineId) {
    return (
      <RoutineScopedRuns
        runs={routineRuns.data ?? []}
        isLoading={routineRuns.isLoading}
        error={routineRuns.error instanceof Error ? routineRuns.error : null}
        onRetry={() => void routineRuns.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("auditHub.sections.runs")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("auditHub.runsDescription")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-y border-border py-3">
        <label className="grid gap-1 text-(length:--text-micro) font-medium text-muted-foreground">
          <span>{t("auditHub.agentFilter")}</span>
          <Select value={agentId} onValueChange={(value) => updateFilter("agentId", value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("auditHub.allAgents")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("auditHub.allAgents")}</SelectItem>
              {(agents.data ?? []).map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-(length:--text-micro) font-medium text-muted-foreground">
          <span>{t("auditHub.statusFilter")}</span>
          <Select value={status} onValueChange={(value) => updateFilter("runStatus", value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("auditHub.allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("auditHub.allStatuses")}</SelectItem>
              {statuses.map((value) => (
                <SelectItem key={value} value={value}>
                  {runStatusLabel(value, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        {agentId !== ALL || status !== ALL ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t("auditHub.clearFilters")}
          </Button>
        ) : null}
      </div>

      {runs.isLoading ? (
        <div className="border-y border-border py-14 text-center text-sm text-muted-foreground">
          {t("auditHub.loadingRuns")}
        </div>
      ) : runs.error ? (
        <div className="flex flex-col items-center gap-3 border-y border-border py-14 text-center">
          <p className="text-sm text-muted-foreground">
            {runs.error instanceof Error ? formatUiError(runs.error) : t("auditHub.loadRunsFailed")}
          </p>
          <Button variant="outline" size="sm" onClick={() => runs.refetch()}>
            {t("auditHub.retry")}
          </Button>
        </div>
      ) : visibleRuns.length === 0 ? (
        <EmptyState
          icon={agentId !== ALL || status !== ALL ? CircleDotDashed : Activity}
          message={agentId !== ALL || status !== ALL ? t("auditHub.noRunsMatchFilters") : t("auditHub.noRuns")}
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border" aria-label={t("auditHub.recentRuns")}>
          {visibleRuns.map((run) => {
            const agent = agentById.get(run.agentId);
            const summary = runSummary(run);
            const duration = runDuration(run);
            return (
              <li key={run.id}>
                <Link
                  to={`/agents/${run.agentId}/runs/${run.id}`}
                  className="flex flex-col gap-2 px-1 py-3 text-inherit no-underline transition-colors hover:bg-muted/50 sm:flex-row sm:items-start sm:justify-between sm:px-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {agent?.name ?? t("auditHub.unknownAgent")}
                      </span>
                      <span className="font-mono text-(length:--text-micro) text-muted-foreground">
                        {run.id.slice(0, 8)}
                      </span>
                      <StatusBadge status={run.status} label={runStatusLabel(run.status, t)} />
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {summary ?? t("auditHub.runSummaryFallback", {
                        source: runSourceLabel(run.invocationSource, t),
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                    <span>{runSourceLabel(run.invocationSource, t)}</span>
                    {duration ? <span>{t(duration.key, duration.values)}</span> : null}
                    <time dateTime={new Date(run.createdAt).toISOString()}>
                      {relativeTime(run.createdAt)}
                    </time>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        {t("auditHub.showingRecentRuns", { count: RUN_LIMIT })}
      </p>
    </div>
  );
}
