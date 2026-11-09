// @vitest-environment jsdom

import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WikiPage } from "../src/ui/index.js";

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const FOLDER = {
  configured: true,
  path: "/tmp/company-wiki",
  realPath: "/tmp/company-wiki",
  access: "readWrite" as const,
  readable: true,
  writable: true,
  requiredDirectories: ["raw", "wiki"],
  requiredFiles: ["AGENTS.md", "IDEA.md", "wiki/index.md", "wiki/log.md"],
  missingDirectories: [] as string[],
  missingFiles: [] as string[],
  healthy: true,
  problems: [] as Array<{ code: string; message: string; path?: string }>,
  checkedAt: "2026-11-01T00:00:00.000Z",
};

type BridgeGlobal = typeof globalThis & {
  __paperclipPluginBridge__?: {
    sdkUi?: Record<string, unknown>;
  };
};

type ActionCall = { key: string; params?: unknown };
type ToastCall = { tone: string; title: string; body?: string };
type SpaceInput = {
  companyId: string;
  slug: string;
  displayName: string;
  folderMode: string;
  accessScope: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let pathname: string;
let actionCalls: ActionCall[];
let toastCalls: ToastCall[];
let actionErrors: Record<string, string>;
let actionResults: Record<string, unknown>;
let ingestionProfile: Record<string, unknown> | null;
let overviewFolderOverride: Record<string, unknown> | null;
let operationsData: unknown;
let distillationOverviewData: unknown;
let distillationOverviewLoading: boolean;
let distillationOverviewError: { message: string } | null;
let distillationRefreshCalls: number;
let navigatedTo: string | null;
let settingsOverrides: Record<string, unknown>;

function wikiSpace(slug: string, displayName: string) {
  return {
    id: `space-${slug}`,
    companyId: COMPANY_ID,
    wikiId: "default",
    slug,
    displayName,
    spaceType: "managed",
    folderMode: "managed_subfolder",
    rootFolderKey: "wiki-root",
    pathPrefix: slug === "default" ? null : `spaces/${slug}`,
    configuredRootPath: null,
    accessScope: "shared",
    ownerUserId: null,
    ownerAgentId: null,
    teamKey: null,
    settings: {},
    status: "active",
    createdAt: null,
    updatedAt: null,
  };
}

const defaultSpace = wikiSpace("default", "default");
const engineeringSpace = wikiSpace("engineering", "Engineering");

function makeIngestionProfile() {
  return {
    wikiId: "default",
    space: {
      id: defaultSpace.id,
      slug: defaultSpace.slug,
      displayName: defaultSpace.displayName,
      accessScope: defaultSpace.accessScope,
      status: defaultSpace.status,
    },
    profile: {
      version: 1,
      enabled: false,
      sourceScopes: [{ kind: "active_projects", limit: 4 }],
      sourceKinds: {
        issues: true,
        comments: false,
        documents: true,
        attachments: "off",
        workProducts: "off",
      },
      cursor: {
        maxWindowCharacters: 16000,
        maxCharactersPerSource: 8000,
        minSourceAgeMinutes: 30,
        maxWindowsPerRun: 4,
        staleAfterHours: 12,
      },
      backfill: { requireManualQueue: true },
    },
    effectiveState: "disabled",
    policyBlocks: [],
    historicalPageCount: 0,
    overlapCount: 0,
  };
}

function dataResult<T>(data: T) {
  return { data, loading: false, error: null, refresh: () => undefined };
}

function settingsData() {
  const routineDeclarations: Array<[string, string]> = [
    ["cursor-window-processing", "Process LLM Wiki updates"],
    ["nightly-wiki-lint", "Run LLM Wiki lint"],
    ["index-refresh", "Refresh LLM Wiki index"],
  ];
  const routines = routineDeclarations.map(([key, title]) => ({
    status: "resolved",
    routineId: `routine-${key}`,
    pluginKey: "paperclipai.plugin-llm-wiki",
    resourceKind: "routine",
    resourceKey: key,
    routine: {
      id: `routine-${key}`,
      title,
      status: "active",
      assigneeAgentId: "agent-1",
      projectId: "project-1",
    },
    details: { status: "active", assigneeAgentId: "agent-1" },
  }));

  return {
    folder: FOLDER,
    managedAgent: {
      status: "resolved",
      source: "managed",
      agentId: "agent-1",
      resourceKey: "paperclipai.plugin-llm-wiki:agent:wiki-maintainer",
      details: { name: "Wiki Maintainer", status: "idle", adapterType: "claude_local", icon: "book-open" },
    },
    managedProject: {
      status: "resolved",
      source: "managed",
      projectId: "project-1",
      resourceKey: "paperclipai.plugin-llm-wiki:project:llm-wiki",
      details: { name: "LLM Wiki", status: "active" },
    },
    managedSkills: [{ status: "resolved", skillId: "skill-1", pluginKey: "paperclipai.plugin-llm-wiki", resourceKind: "skill", resourceKey: "wiki-maintainer", details: { name: "LLM Wiki Maintainer" } }],
    managedRoutines: routines,
    eventIngestion: {
      enabled: false,
      sources: { issues: false, comments: false, documents: false },
      wikiId: "default",
      maxCharacters: 12000,
    },
    agentOptions: [
      { id: "agent-1", name: "Wiki Maintainer", status: "idle", adapterType: "claude_local", icon: "book-open" },
      { id: "agent-2", name: "Research Maintainer", status: "active", adapterType: "claude_local", icon: "book-open" },
    ],
    projectOptions: [
      { id: "project-1", name: "LLM Wiki", status: "active" },
      { id: "project-2", name: "Research Project", status: "active" },
    ],
    capabilities: [],
  };
}

function folderStatusFor(spaceSlug: string) {
  return {
    ...wikiSpace(spaceSlug, spaceSlug === "default" ? "default" : "Engineering"),
    relativeRoot: spaceSlug === "default" ? "" : `spaces/${spaceSlug}/`,
    folder: FOLDER,
  };
}

function callByKey(key: string) {
  return actionCalls.filter((call) => call.key === key);
}

function renderWiki(locale: "en" | "pt-BR") {
  act(() => {
    root.render(createElement(WikiPage, {
      context: { companyId: COMPANY_ID, companyPrefix: "PAP", locale },
    } as never));
  });
}

function findButton(label: string, scope: ParentNode = container): HTMLButtonElement {
  const button = Array.from(scope.querySelectorAll("button")).find((candidate) => candidate.textContent?.trim() === label);
  expect(button, `button ${JSON.stringify(label)} should be present`).toBeDefined();
  return button as HTMLButtonElement;
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (!setter) throw new Error("Input value setter is unavailable in this test environment.");
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  pathname = "/PAP/wiki/settings/spaces/default";
  actionCalls = [];
  toastCalls = [];
  actionErrors = {};
  actionResults = {};
  ingestionProfile = null;
  overviewFolderOverride = null;
  operationsData = { operations: [] };
  distillationOverviewData = {
    cursors: [],
    runs: [],
    workItems: [],
    pageBindings: [],
    reviewWorkItems: [],
    counts: { cursors: 0, runningRuns: 0, failedRuns24h: 0, reviewRequired: 0 },
  };
  distillationOverviewLoading = false;
  distillationOverviewError = null;
  distillationRefreshCalls = 0;
  navigatedTo = null;
  settingsOverrides = {};

  (globalThis as BridgeGlobal).__paperclipPluginBridge__ = {
    sdkUi: {
      AssigneePicker: (props: {
        value: string;
        placeholder?: string;
        onChange: (value: string, selection: { assigneeAgentId: string | null; assigneeUserId: string | null }) => void;
      }) => createElement(
        "button",
        {
          type: "button",
          "data-testid": "assignee-picker",
          onClick: () => props.onChange("agent:agent-2", { assigneeAgentId: "agent-2", assigneeUserId: null }),
        },
        props.value === "agent:agent-2" ? "Research Maintainer" : (props.placeholder ?? "Select assignee"),
      ),
      ProjectPicker: (props: {
        value: string;
        placeholder?: string;
        onChange: (projectId: string) => void;
      }) => createElement(
        "button",
        {
          type: "button",
          "data-testid": "project-picker",
          onClick: () => props.onChange("project-2"),
        },
        props.value === "project-2" ? "Research Project" : (props.placeholder ?? "Project"),
      ),
      MarkdownEditor: (props: { value: string; onChange: (value: string) => void }) => createElement("textarea", {
        value: props.value,
        onChange: (event: { currentTarget: { value: string } }) => props.onChange(event.currentTarget.value),
      }),
      MarkdownBlock: (props: { content: string }) => createElement("div", null, props.content),
      ManagedRoutinesList: (props: {
        routines: Array<{
          key: string;
          title: string;
          status: string;
          resourceKey?: string | null;
          href?: string | null;
          projectId?: string | null;
          assigneeAgentId?: string | null;
          defaultDrift?: { changedFields: string[] } | null;
        }>;
        labels?: Record<string, string>;
        pluginDisplayName?: string | null;
        agents?: Array<{ id: string; name: string }>;
        projects?: Array<{ id: string; name: string }>;
        onRunNow?: (routine: { key: string; title: string; resourceKey?: string | null; assigneeAgentId?: string | null; projectId?: string | null }) => void;
        onToggleEnabled?: (routine: { key: string; title: string; resourceKey?: string | null }, enabled: boolean) => void;
        onReset?: (routine: { key: string; title: string; resourceKey?: string | null; assigneeAgentId?: string | null; projectId?: string | null; defaultDrift?: { changedFields: string[] } | null }) => void;
      }) => createElement(
        "div",
        { "data-testid": "managed-routines-list" },
        createElement("span", { "data-testid": "managed-routine-labels" }, [
          props.labels?.configure,
          props.labels?.managedBy,
          props.labels?.schedule,
          props.labels?.missingRefs,
          props.labels?.defaultsCanBeRepaired,
          props.labels?.reconcile,
          props.labels?.reset,
        ].join("|")),
        props.routines.map((routine) => {
          const agent = props.agents?.find((item) => item.id === routine.assigneeAgentId);
          const project = props.projects?.find((item) => item.id === routine.projectId);
          return createElement(
            "div",
            { key: routine.key },
            createElement("span", null, routine.title),
            createElement("span", null, routine.resourceKey ?? ""),
            createElement("button", { type: "button", onClick: () => props.onRunNow?.(routine) }, "Run now"),
            createElement("button", { type: "button", onClick: () => props.onToggleEnabled?.(routine, routine.status === "active") }, "Pause routine"),
            createElement("button", { type: "button", onClick: () => props.onReset?.(routine) }, "Reset routine"),
            createElement("span", null, `${project?.name ?? "No project"} · ${agent?.name ?? "No default agent"}`),
          );
        }),
      ),
      usePluginData: (key: string, params?: Record<string, unknown>) => {
        if (key === "overview") {
          return dataResult({
            status: "ok",
            checkedAt: FOLDER.checkedAt,
            wikiId: "default",
            folder: overviewFolderOverride ?? FOLDER,
            managedAgent: { status: "resolved", source: "managed", agentId: "agent-1", details: { name: "Wiki Maintainer" } },
            managedProject: { status: "resolved", source: "managed", projectId: "project-1", details: { name: "LLM Wiki", status: "active" } },
            managedSkills: [],
            operationCount: 0,
            eventIngestion: { enabled: false, sources: { issues: false, comments: false, documents: false }, wikiId: "default", maxCharacters: 12000 },
            capabilities: [],
            prompts: { query: "Original query prompt", lint: "Original lint prompt" },
          });
        }
        if (key === "settings") return dataResult({ ...settingsData(), ...settingsOverrides });
        if (key === "operations") return dataResult(operationsData);
        if (key === "spaces") return dataResult({ spaces: [defaultSpace, engineeringSpace] });
        if (key === "page-content") {
          const path = typeof params?.path === "string" ? params.path : "wiki/concepts/knowledge.md";
          return dataResult({
            wikiId: "default",
            path,
            contents: "# Wiki page\n\nOriginal wiki page content.",
            title: "Wiki page",
            pageType: "concept",
            backlinks: [],
            sourceRefs: [],
            updatedAt: null,
            hash: "page-hash",
          });
        }
        if (key === "space") {
          const spaceSlug = typeof params?.spaceSlug === "string" ? params.spaceSlug : "default";
          return dataResult(folderStatusFor(spaceSlug));
        }
        if (key === "paperclip-ingestion-profile") {
          return dataResult(ingestionProfile);
        }
        if (key === "distillation-overview") {
          return {
            data: distillationOverviewData,
            loading: distillationOverviewLoading,
            error: distillationOverviewError,
            refresh: () => { distillationRefreshCalls += 1; },
          };
        }
        return dataResult(null);
      },
      usePluginAction: (key: string) => async (params?: unknown) => {
        actionCalls.push({ key, params });
        if (actionErrors[key]) throw new Error(actionErrors[key]);
        if (key in actionResults) return actionResults[key];
        if (key === "create-space") {
          const input = params as SpaceInput;
          return {
            status: "created",
            space: {
              ...wikiSpace(input.slug, input.displayName),
              companyId: input.companyId,
              folderMode: input.folderMode,
              accessScope: input.accessScope,
            },
          };
        }
        return {};
      },
      usePluginStream: () => ({ connected: false, connecting: false, lastEvent: null }),
      usePluginToast: () => (toast: ToastCall) => { toastCalls.push(toast); },
      useHostLocation: () => ({ pathname, search: "", hash: "" }),
      useHostNavigation: () => ({
        resolveHref: (to: string) => `/PAP${to.startsWith("/") ? to : `/${to}`}`,
        navigate: (to: string) => { navigatedTo = to; },
        linkProps: (to: string) => ({ href: `/PAP${to.startsWith("/") ? to : `/${to}`}`, onClick: () => undefined }),
      }),
    },
  };
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete (globalThis as BridgeGlobal).__paperclipPluginBridge__;
  vi.restoreAllMocks();
});

