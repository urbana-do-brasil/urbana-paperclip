import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PipelineCompanyCaseEvent } from "../api/pipelines";
import { i18n } from "../i18n";
import {
  formatLearningEvent,
  groupLearningEventsByDay,
  learningDayKey,
  learningDayLabel,
} from "./pipeline-learnings";

const portugueseMessages = {
  pipelineManagement: {
    learnings: {
      fallbacks: {
        untitledItem: "Item sem título",
        someone: "Alguém",
        unknownDate: "Data desconhecida",
      },
      relativeDate: { today: "Hoje", yesterday: "Ontem" },
      events: {
        reviewApproved: "{{actor}} aprovou '{{itemTitle}}'{{stageCopy}}{{noteCopy}}.",
        reviewSentBack: "{{actor}} devolveu '{{itemTitle}}'{{stageCopy}}{{noteCopy}}.",
        reviewDeclined: "{{actor}} recusou '{{itemTitle}}'{{stageCopy}}{{noteCopy}}.",
        movingToStage: " movendo para {{stageName}}",
        noteSuffix: " — observação: {{note}}",
        forcedMove: "'{{itemTitle}}' foi movido manualmente{{fromStageCopy}}{{toStageCopy}}{{reasonCopy}}.",
        fromStage: " da etapa {{stageName}}",
        toStage: " para a etapa {{stageName}}",
        reasonSuffix: " — motivo: {{reason}}",
        unknown: "'{{itemTitle}}' sofreu uma alteração.",
      },
    },
  },
};

const englishMessages = {
  pipelineManagement: {
    learnings: {
      fallbacks: {
        untitledItem: "Untitled item",
        someone: "Someone",
        unknownDate: "Unknown date",
      },
      relativeDate: { today: "Today", yesterday: "Yesterday" },
      events: {
        reviewApproved: "{{actor}} approved '{{itemTitle}}'{{stageCopy}}{{noteCopy}}.",
        reviewSentBack: "{{actor}} sent back '{{itemTitle}}'{{stageCopy}}{{noteCopy}}.",
        reviewDeclined: "{{actor}} declined '{{itemTitle}}'{{stageCopy}}{{noteCopy}}.",
        movingToStage: " moving to {{stageName}}",
        noteSuffix: " — note: {{note}}",
        forcedMove: "'{{itemTitle}}' was moved by hand{{fromStageCopy}}{{toStageCopy}}{{reasonCopy}}.",
        fromStage: " from {{stageName}}",
        toStage: " to {{stageName}}",
        reasonSuffix: " — reason: {{reason}}",
        unknown: "'{{itemTitle}}' changed.",
      },
    },
  },
};

let previousLanguage = "pt-BR";
let previousPortugueseTranslation: unknown;
let previousEnglishTranslation: unknown;
const previousTimezone = process.env.TZ;

beforeAll(() => {
  previousLanguage = i18n.language;
  previousPortugueseTranslation = i18n.getResourceBundle("pt-BR", "translation");
  previousEnglishTranslation = i18n.getResourceBundle("en", "translation");
});

beforeEach(async () => {
  i18n.addResourceBundle("pt-BR", "translation", portugueseMessages, true, true);
  i18n.addResourceBundle("en", "translation", englishMessages, true, true);
  await i18n.changeLanguage("pt-BR");
});

afterEach(() => {
  vi.useRealTimers();
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
});

afterAll(async () => {
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
  i18n.removeResourceBundle("pt-BR", "translation");
  i18n.removeResourceBundle("en", "translation");
  if (previousPortugueseTranslation !== undefined) {
    i18n.addResourceBundle("pt-BR", "translation", previousPortugueseTranslation as Record<string, unknown>, true, true);
  }
  if (previousEnglishTranslation !== undefined) {
    i18n.addResourceBundle("en", "translation", previousEnglishTranslation as Record<string, unknown>, true, true);
  }
  await i18n.changeLanguage(previousLanguage);
  vi.useRealTimers();
});

function learningEvent(overrides: Partial<PipelineCompanyCaseEvent> = {}): PipelineCompanyCaseEvent {
  return {
    id: "event-1",
    companyId: "company-1",
    caseId: "item-1",
    type: "review_decided",
    actorType: "agent",
    createdAt: "2026-10-29T12:00:00.000Z",
    updatedAt: "2026-10-29T12:00:00.000Z",
    case: { id: "item-1", caseKey: null, title: "USER ITEM TITLE" },
    pipeline: { id: "pipeline-1", key: "pipeline-key", name: "USER PIPELINE" },
    ...overrides,
  };
}

