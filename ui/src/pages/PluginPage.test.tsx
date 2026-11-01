// @vitest-environment jsdom

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { PluginPage } from "./PluginPage";

const mockPluginsApi = vi.hoisted(() => ({
  listUiContributions: vi.fn(),
  list: vi.fn(),
  listBundled: vi.fn(),
}));

const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());
const mockSelectedCompanyId = vi.hoisted(() => ({ value: "company-1" as string | null }));
const mockParams = vi.hoisted(() => ({
  companyPrefix: "PAP" as string | undefined,
  pluginId: undefined as string | undefined,
  pluginRoutePath: undefined as string | undefined,
  "*": undefined as string | undefined,
}));

vi.mock("@/api/plugins", () => ({
  pluginsApi: mockPluginsApi,
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
  Navigate: () => null,
  useParams: () => mockParams,
}));

vi.mock("@/plugins/slots", async () => {
  const actual = await vi.importActual<typeof import("@/plugins/slots")>("@/plugins/slots");
  return {
    resolveRouteSidebarSlot: actual.resolveRouteSidebarSlot,
    usePluginUiContributionsWithPresentation: actual.usePluginUiContributionsWithPresentation,
    PluginSlotMount: ({ slot }: { slot: { displayName: string } }) => (
      <div data-testid="plugin-slot-mount">{slot.displayName}</div>
    ),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function act(callback: () => void | Promise<void>) {
  await callback();
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function pageContribution(overrides: Partial<{ slots: unknown[] }> = {}) {
  return {
    pluginId: "plugin-wiki",
    pluginKey: "paperclipai.plugin-llm-wiki",
    displayName: "LLM Wiki",
    version: "0.1.0",
    uiEntryFile: "ui.js",
    slots: [
      {
        type: "page",
        id: "wiki-page",
        displayName: "Wiki",
        exportName: "WikiPage",
        routePath: "wiki",
      },
    ],
    launchers: [],
    ...overrides,
  };
}

async function renderPage(container: HTMLDivElement, seed?: (queryClient: QueryClient) => void) {
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  seed?.(queryClient);

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <PluginPage />
      </QueryClientProvider>,
    );
  });
  await flushReact();
  await flushReact();
  return root;
}

describe("PluginPage", () => {
  let container: HTMLDivElement;
  const previousLanguage = i18n.resolvedLanguage ?? i18n.language;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    mockPluginsApi.list.mockResolvedValue([]);
    mockPluginsApi.listBundled.mockResolvedValue([]);
    container = document.createElement("div");
    document.body.appendChild(container);
    mockParams.companyPrefix = "PAP";
    mockParams.pluginId = undefined;
    mockParams.pluginRoutePath = undefined;
    mockParams["*"] = undefined;
    mockSelectedCompanyId.value = "company-1";
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
    ["en", "Plugins", "Back"],
    ["pt-BR", "Plugins", "Voltar"],
  ])("localizes the host breadcrumb and back button on a legacy plugin route in %s", async (locale, breadcrumb, backLabel) => {
    await i18n.changeLanguage(locale);
    mockParams.pluginRoutePath = "wiki";
    mockPluginsApi.listUiContributions.mockResolvedValue([pageContribution()]);

    const root = await renderPage(container);

    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { label: breadcrumb, href: "/company/settings/instance/plugins" },
      { label: "LLM Wiki" },
    ]);
    expect(container.textContent).toContain(backLabel);
    expect(container.querySelector('a[href="/PAP/dashboard"]')).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it("uses the bundled plugin presentation in the host page breadcrumb", async () => {
    await i18n.changeLanguage("pt-BR");
    const pluginKey = "paperclip-kitchen-sink-example";
    const packageName = "@paperclipai/plugin-kitchen-sink-example";
    const packagePath = "/app/packages/plugins/examples/plugin-kitchen-sink-example";
    mockParams.pluginId = "plugin-kitchen";
    const contribution = {
      pluginId: "plugin-kitchen",
      pluginKey,
      displayName: "Kitchen Sink (Example)",
      version: "0.1.0",
      uiEntryFile: "ui.js",
      slots: [{
        type: "page",
        id: "kitchen-sink-page",
        displayName: "Kitchen Sink",
        exportName: "KitchenSinkPage",
        routePath: "kitchen-sink",
      }],
      launchers: [],
    };
    const installed = [{
      id: "plugin-kitchen",
      pluginKey,
      packageName,
      packagePath,
      manifestJson: { id: pluginKey },
    }];
    const bundled = [{
      pluginKey,
      packageName,
      localPath: packagePath,
    }];

    const root = await renderPage(container, (queryClient) => {
      queryClient.setQueryData(queryKeys.plugins.uiContributions, [contribution]);
      queryClient.setQueryData(queryKeys.plugins.all, installed);
      queryClient.setQueryData(queryKeys.plugins.examples, bundled);
    });

    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
      { label: "Plugins", href: "/company/settings/instance/plugins" },
      { label: "Kitchen Sink (exemplo)" },
    ]);
    expect(container.querySelector('[data-testid="plugin-slot-mount"]')?.textContent).toBe("Kitchen Sink");

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Select an organization to view this page."],
    ["pt-BR", "Selecione uma organização para ver esta página."],
  ])("localizes the missing-organization fallback in %s", async (locale, message) => {
    await i18n.changeLanguage(locale);
    mockParams.companyPrefix = undefined;
    mockSelectedCompanyId.value = null;

    const root = await renderPage(container);

    expect(container.textContent).toContain(message);
    expect(mockPluginsApi.listUiContributions).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Loading…"],
    ["pt-BR", "Carregando…"],
  ])("localizes the loading fallback in %s", async (locale, message) => {
    await i18n.changeLanguage(locale);
    mockParams.pluginRoutePath = "wiki";
    mockPluginsApi.listUiContributions.mockImplementation(() => new Promise(() => {}));

    const root = await renderPage(container);

    expect(container.textContent).toContain(message);

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["en", "Multiple plugins declare the route", "Use the plugin-id route until the conflict is resolved."],
    ["pt-BR", "Vários plugins declaram a rota", "Use a rota com o ID do plugin até resolver o conflito."],
  ])("localizes a duplicate plugin-route fallback in %s and preserves the route", async (locale, prefix, suffix) => {
    await i18n.changeLanguage(locale);
    mockParams.pluginRoutePath = "wiki";
    mockPluginsApi.listUiContributions.mockResolvedValue([
      pageContribution(),
      {
        ...pageContribution(),
        pluginId: "plugin-second",
        pluginKey: "second-plugin",
        displayName: "Second plugin",
      },
    ]);

    const root = await renderPage(container);

    expect(container.textContent).toContain(`${prefix} wiki. ${suffix}`);

    await act(async () => {
      root.unmount();
    });
  });

  it("uses a route title and hides the Back button when a routeSidebar matches the active route", async () => {
    mockParams.pluginRoutePath = "wiki";
    mockPluginsApi.listUiContributions.mockResolvedValue([
      pageContribution({
        slots: [
          {
            type: "page",
            id: "wiki-page",
            displayName: "Wiki",
            exportName: "WikiPage",
            routePath: "wiki",
          },
          {
            type: "routeSidebar",
            id: "wiki-sidebar",
            displayName: "Wiki Sidebar",
            exportName: "WikiRouteSidebar",
            routePath: "wiki",
          },
        ],
      }),
    ]);

    const root = await renderPage(container);

    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([{ label: "Wiki" }]);
    expect(container.textContent).not.toContain("Back");
    expect(container.querySelector('a[href="/PAP/dashboard"]')).toBeNull();
    // Page slot itself still renders.
    expect(container.querySelector('[data-testid="plugin-slot-mount"]')?.textContent).toBe("Wiki");

    await act(async () => {
      root.unmount();
    });
  });

  it("uses the selected plugin page path as the route-sidebar title", async () => {
    mockParams.pluginRoutePath = "wiki";
    mockParams["*"] = "page/templates%3A%3Aindex.md";
    mockPluginsApi.listUiContributions.mockResolvedValue([
      pageContribution({
        slots: [
          {
            type: "page",
            id: "wiki-page",
            displayName: "Wiki",
            exportName: "WikiPage",
            routePath: "wiki",
          },
          {
            type: "routeSidebar",
            id: "wiki-sidebar",
            displayName: "Wiki Sidebar",
            exportName: "WikiRouteSidebar",
            routePath: "wiki",
          },
        ],
      }),
    ]);

    const root = await renderPage(container);

    expect(mockSetBreadcrumbs).toHaveBeenCalledWith([{ label: "index" }]);

    await act(async () => {
      root.unmount();
    });
  });
});
