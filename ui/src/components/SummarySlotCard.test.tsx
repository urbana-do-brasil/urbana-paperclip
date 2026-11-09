// @vitest-environment jsdom

import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BuiltInAgentState } from "@/api/builtInAgents";
import type {
  GetSummarySlotResponse,
  ListSummarySlotRevisionsResponse,
  SummarySlot,
  SummarySlotDocument,
  SummarySlotIssueRef,
  SummarySlotRevision,
} from "@paperclipai/shared";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { i18n } from "@/i18n";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { SummarySlotCard } from "./SummarySlotCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (!HTMLElement.prototype.hasPointerCapture) {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: () => false,
  });
}

const mockInstanceSettingsApi = vi.hoisted(() => ({ getExperimental: vi.fn() }));
const mockSummarySlotsApi = vi.hoisted(() => ({
  get: vi.fn(),
  revisions: vi.fn(),
  generate: vi.fn(),
}));
const mockBuiltInAgentsApi = vi.hoisted(() => ({ list: vi.fn() }));
const mockAgentsApi = vi.hoisted(() => ({ resume: vi.fn() }));

vi.mock("@/api/instanceSettings", () => ({ instanceSettingsApi: mockInstanceSettingsApi }));
vi.mock("@/api/summarySlots", () => ({ summarySlotsApi: mockSummarySlotsApi }));
vi.mock("@/api/builtInAgents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/builtInAgents")>()),
  builtInAgentsApi: mockBuiltInAgentsApi,
}));
vi.mock("@/api/agents", () => ({ agentsApi: mockAgentsApi }));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/MarkdownBody", () => ({
  MarkdownBody: ({ children }: { children: string }) => <div data-testid="markdown-body">{children}</div>,
}));
vi.mock("@/components/ConfigureBuiltInAgentModal", () => ({
  ConfigureBuiltInAgentModal: ({
    open,
    onConfigured,
  }: {
    open: boolean;
    onConfigured?: () => void;
  }) => (open ? (
    <div data-testid="configure-modal">
      <button type="button" onClick={onConfigured}>Finish setup</button>
    </div>
  ) : null),
}));

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> = undefined;
  flushSync(() => {
    result = callback();
  });
  await result;
}

async function flushQueries() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
  flushSync(() => {});
}

async function openRevisionSelect(container: HTMLElement) {
  const trigger = container.querySelector<HTMLElement>(
    `button[aria-label="${i18n.t("summarySlotCard.revision.selectAria")}"]`,
  );
  expect(trigger).not.toBeNull();

  await act(async () => {
    trigger!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushQueries();

  return trigger!;
}

async function chooseRevisionOption(labelPart: string) {
  const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (element) => element.textContent?.includes(labelPart),
  );
  expect(option).toBeTruthy();

  await act(async () => {
    option!.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }));
    option!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flushQueries();
}

function readySummarizer(): BuiltInAgentState {
  return {
    definition: {
      key: "summarizer",
      displayName: "Summarizer",
      featureKeys: ["summarizer"],
      shortPurpose: "Writes summaries",
      defaultInstructions: "Summarize",
      defaultRole: "Summarizer",
    },
    status: "ready",
    agentId: "agent-summarizer",
    agent: null,
    pauseReason: null,
    resources: [],
  };
}

function needsSetupSummarizer(status: "needs_setup" | "pending_approval" = "needs_setup"): BuiltInAgentState {
  return {
    ...readySummarizer(),
    status,
    agentId: "agent-summarizer",
  };
}

function pausedSummarizer(): BuiltInAgentState {
  return {
    ...readySummarizer(),
    status: "paused",
    agent: { id: "agent-summarizer" } as BuiltInAgentState["agent"],
  };
}

