// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StatusCard } from "@paperclipai/shared";
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
});
