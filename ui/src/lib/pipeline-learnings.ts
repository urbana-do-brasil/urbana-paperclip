import type { PipelineCompanyCaseEvent } from "../api/pipelines";
import { t } from "../i18n";
import { formatShortDate } from "./utils";

export type LearningEventPresentation = {
  sentence: string;
  kind: "review" | "forced_move" | "unknown";
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function eventItemTitle(event: PipelineCompanyCaseEvent): string {
  const payload = asRecord(event.payload);
  return (
    asString(event.case?.title) ??
    asString(payload.itemTitle) ??
    asString(payload.caseTitle) ??
    asString(payload.title) ??
    t("pipelineManagement.learnings.fallbacks.untitledItem")
  );
}

function eventActorName(event: PipelineCompanyCaseEvent): string {
  const payload = asRecord(event.payload);
  return (
    asString(event.actorAgent?.name) ??
    asString(payload.actorName) ??
    asString(payload.reviewerName) ??
    asString(payload.decidedByName) ??
    t("pipelineManagement.learnings.fallbacks.someone")
  );
}

function payloadText(event: PipelineCompanyCaseEvent, ...keys: string[]): string | null {
  const payload = asRecord(event.payload);
  for (const key of keys) {
    const value = asString(payload[key]);
    if (value) return value;
  }
  return null;
}

function reviewSentenceKey(decision: string | null) {
  if (decision === "request_changes") return "pipelineManagement.learnings.events.reviewSentBack";
  if (decision === "reject" || decision === "drop") return "pipelineManagement.learnings.events.reviewDeclined";
  return "pipelineManagement.learnings.events.reviewApproved";
}

export function formatLearningEvent(event: PipelineCompanyCaseEvent): LearningEventPresentation {
  const payload = asRecord(event.payload);
  const title = eventItemTitle(event);

  if (event.type === "review_decided") {
    const actor = eventActorName(event);
    const decision = asString(payload.decision);
    const toStageName =
      asString(event.toStage?.name) ?? payloadText(event, "toStageName", "stageName", "targetStageName");
    const stageCopy = toStageName
      ? t("pipelineManagement.learnings.events.movingToStage", { stageName: toStageName })
      : "";
    const note = payloadText(event, "reason", "note");
    const noteCopy = note ? t("pipelineManagement.learnings.events.noteSuffix", { note }) : "";
    return {
      kind: "review",
      sentence: t(reviewSentenceKey(decision), { actor, itemTitle: title, stageCopy, noteCopy }),
    };
  }

  if (event.type === "transition_forced") {
    const fromStageName = asString(event.fromStage?.name) ?? payloadText(event, "fromStageName");
    const toStageName =
      asString(event.toStage?.name) ?? payloadText(event, "toStageName", "stageName", "targetStageName");
    const fromCopy = fromStageName
      ? t("pipelineManagement.learnings.events.fromStage", { stageName: fromStageName })
      : "";
    const toCopy = toStageName
      ? t("pipelineManagement.learnings.events.toStage", { stageName: toStageName })
      : "";
    const reason = payloadText(event, "reason", "note");
    const reasonCopy = reason ? t("pipelineManagement.learnings.events.reasonSuffix", { reason }) : "";
    return {
      kind: "forced_move",
      sentence: t("pipelineManagement.learnings.events.forcedMove", {
        itemTitle: title,
        fromStageCopy: fromCopy,
        toStageCopy: toCopy,
        reasonCopy,
      }),
    };
  }

  return {
    kind: "unknown",
    sentence: t("pipelineManagement.learnings.events.unknown", { itemTitle: title }),
  };
}

export function learningDayKey(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("pipelineManagement.learnings.fallbacks.unknownDate");
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function learningDayLabel(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("pipelineManagement.learnings.fallbacks.unknownDate");
  const today = new Date();
  const startOfToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday - startOfDay) / 86_400_000);
  if (diffDays === 0) return t("pipelineManagement.learnings.relativeDate.today");
  if (diffDays === 1) return t("pipelineManagement.learnings.relativeDate.yesterday");
  return formatShortDate(date);
}

export function groupLearningEventsByDay<T extends { createdAt: string | Date }>(events: T[]) {
  const groups: Array<{ key: string; label: string; events: T[] }> = [];
  for (const event of events) {
    const key = learningDayKey(event.createdAt);
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.events.push(event);
      continue;
    }
    groups.push({ key, label: learningDayLabel(event.createdAt), events: [event] });
  }
  return groups;
}
