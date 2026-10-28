import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, TimerReset } from "lucide-react";
import { resolveLocale } from "@paperclipai/shared/localization";
import { healthApi, type DevServerHealthStatus } from "../api/health";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "../i18n";

const RESTART_PENDING_RESET_MS = 30_000;

function formatRelativeTimestamp(value: string | null, locale: string): string | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return null;

  const deltaMs = Math.max(0, Date.now() - timestamp);
  const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (deltaMs < 60_000) return relativeTime.format(0, "second");
  const deltaMinutes = Math.round(deltaMs / 60_000);
  if (deltaMinutes < 60) return relativeTime.format(-deltaMinutes, "minute");
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return relativeTime.format(-deltaHours, "hour");
  const deltaDays = Math.round(deltaHours / 24);
  return relativeTime.format(-deltaDays, "day");
}

function describeReason(devServer: DevServerHealthStatus, t: (key: string) => string): string {
  if (devServer.reason === "backend_changes_and_pending_migrations") {
    return t("devRestart.backendChangesAndMigrations");
  }
  if (devServer.reason === "pending_migrations") {
    return t("devRestart.pendingMigrations");
  }
  return t("devRestart.backendChanges");
}

export function DevRestartBanner({ devServer }: { devServer?: DevServerHealthStatus }) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const [restartPending, setRestartPending] = useState(false);
  useEffect(() => {
    if (!restartPending) return;
    const timeout = window.setTimeout(() => {
      setRestartPending(false);
    }, RESTART_PENDING_RESET_MS);
    return () => window.clearTimeout(timeout);
  }, [restartPending]);

  if (!devServer?.enabled || !devServer.restartRequired) return null;

  const currentDevServer = devServer;
  const changedAt = formatRelativeTimestamp(devServer.lastChangedAt, locale);
  const sample = devServer.changedPathsSample.slice(0, 3);
  const activeRunLabel = t(
    devServer.activeRunCount === 1 ? "devRestart.activeRunSingle" : "devRestart.activeRunMultiple",
    { count: devServer.activeRunCount },
  );

  async function requestRestartNow() {
    const warning =
      currentDevServer.activeRunCount > 0
        ? t("devRestart.restartWithRuns", { activeRuns: activeRunLabel })
        : t("devRestart.restartWithoutRuns");
    if (!window.confirm(warning)) return;

    setRestartPending(true);
    try {
      await healthApi.requestDevServerRestart();
    } catch (error) {
      setRestartPending(false);
      window.alert(error instanceof Error ? error.message : t("devRestart.failedRequest"));
    }
  }

  return (
    <div className="border-b border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex flex-col gap-3 px-3 py-2.5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-(--tracking-caps)">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{t("devRestart.restartRequired")}</span>
            {devServer.autoRestartEnabled ? (
              <Badge variant="ghost" className="bg-amber-900/10 text-(length:--text-nano) tracking-(--tracking-eyebrow) dark:bg-amber-100/10">
                {t("devRestart.autoRestartOn")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm">
            {describeReason(devServer, t)}
            {changedAt ? ` · ${t("devRestart.updatedAt", { relativeTime: changedAt })}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-900/80 dark:text-amber-100/75">
            {sample.length > 0 ? (
              <span>
                {t("devRestart.changedPaths", { paths: sample.join(", ") })}
                {devServer.changedPathCount > sample.length ? t("devRestart.morePaths", { count: devServer.changedPathCount - sample.length }) : ""}
              </span>
            ) : null}
            {devServer.pendingMigrations.length > 0 ? (
              <span>
                {t("devRestart.pendingMigrationsSummary", { migrations: devServer.pendingMigrations.slice(0, 2).join(", ") })}
                {devServer.pendingMigrations.length > 2 ? t("devRestart.moreMigrations", { count: devServer.pendingMigrations.length - 2 }) : ""}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium md:justify-end">
          {devServer.waitingForIdle ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-900/10 px-3 py-1.5 dark:bg-amber-100/10">
              <TimerReset className="h-3.5 w-3.5" />
              <span>{t("devRestart.waitingForRuns", { activeRuns: activeRunLabel })}</span>
            </div>
          ) : devServer.autoRestartEnabled ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-900/10 px-3 py-1.5 dark:bg-amber-100/10">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("devRestart.autoRestartWhenIdle")}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-900/10 px-3 py-1.5 dark:bg-amber-100/10">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("devRestart.restartCommandBefore")} <code>pnpm dev:once</code> {t("devRestart.restartCommandAfter")}</span>
            </div>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-50 transition-colors hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
            onClick={() => {
              void requestRestartNow();
            }}
            disabled={restartPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{restartPending ? t("devRestart.restartRequested") : t("devRestart.restartNow")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
