// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CompanySecret, PipelineHealthWarning, RoutineEnvConfig } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { PipelineHealthBar, StageHealthWarnings } from "./PipelineHealthWarnings";
import { StageSecretsPanel, type StageSecretsPanelProps } from "./StageSecretsPanel";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => createElement("a", { href: to }, children),
}));
vi.mock("./environment-variables-editor", () => ({ EnvironmentVariablesEditor: () => null }));

const pausedWarning: PipelineHealthWarning = {
  code: "paused_agent",
  translationKey: "assignedAgentPaused",
  translationParams: { agentName: "Aline" },
  stageId: "stage-1",
  stageKey: "review",
  stageName: "Review step",
  message: "Aline is paused, so this step won't run until they're back. Reassign it if you can't wait.",
};

const failedWarning: PipelineHealthWarning = {
  code: "automation_failed",
  translationKey: "automationFailed",
  translationParams: { caseTitle: "Case Mercury" },
  stageId: "stage-2",
  stageKey: "build",
  stageName: "Build step",
  message: 'Automation failed on "Case Mercury". Open the item to inspect the log and retry it.',
  href: "/pipelines/pipeline-1/items/case-1",
  hrefLabel: "Open item",
  hrefLabelKey: "openItem",
};

const baseSecretsProps: StageSecretsPanelProps = {
  hasAutomation: false,
  secrets: [] as CompanySecret[],
  secretsLoading: false,
  value: {} as RoutineEnvConfig,
  onChange: () => {},
  onCreateSecret: async () => ({}) as CompanySecret,
  onSetupAutomation: () => {},
  onSave: () => {},
  saving: false,
  dirty: false,
};

describe("pipeline health and stage secrets localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  afterEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  it("localizes board and stage warning copy while preserving dynamic names and links", async () => {
    const portugueseBar = renderToStaticMarkup(createElement(PipelineHealthBar, {
      warnings: [failedWarning, pausedWarning],
      onSelectStage: () => {},
    }));
    expect(portugueseBar).toContain("Algumas etapas ainda não podem ser executadas");
    expect(portugueseBar).toContain("2 itens para corrigir");
    expect(portugueseBar).toContain("Build step");
    expect(portugueseBar).toContain("Case Mercury");
    expect(portugueseBar).toContain("Abrir item");
    expect(portugueseBar).toContain('href="/pipelines/pipeline-1/items/case-1"');
    expect(portugueseBar).toContain('aria-label="Abrir configurações de Review step"');
    expect(portugueseBar).toContain("Aline está indisponível");

    const portugueseStage = renderToStaticMarkup(createElement(StageHealthWarnings, {
      warnings: [pausedWarning],
    }));
    expect(portugueseStage).toContain("Esta etapa ainda não pode ser executada");
    expect(portugueseStage).toContain("Aline está indisponível");

    const legacyWarning: PipelineHealthWarning = {
      ...pausedWarning,
      translationKey: undefined,
      translationParams: undefined,
      message: "Legacy warning copy",
    };
    const legacyHtml = renderToStaticMarkup(createElement(StageHealthWarnings, {
      warnings: [legacyWarning],
    }));
    expect(legacyHtml).toContain("Legacy warning copy");

    await i18n.changeLanguage("en");
    const englishBar = renderToStaticMarkup(createElement(PipelineHealthBar, {
      warnings: [failedWarning],
    }));
    expect(englishBar).toContain("Some steps won&#x27;t run yet");
    expect(englishBar).toContain("1 thing to fix");
    expect(englishBar).toContain("Automation failed on &quot;Case Mercury&quot;");
    expect(englishBar).toContain("Open item");
  });

  it("localizes the no-automation secrets state in both languages", async () => {
    const portuguese = renderToStaticMarkup(createElement(StageSecretsPanel, baseSecretsProps));
    expect(portuguese).toContain("Os segredos ficam disponíveis apenas para a automação da etapa");
    expect(portuguese).toContain("Configurar automação");

    await i18n.changeLanguage("en");
    const english = renderToStaticMarkup(createElement(StageSecretsPanel, baseSecretsProps));
    expect(english).toContain("Secrets are available only to step automation");
    expect(english).toContain("Set up automation");
  });

  it("localizes secrets status and env-var guidance while preserving agent and reserved prefix values", () => {
    const loading = renderToStaticMarkup(createElement(StageSecretsPanel, {
      ...baseSecretsProps,
      hasAutomation: true,
      agentName: "Ana Silva",
      secretsLoading: true,
      saving: true,
      dirty: true,
    }));
    expect(loading).toContain("Estas variáveis de ambiente são injetadas quando");
    expect(loading).toContain("Ana Silva");
    expect(loading).toContain("PAPERCLIP_*");
    expect(loading).toContain("Carregando segredos…");
    expect(loading).toContain("Salvando…");

    const dirty = renderToStaticMarkup(createElement(StageSecretsPanel, {
      ...baseSecretsProps,
      hasAutomation: true,
      agentName: "Ana Silva",
      dirty: true,
    }));
    expect(dirty).toContain("Salvar segredos");
    expect(dirty).toContain("Alterações não salvas");
    expect(dirty).toContain("são nomes reservados.");
  });
});
