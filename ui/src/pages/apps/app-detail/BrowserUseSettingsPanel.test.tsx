// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ConnectionGrantsResponse, ToolConnection } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { BrowserUseSettingsPanel } from "./BrowserUseSettingsPanel";

const browserUseMocks = vi.hoisted(() => ({
  settings: vi.fn(),
  profiles: vi.fn(),
  saveSettings: vi.fn(),
}));

vi.mock("@/api/browser-use", () => ({ browserUseApi: browserUseMocks }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(async () => {
  await i18n.changeLanguage("en");
  browserUseMocks.settings.mockReset().mockResolvedValue({ allowedProfileIds: ["profile-1"], maxCostUsd: 10 });
  browserUseMocks.profiles.mockReset().mockResolvedValue([{ id: "profile-1", name: "Finance Portal" }]);
  browserUseMocks.saveSettings.mockReset().mockImplementation(async (_companyId, _grantId, value) => value);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  await i18n.changeLanguage("en");
});

async function render(grantOwner = "user-1") {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const connection = { id: "connection-1", companyId: "company-1" } as ToolConnection;
  const grants = {
    currentUserId: "user-1",
    grants: [{ id: "grant-1", kind: grantOwner === "organization" ? "organization" : "user", subjectUserId: grantOwner, status: "active", capabilities: { canEditAudience: true } }],
  } as unknown as ConnectionGrantsResponse;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient}><BrowserUseSettingsPanel connection={connection} grants={grants} /></QueryClientProvider>);
  });
  return container;
}

describe("BrowserUseSettingsPanel", () => {
  it("localizes settings and preserves profile IDs and cost in the save request", async () => {
    const node = await render();
    await vi.waitFor(() => expect(node.textContent).toContain("Finance Portal"));
    expect(node.textContent).toContain("Browser settings");
    expect(node.textContent).toContain("Maximum cost per browser run (USD)");
    expect(node.textContent).toContain("Allowed saved profiles");
    expect(node.textContent).toContain("Finance Portal");

    const limit = node.querySelector<HTMLInputElement>('input[type="number"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(limit, "25");
      limit.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const save = Array.from(node.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Save browser settings")!;
    await act(async () => save.click());

    expect(browserUseMocks.saveSettings).toHaveBeenCalledWith("company-1", "grant-1", {
      allowedProfileIds: ["profile-1"],
      maxCostUsd: 25,
    });
  });

  it("localizes the empty profile state", async () => {
    await i18n.changeLanguage("pt-BR");
    browserUseMocks.settings.mockResolvedValue({ allowedProfileIds: [], maxCostUsd: null });
    browserUseMocks.profiles.mockResolvedValue([]);
    const node = await render();
    await vi.waitFor(() => expect(node.textContent).toContain("Nenhum perfil salvo."));

    expect(node.textContent).toContain("Configurações do navegador");
    expect(node.textContent).toContain("Nenhum perfil salvo.");
    expect(node.textContent).toContain("Salvar configurações do navegador");
  });

  it("shows the localized message when the current user cannot configure credentials", async () => {
    await i18n.changeLanguage("pt-BR");
    const node = await render("someone-else");
    expect(node.textContent).toContain("A pessoa responsável pela credencial ou quem gerencia uma conexão compartilhada pode configurar perfis salvos e limites de custo.");
  });
});
