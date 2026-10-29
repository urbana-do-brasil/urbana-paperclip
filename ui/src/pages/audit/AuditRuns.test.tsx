// @vitest-environment jsdom

import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { HeartbeatRun, RoutineRunSummary } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { AuditRuns } from "./AuditRuns";

const listAgentsMock = vi.hoisted(() => vi.fn());
const listRunsMock = vi.hoisted(() => vi.fn());
const listRoutineRunsMock = vi.hoisted(() => vi.fn());
const setSearchParamsMock = vi.hoisted(() => vi.fn());
let currentSearch = "";

vi.mock("@/api/agents", () => ({
  agentsApi: { list: (companyId: string) => listAgentsMock(companyId) },
}));

vi.mock("@/api/heartbeats", () => ({
  heartbeatsApi: {
    list: (companyId: string, agentId?: string, limit?: number, options?: unknown) =>
      listRunsMock(companyId, agentId, limit, options),
  },
}));

vi.mock("@/api/routines", () => ({
  routinesApi: {
    listRuns: (routineId: string, limit?: number) => listRoutineRunsMock(routineId, limit),
  },
}));

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useSearchParams: () => [new URLSearchParams(currentSearch), setSearchParamsMock],
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function run(overrides: Partial<HeartbeatRun> = {}): HeartbeatRun {
  return {
    id: "run-12345678",
    companyId: "company-1",
    agentId: "agent-1",
    invocationSource: "manual",
    status: "succeeded",
    startedAt: new Date("2026-08-31T18:00:00.000Z"),
    finishedAt: new Date("2026-08-31T18:01:05.000Z"),
    resultJson: { summary: "Reviewed the release checklist" },
    error: null,
    createdAt: new Date("2026-08-31T18:00:00.000Z"),
    ...overrides,
  } as HeartbeatRun;
}

function routineRun(overrides: Partial<RoutineRunSummary> = {}): RoutineRunSummary {
  return {
    id: "routine-run-1",
    companyId: "company-1",
    routineId: "routine-1",
    triggerId: "trigger-1",
    source: "schedule",
    status: "succeeded",
    triggeredAt: new Date("2026-08-31T18:00:00.000Z"),
    idempotencyKey: null,
    triggerPayload: null,
    dispatchFingerprint: null,
    linkedIssueId: "issue-1",
    coalescedIntoRunId: null,
    failureReason: null,
    completedAt: new Date("2026-08-31T18:01:05.000Z"),
    createdAt: new Date("2026-08-31T18:00:00.000Z"),
    updatedAt: new Date("2026-08-31T18:01:05.000Z"),
    linkedIssue: { id: "issue-1", identifier: "TES-42", title: "Publish forecast" },
    trigger: { id: "trigger-1", kind: "schedule", label: "Daily forecast" },
    ...overrides,
  } as RoutineRunSummary;
}

async function flushReact() {
  for (let index = 0; index < 3; index += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

describe("AuditRuns", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    currentSearch = "";
    container = document.createElement("div");
    document.body.appendChild(container);
    listAgentsMock.mockResolvedValue([{ id: "agent-1", name: "Fable" }]);
    listRunsMock.mockResolvedValue([run()]);
    listRoutineRunsMock.mockResolvedValue([routineRun()]);
  });

  afterEach(async () => {
    flushSync(() => root?.unmount());
    container.remove();
    vi.clearAllMocks();
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  async function render(routineId?: string) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(container);
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <AuditRuns companyId="company-1" routineId={routineId} />
        </QueryClientProvider>,
      );
    });
    await flushReact();
  }

  it("renders a filterable flat run list with existing run-detail links", async () => {
    await render();

    expect(listRunsMock).toHaveBeenCalledWith("company-1", undefined, 200, { summary: true });
    expect(container.textContent).toContain("Agent");
    expect(container.textContent).toContain("Status");
    expect(container.textContent).toContain("Reviewed the release checklist");
    expect(container.textContent).toContain("1m 5s");
    const list = container.querySelector('ul[aria-label="Recent runs"]');
    expect(list).toBeTruthy();
    expect(list?.closest('[data-slot="card"]')).toBeFalsy();
    expect(container.querySelector('a[href="/agents/agent-1/runs/run-12345678"]')).toBeTruthy();
  });

  it("uses the agent deep-link filter for both the query key and request", async () => {
    currentSearch = "agentId=agent-1&runStatus=succeeded";
    await render();

    expect(listRunsMock).toHaveBeenCalledWith("company-1", "agent-1", 200, { summary: true });
    expect(container.textContent).toContain("Clear filters");
  });

  it("loads routine runs directly when the Audit scope is a routine", async () => {
    await render("routine-1");

    expect(listRoutineRunsMock).toHaveBeenCalledWith("routine-1", 200);
    expect(listAgentsMock).not.toHaveBeenCalled();
    expect(listRunsMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Publish forecast");
    expect(container.textContent).toContain("Daily forecast");
    expect(container.querySelector('a[href="/issues/TES-42"]')).toBeTruthy();
  });

  it("localizes run labels and statuses while preserving summaries and links", async () => {
    await i18n.changeLanguage("pt-BR");
    currentSearch = "agentId=agent-1&runStatus=succeeded";
    await render();

    expect(container.textContent).toContain("Execuções");
    expect(container.textContent).toContain("Agente");
    expect(container.textContent).toContain("Status");
    expect(container.textContent).toContain("Limpar filtros");
    expect(container.textContent).toContain("Concluída");
    expect(container.textContent).toContain("Reviewed the release checklist");
    expect(container.textContent).toContain("1 min 5 s");
    expect(listRunsMock).toHaveBeenCalledWith("company-1", "agent-1", 200, { summary: true });
    expect(container.querySelector('a[href="/agents/agent-1/runs/run-12345678"]')).toBeTruthy();
  });

  it("localizes the empty state and pagination copy in Brazilian Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");
    listRunsMock.mockResolvedValueOnce([]);
    await render();

    expect(container.textContent).toContain("Ainda não há execuções.");
    expect(container.textContent).toContain("Mostrando as 200 execuções mais recentes.");
  });

  it("localizes owned request errors and preserves unknown API details", async () => {
    await i18n.changeLanguage("pt-BR");
    const knownError = Object.assign(new Error("Validation error"), {
      body: { error: "Validation error", messageKey: "validation" },
    });
    listRunsMock.mockRejectedValueOnce(knownError);
    await render();
    expect(container.textContent).toContain(
      "Os dados enviados são inválidos. Revise os campos e tente novamente.",
    );
    expect(container.textContent).not.toContain("Validation error");

    flushSync(() => root.unmount());
    listRunsMock.mockRejectedValueOnce(new Error("Vendor: unavailable (token redacted)"));
    await render();
    expect(container.textContent).toContain(
      "Não foi possível concluir a solicitação. Detalhes: Vendor: unavailable (token redacted)",
    );
  });
});
