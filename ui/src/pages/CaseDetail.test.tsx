// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { AnchorHTMLAttributes } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaseDetail as CaseDetailData, CaseSummary } from "@/api/cases";
import { PROJECT_COLORS } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { CaseDetail } from "./CaseDetail";

function act(callback: () => void) {
  flushSync(callback);
}

const companyState = vi.hoisted(() => ({ selectedCompanyId: "company-1" }));
const mockCasesApi = vi.hoisted(() => ({
  get: vi.fn(),
  listEvents: vi.fn(),
  list: vi.fn(),
  listChildren: vi.fn(),
  patch: vi.fn(),
  getDocument: vi.fn(),
  listRevisions: vi.fn(),
  upsertDocument: vi.fn(),
  lockDocument: vi.fn(),
  unlockDocument: vi.fn(),
  restoreDocumentRevision: vi.fn(),
  deleteDocument: vi.fn(),
}));
const mockIssuesApi = vi.hoisted(() => ({ listLabels: vi.fn(), createLabel: vi.fn() }));
const panelState = vi.hoisted(() => ({ openPanel: vi.fn(), closePanel: vi.fn() }));
const mockCopyTextToClipboard = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("@/context/CompanyContext", () => ({ useCompany: () => companyState }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }) }));
vi.mock("@/context/PanelContext", () => ({ usePanel: () => panelState }));
vi.mock("@/api/cases", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/cases")>()),
  casesApi: mockCasesApi,
}));
vi.mock("@/api/issues", () => ({ issuesApi: mockIssuesApi }));
vi.mock("@/lib/clipboard", () => ({ copyTextToClipboard: mockCopyTextToClipboard }));
vi.mock("@/components/MarkdownBody", () => ({
  MarkdownBody: ({ children }: { children: string }) => <div data-testid="md">{children}</div>,
}));
vi.mock("@/components/IssueDocumentsSection", () => ({
  IssueDocumentsSection: ({ subject }: { subject?: { id: string } }) => (
    <div data-testid="case-documents-section">Documents {subject?.id}</div>
  ),
}));
vi.mock("@/lib/router", () => ({
  useParams: () => ({ caseIdentifier: "PAP-C7" }),
  useLocation: () => ({ hash: "" }),
  Navigate: () => null,
  Link: ({ children, to, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useCaseHref: () => (...segments: string[]) =>
    `/PAP/${["cases", ...segments].filter(Boolean).join("/")}`,
}));

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

function detail(): CaseDetailData {
  return {
    id: "case-1",
    companyId: "company-1",
    projectId: null,
    caseNumber: 7,
    identifier: "PAP-C7",
    caseType: "blog_post",
    key: "v2026.707/hermes-agent-post",
    title: "Hermes agent launch post",
    summary: null,
    status: "in_review",
    fields: {
      slug: "hermes-agent-post",
      body: "Legacy body field",
      runbook: "Legacy runbook field",
      word_count: 1850,
      published: true,
      description: "Launch narrative",
      issue_identifiers: ["PAP-12947"],
    },
    parent: null,
    parentCaseId: null,
    createdByAgentId: null,
    createdByUserId: null,
    completedAt: null,
    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
    labels: [],
    issueLinks: [
      {
        id: "link-1",
        caseId: "case-1",
        issueId: "issue-1",
        role: "reference",
        createdAt: "2026-07-07T00:00:00.000Z",
        issue: {
          id: "issue-1",
          identifier: "PAP-12947",
          title: "Case object exploration",
          status: "in_progress",
        },
      },
    ],
    documents: [
      {
        key: "body",
        document: {
          id: "doc-1",
          companyId: "company-1",
          title: "body",
          format: "markdown",
          latestBody: "# Draft body\n\nSome content.",
          latestRevisionId: "rev-8",
          latestRevisionNumber: 8,
          createdByAgentId: null,
          createdByUserId: null,
          updatedByAgentId: "agent-1",
          updatedByUserId: null,
          lockedAt: null,
          lockedByAgentId: null,
          lockedByUserId: null,
          createdAt: "2026-07-07T00:00:00.000Z",
          updatedAt: "2026-07-07T00:00:00.000Z",
        },
      },
      {
        key: "runbook",
        document: {
          id: "doc-2",
          companyId: "company-1",
          title: "runbook",
          format: "markdown",
          latestBody: "# Runbook\n\nSteps.",
          latestRevisionId: "rev-2",
          latestRevisionNumber: 2,
          createdByAgentId: null,
          createdByUserId: null,
          updatedByAgentId: "agent-1",
          updatedByUserId: null,
          lockedAt: null,
          lockedByAgentId: null,
          lockedByUserId: null,
          createdAt: "2026-07-07T00:00:00.000Z",
          updatedAt: "2026-07-07T00:00:00.000Z",
        },
      },
    ],
    attachments: [],
  };
}

function childCase(index: number): CaseSummary {
  return {
    id: `child-${index}`,
    companyId: "company-1",
    projectId: null,
    caseNumber: index,
    identifier: `PAP-C${index}`,
    caseType: "child_case",
    key: null,
    title: `Child case ${index}`,
    summary: null,
    status: "in_progress",
    fields: {},
    parentCaseId: "case-1",
    createdByAgentId: null,
    createdByUserId: null,
    completedAt: null,
    createdAt: "2026-07-07T00:00:00.000Z",
    updatedAt: "2026-07-07T00:00:00.000Z",
  };
}

function renderPage(container: HTMLDivElement) {
  const root = createRoot(container);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <CaseDetail />
      </QueryClientProvider>,
    );
  });
  return root;
}

