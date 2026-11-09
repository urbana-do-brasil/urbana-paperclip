// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent, RoutineDetail } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { RoutineDetailContext, type RoutineDetailContextValue } from "./context";
import { ActivitySection, RunsSection } from "./operate-sections";

const mocks = vi.hoisted(() => ({
  issuesApi: { list: vi.fn(), update: vi.fn() },
  pushToast: vi.fn(),
}));

vi.mock("@/api/issues", () => ({ issuesApi: mocks.issuesApi }));
vi.mock("@/context/ToastContext", () => ({
  useToastActions: () => ({ pushToast: mocks.pushToast }),
}));
vi.mock("../IssuesList", () => ({
  IssuesList: ({
    issueLinkState,
    onUpdateIssue,
  }: {
    issueLinkState: { issueDetailBreadcrumb: { label: string } };
    onUpdateIssue: (id: string, data: Record<string, unknown>) => void;
  }) => (
    <div>
      <span data-testid="runs-breadcrumb">{issueLinkState.issueDetailBreadcrumb.label}</span>
      <button onClick={() => onUpdateIssue("task-1", { status: "done" })}>Update task</button>
    </div>
  ),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let queryClient: QueryClient;
const routine = { id: "routine-1", companyId: "company-1" } as RoutineDetail;
const context = {
  routine,
  routineId: routine.id,
  companyId: routine.companyId,
  agents: [],
  projects: [],
  hasLiveRun: false,
  activeIssueId: undefined,
  activity: [],
} as unknown as RoutineDetailContextValue;

async function render(child: ReactNode = <RunsSection />, value: RoutineDetailContextValue = context) {
  await act(async () => root.render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <RoutineDetailContext.Provider value={value}>
          {child}
        </RoutineDetailContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  ));
}

beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
  vi.clearAllMocks();
  mocks.issuesApi.list.mockResolvedValue([]);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  container.remove();
  await i18n.changeLanguage("en");
});

describe("RunsSection localization", () => {
  it("uses the localized runs breadcrumb and task update error in Portuguese", async () => {
    mocks.issuesApi.update.mockRejectedValue(new Error("dynamic API detail"));
    await render();
    expect(container.querySelector('[data-testid="runs-breadcrumb"]')?.textContent).toBe("Execuções");
    await act(async () => {
      container.querySelector("button")?.click();
    });
    await vi.waitFor(() => expect(mocks.pushToast).toHaveBeenCalledWith({
      title: "Não foi possível atualizar a tarefa",
      body: "dynamic API detail",
      tone: "error",
    }));
  });

  it("uses the English runs breadcrumb and task update error", async () => {
    await i18n.changeLanguage("en");
    mocks.issuesApi.update.mockRejectedValue(new Error("dynamic API detail"));
    await render();
    expect(container.querySelector('[data-testid="runs-breadcrumb"]')?.textContent).toBe("Runs");
    await act(async () => {
      container.querySelector("button")?.click();
    });
    await vi.waitFor(() => expect(mocks.pushToast).toHaveBeenCalledWith({
      title: "Could not update task",
      body: "dynamic API detail",
      tone: "error",
    }));
  });

  it("localizes activity states and dates while preserving event details in Portuguese", async () => {
    await render(<ActivitySection isLoading />);
    expect(container.textContent).toContain("Carregando atividade…");

    await render(<ActivitySection />);
    expect(container.textContent).toContain("Ainda não há atividade.");

    const details = { source: "manual", status: "issue_created", taskId: "task-123" };
    const event = {
      id: "event-1",
      action: "routine.run_triggered",
      details,
      createdAt: "2026-04-20T14:30:00.000Z",
    } as unknown as ActivityEvent;
    await render(<ActivitySection />, { ...context, activity: [event] });
    expect(container.textContent).toContain(new Date(event.createdAt).toLocaleDateString("pt-BR", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }));
    expect(container.textContent).toContain("Rotina iniciada");
    expect(container.textContent).toContain("Manual · Tarefa criada");

    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("pre")?.textContent).toBe(JSON.stringify(details, null, 2));
  });

  it("formats activity dates and known event labels in English", async () => {
    await i18n.changeLanguage("en");
    const event = {
      id: "event-2",
      action: "routine.run_triggered",
      details: { source: "manual", status: "issue_created" },
      createdAt: "2026-04-20T14:30:00.000Z",
    } as unknown as ActivityEvent;
    await render(<ActivitySection />, { ...context, activity: [event] });
    expect(container.textContent).toContain(new Date(event.createdAt).toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }));
    expect(container.textContent).toContain("Routine started");
    expect(container.textContent).toContain("Manual · Task created");
  });
});
