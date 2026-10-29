// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ToolProfileEffectiveSummary } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { AgentConnectionInstructions, ConnectionInstructionsEditor } from "./ConnectionInstructions";

const mockToolsApi = vi.hoisted(() => ({
  getEffectiveProfilesForAgent: vi.fn(),
}));

vi.mock("@/api/tools", () => ({ toolsApi: mockToolsApi }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: unknown }) =>
    <a href={to} {...rest}>{children as never}</a>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> = undefined;
  flushSync(() => {
    result = callback();
  });
  await result;
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let queryClient: QueryClient;

function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  void act(() => root?.render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  ));
  return host;
}

function textAreaByLabel(container: HTMLElement, label: string) {
  const textarea = Array.from(container.querySelectorAll("textarea"))
    .find((candidate) => candidate.getAttribute("aria-label") === label);
  if (!textarea) throw new Error(`Textarea not found: ${label}`);
  return textarea;
}

function setNativeValue(element: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockToolsApi.getEffectiveProfilesForAgent.mockReset();
});

afterEach(async () => {
  await act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  queryClient.clear();
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

describe("connection agent instructions localization", () => {
  it("localizes editor controls while preserving the provider and authored instruction text", async () => {
    await i18n.changeLanguage("pt-BR");
    const onChange = vi.fn();
    const authoredText = "Keep this exact instruction for the Paperclip workspace.";
    const container = render(
      <ConnectionInstructionsEditor
        provider="GitHub Enterprise"
        template={{ id: "github-guide", version: 1, text: "Use GitHub." }}
        value={{ enabled: false, text: authoredText, template: { id: "github-guide", version: 1 } }}
        onChange={onChange}
      />,
    );
    await flushReact();

    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe("Instruções do agente");
    expect(container.textContent).toContain("Orientar os agentes a usar GitHub Enterprise");
    expect(container.textContent).toContain("Os agentes ainda podem usar as ferramentas desta conexão, mas não receberão estas instruções.");
    expect(container.textContent).toContain(authoredText);

    const editButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Editar instruções");
    if (!editButton) throw new Error("Edit instructions button was not rendered");
    await act(() => editButton.click());
    const textarea = textAreaByLabel(container, "Texto das instruções");
    expect(textarea.value).toBe(authoredText);
    expect(container.textContent).toContain("Restaurar padrão");
    const editedText = "Preserve this custom text byte for byte.";
    await act(() => setNativeValue(textarea, editedText));
    expect(onChange).toHaveBeenCalledWith({
      enabled: false,
      text: editedText,
      template: { id: "github-guide", version: 1 },
    });
  });

  it("localizes the agent view and retains connection names and custom instruction content", async () => {
    await i18n.changeLanguage("pt-BR");
    const authoredText = "Use the finance workspace for quarterly reports.";
    mockToolsApi.getEffectiveProfilesForAgent.mockResolvedValue({
      installedConnections: [{
        id: "connection-1",
        name: "Notion — Finanças",
        enabled: true,
        status: "active",
        config: { sourceTemplateKey: "notion" },
        agentInstructions: { enabled: true, text: authoredText },
      }],
    } as unknown as ToolProfileEffectiveSummary);

    const container = render(<AgentConnectionInstructions companyId="company-1" agentId="agent-1" />);
    await flushReact();
    await flushReact();

    expect(container.querySelector("section")?.getAttribute("aria-label")).toBe("De conexões");
    expect(container.textContent).toContain("As instruções habilitadas são incluídas quando a conexão está disponível para a tarefa.");
    expect(container.textContent).toContain("Notion — Finanças");
    expect(container.textContent).toContain(authoredText);
  });
});
