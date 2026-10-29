// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { AnchorHTMLAttributes } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseSummary } from "@/api/cases";
import { i18n } from "@/i18n";
import { Cases } from "./Cases";

function act(callback: () => void) {
  flushSync(callback);
}

const companyState = vi.hoisted(() => ({ selectedCompanyId: "company-1" }));
const mockCasesApi = vi.hoisted(() => ({ list: vi.fn() }));
const mockProjectsApi = vi.hoisted(() => ({ list: vi.fn() }));
const mockIssuesApi = vi.hoisted(() => ({ listLabels: vi.fn() }));
const mockCopyTextToClipboard = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockNavigate = vi.hoisted(() => vi.fn());

const caseCollectionMessages = {
  en: {
    caseManagement: {
      collection: {
        changeStatus: "Change case status",
        search: { placeholder: "Search cases...", label: "Search cases" },
        toolbar: { filters: "Filters", columns: "Columns", sort: "Sort", group: "Group", showFlatList: "Show flat case list", showTree: "Show parent/children tree" },
        filters: {
          search: "Search", type: "Type", status: "Status", project: "Project", label: "Label",
          noProject: "No project", noTypes: "No types yet", allLabels: "All labels", clear: "Clear filters",
          clearAll: "Clear all", all: "All", projectFallback: "Project", labelFallback: "Label",
        },
        statuses: {
          draft: "Draft", inProgress: "In progress", inReview: "In review", approved: "Approved", done: "Done", cancelled: "Cancelled",
        },
        columns: {
          id: "ID", key: "Key", title: "Title", status: "Status", updated: "Updated", created: "Created at",
          type: "Type", project: "Project", parent: "Parent case",
        },
        sort: { updated: "Last updated", created: "Created at", title: "Title", status: "Status", id: "ID", type: "Type", project: "Project" },
        groups: { type: "Type", project: "Project", status: "Status", none: "None" },
        columnPicker: { desktopRows: "Desktop case rows", chooseVisible: "Choose visible columns", resetDefaults: "Reset defaults" },
      },
    },
  },
  "pt-BR": {
    caseManagement: {
      collection: {
        changeStatus: "Alterar o status do caso",
        search: { placeholder: "Buscar casos...", label: "Buscar casos" },
        toolbar: { filters: "Filtros", columns: "Colunas", sort: "Ordenar", group: "Agrupar", showFlatList: "Mostrar lista simples de casos", showTree: "Mostrar árvore de casos" },
        filters: {
          search: "Busca", type: "Tipo", status: "Status", project: "Projeto", label: "Rótulo",
          noProject: "Sem projeto", noTypes: "Ainda não há tipos", allLabels: "Todos os rótulos", clear: "Limpar filtros",
          clearAll: "Limpar tudo", all: "Todos", projectFallback: "Projeto", labelFallback: "Rótulo",
        },
        statuses: {
          draft: "Rascunho", inProgress: "Em andamento", inReview: "Em revisão", approved: "Aprovado", done: "Concluído", cancelled: "Cancelado",
        },
        columns: {
          id: "ID", key: "Chave", title: "Título", status: "Status", updated: "Atualizado", created: "Criado em",
          type: "Tipo", project: "Projeto", parent: "Caso pai",
        },
        sort: { updated: "Última atualização", created: "Data de criação", title: "Título", status: "Status", id: "ID", type: "Tipo", project: "Projeto" },
        groups: { type: "Tipo", project: "Projeto", status: "Status", none: "Nenhum" },
        columnPicker: { desktopRows: "Linhas de casos no desktop", chooseVisible: "Escolha as colunas visíveis", resetDefaults: "Restaurar padrão" },
      },
    },
  },
};

let previousLanguage = "en";
let previousEnglishTranslation: unknown;
let previousPortugueseTranslation: unknown;

vi.mock("@/context/CompanyContext", () => ({ useCompany: () => companyState }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }) }));
vi.mock("@/api/cases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/cases")>()),
  casesApi: mockCasesApi,
}));
vi.mock("@/api/projects", () => ({ projectsApi: mockProjectsApi }));
vi.mock("@/api/issues", () => ({ issuesApi: mockIssuesApi }));
vi.mock("@/lib/clipboard", () => ({ copyTextToClipboard: mockCopyTextToClipboard }));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
  useCaseHref: () => (...segments: string[]) =>
    `/PAP/${["cases", ...segments].filter(Boolean).join("/")}`,
}));

