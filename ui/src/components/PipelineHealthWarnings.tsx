import { AlertTriangle, ChevronRight } from "lucide-react";
import type { PipelineHealthWarning } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { useTranslation } from "@/i18n";
import { cn } from "../lib/utils";

/**
 * Setup-health warnings for pipelines. New warnings use semantic keys and
 * localized templates here; `message` remains a fallback for older warning
 * producers and snapshots that do not include a translation key.
 */

function warningCount(count: number, t: ReturnType<typeof useTranslation>["t"]) {
  return t("pipelineManagement.health.warningCount", { count });
}

/** Board-bar caps its list so a busy pipeline doesn't render a wall of warnings. */
const BOARD_WARNING_CAP = 5;

function WarningMessage({
  warning,
  t,
}: {
  warning: PipelineHealthWarning;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const params = { ...warning.translationParams };
  if (
    (warning.translationKey === "assignedAgentPaused" || warning.translationKey === "reviewApproverPaused") &&
    !params.agentName
  ) {
    params.agentName = t("pipelineManagement.health.teammate");
  }
  const message = warning.translationKey
    ? t(`pipelineManagement.health.warnings.${warning.translationKey}`, params)
    : warning.message;
  const linkLabel = warning.hrefLabelKey
    ? t(`pipelineManagement.health.actions.${warning.hrefLabelKey}`)
    : warning.hrefLabel ?? t("pipelineManagement.health.actions.open");
  return (
    <>
      {message}
      {warning.href ? (
        <>
          {" "}
          <Link to={warning.href} className="font-medium underline underline-offset-2">
            {linkLabel}
          </Link>
        </>
      ) : null}
    </>
  );
}

/**
 * Board-header bar: a single amber strip summarising every stage that won't run,
 * with each warning optionally clickable to jump to that stage's settings.
 */
export function PipelineHealthBar({
  warnings,
  onSelectStage,
  className,
}: {
  warnings: PipelineHealthWarning[];
  onSelectStage?: (stageId: string) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  if (warnings.length === 0) return null;
  const shown = warnings.slice(0, BOARD_WARNING_CAP);
  const overflow = warnings.length - shown.length;
  const warningSummary = warningCount(warnings.length, t);
  return (
    <div
      role="region"
      aria-labelledby="pipeline-health-bar-heading"
      className={cn(
        "rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-200",
        className,
      )}
    >
      <h2 id="pipeline-health-bar-heading" className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{t("pipelineManagement.health.barTitle", { summary: warningSummary })}</span>
      </h2>
      <ul className="mt-1.5 space-y-1 pl-6 text-sm">
        {shown.map((warning, index) => {
          const body = (
            <>
              <span className="font-medium">{warning.stageName}:</span> <WarningMessage warning={warning} t={t} />
            </>
          );
          return (
            <li key={`${warning.stageId}-${warning.code}-${index}`} className="list-disc">
              {warning.href ? (
                <span>{body}</span>
              ) : onSelectStage ? (
                <button
                  type="button"
                  aria-label={t("pipelineManagement.health.openStageSettings", { stageName: warning.stageName })}
                  className="group flex w-full items-start gap-1 text-left underline-offset-2 hover:underline"
                  onClick={() => onSelectStage(warning.stageId)}
                >
                  <span className="min-w-0 flex-1">{body}</span>
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                </button>
              ) : (
                <span>{body}</span>
              )}
            </li>
          );
        })}
      </ul>
      {overflow > 0 ? (
        <p className="mt-1.5 pl-6 text-xs text-amber-800/80 dark:text-amber-200/70">
          {t("pipelineManagement.health.overflow", { count: overflow })}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Compact per-stage warning list, shown inside a stage's settings panel.
 */
export function StageHealthWarnings({
  warnings,
  className,
}: {
  warnings: PipelineHealthWarning[];
  className?: string;
}) {
  const { t } = useTranslation();
  if (warnings.length === 0) return null;
  return (
    <div
      role="region"
      aria-labelledby="stage-health-warnings-heading"
      className={cn(
        "rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-200",
        className,
      )}
    >
      <h2
        id="stage-health-warnings-heading"
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {t("pipelineManagement.health.stageTitle", { count: warnings.length })}
        </span>
      </h2>
      <ul className="mt-1.5 space-y-1 pl-6">
        {warnings.map((warning, index) => (
          <li key={`${warning.code}-${index}`} className="list-disc">
            <WarningMessage warning={warning} t={t} />
          </li>
        ))}
      </ul>
    </div>
  );
}
