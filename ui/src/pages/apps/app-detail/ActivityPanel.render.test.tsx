// @vitest-environment jsdom

import { flushSync } from "react-dom";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Agent, ToolCallEvent, ToolConnectionLifecycleEvent } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { ActivityPanel } from "./ActivityPanel";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function act(callback: () => void) {
  flushSync(callback);
}

function event(overrides: Partial<ToolCallEvent>): ToolCallEvent {
  return {
    id: "evt-1",
    companyId: "co-1",
    eventType: "call_completed",
    actorType: "agent",
    actorId: null,
    agentId: "agent-1",
    runId: null,
    issueId: null,
    applicationId: null,
    connectionId: "conn-1",
    catalogEntryId: null,
    invocationId: null,
    actionRequestId: null,
    runtimeSlotId: null,
    toolName: "mcp.app-gallery-link-abc:read_values",
    decision: null,
    matchedPolicyIds: [],
    reasonCode: null,
    outcome: "success",
    latencyMs: null,
    requestHash: null,
    requestSummary: null,
    resultHash: null,
    resultSummary: null,
    resultSizeBytes: null,
    redactionPlan: null,
    rateLimitState: null,
    metadata: null,
    errorCode: null,
    errorMessage: null,
    createdAt: new Date("2026-06-18T00:00:00Z"),
    ...overrides,
  } as ToolCallEvent;
}

function lifecycleEvent(
  overrides: Partial<ToolConnectionLifecycleEvent>,
): ToolConnectionLifecycleEvent {
  return {
    id: "lifecycle-1",
    connectionId: "conn-1",
    type: "app_connected",
    actorType: "user",
    actorId: "user-1",
    agentId: null,
    actorDisplayName: "Emanuel",
    details: null,
    createdAt: new Date("2026-06-18T00:00:00Z"),
    ...overrides,
  };
}

const agents: Agent[] = [{ id: "agent-1", name: "BenchmarkForensics" } as Agent];

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
});

afterEach(async () => {
  if (root) act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  await i18n.changeLanguage("pt-BR");
});

function renderPanel(props: Parameters<typeof ActivityPanel>[0]) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<ActivityPanel {...props} />));
  return container.textContent ?? "";
}

describe("ActivityPanel render", () => {
  const base = {
    lifecycleEvents: [],
    issues: {},
    actionRequests: {},
    loading: false,
    agents,
    connectionId: "conn-1",
    appName: "Google Sheets",
  };

  it("renders localized attribution for a Test-tab call and preserves names", () => {
    const text = renderPanel({
      ...base,
      events: [event({ actorType: "user", actorId: "user-1", metadata: { source: "test" } })],
      userLabelById: new Map([["user-1", "Dotta"]]),
    });
    expect(text).toContain("Dotta testou como BenchmarkForensics usou Read Values");
  });

  it("renders a real heartbeat call without the test prefix", () => {
    const text = renderPanel({ ...base, events: [event({})] });
    expect(text).toContain("BenchmarkForensics usou Read Values");
    expect(text).not.toContain("tested as");
  });

  it("uses the selected locale for the activity heading and relative time", async () => {
    await i18n.changeLanguage("en");
    const text = renderPanel({ ...base, events: [event({ createdAt: new Date(Date.now() - 60_000) })] });
    expect(text).toContain("Recent activity");
    expect(text).toContain("1m ago");
    expect(text).toContain("BenchmarkForensics used Read Values");
  });

  it("localizes lifecycle history and permission links while preserving actor and app names", () => {
    const text = renderPanel({
      ...base,
      events: [],
      lifecycleEvents: [lifecycleEvent({ type: "allowlist_changed", details: { added: 2, removed: 1 } })],
    });
    expect(text).toContain("Emanuel atualizou a lista de permissões (2 itens adicionados, 1 removidos)");
    expect(text).toContain("Ver permissões");
  });

  it("pluralizes quarantined action history and gives a localized review link", () => {
    const text = renderPanel({
      ...base,
      events: [],
      lifecycleEvents: [lifecycleEvent({
        type: "actions_quarantined",
        actorDisplayName: null,
        details: { count: 2 },
      })],
    });
    expect(text).toContain("2 novas ações precisam de revisão");
    expect(text).toContain("Revisar permissões");
  });
});
