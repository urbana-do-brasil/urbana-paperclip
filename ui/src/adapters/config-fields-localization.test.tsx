// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { HttpConfigFields } from "./http/config-fields";
import { ProcessConfigFields } from "./process/config-fields";
import { OpenClawGatewayConfigFields } from "./openclaw-gateway/config-fields";
import { SchemaConfigFields, invalidateConfigSchemaCache } from "./schema-config-fields";
import type { AdapterConfigFieldsProps } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

function renderFields(
  Component: (props: AdapterConfigFieldsProps) => React.ReactNode,
  adapterType: string,
  config: Record<string, unknown> = {},
  mark = vi.fn(),
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  const props: AdapterConfigFieldsProps = {
    mode: "edit",
    isCreate: false,
    adapterType,
    values: null,
    set: null,
    config,
    eff: (_group, _field, original) => original,
    mark,
    models: [],
  };
  act(() => {
    root.render(<TooltipProvider><Component {...props} /></TooltipProvider>);
  });
  return { container, mark };
}

async function setLocale(locale: "en" | "pt-BR") {
  await act(async () => { await i18n.changeLanguage(locale); });
}

afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

describe("adapter configuration localization", () => {
  it("localizes HTTP, process, OpenClaw, and JSON fields in Portuguese without changing values", async () => {
    await setLocale("pt-BR");
    const http = renderFields(HttpConfigFields, "http", { url: "https://example.test/hook" });
    expect(http.container.textContent).toContain("URL do webhook");
    expect(http.container.querySelector<HTMLInputElement>('input[value="https://example.test/hook"]')).toBeTruthy();

    const process = renderFields(ProcessConfigFields, "process", { command: "node", args: ["worker.js", "--quiet"] });
    expect(process.container.textContent).toContain("Comando");
    expect(process.container.textContent).toContain("Argumentos (separados por vírgula)");
    expect(process.container.querySelector<HTMLInputElement>('input[value="node"]')).toBeTruthy();
    expect(process.container.querySelector<HTMLInputElement>('input[value="worker.js, --quiet"]')).toBeTruthy();

    const openclaw = renderFields(OpenClawGatewayConfigFields, "openclaw_gateway", { sessionKeyStrategy: "issue", payloadTemplate: { agentId: "agent-123" } });
    expect(openclaw.container.textContent).toContain("Estratégia de sessão");
    expect(openclaw.container.textContent).toContain("Por tarefa");
    expect(openclaw.container.textContent).toContain("Modelo de payload em JSON");
    expect(openclaw.container.querySelector<HTMLSelectElement>("select")?.value).toBe("issue");
    expect(openclaw.container.querySelector<HTMLTextAreaElement>("textarea")?.value).toContain('"agentId": "agent-123"');
  });

  it("localizes built-in Cursor Cloud schema labels and options while preserving plugin schema text", async () => {
    await setLocale("pt-BR");
    const cursorType = "cursor_cloud";
    const pluginType = "localization-test-plugin";
    invalidateConfigSchemaCache(cursorType);
    invalidateConfigSchemaCache(pluginType);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fields: [
          { key: "repoUrl", label: "Repository URL", type: "text", hint: "Git repository URL Cursor should open for this agent." },
          { key: "runtimeEnvType", label: "Cursor runtime", type: "select", default: "cloud", options: [
            { value: "cloud", label: "Cursor hosted" },
            { value: "pool", label: "Self-hosted pool" },
            { value: "machine", label: "Named machine" },
          ], hint: "Choose where Cursor should execute the remote agent." },
        ] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fields: [
          { key: "customSetting", label: "Plugin setting", type: "select", default: "external", hint: "Supplied by the plugin.", options: [{ value: "external", label: "External option" }] },
        ] }),
      }));

    const cursorContainer = document.createElement("div");
    document.body.append(cursorContainer);
    const cursorRoot = createRoot(cursorContainer);
    roots.push(cursorRoot);
    const props: AdapterConfigFieldsProps = {
      mode: "edit", isCreate: false, adapterType: cursorType, values: null, set: null,
      config: { runtimeEnvType: "cloud" }, eff: (_group, _field, original) => original,
      mark: vi.fn(), models: [],
    };
    await act(async () => cursorRoot.render(<TooltipProvider><SchemaConfigFields {...props} /></TooltipProvider>));
    expect(cursorContainer.textContent).toContain("URL do repositório");
    expect(cursorContainer.textContent).toContain("Hospedado pelo Cursor");

    const pluginContainer = document.createElement("div");
    document.body.append(pluginContainer);
    const pluginRoot = createRoot(pluginContainer);
    roots.push(pluginRoot);
    await act(async () => pluginRoot.render(<TooltipProvider><SchemaConfigFields {...props} adapterType={pluginType} /></TooltipProvider>));
    expect(pluginContainer.textContent).toContain("Plugin setting");
    expect(pluginContainer.textContent).toContain("External option");
  });
});
