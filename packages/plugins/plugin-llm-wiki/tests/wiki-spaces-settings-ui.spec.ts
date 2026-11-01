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
    agentOptions: [{ id: "agent-1", name: "Wiki Maintainer", status: "idle", adapterType: "claude_local", icon: "book-open" }],
    projectOptions: [{ id: "project-1", name: "LLM Wiki", status: "active" }],
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

  (globalThis as BridgeGlobal).__paperclipPluginBridge__ = {
    sdkUi: {
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
        if (key === "settings") return dataResult(settingsData());
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
});
