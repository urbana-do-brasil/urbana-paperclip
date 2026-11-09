type RoutineTriggerDraft = {
  kind: string;
  cronExpression: string;
  signingMode: string;
  replayWindowSec: string;
};

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function buildRoutineTriggerCreatePayload(
  draft: RoutineTriggerDraft,
  existingTriggers: ReadonlyArray<{ kind: string }>,
  timezone?: string,
): Record<string, unknown> {
  const existingOfKind = existingTriggers.filter((trigger) => trigger.kind === draft.kind).length;
  const payload: Record<string, unknown> = {
    kind: draft.kind,
    label: existingOfKind > 0 ? `${draft.kind}-${existingOfKind + 1}` : draft.kind,
  };

  if (draft.kind === "schedule") {
    payload.cronExpression = draft.cronExpression.trim();
    payload.timezone = timezone ?? getLocalTimezone();
  }

  if (draft.kind === "webhook") {
    payload.signingMode = draft.signingMode;
    payload.replayWindowSec = Number(draft.replayWindowSec || "300");
  }

  return payload;
}