beforeAll(() => {
  previousLanguage = i18n.language;
  previousEnglishTranslation = i18n.getResourceBundle("en", "translation");
  previousPortugueseTranslation = i18n.getResourceBundle("pt-BR", "translation");
});

afterAll(async () => {
  i18n.removeResourceBundle("en", "translation");
  i18n.removeResourceBundle("pt-BR", "translation");
  if (previousEnglishTranslation !== undefined) {
    i18n.addResourceBundle("en", "translation", previousEnglishTranslation as Record<string, unknown>, true, true);
  }
  if (previousPortugueseTranslation !== undefined) {
    i18n.addResourceBundle("pt-BR", "translation", previousPortugueseTranslation as Record<string, unknown>, true, true);
  }
  await i18n.changeLanguage(previousLanguage);
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function flush() {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  }
  flushSync(() => {});
}
async function waitForAssertion(assertion: () => void, attempts = 20) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      assertion();
      return;
    } catch (e) {
      lastError = e;
      await flush();
    }
  }
  throw lastError;
}
function dispatchShortcut(key: string) {
  act(() => {
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

function createCase(overrides: Partial<CaseSummary>): CaseSummary {
  return {
    id: overrides.id ?? "case-1",
    companyId: "company-1",
    projectId: null,
    caseNumber: 1,
    identifier: overrides.identifier ?? "PAP-C1",
    caseType: overrides.caseType ?? "blog_post",
    key: null,
    title: overrides.title ?? "A case",
    summary: null,
    status: overrides.status ?? "in_progress",
    fields: {},
    parentCaseId: null,
    createdByAgentId: null,
    createdByUserId: null,
    completedAt: null,
    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
    ...overrides,
  };
}

function renderPage(container: HTMLDivElement) {
  const root = createRoot(container);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Cases />
      </QueryClientProvider>,
    );
  });
  return root;
}

