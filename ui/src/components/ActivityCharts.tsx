import type { DashboardRunActivityDay, HeartbeatRun } from "@paperclipai/shared";
import type { TFunction } from "i18next";
import { useTranslation } from "@/i18n";
import { formatNumber } from "../lib/utils";

/* ---- Utilities ---- */

export function getLast14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
}

function formatDayLabel(dateStr: string, locale: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", timeZone: "UTC" }).format(date);
}

function emptyRunDay(date: string): DashboardRunActivityDay {
  return { date, succeeded: 0, failed: 0, recovered: 0, other: 0, total: 0, failedByErrorCode: {} };
}

const runSegmentColors = {
  succeeded: "var(--status-task-icon-done)",
  recovered: "var(--status-task-todo)",
  failed: "var(--status-task-icon-blocked)",
  other: "var(--hex-737373)",
} as const;

// Compact per-day tooltip that also attributes failures to their error class.
function formatTooltipDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${dateStr}T12:00:00Z`));
}

function runDayTooltip(entry: DashboardRunActivityDay, locale: string, t: TFunction): string {
  const lines = [t("dashboard.charts.runCount", {
    count: entry.total,
    displayCount: formatNumber(entry.total),
    date: formatTooltipDate(entry.date, locale),
  })];
  if (entry.succeeded > 0) lines.push(t("dashboard.charts.runStatusCount", { status: t("dashboard.charts.status.succeeded"), count: formatNumber(entry.succeeded) }));
  if (entry.recovered > 0) lines.push(t("dashboard.charts.recoveredCount", {
    status: t("dashboard.charts.status.recovered"),
    count: formatNumber(entry.recovered),
    suffix: t("dashboard.charts.recoveredSuffix"),
  }));
  if (entry.failed > 0) {
    lines.push(t("dashboard.charts.runStatusCount", { status: t("dashboard.charts.status.failed"), count: formatNumber(entry.failed) }));
    const codes = Object.entries(entry.failedByErrorCode ?? {}).sort((a, b) => b[1] - a[1]);
    for (const [code, count] of codes) lines.push(`  ${code}: ${formatNumber(count)}`);
  }
  if (entry.other > 0) lines.push(t("dashboard.charts.runStatusCount", { status: t("dashboard.charts.status.other"), count: formatNumber(entry.other) }));
  return lines.join("\n");
}

/* ---- Sub-components ---- */

function DateLabels({ days, locale }: { days: string[]; locale: string }) {
  return (
    <div className="flex gap-(--sz-3px) mt-1.5">
      {days.map((day, i) => (
        <div key={day} className="flex-1 text-center">
          {(i === 0 || i === 6 || i === 13) ? (
            <span className="text-(length:--text-nano) text-muted-foreground tabular-nums">{formatDayLabel(day, locale)}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-2">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1 text-(length:--text-nano) text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div>
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        {subtitle && <span className="text-(length:--text-nano) text-muted-foreground/60">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

/* ---- Chart Components ---- */

type RunChartProps =
  | { activity?: DashboardRunActivityDay[] | null; runs?: never }
  | { runs?: HeartbeatRun[] | null; activity?: never };

function aggregateRuns(runs: readonly HeartbeatRun[] = []): DashboardRunActivityDay[] {
  const days = getLast14Days();
  const grouped = new Map<string, DashboardRunActivityDay>();
  for (const day of days) grouped.set(day, emptyRunDay(day));
  for (const run of runs) {
    const day = new Date(run.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    if (run.status === "succeeded") {
      entry.succeeded++;
    } else if (run.status === "failed" || run.status === "timed_out") {
      // A flat run list has no retry-chain linkage, so recovery can't be derived
      // here (the company dashboard computes it server-side). Attribute the
      // failure to its error class so the breakdown still renders.
      entry.failed++;
      const code = run.errorCode && run.errorCode.length > 0 ? run.errorCode : "unknown";
      entry.failedByErrorCode[code] = (entry.failedByErrorCode[code] ?? 0) + 1;
    } else {
      entry.other++;
    }
    entry.total++;
  }
  return Array.from(grouped.values());
}

function resolveRunActivity(props: RunChartProps): DashboardRunActivityDay[] {
  if (Array.isArray(props.activity)) return props.activity;
  if (Array.isArray(props.runs)) return aggregateRuns(props.runs);
  return [];
}

export function RunActivityChart(props: RunChartProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const activity = resolveRunActivity(props);
  const days = activity.length > 0 ? activity.map((day) => day.date) : getLast14Days();
  const grouped = new Map(activity.map((day) => [day.date, day]));

  const maxValue = Math.max(...activity.map(v => v.total), 1);
  const hasData = activity.some(v => v.total > 0);
  const hasRecovered = activity.some(v => v.recovered > 0);

  if (!hasData) return <p className="text-xs text-muted-foreground">{t("dashboard.charts.noRuns")}</p>;

  const legendItems = [
    { color: runSegmentColors.succeeded, label: t("dashboard.charts.status.succeeded") },
    ...(hasRecovered ? [{ color: runSegmentColors.recovered, label: t("dashboard.charts.status.recovered") }] : []),
    { color: runSegmentColors.failed, label: t("dashboard.charts.status.failed") },
    { color: runSegmentColors.other, label: t("dashboard.charts.status.other") },
  ];

  return (
    <div>
      <div className="flex items-end gap-(--sz-3px) h-20">
        {days.map(day => {
          const entry = grouped.get(day) ?? emptyRunDay(day);
          const total = entry.total;
          const heightPct = (total / maxValue) * 100;
          return (
            <div key={day} className="flex-1 h-full flex flex-col justify-end" title={runDayTooltip(entry, locale, t)}>
              {total > 0 ? (
                <div className="flex flex-col-reverse gap-px overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 2 }}>
                  {entry.succeeded > 0 && <div style={{ flex: entry.succeeded, backgroundColor: runSegmentColors.succeeded }} />}
                  {entry.recovered > 0 && <div style={{ flex: entry.recovered, backgroundColor: runSegmentColors.recovered }} />}
                  {entry.failed > 0 && <div style={{ flex: entry.failed, backgroundColor: runSegmentColors.failed }} />}
                  {entry.other > 0 && <div style={{ flex: entry.other, backgroundColor: runSegmentColors.other }} />}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-sm" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} locale={locale} />
      <ChartLegend items={legendItems} />
    </div>
  );
}

const priorityColors: Record<string, string> = {
  critical: "var(--status-task-icon-blocked)",
  high: "var(--hex-f97316)",
  medium: "var(--hex-eab308)",
  low: "var(--hex-6b7280)",
};

const priorityOrder = ["critical", "high", "medium", "low"] as const;

export function PriorityChart({ issues }: { issues: { priority: string; createdAt: Date }[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const days = getLast14Days();
  const grouped = new Map<string, Record<string, number>>();
  for (const day of days) grouped.set(day, { critical: 0, high: 0, medium: 0, low: 0 });
  for (const issue of issues) {
    const day = new Date(issue.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    if (issue.priority in entry) entry[issue.priority]++;
  }

  const maxValue = Math.max(...Array.from(grouped.values()).map(v => Object.values(v).reduce((a, b) => a + b, 0)), 1);
  const hasData = Array.from(grouped.values()).some(v => Object.values(v).reduce((a, b) => a + b, 0) > 0);

  if (!hasData) return <p className="text-xs text-muted-foreground">{t("dashboard.charts.noTasks")}</p>;

  return (
    <div>
      <div className="flex items-end gap-(--sz-3px) h-20">
        {days.map(day => {
          const entry = grouped.get(day)!;
          const total = Object.values(entry).reduce((a, b) => a + b, 0);
          const heightPct = (total / maxValue) * 100;
          return (
            <div key={day} className="flex-1 h-full flex flex-col justify-end" title={t("dashboard.charts.issueCount", { count: total, displayCount: formatNumber(total), date: formatTooltipDate(day, locale) })}>
              {total > 0 ? (
                <div className="flex flex-col-reverse gap-px overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 2 }}>
                  {priorityOrder.map(p => entry[p] > 0 ? (
                    <div key={p} style={{ flex: entry[p], backgroundColor: priorityColors[p] }} />
                  ) : null)}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-sm" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} locale={locale} />
      <ChartLegend items={priorityOrder.map(p => ({ color: priorityColors[p], label: t(`dashboard.charts.priority.${p}`) }))} />
    </div>
  );
}

// DECISION-SHEET.md B5: chart status colors re-pointed at the canonical
// --status-task-* system (DESIGN.md principle 5 — an operator learns one
// status vocabulary; badge, row, chart, and log agree). Previously an
// independent palette (todo blue, in_progress violet, etc.). `backlog`
// deliberately keeps --project-none (pre-B5, per user ruling); the
// non-red priority series and warning success-rate tints retain their own hues.
// Progress, done, and blocked use the icon hues so bars and legends match
// the task icons in each theme.
const statusColors: Record<string, string> = {
  todo: "var(--status-task-todo)",
  in_progress: "var(--status-task-icon-in_progress)",
  in_review: "var(--status-task-in_review)",
  done: "var(--status-task-icon-done)",
  blocked: "var(--status-task-icon-blocked)",
  cancelled: "var(--status-task-cancelled)",
  backlog: "var(--project-none)",
};

const knownTaskStatuses = new Set(["todo", "in_progress", "in_review", "done", "blocked", "cancelled", "backlog"]);

export function IssueStatusChart({ issues }: { issues: { status: string; createdAt: Date }[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const days = getLast14Days();
  const allStatuses = new Set<string>();
  const grouped = new Map<string, Record<string, number>>();
  for (const day of days) grouped.set(day, {});
  for (const issue of issues) {
    const day = new Date(issue.createdAt).toISOString().slice(0, 10);
    const entry = grouped.get(day);
    if (!entry) continue;
    entry[issue.status] = (entry[issue.status] ?? 0) + 1;
    allStatuses.add(issue.status);
  }

  const statusOrder = ["todo", "in_progress", "in_review", "done", "blocked", "cancelled", "backlog"].filter(s => allStatuses.has(s));
  const maxValue = Math.max(...Array.from(grouped.values()).map(v => Object.values(v).reduce((a, b) => a + b, 0)), 1);
  const hasData = allStatuses.size > 0;

  if (!hasData) return <p className="text-xs text-muted-foreground">{t("dashboard.charts.noTasks")}</p>;

  return (
    <div>
      <div className="flex items-end gap-(--sz-3px) h-20">
        {days.map(day => {
          const entry = grouped.get(day)!;
          const total = Object.values(entry).reduce((a, b) => a + b, 0);
          const heightPct = (total / maxValue) * 100;
          return (
            <div key={day} className="flex-1 h-full flex flex-col justify-end" title={t("dashboard.charts.issueCount", { count: total, displayCount: formatNumber(total), date: formatTooltipDate(day, locale) })}>
              {total > 0 ? (
                <div className="flex flex-col-reverse gap-px overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 2 }}>
                  {statusOrder.map(s => (entry[s] ?? 0) > 0 ? (
                    <div key={s} style={{ flex: entry[s], backgroundColor: statusColors[s] ?? "var(--hex-6b7280)" }} />
                  ) : null)}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-sm" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} locale={locale} />
      <ChartLegend items={statusOrder.map(s => ({ color: statusColors[s] ?? "var(--hex-6b7280)", label: knownTaskStatuses.has(s) ? t(`dashboard.charts.taskStatus.${s}`) : s }))} />
    </div>
  );
}

export function SuccessRateChart(props: RunChartProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const activity = resolveRunActivity(props);
  const days = activity.length > 0 ? activity.map((day) => day.date) : getLast14Days();
  const grouped = new Map(activity.map((day) => [day.date, day]));

  const hasData = activity.some(v => v.total > 0);
  if (!hasData) return <p className="text-xs text-muted-foreground">{t("dashboard.charts.noRuns")}</p>;

  return (
    <div>
      <div className="flex items-end gap-(--sz-3px) h-20">
        {days.map(day => {
          const entry = grouped.get(day) ?? emptyRunDay(day);
          // Recovered runs ultimately succeeded, so they count toward the rate
          // rather than dragging it down as failures.
          const effectiveSucceeded = entry.succeeded + entry.recovered;
          const rate = entry.total > 0 ? effectiveSucceeded / entry.total : 0;
          const color = entry.total === 0 ? undefined : rate >= 0.8 ? "var(--status-task-icon-done)" : rate >= 0.5 ? "var(--hex-eab308)" : "var(--status-task-icon-blocked)";
          return (
            <div key={day} className="flex-1 h-full flex flex-col justify-end" title={t("dashboard.charts.successRateTooltip", {
              date: formatTooltipDate(day, locale),
              rate: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(entry.total > 0 ? rate : 0),
              succeeded: formatNumber(effectiveSucceeded),
              total: formatNumber(entry.total),
            })}>
              {entry.total > 0 ? (
                <div style={{ height: `${rate * 100}%`, minHeight: 2, backgroundColor: color }} />
              ) : (
                <div className="bg-muted/30 rounded-sm" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <DateLabels days={days} locale={locale} />
    </div>
  );
}
