// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { PluginManager } from "./PluginManager";

const mockPluginsApi = vi.hoisted(() => ({
  list: vi.fn(),
  listBundled: vi.fn(),
  install: vi.fn(),
  uninstall: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
}));

const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());
const mockPushToast = vi.hoisted(() => vi.fn());

vi.mock("@/api/plugins", () => ({ pluginsApi: mockPluginsApi }));
vi.mock("@/context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mockSetBreadcrumbs }),
}));
vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompany: { id: "company-1", name: "Acme" } }),
}));
vi.mock("@/context/ToastContext", () => ({
  useToastActions: () => ({ pushToast: mockPushToast }),
}));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function plugin(overrides: Record<string, unknown> = {}) {
  return {
    id: "plugin-1",
    pluginKey: "vendor.fixture",
    packageName: "@vendor/plugin-fixture",
    packagePath: "/plugins/vendor-fixture",
    version: "1.2.3",
    status: "ready",
    categories: [],
    manifestJson: {
      displayName: "Vendor Fixture",
      version: "1.2.3",
      description: "Description from the external plugin manifest.",
      author: "Vendor",
    },
    lastError: null,
    ...overrides,
  };
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function clickButton(label: string, scope: ParentNode = document) {
  const button = Array.from(scope.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  if (!button) throw new Error(`Button not found: ${label}`);
  await act(async () => button.click());
  await flushReact();
}

async function renderManager(container: HTMLDivElement) {
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <PluginManager />
      </QueryClientProvider>,
    );
  });
  await flushReact();
  return { root, queryClient };
}