describe("Cases list", () => {
  let container: HTMLDivElement;
  beforeEach(async () => {
    i18n.addResourceBundle("en", "translation", caseCollectionMessages.en, true, true);
    i18n.addResourceBundle("pt-BR", "translation", caseCollectionMessages["pt-BR"], true, true);
    await i18n.changeLanguage("en");
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    mockCasesApi.list.mockReset();
    mockProjectsApi.list.mockReset().mockResolvedValue([]);
    mockIssuesApi.listLabels.mockReset().mockResolvedValue([]);
    mockCopyTextToClipboard.mockClear();
    mockNavigate.mockClear();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    container.remove();
  });

  it("loads cases by default and hides terminal cases client-side", async () => {
    mockCasesApi.list.mockResolvedValue([
      createCase({ id: "a", identifier: "PAP-C1", title: "Active post", status: "in_progress" }),
      createCase({ id: "b", identifier: "PAP-C2", title: "Done post", status: "done" }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Active post");
      expect(container.textContent).not.toContain("Done post");
      expect(container.textContent).not.toContain("active ·");
      expect(mockCasesApi.list).toHaveBeenCalledWith("company-1", expect.objectContaining({
        limit: 200,
      }));
    });

    act(() => root.unmount());
  });

  it("sends search filters to the cases API instead of filtering a fetched page locally", async () => {
    mockCasesApi.list.mockResolvedValue([
      createCase({ id: "a", identifier: "PAP-C1", title: "Active post", status: "in_progress" }),
    ]);
    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Active post");
    });

    const input = container.querySelector<HTMLInputElement>("input[placeholder='Search cases...']");
    expect(input).toBeTruthy();
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(input, "launch");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await waitForAssertion(() => {
      expect(mockCasesApi.list).toHaveBeenLastCalledWith("company-1", expect.objectContaining({
        q: "launch",
        limit: 200,
      }));
    });

    act(() => root.unmount());
  });

  it("renders the onboarding hero when there are no cases at all", async () => {
    mockCasesApi.list.mockResolvedValue([]);
    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("No cases yet");
      expect(container.textContent).toContain("references/cases.md");
    });

    // No create-case UI anywhere (agent-only v1).
    expect(container.textContent).not.toContain("New case");
    expect(container.textContent).not.toContain("Create case");

    act(() => root.unmount());
  });

  it("shows default columns in id, title, status, updated order grouped by type without keys", async () => {
    mockCasesApi.list.mockResolvedValue([
      createCase({ id: "a", identifier: "PAP-C1", key: "launch/post-one", title: "Post one", caseType: "blog_post" }),
      createCase({ id: "b", identifier: "PAP-C2", title: "Storm one", caseType: "tweet_storm" }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("blog_post");
      expect(container.textContent).toContain("tweet_storm");
      expect(container.textContent).toContain("Post one");
      expect(container.textContent).not.toContain("launch/post-one");
      expect(container.textContent).toContain("Storm one");
    });

    const text = container.textContent ?? "";
    expect(text.indexOf("ID")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Title")).toBeGreaterThan(text.indexOf("ID"));
    expect(text.indexOf("Status")).toBeGreaterThan(text.indexOf("Title"));
    expect(text.indexOf("Updated")).toBeGreaterThan(text.indexOf("Status"));
    expect(text).not.toContain("Key");
    expect(text).not.toContain("Project");
    const headerGrid = Array.from(container.querySelectorAll<HTMLElement>("div > span[style*='grid-template-columns']")).find((element) =>
      element.textContent?.includes("ID")
      && element.textContent.includes("Title")
      && element.textContent.includes("Status")
    );
    expect(headerGrid?.style.gridTemplateColumns).toBe(
      "max-content minmax(12rem, 1fr) minmax(6rem, 7rem) minmax(5rem, 6rem)",
    );

    const blogGroupIndex = text.indexOf("blog_post");
    const tweetGroupIndex = text.indexOf("tweet_storm");
    expect(blogGroupIndex).toBeGreaterThanOrEqual(0);
    expect(tweetGroupIndex).toBeGreaterThan(blogGroupIndex);

    act(() => root.unmount());
  });

  it("copies case list identifiers with feedback without following the row link", async () => {
    mockCasesApi.list.mockResolvedValue([
      createCase({ id: "a", identifier: "PAP-C1", key: "launch/post-one", title: "Post one", caseType: "blog_post" }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("PAP-C1");
      expect(container.textContent).not.toContain("launch/post-one");
    });

    const idButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent === "PAP-C1"
    );
    expect(idButton).toBeTruthy();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      idButton!.dispatchEvent(click);
    });

    await waitForAssertion(() => {
      expect(click.defaultPrevented).toBe(true);
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith("PAP-C1");
      expect(idButton!.parentElement?.textContent).toContain("Copied");
    });

    act(() => root.unmount());
  });

  it("shows and copies keys only when the key column is enabled", async () => {
    window.localStorage.setItem(
      "paperclip:cases:company-1:view",
      JSON.stringify({
        columns: ["id", "key", "title", "status", "updated"],
      }),
    );
    mockCasesApi.list.mockResolvedValue([
      createCase({ id: "a", identifier: "PAP-C1", key: "launch/post-one", title: "Post one", caseType: "blog_post" }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Key");
      expect(container.textContent).toContain("launch/post-one");
    });

    const keyButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent === "launch/post-one"
    );
    expect(keyButton).toBeTruthy();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => {
      keyButton!.dispatchEvent(click);
    });

    await waitForAssertion(() => {
      expect(click.defaultPrevented).toBe(true);
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith("launch/post-one");
      expect(keyButton!.parentElement?.textContent).toContain("Copied");
    });

    act(() => root.unmount());
  });

  it("tree mode forces an ungrouped parent-child order and adds the type column", async () => {
    window.localStorage.setItem(
      "paperclip:cases:company-1:view",
      JSON.stringify({
        treeView: true,
        groupBy: "type",
        columns: ["id", "title", "status", "updated"],
        sortField: "updated",
        sortDir: "desc",
      }),
    );
    mockCasesApi.list.mockResolvedValue([
      createCase({
        id: "child",
        identifier: "PAP-C2",
        title: "Child case",
        parentCaseId: "parent",
        caseType: "asset",
        updatedAt: "2026-07-08T00:00:00.000Z",
      }),
      createCase({
        id: "parent",
        identifier: "PAP-C1",
        title: "Parent case",
        caseType: "brief",
        updatedAt: "2026-07-07T00:00:00.000Z",
      }),
      createCase({
        id: "sibling",
        identifier: "PAP-C3",
        title: "Sibling case",
        caseType: "brief",
        updatedAt: "2026-07-06T00:00:00.000Z",
      }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Type");
      expect(container.textContent).toContain("brief");
      expect(container.textContent).toContain("asset");
      expect(container.querySelector('button[title="Show flat case list"]')).not.toBeNull();
      expect(mockCasesApi.list).toHaveBeenCalledWith("company-1", expect.objectContaining({
        includeAncestors: true,
        limit: 200,
      }));
    });

    const text = container.textContent ?? "";
    expect(text.indexOf("Type")).toBeGreaterThan(text.indexOf("Title"));
    expect(text.indexOf("Status")).toBeGreaterThan(text.indexOf("Type"));
    expect(text.indexOf("Parent case")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Child case")).toBeGreaterThan(text.indexOf("Parent case"));
    expect(text.indexOf("Sibling case")).toBeGreaterThan(text.indexOf("Child case"));
    expect(text).not.toContain("1 child");

    const collapseParent = container.querySelector<HTMLButtonElement>('button[aria-label="Collapse Parent case"]');
    expect(collapseParent).toBeTruthy();
    expect(collapseParent?.getAttribute("aria-expanded")).toBe("true");
    act(() => {
      collapseParent!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Parent case");
      expect(container.textContent).not.toContain("Child case");
      expect(container.querySelector<HTMLButtonElement>('button[aria-label="Expand Parent case"]')?.getAttribute("aria-expanded")).toBe("false");
    });

    act(() => root.unmount());
  });

  it("keeps filtered-out ancestors visible in tree mode when descendants match", async () => {
    window.localStorage.setItem(
      "paperclip:cases:company-1:view",
      JSON.stringify({
        treeView: true,
        columns: ["id", "title", "type", "status", "updated"],
      }),
    );
    mockCasesApi.list.mockResolvedValue([
      createCase({
        id: "child",
        identifier: "PAP-C2",
        title: "Active child",
        parentCaseId: "parent",
        status: "in_progress",
        updatedAt: "2026-07-08T00:00:00.000Z",
      }),
      createCase({
        id: "done-sibling",
        identifier: "PAP-C3",
        title: "Done sibling",
        status: "done",
        updatedAt: "2026-07-09T00:00:00.000Z",
      }),
      createCase({
        id: "parent",
        identifier: "PAP-C1",
        title: "Done parent",
        status: "done",
        updatedAt: "2026-07-07T00:00:00.000Z",
      }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Done parent");
      expect(container.textContent).toContain("Active child");
      expect(container.textContent).not.toContain("Done sibling");
    });

    const text = container.textContent ?? "";
    expect(text.indexOf("Done parent")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Active child")).toBeGreaterThan(text.indexOf("Done parent"));

    act(() => root.unmount());
  });

  it("supports inbox-style keyboard navigation, group folding, and opening on grouped case rows", async () => {
    mockCasesApi.list.mockResolvedValue([
      createCase({
        id: "blog",
        identifier: "PAP-C1",
        title: "Blog active",
        caseType: "blog_post",
        updatedAt: "2026-07-08T00:00:00.000Z",
      }),
      createCase({
        id: "docs",
        identifier: "PAP-C2",
        title: "Docs active",
        caseType: "docs_page",
        updatedAt: "2026-07-07T00:00:00.000Z",
      }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Blog active");
      expect(container.textContent).toContain("Docs active");
    });

    dispatchShortcut("j");
    await flush();
    dispatchShortcut("ArrowLeft");

    await waitForAssertion(() => {
      expect(container.textContent).toContain("blog_post");
      expect(container.textContent).not.toContain("Blog active");
    });

    dispatchShortcut("ArrowRight");
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Blog active");
    });

    dispatchShortcut("j");
    await flush();
    dispatchShortcut("Enter");

    expect(mockNavigate).toHaveBeenCalledWith("/PAP/cases/PAP-C1");

    act(() => root.unmount());
  });

  it("supports keyboard tree folding and opening parent case rows", async () => {
    window.localStorage.setItem(
      "paperclip:cases:company-1:view",
      JSON.stringify({
        treeView: true,
        columns: ["id", "title", "type", "status", "updated"],
      }),
    );
    mockCasesApi.list.mockResolvedValue([
      createCase({
        id: "child",
        identifier: "PAP-C2",
        title: "Child case",
        parentCaseId: "parent",
        caseType: "asset",
        updatedAt: "2026-07-08T00:00:00.000Z",
      }),
      createCase({
        id: "parent",
        identifier: "PAP-C1",
        title: "Parent case",
        caseType: "brief",
        updatedAt: "2026-07-07T00:00:00.000Z",
      }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Parent case");
      expect(container.textContent).toContain("Child case");
    });

    dispatchShortcut("j");
    await flush();
    dispatchShortcut("ArrowLeft");

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Parent case");
      expect(container.textContent).not.toContain("Child case");
    });

    dispatchShortcut("ArrowRight");
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Child case");
    });

    dispatchShortcut("Enter");

    expect(mockNavigate).toHaveBeenCalledWith("/PAP/cases/PAP-C1");

    act(() => root.unmount());
  });

  it("restores persisted search, filters, group, sort, and columns", async () => {
    window.localStorage.setItem(
      "paperclip:cases:company-1:view",
      JSON.stringify({
        search: "launch",
        statusFilters: ["done"],
        typeFilters: ["blog_post"],
        projectFilters: [],
        labelFilter: "__all__",
        groupBy: "status",
        sortField: "created",
        sortDir: "asc",
        columns: ["id", "title", "status", "updated", "created"],
      }),
    );
    mockCasesApi.list.mockResolvedValue([
      createCase({
        id: "a",
        identifier: "PAP-C1",
        title: "Active launch",
        status: "in_progress",
        caseType: "blog_post",
      }),
      createCase({
        id: "b",
        identifier: "PAP-C2",
        title: "Done launch",
        status: "done",
        caseType: "blog_post",
      }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(mockCasesApi.list).toHaveBeenLastCalledWith("company-1", expect.objectContaining({
        q: "launch",
        limit: 200,
      }));
      expect(container.textContent).toContain("Done launch");
      expect(container.textContent).not.toContain("Active launch");
      expect(container.textContent).toContain("Created at");
    });

    act(() => root.unmount());
  });

  it("applies multi-select type and status filters from persisted state", async () => {
    window.localStorage.setItem(
      "paperclip:cases:company-1:view",
      JSON.stringify({
        statusFilters: ["in_progress", "done"],
        typeFilters: ["blog_post", "docs_page"],
        projectFilters: ["project-1", "__all__"],
      }),
    );
    mockCasesApi.list.mockResolvedValue([
      createCase({ id: "a", identifier: "PAP-C1", title: "Blog active", status: "in_progress", caseType: "blog_post" }),
      createCase({ id: "b", identifier: "PAP-C2", title: "Docs done", status: "done", caseType: "docs_page" }),
      createCase({ id: "c", identifier: "PAP-C3", title: "Tweet active", status: "in_progress", caseType: "tweet_storm" }),
      createCase({ id: "d", identifier: "PAP-C4", title: "Blog cancelled", status: "cancelled", caseType: "blog_post" }),
    ]);

    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(mockCasesApi.list).toHaveBeenCalledWith("company-1", expect.objectContaining({
        types: ["blog_post", "docs_page"],
        statuses: ["in_progress", "done"],
        projectIds: ["project-1"],
        includeNoProject: true,
      }));
      expect(container.textContent).toContain("Blog active");
      expect(container.textContent).toContain("Docs done");
      expect(container.textContent).not.toContain("Tweet active");
      expect(container.textContent).not.toContain("Blog cancelled");
    });

    act(() => root.unmount());
  });

  it("localizes search and filters while keeping query and filter values unchanged", async () => {
    mockCasesApi.list.mockResolvedValue([
      createCase({ id: "a", identifier: "PAP-C1", title: "Active post", caseType: "blog_post" }),
    ]);
    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Active post");
    });

    const search = container.querySelector<HTMLInputElement>("input[placeholder='Search cases...']");
    expect(search?.getAttribute("aria-label")).toBe("Search cases");
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      valueSetter?.call(search, "USER QUERY");
      search!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await waitForAssertion(() => {
      expect(mockCasesApi.list).toHaveBeenLastCalledWith("company-1", expect.objectContaining({ q: "USER QUERY", limit: 200 }));
    });
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Clear all");
    });

    const filtersButton = document.body.querySelector<HTMLButtonElement>('button[aria-label="Filters"]');
    expect(filtersButton).toBeTruthy();
    act(() => filtersButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(document.body.textContent).toContain("blog_post");
      expect(document.body.textContent).toContain("All labels");
    });

    const typeOption = Array.from(document.body.querySelectorAll("label")).find((label) => label.textContent?.trim() === "blog_post");
    const typeCheckbox = typeOption?.querySelector<HTMLButtonElement>('[data-slot="checkbox"]');
    expect(typeCheckbox).toBeTruthy();
    act(() => typeCheckbox!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(mockCasesApi.list).toHaveBeenLastCalledWith("company-1", expect.objectContaining({
        q: "USER QUERY",
        types: ["blog_post"],
        limit: 200,
      }));
    });

    act(() => root.unmount());
  });

  it("localizes column, sort, and grouping controls without changing stored enum values", async () => {
    mockCasesApi.list.mockResolvedValue([
      createCase({ id: "a", identifier: "PAP-C1", title: "USER CASE TITLE", caseType: "blog_post" }),
    ]);
    await i18n.changeLanguage("pt-BR");
    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("USER CASE TITLE");
      expect(container.textContent).toContain("Título");
    });

    const search = container.querySelector<HTMLInputElement>("input[placeholder='Buscar casos...']");
    expect(search?.getAttribute("aria-label")).toBe("Buscar casos");
    const statusPicker = document.body.querySelector<HTMLButtonElement>('button[aria-label="Alterar o status do caso"]');
    expect(statusPicker?.textContent).toContain("Em andamento");
    const treeButton = document.body.querySelector<HTMLButtonElement>('button[aria-label="Mostrar árvore de casos"]');
    expect(treeButton).toBeTruthy();
    act(() => treeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(document.body.querySelector('button[aria-label="Mostrar lista simples de casos"]')).toBeTruthy();
      expect(JSON.parse(window.localStorage.getItem("paperclip:cases:company-1:view") ?? "{}").treeView).toBe(true);
    });
    const flatListButton = document.body.querySelector<HTMLButtonElement>('button[aria-label="Mostrar lista simples de casos"]');
    act(() => flatListButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => expect(document.body.querySelector('button[aria-label="Mostrar árvore de casos"]')).toBeTruthy());
    const filtersButton = document.body.querySelector<HTMLButtonElement>('button[aria-label="Filtros"]');
    expect(filtersButton).toBeTruthy();
    act(() => filtersButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(document.body.textContent).toContain("Todos os rótulos");
      expect(document.body.textContent).toContain("Concluído");
      expect(document.body.textContent).toContain("Limpar filtros");
    });
    const typeOption = Array.from(document.body.querySelectorAll("label")).find((label) => label.textContent?.trim() === "blog_post");
    const typeCheckbox = typeOption?.querySelector<HTMLButtonElement>('[data-slot="checkbox"]');
    expect(typeCheckbox).toBeTruthy();
    act(() => typeCheckbox!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(mockCasesApi.list).toHaveBeenLastCalledWith("company-1", expect.objectContaining({ types: ["blog_post"], limit: 200 }));
    });
    await waitForAssertion(() => expect(document.body.textContent).toContain("Limpar tudo"));

    const columnsButton = document.body.querySelector<HTMLButtonElement>('button[aria-label="Colunas"]');
    expect(columnsButton).toBeTruthy();
    act(() => columnsButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(document.body.textContent).toContain("Linhas de casos no desktop");
      expect(document.body.textContent).toContain("Escolha as colunas visíveis");
      expect(document.body.textContent).toContain("Restaurar padrão");
    });
    const projectColumn = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Projeto");
    expect(projectColumn).toBeTruthy();
    act(() => projectColumn!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(JSON.parse(window.localStorage.getItem("paperclip:cases:company-1:view") ?? "{}").columns).toContain("project");

    const sortButton = document.body.querySelector<HTMLButtonElement>('button[aria-label="Ordenar"]');
    expect(sortButton).toBeTruthy();
    act(() => sortButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => expect(document.body.textContent).toContain("Última atualização"));
    const titleSort = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Título");
    expect(titleSort).toBeTruthy();
    act(() => titleSort!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(JSON.parse(window.localStorage.getItem("paperclip:cases:company-1:view") ?? "{}").sortField).toBe("title");

    const groupButton = document.body.querySelector<HTMLButtonElement>('button[aria-label="Agrupar"]');
    expect(groupButton).toBeTruthy();
    act(() => groupButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => expect(document.body.textContent).toContain("Nenhum"));
    const statusGroup = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Status");
    expect(statusGroup).toBeTruthy();
    act(() => statusGroup!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(JSON.parse(window.localStorage.getItem("paperclip:cases:company-1:view") ?? "{}").groupBy).toBe("status");

    act(() => root.unmount());
  });
});
