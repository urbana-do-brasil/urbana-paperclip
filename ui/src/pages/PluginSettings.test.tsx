// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { queryKeys } from "../lib/queryKeys";
import { PluginSettings } from "./PluginSettings";

const mockPluginsApi = vi.hoisted(() => ({
  get: vi.fn(),
  health: vi.fn(),
  dashboard: vi.fn(),
  logs: vi.fn(),
  getConfig: vi.fn(),
  listLocalFolders: vi.fn(),
  configureLocalFolder: vi.fn(),
}));

const mockSetBreadcrumbs = vi.hoisted(() => vi.fn());

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
    selectedCompany: { id: "company-1", name: "Paperclip", issuePrefix: "PAP" },
    selectedCompanyId: "company-1",
  }),
}));

vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  Navigate: () => null,
  useParams: () => ({ companyPrefix: "PAP", pluginId: "plugin-1" }),
}));

vi.mock("@/plugins/slots", () => ({
  PluginSlotMount: () => null,
  usePluginSlots: () => ({ slots: [] }),
}));

vi.mock("@/components/PageTabBar", () => ({
  PageTabBar: ({
    items,
    onValueChange,
  }: {
    items: Array<{ value: string; label: React.ReactNode }>;
    onValueChange: (value: string) => void;
  }) => (
    <div>
      {items.map((item) => (
        <button key={item.value} type="button" onClick={() => onValueChange(item.value)}>
          {item.label}
        </button>
      ))}
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

function basePlugin(overrides: Record<string, unknown> = {}) {
  return {
    id: "plugin-1",
    pluginKey: "paperclip.e2b-sandbox-provider",
    packageName: "@paperclipai/plugin-e2b",
    version: "0.1.0",
    status: "error",
    categories: ["automation"],
    manifestJson: {
      displayName: "E2B Sandbox Provider",
      version: "0.1.0",
      description: "E2B environments for Paperclip.",
      author: "Paperclip",
      capabilities: ["environment.drivers.register"],
      environmentDrivers: [
        {
          driverKey: "e2b",
          kind: "sandbox_provider",
          displayName: "E2B Cloud Sandbox",
        },
      ],
    },
    lastError: null,
    ...overrides,
  };
}

function wikiFolderDeclaration() {
  return {
    folderKey: "wiki-root",
    displayName: "Wiki root",
    description: "Company-scoped local folder that stores wiki files.",
    access: "readWrite" as const,
    requiredDirectories: ["raw", "wiki"],
    requiredFiles: ["WIKI.md", "index.md"],
  };
}

function folderStatus(overrides: Record<string, unknown> = {}) {
  return {
    folderKey: "wiki-root",
    configured: false,
    path: null,
    realPath: null,
    access: "readWrite",
    readable: false,
    writable: false,
    requiredDirectories: ["raw", "wiki"],
    requiredFiles: ["WIKI.md", "index.md"],
    missingDirectories: ["raw", "wiki"],
    missingFiles: ["WIKI.md", "index.md"],
    healthy: false,
    problems: [{ code: "not_configured", message: "No local folder path is configured." }],
    checkedAt: "2026-05-02T16:00:00.000Z",
    ...overrides,
  };
}

async function renderSettings(
  container: HTMLDivElement,
  experimentalSettings: Record<string, unknown> = {},
) {
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // The local-folders section is a host-path surface, so it stays hidden until
  // the managed-sandbox-only policy is known. Seed the policy as off; the tests
  // below are about folder rendering, not about the gate.
  queryClient.setQueryData(queryKeys.instance.experimentalSettings, experimentalSettings);

  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <PluginSettings />
      </QueryClientProvider>,
    );
  });
  await flushReact();
  await flushReact();
  return root;
}

describe("PluginSettings", () => {
  let container: HTMLDivElement;

  afterAll(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);

    mockPluginsApi.get.mockResolvedValue(basePlugin());
    mockPluginsApi.dashboard.mockResolvedValue(null);
    mockPluginsApi.health.mockResolvedValue({ pluginId: "plugin-1", status: "ready", healthy: true, checks: [] });
    mockPluginsApi.logs.mockResolvedValue([]);
    mockPluginsApi.listLocalFolders.mockResolvedValue({
      pluginId: "plugin-1",
      companyId: "company-1",
      declarations: [],
      folders: [],
    });
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("routes environment-provider plugins to instance environments when they have no instance config", async () => {
    const root = await renderSettings(container);

    expect(container.textContent).toContain("Configure this plugin from Settings → Environments.");
    expect(container.textContent).toContain("secret bindings still resolve through the selected organization context");
    const link = container.querySelector('a[href="/company/settings/instance/environments"]');
    expect(link?.textContent).toContain("Open Environments");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders unconfigured manifest local folders with required paths", async () => {
    const declaration = wikiFolderDeclaration();
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      pluginKey: "paperclipai.plugin-llm-wiki",
      packageName: "@paperclipai/plugin-llm-wiki",
      status: "ready",
      manifestJson: {
        displayName: "LLM Wiki",
        version: "0.1.0",
        description: "Local-file LLM Wiki plugin.",
        author: "Paperclip",
        capabilities: ["local.folders"],
        localFolders: [declaration],
      },
    }));
    mockPluginsApi.listLocalFolders.mockResolvedValue({
      pluginId: "plugin-1",
      companyId: "company-1",
      declarations: [declaration],
      folders: [folderStatus()],
    });

    const root = await renderSettings(container);

    expect(container.textContent).toContain("Local folders");
    expect(container.textContent).toContain("Wiki root");
    expect(container.textContent).toContain("Needs attention");
    expect(container.textContent).toContain("No local folder path is configured.");
    expect(container.textContent).toContain("Missing directories: raw, wiki");
    expect(container.textContent).toContain("Missing files: WIKI.md, index.md");

    await act(async () => {
      root.unmount();
    });
  });

  it("hides local folders when the instance runs agents only in the platform-managed environment", async () => {
    const declaration = wikiFolderDeclaration();
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      pluginKey: "paperclipai.plugin-llm-wiki",
      packageName: "@paperclipai/plugin-llm-wiki",
      status: "ready",
      manifestJson: {
        displayName: "LLM Wiki",
        version: "0.1.0",
        description: "Local-file LLM Wiki plugin.",
        author: "Paperclip",
        capabilities: ["local.folders"],
        localFolders: [declaration],
      },
    }));
    mockPluginsApi.listLocalFolders.mockResolvedValue({
      pluginId: "plugin-1",
      companyId: "company-1",
      declarations: [declaration],
      folders: [folderStatus()],
    });

    const root = await renderSettings(container, { enableManagedSandboxOnly: true });

    // The platform-managed environment owns the filesystem, so the whole
    // section disappears rather than showing paths nobody can act on.
    expect(container.textContent).not.toContain("Local folders");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders invalid configured folders with validation problems", async () => {
    const declaration = wikiFolderDeclaration();
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      manifestJson: {
        displayName: "LLM Wiki",
        version: "0.1.0",
        description: "Local-file LLM Wiki plugin.",
        author: "Paperclip",
        capabilities: ["local.folders"],
        localFolders: [declaration],
      },
    }));
    mockPluginsApi.listLocalFolders.mockResolvedValue({
      pluginId: "plugin-1",
      companyId: "company-1",
      declarations: [declaration],
      folders: [folderStatus({
        configured: true,
        path: "/tmp/wiki",
        realPath: "/tmp/wiki",
        readable: true,
        writable: true,
        missingDirectories: [],
        missingFiles: ["WIKI.md"],
        problems: [{ code: "missing_file", message: "Required file is missing.", path: "WIKI.md" }],
      })],
    });

    const root = await renderSettings(container);

    expect(container.textContent).toContain("/tmp/wiki");
    expect(container.textContent).toContain("ReadableYes");
    expect(container.textContent).toContain("WritableYes");
    expect(container.textContent).toContain("Validation problems");
    expect(container.textContent).toContain("Required file is missing.");
    expect(container.textContent).toContain("Missing files: WIKI.md");

    await act(async () => {
      root.unmount();
    });
  });

  it("does not render required paths as present when the configured root cannot be inspected", async () => {
    const declaration = wikiFolderDeclaration();
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      manifestJson: {
        displayName: "LLM Wiki",
        version: "0.1.0",
        description: "Local-file LLM Wiki plugin.",
        author: "Paperclip",
        capabilities: ["local.folders"],
        localFolders: [declaration],
      },
    }));
    mockPluginsApi.listLocalFolders.mockResolvedValue({
      pluginId: "plugin-1",
      companyId: "company-1",
      declarations: [declaration],
      folders: [folderStatus({
        configured: true,
        path: "/tmp/wiki-missing",
        readable: false,
        writable: false,
        missingDirectories: [],
        missingFiles: [],
        problems: [{ code: "missing", message: "Configured local folder cannot be inspected.", path: "/tmp/wiki-missing" }],
      })],
    });

    const root = await renderSettings(container);

    expect(container.textContent).toContain("Configured local folder cannot be inspected.");
    expect(container.textContent).toContain("Not inspected");
    expect(container.textContent).toContain("Configured root was not inspected.");
    expect(container.textContent).not.toContain("Present");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders healthy folders without validation problems", async () => {
    const declaration = wikiFolderDeclaration();
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      manifestJson: {
        displayName: "LLM Wiki",
        version: "0.1.0",
        description: "Local-file LLM Wiki plugin.",
        author: "Paperclip",
        capabilities: ["local.folders"],
        localFolders: [declaration],
      },
    }));
    mockPluginsApi.listLocalFolders.mockResolvedValue({
      pluginId: "plugin-1",
      companyId: "company-1",
      declarations: [declaration],
      folders: [folderStatus({
        configured: true,
        path: "/tmp/wiki",
        realPath: "/private/tmp/wiki",
        readable: true,
        writable: true,
        missingDirectories: [],
        missingFiles: [],
        healthy: true,
        problems: [],
      })],
    });

    const root = await renderSettings(container);

    expect(container.textContent).toContain("Healthy");
    expect(container.textContent).toContain("Configured path");
    expect(container.textContent).toContain("/tmp/wiki");
    expect(container.textContent).toContain("ReadableYes");
    expect(container.textContent).toContain("WritableYes");
    expect(container.textContent).toContain("Present");
    expect(container.textContent).not.toContain("Validation problems");

    await act(async () => {
      root.unmount();
    });
  });

  it("uses PT-BR as the default UI locale for plugin settings", async () => {
    expect(DEFAULT_LOCALE).toBe("pt-BR");
    await i18n.changeLanguage(DEFAULT_LOCALE);
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      status: "future-lifecycle-state",
      manifestJson: {
        displayName: "External plugin name",
        version: "0.1.0",
        description: "Manifest-owned description stays as provided.",
        author: "Plugin author",
        capabilities: ["example.permission"],
      },
    }));

    const root = await renderSettings(container);

    expect(container.textContent).toContain("Sobre");
    expect(container.textContent).toContain("Descrição");
    expect(container.textContent).toContain("Configurações");
    expect(container.textContent).toContain("External plugin name");
    expect(container.textContent).toContain("Manifest-owned description stays as provided.");
    expect(container.textContent).toContain("Plugin author");
    expect(container.textContent).toContain("future-lifecycle-state");

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["pt-BR", "Sobre", "Descrição", "Configurações"],
    ["en", "About", "Description", "Settings"],
  ])("localizes host-owned configuration labels in %s while preserving manifest content", async (locale, about, description, settings) => {
    await i18n.changeLanguage(locale);
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      manifestJson: {
        displayName: "Plugin-defined display name",
        version: "0.1.0",
        description: "Plugin-defined description.",
        author: "Plugin-defined author",
        capabilities: [],
      },
    }));

    const root = await renderSettings(container);

    expect(container.textContent).toContain(about);
    expect(container.textContent).toContain(description);
    expect(container.textContent).toContain(settings);
    expect(container.textContent).toContain("Plugin-defined display name");
    expect(container.textContent).toContain("Plugin-defined description.");
    expect(container.textContent).toContain("Plugin-defined author");

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["pt-BR", "Pastas locais", "Requer atenção", "Pastas ausentes", "Arquivos ausentes", "/caminho/absoluto/da/pasta"],
    ["en", "Local folders", "Needs attention", "Missing directories", "Missing files", "/absolute/path/to/folder"],
  ])("localizes host-owned folder controls in %s and preserves external diagnostics", async (locale, folderTitle, attention, missingDirectories, missingFiles, pathPlaceholder) => {
    await i18n.changeLanguage(locale);
    const declaration = wikiFolderDeclaration();
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      status: "ready",
      manifestJson: {
        displayName: "Folder plugin",
        version: "0.1.0",
        description: "External manifest description.",
        author: "Plugin author",
        capabilities: ["local.folders"],
        localFolders: [declaration],
      },
    }));
    mockPluginsApi.listLocalFolders.mockResolvedValue({
      pluginId: "plugin-1",
      companyId: "company-1",
      declarations: [declaration],
      folders: [folderStatus({
        problems: [{ code: "not_configured", message: "External validation diagnostic." }],
      })],
    });

    const root = await renderSettings(container);

    expect(container.textContent).toContain(folderTitle);
    expect(container.textContent).toContain(attention);
    expect(container.textContent).toContain(missingDirectories);
    expect(container.textContent).toContain(missingFiles);
    expect(container.textContent).toContain("External validation diagnostic.");
    expect(container.textContent).toContain("Company-scoped local folder that stores wiki files.");
    expect(container.textContent).toContain("External manifest description.");
    expect(container.querySelector("input")?.getAttribute("placeholder")).toBe(pathPlaceholder);

    await act(async () => {
      root.unmount();
    });
  });

  it.each([
    ["pt-BR", "Painel do runtime", "Processo de trabalho", "Status de integridade", "Permissões", "Pronto", "Em execução", "Concluída", "Agendado", "Manual", "Nova tentativa"],
    ["en", "Runtime Dashboard", "Worker Process", "Health Status", "Permissions", "Ready", "Running", "Succeeded", "Scheduled", "Manual", "Retry"],
  ])("localizes the status and diagnostics surface in %s", async (locale, runtimeDashboard, workerProcess, healthStatus, permissions, readyStatus, runningStatus, succeededStatus, scheduledTrigger, manualTrigger, retryTrigger) => {
    await i18n.changeLanguage(locale);
    mockPluginsApi.get.mockResolvedValue(basePlugin({
      status: "ready",
      manifestJson: {
        displayName: "Diagnostic plugin",
        version: "0.1.0",
        description: "Plugin-owned description.",
        author: "Plugin author",
        capabilities: ["plugin.capability.value"],
      },
    }));
    const makeJobRun = (id: string, trigger: string, status: string, jobKey: string) => ({
      id,
      jobId: `job-${id}`,
      jobKey,
      trigger,
      status,
      durationMs: 1000,
      error: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    const dashboardData = {
      pluginId: "plugin-1",
      worker: {
        status: "running",
        pid: 42,
        uptime: 60000,
        consecutiveCrashes: 0,
        totalCrashes: 0,
        pendingRequests: 1,
        lastCrashAt: null,
        nextRestartAt: null,
      },
      recentJobRuns: [
        makeJobRun("run-manual", "manual", "succeeded", "plugin-job-key"),
        makeJobRun("run-scheduled", "schedule", "pending", "plugin-job-scheduled"),
        makeJobRun("run-retry", "retry", "failed", "plugin-job-retry"),
        makeJobRun("run-future", "future-trigger", "queued", "plugin-job-future"),
      ],
      recentWebhookDeliveries: [{
        id: "delivery-1",
        webhookKey: "manifest-webhook-key",
        status: "success",
        durationMs: 1000,
        error: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }],
      health: { pluginId: "plugin-1", status: "ready", healthy: true, checks: [] },
      checkedAt: new Date().toISOString(),
    };
    mockPluginsApi.dashboard.mockResolvedValue(dashboardData);
    const root = await renderSettings(container);
    const statusTab = [...container.querySelectorAll("button")].find((button) =>
      button.textContent === i18n.t("pluginSettings.tabs.status"),
    );
    expect(statusTab).toBeDefined();

    await act(async () => {
      statusTab!.click();
    });
    await flushReact();

    expect(container.textContent).toContain(runtimeDashboard);
    expect(container.textContent).toContain(workerProcess);
    expect(container.textContent).toContain(healthStatus);
    expect(container.textContent).toContain(permissions);
    expect(container.textContent).toContain("Diagnostic plugin");
    expect(container.textContent).toContain(readyStatus);
    expect(container.textContent).toContain(runningStatus);
    expect(container.textContent).toContain("plugin.capability.value");
    expect(container.textContent).toContain("plugin-job-key");
    expect(container.textContent).toContain("manifest-webhook-key");
    expect(container.textContent).toContain(scheduledTrigger);
    expect(container.textContent).toContain(manualTrigger);
    expect(container.textContent).toContain(retryTrigger);
    expect(container.textContent).toContain("future-trigger");
    expect(dashboardData.recentJobRuns.map(({ trigger }) => trigger)).toEqual([
      "manual",
      "schedule",
      "retry",
      "future-trigger",
    ]);
    expect(container.querySelector(`[title="${succeededStatus}"]`)).toBeDefined();
    expect(container.querySelectorAll(`[title="${succeededStatus}"]`)).toHaveLength(2);

    await act(async () => {
      root.unmount();
    });
  });
});