describe("PluginManager localization", () => {
  let container: HTMLDivElement;
  let mounted: { root: Root; queryClient: QueryClient } | null = null;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    mockPluginsApi.list.mockResolvedValue([]);
    mockPluginsApi.listBundled.mockResolvedValue([]);
    mockPluginsApi.install.mockResolvedValue(plugin());
    mockPluginsApi.uninstall.mockResolvedValue(undefined);
    mockPluginsApi.enable.mockResolvedValue(undefined);
    mockPluginsApi.disable.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (mounted) {
      await act(async () => mounted?.root.unmount());
      mounted.queryClient.clear();
      mounted = null;
    }
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it("shows the loading state in Portuguese while installed plugins load", async () => {
    let resolvePlugins!: (value: ReturnType<typeof plugin>[]) => void;
    mockPluginsApi.list.mockReturnValue(new Promise((resolve) => { resolvePlugins = resolve; }));
    await i18n.changeLanguage("pt-BR");

    mounted = await renderManager(container);

    expect(container.textContent).toContain("Carregando plugins...");
    resolvePlugins([]);
    await flushReact();
    expect(container.textContent).toContain("Gerenciador de plugins");
  });

  it("localizes installed and bundled plugin load failures", async () => {
    await i18n.changeLanguage("pt-BR");
    mockPluginsApi.list.mockRejectedValue(new Error("internal installed plugin failure"));
    mockPluginsApi.listBundled.mockRejectedValue(new Error("internal bundled plugin failure"));

    mounted = await renderManager(container);
    expect(container.textContent).toContain("Não foi possível carregar os plugins.");
    expect(container.textContent).not.toContain("internal installed plugin failure");

    const failedLoadRender = mounted;
    if (!failedLoadRender) throw new Error("Expected the plugin manager to be mounted");
    await act(async () => failedLoadRender.root.unmount());
    failedLoadRender.queryClient.clear();
    mounted = null;
    container.innerHTML = "";

    mockPluginsApi.list.mockResolvedValue([]);
    mounted = await renderManager(container);
    expect(container.textContent).toContain("Não foi possível carregar os plugins incluídos.");
    expect(container.textContent).not.toContain("internal bundled plugin failure");
  });

  it("localizes empty states and installs a package with a localized success toast", async () => {
    let resolveInstall!: (value: ReturnType<typeof plugin>) => void;
    mockPluginsApi.install.mockReturnValue(new Promise((resolve) => { resolveInstall = resolve; }));
    await i18n.changeLanguage("pt-BR");
    mounted = await renderManager(container);

    expect(container.textContent).toContain("Nenhum plugin incluído foi encontrado neste checkout.");
    expect(container.textContent).toContain("Nenhum plugin instalado");
    expect(container.textContent).toContain("Instale um plugin para ampliar as funcionalidades.");

    await clickButton("Instalar plugin");
    const input = document.querySelector<HTMLInputElement>("#packageName");
    expect(input).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "@vendor/new-plugin");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flushReact();
    await clickButton("Instalar");
    expect(Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim() === "Instalando..."))
      .toBe(true);

    await act(async () => resolveInstall(plugin({ packageName: "@vendor/new-plugin" })));
    await flushReact();

    expect(mockPluginsApi.install).toHaveBeenCalledWith({ packageName: "@vendor/new-plugin" });
    expect(mockPushToast).toHaveBeenCalledWith({
      title: "Plugin instalado com sucesso",
      tone: "success",
    });
  });

  it("localizes install failure and passes the external error text through unchanged", async () => {
    const externalError = "E404: vendor registry response for @vendor/new-plugin";
    mockPluginsApi.install.mockRejectedValue(new Error(externalError));
    await i18n.changeLanguage("pt-BR");
    mounted = await renderManager(container);

    await clickButton("Instalar plugin");
    const input = document.querySelector<HTMLInputElement>("#packageName");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "@vendor/new-plugin");
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await flushReact();
    await clickButton("Instalar");

    expect(mockPushToast).toHaveBeenCalledWith({
      title: "Não foi possível instalar o plugin",
      body: externalError,
      tone: "error",
    });
  });

  it("preserves external manifest values and diagnostics while localizing host labels and accessible actions", async () => {
    const fullError = "REMOTE_RUNTIME_FAILURE: use provider dashboard\nrequest-id=ext-123";
    mockPluginsApi.list.mockResolvedValue([
      plugin({
        id: "plugin-external",
        status: "error",
        version: "8.4.2",
        manifestJson: {
          displayName: "外部 Search Provider",
          version: "8.4.2",
          description: "Do not translate this vendor-provided description.",
          author: "Fornecedor Externo",
        },
        lastError: fullError,
      }),
      plugin({
        id: "plugin-unknown-status",
        status: "vendor_waiting_for_region",
        manifestJson: {
          displayName: "Vendor Status Fixture",
          version: "3.0.1",
          description: "Unknown status should pass through.",
          author: "Vendor",
        },
      }),
    ]);
    mockPluginsApi.listBundled.mockResolvedValue([
      {
        packageName: "@vendor/plugin-fixture",
        pluginKey: "vendor.fixture",
        displayName: "外部 Search Provider",
        description: "Bundled description from the fixture.",
        localPath: "packages/plugins/vendor-fixture",
        tag: "first-party",
        experimental: true,
        hasBuiltEntrypoints: true,
      },
      {
        packageName: "@vendor/example-plugin",
        pluginKey: "vendor.example",
        displayName: "Vendor Example",
        description: "Example fixture description.",
        localPath: "packages/plugins/vendor-example",
        tag: "example",
        experimental: false,
        hasBuiltEntrypoints: true,
      },
    ]);
    await i18n.changeLanguage("pt-BR");
    mounted = await renderManager(container);

    expect(container.textContent).toContain("外部 Search Provider");
    expect(container.textContent).toContain("Do not translate this vendor-provided description.");
    expect(container.textContent).toContain("@vendor/plugin-fixture · v8.4.2");
    expect(container.textContent).toContain("vendor_waiting_for_region");
    expect(container.textContent).toContain("Erro no plugin");
    expect(container.textContent).toContain("Oficial");
    expect(container.textContent).toContain("Exemplo");
    expect(container.textContent).toContain("Experimental");
    expect(container.textContent).toContain("Com erro");
    expect(container.textContent).toContain("REMOTE_RUNTIME_FAILURE: use provider dashboard");

    const enableButton = container.querySelector<HTMLButtonElement>('button[aria-label="Ativar plugin"]');
    expect(enableButton).not.toBeNull();
    await clickButton("Ver erro completo");
    expect(document.body.textContent).toContain("Detalhes do erro");
    expect(document.body.textContent).toContain("O que apresentou erro");
    expect(document.body.textContent).toContain(fullError);
    expect(document.body.textContent).toContain("request-id=ext-123");

    await clickButton("Fechar");
    const uninstallButton = container.querySelector<HTMLButtonElement>('button[aria-label="Desinstalar plugin"]');
    expect(uninstallButton).not.toBeNull();
    await act(async () => uninstallButton?.click());
    await flushReact();
    expect(document.body.textContent).toContain("Tem certeza de que deseja desinstalar 外部 Search Provider?");
    expect(document.body.textContent).toContain("Esta ação não pode ser desfeita.");
  });

  it("localizes first-party metadata in the bundled catalog and installed list", async () => {
    mockPluginsApi.list.mockResolvedValue([
      plugin({
        id: "workspace-changes-plugin",
        pluginKey: "paperclip.workspace-diff",
        packageName: "@paperclipai/plugin-workspace-diff",
        packagePath: "packages/plugins/plugin-workspace-diff",
        manifestJson: {
          id: "paperclip.workspace-diff",
          displayName: "Workspace Changes",
          version: "0.1.0",
          description: "Adds a Changes tab to execution and project workspaces using plugin-local Git diff computation and @pierre/diffs.",
          author: "Paperclip",
        },
      }),
    ]);
    mockPluginsApi.listBundled.mockResolvedValue([
      {
        packageName: "@paperclipai/plugin-llm-wiki",
        pluginKey: "paperclipai.plugin-llm-wiki",
        displayName: "LLM Wiki",
        description: "Local-file LLM Wiki plugin for source ingestion, wiki browsing, query, lint, and maintenance workflows.",
        localPath: "packages/plugins/plugin-llm-wiki",
        tag: "first-party",
        experimental: false,
        hasBuiltEntrypoints: true,
      },
      {
        packageName: "@paperclipai/plugin-workspace-diff",
        pluginKey: "paperclip.workspace-diff",
        displayName: "Workspace Changes",
        description: "Adds a Changes tab to execution and project workspaces using plugin-local Git diff computation and @pierre/diffs.",
        localPath: "packages/plugins/plugin-workspace-diff",
        tag: "first-party",
        experimental: false,
        hasBuiltEntrypoints: true,
      },
    ]);
    await i18n.changeLanguage("pt-BR");

    mounted = await renderManager(container);

    expect(container.textContent).toContain("Alterações no workspace");
    expect(container.textContent).toContain("Adiciona uma aba de alterações aos workspaces de execução e de projetos");
    expect(container.textContent).toContain("Plugin LLM Wiki baseado em arquivos locais");
    expect(container.textContent).not.toContain("Local-file LLM Wiki plugin");
  });
});
