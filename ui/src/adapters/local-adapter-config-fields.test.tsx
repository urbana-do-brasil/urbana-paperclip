// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import type { AdapterConfigFieldsProps } from "./types";
import { ClaudeLocalAdvancedFields, ClaudeLocalConfigFields } from "./claude-local/config-fields";
import { CursorLocalConfigFields } from "./cursor/config-fields";
import { GeminiLocalConfigFields } from "./gemini-local/config-fields";
import { GrokLocalConfigFields } from "./grok-local/config-fields";
import { KimiLocalConfigFields } from "./kimi-local/config-fields";
import { OpenCodeLocalConfigFields } from "./opencode-local/config-fields";
import { PiLocalConfigFields } from "./pi-local/config-fields";

type LocalFields = ComponentType<AdapterConfigFieldsProps>;

beforeAll(() => {
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    ResizeObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
});

afterEach(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });

async function renderFields(
  Component: LocalFields,
  adapterType: string,
  config: Record<string, unknown>,
  inspect?: (container: HTMLElement) => void | Promise<void>,
): Promise<string> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const props: AdapterConfigFieldsProps = {
    mode: "edit",
    isCreate: false,
    adapterType,
    values: null,
    set: null,
    config,
    eff: (_group, _field, original) => original,
    mark: () => undefined,
    models: [],
  };
  await act(async () => root.render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{createElement(Component, props)}</TooltipProvider>
    </QueryClientProvider>,
  ));
  await inspect?.(container);
  const html = container.innerHTML + Array.from(document.body.children)
    .filter(child => child !== container)
    .map(child => child.outerHTML)
    .join("");
  await act(async () => root.unmount());
  container.remove();
  return html;
}

async function focusFieldHint(container: HTMLElement, labelText: string): Promise<void> {
  const label = Array.from(container.querySelectorAll("label, span"))
    .find(element => element.textContent?.trim() === labelText);
  const trigger = label?.parentElement?.querySelector("button");
  if (!trigger) throw new Error(`Could not find help tooltip for ${labelText}`);
  await act(async () => trigger.focus());
}

describe("local adapter configuration localization", () => {
  it("localizes instruction-file fields for all local adapters in both locales", async () => {
    const adapters: Array<[string, LocalFields, string]> = [
      ["claude_local", ClaudeLocalConfigFields, "claude"],
      ["gemini_local", GeminiLocalConfigFields, "gemini"],
      ["kimi_local", KimiLocalConfigFields, "kimi"],
      ["opencode_local", OpenCodeLocalConfigFields, "systemPrompt"],
      ["pi_local", PiLocalConfigFields, "systemPrompt"],
      ["cursor_local", CursorLocalConfigFields, "cursor"],
      ["grok_local", GrokLocalConfigFields, "grok"],
    ];

    for (const locale of ["pt-BR", "en"] as const) {
      await i18n.changeLanguage(locale);
      for (const [adapterType, Component, hintKey] of adapters) {
        const path = `/srv/agents/${adapterType}/AGENTS.md`;
        const hint = `agentConfiguration.localAdapters.instructionsFileHints.${hintKey}`;
        const html = await renderFields(Component, adapterType, { instructionsFilePath: path }, async container => {
          await focusFieldHint(container, i18n.t("agentConfiguration.localAdapters.instructionsFile"));
          expect(document.body.textContent).toContain(i18n.t(hint));
        });
        expect(html).toContain(i18n.t("agentConfiguration.localAdapters.instructionsFile"));
        expect(html).toContain(path);
      }
    }
  });

  it("localizes Claude and Gemini ACP controls while preserving saved enums, paths, and values", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      await i18n.changeLanguage(locale);
      const claudeHtml = await renderFields(ClaudeLocalAdvancedFields, "claude_local", {
        engine: "acp",
        mode: "oneshot",
        nonInteractivePermissions: "fail",
        stateDir: "/var/tmp/claude-acp",
        warmHandleIdleMs: 12_000,
        chrome: true,
        dangerouslySkipPermissions: true,
        maxTurnsPerRun: 17,
      }, container => {
        expect(Array.from(container.querySelectorAll("select"))
          .find(select => select.querySelector('option[value="oneshot"]'))?.value).toBe("oneshot");
        expect(Array.from(container.querySelectorAll("select"))
          .find(select => select.querySelector('option[value="fail"]'))?.value).toBe("fail");
      });
      for (const key of [
        "executionEngine",
        "acpServerCommand",
        "acpSessionMode",
        "acpNonInteractivePermissions",
        "acpStateDirectory",
        "acpWarmProcessIdle",
        "enableChrome",
        "skipPermissions",
        "maxTurnsPerRun",
      ] as const) {
        expect(claudeHtml).toContain(i18n.t(`agentConfiguration.localAdapters.${key}`));
      }
      expect(claudeHtml).toContain(i18n.t("agentConfiguration.localAdapters.claudeCli"));
      expect(claudeHtml).toContain("claude-agent-acp");
      expect(claudeHtml).toContain("/var/tmp/claude-acp");
      const claudeDocument = new DOMParser().parseFromString(claudeHtml, "text/html");
      expect(Array.from(claudeDocument.querySelectorAll("input"), input => input.value))
        .toEqual(expect.arrayContaining(["12000", "17"]));
      expect(claudeHtml).toContain('<option value="oneshot">');
      expect(claudeHtml).toContain('<option value="fail">');
      expect(claudeHtml).toContain('aria-checked="true"');

      const geminiHtml = await renderFields(GeminiLocalConfigFields, "gemini_local", {
        engine: "acp",
        mode: "oneshot",
        nonInteractivePermissions: "fail",
        stateDir: "/var/tmp/gemini-acp",
        warmHandleIdleMs: 9_000,
        instructionsFilePath: "/srv/agents/gemini_local/AGENTS.md",
      }, container => {
        expect(Array.from(container.querySelectorAll("select"))
          .find(select => select.querySelector('option[value="oneshot"]'))?.value).toBe("oneshot");
        expect(Array.from(container.querySelectorAll("select"))
          .find(select => select.querySelector('option[value="fail"]'))?.value).toBe("fail");
      });
      expect(geminiHtml).toContain(i18n.t("agentConfiguration.localAdapters.geminiCli"));
      expect(geminiHtml).toContain("gemini --acp");
      expect(geminiHtml).toContain("/var/tmp/gemini-acp");
      expect(geminiHtml).toContain("/srv/agents/gemini_local/AGENTS.md");
      expect(geminiHtml).toContain('<option value="oneshot">');
      expect(geminiHtml).toContain('<option value="fail">');
      expect(Array.from(new DOMParser().parseFromString(geminiHtml, "text/html").querySelectorAll("input"), input => input.value))
        .toContain("9000");
    }
  });

  it("localizes OpenCode permission controls without changing their default state", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      await i18n.changeLanguage(locale);
      const label = i18n.t("agentConfiguration.localAdapters.skipPermissions");
      const html = await renderFields(OpenCodeLocalConfigFields, "opencode_local", {
        dangerouslySkipPermissions: false,
      }, async container => {
        await focusFieldHint(container, label);
        expect(document.body.textContent).toContain(i18n.t("agentConfiguration.localAdapters.skipPermissionsHint"));
      });
      expect(html).toContain(label);
      const toggle = new DOMParser().parseFromString(html, "text/html")
        .querySelector(`[role="switch"][aria-label="${label}"]`);
      expect(toggle?.getAttribute("aria-checked")).toBe("false");
    }
  });
});
