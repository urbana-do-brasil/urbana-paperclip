// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import type { HeartbeatRun, WorkspaceOperation } from "@paperclipai/shared";
import { afterEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { LogViewer, RunInvocationCard } from "./AgentDetail";
import { LogViewer as ProductionLogViewer, RunInvocationCard as ProductionRunInvocationCard } from "./AgentDetail.production";

const { log, events, empty, workspaceOperations } = vi.hoisted(() => ({
  log: vi.fn(),
  events: vi.fn(async () => []),
  empty: [],
  workspaceOperations: [] as WorkspaceOperation[],
}));
vi.mock("../api/heartbeats", () => ({ heartbeatsApi: { log, events } }));
vi.mock("@tanstack/react-query", async (original) => ({
  ...await original<typeof import("@tanstack/react-query")>(),
  useQuery: (options: { queryKey?: readonly unknown[] }) => ({
    data: options.queryKey?.[2] === "workspace-operations" ? workspaceOperations : empty,
  }),
}));
vi.mock("../adapters", () => ({
  getUIAdapter: () => null,
  onAdapterChange: () => () => {},
  buildTranscript: (lines: unknown[]) => lines,
}));
vi.mock("../components/transcript/RunTranscriptView", () => ({
  RunTranscriptView: ({ entries }: { entries: Array<{ chunk: string }> }) => <div>{entries.map(line => line.chunk).join(" ")}</div>,
}));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); log.mockReset(); events.mockClear(); workspaceOperations.length = 0; await i18n.changeLanguage(DEFAULT_LOCALE); });

it.each([LogViewer, ProductionLogViewer])("retains legacy history and reads only the next offset on visibility recovery (%#)", async (Viewer) => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const row = (seq: number, chunk: string) => JSON.stringify({ seq, ts: `2026-09-10T12:00:0${seq}Z`, stream: "stdout", chunk }) + "\n";
  const first = row(1, "retained history");
  const second = row(2, "new output");
  log.mockResolvedValueOnce({ content: first, nextOffset: first.length });
  const run = { id: "run-1", companyId: "company-1", agentId: "agent-1", status: "succeeded", logRef: "log" } as HeartbeatRun;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Viewer run={run} adapterType="codex_local" />));
    expect(container.textContent).toContain("retained history");
    expect(container.textContent).toContain("Transcrição (1)");
    await act(async () => {
      visibility.mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(log).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("retained history");
    let complete!: (value: { content: string; nextOffset: number }) => void;
    log.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    await act(async () => {
      visibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(container.textContent).toContain("retained history");
    expect(log).toHaveBeenLastCalledWith("run-1", first.length, expect.any(Number));
    await act(async () => complete({ content: second, nextOffset: first.length + second.length }));
    expect(container.textContent).toContain("retained history new output");
    log.mockResolvedValueOnce({ content: first, nextOffset: first.length });
    await act(async () => root.render(<Viewer run={{ ...run, id: "run-2" }} adapterType="codex_local" />));
    expect(log).toHaveBeenLastCalledWith("run-2", 0, expect.any(Number));
    expect(container.textContent).not.toContain("new output");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it.each([LogViewer, ProductionLogViewer])("localizes the empty log state in Portuguese and English (%#)", async (Viewer) => {
  await i18n.changeLanguage("pt-BR");
  const run = { id: "run-empty", companyId: "company-1", agentId: "agent-1", status: "succeeded", logRef: null } as HeartbeatRun;
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Viewer run={run} adapterType="codex_local" />));
    expect(container.textContent).toContain("Nenhum evento de log.");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("No log events.");
  } finally {
    await act(async () => root.unmount());
  }
});

it.each([LogViewer, ProductionLogViewer])("localizes workspace operation labels and preserves command metadata (%#)", async (Viewer) => {
  await i18n.changeLanguage("pt-BR");
  const operation: WorkspaceOperation = {
    id: "operation-1",
    companyId: "company-1",
    executionWorkspaceId: "workspace-1",
    heartbeatRunId: "run-workspace",
    issueId: null,
    phase: "worktree_prepare",
    command: "git worktree add /tmp/run-workspace",
    cwd: "/tmp/paperclip",
    status: "succeeded",
    exitCode: 0,
    logStore: null,
    logRef: null,
    logBytes: null,
    logSha256: null,
    logCompressed: false,
    stdoutExcerpt: null,
    stderrExcerpt: null,
    metadata: { branchName: "codex/localize-paperclip-pt-br", created: true },
    startedAt: new Date("2026-09-10T12:00:00.000Z"),
    finishedAt: new Date("2026-09-10T12:01:00.000Z"),
    createdAt: new Date("2026-09-10T12:00:00.000Z"),
    updatedAt: new Date("2026-09-10T12:01:00.000Z"),
  };
  workspaceOperations.push(operation);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const line = JSON.stringify({ seq: 1, ts: "2026-09-10T12:00:00.000Z", stream: "stdout", chunk: "run output" }) + "\n";
  log.mockResolvedValueOnce({ content: line, nextOffset: line.length });
  const run = { id: "run-workspace", companyId: "company-1", agentId: "agent-1", status: "succeeded", logRef: "run-log" } as HeartbeatRun;
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Viewer run={run} adapterType="codex_local" />));
    expect(container.textContent).toContain("Operações do espaço de trabalho (1)");
    expect(container.textContent).toContain("Preparação do worktree");
    expect(container.textContent).toContain("Concluída");
    expect(container.textContent).toContain("git worktree add /tmp/run-workspace");
    expect(container.textContent).toContain("/tmp/paperclip");
    expect(container.textContent).toContain("codex/localize-paperclip-pt-br");
    expect(container.textContent).toContain("run output");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("Workspace operations (1)");
    expect(container.textContent).toContain("Worktree setup");
    expect(container.textContent).toContain("Succeeded");
    expect(container.textContent).toContain("git worktree add /tmp/run-workspace");
  } finally {
    await act(async () => root.unmount());
  }
});

