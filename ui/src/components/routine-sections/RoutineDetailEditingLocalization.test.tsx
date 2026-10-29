// @vitest-environment jsdom

import { act, createRef, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoutineDetail } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import type { MentionOption } from "../MarkdownEditor";
import { RoutineDetailContext, type RoutineDetailContextValue, type RoutineEditDraft } from "./context";
import {
  OverviewSection as StreamlinedOverview,
  VariablesSection as StreamlinedVariables,
  SecretsSection as StreamlinedSecrets,
} from "./editable-sections";
import {
  OverviewSection as ProductionOverview,
  VariablesSection as ProductionVariables,
  SecretsSection as ProductionSecrets,
} from "./editable-sections.production";

vi.mock("../MarkdownEditor", () => ({
  MarkdownEditor: ({ placeholder }: { placeholder?: string }) => <textarea placeholder={placeholder} />,
}));
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

async function renderSection(Section: ComponentType, locale: "en" | "pt-BR") {
  const editDraft = {
    title: "Daily report",
    description: "",
    projectId: "",
    assigneeAgentId: "",
    priority: "medium",
    concurrencyPolicy: "coalesce_if_active",
    catchUpPolicy: "skip_missed",
    activityGatePolicy: "always",
    activityGateScope: "company",
    variables: [],
    env: null,
  } as RoutineEditDraft;
  const value = {
    routine: {
      id: "routine-1",
      companyId: "company-1",
      title: "Daily report",
      description: "",
      status: "active",
      assigneeAgentId: null,
      projectId: null,
      triggers: [],
    } as unknown as RoutineDetail,
    editDraft,
    setEditDraft: vi.fn(),
    assigneeOptions: [],
    projectOptions: [],
    recentAssigneeIds: [],
    recentProjectIds: [],
    agentById: new Map(),
    projectById: new Map(),
    currentAssignee: null,
    currentProject: null,
    mentionOptions: [] as MentionOption[],
    assigneeSelectorRef: createRef<HTMLButtonElement>(),
    projectSelectorRef: createRef<HTMLButtonElement>(),
    descriptionEditorRef: createRef<HTMLTextAreaElement>(),
    routineRuns: [],
    activity: [],
    saveRoutine: { isPending: false, mutate: vi.fn() },
    saveConflict: false,
    isSectionDirty: () => false,
    navigateToSection: vi.fn(),
    availableSecrets: [],
    createSecret: { mutateAsync: vi.fn() },
  } as unknown as RoutineDetailContextValue;

  await act(async () => {
    await i18n.changeLanguage(locale);
    root.render(
      <RoutineDetailContext.Provider value={value}>
        <Section />
      </RoutineDetailContext.Provider>,
    );
  });
  return value;
}

const variants = [
  ["streamlined", StreamlinedOverview, StreamlinedVariables, StreamlinedSecrets],
  ["production", ProductionOverview, ProductionVariables, ProductionSecrets],
] as const;

describe.each(variants)("routine editor localization (%s)", (_name, Overview, Variables, Secrets) => {
  it("localizes overview assignment, instruction and status copy in PT-BR", async () => {
    await renderSection(Overview, "pt-BR");
    expect(container.textContent).toContain("Responsável");
    expect(container.textContent).toContain("Projeto");
    expect(container.textContent).toContain("É necessário definir um agente padrão.");
    expect(container.querySelector("textarea")?.placeholder).toBe("Adicionar instruções...");
    const responsibleSelector = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.trim() === "Responsável");
    expect(responsibleSelector).toBeTruthy();
    await act(async () => responsibleSelector!.click());
    expect(document.querySelector('[aria-label="Fechar seletor"]')).not.toBeNull();
    expect(container.textContent).toContain("Atividade recente");
    expect(container.textContent).not.toContain("Recent activity");
  });

  it("localizes variable guidance and secret policy in PT-BR", async () => {
    const value = await renderSection(Variables, "pt-BR");
    expect(container.textContent).toContain("As variáveis são detectadas automaticamente");
    expect(container.textContent).toContain("Ainda não há variáveis. Adicione um {{placeholder}}");
    await act(async () => root.render(
      <RoutineDetailContext.Provider value={value}>
        <Secrets />
      </RoutineDetailContext.Provider>,
    ));
    expect(container.textContent).toContain("Os segredos da rotina se aplicam");
    expect(container.textContent).toContain("PAPERCLIP_* é um nome reservado.");
  });
});