function slot(overrides: Partial<SummarySlot> = {}): SummarySlot {
  return {
    id: "slot-1",
    companyId: "company-1",
    scopeKind: "project",
    scopeId: "project-1",
    slotKey: "header",
    documentId: null,
    status: "idle",
    failureReason: null,
    generatingIssueId: null,
    lastGeneratedAt: null,
    lastGeneratedByAgentId: null,
    lastModel: null,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
}

function summaryDocument(overrides: Partial<SummarySlotDocument> = {}): SummarySlotDocument {
  return {
    id: "doc-1",
    companyId: "company-1",
    title: "Project summary",
    format: "markdown",
    body: "## Needs you\nLatest body",
    latestRevisionId: "rev-2",
    latestRevisionNumber: 2,
    createdByAgentId: null,
    createdByUserId: null,
    updatedByAgentId: "agent-summarizer",
    updatedByUserId: null,
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
    ...overrides,
  };
}

function issue(overrides: Partial<SummarySlotIssueRef> = {}): SummarySlotIssueRef {
  return {
    id: "issue-1",
    identifier: "PAP-14000",
    title: "Summarize project",
    status: "todo",
    ...overrides,
  };
}

function revision(overrides: Partial<SummarySlotRevision> = {}): SummarySlotRevision {
  return {
    id: "rev-1",
    companyId: "company-1",
    documentId: "doc-1",
    revisionNumber: 1,
    title: "Project summary",
    format: "markdown",
    body: "## Old\nOld body",
    changeSummary: null,
    createdByAgentId: "agent-summarizer",
    createdByUserId: null,
    createdByRunId: null,
    createdAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

function renderCard(container: HTMLDivElement) {
  const root = createRoot(container);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  flushSync(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <SummarySlotCard
          companyId="company-1"
          scopeKind="project"
          scopeId="project-1"
          title="Project summary"
          description="Project status at a glance."
        />
      </QueryClientProvider>,
    );
  });
  return root;
}

describe("SummarySlotCard", () => {
  let root: Root | null = null;
  let container: HTMLDivElement;
  let previousLanguage = "pt-BR";

  beforeAll(() => { previousLanguage = i18n.language; });
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    mockInstanceSettingsApi.getExperimental.mockResolvedValue({
      enableSummaries: true,
      enableBuiltInAgents: true,
    });
    mockBuiltInAgentsApi.list.mockResolvedValue([readySummarizer()]);
    mockSummarySlotsApi.get.mockResolvedValue({ slot: null, document: null, generatingIssue: null } satisfies GetSummarySlotResponse);
    mockSummarySlotsApi.revisions.mockResolvedValue({ slot: null, revisions: [] } satisfies ListSummarySlotRevisionsResponse);
    mockSummarySlotsApi.generate.mockResolvedValue({
      slot: slot({ status: "generating", generatingIssueId: "issue-1" }),
      generatingIssue: issue(),
      alreadyGenerating: false,
    });
  });

  afterEach(async () => {
    await act(() => root?.unmount());
    root = null;
    container.remove();
    vi.clearAllMocks();
  });
  afterAll(async () => { await i18n.changeLanguage(previousLanguage); });

  it("renders nothing and does not fetch slots when the summaries flag is off", async () => {
    mockInstanceSettingsApi.getExperimental.mockResolvedValue({
      enableSummaries: false,
      enableBuiltInAgents: true,
    });

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toBe("");
    expect(mockSummarySlotsApi.get).not.toHaveBeenCalled();
    expect(mockBuiltInAgentsApi.list).not.toHaveBeenCalled();
  });

  it("keeps summary slots hidden while the summaries flag is loading", async () => {
    mockInstanceSettingsApi.getExperimental.mockImplementation(() => new Promise(() => {}));

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toBe("");
    expect(mockSummarySlotsApi.get).not.toHaveBeenCalled();
    expect(mockBuiltInAgentsApi.list).not.toHaveBeenCalled();
  });

  it("fails closed without fetching summary slots when experimental settings fail", async () => {
    mockInstanceSettingsApi.getExperimental.mockRejectedValue(new Error("settings unavailable"));

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toBe("");
    expect(mockSummarySlotsApi.get).not.toHaveBeenCalled();
    expect(mockBuiltInAgentsApi.list).not.toHaveBeenCalled();
  });

  it("does not query built-in agents when their feature flag is off", async () => {
    mockInstanceSettingsApi.getExperimental.mockResolvedValue({
      enableSummaries: true,
      enableBuiltInAgents: false,
    });

    root = renderCard(container);
    await flushQueries();

    expect(mockBuiltInAgentsApi.list).not.toHaveBeenCalled();
  });

  it.each([
    ["en", "Set up the Summarizer", "Set up Summarizer"],
    ["pt-BR", "Configurar o Summarizer", "Configurar o Summarizer"],
  ])("localizes the setup CTA when the Summarizer needs setup in %s", async (locale, title, buttonLabel) => {
    await i18n.changeLanguage(locale);
    mockBuiltInAgentsApi.list.mockResolvedValue([needsSetupSummarizer()]);

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain(title);
    const setupButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === buttonLabel,
    );
    expect(setupButton).not.toBeNull();

    await act(async () => {
      setupButton?.click();
    });
    await flushQueries();

    expect(container.querySelector('[data-testid="configure-modal"]')).not.toBeNull();
  });

  it.each([
    ["en", "Summarizer setup is pending approval"],
    ["pt-BR", "A configuração do Summarizer aguarda aprovação"],
  ])("localizes pending setup approval in %s without offering setup", async (locale, message) => {
    await i18n.changeLanguage(locale);
    mockBuiltInAgentsApi.list.mockResolvedValue([needsSetupSummarizer("pending_approval")]);

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain(message);
    expect([...container.querySelectorAll("button")].some((button) => button.textContent?.includes("Summarizer"))).toBe(false);
  });

  it("clears a stale generation failure after setup succeeds", async () => {
    mockBuiltInAgentsApi.list.mockResolvedValue([needsSetupSummarizer()]);
    mockSummarySlotsApi.get.mockResolvedValue({
      slot: slot({ documentId: "doc-1" }),
      document: summaryDocument(),
      generatingIssue: null,
    } satisfies GetSummarySlotResponse);
    mockSummarySlotsApi.revisions.mockResolvedValue({
      slot: slot({ documentId: "doc-1" }),
      revisions: [revision({ id: "rev-2", revisionNumber: 2 })],
    });
    mockSummarySlotsApi.generate.mockRejectedValue(new Error("Summarizer built-in agent is not configured"));

    root = renderCard(container);
    await flushQueries();

    const refreshButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.includes("Refresh"),
    );
    await act(() => refreshButton?.click());
    await flushQueries();
    expect(container.textContent).toContain("Summary request failed");

    const setupButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Set up Summarizer",
    );
    await act(() => setupButton?.click());
    await flushQueries();
    const finishSetupButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Finish setup",
    );
    await act(() => finishSetupButton?.click());

    expect(container.textContent).not.toContain("Summary request failed");
  });

  it.each([
    ["en", "No summary yet", "Generate summary"],
    ["pt-BR", "Ainda não há resumo", "Gerar resumo"],
  ])("localizes the empty state and starts generation in %s", async (locale, emptyTitle, generateLabel) => {
    await i18n.changeLanguage(locale);
    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain(emptyTitle);
    const generateButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.includes(generateLabel),
    );
    expect(generateButton).not.toBeNull();

    await act(async () => {
      generateButton?.click();
    });
    await flushQueries();

    expect(mockSummarySlotsApi.generate).toHaveBeenCalledWith({
      companyId: "company-1",
      scopeKind: "project",
      scopeId: "project-1",
      slotKey: "header",
    });
  });

  it("updates a local generation-error fallback when the language changes", async () => {
    mockSummarySlotsApi.generate.mockRejectedValue(null);
    root = renderCard(container);
    await flushQueries();

    const generateButton = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Generate summary"));
    await act(async () => { generateButton?.click(); });
    await flushQueries();

    expect(container.textContent).toContain("Summary request failed");
    expect(container.textContent).toContain("Summary generation could not be started.");

    await i18n.changeLanguage("pt-BR");
    await flushQueries();
    expect(container.textContent).toContain("Falha ao solicitar resumo");
    expect(container.textContent).toContain("Não foi possível iniciar a geração do resumo.");
  });

  it("preserves an external generation error while localizing its title", async () => {
    mockSummarySlotsApi.generate.mockRejectedValue(new Error("RAW SUMMARIZER ERROR"));
    root = renderCard(container);
    await flushQueries();

    const generateButton = [...container.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.includes("Generate summary"));
    await act(async () => { generateButton?.click(); });
    await flushQueries();

    expect(container.textContent).toContain("Summary request failed");
    expect(container.textContent).toContain("RAW SUMMARIZER ERROR");
    await i18n.changeLanguage("pt-BR");
    await flushQueries();
    expect(container.textContent).toContain("Falha ao solicitar resumo");
    expect(container.textContent).toContain("RAW SUMMARIZER ERROR");
  });

  it("localizes a 403 summary read failure and preserves the API denial detail", async () => {
    const denial = "User does not have access to this company";
    mockSummarySlotsApi.get.mockRejectedValue(new ApiError(denial, 403, { error: denial }));
    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain("Summary could not be loaded");
    expect(container.textContent).toContain(denial);
    expect(container.textContent).toContain("Retry");
    await i18n.changeLanguage("pt-BR");
    await flushQueries();
    expect(container.textContent).toContain("Não foi possível carregar o resumo");
    expect(container.textContent).toContain(denial);
    expect(container.textContent).toContain("Tentar novamente");
  });

  it.each([
    ["en", "Summary could not be loaded", "Try loading the summary again."],
    ["pt-BR", "Não foi possível carregar o resumo", "Tente carregar o resumo novamente."],
  ])("localizes the read-failure fallback in %s", async (locale, title, fallback) => {
    await i18n.changeLanguage(locale);
    mockSummarySlotsApi.get.mockRejectedValue(null);
    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain(fallback);
    expect(container.querySelector("button")?.textContent).toContain(
      i18n.t("summarySlotCard.actions.retry"),
    );
  });

  it.each([
    ["en", "Summarizer is paused", "Resume agent"],
    ["pt-BR", "O Summarizer está pausado", "Retomar agente"],
  ])("localizes the paused prerequisite in %s", async (locale, title, resumeLabel) => {
    await i18n.changeLanguage(locale);
    mockBuiltInAgentsApi.list.mockResolvedValue([pausedSummarizer()]);

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain(title);
    expect(container.textContent).not.toContain("No summary yet");
    expect(container.textContent).not.toContain("Generate summary");
    expect([...container.querySelectorAll("button")].filter((button) => button.textContent === resumeLabel))
      .toHaveLength(1);
  });

  it.each([
    ["en", "Generating summary"],
    ["pt-BR", "Gerando resumo"],
  ])("localizes an active generating state in %s and preserves its task link", async (locale, label) => {
    await i18n.changeLanguage(locale);
    mockSummarySlotsApi.get.mockResolvedValue({
      slot: slot({ status: "generating", generatingIssueId: "issue-1" }),
      document: null,
      generatingIssue: issue({ status: "in_progress" }),
    } satisfies GetSummarySlotResponse);

    root = renderCard(container);
    await flushQueries();

    expect(container.firstElementChild?.tagName).toBe("SECTION");
    expect(container.firstElementChild?.className).toContain("space-y-4");
    expect(container.querySelector('[data-slot="card"]')).toBeNull();
    expect(container.textContent).toContain(label);
    expect(container.textContent).toContain("PAP-14000: Summarize project");
    expect(container.querySelector('a[href="/issues/PAP-14000"]')).not.toBeNull();
    expect(container.querySelector('a[href="/issues/PAP-14000"]')?.closest("div")?.parentElement?.className)
      .not.toContain("border");
  });

  it("renders the latest generated markdown", async () => {
    mockSummarySlotsApi.get.mockResolvedValue({
      slot: slot({ documentId: "doc-1" }),
      document: summaryDocument({ body: "## Needs you\nReview the launch notes." }),
      generatingIssue: null,
    } satisfies GetSummarySlotResponse);
    mockSummarySlotsApi.revisions.mockResolvedValue({
      slot: slot({ documentId: "doc-1" }),
      revisions: [revision({ id: "rev-2", revisionNumber: 2, body: "## Needs you\nReview the launch notes." })],
    });

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain("Latest revision");
    expect(container.textContent).toContain("Review the launch notes.");
    expect(container.querySelector('[data-testid="markdown-body"]')?.parentElement?.className).not.toContain("border");
  });

  it("switches to a historical revision from a dated dropdown", async () => {
    // Local, not UTC: the dropdown renders these dates in the machine's
    // timezone, so `2026-07-14T17:10:00.000Z` is the 15th at UTC+9 and the
    // "Jul 14" assertions below fail. Midday local keeps each revision on its
    // intended calendar day everywhere.
    const localAt = (day: number, hour: number) =>
      new Date(2026, 6, day, hour, 0, 0, 0).toISOString();
    mockSummarySlotsApi.get.mockResolvedValue({
      slot: slot({ documentId: "doc-1" }),
      document: summaryDocument({
        body: "## Latest\nCurrent body",
        latestRevisionId: "rev-3",
        latestRevisionNumber: 3,
        updatedAt: localAt(14, 17),
      }),
      generatingIssue: null,
    } satisfies GetSummarySlotResponse);
    mockSummarySlotsApi.revisions.mockResolvedValue({
      slot: slot({ documentId: "doc-1" }),
      revisions: [
        revision({ id: "rev-1", revisionNumber: 1, body: "## Old\nOld body", createdAt: localAt(13, 17) }),
        revision({ id: "rev-2", revisionNumber: 2, body: "## Middle\nMiddle body", createdAt: localAt(14, 9) }),
        revision({ id: "rev-3", revisionNumber: 3, body: "## Latest\nCurrent body", createdAt: localAt(14, 17) }),
      ],
    });

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain("Current body");
    expect(container.textContent).toContain("3 revisions");
    expect(container.textContent).not.toContain("Latest (Rev 3)");
    expect([...container.querySelectorAll<HTMLButtonElement>("button")].some(
      (button) => button.textContent === "Revision 1" || button.textContent === "Rev 1",
    )).toBe(false);

    await openRevisionSelect(container);

    const latestOption = i18n.t("summarySlotCard.revision.latestOption", {
      revision: formatNumber(3),
      date: formatDateTime(localAt(14, 17), { includeYear: false }),
    });
    const firstRevisionOption = i18n.t("summarySlotCard.revision.option", {
      revision: i18n.t("summarySlotCard.revision.label", { revision: formatNumber(1) }),
      date: formatDateTime(localAt(13, 17), { includeYear: false }),
    });
    const secondRevisionOption = i18n.t("summarySlotCard.revision.option", {
      revision: i18n.t("summarySlotCard.revision.label", { revision: formatNumber(2) }),
      date: formatDateTime(localAt(14, 9), { includeYear: false }),
    });
    expect(document.body.textContent).toContain(latestOption);
    expect(document.body.textContent).toContain(firstRevisionOption);
    expect(document.body.textContent).toContain(secondRevisionOption);

    await chooseRevisionOption(firstRevisionOption);

    expect(container.textContent).toContain("Historical revision");
    expect(container.textContent).toContain("Old body");

    const latestButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Latest",
    );
    expect(latestButton).not.toBeNull();

    await act(async () => {
      latestButton?.click();
    });
    await flushQueries();

    expect(container.textContent).toContain("Current body");
    expect(container.textContent).not.toContain("Historical revision");

    await i18n.changeLanguage("pt-BR");
    await flushQueries();
    expect(container.querySelector('button[aria-label="Selecionar revisão do resumo"]')).not.toBeNull();
    expect(container.textContent).toContain("3 revisões");
    expect(container.textContent).toContain("Atualizado");
    await openRevisionSelect(container);
    expect(document.body.textContent).toContain("Mais recente (revisão 3)");
    const portugueseFirstOption = i18n.t("summarySlotCard.revision.option", {
      revision: i18n.t("summarySlotCard.revision.label", { revision: formatNumber(1) }),
      date: formatDateTime(localAt(13, 17), { includeYear: false }),
    });
    expect(document.body.textContent).toContain(portugueseFirstOption);
    expect(portugueseFirstOption).not.toBe(firstRevisionOption);
  });

  it("limits the revision picker to the 30 newest revisions", async () => {
    const revisions = Array.from({ length: 32 }, (_, index) => {
      const revisionNumber = index + 1;
      return revision({
        id: `rev-${revisionNumber}`,
        revisionNumber,
        body: `Revision ${revisionNumber}`,
        createdAt: new Date(Date.UTC(2026, 6, revisionNumber, 12)).toISOString(),
      });
    });
    mockSummarySlotsApi.get.mockResolvedValue({
      slot: slot({ documentId: "doc-1" }),
      document: summaryDocument({
        body: "Revision 32",
        latestRevisionId: "rev-32",
        latestRevisionNumber: 32,
      }),
      generatingIssue: null,
    } satisfies GetSummarySlotResponse);
    mockSummarySlotsApi.revisions.mockResolvedValue({
      slot: slot({ documentId: "doc-1" }),
      revisions,
    });

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain("32 revisions");

    await openRevisionSelect(container);

    const options = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'));
    expect(options).toHaveLength(30);
    expect(options.some((option) => option.textContent?.includes("Latest (revision 32)"))).toBe(true);
    expect(options.some((option) => option.textContent?.includes("Revision 3 —"))).toBe(true);
    expect(options.some((option) => option.textContent?.includes("Revision 2 —"))).toBe(false);
    expect(options.some((option) => option.textContent?.includes("Revision 1 —"))).toBe(false);
  });

  it.each([
    ["en", "Summary generation failed", "Retry"],
    ["pt-BR", "Falha ao gerar resumo", "Tentar novamente"],
  ])("localizes a stopped generation while preserving the failure detail in %s", async (locale, title, retryLabel) => {
    await i18n.changeLanguage(locale);
    mockSummarySlotsApi.get.mockResolvedValue({
      slot: slot({
        status: "failed",
        failureReason: "Summary generation task PAP-14000 finished without writing a summary.",
        generatingIssueId: "issue-1",
      }),
      document: null,
      generatingIssue: issue({ status: "done" }),
    } satisfies GetSummarySlotResponse);

    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain("PAP-14000 finished without writing a summary");
    expect(container.querySelector('[role="note"]')?.className).toContain("text-red-700");
    const retryButton = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === retryLabel,
    );
    expect(retryButton).not.toBeNull();

    await act(async () => {
      retryButton?.click();
    });
    await flushQueries();

    expect(mockSummarySlotsApi.generate).toHaveBeenCalled();
  });

  it.each([
    ["en", "Summary generation failed", "The generation task ended before writing a summary."],
    ["pt-BR", "Falha ao gerar resumo", "A tarefa de geração terminou sem gravar um resumo."],
  ])("localizes a missing generation failure reason in %s", async (locale, title, fallback) => {
    await i18n.changeLanguage(locale);
    mockSummarySlotsApi.get.mockResolvedValue({
      slot: slot({ status: "failed", failureReason: null, generatingIssueId: "issue-1" }),
      document: null,
      generatingIssue: issue({ status: "done" }),
    } satisfies GetSummarySlotResponse);
    root = renderCard(container);
    await flushQueries();

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain(fallback);
    expect([...container.querySelectorAll("button")].some(
      (button) => button.textContent === i18n.t("summarySlotCard.actions.retry"),
    )).toBe(true);
  });
});
