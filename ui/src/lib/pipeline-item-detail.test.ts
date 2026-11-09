import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PipelineCaseEvent } from "../api/pipelines";
import { i18n } from "../i18n";
import { formatPipelineItemEvent } from "./pipeline-item-detail";

function automationFailureEvent(error: string): PipelineCaseEvent {
  return {
    id: "event-1",
    companyId: "company-1",
    caseId: "case-1",
    type: "automation_failed",
    actorType: "system",
    payload: { error },
    createdAt: "2026-11-03T12:00:00.000Z",
    updatedAt: "2026-11-03T12:00:00.000Z",
  };
}

describe("pipeline automation failure event localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("localizes the known Paperclip reason in English and Portuguese without changing the event data", async () => {
    const event = automationFailureEvent("automation_not_configured");
    const payloadBeforePresentation = structuredClone(event.payload);

    expect(formatPipelineItemEvent(event)).toBe(
      "Automation needs attention — stage automation is not configured.",
    );

    await i18n.changeLanguage("pt-BR");
    expect(formatPipelineItemEvent(event)).toBe(
      "A automação precisa de atenção — a automação da etapa não está configurada.",
    );
    expect(event.payload).toEqual(payloadBeforePresentation);
    expect(event.payload?.error).toBe("automation_not_configured");
  });

  it("keeps unknown runtime details unchanged while localizing the event frame", async () => {
    const event = automationFailureEvent("custom runner timed out");
    const payloadBeforePresentation = structuredClone(event.payload);

    expect(formatPipelineItemEvent(event)).toBe(
      "Automation needs attention — custom runner timed out.",
    );

    await i18n.changeLanguage("pt-BR");
    expect(formatPipelineItemEvent(event)).toBe(
      "A automação precisa de atenção — custom runner timed out.",
    );
    expect(event.payload).toEqual(payloadBeforePresentation);
  });
});
