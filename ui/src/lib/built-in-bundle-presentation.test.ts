import { afterEach, describe, expect, it } from "vitest";

import type { BuiltInAgentDefinition } from "@/api/builtInAgents";
import { i18n } from "@/i18n";
import { localizeBuiltInBundlePresentation } from "./built-in-bundle-presentation";

function definition(overrides: Partial<BuiltInAgentDefinition> = {}): BuiltInAgentDefinition {
  return {
    key: "reflection-coach",
    displayName: "Reflection Coach",
    featureKeys: ["reflection-coach"],
    shortPurpose: "Coaches agents.",
    defaultInstructions: "",
    defaultRole: "general",
    bundle: {
      stockVersion: "2026-07-08",
      instructions: { entryFile: "AGENTS.md", files: ["AGENTS.md"] },
      skill: {
        skillKey: "reflection-coach",
        displayName: "Reflection Coach",
        slug: "reflection-coach",
        canonicalKey: "paperclipai/bundled/paperclip-operations/reflection-coach",
        files: ["reflection-coach/SKILL.md"],
      },
      routine: {
        routineKey: "recent-agent-reflection",
        title: "Review recent agent trajectories for coaching proposals",
        status: "paused",
        triggerCount: 1,
        scheduleLabel: "Weekly · Mon 09:00 UTC",
      },
    },
    ...overrides,
  };
}

describe("built-in bundle presentation localization", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("translates exact shipped Reflection Coach resource metadata in Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");

    expect(localizeBuiltInBundlePresentation(definition(), i18n.t)).toEqual({
      agentDisplayName: "Agente de reflexão",
      skillDisplayName: "Agente de reflexão",
      routineTitle: "Revisar trajetórias recentes de agentes e propor melhorias de instruções",
    });
  });

  it("recognizes the second shipped bundle by its stable resource identities", async () => {
    await i18n.changeLanguage("pt-BR");
    const summarizer = definition({
      key: "summarizer",
      displayName: "Summarizer",
      bundle: {
        stockVersion: "2026-08-02",
        instructions: { entryFile: "AGENTS.md", files: ["AGENTS.md"] },
        skill: {
          skillKey: "summarize-status",
          displayName: "Summarize status",
          slug: "summarize-status",
          canonicalKey: "paperclipai/bundled/paperclip-operations/summarize-status",
          files: ["summarize-status/SKILL.md"],
        },
        routine: {
          routineKey: "refresh-stale-summaries",
          title: "Refresh stale summary slots",
          status: "paused",
          triggerCount: 1,
          scheduleLabel: "Weekly · UTC",
        },
      },
    });

    expect(localizeBuiltInBundlePresentation(summarizer, i18n.t)).toEqual({
      agentDisplayName: "Agente de resumos",
      skillDisplayName: "Resumir status",
      routineTitle: "Atualizar espaços de resumo desatualizados",
    });
  });

  it("passes through changed, unknown, or incomplete resource metadata", async () => {
    await i18n.changeLanguage("pt-BR");
    const changed = definition({
      displayName: "My reflection agent",
      bundle: {
        ...definition().bundle!,
        skill: { ...definition().bundle!.skill, displayName: "Custom skill" },
        routine: { ...definition().bundle!.routine, title: "Custom routine" },
      },
    });
    const identityCollision = definition({
      bundle: {
        ...definition().bundle!,
        skill: { ...definition().bundle!.skill, canonicalKey: "vendor/reflection-coach" },
      },
    });

    expect(localizeBuiltInBundlePresentation(changed, i18n.t)).toEqual({});
    expect(localizeBuiltInBundlePresentation(identityCollision, i18n.t)).toEqual({
      agentDisplayName: "Agente de reflexão",
      routineTitle: "Revisar trajetórias recentes de agentes e propor melhorias de instruções",
    });
    expect(localizeBuiltInBundlePresentation(definition({ key: "vendor-agent" }), i18n.t)).toEqual({});
    expect(localizeBuiltInBundlePresentation(definition({ bundle: undefined }), i18n.t)).toEqual({});
  });
});
