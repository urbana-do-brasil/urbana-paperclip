// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { RoutineActivityRow, type RoutineActivityEvent } from "./RoutineActivityRow";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const events: RoutineActivityEvent[] = [
  "routine.document_annotation_thread_resolved",
  "routine.document_annotation_thread_reopened",
  "routine.origin_stamped",
  "routine.origin_cleared",
].map((action, index) => ({
  id: `activity-${index}`,
  action,
  details: { documentKey: "description", threadId: "thread-123", originId: "pipeline-456" },
  createdAt: new Date("2026-11-03T12:30:00.000Z"),
}));

const portugueseLabels = [
  "Tópico de anotação resolvido",
  "Tópico de anotação reaberto",
  "Rotina vinculada à automação do pipeline",
  "Rotina desvinculada da automação do pipeline",
];

const englishLabels = [
  "Annotation thread resolved",
  "Annotation thread reopened",
  "Routine linked to pipeline automation",
  "Routine unlinked from pipeline automation",
];

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  await i18n.changeLanguage("pt-BR");
  container.remove();
});

async function renderRows() {
  await act(async () => root.render(<>
    {events.map((event) => <RoutineActivityRow key={event.id} event={event} />)}
  </>));
}

describe("RoutineActivityRow localization", () => {
  it("localizes known annotation and pipeline-origin events while preserving event data", async () => {
    await renderRows();

    const rows = [...container.querySelectorAll("button")];
    expect(rows).toHaveLength(events.length);
    rows.forEach((row, index) => {
      expect(row.textContent).toContain(portugueseLabels[index]);
      expect(row.querySelector(`[title="${events[index]?.action}"]`)?.textContent).toContain(portugueseLabels[index]);
    });

    await act(async () => rows[0]?.click());
    expect(container.querySelector("pre")?.textContent).toBe(JSON.stringify(events[0]?.details, null, 2));
    events.forEach((event, index) => {
      expect(event.action).toBe([
        "routine.document_annotation_thread_resolved",
        "routine.document_annotation_thread_reopened",
        "routine.origin_stamped",
        "routine.origin_cleared",
      ][index]);
      expect(event.details).toEqual({ documentKey: "description", threadId: "thread-123", originId: "pipeline-456" });
    });

    await i18n.changeLanguage("en");
    await renderRows();
    const englishRows = [...container.querySelectorAll("button")];
    englishRows.forEach((row, index) => {
      expect(row.textContent).toContain(englishLabels[index]);
      expect(row.querySelector(`[title="${events[index]?.action}"]`)?.textContent).toContain(englishLabels[index]);
    });
  });
});
