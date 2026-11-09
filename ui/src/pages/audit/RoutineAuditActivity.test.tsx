// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { RoutineAuditActivity } from "./RoutineAuditActivity";

const getRoutineMock = vi.hoisted(() => vi.fn());
const listRoutineRunsMock = vi.hoisted(() => vi.fn());
const routineActivityMock = vi.hoisted(() => vi.fn());

vi.mock("@/api/routines", () => ({
  routinesApi: {
    get: (routineId: string) => getRoutineMock(routineId),
    listRuns: (routineId: string, limit?: number) => listRoutineRunsMock(routineId, limit),
    activity: (
      companyId: string,
      routineId: string,
      scope: { triggerIds: string[]; runIds: string[] },
    ) => routineActivityMock(companyId, routineId, scope),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function flushReact() {
  for (let index = 0; index < 3; index += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

describe("RoutineAuditActivity", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    getRoutineMock.mockResolvedValue({ triggers: [{ id: "trigger-1" }, { id: "trigger-2" }] });
    listRoutineRunsMock.mockResolvedValue([{ id: "run-1" }, { id: "run-2" }]);
    routineActivityMock.mockResolvedValue([
      {
        id: "event-1",
        action: "routine.run.completed",
        details: { runId: "run-1" },
        createdAt: new Date("2026-08-31T18:01:05.000Z"),
      },
    ]);
  });

  afterEach(async () => {
    flushSync(() => root?.unmount());
    container.remove();
    vi.clearAllMocks();
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it("loads activity through the routine endpoint with its trigger and run scope", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(container);
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RoutineAuditActivity companyId="company-1" routineId="routine-1" />
        </QueryClientProvider>,
      );
    });
    await act(async () => { await flushReact(); });

    expect(getRoutineMock).toHaveBeenCalledWith("routine-1");
    expect(listRoutineRunsMock).toHaveBeenCalledWith("routine-1", 200);
    expect(routineActivityMock).toHaveBeenCalledWith("company-1", "routine-1", {
      triggerIds: ["trigger-1", "trigger-2"],
      runIds: ["run-1", "run-2"],
    });
    expect(container.textContent).toContain("Run completed");
    expect(container.textContent).not.toContain("routine.run.completed");
  });

  it("localizes known routine events without changing the expandable audit payload", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    routineActivityMock.mockResolvedValueOnce([
      {
        id: "event-1",
        action: "routine.run.completed",
        details: { runId: "run-1" },
        createdAt: new Date("2026-08-31T18:01:05.000Z"),
      },
      {
        id: "event-2",
        action: "routine.run_triggered",
        details: { source: "schedule", status: "issue_created" },
        createdAt: new Date("2026-08-31T18:00:00.000Z"),
      },
      {
        id: "event-3",
        action: "routine.revision_restored",
        details: null,
        createdAt: new Date("2026-08-31T17:00:00.000Z"),
      },
      {
        id: "event-4",
        action: "routine.future_event",
        details: null,
        createdAt: new Date("2026-08-31T16:00:00.000Z"),
      },
    ]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(container);
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RoutineAuditActivity companyId="company-1" routineId="routine-1" />
        </QueryClientProvider>,
      );
    });
    await act(async () => { await flushReact(); });

    expect(container.textContent).toContain("Execução concluída");
    expect(container.textContent).toContain("Agendamento · Tarefa criada");
    expect(container.textContent).toContain("Rotina iniciada");
    expect(container.textContent).toContain("Revisão da rotina restaurada");
    expect(container.textContent).toContain("Future event");
    expect(container.querySelector('[title="routine.future_event"]')).toBeTruthy();
    expect(container.textContent).not.toContain("routine.run.completed");
    const eventButton = container.querySelector("button")!;
    await act(async () => { eventButton.click(); });
    expect(container.querySelector("pre")?.textContent).toContain('"runId": "run-1"');
    expect(routineActivityMock).toHaveBeenCalledWith("company-1", "routine-1", {
      triggerIds: ["trigger-1", "trigger-2"],
      runIds: ["run-1", "run-2"],
    });
  });

  it("localizes an empty routine activity state", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    routineActivityMock.mockResolvedValueOnce([]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(container);
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RoutineAuditActivity companyId="company-1" routineId="routine-1" />
        </QueryClientProvider>,
      );
    });
    await act(async () => { await flushReact(); });
    expect(container.textContent).toContain("Ainda não há atividade nesta rotina.");
  });

  it("localizes known API failures and keeps unknown diagnostics available as details", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    routineActivityMock.mockRejectedValueOnce(Object.assign(new Error("Validation error"), {
      body: { error: "Validation error", messageKey: "validation" },
    }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(container);
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <RoutineAuditActivity companyId="company-1" routineId="routine-1" />
        </QueryClientProvider>,
      );
    });
    await act(async () => { await flushReact(); });

    expect(container.textContent).toContain(
      "Os dados enviados são inválidos. Revise os campos e tente novamente.",
    );
    expect(container.textContent).not.toContain("Validation error");
    expect(container.querySelector("button")?.textContent).toBe("Tentar novamente");

    await act(async () => { root.unmount(); });
    routineActivityMock.mockRejectedValueOnce(new Error("Vendor: unavailable (token redacted)"));
    const retryQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(container);
    flushSync(() => {
      root.render(
        <QueryClientProvider client={retryQueryClient}>
          <RoutineAuditActivity companyId="company-1" routineId="routine-1" />
        </QueryClientProvider>,
      );
    });
    await act(async () => { await flushReact(); });
    expect(container.textContent).toContain(
      "Não foi possível concluir a solicitação. Detalhes: Vendor: unavailable (token redacted)",
    );
  });
});
