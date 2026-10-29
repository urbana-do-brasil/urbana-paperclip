import { formatDateTime } from "./utils";

type RetryAwareRun = {
  status: string;
  retryOfRunId?: string | null;
  scheduledRetryAt?: string | Date | null;
  scheduledRetryAttempt?: number | null;
  scheduledRetryReason?: string | null;
  retryExhaustedReason?: string | null;
};

export type RunRetryStateSummary = {
  kind: "scheduled" | "exhausted" | "attempted";
  badgeLabel: string;
  tone: string;
  detail: string | null;
  secondary: string | null;
  retryOfRunId: string | null;
};

export type RetryStateTranslator = (
  key: string,
  options?: { count?: number; reason?: string; date?: string },
) => string;

const RETRY_REASON_LABELS: Record<string, string> = {
  native_provider_overloaded: "Model at capacity",
  ai_connection_pool_wait: "Waiting for pool usage to recover",
  transient_failure: "Transient failure",
  missing_issue_comment: "Missing task comment",
  process_lost: "Process lost",
  assignment_recovery: "Assignment recovery",
  issue_continuation_needed: "Continuation needed",
  max_turns_continuation: "Max-turn continuation",
};

function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function joinFragments(parts: Array<string | null>) {
  const filtered = parts.filter((part): part is string => Boolean(part));
  return filtered.length > 0 ? filtered.join(" · ") : null;
}

export function formatRetryReason(reason: string | null | undefined, translate?: RetryStateTranslator) {
  const normalized = readNonEmptyString(reason);
  if (!normalized) return null;
  if (RETRY_REASON_LABELS[normalized]) {
    return translate
      ? translate(`taskDetail.execution.retry.reasons.${normalized}`)
      : RETRY_REASON_LABELS[normalized];
  }
  return translate ? normalized : normalized.replace(/_/g, " ");
}

export function describeRunRetryState(run: RetryAwareRun, translate?: RetryStateTranslator): RunRetryStateSummary | null {
  const copy = (
    key: string,
    fallback: string,
    options?: { count?: number; reason?: string; date?: string },
  ) => translate ? translate(`taskDetail.execution.retry.${key}`, options) : fallback;
  const attempt =
    typeof run.scheduledRetryAttempt === "number" && Number.isFinite(run.scheduledRetryAttempt) && run.scheduledRetryAttempt > 0
      ? run.scheduledRetryAttempt
      : null;
  const attemptLabel = attempt ? copy("attempt", `Attempt ${attempt}`, { count: attempt }) : null;
  const reasonLabel = formatRetryReason(run.scheduledRetryReason, translate);
  const retryOfRunId = readNonEmptyString(run.retryOfRunId);
  const exhaustedReason = readNonEmptyString(run.retryExhaustedReason);
  const dueAt = run.scheduledRetryAt ? formatDateTime(run.scheduledRetryAt) : null;
  const isMaxTurnContinuation = run.scheduledRetryReason === "max_turns_continuation";
  const hasRetryMetadata =
    Boolean(retryOfRunId)
    || Boolean(reasonLabel)
    || Boolean(dueAt)
    || Boolean(attemptLabel)
    || Boolean(exhaustedReason);

  if (!hasRetryMetadata) return null;

  if (run.status === "scheduled_retry") {
    return {
      kind: "scheduled",
      badgeLabel: run.scheduledRetryReason === "ai_connection_pool_wait"
        ? copy("poolExhausted", "Pool exhausted")
        : isMaxTurnContinuation
          ? copy("continuationScheduledBadge", "Continuation scheduled")
          : copy("retryScheduledBadge", "Retry scheduled"),
      tone: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      detail: joinFragments([attemptLabel, reasonLabel]),
      secondary: dueAt
        ? copy(isMaxTurnContinuation ? "nextContinuationAt" : "nextRetryAt", `${isMaxTurnContinuation ? "Next continuation" : "Next retry"} ${dueAt}`, { date: dueAt })
        : copy(isMaxTurnContinuation ? "nextContinuationPending" : "nextRetryPending", `${isMaxTurnContinuation ? "Next continuation" : "Next retry"} pending schedule`),
      retryOfRunId,
    };
  }

  if (exhaustedReason) {
    return {
      kind: "exhausted",
      badgeLabel: isMaxTurnContinuation
        ? copy("continuationExhausted", "Continuation exhausted")
        : copy("retryExhausted", "Retry exhausted"),
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      detail: joinFragments([attemptLabel, reasonLabel, copy("automaticRetriesExhausted", "Automatic retries exhausted")]),
      secondary: exhaustedReason.includes("Manual intervention required")
        ? exhaustedReason
        : copy("manualInterventionRequired", `${exhaustedReason} Manual intervention required.`, { reason: exhaustedReason }),
      retryOfRunId,
    };
  }

  return {
    kind: "attempted",
    badgeLabel: isMaxTurnContinuation
      ? copy("continuedRun", "Continued run")
      : copy("retriedRun", "Retried run"),
    tone: "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    detail: joinFragments([attemptLabel, reasonLabel]),
    secondary: null,
    retryOfRunId,
  };
}
