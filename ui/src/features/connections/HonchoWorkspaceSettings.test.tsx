// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ToolConnection } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { HonchoWorkspaceSettings } from "./HonchoWorkspaceSettings";

const updateConnection = vi.hoisted(() => vi.fn());
vi.mock("@/api/tools", () => ({ toolsApi: { updateConnection } }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  updateConnection.mockReset().mockResolvedValue({});
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  await i18n.changeLanguage("en");
});

async function render() {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const connection = {
    id: "honcho-connection",
    config: { sourceTemplateKey: "honcho", methodConfig: { workspaceId: "team-old", retention: "90d" } },
    transportConfig: {},
  } as unknown as ToolConnection;
  await act(async () => {
    root?.render(<QueryClientProvider client={client}><HonchoWorkspaceSettings connection={connection} canConfigure /></QueryClientProvider>);
  });
  return container;
}

describe("HonchoWorkspaceSettings", () => {
  it("preserves unrelated provider configuration when saving the workspace", async () => {
    const node = await render();
    expect(node.textContent).toContain("Honcho workspace");
    const input = node.querySelector<HTMLInputElement>("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "  team-new  ");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const save = Array.from(node.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Save workspace")!;
    await act(async () => save.click());

    expect(updateConnection).toHaveBeenCalledWith("honcho-connection", {
      config: {
        sourceTemplateKey: "honcho",
        methodConfig: { workspaceId: "team-new", retention: "90d" },
      },
    });
  });

  it("localizes the warning and action labels in Brazilian Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");
    const node = await render();
    const input = node.querySelector<HTMLInputElement>("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, " ");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(node.textContent).toContain("Workspace do Honcho");
    expect(node.textContent).toContain("Informe um workspace para incluir instruções do Honcho.");
    expect(node.textContent).toContain("Cancelar");
    expect(node.textContent).toContain("Salvar workspace");
  });
});
