import { AlertTriangle, ExternalLink, Loader2, Lock, RefreshCw } from "lucide-react";
import type { PipelineCaseLiveness } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { useTranslation } from "@/i18n";
import { cn } from "../lib/utils";
import { createIssueDetailPath } from "../lib/issueDetailBreadcrumb";
import {
  derivePipelineLivenessBanner,
  type LivenessBannerTone,
  type LivenessRetryKind,
} from "../lib/pipeline-liveness";

interface TonePalette {
  section: string;
  icon: string;
  pulse: string;
  link: string;
  button: string;
  Icon: typeof AlertTriangle;
}

const TONE_PALETTES: Record<LivenessBannerTone, TonePalette> = {
  blocked: {
    section:
      "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100",
    icon: "text-amber-700 dark:text-amber-300",
    pulse: "bg-amber-500",
    link: "text-amber-900 dark:text-amber-100",
    button:
      "border-amber-300 bg-transparent hover:bg-amber-100 dark:border-amber-900/70 dark:hover:bg-amber-950/40",
    Icon: AlertTriangle,
  },
  permission: {
    section:
      "border-purple-300 bg-purple-50 text-purple-950 dark:border-purple-900/70 dark:bg-purple-950/30 dark:text-purple-100",
    icon: "text-purple-700 dark:text-purple-300",
    pulse: "bg-purple-500",
    link: "text-purple-900 dark:text-purple-100",
    button:
      "border-purple-300 bg-transparent hover:bg-purple-100 dark:border-purple-900/70 dark:hover:bg-purple-950/40",
    Icon: Lock,
  },
  retry: {
    section:
      "border-indigo-300 bg-indigo-50 text-indigo-950 dark:border-indigo-900/70 dark:bg-indigo-950/30 dark:text-indigo-100",
    icon: "text-indigo-700 dark:text-indigo-300",
    pulse: "bg-indigo-500",
    link: "text-indigo-900 dark:text-indigo-100",
    button:
      "border-indigo-300 bg-transparent hover:bg-indigo-100 dark:border-indigo-900/70 dark:hover:bg-indigo-950/40",
    Icon: RefreshCw,
  },
  attention: {
    section:
      "border-orange-300 bg-orange-50 text-orange-950 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-100",
    icon: "text-orange-700 dark:text-orange-300",
    pulse: "bg-orange-500",
    link: "text-orange-900 dark:text-orange-100",
    button:
      "border-orange-300 bg-transparent hover:bg-orange-100 dark:border-orange-900/70 dark:hover:bg-orange-950/40",
    Icon: AlertTriangle,
  },
};