it.each([RunInvocationCard, ProductionRunInvocationCard])("localizes invocation labels and preserves adapter and path values (%#)", async (Card) => {
  await i18n.changeLanguage("pt-BR");
  const html = renderToStaticMarkup(
    <Card payload={{ adapterType: "codex_local", cwd: "/tmp/paperclip" }} censorUsernameInLogs={false} />,
  );
  expect(html).toContain("Invocação");
  expect(html).toContain("Adaptador:");
  expect(html).toContain("codex_local");
  expect(html).toContain("Diretório de trabalho:");
  expect(html).toContain("/tmp/paperclip");
  await i18n.changeLanguage("en");
  const englishHtml = renderToStaticMarkup(
    <Card payload={{ adapterType: "codex_local", cwd: "/tmp/paperclip" }} censorUsernameInLogs={false} />,
  );
  expect(englishHtml).toContain("Invocation");
  expect(englishHtml).toContain("Adapter:");
  expect(englishHtml).toContain("Working dir:");
  expect(englishHtml).toContain("/tmp/paperclip");
});

it.each([LogViewer, ProductionLogViewer])("polls logs when WebSocket construction fails and recovers on retry (%#)", async (Viewer) => {
  vi.useFakeTimers();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.stubGlobal("WebSocket", undefined);
  log.mockResolvedValue({ content: "", nextOffset: 0 });
  const run = { id: "run-1", companyId: "company-1", agentId: "agent-1", status: "running", logRef: "log" } as HeartbeatRun;
  const root = createRoot(document.createElement("div"));
  const sockets: Array<{ onopen: (() => void) | null; close: () => void }> = [];
  try {
    await act(async () => root.render(<Viewer run={run} adapterType="codex_local" />));
    const initialReads = log.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(log.mock.calls.length).toBeGreaterThan(initialReads);
    expect(events).toHaveBeenCalled();
    vi.stubGlobal("WebSocket", class {
      onopen = null;
      close = vi.fn();
      constructor() { sockets.push(this); }
    });
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(sockets).toHaveLength(1);
    await act(async () => sockets[0].onopen?.());
    const readsWhenConnected = log.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(log).toHaveBeenCalledTimes(readsWhenConnected);
  } finally {
    await act(async () => root.unmount());
  }
  expect(sockets[0].close).toHaveBeenCalled();
});
