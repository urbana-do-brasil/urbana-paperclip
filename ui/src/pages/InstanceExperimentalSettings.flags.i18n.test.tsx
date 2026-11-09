// @vitest-environment jsdom

import { act } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { InstanceExperimentalSettings } from "./InstanceExperimentalSettings";

const mockInstanceSettingsApi = vi.hoisted(() => ({ getExperimental: vi.fn(), updateExperimental: vi.fn() }));
vi.mock("@/api/instanceSettings", () => ({ instanceSettingsApi: mockInstanceSettingsApi }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }) }));
vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompany: { id: "company-1", issuePrefix: "PAP" } }),
}));

async function flush() {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  flushSync(() => {});
}

describe("Status Cards and Summaries experimental flags", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let currentSettings: Record<string, unknown>;

  afterAll(async () => { await i18n.changeLanguage("en"); });
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    currentSettings = { enableStatusCards: false, enableSummaries: false };
    mockInstanceSettingsApi.getExperimental.mockImplementation(async () => ({ ...currentSettings }));
    mockInstanceSettingsApi.updateExperimental.mockImplementation(async (patch) => {
      currentSettings = { ...currentSettings, ...patch };
      return { ...currentSettings };
    });
  });
  afterEach(() => {
    flushSync(() => root?.unmount());
    root = null;
    container.remove();
    vi.clearAllMocks();
  });

  async function renderPage() {
    root = createRoot(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    flushSync(() => root!.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/PAP/company/settings/instance/experimental"]}>
          <InstanceExperimentalSettings />
        </MemoryRouter>
      </QueryClientProvider>,
    ));
    await flush();
  }

  it.each([
    ["pt-BR", "Cards de status", "Resumos", "Ativar Cards de status também ativa Resumos."],
    ["en", "Status Cards", "Summaries", "Enabling Status Cards also enables Summaries."],
  ])("localizes both flag controls and preserves their dependency in %s", async (locale, cardsLabel, summariesLabel, footnote) => {
    await i18n.changeLanguage(locale);
    await renderPage();

    expect(container.textContent).toContain(cardsLabel);
    expect(container.textContent).toContain(summariesLabel);
    expect(container.textContent).toContain(footnote);

    const statusCards = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t("instanceExperimental.statusCards.ariaLabel")}"]`,
    )!;
    const summaries = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t("instanceExperimental.summaries.ariaLabel")}"]`,
    )!;
    expect(statusCards.getAttribute("aria-checked")).toBe("false");
    expect(summaries.getAttribute("aria-checked")).toBe("false");

    await act(async () => { statusCards.click(); });
    await flush();
    expect(mockInstanceSettingsApi.updateExperimental).toHaveBeenLastCalledWith({
      enableSummaries: true,
      enableStatusCards: true,
    });
    expect(statusCards.getAttribute("aria-checked")).toBe("true");
    expect(summaries.getAttribute("aria-checked")).toBe("true");

    await act(async () => { summaries.click(); });
    await flush();
    expect(mockInstanceSettingsApi.updateExperimental).toHaveBeenLastCalledWith({
      enableSummaries: false,
      enableStatusCards: false,
    });
    expect(statusCards.getAttribute("aria-checked")).toBe("false");
    expect(summaries.getAttribute("aria-checked")).toBe("false");
  });

  it.each([
    ["pt-BR", "Gerenciado pelo Paperclip Cloud"],
    ["en", "Managed by Paperclip Cloud"],
  ])("localizes managed flag locks in %s", async (locale, badgeLabel) => {
    await i18n.changeLanguage(locale);
    currentSettings = {
      enableStatusCards: true,
      enableSummaries: true,
      managedKeys: {
        enableStatusCards: { managed: true, managedBy: "paperclip-cloud" },
      },
    };
    await renderPage();

    const statusCards = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t("instanceExperimental.statusCards.ariaLabel")}"]`,
    )!;
    const summaries = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t("instanceExperimental.summaries.ariaLabel")}"]`,
    )!;
    expect(statusCards.disabled).toBe(true);
    expect(summaries.disabled).toBe(true);
    expect(container.textContent).toContain(badgeLabel);
  });

  it.each([
    ["pt-BR", "Carregando configurações experimentais…"],
    ["en", "Loading experimental settings…"],
  ])("localizes flag-settings loading in %s", async (locale, loadingLabel) => {
    await i18n.changeLanguage(locale);
    mockInstanceSettingsApi.getExperimental.mockImplementation(() => new Promise(() => {}));
    await renderPage();
    expect(container.textContent).toContain(loadingLabel);
  });

  it.each([
    ["pt-BR", "Não foi possível atualizar as configurações experimentais."],
    ["en", "Failed to update experimental settings."],
  ])("localizes toggle failure fallback in %s and rolls back the flag", async (locale, fallback) => {
    await i18n.changeLanguage(locale);
    mockInstanceSettingsApi.updateExperimental.mockRejectedValue(null);
    await renderPage();
    const statusCards = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t("instanceExperimental.statusCards.ariaLabel")}"]`,
    )!;

    await act(async () => { statusCards.click(); });
    await flush();
    expect(statusCards.getAttribute("aria-checked")).toBe("false");
    expect(container.textContent).toContain(fallback);
    expect(mockInstanceSettingsApi.updateExperimental).toHaveBeenCalledWith({
      enableSummaries: true,
      enableStatusCards: true,
    });
  });

  it("relocalizes a stored toggle fallback after the language changes", async () => {
    await i18n.changeLanguage("pt-BR");
    mockInstanceSettingsApi.updateExperimental.mockRejectedValue(null);
    await renderPage();
    const statusCards = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t("instanceExperimental.statusCards.ariaLabel")}"]`,
    )!;

    await act(async () => { statusCards.click(); });
    await flush();
    expect(container.textContent).toContain("Não foi possível atualizar as configurações experimentais.");

    await act(async () => { await i18n.changeLanguage("en"); });
    await flush();
    expect(container.textContent).toContain("Failed to update experimental settings.");
  });

  it("preserves a server toggle error and relocalizes the controls after a language switch", async () => {
    await i18n.changeLanguage("pt-BR");
    mockInstanceSettingsApi.updateExperimental.mockRejectedValue(new Error("UPSTREAM FLAG WRITE ERROR"));
    await renderPage();
    const statusCards = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t("instanceExperimental.statusCards.ariaLabel")}"]`,
    )!;

    await act(async () => { statusCards.click(); });
    await flush();
    expect(container.textContent).toContain("UPSTREAM FLAG WRITE ERROR");
    expect(statusCards.getAttribute("aria-checked")).toBe("false");

    await act(async () => { await i18n.changeLanguage("en"); });
    await flush();
    expect(container.textContent).toContain("Status Cards");
    expect(container.textContent).toContain("Summaries");
    expect(container.textContent).toContain("UPSTREAM FLAG WRITE ERROR");
  });

  it.each([
    ["pt-BR", "Não foi possível carregar as configurações experimentais."],
    ["en", "Failed to load experimental settings."],
  ])("localizes settings-load failure fallback in %s", async (locale, fallback) => {
    await i18n.changeLanguage(locale);
    mockInstanceSettingsApi.getExperimental.mockRejectedValue("opaque load failure");
    await renderPage();
    expect(container.textContent).toContain(fallback);
  });

  it("preserves an external settings-read error message", async () => {
    mockInstanceSettingsApi.getExperimental.mockRejectedValue(new Error("RAW SETTINGS READ ERROR"));
    await renderPage();
    expect(container.textContent).toContain("RAW SETTINGS READ ERROR");
  });
});