async function renderCompactPanel() {
  await waitForAssertion(() => expect(panelState.openPanel).toHaveBeenCalled());
  const panelContainer = document.createElement("div");
  document.body.appendChild(panelContainer);
  const panelRoot = createRoot(panelContainer);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  act(() => panelRoot.render(<QueryClientProvider client={queryClient}>{panelState.openPanel.mock.calls.at(-1)?.[0]}</QueryClientProvider>));
  return { panelContainer, panelRoot };
}

describe("CaseDetail", () => {
  let container: HTMLDivElement;
  let previousLanguage = "pt-BR";
  beforeAll(() => { previousLanguage = i18n.language; });
  afterAll(async () => { await i18n.changeLanguage(previousLanguage); });
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    panelState.openPanel.mockClear();
    panelState.closePanel.mockClear();
    mockCasesApi.get.mockReset().mockResolvedValue(detail());
    mockCasesApi.listEvents.mockReset().mockResolvedValue([]);
    mockCasesApi.list.mockReset().mockResolvedValue([]);
    mockCasesApi.listChildren.mockReset().mockResolvedValue([]);
    mockCasesApi.patch.mockReset().mockResolvedValue(detail());
    mockCasesApi.getDocument.mockReset();
    mockCasesApi.listRevisions.mockReset().mockResolvedValue({
      key: "body",
      document: {
        id: "doc-1",
        title: "body",
        format: "markdown",
        latestRevisionId: "rev-8",
        latestRevisionNumber: 8,
      },
      revisions: [],
    });
    mockCasesApi.upsertDocument.mockReset();
    mockCasesApi.lockDocument.mockReset();
    mockCasesApi.unlockDocument.mockReset();
    mockCasesApi.restoreDocumentRevision.mockReset();
    mockCasesApi.deleteDocument.mockReset();
    mockIssuesApi.listLabels.mockReset().mockResolvedValue([]);
    mockIssuesApi.createLabel.mockReset();
    mockCopyTextToClipboard.mockClear();
  });
  afterEach(() => {
    container.remove();
  });

  it("renders the case header and body-first overview without duplicating generic fields", async () => {
    const root = renderPage(container);

    await waitForAssertion(() => {
      // header
      expect(container.textContent).toContain("PAP-C7");
      expect(container.textContent).toContain("blog_post");
      expect(container.textContent).toContain("Hermes agent launch post");
      // upsert key (detail-only)
      expect(container.textContent).toContain("v2026.707/hermes-agent-post");
      // shared document section
      expect(container.textContent).toContain("Documents case-1");
      expect(container.textContent).toContain("Launch narrative");
      expect(container.textContent).not.toContain("Revisions");
      expect(container.textContent).not.toContain("1,850");
    });

    act(() => root.unmount());
  });

  it("copies the case identifier from the header", async () => {
    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("PAP-C7");
    });

    const caseIdButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent === "PAP-C7"
    );
    expect(caseIdButton).toBeTruthy();
    act(() => {
      caseIdButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitForAssertion(() => {
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith("PAP-C7");
      expect(caseIdButton!.parentElement?.textContent).toContain("Copied");
    });

    act(() => root.unmount());
  });

  it("keeps the case identifier and key in one copyable header group", async () => {
    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("v2026.707/hermes-agent-post");
    });

    const identityGroup = container.querySelector('[data-case-identity-group="true"]');
    expect(identityGroup).not.toBeNull();
    expect(identityGroup?.className).toContain("whitespace-nowrap");

    const keyButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent === "v2026.707/hermes-agent-post"
    );
    expect(keyButton).toBeTruthy();
    act(() => {
      keyButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitForAssertion(() => {
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith("v2026.707/hermes-agent-post");
      expect(keyButton!.parentElement?.textContent).toContain("Copied");
    });

    act(() => root.unmount());
  });

  it("shows parent and capped children together above the tabs", async () => {
    const caseWithParent = {
      ...detail(),
      parentCaseId: "case-parent",
      parent: {
        id: "case-parent",
        identifier: "PAP-C2",
        title: "Parent case",
        caseType: "campaign",
        status: "approved" as const,
      },
    };
    mockCasesApi.get.mockResolvedValue(caseWithParent);
    mockCasesApi.listChildren.mockResolvedValue(Array.from({ length: 6 }, (_, index) => childCase(index + 3)));

    const root = renderPage(container);

    await waitForAssertion(() => {
      const text = container.textContent ?? "";
      expect(text).toContain("Parent");
      expect(text).toContain("PAP-C2");
      expect(text).toContain("Parent case");
      expect(text).toContain("Children 6");
      expect(text).toContain("Child case 7");
      expect(text).not.toContain("Child case 8");
      expect(text).toContain("Show 1 more");
      expect(text.indexOf("Parent")).toBeLessThan(text.indexOf("Overview"));
      expect(text.indexOf("Children 6")).toBeLessThan(text.indexOf("Overview"));
    });

    const showMore = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Show 1 more")
    );
    expect(showMore).toBeTruthy();
    act(() => {
      showMore!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Child case 8");
      expect(container.textContent).not.toContain("Show 1 more");
    });

    act(() => root.unmount());
  });

  it("renders primary fields and task references in the compact properties panel", async () => {
    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(panelState.openPanel).toHaveBeenCalled();
    });

    const panelContainer = document.createElement("div");
    document.body.appendChild(panelContainer);
    const panelRoot = createRoot(panelContainer);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() => {
      panelRoot.render(
        <QueryClientProvider client={queryClient}>
          {panelState.openPanel.mock.calls.at(-1)?.[0]}
        </QueryClientProvider>,
      );
    });

    await waitForAssertion(() => {
      const text = panelContainer.textContent ?? "";
      expect(text).toContain("Fields");
      expect(text).toContain("v2026.707/hermes-agent-post");
      expect(text).toContain("title");
      expect(text).toContain("Hermes agent launch post");
      expect(text).toContain("description");
      expect(text).toContain("Launch narrative");
      expect(text).toContain("word_count");
      expect(text).toContain("Linked tasks");
      expect(text).toContain("PAP-12947");
      expect(text).not.toContain("body");
      expect(text).not.toContain("Legacy body field");
      expect(text).not.toContain("runbook");
      expect(text).not.toContain("Legacy runbook field");
      expect(text).not.toContain("Documents");
      expect(text).not.toContain("reference");
      expect(text).not.toContain("Activity");
    });

    const keyValue = Array.from(panelContainer.querySelectorAll("button")).find((button) =>
      button.textContent === "v2026.707/hermes-agent-post"
    );
    expect(keyValue).toBeTruthy();
    act(() => {
      keyValue!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitForAssertion(() => {
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith("v2026.707/hermes-agent-post");
      expect(keyValue!.parentElement?.textContent).toContain("Copied");
    });

    const titleValue = Array.from(panelContainer.querySelectorAll("button")).find((button) =>
      button.textContent === "Hermes agent launch post"
    );
    expect(titleValue).toBeTruthy();
    act(() => {
      titleValue!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitForAssertion(() => {
      expect(mockCopyTextToClipboard).toHaveBeenCalledWith("Hermes agent launch post");
      expect(titleValue!.parentElement?.textContent).toContain("Copied");
    });

    act(() => panelRoot.unmount());
    panelContainer.remove();
    act(() => root.unmount());
  });

  it("adds a full properties tab with expanded values", async () => {
    const root = renderPage(container);

    await waitForAssertion(() => {
      expect(container.textContent).toContain("Properties");
    });

    const propertiesTab = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Properties")
    );
    expect(propertiesTab).toBeTruthy();
    act(() => {
      propertiesTab!.focus();
      propertiesTab!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    await waitForAssertion(() => {
      const text = container.textContent ?? "";
      expect(text).toContain("title");
      expect(text).toContain("Hermes agent launch post");
      expect(text).toContain("issue_identifiers");
      expect(container.querySelector('a[data-mention-kind="issue"][href="/issues/PAP-12947"]')).not.toBeNull();
      expect(text).not.toContain("body");
      expect(text).not.toContain("Legacy body field");
      expect(text).not.toContain("runbook");
      expect(text).not.toContain("Legacy runbook field");
    });

    act(() => root.unmount());
  });

  it("localizes the detail shell and copied Markdown while preserving case data", async () => {
    await i18n.changeLanguage("pt-BR");
    const root = renderPage(container);
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Hermes agent launch post");
      expect(container.textContent).toContain("Visão geral");
      expect(container.textContent).toContain("Propriedades");
      expect(container.textContent).toContain("Atividade");
      expect(container.querySelector('button[aria-label="Alterar o status do caso"]')?.textContent).toContain("Em revisão");
    });
    const actions = container.querySelector<HTMLButtonElement>('button[aria-label="Mais ações do caso"]');
    expect(actions).toBeTruthy();
    act(() => actions!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => expect(document.body.textContent).toContain("Copiar como Markdown"));
    const copy = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("Copiar como Markdown"));
    act(() => copy!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(mockCopyTextToClipboard).toHaveBeenLastCalledWith(expect.stringContaining("- Status: Em revisão"));
      expect(mockCopyTextToClipboard).toHaveBeenLastCalledWith(expect.stringContaining("- Chave: v2026.707/hermes-agent-post"));
      expect(mockCopyTextToClipboard).toHaveBeenLastCalledWith(expect.stringContaining("- Tipo: blog_post"));
    });
    await i18n.changeLanguage("en");
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Overview");
      expect(container.querySelector('button[aria-label="Change case status"]')?.textContent).toContain("In review");
      expect(document.body.textContent).toContain("Copy as markdown");
    });
    const englishCopy = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("Copy as markdown"));
    act(() => englishCopy!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(mockCopyTextToClipboard).toHaveBeenLastCalledWith(expect.stringContaining("- Status: In review"));
      expect(mockCopyTextToClipboard).toHaveBeenLastCalledWith(expect.stringContaining("- Type: blog_post"));
    });
    act(() => root.unmount());
  });

  it("localizes the missing case state", async () => {
    mockCasesApi.get.mockRejectedValue(new Error("server detail"));
    await i18n.changeLanguage("pt-BR");
    const root = renderPage(container);
    await waitForAssertion(() => {
      expect(container.textContent).toContain("Caso não encontrado.");
      expect(container.textContent).toContain("Voltar para casos");
      expect(container.textContent).not.toContain("server detail");
    });
    act(() => root.unmount());
  });

  it("shows activity errors and retries the activity query", async () => {
    mockCasesApi.listEvents.mockRejectedValueOnce(new Error("server detail")).mockResolvedValueOnce([]);
    await i18n.changeLanguage("pt-BR");
    const root = renderPage(container);
    await waitForAssertion(() => expect(container.textContent).toContain("Hermes agent launch post"));
    const activity = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Atividade");
    expect(activity).toBeTruthy();
    act(() => {
      activity!.focus();
      activity!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await waitForAssertion(() => expect(container.textContent).toContain("Não foi possível carregar a atividade."));
    expect(container.textContent).not.toContain("server detail");
    const retry = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Tentar novamente");
    act(() => retry!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => expect(container.textContent).toContain("Ainda não há atividade."));
    expect(mockCasesApi.listEvents).toHaveBeenCalledTimes(2);
    act(() => root.unmount());
  });

  it("localizes properties and relationships while preserving label and task data", async () => {
    const label = { id: "label-1", companyId: "company-1", name: "USER LABEL", color: PROJECT_COLORS[0], createdAt: new Date(), updatedAt: new Date() };
    const caseWithParent = {
      ...detail(),
      parent: { id: "case-parent", identifier: "PAP-C2", title: "USER PARENT", caseType: "campaign", status: "approved" as const },
    };
    mockCasesApi.get.mockResolvedValue(caseWithParent);
    mockCasesApi.listChildren.mockResolvedValue([childCase(3)]);
    mockIssuesApi.listLabels.mockResolvedValue([label]);
    await i18n.changeLanguage("pt-BR");
    const root = renderPage(container);
    await waitForAssertion(() => {
      expect(container.textContent).toContain("USER PARENT");
      expect(container.textContent).toContain("Casos filhos 1");
      expect(container.textContent).toContain("Child case 3");
    });
    const panelContainer = document.createElement("div");
    document.body.appendChild(panelContainer);
    const panelRoot = createRoot(panelContainer);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() => panelRoot.render(<QueryClientProvider client={queryClient}>{panelState.openPanel.mock.calls.at(-1)?.[0]}</QueryClientProvider>));
    await waitForAssertion(() => {
      expect(panelContainer.textContent).toContain("Campos");
      expect(panelContainer.textContent).toContain("word_count");
      expect(panelContainer.textContent).toContain("Tarefas vinculadas");
      expect(panelContainer.querySelector('a[aria-label="Tarefa PAP-12947: Case object exploration"]')).toBeTruthy();
    });
    const labels = Array.from(panelContainer.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Rótulos");
    expect(labels).toBeTruthy();
    act(() => labels!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(document.body.querySelector('input[placeholder="Buscar rótulos…"]')).toBeTruthy();
      expect(document.body.textContent).toContain("USER LABEL");
    });
    const option = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "USER LABEL");
    act(() => option!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => expect(mockCasesApi.patch).toHaveBeenCalledWith("PAP-C7", { labelIds: ["label-1"] }));
    act(() => panelRoot.unmount());
    panelContainer.remove();
    act(() => root.unmount());
  });

  it("reports label loading failures in the active language", async () => {
    mockIssuesApi.listLabels.mockRejectedValue(new Error("provider detail"));
    await i18n.changeLanguage("pt-BR");
    const root = renderPage(container);
    const { panelContainer, panelRoot } = await renderCompactPanel();
    const labels = Array.from(panelContainer.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Rótulos");
    act(() => labels!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(document.body.textContent).toContain("Não foi possível carregar os rótulos.");
      expect(document.body.textContent).not.toContain("provider detail");
    });
    act(() => panelRoot.unmount());
    panelContainer.remove();
    act(() => root.unmount());
  });

  it("shows label loading instead of an empty state while the request is pending", async () => {
    mockIssuesApi.listLabels.mockImplementation(() => new Promise(() => {}));
    await i18n.changeLanguage("pt-BR");
    const root = renderPage(container);
    const { panelContainer, panelRoot } = await renderCompactPanel();
    const labels = Array.from(panelContainer.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Rótulos");
    act(() => labels!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(document.body.textContent).toContain("Carregando rótulos...");
      expect(document.body.textContent).not.toContain("Ainda não há rótulos.");
    });
    act(() => panelRoot.unmount());
    panelContainer.remove();
    act(() => root.unmount());
  });

  it("preserves a new label name when creation fails", async () => {
    mockIssuesApi.createLabel.mockRejectedValue(new Error("provider detail"));
    await i18n.changeLanguage("pt-BR");
    const root = renderPage(container);
    const { panelContainer, panelRoot } = await renderCompactPanel();
    const labels = Array.from(panelContainer.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Rótulos");
    act(() => labels!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => expect(document.body.textContent).toContain("Ainda não há rótulos."));
    const search = document.body.querySelector<HTMLInputElement>('input[placeholder="Buscar rótulos…"]');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "USER NEW LABEL");
      search!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await waitForAssertion(() => expect(document.body.textContent).toContain("Criar “USER NEW LABEL”"));
    const create = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("Criar “USER NEW LABEL”"));
    act(() => create!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await waitForAssertion(() => {
      expect(mockIssuesApi.createLabel).toHaveBeenCalledWith("company-1", { name: "USER NEW LABEL", color: PROJECT_COLORS[0] });
      expect(document.body.textContent).toContain("Não foi possível criar o rótulo.");
      expect(search?.value).toBe("USER NEW LABEL");
    });
    act(() => panelRoot.unmount());
    panelContainer.remove();
    act(() => root.unmount());
  });
});
