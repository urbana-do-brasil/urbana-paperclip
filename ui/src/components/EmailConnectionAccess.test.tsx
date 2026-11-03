// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent } from "@paperclipai/shared";
import { EmailConnectionAccess } from "./EmailConnectionAccess";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";

const mocks = vi.hoisted(() => ({
  listGrants: vi.fn(),
  getInstalls: vi.fn(),
  putInstalls: vi.fn(),
}));

vi.mock("@/api/tools", () => ({
  toolsApi: {
    listConnectionGrants: mocks.listGrants,
    getConnectionInstalls: mocks.getInstalls,
    putConnectionInstalls: mocks.putInstalls,
  },
}));

const agents = [{ id: "agent-1", name: "Researcher", status: "idle" }] as unknown as Agent[];

describe("EmailConnectionAccess localization and access controls", () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.clearAllMocks();
    mocks.listGrants.mockResolvedValue({
      currentUserId: "viewer-1",
      capabilities: { canConfigure: true },
      grants: [{ status: "active", kind: "user", subjectUserId: "owner-1" }],
    });
    mocks.getInstalls.mockResolvedValue({
      installs: [{ targetType: "agent", targetId: "agent-1" }],
    });
    mocks.putInstalls.mockResolvedValue({
      connectionId: "connection-1",
      installs: [{ targetType: "company", targetId: "company-1" }],
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    document.body.innerHTML = "";
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  async function mount() {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <EmailConnectionAccess companyId="company-1" connectionId="connection-1" agents={agents} />
        </QueryClientProvider>,
      );
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }

  async function render() {
    await mount();
    await vi.waitFor(() => expect(container.querySelector('[role="radiogroup"]')).not.toBeNull());
  }

  function option(label: string) {
    return [...container.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
      .find((button) => button.textContent?.includes(label));
  }

  it("localizes English access controls and keeps the selected-agent payload when broadening access", async () => {
    await render();

    expect(container.textContent).toContain("Which humans can use this credential?");
    expect(container.textContent).toContain("Only the credential owner can use this connection.");
    expect(container.textContent).toContain("Which agents can use this connection?");
    expect(container.textContent).toContain("Removing an assigned agent stops receiving and sending from its inbox.");
    expect(container.querySelector('[role="radiogroup"]')?.getAttribute("aria-label"))
      .toBe("Which agents can use this connection");

    await act(async () => option("Any agent")?.click());
    await vi.waitFor(() => expect(mocks.putInstalls).toHaveBeenCalledWith("connection-1", [
      { targetType: "company", targetId: "company-1" },
    ]));
  });

  it("localizes Brazilian Portuguese while preserving the explicit company-wide grant payload", async () => {
    await i18n.changeLanguage("pt-BR");
    mocks.listGrants.mockResolvedValue({
      currentUserId: "viewer-1",
      capabilities: { canConfigure: true },
      grants: [{ status: "active", kind: "organization" }],
    });
    await render();

    expect(container.textContent).toContain("Quais pessoas podem usar esta credencial?");
    expect(container.textContent).toContain("Qualquer pessoa da organização");
    expect(container.textContent).toContain("Quais agentes podem usar esta conexão?");
    expect(container.textContent).toContain("Ao remover um agente atribuído, ele deixa de receber e enviar mensagens pela caixa de entrada.");
    expect(container.querySelector('[role="radiogroup"]')?.getAttribute("aria-label"))
      .toBe("Quais agentes podem usar esta conexão");

    await act(async () => option("Qualquer agente")?.click());
    await vi.waitFor(() => expect(mocks.putInstalls).toHaveBeenCalledWith("connection-1", [
      { targetType: "company", targetId: "company-1" },
    ]));
  });

  it.each([
    { locale: "en", loading: "Loading access…" },
    { locale: "pt-BR", loading: "Carregando acesso…" },
  ])("localizes the loading state ($locale)", async ({ locale, loading }) => {
    await i18n.changeLanguage(locale);
    mocks.listGrants.mockImplementation(() => new Promise(() => {}));
    mocks.getInstalls.mockImplementation(() => new Promise(() => {}));
    await mount();
    expect(container.textContent).toBe(loading);
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it.each([
    { locale: "en", error: "Connection access could not be loaded." },
    { locale: "pt-BR", error: "Não foi possível carregar o acesso à conexão." },
  ])("localizes load-denied state without exposing provider details ($locale)", async ({ locale, error }) => {
    await i18n.changeLanguage(locale);
    mocks.listGrants.mockResolvedValue({
      currentUserId: "viewer-1",
      capabilities: { canConfigure: true },
      grants: [{ status: "active", kind: "organization" }],
    });
    mocks.getInstalls.mockRejectedValue(new Error("provider credential detail"));
    await mount();
    await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(error);
    expect(container.textContent).not.toContain("provider credential detail");
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it.each([
    { locale: "en", optionLabel: "Any agent" },
    { locale: "pt-BR", optionLabel: "Qualquer agente" },
  ])("keeps connection access read-only when configuration is denied ($locale)", async ({ locale, optionLabel }) => {
    await i18n.changeLanguage(locale);
    mocks.listGrants.mockResolvedValue({
      currentUserId: "viewer-1",
      capabilities: { canConfigure: false },
      grants: [{ status: "active", kind: "organization" }],
    });
    await render();

    const deniedOption = option(optionLabel);
    expect(deniedOption?.disabled).toBe(true);
    expect([...container.querySelectorAll<HTMLButtonElement>("button")].every((button) => button.disabled)).toBe(true);
    await act(async () => deniedOption?.click());
    expect(mocks.putInstalls).not.toHaveBeenCalled();
  });
});
