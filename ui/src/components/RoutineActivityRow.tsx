import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ActivityEvent } from "@paperclipai/shared";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type RoutineActivityEvent = Pick<ActivityEvent, "id" | "action" | "details" | "createdAt">;

function formatTime(value: string | Date, locale: string): string {
  try {
    return new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(value);
  }
}

function summarizeEvent(
  event: RoutineActivityEvent,
  t: (key: string) => string,
): string {
  const details = event.details;
  if (event.action === "routine.webhook_test_received") {
    return t("routineActivity.summary.webhookTestReceived");
  }
  if (event.action === "routine.webhook_test_rejected") {
    return t("routineActivity.summary.webhookTestRejected");
  }
  if (event.action === "routine.webhook_received") {
    return t("routineActivity.summary.webhookReceived");
  }
  if (event.action === "routine.webhook_rejected") {
    return t("routineActivity.summary.webhookRejected");
  }
  if (!details) return "";
  if (typeof details.changeSummary === "string") return details.changeSummary;
  if (event.action === "routine.run_triggered") {
    const knownSources = ["webhook", "schedule", "manual", "api"];
    const source = typeof details.source === "string" && knownSources.includes(details.source)
      ? t(`routineActivity.sources.${details.source}`)
      : String(details.source ?? "").replaceAll("_", " ");
    const status = details.status === "issue_created"
      ? t("routineActivity.summary.taskCreated")
      : String(details.status ?? "").replaceAll("_", " ");
    return `${source} · ${status}`;
  }
  return Object.entries(details).filter(([key]) => !/id$/i.test(key)).slice(0, 3)
    .map(([key, value]) => `${key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").toLowerCase()}: ${formatDetailValue(value)}`)
    .join(" · ");
}

function formatDetailValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length === 0 ? "[]" : value.map(formatDetailValue).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

const actionKeys: Record<string, string> = {
  "routine.webhook_test_received": "routineActivity.actions.webhookTestReceived",
  "routine.webhook_test_rejected": "routineActivity.actions.webhookTestRejected",
  "routine.webhook_received": "routineActivity.actions.webhookReceived",
  "routine.webhook_rejected": "routineActivity.actions.webhookRejected",
  "routine.webhook_ignored": "routineActivity.actions.webhookIgnored",
  "routine.created": "routineActivity.actions.created",
  "routine.updated": "routineActivity.actions.updated",
  "routine.revision_created": "routineActivity.actions.revisionCreated",
  "routine.revision_restored": "routineActivity.actions.revisionRestored",
  "routine.document_annotation_remapped": "routineActivity.actions.documentAnnotationRemapped",
  "routine.document_annotation_thread_created": "routineActivity.actions.documentAnnotationThreadCreated",
  "routine.document_annotation_comment_added": "routineActivity.actions.documentAnnotationCommentAdded",
  "routine.trigger_created": "routineActivity.actions.triggerCreated",
  "routine.trigger_updated": "routineActivity.actions.triggerUpdated",
  "routine.trigger_deleted": "routineActivity.actions.triggerDeleted",
  "routine.trigger_removed": "routineActivity.actions.triggerRemoved",
  "routine.trigger_restored": "routineActivity.actions.triggerRestored",
  "routine.trigger_setup_finished": "routineActivity.actions.triggerSetupFinished",
  "routine.trigger_secret_rotated": "routineActivity.actions.triggerSecretRotated",
  "routine.run_triggered": "routineActivity.actions.runTriggered",
  "routine.run_skipped": "routineActivity.actions.runSkipped",
  "routine.run_created": "routineActivity.actions.runCreated",
  "routine.run.completed": "routineActivity.actions.runCompleted",
};
function actionLabel(action: string, t: (key: string) => string) {
  return actionKeys[action]
    ? t(actionKeys[action])
    : action
      .replace(/^routine[._]/, "")
      .replaceAll("_", " ")
      .replaceAll(".", " ")
      .replace(/^./, (char) => char.toUpperCase());
}

/** Activity log row with an expandable JSON payload (§3.7). */
export function RoutineActivityRow({ event }: { event: RoutineActivityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const hasPayload = event.details != null && Object.keys(event.details).length > 0;
  const summary = summarizeEvent(event, t);

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        disabled={!hasPayload}
        aria-expanded={hasPayload ? expanded : undefined}
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          "flex min-w-0 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs whitespace-nowrap",
          hasPayload ? "hover:bg-accent/30" : "cursor-default",
        )}
      >
        <span className="w-16 shrink-0 whitespace-nowrap font-mono tabular-nums text-muted-foreground">
          {formatTime(event.createdAt, locale)}
        </span>
        <span title={event.action} className="min-w-0 max-w-1/2 shrink-0 truncate font-medium text-foreground">
          {actionLabel(event.action, t)}
        </span>
        <span title={summary} className="min-w-0 flex-1 truncate text-muted-foreground">
          {summary}
        </span>
        {hasPayload ? (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-90",
            )}
          />
        ) : null}
      </button>
      {expanded && hasPayload ? (
        <pre className="mx-2 mb-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
          {JSON.stringify(event.details, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