describe("LLM Wiki spaces settings localization", () => {
  it.each([
    { locale: "pt-BR" as const, apply: "Configurar e inicializar", errorTitle: "Não foi possível configurar a raiz do Wiki" },
    { locale: "en" as const, apply: "Configure & bootstrap", errorTitle: "Could not configure wiki root" },
  ])("preserves the root folder path and original error in $locale", async (copy) => {
    overviewFolderOverride = {
      ...FOLDER,
      configured: false,
      path: "/tmp/old-wiki-root",
      realPath: null,
      healthy: false,
    };
    actionErrors["bootstrap-root"] = "Original filesystem diagnostic";
    renderWiki(copy.locale);

    const pathInput = container.querySelector<HTMLInputElement>("input[placeholder='/absolute/path/to/wiki-root']");
    expect(pathInput).not.toBeNull();
    act(() => setInputValue(pathInput!, "  /tmp/custom-wiki-root  "));
    await act(async () => findButton(copy.apply).click());

    expect(callByKey("bootstrap-root").at(-1)?.params).toEqual({ companyId: COMPANY_ID, path: "/tmp/custom-wiki-root" });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "error", title: copy.errorTitle, body: "Original filesystem diagnostic" });
    expect(container.textContent).toContain("Original filesystem diagnostic");
  });

  it.each([
    {
      locale: "pt-BR" as const,
      add: "Adicionar espaço…",
      modalTitle: "Criar um espaço compartilhado",
      displayName: "Nome de exibição",
      slugError: "O slug 'default' é reservado.",
      create: "Criar espaço",
      savedToast: "Espaço criado",
    },
    {
      locale: "en" as const,
      add: "Add space…",
      modalTitle: "Create a shared space",
      displayName: "Display name",
      slugError: "Slug 'default' is reserved.",
      create: "Create space",
      savedToast: "Space created",
    },
  ])("validates a slug and preserves create values in $locale", async (copy) => {
    renderWiki(copy.locale);
    act(() => findButton(copy.add).click());

    const dialog = container.querySelector<HTMLElement>("[role='dialog']");
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain(copy.modalTitle);
    expect(dialog?.textContent).toContain(copy.displayName);

    const displayInput = dialog?.querySelector<HTMLInputElement>("input:not([disabled])");
    expect(displayInput).not.toBeNull();
    act(() => setInputValue(displayInput!, "default"));
    expect(dialog?.textContent).toContain(copy.slugError);
    expect(findButton(copy.create, dialog!).disabled).toBe(true);

    act(() => setInputValue(displayInput!, "Product Research"));
    expect(dialog?.textContent).not.toContain(copy.slugError);
    await act(async () => {
      findButton(copy.create, dialog!).click();
    });

    expect(callByKey("create-space").map((call) => call.params)).toEqual([{
      companyId: COMPANY_ID,
      slug: "product-research",
      displayName: "Product Research",
      folderMode: "managed_subfolder",
      accessScope: "shared",
    }]);
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.savedToast });
    expect(navigatedTo).toBe("/wiki/settings/spaces/product-research");
  });

  it("preserves edited names and original update diagnostics in PT-BR and English", async () => {
    renderWiki("pt-BR");
    const displayInput = Array.from(container.querySelectorAll<HTMLInputElement>("input"))
      .find((input) => input.type === "text" && !input.disabled);
    expect(displayInput).toBeDefined();
    act(() => setInputValue(displayInput!, "  Product Research  "));
    actionErrors["update-space"] = "Original API update diagnostic";
    await act(async () => findButton("Salvar nome").click());

    expect(callByKey("update-space").at(-1)?.params).toEqual({
      companyId: COMPANY_ID,
      spaceSlug: "default",
      displayName: "Product Research",
    });
    expect(toastCalls.at(-1)).toMatchObject({
      tone: "error",
      title: "Falha ao atualizar",
      body: "Original API update diagnostic",
    });

    actionErrors = {};
    renderWiki("en");
    await act(async () => findButton("Save name").click());
    expect(callByKey("update-space")).toHaveLength(2);
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: "Display name updated" });
    expect(toastCalls.at(-1)?.body).toBeUndefined();
  });

  it("preserves space identity and localized confirmation when archiving in both languages", async () => {
    pathname = "/PAP/wiki/settings/spaces/engineering";
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWiki("pt-BR");
    await act(async () => findButton("Arquivar este espaço").click());

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Arquivar Engineering?"));
    expect(callByKey("archive-space").at(-1)?.params).toEqual({ companyId: COMPANY_ID, spaceSlug: "engineering" });
    expect(toastCalls.at(-1)).toMatchObject({
      tone: "success",
      title: "Espaço arquivado",
      body: "Engineering oculto na barra lateral.",
    });

    renderWiki("en");
    await act(async () => findButton("Archive this space").click());
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("Archive Engineering?"));
    expect(callByKey("archive-space")).toHaveLength(2);
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: "Space archived" });
    confirm.mockRestore();
  });

  it.each([
    { locale: "pt-BR" as const, toggle: "Ativar a ingestão do Paperclip", save: "Salvar perfil do Paperclip", toast: "Perfil de ingestão do Paperclip salvo" },
    { locale: "en" as const, toggle: "Enable Paperclip ingestion", save: "Save Paperclip profile", toast: "Paperclip ingestion profile saved" },
  ])("saves the unchanged Paperclip ingestion profile payload from translated controls in $locale", async (copy) => {
    const profileData = makeIngestionProfile();
    ingestionProfile = profileData;
    renderWiki(copy.locale);

    const toggleLabel = Array.from(container.querySelectorAll("label"))
      .find((label) => label.textContent?.includes(copy.toggle));
    const toggle = toggleLabel?.querySelector<HTMLInputElement>("input[type='checkbox']");
    expect(toggle).not.toBeNull();
    act(() => toggle!.click());
    await act(async () => findButton(copy.save).click());

    const saved = callByKey("update-paperclip-ingestion-profile").at(-1)?.params as {
      companyId: string;
      spaceSlug: string;
      profile: Record<string, unknown>;
    };
    expect(saved).toEqual({
      companyId: COMPANY_ID,
      spaceSlug: "default",
      profile: { ...(profileData as { profile: Record<string, unknown> }).profile, enabled: true },
    });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.toast });
  });

  it.each([
    {
      locale: "pt-BR" as const,
      agents: "Agentes gerenciados",
      skills: "Skills gerenciadas",
      projects: "Projetos gerenciados",
      routines: "Rotinas gerenciadas",
      pending: "O Wiki Maintainer está aguardando aprovação.",
      agentLabel: "Responsável pelo Wiki",
      skillMissing: "Responsável pelo LLM Wiki não está instalada na biblioteca de skills da empresa.",
      routineMissingRef: "A rotina “Executar verificação do LLM Wiki” não consegue resolver agent:wiki-maintainer.",
      noEnglishUi: ["Managed Agents", "Managed Skills", "Managed Projects", "Managed Routines", "Re-sync skills"],
    },
    {
      locale: "en" as const,
      agents: "Managed Agents",
      skills: "Managed Skills",
      projects: "Managed Projects",
      routines: "Managed Routines",
      pending: "The Wiki Maintainer is pending approval.",
      agentLabel: "Wiki Maintainer",
      skillMissing: "LLM Wiki Maintainer is not installed in the company skill library.",
      routineMissingRef: "Run LLM Wiki lint cannot resolve agent:wiki-maintainer.",
      noEnglishUi: [],
    },
  ])("localizes managed setup health states while preserving resource names and identifiers in $locale", (copy) => {
    pathname = "/PAP/wiki/settings";
    settingsOverrides = {
      managedAgent: {
        status: "resolved",
        source: "managed",
        agentId: "agent-1",
        resourceKey: "paperclipai.plugin-llm-wiki:agent:wiki-maintainer",
        defaultDrift: { entryFile: "AGENTS.md", changedFiles: ["AGENTS.md"] },
        details: { name: "Wiki Maintainer", status: "pending_approval", adapterType: "claude_local", icon: "book-open" },
      },
      managedProject: {
        status: "selected",
        source: "selected",
        projectId: "project-2",
        details: { name: "Research Project", status: "active" },
      },
      managedSkills: [{
        status: "missing",
        skillId: null,
        pluginKey: "paperclipai.plugin-llm-wiki",
        resourceKind: "skill",
        resourceKey: "wiki-maintainer",
        details: { name: "LLM Wiki Maintainer", key: "wiki-maintainer", description: null },
      }],
      managedRoutines: [{
        status: "missing_refs",
        routineId: "routine-nightly",
        pluginKey: "paperclipai.plugin-llm-wiki",
        resourceKind: "routine",
        resourceKey: "nightly-wiki-lint",
        routine: {
          id: "routine-nightly",
          title: "Run LLM Wiki lint",
          status: "active",
          assigneeAgentId: "agent-1",
          projectId: "project-1",
          managedByPlugin: { pluginDisplayName: "LLM Wiki", resourceKey: "nightly-wiki-lint" },
        },
        details: { cronExpression: "0 3 * * *" },
        missingRefs: [{ resourceKind: "agent", resourceKey: "wiki-maintainer" }],
      }],
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.agents);
    expect(container.textContent).toContain(copy.skills);
    expect(container.textContent).toContain(copy.projects);
    expect(container.textContent).toContain(copy.routines);
    expect(container.textContent).toContain(copy.pending);
    expect(container.textContent).toContain(copy.agentLabel);
    expect(container.textContent).toContain(copy.skillMissing);
    expect(container.textContent).toContain(copy.routineMissingRef);
    expect(container.textContent).toContain("Research Project");
    expect(container.textContent).toContain("Wiki Maintainer");
    expect(container.textContent).toContain("AGENTS.md");
    for (const originalUiCopy of copy.noEnglishUi) expect(container.textContent).not.toContain(originalUiCopy);
    expect(container.textContent).toContain("agent:wiki-maintainer");
    expect(container.textContent).toContain("claude local");
  });

  it("preserves operator names and external metadata when displaying managed resource titles", () => {
    pathname = "/PAP/wiki/settings";
    settingsOverrides = {
      managedAgent: {
        status: "resolved",
        source: "managed",
        agentId: "agent-1",
        resourceKey: "paperclipai.plugin-llm-wiki:agent:wiki-maintainer",
        details: { name: "My Wiki Steward", status: "idle", adapterType: "claude_local" },
      },
      managedProject: {
        status: "resolved",
        source: "managed",
        projectId: "project-1",
        resourceKey: "paperclipai.plugin-llm-wiki:project:llm-wiki",
        details: { name: "Team Research Hub", status: "active" },
      },
      managedSkills: [
        {
          status: "resolved",
          skillId: "skill-custom",
          pluginKey: "paperclipai.plugin-llm-wiki",
          resourceKind: "skill",
          resourceKey: "wiki-lint",
          details: { name: "Editorial Review", key: "wiki-lint", description: null },
        },
        {
          status: "resolved",
          skillId: "skill-external",
          pluginKey: "org.example.external",
          resourceKind: "skill",
          resourceKey: "wiki-query",
          details: { name: "Wiki Query", key: "wiki-query", description: null },
        },
      ],
      managedRoutines: [
        {
          status: "resolved",
          routineId: "routine-custom",
          pluginKey: "paperclipai.plugin-llm-wiki",
          resourceKind: "routine",
          resourceKey: "nightly-wiki-lint",
          routine: {
            id: "routine-custom",
            title: "Nightly editorial review",
            status: "active",
            assigneeAgentId: "agent-1",
            projectId: "project-1",
          },
        },
      ],
    };
    renderWiki("pt-BR");

    expect(container.textContent).toContain("My Wiki Steward");
    expect(container.textContent).toContain("Team Research Hub");
    expect(container.textContent).toContain("Editorial Review");
    expect(container.textContent).toContain("Wiki Query");
    expect(container.textContent).toContain("Nightly editorial review");
    expect(container.textContent).not.toContain("Verificação do Wiki");
  });

  it.each([
    {
      locale: "pt-BR" as const,
      agent: "Responsável pelo Wiki",
      skills: ["Responsável pelo LLM Wiki", "Ingestão do Wiki", "Consulta do Wiki", "Verificação do Wiki", "Destilação do Paperclip", "Atualização do índice"],
      routines: ["Processar atualizações do LLM Wiki", "Executar verificação do LLM Wiki", "Atualizar índice do LLM Wiki"],
    },
    {
      locale: "en" as const,
      agent: "Wiki Maintainer",
      skills: ["LLM Wiki Maintainer", "Wiki Ingest", "Wiki Query", "Wiki Lint", "Paperclip Distill", "Index Refresh"],
      routines: ["Process LLM Wiki updates", "Run LLM Wiki lint", "Refresh LLM Wiki index"],
    },
  ])("localizes exact default managed-resource names in $locale", (copy) => {
    pathname = "/PAP/wiki/settings";
    const managedSkillNames: Array<[string, string]> = [
      ["wiki-maintainer", "LLM Wiki Maintainer"],
      ["wiki-ingest", "Wiki Ingest"],
      ["wiki-query", "Wiki Query"],
      ["wiki-lint", "Wiki Lint"],
      ["paperclip-distill", "Paperclip Distill"],
      ["index-refresh", "Index Refresh"],
    ];
    settingsOverrides = {
      managedSkills: managedSkillNames.map(([resourceKey, name]) => ({
        status: "resolved",
        skillId: `skill-${resourceKey}`,
        pluginKey: "paperclipai.plugin-llm-wiki",
        resourceKind: "skill",
        resourceKey,
        details: { name },
      })),
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.agent);
    expect(container.textContent).toContain("LLM Wiki");
    for (const label of [...copy.skills, ...copy.routines]) expect(container.textContent).toContain(label);
  });

  it("preserves same-key routine titles from another plugin", () => {
    pathname = "/PAP/wiki/settings/routines";
    settingsOverrides = {
      managedRoutines: [{
        status: "resolved",
        routineId: "routine-external",
        pluginKey: "org.example.external",
        resourceKind: "routine",
        resourceKey: "cursor-window-processing",
        routine: {
          id: "routine-external",
          title: "Process LLM Wiki updates",
          status: "active",
          assigneeAgentId: "agent-1",
          projectId: "project-1",
        },
      }],
    };
    renderWiki("pt-BR");

    expect(container.textContent).toContain("Process LLM Wiki updates");
    expect(container.textContent).toContain("Processar atualizações do LLM Wiki");
  });

  it.each([
    { locale: "pt-BR" as const, label: "Skill gerenciada", detail: "Nenhuma skill gerenciada pelo plugin está instalada na biblioteca de skills da empresa." },
    { locale: "en" as const, label: "Managed skill", detail: "No plugin-managed skills are installed in the company skill library." },
  ])("localizes the empty managed-skills health state in $locale", (copy) => {
    pathname = "/PAP/wiki/settings";
    settingsOverrides = { managedSkills: [] };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.label);
    expect(container.textContent).toContain(copy.detail);
  });

  it.each([
    {
      locale: "pt-BR" as const,
      pickMaintainer: "Selecionar responsável",
      saveMaintainer: "Salvar responsável",
      repairAgent: "Reparar",
      resetAgent: "Redefinir para os padrões",
      pickProject: "Projeto",
      saveProject: "Salvar projeto",
      repairProject: "Reparar / reconciliar",
      resetProject: "↺ Redefinir para os padrões do plugin",
      resyncSkills: "Sincronizar skills novamente",
      fixRoutines: "Corrigir rotinas",
      agentToast: "Agente responsável selecionado",
      agentRepairToast: "Agente reconciliado",
      agentResetToast: "Agente redefinido para os padrões do plugin",
      projectToast: "Projeto selecionado",
      projectRepairToast: "Projeto reconciliado",
      projectResetToast: "Projeto redefinido para os padrões do plugin",
      skillsToast: "Skills sincronizadas",
      routinesToast: "Rotinas corrigidas",
    },
    {
      locale: "en" as const,
      pickMaintainer: "Select maintainer",
      saveMaintainer: "Save maintainer",
      repairAgent: "Repair",
      resetAgent: "Reset to defaults",
      pickProject: "Project",
      saveProject: "Save project",
      repairProject: "Repair / reconcile",
      resetProject: "↺ Reset to plugin defaults",
      resyncSkills: "Re-sync skills",
      fixRoutines: "Fix routines",
      agentToast: "Maintainer agent selected",
      agentRepairToast: "Agent reconciled",
      agentResetToast: "Agent reset to plugin defaults",
      projectToast: "Project selected",
      projectRepairToast: "Project reconciled",
      projectResetToast: "Project reset to plugin defaults",
      skillsToast: "Skills synced",
      routinesToast: "Routines fixed",
    },
  ])("keeps managed resource action payloads stable from localized setup controls in $locale", async (copy) => {
    pathname = "/PAP/wiki/settings";
    settingsOverrides = {
      managedAgent: {
        status: "resolved",
        source: "managed",
        agentId: "agent-1",
        resourceKey: "paperclipai.plugin-llm-wiki:agent:wiki-maintainer",
        defaultDrift: { entryFile: "AGENTS.md", changedFiles: ["AGENTS.md"] },
        details: { name: "Wiki Maintainer", status: "idle", adapterType: "claude_local", icon: "book-open" },
      },
      managedRoutines: [{
        status: "resolved",
        routineId: "routine-nightly",
        pluginKey: "paperclipai.plugin-llm-wiki",
        resourceKind: "routine",
        resourceKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
        routine: {
          id: "routine-nightly",
          title: "Run LLM Wiki lint",
          status: "active",
          assigneeAgentId: "wrong-agent-id",
          projectId: "project-1",
        },
        details: { cronExpression: "0 3 * * *" },
      }],
    };
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWiki(copy.locale);

    await act(async () => findButton(copy.pickMaintainer).click());
    await act(async () => findButton(copy.saveMaintainer).click());
    expect(callByKey("select-managed-agent").at(-1)?.params).toEqual({ companyId: COMPANY_ID, agentId: "agent-2" });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.agentToast });

    await act(async () => findButton(copy.repairAgent).click());
    expect(callByKey("reconcile-managed-agent").at(-1)?.params).toEqual({ companyId: COMPANY_ID });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.agentRepairToast });

    await act(async () => findButton(copy.resetAgent).click());
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("AGENTS.md"));
    expect(callByKey("reset-managed-agent").at(-1)?.params).toEqual({ companyId: COMPANY_ID });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.agentResetToast });

    await act(async () => findButton(copy.pickProject).click());
    await act(async () => findButton(copy.saveProject).click());
    expect(callByKey("select-managed-project").at(-1)?.params).toEqual({ companyId: COMPANY_ID, projectId: "project-2" });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.projectToast });

    await act(async () => findButton(copy.repairProject).click());
    expect(callByKey("reconcile-managed-project").at(-1)?.params).toEqual({ companyId: COMPANY_ID });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.projectRepairToast });

    await act(async () => findButton(copy.resetProject).click());
    expect(callByKey("reset-managed-project").at(-1)?.params).toEqual({ companyId: COMPANY_ID });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.projectResetToast });

    await act(async () => findButton(copy.resyncSkills).click());
    expect(callByKey("reset-managed-skills").at(-1)?.params).toEqual({ companyId: COMPANY_ID });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.skillsToast });

    await act(async () => findButton(copy.fixRoutines).click());
    expect(callByKey("reconcile-managed-routines").at(-1)?.params).toEqual({ companyId: COMPANY_ID });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.routinesToast });
    confirm.mockRestore();
  });

  it.each([
    {
      locale: "pt-BR" as const,
      confirmPrefix: 'Atualizar "Executar verificação do LLM Wiki" para os padrões atuais do plugin LLM Wiki?',
      runNowToast: "Execução da rotina iniciada",
      pauseToast: "Rotina pausada",
      resetToast: "Padrões da rotina atualizados",
      labels: "Configurar|Gerenciado por {name}|Agendamento|Referências ausentes:|É possível reparar os padrões das rotinas.|Reconciliar|Redefinir",
    },
    {
      locale: "en" as const,
      confirmPrefix: 'Update "Run LLM Wiki lint" to the current LLM Wiki plugin defaults?',
      runNowToast: "Routine run started",
      pauseToast: "Routine paused",
      resetToast: "Routine defaults updated",
      labels: "Configure|Managed by {name}|Schedule|Missing|Routine defaults can be repaired.|Reconcile|Reset",
    },
  ])("preserves managed routine action contracts and localizes routine controls in $locale", async (copy) => {
    pathname = "/PAP/wiki/settings/routines";
    settingsOverrides = {
      managedRoutines: [{
        status: "resolved",
        routineId: "routine-nightly",
        pluginKey: "paperclipai.plugin-llm-wiki",
        resourceKind: "routine",
        resourceKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
        defaultDrift: { changedFields: ["description"] },
        routine: {
          id: "routine-nightly",
          title: "Run LLM Wiki lint",
          status: "active",
          assigneeAgentId: "agent-1",
          projectId: "project-1",
          managedByPlugin: { pluginDisplayName: "LLM Wiki", resourceKey: "nightly-wiki-lint" },
        },
        details: { cronExpression: "0 3 * * *" },
      }],
    };
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWiki(copy.locale);

    expect(container.querySelector('[data-testid="managed-routine-labels"]')?.textContent).toBe(copy.labels);
    await act(async () => findButton("Run now").click());
    expect(callByKey("run-managed-routine").at(-1)?.params).toEqual({
      companyId: COMPANY_ID,
      routineKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
      assigneeAgentId: "agent-1",
      projectId: "project-1",
    });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.runNowToast });

    await act(async () => findButton("Pause routine").click());
    expect(callByKey("update-managed-routine-status").at(-1)?.params).toEqual({
      companyId: COMPANY_ID,
      routineKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
      status: "paused",
    });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.pauseToast });

    await act(async () => findButton("Reset routine").click());
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining(copy.confirmPrefix));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("description"));
    expect(callByKey("reset-managed-routine").at(-1)?.params).toEqual({
      companyId: COMPANY_ID,
      routineKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
      assigneeAgentId: "agent-1",
      projectId: "project-1",
    });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.resetToast });
    confirm.mockRestore();
  });

  it("reacts to a host locale change without reloading managed setup data", () => {
    pathname = "/PAP/wiki/settings";
    renderWiki("en");
    expect(container.textContent).toContain("Managed Agents");
    expect(container.textContent).toContain("Re-sync skills");

    renderWiki("pt-BR");
    expect(container.textContent).toContain("Agentes gerenciados");
    expect(container.textContent).toContain("Sincronizar skills novamente");
    expect(container.textContent).not.toContain("Managed Agents");

    pathname = "/PAP/wiki/settings/routines";
    renderWiki("en");
    expect(container.querySelector('[data-testid="managed-routine-labels"]')?.textContent).toContain("Configure|Managed by {name}|Schedule");
    renderWiki("pt-BR");
    expect(container.querySelector('[data-testid="managed-routine-labels"]')?.textContent).toContain("Configurar|Gerenciado por {name}|Agendamento");
  });

  it.each([
    {
      locale: "pt-BR" as const,
      panelTitle: "Destilação",
      badge: "Somente no espaço padrão",
      off: "A destilação está desativada",
      enable: "Ativar para projetos ativos",
      defaults: "Padrões sugeridos:",
      created: "O que é criado",
      path: "wiki/projects/<slug>/standup.md",
      missingEnglish: ["Distillation is off", "Enable for active projects", "What gets created", "Source bundles cached under"],
      toast: "Destilação ativada",
      toastBody: "2 projetos ativos adicionados ao conjunto de cursores de destilação.",
      noProjects: "Nenhum projeto ativo foi encontrado",
      noProjectsBody: "Crie ou retome um projeto e ative a destilação novamente.",
      enableFailed: "Falha ao ativar a destilação",
    },
    {
      locale: "en" as const,
      panelTitle: "Distillation",
      badge: "Default space only",
      off: "Distillation is off",
      enable: "Enable for active projects",
      defaults: "Suggested defaults:",
      created: "What gets created",
      path: "wiki/projects/<slug>/standup.md",
      missingEnglish: [],
      toast: "Distillation enabled",
      toastBody: "2 active projects added to the distillation cursor set.",
      noProjects: "No active projects found",
      noProjectsBody: "Create or resume a project, then enable distillation again.",
      enableFailed: "Enable distillation failed",
    },
  ])("localizes the unconfigured distillation state and keeps enable payloads in $locale", async (copy) => {
    pathname = "/PAP/wiki/settings/distillation";
    actionResults["enable-paperclip-distillation-active-projects"] = {
      selectedProjects: [{ name: "Project A" }, { name: "Project B" }],
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.panelTitle);
    expect(container.textContent).toContain(copy.badge);
    expect(container.textContent).toContain(copy.off);
    expect(container.textContent).toContain(copy.enable);
    expect(container.textContent).toContain(copy.defaults);
    expect(container.textContent).toContain(copy.created);
    expect(container.textContent).toContain(copy.path);
    expect(container.textContent).toContain("wiki/projects/<slug>/index.md");
    expect(container.textContent).toContain("raw/distill/");
    for (const originalUiCopy of copy.missingEnglish) expect(container.textContent).not.toContain(originalUiCopy);

    await act(async () => findButton(copy.enable).click());
    expect(callByKey("enable-paperclip-distillation-active-projects").at(-1)?.params).toEqual({
      companyId: COMPANY_ID,
      limit: 3,
    });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.toast, body: copy.toastBody });

    actionResults["enable-paperclip-distillation-active-projects"] = { selectedProjects: [] };
    await act(async () => findButton(copy.enable).click());
    expect(toastCalls.at(-1)).toMatchObject({ tone: "warn", title: copy.noProjects, body: copy.noProjectsBody });

    actionErrors["enable-paperclip-distillation-active-projects"] = "Original cursor API diagnostic";
    await act(async () => findButton(copy.enable).click());
    expect(toastCalls.at(-1)).toMatchObject({ tone: "error", title: copy.enableFailed, body: "Original cursor API diagnostic" });
  });

  it.each([
    {
      locale: "pt-BR" as const,
      active: "Ativa para 1 projeto · 1 cursor em processamento · espaço padrão",
      sourceFilters: "Filtros de origem",
      sourceKinds: "Tipos de fonte",
      cursorWindows: "Janelas do cursor",
      autoApply: "Política de aplicação automática",
      backfill: "Reprocessamento retroativo",
      warning: "Managed policy prevents automatic patch application.",
      confidence: "0,8",
      externalName: "Project Alpha / FY26",
      noEnglishUi: ["Issue scope", "Source kinds", "Cursor windows", "Auto-apply policy", "Queue backfill", "Review queue"],
    },
    {
      locale: "en" as const,
      active: "Active for 1 project · 1 cursor catching up · default space",
      sourceFilters: "Source filters",
      sourceKinds: "Source kinds",
      cursorWindows: "Cursor windows",
      autoApply: "Auto-apply policy",
      backfill: "Backfill",
      warning: "Managed policy prevents automatic patch application.",
      confidence: "0.8",
      externalName: "Project Alpha / FY26",
      noEnglishUi: [],
    },
  ])("localizes configured controls, restrictions, and values in $locale", (copy) => {
    pathname = "/PAP/wiki/settings/distillation";
    settingsOverrides = {
      distillationPolicy: { autoApplyRestriction: "Managed policy prevents automatic patch application." },
    };
    distillationOverviewData = {
      cursors: [{
        id: "cursor-1",
        sourceScope: "project",
        scopeKey: "project:project-1",
        projectId: "project-1",
        projectName: copy.externalName,
        projectColor: null,
        rootIssueId: null,
        rootIssueIdentifier: null,
        rootIssueTitle: null,
        lastProcessedAt: null,
        lastObservedAt: null,
        pendingEventCount: 3,
        lastSourceHash: null,
        lastSuccessfulRunId: null,
      }],
      runs: [],
      workItems: [],
      pageBindings: [],
      reviewWorkItems: [],
      counts: { cursors: 1, runningRuns: 2, failedRuns24h: 1, reviewRequired: 4 },
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.active);
    expect(container.textContent).toContain(copy.sourceFilters);
    expect(container.textContent).toContain(copy.sourceKinds);
    expect(container.textContent).toContain(copy.cursorWindows);
    expect(container.textContent).toContain(copy.autoApply);
    expect(container.textContent).toContain(copy.backfill);
    expect(container.textContent).toContain(copy.warning);
    expect(container.textContent).toContain(copy.externalName);
    const textInputValues = Array.from(container.querySelectorAll<HTMLInputElement>("input")).filter((input) => input.type === "text").map((input) => input.value);
    expect(textInputValues).toContain("48000");
    expect(textInputValues).toContain("6");
    expect(container.textContent).toContain(copy.confidence);
    expect(container.textContent).toContain("Claude/Codex/Gemini");
    for (const originalUiCopy of copy.noEnglishUi) expect(container.textContent).not.toContain(originalUiCopy);

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>("input[type='checkbox']"));
    expect(inputs.length).toBe(7);
    expect(inputs[0].checked).toBe(true);
    expect(inputs[3].checked).toBe(true);
    expect(inputs[3].disabled).toBe(true);
    expect(Array.from(container.querySelectorAll<HTMLInputElement>("input[type='radio']")).map((input) => input.value)).toEqual(["never", "status", "all"]);
    expect(Array.from(container.querySelectorAll<HTMLSelectElement>("select")).map((select) => select.value)).toEqual(["15", "72"]);
  });

  it.each([
    {
      locale: "pt-BR" as const,
      distill: "Destilar agora",
      nowErrorTitle: "Falha ao iniciar a destilação",
      nowSuccessTitle: "Destilação enfileirada",
      nowSuccessBody: "O Wiki Maintainer vai verificar os projetos alterados da empresa e gravar no espaço padrão do Wiki.",
      backfill: "Enfileirar reprocessamento",
      backfillTitle: "Reprocessamento enfileirado",
      backfillFailedTitle: "Falha ao enfileirar o reprocessamento",
    },
    {
      locale: "en" as const,
      distill: "Distill now",
      nowErrorTitle: "Distill now failed",
      nowSuccessTitle: "Distill now queued",
      nowSuccessBody: "Wiki Maintainer will scan changed projects in the company and write into the default wiki space.",
      backfill: "Queue backfill",
      backfillTitle: "Backfill queued",
      backfillFailedTitle: "Backfill failed",
    },
  ])("preserves distillation action payloads and raw failure details in $locale", async (copy) => {
    pathname = "/PAP/wiki/settings/distillation";
    distillationOverviewData = {
      cursors: [{
        id: "cursor-1",
        sourceScope: "project",
        scopeKey: "project:project-1",
        projectId: "project-1",
        projectName: "Research / Q4",
        projectColor: null,
        rootIssueId: null,
        rootIssueIdentifier: null,
        rootIssueTitle: null,
        lastProcessedAt: null,
        lastObservedAt: null,
        pendingEventCount: 3,
        lastSourceHash: null,
        lastSuccessfulRunId: null,
      }],
      runs: [],
      workItems: [],
      pageBindings: [],
      reviewWorkItems: [],
      counts: { cursors: 1, runningRuns: 0, failedRuns24h: 0, reviewRequired: 0 },
    };
    renderWiki(copy.locale);

    actionErrors["distill-paperclip-now"] = "External API diagnostic: 409 conflict";
    await act(async () => findButton(copy.distill).click());
    expect(callByKey("distill-paperclip-now").at(-1)?.params).toMatchObject({ companyId: COMPANY_ID });
    expect((callByKey("distill-paperclip-now").at(-1)?.params as { idempotencyKey: string }).idempotencyKey).toMatch(/^manual:company:\d+$/);
    expect(toastCalls.at(-1)).toMatchObject({ tone: "error", title: copy.nowErrorTitle, body: "External API diagnostic: 409 conflict" });

    delete actionErrors["distill-paperclip-now"];
    await act(async () => findButton(copy.distill).click());
    expect(toastCalls.at(-1)).toMatchObject({
      tone: "success",
      title: copy.nowSuccessTitle,
      body: copy.nowSuccessBody,
    });

    await act(async () => findButton(copy.backfill).click());
    expect(callByKey("backfill-paperclip-distillation").at(-1)?.params).toEqual({
      companyId: COMPANY_ID,
      projectId: "project-1",
      rootIssueId: undefined,
    });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.backfillTitle, body: "Research / Q4" });

    actionErrors["backfill-paperclip-distillation"] = "Original backfill API diagnostic";
    await act(async () => findButton(copy.backfill).click());
    expect(toastCalls.at(-1)).toMatchObject({ tone: "error", title: copy.backfillFailedTitle, body: "Original backfill API diagnostic" });
  });

  it.each([
    { locale: "pt-BR" as const, title: "O reprocessamento exige o escopo de um projeto ou de uma tarefa raiz" },
    { locale: "en" as const, title: "Backfill needs a project or root issue scope" },
  ])("shows the localized backfill scope validation in $locale", async (copy) => {
    pathname = "/PAP/wiki/settings/distillation";
    distillationOverviewData = {
      cursors: [{
        id: "cursor-1",
        sourceScope: "company",
        scopeKey: "company:company-1",
        projectId: null,
        projectName: null,
        projectColor: null,
        rootIssueId: null,
        rootIssueIdentifier: null,
        rootIssueTitle: null,
        lastProcessedAt: null,
        lastObservedAt: null,
        pendingEventCount: 0,
        lastSourceHash: null,
        lastSuccessfulRunId: null,
      }],
      runs: [],
      workItems: [],
      pageBindings: [],
      reviewWorkItems: [],
      counts: { cursors: 1, runningRuns: 0, failedRuns24h: 0, reviewRequired: 0 },
    };
    renderWiki(copy.locale);

    await act(async () => findButton(copy.locale === "pt-BR" ? "Enfileirar reprocessamento" : "Queue backfill").click());
    expect(toastCalls.at(-1)).toMatchObject({ tone: "warn", title: copy.title });
    expect(callByKey("backfill-paperclip-distillation")).toHaveLength(0);
  });

  it.each([
    {
      locale: "pt-BR" as const,
      loading: "Carregando visão geral da destilação…",
      failed: "Não foi possível carregar a visão geral da destilação.",
      refresh: "Atualizar",
    },
    {
      locale: "en" as const,
      loading: "Loading distillation overview…",
      failed: "Could not load the distillation overview.",
      refresh: "Refresh",
    },
  ])("localizes distillation loading and retry states in $locale while preserving the API diagnostic", async (copy) => {
    pathname = "/PAP/wiki/settings/distillation";
    distillationOverviewData = null;
    distillationOverviewLoading = true;
    renderWiki(copy.locale);
    expect(container.textContent).toContain(copy.loading);

    distillationOverviewLoading = false;
    distillationOverviewError = { message: "Original distillation overview API diagnostic" };
    renderWiki(copy.locale);
    expect(container.textContent).toContain(copy.failed);
    expect(container.textContent).toContain("Original distillation overview API diagnostic");
    if (copy.locale === "pt-BR") expect(container.textContent).not.toContain("Could not load the distillation overview.");

    await act(async () => findButton(copy.refresh).click());
    expect(distillationRefreshCalls).toBe(1);
  });

  it.each([
    {
      locale: "pt-BR" as const,
      title: "Verificação",
      description: "Execute verificações estruturais para páginas órfãs, links de retorno ausentes e proveniência desatualizada.",
      run: "▶ Executar verificação agora",
      findings: "OCORRÊNCIAS",
      recent: "Execuções recentes de verificação",
      severity: "crítico",
      done: "concluída",
      queued: "Verificação enfileirada",
      queuedBody: "A verificação é executada como uma tarefa do Wiki Maintainer. Os resultados aparecerão aqui quando a execução terminar.",
      couldNotRun: "Não foi possível executar a verificação",
      noEnglishUi: ["Run structural checks", "Run lint now", "Recent lint runs", "No completed lint runs yet", "Critical", "Orphans", "wiki task"],
    },
    {
      locale: "en" as const,
      title: "Lint",
      description: "Run structural checks for orphan pages, missing backlinks, and stale provenance.",
      run: "▶ Run lint now",
      findings: "FINDINGS",
      recent: "Recent lint runs",
      severity: "critical",
      done: "done",
      queued: "Lint queued",
      queuedBody: "Lint runs as a Wiki Maintainer task. Findings will appear here once the run completes.",
      couldNotRun: "Could not run lint",
      noEnglishUi: [],
    },
  ])("localizes lint controls and summaries in $locale while preserving operation content and request values", async (copy) => {
    pathname = "/PAP/wiki/settings/lint";
    operationsData = {
      operations: [{
        id: "lint-operation-123456",
        operationType: "lint",
        status: "done",
        hiddenIssueId: null,
        hiddenIssueIdentifier: null,
        hiddenIssueTitle: "Original lint operation title",
        hiddenIssueStatus: "done",
        projectId: "project-1",
        runIds: [],
        costCents: 0,
        warnings: [{ severity: "critical", message: "Original linter diagnostic", path: "wiki/concepts/knowledge.md" }],
        affectedPages: [],
        createdAt: "2026-10-31T12:00:00.000Z",
        updatedAt: "2026-10-31T12:00:00.000Z",
      }],
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.title);
    expect(container.textContent).toContain(copy.description);
    expect(container.textContent).toContain(copy.run);
    expect(container.textContent).toContain(copy.findings);
    expect(container.textContent).toContain(copy.recent);
    expect(container.textContent).toContain(copy.severity);
    expect(container.textContent).toContain(copy.done);
    expect(container.textContent).toContain("Original linter diagnostic");
    expect(container.textContent).toContain("wiki/concepts/knowledge.md");
    expect(container.textContent).toContain("Original lint operation title");
    for (const originalUiCopy of copy.noEnglishUi) expect(container.textContent).not.toContain(originalUiCopy);

    await act(async () => findButton(copy.run).click());
    expect(callByKey("create-operation").at(-1)?.params).toEqual({
      companyId: COMPANY_ID,
      spaceSlug: "default",
      operationType: "lint",
      title: "Run LLM Wiki lint · default",
      prompt: "Original lint prompt",
    });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.queued, body: copy.queuedBody });

    actionErrors["create-operation"] = "Original lint API diagnostic";
    await act(async () => findButton(copy.run).click());
    expect(toastCalls.at(-1)).toMatchObject({ tone: "error", title: copy.couldNotRun, body: "Original lint API diagnostic" });
  });

  it.each([
    {
      locale: "pt-BR" as const,
      title: "Ingestão de eventos do Paperclip",
      sectionDescription: "Captura de eventos do Paperclip no espaço padrão (tarefas, comentários e documentos).",
      enabled: "Ativar a ingestão de eventos para esta empresa",
      issue: "Tarefas",
      comment: "Comentários",
      document: "Documentos",
      maxCharacters: "Máximo de caracteres por evento capturado",
      save: "Salvar controles",
      revert: "Reverter",
      saved: "Configurações de ingestão de eventos salvas",
      failed: "Não foi possível salvar as configurações de eventos",
      phase: "Fase 5",
      policyWarning: "A ingestão registra a atividade selecionada de tarefas, comentários e documentos do Paperclip no espaço padrão do Wiki.",
      noEnglishUi: ["Paperclip event ingestion", "Enable event ingestion for this company", "Issues", "Comments", "Documents", "Max characters per captured event", "Save controls"],
    },
    {
      locale: "en" as const,
      title: "Paperclip event ingestion",
      sectionDescription: "Paperclip event capture into the default space (issues, comments, documents).",
      enabled: "Enable event ingestion for this company",
      issue: "Issues",
      comment: "Comments",
      document: "Documents",
      maxCharacters: "Max characters per captured event",
      save: "Save controls",
      revert: "Revert",
      saved: "Event ingestion controls saved",
      failed: "Could not save event controls",
      phase: "Phase 5",
      policyWarning: "Event ingestion records selected Paperclip issue, comment, and document activity for the default wiki space.",
      noEnglishUi: [],
    },
  ])("localizes event ingestion controls and preserves the settings payload in $locale", async (copy) => {
    pathname = "/PAP/wiki/settings/events";
    const savedPolicy = {
      enabled: true,
      sources: { issues: true, comments: false, documents: false },
      wikiId: "default",
      maxCharacters: 12000,
    };
    actionResults["update-event-ingestion-settings"] = savedPolicy;
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.title);
    expect(container.textContent).toContain(copy.sectionDescription);
    expect(container.textContent).toContain(copy.enabled);
    expect(container.textContent).toContain(copy.issue);
    expect(container.textContent).toContain(copy.comment);
    expect(container.textContent).toContain(copy.document);
    expect(container.textContent).toContain(copy.maxCharacters);
    expect(container.textContent).toContain(copy.policyWarning);
    expect(container.textContent).toContain(copy.save);
    expect(container.textContent).toContain(copy.revert);
    expect(container.textContent).toContain(copy.phase);
    for (const originalUiCopy of copy.noEnglishUi) expect(container.textContent).not.toContain(originalUiCopy);

    const enableLabel = Array.from(container.querySelectorAll("label"))
      .find((label) => label.textContent?.includes(copy.enabled));
    const enableCheckbox = enableLabel?.querySelector<HTMLInputElement>("input[type='checkbox']");
    const issueLabel = Array.from(container.querySelectorAll("label"))
      .find((label) => label.textContent?.includes(copy.issue));
    const issueCheckbox = issueLabel?.querySelector<HTMLInputElement>("input[type='checkbox']");
    expect(enableCheckbox).not.toBeNull();
    expect(issueCheckbox).not.toBeNull();
    act(() => enableCheckbox!.click());
    act(() => issueCheckbox!.click());
    await act(async () => findButton(copy.save).click());

    expect(callByKey("update-event-ingestion-settings").at(-1)?.params).toEqual({ companyId: COMPANY_ID, ...savedPolicy });
    expect(toastCalls.at(-1)).toMatchObject({ tone: "success", title: copy.saved });

    actionErrors["update-event-ingestion-settings"] = "Original event settings API diagnostic";
    await act(async () => findButton(copy.save).click());
    expect(toastCalls.at(-1)).toMatchObject({ tone: "error", title: copy.failed, body: "Original event settings API diagnostic" });
  });

  it.each([
    {
      locale: "pt-BR" as const,
      status: "Status: em andamento",
      englishStatus: "Status: in progress",
    },
    {
      locale: "en" as const,
      status: "Status: in progress",
      englishStatus: null,
    },
  ])("localizes managed project status labels in $locale without changing the status value", (copy) => {
    pathname = "/PAP/wiki/settings";
    settingsOverrides = {
      managedProject: {
        status: "resolved",
        source: "managed",
        projectId: "project-1",
        details: { name: "LLM Wiki", status: "in_progress" },
      },
      projectOptions: [{ id: "project-1", name: "LLM Wiki", status: "in_progress" }],
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.status);
    if (copy.englishStatus) expect(container.textContent).not.toContain(copy.englishStatus);
  });

  it.each([
    {
      locale: "pt-BR" as const,
      restriction: "Implantações autenticadas com exposição pública sempre exigem revisão manual antes de gravar no Wiki.",
      sourceRestriction: "Authenticated/public deployments always require manual review before wiki writes.",
      noEnglish: "Authenticated/public deployments always require manual review before wiki writes.",
    },
    {
      locale: "en" as const,
      restriction: "Authenticated/public deployments always require manual review before wiki writes.",
      sourceRestriction: "Authenticated/public deployments always require manual review before wiki writes.",
      noEnglish: null,
    },
    {
      locale: "pt-BR" as const,
      restriction: "Custom deployment policy requires manual review before wiki writes.",
      sourceRestriction: "Custom deployment policy requires manual review before wiki writes.",
      noEnglish: "Authenticated/public deployments always require manual review before wiki writes.",
    },
  ])("localizes only the owned public-deployment auto-apply restriction in $locale", (copy) => {
    pathname = "/PAP/wiki/settings/distillation";
    settingsOverrides = {
      distillationPolicy: {
        autoApplyAllowed: false,
        autoApplyRestriction: copy.sourceRestriction,
        deploymentMode: "authenticated",
        deploymentExposure: "public",
      },
    };
    distillationOverviewData = {
      cursors: [{
        id: "cursor-1",
        sourceScope: "project",
        scopeKey: "project:project-1",
        projectId: "project-1",
        projectName: "Research / Q4",
        projectColor: null,
        rootIssueId: null,
        rootIssueIdentifier: null,
        rootIssueTitle: null,
        lastProcessedAt: null,
        lastObservedAt: null,
        pendingEventCount: 0,
        lastSourceHash: null,
        lastSuccessfulRunId: null,
      }],
      runs: [],
      workItems: [],
      pageBindings: [],
      reviewWorkItems: [],
      counts: { cursors: 1, runningRuns: 0, failedRuns24h: 0, reviewRequired: 0 },
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.restriction);
    if (copy.noEnglish) expect(container.textContent).not.toContain(copy.noEnglish);
  });

  it.each([
    { locale: "pt-BR" as const, description: "Manutenção agendada do Wiki.", noEnglish: "Scheduled wiki maintenance." },
    { locale: "en" as const, description: "Scheduled wiki maintenance.", noEnglish: null },
  ])("localizes routine section description in $locale", (copy) => {
    pathname = "/PAP/wiki/settings/routines";
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.description);
    if (copy.noEnglish) expect(container.textContent).not.toContain(copy.noEnglish);
  });

  it.each([
    {
      locale: "pt-BR" as const,
      title: "Executar verificação do LLM Wiki",
      noEnglish: ["Run LLM Wiki lint", "Process LLM Wiki updates", "Refresh LLM Wiki index"],
    },
    {
      locale: "en" as const,
      title: "Run LLM Wiki lint",
      noEnglish: [],
    },
  ])("localizes synthetic routine fallback names in $locale while retaining routine identifiers", (copy) => {
    pathname = "/PAP/wiki/settings/routines";
    settingsOverrides = {
      managedRoutines: [{
        status: "missing",
        routineId: null,
        pluginKey: "paperclipai.plugin-llm-wiki",
        resourceKind: "routine",
        resourceKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
        routine: null,
        details: { cronExpression: "0 3 * * *" },
      }],
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.title);
    expect(container.textContent).toContain("nightly-wiki-lint");
    for (const originalUiCopy of copy.noEnglish) expect(container.textContent).not.toContain(originalUiCopy);
  });

  it.each([
    { locale: "pt-BR" as const, label: "Projeto atual", noEnglish: "Current project" },
    { locale: "en" as const, label: "Current project", noEnglish: null },
  ])("localizes the synthetic current-project fallback in $locale", (copy) => {
    pathname = "/PAP/wiki/settings/routines";
    settingsOverrides = {
      managedProject: { status: "resolved", source: "managed", projectId: "project-1", details: null },
      projectOptions: [],
    };
    renderWiki(copy.locale);

    expect(container.textContent).toContain(copy.label);
    if (copy.noEnglish) expect(container.textContent).not.toContain(copy.noEnglish);
  });

  it.each([
    { locale: "pt-BR" as const, edit: "Editar página", on: "Salvamento automático ativado", dirty: "Alterações não salvas", saving: "Salvando…", saved: "Salvo", noEnglish: ["Autosave on", "Unsaved changes", "Saving…", "Saved", "Autosave failed"] },
    { locale: "en" as const, edit: "Edit page", on: "Autosave on", dirty: "Unsaved changes", saving: "Saving…", saved: "Saved", noEnglish: [] },
  ])("localizes page autosave status in $locale while leaving page text intact until edited", async (copy) => {
    pathname = "/PAP/wiki/page/wiki/concepts/knowledge.md";
    renderWiki(copy.locale);

    expect(container.textContent).toContain("Original wiki page content.");
    act(() => findButton(copy.edit).click());
    expect(container.textContent).toContain(copy.on);
    const editor = container.querySelector<HTMLTextAreaElement>("textarea");
    expect(editor?.value).toContain("Original wiki page content.");

    vi.useFakeTimers();
    let resolveWrite: (value: { hash: string }) => void = () => undefined;
    actionResults["write-page"] = new Promise<{ hash: string }>((resolve) => { resolveWrite = resolve; });
    act(() => setInputValue(editor!, "# Wiki page\n\nChanged only in the editor."));
    expect(container.textContent).toContain(copy.dirty);
    expect(callByKey("write-page")).toHaveLength(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(container.textContent).toContain(copy.saving);
    expect(callByKey("write-page")).toHaveLength(1);
    await act(async () => { resolveWrite({ hash: "saved-page-hash" }); });
    expect(container.textContent).toContain(copy.saved);

    delete actionResults["write-page"];
    actionErrors["write-page"] = "Original write-page diagnostic";
    act(() => setInputValue(editor!, "# Wiki page\n\nA failed save keeps this diagnostic."));
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(container.textContent).toContain("Original write-page diagnostic");
    expect(callByKey("write-page")).toHaveLength(2);
    vi.useRealTimers();
    for (const originalUiCopy of copy.noEnglish) expect(container.textContent).not.toContain(originalUiCopy);
  });
});
