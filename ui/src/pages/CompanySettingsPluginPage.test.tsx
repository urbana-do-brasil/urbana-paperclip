// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { CompanySettingsPluginPage } from "./CompanySettingsPluginPage";

const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());
const mockUsePluginSlots = vi.hoisted(() => vi.fn());
const mockSelectedCompanyId = vi.hoisted(() => ({ value: "company-1" as string | null }));
const mockLocation = vi.hoisted(() => ({ pathname: "/PAP/company/settings/permissions", search: "", hash: "" }));
const mockParams = vi.hoisted(() => ({
  companyPrefix: "PAP" as string | undefined,
  settingsRoutePath: "permissions" as string | undefined,
}));

vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({
    setBreadcrumbs: mockSetBreadcrumbs,
  }),
}));

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [{ id: "company-1", name: "Paperclip", issuePrefix: "PAP" }],
    selectedCompanyId: mockSelectedCompanyId.value,
  }),
}));

vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useLocation: () => mockLocation,
  useParams: () => mockParams,
}));

vi.mock("@/plugins/slots", () => ({
  usePluginSlots: mockUsePluginSlots,
  PluginSlotMount: ({
    slot,
    context,
  }: {
    slot: { displayName: string };
    context: { companyId: string | null; companyPrefix: string | null };
  }) => (
    <div data-testid="plugin-slot-mount">
      {slot.displayName}:{context.companyId}:{context.companyPrefix}
    </div>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function renderPage(container: HTMLDivElement) {
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <CompanySettingsPluginPage />
      </QueryClientProvider>,
    );
  });
  await flushReact();
  return root;
}

describe("CompanySettingsPluginPage", () => {
  let container: HTMLDivElement;
  const previousLanguage = i18n.resolvedLanguage ?? i18n.language;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    mockParams.companyPrefix = "PAP";
    mockParams.settingsRoutePath = "permissions";
    mockSelectedCompanyId.value = "company-1";
    mockLocation.pathname = "/PAP/company/settings/permissions";
    mockUsePluginSlots.mockReturnValue({
      slots: [
        {
          type: "companySettingsPage",
          id: "permissions",
          displayName: "Permissions",
          exportName: "PermissionsPage",
          routePath: "permissions",
          pluginId: "plugin-1",
          pluginKey: "permissions-extension",
          pluginDisplayName: "Permissions Extension",
          pluginVersion: "0.1.0",
        },
      ],
      isLoading: false,
      errorMessage: null,
    });
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await i18n.changeLanguage(previousLanguage);
  });

  it.each([
    ["en", "Settings"],
    ["pt-BR", "Configurações"],
  ])("localizes the company settings breadcrumb in %s and mounts the slot with company context", async (locale, breadcrumb) => {
    await i18n.changeLanguage(locale);
    const root = await renderPage(container);

    expect(container.querySelector('[data-testid="plugin-slot-mount"]')?.textContent).toBe(
      "Permissions:company-1:PAP",
    );
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { label: breadcrumb, href: "/company/settings" },
      { label: "Permissions" },
    ]);

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Page not found", "Not Found", "Requested path:"],
    ["pt-BR", "Página não encontrada", "Página não encontrada", "Caminho solicitado:"],
  ])("localizes the not-found frame in %s when no plugin declares the route", async (locale, title, breadcrumb, requestedPathLabel) => {
    await i18n.changeLanguage(locale);
    mockUsePluginSlots.mockReturnValue({
      slots: [],
      isLoading: false,
      errorMessage: null,
    });
    const root = await renderPage(container);

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain("/PAP/company/settings/permissions");
    expect(container.textContent).toContain(requestedPathLabel);
    expect(container.textContent).toContain(locale === "en" ? "Open dashboard" : "Abrir painel");
    expect(container.textContent).toContain(locale === "en" ? "Go home" : "Ir para o início");
    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([{ label: breadcrumb }]);

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Organization not found", "No organization matches prefix \"MISSING\"."],
    ["pt-BR", "Organização não encontrada", "Nenhuma organização corresponde ao prefixo \"MISSING\"."],
  ])("localizes the invalid-organization fallback in %s while preserving the requested prefix", async (locale, title, description) => {
    await i18n.changeLanguage(locale);
    mockParams.companyPrefix = "missing";

    const root = await renderPage(container);

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain(description);

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Select an organization to view this page."],
    ["pt-BR", "Selecione uma organização para ver esta página."],
  ])("localizes the organization-selection fallback in %s", async (locale, message) => {
    await i18n.changeLanguage(locale);
    mockParams.companyPrefix = undefined;
    mockSelectedCompanyId.value = null;

    const root = await renderPage(container);

    expect(container.textContent).toContain(message);

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Loading…"],
    ["pt-BR", "Carregando…"],
  ])("localizes the loading fallback in %s", async (locale, message) => {
    await i18n.changeLanguage(locale);
    mockUsePluginSlots.mockReturnValue({ slots: [], isLoading: true, errorMessage: null });

    const root = await renderPage(container);

    expect(container.textContent).toContain(message);

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Plugin extensions unavailable: UPSTREAM EXTENSION MESSAGE"],
    ["pt-BR", "Extensões de plugins indisponíveis: UPSTREAM EXTENSION MESSAGE"],
  ])("localizes the host plugin error while preserving the external detail in %s", async (locale, message) => {
    await i18n.changeLanguage(locale);
    mockUsePluginSlots.mockReturnValue({ slots: [], isLoading: false, errorMessage: "UPSTREAM EXTENSION MESSAGE" });

    const root = await renderPage(container);

    expect(container.textContent).toContain(message);

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Multiple plugins declare the company settings route", "Disable one plugin or change its route."],
    ["pt-BR", "Vários plugins declaram a rota de configurações da organização", "Desative um plugin ou altere sua rota."],
  ])("localizes a duplicate settings-route fallback in %s and preserves the route", async (locale, prefix, suffix) => {
    await i18n.changeLanguage(locale);
    const slot = {
      type: "companySettingsPage" as const,
      id: "permissions",
      displayName: "Permissions",
      exportName: "PermissionsPage",
      routePath: "permissions",
      pluginId: "plugin-1",
      pluginKey: "permissions-extension",
      pluginDisplayName: "Permissions Extension",
      pluginVersion: "0.1.0",
    };
    mockUsePluginSlots.mockReturnValue({
      slots: [slot, { ...slot, pluginId: "plugin-2", pluginKey: "another-extension" }],
      isLoading: false,
      errorMessage: null,
    });

    const root = await renderPage(container);

    expect(container.textContent).toContain(`${prefix} permissions. ${suffix}`);

    await act(async () => {
      root.unmount();
    });
  });
});
