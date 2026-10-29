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

beforeAll(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); });
afterEach(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });

async function renderMarkup(node: ReactNode, expand?: string, inspect?: (container: HTMLElement) => void): Promise<string> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>));
  if (expand) await act(async () => {
    container.querySelector(`[aria-label="${expand}"]`)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  inspect?.(container);
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
    [undefined, "Full auto (approve all)"],
    ["approve-paperclip", "Automatic Paperclip actions"],
    ["approve-reads", "Allow Paperclip reads"],
    ["deny-all", "Deny all"],
  ])("displays Grok's default or saved permission mode %s", async (acpxPermissionMode, label) => {
    const html = await renderRunner({ provider: "acpx", acpxAgent: "grok", acpxPermissionMode });
    expect(html).toContain('Grok Build');
    expect(html).toContain('aria-label="Permission mode"');
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

  it("renders OpenCode's bounded permission modes", async () => {
    const html = await renderRunner({
      provider: "opencode",
      opencodePermissionMode: "allow",
    });

    expect(html).toContain(
      'OpenCode 1.18.34',
    );
    expect(html).toContain("Full auto (allow)");
    expect(html).toContain('aria-label="Permission mode"');
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
    expect(html).toContain("Allow Paperclip reads");
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

    expect(html).toContain("Unsupported saved mode — select a qualified mode");
    expect(html).toContain("cannot start or recover a Paperclip Runner run");
    expect(html).toContain("Select Automatic (isolated) to remediate it");
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

    expect(warmHtml).toContain("Warm idle timeout (ms)");
    expect(warmHtml).toContain('value="45000"');
    expect(warmHtml).toContain('max="86400000"');
    expect(turnHtml).not.toContain("Warm idle timeout (ms)");
  });
});
