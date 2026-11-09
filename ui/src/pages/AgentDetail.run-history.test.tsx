// @vitest-environment jsdom

import { createElement, type ComponentType, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { HeartbeatRun } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import {
  LatestRunCard as StreamlinedLatestRunCard,
  RunListItem as StreamlinedRunListItem,
  RunsTab as StreamlinedRunsTab,
  type LatestRunIssue,
} from "./AgentDetail";
import {
  LatestRunCard as ProductionLatestRunCard,
  RunListItem as ProductionRunListItem,
  RunsTab as ProductionRunsTab,
} from "./AgentDetail.production";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: unknown }) =>
    createElement("a", { href: to, ...rest }, children as never),
}));
vi.mock("../context/SidebarContext", () => ({ useSidebar: () => ({ isMobile: false }) }));
vi.mock("../components/MarkdownBody", () => ({
  MarkdownBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type RunCardProps = { runs: HeartbeatRun[]; agentId: string; issuesById: Map<string, LatestRunIssue> };
type RunItemProps = { run: HeartbeatRun; isSelected: boolean; agentId: string };
type RunsTabProps = {
  runs: HeartbeatRun[];
  companyId: string;
  agentId: string;
  agentRouteId: string;
  selectedRunId: string | null;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
};

const variants: Array<{
  name: string;
  LatestRunCard: ComponentType<RunCardProps>;
  RunListItem: ComponentType<RunItemProps>;
  RunsTab: ComponentType<RunsTabProps>;
}> = [
  { name: "streamlined", LatestRunCard: StreamlinedLatestRunCard, RunListItem: StreamlinedRunListItem, RunsTab: StreamlinedRunsTab },
  { name: "production", LatestRunCard: ProductionLatestRunCard, RunListItem: ProductionRunListItem, RunsTab: ProductionRunsTab },
];

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> = undefined;
  flushSync(() => { result = callback(); });
  await result;
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let queryClient: QueryClient;

async function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(() => root?.render(
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>,
  ));
  await flushReact();
  return host;
}

function makeRun(): HeartbeatRun {
  return {
    id: "run-12345678-0000-0000-0000-000000000000",
    agentId: "agent-1",
    companyId: "company-1",
    status: "running",
    invocationSource: "timer",
    createdAt: new Date(Date.now() - 5 * 60_000),
    contextSnapshot: null,
    resultJson: { summary: "Keep this run summary exactly as supplied." },
    error: null,
    usageJson: null,
  } as unknown as HeartbeatRun;
}

beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
});

afterEach(async () => {
  await act(() => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  queryClient.clear();
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

describe.each(variants)("$name agent run history", ({ LatestRunCard, RunListItem, RunsTab }) => {
  it("localizes the latest run card and list while preserving run data and routes", async () => {
    const run = makeRun();
    const latest = await render(
      <LatestRunCard runs={[run]} agentId="agent-route" issuesById={new Map()} />,
    );
    expect(latest.textContent).toContain("Execução em andamento");
    expect(latest.textContent).toContain("Em execução");
    expect(latest.textContent).toContain("Agendamento");
    expect(latest.textContent).toContain("Keep this run summary exactly as supplied.");
    expect(latest.querySelector('a[href="/agents/agent-route/runs/run-12345678-0000-0000-0000-000000000000"]')).toBeTruthy();

    await act(() => root?.unmount());
    root = null;
    host?.remove();
    host = null;
    queryClient.clear();

    const list = await render(<RunListItem run={run} isSelected={false} agentId="agent-route" />);
    expect(list.textContent).toContain("Agendamento");
    expect(list.textContent).toContain("run-1234");
    expect(list.textContent).toContain("Keep this run summary exactly as supplied.");
    expect(list.querySelector('a[href="/agents/agent-route/runs/run-12345678-0000-0000-0000-000000000000"]')).toBeTruthy();
    expect(list.querySelector('[role="img"][aria-label="Em execução"]')).toBeTruthy();
  });

  it("localizes the empty history state", async () => {
    const page = await render(
      <RunsTab
        runs={[]}
        companyId="company-1"
        agentId="agent-1"
        agentRouteId="agent-route"
        selectedRunId={null}
        adapterType=""
        adapterConfig={{}}
      />,
    );
    expect(page.textContent).toContain("Ainda não há execuções.");
  });
});
