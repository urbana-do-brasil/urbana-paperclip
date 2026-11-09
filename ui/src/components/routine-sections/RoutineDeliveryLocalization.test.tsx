// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutineDetail } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { RoutineDetailContext, type RoutineDetailContextValue, type RoutineEditDraft } from "./context";
import { DeliverySection as StreamlinedDeliverySection } from "./editable-sections";
import { DeliverySection as ProductionDeliverySection } from "./editable-sections.production";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function renderSection(
  Section: typeof StreamlinedDeliverySection,
  locale: "en" | "pt-BR",
  triggers: RoutineDetail["triggers"] = [],
) {
  const setEditDraft = vi.fn();
  const draft = {
    title: "Routine",
    description: "",
    projectId: "",
    assigneeAgentId: "",
    priority: "medium",
    concurrencyPolicy: "coalesce_if_active",
    catchUpPolicy: "skip_missed",
    activityGatePolicy: triggers.length ? "require_external_activity" : "always",
    activityGateScope: "company",
    variables: [],
    env: null,
  } as RoutineEditDraft;
  const value = {
    routine: { id: "routine-1", companyId: "company-1", title: "Routine", triggers } as RoutineDetail,
    editDraft: draft,
    setEditDraft,
    navigateToSection: vi.fn(),
  } as unknown as RoutineDetailContextValue;

  await act(async () => {
    await i18n.changeLanguage(locale);
    root.render(
      <RoutineDetailContext.Provider value={value}>
        <Section />
      </RoutineDetailContext.Provider>,
    );
  });
  return { setEditDraft, draft };
}

const variants = [
  ["streamlined", StreamlinedDeliverySection],
  ["production", ProductionDeliverySection],
] as const;

describe.each(variants)("routine delivery localization (%s)", (_variant, Section) => {
  it("localizes policy choices and their accessible labels in PT-BR", async () => {
    await renderSection(Section, "pt-BR");
    expect(container.textContent).toContain("Concorrência");
    expect(container.textContent).toContain("Agrupar se já estiver em execução");
    expect(container.textContent).toContain("Ignorar janelas perdidas");
    expect(container.textContent).toContain("Adicione um gatilho de agenda");
    expect(container.querySelector('[role="radiogroup"][aria-label="Política de concorrência"]')).not.toBeNull();
  });

  it("keeps policy enum values stable and localizes the scheduled-fire preview", async () => {
    const triggers = [{
      id: "schedule-1",
      kind: "schedule",
      enabled: true,
      cronExpression: "0 9 * * *",
      timezone: "UTC",
    }] as unknown as RoutineDetail["triggers"];
    const { setEditDraft, draft } = await renderSection(Section, "en", triggers);
    expect(container.textContent).toContain("Run on every scheduled tick");
    expect(container.textContent).toContain("Activity scope");
    expect(container.textContent).toContain("Next 5 fires");
    expect(container.textContent).toContain("Times shown in UTC.");

    const enqueueOption = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Always enqueue"));
    expect(enqueueOption).toBeTruthy();
    await act(async () => enqueueOption!.click());
    const update = setEditDraft.mock.calls.at(-1)?.[0];
    expect(typeof update).toBe("function");
    expect((update as (current: RoutineEditDraft) => RoutineEditDraft)(draft).concurrencyPolicy)
      .toBe("always_enqueue");
  });
});