export function PipelineLivenessBanner({
  liveness,
  onRetry,
  retryPending = false,
  retryError = null,
}: {
  liveness: PipelineCaseLiveness | null | undefined;
  onRetry?: (kind: LivenessRetryKind) => void;
  retryPending?: boolean;
  retryError?: string | null;
}) {
  const { t } = useTranslation();
  const view = derivePipelineLivenessBanner(liveness);
  if (!view) return null;

  const title = (() => {
    switch (view.reason) {
      case "case_blocked":
      case "linked_issue_blocked":
        return t("pipelineManagement.detail.liveness.titles.blocked");
      case "permission_preflight_failed":
        return t("pipelineManagement.detail.liveness.titles.permissionNeeded");
      case "automation_failed":
        return t(view.tone === "retry"
          ? "pipelineManagement.detail.liveness.titles.retryReady"
          : "pipelineManagement.detail.liveness.titles.automationFailed");
      case "breakdown_pending":
        return t("pipelineManagement.detail.liveness.titles.breakdownPending");
      case "breakdown_incomplete":
        return t("pipelineManagement.detail.liveness.titles.breakdownIncomplete");
      case "no_action_path":
        return t("pipelineManagement.detail.liveness.titles.stuck");
      default:
        return view.title;
    }
  })();
  const body = (() => {
    if (view.reason === "no_action_path") {
      return t("pipelineManagement.detail.liveness.bodies.noActionPath");
    }
    if (view.reason === "breakdown_incomplete") {
      const missingCount = liveness?.breakdown?.missingRequestKeys?.length ?? 0;
      if (missingCount > 0) {
        const suffixKey = missingCount === 1
          ? "pipelineManagement.detail.liveness.bodies.breakdownMissingSingular"
          : "pipelineManagement.detail.liveness.bodies.breakdownMissingPlural";
        return `${liveness?.message ?? view.body} ${t(suffixKey, { count: missingCount })}`;
      }
    }
    // Server messages and other source content remain verbatim.
    return view.body;
  })();
  const helperNote = view.helperNote
    ? t(view.reason === "permission_preflight_failed"
      ? "pipelineManagement.detail.liveness.helper.permission"
      : "pipelineManagement.detail.liveness.helper.autoRetry")
    : null;
  const retryLabel = view.reason === "automation_failed"
    ? t("pipelineManagement.detail.liveness.retry.retryNow")
    : t("pipelineManagement.detail.liveness.retry.rerunStageAutomation");

  const palette = TONE_PALETTES[view.tone];
  const { Icon } = palette;
  const showRetry = view.showRetry && typeof onRetry === "function";

  return (
    <section
      role="status"
      aria-label={title}
      className={cn(
        "mb-5 flex flex-col gap-3 border-y py-4 md:flex-row md:items-start md:justify-between",
        palette.section,
      )}
    >
      <div className="flex min-w-0 gap-3">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", palette.icon)} aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {view.tone === "retry" ? (
              <span
                className={cn("h-1.5 w-1.5 animate-pulse rounded-full", palette.pulse)}
                aria-hidden="true"
              />
            ) : null}
            {title}
          </h2>
          <p className="text-sm opacity-85">{body}</p>
          {view.permissionKey ? (
            <p className="text-sm opacity-85">
              {t("pipelineManagement.detail.liveness.permission.required")}{" "}
              <code className="rounded-sm bg-black/10 px-1 py-0.5 text-xs font-medium dark:bg-white/10">
                {view.permissionKey}
              </code>{" "}
              {t("pipelineManagement.detail.liveness.permission.targetPipeline")}
            </p>
          ) : null}
          {view.blockerLink || view.automationLink ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {view.blockerLink ? (
                <Link
                  to={createIssueDetailPath(view.blockerLink.identifier ?? view.blockerLink.issueId)}
                  className={cn("inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline", palette.link)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {view.blockerLink.identifier
                    ? t("pipelineManagement.detail.liveness.openLink.identifier", { identifier: view.blockerLink.identifier })
                    : t("pipelineManagement.detail.liveness.openLink.blocker")}
                  {view.blockerLink.title ? `: ${view.blockerLink.title}` : ""}
                </Link>
              ) : null}
              {view.automationLink ? (
                <Link
                  to={createIssueDetailPath(view.automationLink.identifier ?? view.automationLink.issueId)}
                  className={cn("inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline", palette.link)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {view.automationLink.identifier
                    ? t("pipelineManagement.detail.liveness.openLink.identifier", { identifier: view.automationLink.identifier })
                    : t("pipelineManagement.detail.liveness.openLink.automationTask")}
                </Link>
              ) : null}
            </p>
          ) : null}
          {helperNote ? (
            <p className="text-xs italic opacity-70">{helperNote}</p>
          ) : null}
          {retryError ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {retryError}
            </p>
          ) : null}
        </div>
      </div>
      {showRetry ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("shrink-0", palette.button)}
          disabled={retryPending}
          onClick={() => onRetry?.(view.retryKind)}
        >
          {retryPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {retryPending ? t("pipelineManagement.detail.liveness.retry.retrying") : retryLabel}
        </Button>
      ) : null}
    </section>
  );
}
