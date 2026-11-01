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
let ingestionProfile: Record<string, unknown> | null;
let overviewFolderOverride: Record<string, unknown> | null;
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
  const routines = [
    "cursor-window-processing",
    "nightly-wiki-lint",
    "index-refresh",
  ].map((key) => ({
    status: "resolved",
    routineId: `routine-${key}`,
    resourceKey: `plugin:paperclipai.plugin-llm-wiki:${key}`,
    routine: {
      id: `routine-${key}`,
      title: key,
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
      details: { name: "Wiki Maintainer", status: "idle", adapterType: "claude_local", icon: "book-open" },
    },
    managedProject: {
      status: "resolved",
      source: "managed",
      projectId: "project-1",
      details: { name: "LLM Wiki", status: "active" },
    },
    managedSkills: [{ status: "resolved", skillId: "skill-1", resourceKey: "wiki-maintainer", details: { name: "LLM Wiki Maintainer" } }],
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

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
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
  ingestionProfile = null;
  overviewFolderOverride = null;
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
        if (key === "spaces") return dataResult({ spaces: [defaultSpace, engineeringSpace] });
        if (key === "space") {
          const spaceSlug = typeof params?.spaceSlug === "string" ? params.spaceSlug : "default";
          return dataResult(folderStatusFor(spaceSlug));
        }
        if (key === "paperclip-ingestion-profile") {
          return dataResult(ingestionProfile);
        }
        return dataResult(null);
      },
      usePluginAction: (key: string) => async (params?: unknown) => {
        actionCalls.push({ key, params });
        if (actionErrors[key]) throw new Error(actionErrors[key]);
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
      skillMissing: "LLM Wiki Maintainer não está instalada na biblioteca de skills da empresa.",
      routineMissingRef: "A rotina “Run LLM Wiki lint” não consegue resolver agent:wiki-maintainer.",
      noEnglishUi: ["Managed Agents", "Managed Skills", "Managed Projects", "Managed Routines", "Re-sync skills"],
    },
    {
      locale: "en" as const,
      agents: "Managed Agents",
      skills: "Managed Skills",
      projects: "Managed Projects",
      routines: "Managed Routines",
      pending: "The Wiki Maintainer is pending approval.",
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
        resourceKey: "wiki-maintainer",
        details: { name: "LLM Wiki Maintainer", key: "wiki-maintainer", description: null },
      }],
      managedRoutines: [{
        status: "missing_refs",
        routineId: "routine-nightly",
        resourceKey: "plugin:paperclipai.plugin-llm-wiki:nightly-wiki-lint",
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
    expect(container.textContent).toContain(copy.skillMissing);
    expect(container.textContent).toContain(copy.routineMissingRef);
    expect(container.textContent).toContain("Research Project");
    expect(container.textContent).toContain("Wiki Maintainer");
    expect(container.textContent).toContain("LLM Wiki Maintainer");
    expect(container.textContent).toContain("AGENTS.md");
    expect(container.textContent).toContain("Run LLM Wiki lint");
    for (const originalUiCopy of copy.noEnglishUi) expect(container.textContent).not.toContain(originalUiCopy);
    expect(container.textContent).toContain("agent:wiki-maintainer");
    expect(container.textContent).toContain("claude local");
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
        defaultDrift: { entryFile: "AGENTS.md", changedFiles: ["AGENTS.md"] },
        details: { name: "Wiki Maintainer", status: "idle", adapterType: "claude_local", icon: "book-open" },
      },
      managedRoutines: [{
        status: "resolved",
        routineId: "routine-nightly",
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
      confirmPrefix: 'Atualizar "Run LLM Wiki lint" para os padrões atuais do plugin LLM Wiki?',
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
});