describe("pipeline learning event presentation", () => {
  it("localizes review decisions while preserving dynamic actors, items, stages, and notes", async () => {
    const event = learningEvent({
      actorAgent: { id: "agent-1", name: "USER ACTOR" },
      toStage: { id: "stage-1", key: "done", name: "USER STAGE", kind: "terminal" },
      payload: { decision: "request_changes", note: "USER NOTE" },
    });

    expect(formatLearningEvent(event)).toEqual({
      kind: "review",
      sentence: "USER ACTOR devolveu 'USER ITEM TITLE' movendo para USER STAGE — observação: USER NOTE.",
    });

    await i18n.changeLanguage("en");
    expect(formatLearningEvent(event).sentence).toBe(
      "USER ACTOR sent back 'USER ITEM TITLE' moving to USER STAGE — note: USER NOTE.",
    );
  });

  it("localizes forced moves and unknown events while retaining source values", async () => {
    const forcedMove = learningEvent({
      type: "transition_forced",
      fromStage: { id: "stage-1", key: "old", name: "USER SOURCE STAGE", kind: "working" },
      toStage: { id: "stage-2", key: "new", name: "USER TARGET STAGE", kind: "working" },
      payload: { reason: "USER REASON" },
    });
    expect(formatLearningEvent(forcedMove).sentence).toBe(
      "'USER ITEM TITLE' foi movido manualmente da etapa USER SOURCE STAGE para a etapa USER TARGET STAGE — motivo: USER REASON.",
    );

    await i18n.changeLanguage("en");
    expect(formatLearningEvent(forcedMove).sentence).toBe(
      "'USER ITEM TITLE' was moved by hand from USER SOURCE STAGE to USER TARGET STAGE — reason: USER REASON.",
    );
    expect(formatLearningEvent(learningEvent({ type: "new_unknown_event" })).sentence).toBe(
      "'USER ITEM TITLE' changed.",
    );
  });

  it("uses translated actor and title fallbacks and handles every review outcome", async () => {
    const missingSourceValues = learningEvent({
      actorAgent: null,
      case: { id: "item-1", caseKey: null, title: "  " },
      payload: { reviewerName: "  ", decision: "reject" },
    });
    expect(formatLearningEvent(missingSourceValues).sentence).toBe(
      "Alguém recusou 'Item sem título'.",
    );

    await i18n.changeLanguage("en");
    expect(formatLearningEvent(missingSourceValues).sentence).toBe("Someone declined 'Untitled item'.");
    expect(formatLearningEvent(learningEvent({ payload: { decision: "drop" } })).sentence).toContain("declined");
    expect(formatLearningEvent(learningEvent({ payload: { decision: "approve" } })).sentence).toContain("approved");
  });
});

describe("pipeline learning date presentation", () => {
  it("localizes today, yesterday, older dates, and invalid date fallbacks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T15:00:00.000Z"));
    expect(learningDayLabel("2026-10-29T12:00:00.000Z")).toBe("Hoje");
    expect(learningDayLabel("2026-10-28T12:00:00.000Z")).toBe("Ontem");
    expect(learningDayLabel("not-a-date")).toBe("Data desconhecida");
    const oldDatePortuguese = learningDayLabel("2026-08-15T12:00:00.000Z");
    expect(oldDatePortuguese).toContain("15");

    await i18n.changeLanguage("en");
    expect(learningDayLabel("2026-10-29T12:00:00.000Z")).toBe("Today");
    expect(learningDayLabel("2026-10-28T12:00:00.000Z")).toBe("Yesterday");
    expect(learningDayLabel("not-a-date")).toBe("Unknown date");
    const oldDateEnglish = learningDayLabel("2026-08-15T12:00:00.000Z");
    expect(oldDateEnglish).toContain("15");
    expect(oldDateEnglish).not.toBe(oldDatePortuguese);
  });

  it("groups events by the same local calendar day used by their labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T15:00:00.000Z"));
    process.env.TZ = "America/Sao_Paulo";
    const beforeLocalMidnight = "2026-10-29T02:00:00.000Z";
    const afterLocalMidnight = "2026-10-29T10:00:00.000Z";
    expect(learningDayKey(beforeLocalMidnight)).toBe("2026-10-28");
    expect(learningDayLabel(beforeLocalMidnight)).toBe("Ontem");

    const groups = groupLearningEventsByDay([
      { id: "before-midnight", createdAt: beforeLocalMidnight },
      { id: "after-midnight", createdAt: afterLocalMidnight },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe(learningDayKey(beforeLocalMidnight));
    expect(groups[0].label).toBe(learningDayLabel(beforeLocalMidnight));
  });
});
