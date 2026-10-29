// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StatusCard, StatusCardSummaryRevision, StatusCardUpdate } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import type { StatusCardView } from "./types";
import { StatusCardDetailDrawer } from "./StatusCardDetailDrawer";

const statusCardsApi = vi.hoisted(() => ({
  updates: vi.fn(),
  summaryRevisions: vi.fn(),
  dryRun: vi.fn(),
  refresh: vi.fn(),
  recompile: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/api/statusCards", () => ({ statusCardsApi }));
vi.mock("@/components/useSummaryDraftStream", () => ({
  useSummaryDraftStream: () => ({ runId: null, statusLine: null, draft: null, draftClosed: false, hasStream: false }),
}));
vi.mock("@/components/MarkdownBody", () => ({ MarkdownBody: ({ children }: { children: string }) => <div>{children}</div> }));
vi.mock("./StatusCardSettingsForm", () => ({
  StatusCardSettingsForm: () => null,
  defaultSettingsValue: () => ({
    refreshPolicy: {
      mode: "manual",
      triggers: {
        statusTransitions: true,
        membershipChanges: true,
        humanComments: true,
        assigneeChanges: true,
        anyUpdate: false,
      },
    },
  }),
}));
vi.mock("./SummarizerAgentSelect", () => ({ SummarizerAgentSelect: () => null }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function baseCard(overrides: Partial<StatusCardView> = {}): StatusCardView {
  const card: StatusCard = {
    id: "card-1",
    companyId: "company-1",
    createdByUserId: null,
    createdByAgentId: null,
    title: "USER CARD TITLE",
    titlePinned: false,
    interestPrompt: "USER CARD PROMPT",
    queries: [],
    queryVersion: 0,
    queryCompiledAt: null,
    queryCompiledByAgentId: null,
    agentId: null,
    refreshPolicy: {
      mode: "manual",
      triggers: {
        statusTransitions: true,
        membershipChanges: true,
        humanComments: true,
        assigneeChanges: true,
        anyUpdate: false,
      },
    },
    state: "active",
    pendingChangeCount: 0,
    lastChangeAt: null,
    fingerprint: null,
    fingerprintAt: null,
    mentionedIssueIds: [],
    documentId: null,
    lastUpdateRunKind: null,
    lastGeneratedAt: new Date().toISOString(),
    lastModel: null,
    generatingIssueId: null,
    failureReason: null,
    nextEvalAt: null,
    archivedAt: null,
    archivedByUserId: null,
    archivedByAgentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return { ...card, summaryBody: "USER SUMMARY", ...overrides };
}

let container: HTMLDivElement;
let root: Root;
let previousLanguage = "pt-BR";

async function flush() {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function render(card: StatusCardView) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <StatusCardDetailDrawer
            card={card}
            companyId="company-1"
            open
            onOpenChange={vi.fn()}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return client;
}

function visibleText() {
  return document.body.textContent ?? "";
}

function buttonNamed(name: string) {
  return Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === name);
}

function summaryUpdate(
  id: string,
  kind: "full" | "incremental",
  changes: StatusCardUpdate["changes"],
  startedAt: string,
  changeSummary: string | null,
): StatusCardUpdate {
  return {
    id,
    cardId: "card-1",
    kind,
    trigger: "manual",
    generationIssueId: null,
    runId: null,
    changes,
    inputTokens: 120,
    outputTokens: 80,
    costCents: 1,
    model: null,
    queryVersion: 1,
    changeSummary,
    startedAt,
    finishedAt: startedAt,
    status: "ok",
    error: null,
  };
}

async function selectRevision(optionPrefix: string, ariaLabel: string) {
  const trigger = document.body.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`);
  expect(trigger).toBeTruthy();
  await act(async () => {
    trigger!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  });
  await flush();
  const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'))
    .find((candidate) => candidate.textContent?.trim().startsWith(optionPrefix));
  expect(option).toBeTruthy();
  await act(async () => { option!.click(); });
  await flush();
}

beforeAll(() => { previousLanguage = i18n.language; });
afterAll(async () => { await i18n.changeLanguage(previousLanguage); });
beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
  statusCardsApi.updates.mockReset().mockResolvedValue([]);
  statusCardsApi.summaryRevisions.mockReset().mockResolvedValue([]);
  statusCardsApi.dryRun.mockReset().mockResolvedValue({ queries: [], mentionedIssues: [] });
  statusCardsApi.refresh.mockReset().mockResolvedValue({});
  statusCardsApi.recompile.mockReset().mockResolvedValue({});
  statusCardsApi.patch.mockReset().mockResolvedValue({});
  container = document.createElement("div");
  document.body.appendChild(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("StatusCardDetailDrawer shell localization", () => {
  it("localizes the header, status, tabs, refresh action, queued feedback, and close label while the language changes", async () => {
    const client = await render(baseCard());
    await flush();

    expect(visibleText()).toContain("USER CARD TITLE");
    expect(visibleText()).toContain("USER SUMMARY");
    expect(visibleText()).toContain("Atualizado");
    expect(visibleText()).toContain("Resumo");
    expect(visibleText()).toContain("Configurações");
    expect(visibleText()).toContain("Tarefas acompanhadas");
    expect(visibleText()).toContain("Histórico");
    expect(visibleText()).toContain("Fechar");

    let finishRefresh!: (value: unknown) => void;
    statusCardsApi.refresh.mockReturnValue(new Promise((resolve) => { finishRefresh = resolve; }));
    await act(async () => {
      buttonNamed("Atualizar")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flush();
    expect(statusCardsApi.refresh).toHaveBeenCalledWith("card-1");
    expect(buttonNamed("Atualizando…")).toBeDefined();
    await act(async () => { finishRefresh({}); });
    await flush();
    expect(visibleText()).toContain("Atualização na fila");

    await act(async () => { await i18n.changeLanguage("en"); });
    await flush();
    expect(visibleText()).toContain("USER CARD TITLE");
    expect(visibleText()).toContain("USER SUMMARY");
    expect(visibleText()).toContain("Fresh");
    expect(visibleText()).toContain("Updated");
    expect(visibleText()).toContain("Summary");
    expect(visibleText()).toContain("Settings");
    expect(visibleText()).toContain("Watched issues");
    expect(visibleText()).toContain("History");
    expect(visibleText()).toContain("Refresh queued");
    expect(visibleText()).toContain("Close");
    expect(buttonNamed("Refresh")).toBeDefined();
    client.clear();
  });

  it("localizes run failures and retains the card title across languages", async () => {
    const card = baseCard({ state: "compiling", lastGeneratedAt: null });
    await render(card);
    await flush();

    expect(visibleText()).toContain("Em preparação");
    expect(buttonNamed("Executar agora")).toBeDefined();
    statusCardsApi.recompile.mockRejectedValue(null);
    await act(async () => {
      buttonNamed("Executar agora")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flush();
    expect(statusCardsApi.recompile).toHaveBeenCalledWith("card-1");
    expect(visibleText()).toContain("Não foi possível executar o cartão.");
    expect(visibleText()).toContain("Atenção");

    await act(async () => { await i18n.changeLanguage("en"); });
    await flush();
    expect(visibleText()).toContain("USER CARD TITLE");
    expect(visibleText()).toContain("Setting up");
    expect(buttonNamed("Run now")).toBeDefined();
    expect(visibleText()).toContain("Could not run the card.");
    expect(visibleText()).toContain("Heads up");
  });

  it("localizes revision history and integrated changes while preserving revision content and issue links", async () => {
    const now = Date.now();
    const latestAt = new Date(now - 60_000).toISOString();
    const middleAt = new Date(now - 5 * 60_000).toISOString();
    const oldestAt = new Date(now - 10 * 60_000).toISOString();
    const latestId = "00000000-0000-4000-8000-000000000031";
    const middleId = "00000000-0000-4000-8000-000000000032";
    const oldestId = "00000000-0000-4000-8000-000000000033";
    const revisions: StatusCardSummaryRevision[] = [
      { id: latestId, revisionNumber: 3, title: null, body: "LATEST REVISION BODY", changeSummary: "Latest dynamic changes", createdAt: latestAt },
      { id: middleId, revisionNumber: 2, title: null, body: "", changeSummary: "MIDDLE DYNAMIC CHANGE SUMMARY", createdAt: middleAt },
      { id: oldestId, revisionNumber: 1, title: null, body: "", changeSummary: null, createdAt: oldestAt },
    ];
    const updates: StatusCardUpdate[] = [
      summaryUpdate(latestId, "incremental", [
        { issueId: "00000000-0000-4000-8000-000000000041", identifier: "PAP-201", from: null, to: null, changeKind: "new" },
        { issueId: "00000000-0000-4000-8000-000000000042", identifier: "PAP-202", from: null, to: null, changeKind: "assignee" },
      ], latestAt, "Latest dynamic changes"),
      summaryUpdate(middleId, "full", [
        { issueId: "00000000-0000-4000-8000-000000000043", identifier: "PAP-102", from: null, to: null, changeKind: "removed" },
      ], middleAt, "MIDDLE DYNAMIC CHANGE SUMMARY"),
      summaryUpdate(oldestId, "full", [
        { issueId: "00000000-0000-4000-8000-000000000044", identifier: "PAP-101", from: null, to: null, changeKind: "updated" },
      ], oldestAt, null),
    ];
    statusCardsApi.updates.mockResolvedValue(updates);
    statusCardsApi.summaryRevisions.mockResolvedValue(revisions);

    await render(baseCard({
      documentId: "00000000-0000-4000-8000-000000000030",
      summaryBody: "LATEST DYNAMIC SUMMARY",
    }));
    await flush();

    expect(visibleText()).toContain("LATEST DYNAMIC SUMMARY");
    expect(visibleText()).toContain("Revisão 3 · mais recente");
    expect(visibleText()).toContain("Integrado nesta atualização");
    expect(visibleText()).toContain("2 alterações");
    expect(visibleText()).toContain("Novo item corresponde à consulta");
    expect(document.body.querySelector('a[href="/issues/PAP-201"]')).toBeTruthy();

    await selectRevision("Rev. 2", "Selecionar revisão do resumo");
    expect(visibleText()).toContain("MIDDLE DYNAMIC CHANGE SUMMARY");
    expect(visibleText()).toContain("O texto completo do resumo desta revisão está indisponível");
    expect(visibleText()).toContain("Integrado nesta revisão");
    expect(visibleText()).toContain("1 alteração");
    expect(visibleText()).toContain("Deixou de corresponder à consulta");
    expect(document.body.querySelector('a[href="/issues/PAP-102"]')).toBeTruthy();

    await act(async () => { await i18n.changeLanguage("en"); });
    await flush();
    expect(visibleText()).toContain("MIDDLE DYNAMIC CHANGE SUMMARY");
    expect(visibleText()).toContain("Revision 2 · full rebuild");
    expect(visibleText()).toContain("The full summary text for this revision is unavailable");
    expect(visibleText()).toContain("Integrated in this revision");
    expect(visibleText()).toContain("1 change");
    expect(visibleText()).toContain("Left the query");
    expect(document.body.querySelector('a[href="/issues/PAP-102"]')).toBeTruthy();

    await selectRevision("Rev. 1", "Select summary revision");
    expect(visibleText()).toContain("No change summary was recorded for this revision.");
    expect(visibleText()).toContain("1 change");
    expect(visibleText()).toContain("Issue updated");
    expect(document.body.querySelector('a[href="/issues/PAP-101"]')).toBeTruthy();
  });

  it("localizes empty-summary setup states and keeps the setup task link intact", async () => {
    await render(baseCard({
      summaryBody: null,
      state: "compiling",
      generatingIssueId: "00000000-0000-4000-8000-000000000051",
      lastGeneratedAt: null,
    }));
    await flush();

    expect(visibleText()).toContain("Preparando — o primeiro resumo será gerado automaticamente quando isso terminar.");
    expect(visibleText()).toContain("Ver tarefa de configuração");
    expect(document.body.querySelector('a[href="/issues/00000000-0000-4000-8000-000000000051"]')).toBeTruthy();

    await act(async () => { await i18n.changeLanguage("en"); });
    await flush();
    expect(visibleText()).toContain("Setting up — the first summary is generated automatically once this finishes.");
    expect(visibleText()).toContain("View setup task");
    expect(document.body.querySelector('a[href="/issues/00000000-0000-4000-8000-000000000051"]')).toBeTruthy();
  });

  it("localizes an incomplete setup", async () => {
    await render(baseCard({ summaryBody: null, state: "compiling", generatingIssueId: null, lastGeneratedAt: null }));
    await flush();

    expect(visibleText()).toContain("A configuração não foi concluída. Execute agora para tentar novamente.");

    await act(async () => { await i18n.changeLanguage("en"); });
    await flush();
    expect(visibleText()).toContain("Setup didn’t finish. Run it now to try again.");
  });

  it("localizes the no-summary fallback", async () => {
    await render(baseCard({ summaryBody: null }));
    await flush();

    expect(visibleText()).toContain("Ainda não há resumo — o primeiro será gerado automaticamente quando a configuração deste cartão terminar.");

    await act(async () => { await i18n.changeLanguage("en"); });
    await flush();
    expect(visibleText()).toContain("No summary yet — the first one is generated automatically once this card finishes setting up.");
  });
});
