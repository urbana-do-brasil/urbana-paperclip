// @vitest-environment jsdom
import { createRoot } from "react-dom/client";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";

import { CodexLocalConfigFields } from "./config-fields";

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

async function renderMarkup(node: ReactNode, expand?: string, inspect?: (container: HTMLElement) => void | Promise<void>): Promise<string> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>));
  if (expand) await act(async () => {
    container.querySelector(`[aria-label="${expand}"]`)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  await inspect?.(container);
  const html = container.innerHTML + Array.from(document.body.children).filter(child => child !== container).map(child => child.outerHTML).join("");
  await act(async () => root.unmount());
  container.remove();
  return html;
}

async function renderRunner(config: Record<string, unknown>, expand?: string, inspectOrDot?: ((container: HTMLElement) => void) | boolean): Promise<string> {
  const openAiDotEnabled = inspectOrDot === true;
  const inspect = typeof inspectOrDot === "function" ? inspectOrDot : undefined;
  return renderMarkup(
    <TooltipProvider>
      <CodexLocalConfigFields
        mode="edit"
        isCreate={false}
        adapterType="paperclip_runner"
        values={null}
        set={null}
        config={config}
        eff={(_group, _field, original) => original}
        mark={() => undefined}
        models={[]}
        hideInstructionsFile
        openAiDotEnabled={openAiDotEnabled}
      />
    </TooltipProvider>,
    expand, inspect,
  );
}

async function renderCodexLocal(config: Record<string, unknown>): Promise<string> {
  return renderMarkup(
    <TooltipProvider>
      <CodexLocalConfigFields
        mode="edit"
        isCreate={false}
        adapterType="codex_local"
        values={null}
        set={null}
        config={config}
        eff={(_group, _field, original) => original}
        mark={() => undefined}
        models={[]}
      />
    </TooltipProvider>,
  );
}

async function focusFieldHint(container: HTMLElement, labelText: string): Promise<void> {
  const label = Array.from(container.querySelectorAll("label, span"))
    .find(element => element.textContent?.trim() === labelText);
  const trigger = label?.parentElement?.querySelector("button");
  if (!trigger) throw new Error(`Could not find help tooltip for ${labelText}`);
  await act(async () => trigger.focus());
}

describe("Codex local configuration localization", () => {
  it("localizes labels and help while preserving runtime modes, paths, and model IDs", async () => {
    const config = {
      engine: "acp",
      model: "gpt-5.6-sol",
      instructionsFilePath: "/srv/agents/codex/AGENTS.md",
      dangerouslyBypassApprovalsAndSandbox: true,
      search: true,
      fastMode: true,
      mode: "persistent",
      nonInteractivePermissions: "deny",
      stateDir: "/var/tmp/codex-acp",
      warmHandleIdleMs: 0,
    };

    await i18n.changeLanguage("pt-BR");
    const portuguese = await renderCodexLocal(config);
    expect(portuguese).toContain("Mecanismo de execução");
    expect(portuguese).toContain("Padrão (ACP)");
    expect(portuguese).toContain("Modo de sessão ACP");
    expect(portuguese).toContain("Execução única");
    expect(portuguese).toContain("Arquivo de instruções do agente");
    expect(portuguese).toContain("Ignorar sandbox");
    expect(portuguese).toContain("Ativar busca");
    expect(portuguese).toContain("Modo rápido");
    expect(portuguese).toContain("/srv/agents/codex/AGENTS.md");
    expect(portuguese).toContain("/var/tmp/codex-acp");
    expect(portuguese).toContain('value="persistent">Persistente</option>');
    expect(portuguese).toContain('value="deny">Negar</option>');
    const manualModel = await renderCodexLocal({ ...config, model: "custom-codex-model" });
    expect(manualModel).toContain("O modo rápido será enviado para este modelo informado manualmente.");

    await i18n.changeLanguage("en");
    const english = await renderCodexLocal(config);
    expect(english).toContain("Execution engine");
    expect(english).toContain("Agent instructions file");
    expect(english).toContain("Bypass sandbox");
    expect(english).toContain("Fast mode");
    expect(english).toContain('value="persistent">Persistent</option>');
    expect(english).toContain('value="deny">Deny</option>');
    expect(english).toContain("/srv/agents/codex/AGENTS.md");
    const englishManualModel = await renderCodexLocal({ ...config, model: "custom-codex-model" });
    expect(englishManualModel).toContain("Fast mode will be passed through for this manual model.");
  });
});

describe("Paperclip Runner Codex configuration", () => {
  it("keeps Dot out of the general harness picker and hides that picker for Dot", async () => {
    expect(await renderRunner({ provider: "codex" }, "Provedor de execução", true)).not.toContain("OpenAI Dot");
    const dot = await renderRunner({ provider: "openai_dot" });
    expect(dot).not.toContain('aria-label="Provedor de execução"');
    expect(dot).toContain("Conexão do Dot");
    expect(dot).toContain("Permitir provedor com cobrança externa");
  });

  it("localizes Dot controls and keeps all access toggles disabled by default", async () => {
    const html = await renderRunner({ provider: "openai_dot" });
    expect(html).toContain("Ler anexos da tarefa");
    expect(html).toContain("Arquivos e comandos do workspace");
    expect(html).toContain("Permitir provedor com cobrança externa");
    const switches = new DOMParser().parseFromString(html, "text/html").querySelectorAll('[role="switch"]');
    expect(Array.from(switches, item => ({ label: item.getAttribute("aria-label"), checked: item.getAttribute("aria-checked") })))
      .toEqual(expect.arrayContaining([
        { label: "Ler anexos da tarefa", checked: "false" },
        { label: "Arquivos e comandos do workspace", checked: "false" },
        { label: "Permitir provedor com cobrança externa", checked: "false" },
      ]));
  });
  it.each([
    [undefined, "Automático total (aprovar tudo)"],
    ["approve-paperclip", "Ações automáticas do Paperclip"],
    ["approve-reads", "Permitir leituras do Paperclip"],
    ["deny-all", "Negar tudo"],
  ])("displays Grok's default or saved permission mode %s", async (acpxPermissionMode, label) => {
    const html = await renderRunner({ provider: "acpx", acpxAgent: "grok", acpxPermissionMode });
    expect(html).toContain('Grok Build');
    expect(html).toContain('aria-label="Modo de permissão"');
    expect(html).toContain(label);
  });

  it("exposes all qualified provider choices", async () => {
    const html = await renderRunner({ provider: "codex" }, "Provedor de execução");

    expect(html).toContain('aria-label="Provedor de execução"');
    expect(html).toContain("OpenCode 1.18.34");
    expect(html).toContain('Agentes ACP');
    expect(html).not.toContain("Permission mode");
    expect(html).not.toContain("Ask when requested");
    expect(html).not.toContain("Ask for untrusted operations");
    expect(html).toContain("Claude Managed");
    expect(html).toContain("AWS AgentCore");
    expect(html).not.toContain("Bypass sandbox");
  });

  it("localizes Claude Managed and AgentCore profiles, limits, and retention warnings without changing saved values", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      await i18n.changeLanguage(locale);

      const claudeConfig = {
        provider: "claude_managed",
        managedProfileId: "managed-primary-review",
        maxSessionListCostUsd: 2.75,
        managedAgentsRetentionAcknowledged: true,
      };
      const claudeHtml = await renderRunner(claudeConfig, undefined, async container => {
        const label = i18n.t("agentConfiguration.runner.claudeManaged.acknowledgeRetention");
        await focusFieldHint(container, label);
        expect(document.body.textContent).toContain(i18n.t("agentConfiguration.runner.claudeManaged.retentionHint"));
      });
      expect(claudeHtml).toContain(i18n.t("agentConfiguration.runner.claudeManaged.profile"));
      expect(claudeHtml).toContain(i18n.t("agentConfiguration.runner.claudeManaged.sessionSpendCeiling"));
      const claudeDocument = new DOMParser().parseFromString(claudeHtml, "text/html");
      expect(Array.from(claudeDocument.querySelectorAll("input"), input => input.value))
        .toEqual(expect.arrayContaining(["managed-primary-review", "2.75"]));
      expect(claudeDocument.querySelector(`[role="switch"][aria-label="${i18n.t("agentConfiguration.runner.claudeManaged.acknowledgeRetention")}"]`)
        ?.getAttribute("aria-checked")).toBe("true");

      const agentCoreConfig = {
        provider: "aws_agentcore",
        agentCoreProfileId: "agentcore-primary-review",
        maxEstimatedSessionCostUsd: 3.25,
        maxIterations: 6,
        maxOutputTokens: 2_048,
        timeoutSeconds: 180,
        agentCoreRetentionAcknowledged: true,
      };
      const agentCoreHtml = await renderRunner(agentCoreConfig, undefined, async container => {
        const label = i18n.t("agentConfiguration.runner.awsAgentCore.acknowledgeRetention");
        await focusFieldHint(container, label);
        expect(document.body.textContent).toContain(i18n.t("agentConfiguration.runner.awsAgentCore.retentionHint"));
      });
      for (const key of [
        "profile",
        "estimatedSessionCeiling",
        "maximumIterations",
        "maximumOutputTokens",
        "invocationTimeout",
      ] as const) {
        expect(agentCoreHtml).toContain(i18n.t(`agentConfiguration.runner.awsAgentCore.${key}`));
      }
      const agentCoreDocument = new DOMParser().parseFromString(agentCoreHtml, "text/html");
      expect(Array.from(agentCoreDocument.querySelectorAll("input"), input => input.value))
        .toEqual(expect.arrayContaining(["agentcore-primary-review", "3.25", "6", "2048", "180"]));
      expect(agentCoreDocument.querySelector(`[role="switch"][aria-label="${i18n.t("agentConfiguration.runner.awsAgentCore.acknowledgeRetention")}"]`)
        ?.getAttribute("aria-checked")).toBe("true");
    }
  });

  it("localizes Runner permission and lifecycle controls while preserving mode enums and idle limits", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      await i18n.changeLanguage(locale);
      const permissionLabel = i18n.t("agentConfiguration.runner.permissionMode");
      const openCodeHtml = await renderRunner({ provider: "opencode", opencodePermissionMode: "ask" }, permissionLabel);
      expect(openCodeHtml).toContain(permissionLabel);
      const openCodeOptions = Array.from(
        new DOMParser().parseFromString(openCodeHtml, "text/html").querySelectorAll('[role="option"]'),
        option => option.textContent?.trim(),
      );
      expect(openCodeOptions).toEqual(expect.arrayContaining([
        i18n.t("agentConfiguration.runner.permissionModes.opencode.allow"),
        i18n.t("agentConfiguration.runner.permissionModes.opencode.ask"),
        i18n.t("agentConfiguration.runner.permissionModes.opencode.deny"),
      ]));
      expect(openCodeHtml).toContain(i18n.t("agentConfiguration.runner.permissionModes.opencode.ask"));
      await renderRunner({ provider: "opencode", opencodePermissionMode: "ask" }, undefined, async container => {
        await focusFieldHint(container, permissionLabel);
        expect(document.body.textContent).toContain(i18n.t("agentConfiguration.runner.permissionModeHints.opencode"));
      });

      const acpxHtml = await renderRunner(
        { provider: "acpx", acpxAgent: "grok", acpxPermissionMode: "approve-reads" },
        permissionLabel,
      );
      const acpxOptions = Array.from(
        new DOMParser().parseFromString(acpxHtml, "text/html").querySelectorAll('[role="option"]'),
        option => option.textContent?.trim(),
      );
      expect(acpxOptions).toEqual(expect.arrayContaining([
        i18n.t("agentConfiguration.runner.permissionModes.acpx.approve-all"),
        i18n.t("agentConfiguration.runner.permissionModes.acpx.approve-paperclip"),
        i18n.t("agentConfiguration.runner.permissionModes.acpx.approve-reads"),
        i18n.t("agentConfiguration.runner.permissionModes.acpx.deny-all"),
      ]));
      expect(acpxHtml).toContain(i18n.t("agentConfiguration.runner.permissionModes.acpx.approve-reads"));

      const unsupportedHtml = await renderRunner({ provider: "codex", codexPermissionMode: "unrestricted" });
      expect(unsupportedHtml).toContain(i18n.t("agentConfiguration.runner.unsupportedPermissionMode"));
      expect(unsupportedHtml).toContain(i18n.t("agentConfiguration.runner.unsupportedCodexPermissionMode", {
        mode: i18n.t("agentConfiguration.runner.permissionModes.codex.never"),
      }));

      const lifecycleLabel = i18n.t("agentConfiguration.runner.lifecycle");
      const idleTimeoutLabel = i18n.t("agentConfiguration.runner.warmIdleTimeout");
      const lifecycleHtml = await renderRunner({
        provider: "codex",
        lifecycleMode: "warm",
        idleTimeoutMs: 45_000,
      }, undefined, async container => {
        await focusFieldHint(container, lifecycleLabel);
        expect(document.body.textContent).toContain(i18n.t("agentConfiguration.runner.lifecycleHint"));
        await focusFieldHint(container, idleTimeoutLabel);
        expect(document.body.textContent).toContain(i18n.t("agentConfiguration.runner.warmIdleTimeoutHint"));
        const lifecycleSelect = Array.from(container.querySelectorAll("select"))
          .find(select => select.querySelector('option[value="warm"]'));
        expect((lifecycleSelect as HTMLSelectElement | undefined)?.value).toBe("warm");
      });
      expect(lifecycleHtml).toContain(lifecycleLabel);
      expect(lifecycleHtml).toContain(i18n.t("agentConfiguration.runner.turnByTurn"));
      expect(lifecycleHtml).toContain(i18n.t("agentConfiguration.runner.warmSession"));
      const lifecycleDocument = new DOMParser().parseFromString(lifecycleHtml, "text/html");
      expect(Array.from(lifecycleDocument.querySelectorAll("input"), input => input.value)).toContain("45000");
      expect(lifecycleHtml).toContain('max="86400000"');
    }
  });

  it("renders OpenCode's bounded permission modes", async () => {
    const html = await renderRunner({
      provider: "opencode",
      opencodePermissionMode: "allow",
    });

    expect(html).toContain(
      'OpenCode 1.18.34',
    );
    expect(html).toContain("Automático total (permitir)");
    expect(html).toContain('aria-label="Modo de permissão"');
    expect(html).toContain("font-sans");
    expect(html).not.toContain("Ask for untrusted operations");
  });

  it("offers qualified Claude, Cursor and Pi while keeping Copilot disabled", async () => {
    const html = await renderRunner({
      provider: "acpx",
      acpxAgent: "claude",
      acpxPermissionMode: "approve-reads",
    }, "Agente ACP");

    expect(html).toContain('Agentes ACP');
    expect(html).toContain("Agente ACP");
    const options = new DOMParser().parseFromString(html, "text/html").querySelectorAll('[role="option"]');
    expect(Array.from(options, option => ({ label: option.textContent?.trim(), disabled: option.hasAttribute("data-disabled") })))
      .toEqual(expect.arrayContaining([
        { label: "Claude", disabled: false }, { label: "Cursor", disabled: false },
        { label: "Pi", disabled: false }, { label: "GitHub Copilot — qualificação pendente", disabled: true },
      ]));
    expect(html).not.toContain("Codex via ACPX");
    expect(html).not.toContain("ACPX Codex");
    expect(html).not.toContain("Pi via ACPX");
    expect(html).toContain("Permitir leituras do Paperclip");
  });

  it.each([undefined, "agent", "plan", "ask"])("displays saved Cursor mode %s", async acpxSessionMode => {
    const selected = acpxSessionMode ?? "agent";
    await renderRunner({ provider: "acpx", acpxAgent: "cursor", acpxSessionMode }, undefined, container => {
      const modes = container.querySelectorAll('[aria-label="Modo do Cursor"]');
      expect(modes).toHaveLength(1);
      expect((modes[0] as HTMLSelectElement).value).toBe(selected);
    });
  });

  it.each([undefined, "off", "low", "high", "max"])("displays saved Pi thinking level %s", async piThinkingLevel => {
    await renderRunner({ provider: "acpx", acpxAgent: "pi", piThinkingLevel }, undefined, container => {
      const mode = container.querySelector('[aria-label="Nível de raciocínio do Pi"]');
      expect((mode as HTMLSelectElement).value).toBe(piThinkingLevel ?? "low");
    });
  });
  it("localizes Cursor and Pi controls in both languages without changing saved enums", async () => {
    await i18n.changeLanguage("pt-BR");
    const portugueseCursor = await renderRunner({ provider: "acpx", acpxAgent: "cursor", acpxSessionMode: "plan" });
    expect(portugueseCursor).toContain('aria-label="Modo do Cursor"');
    expect(portugueseCursor).toContain('<option value="plan">Planejamento</option>');
    const portuguesePi = await renderRunner({ provider: "acpx", acpxAgent: "pi", piThinkingLevel: "max" });
    expect(portuguesePi).toContain('aria-label="Nível de raciocínio do Pi"');
    expect(portuguesePi).toContain('<option value="max">Máximo</option>');

    await i18n.changeLanguage("en");
    const englishProvider = await renderRunner({ provider: "codex" }, "Execution provider");
    expect(englishProvider).toContain('aria-label="Execution provider"');
    expect(englishProvider).toContain("ACP agents");
    const englishCursor = await renderRunner({ provider: "acpx", acpxAgent: "cursor", acpxSessionMode: "plan" });
    expect(englishCursor).toContain('aria-label="Cursor mode"');
    expect(englishCursor).toContain('<option value="plan">Plan</option>');
    const englishPi = await renderRunner({ provider: "acpx", acpxAgent: "pi", piThinkingLevel: "max" });
    expect(englishPi).toContain('aria-label="Pi thinking level"');
    expect(englishPi).toContain('<option value="max">Max</option>');
  });

  it("shows unsupported saved Pi level without aliasing it", async () => {
    expect(await renderRunner({ provider: "acpx", acpxAgent: "pi", piThinkingLevel: "medium" })).toContain("Nível de raciocínio salvo incompatível");
  });
  it.each(["claude", "copilot", "pi"])("does not expose Cursor mode for %s", async acpxAgent => {
    expect(await renderRunner({ provider: "acpx", acpxAgent })).not.toContain('aria-label="Modo do Cursor"');
  });

  it("falls back to the fail-closed Codex permission mode", async () => {
    const html = await renderRunner({ codexPermissionMode: "unrestricted" });

    expect(html).toContain("Modo salvo incompatível — selecione um modo qualificado");
    expect(html).toContain("não pode iniciar nem recuperar uma execução do Paperclip Runner");
    expect(html).toContain("Selecione Automático (isolado) para corrigir");
    expect(html).not.toContain("Full auto (never ask)");
  });

  it("shows a bounded idle timeout only for warm sessions", async () => {
    const warmHtml = await renderRunner({
      lifecycleMode: "warm",
      idleTimeoutMs: 45_000,
    });
    const turnHtml = await renderRunner({
      lifecycleMode: "per_turn",
      idleTimeoutMs: 45_000,
    });

    expect(warmHtml).toContain("Tempo limite ocioso do Runner (ms)");
    expect(warmHtml).toContain('value="45000"');
    expect(warmHtml).toContain('max="86400000"');
    expect(turnHtml).not.toContain("Tempo limite ocioso do Runner (ms)");
  });
});
