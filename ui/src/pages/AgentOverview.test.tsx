// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AgentDetail, AgentRuntimeState, HeartbeatRun, Issue } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { AgentOverview } from "./AgentDetail";

vi.mock("@/lib/router", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

vi.mock("../components/MarkdownBody", () => ({
  MarkdownBody: ({ children }: { children: string }) => <div>{children}</div>,
}));

describe("AgentOverview", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  function renderOverview({
    skills = ["Design Guide", "Check PR"],
    issues,
    capabilities = "Builds and verifies product changes.",
    model = "gpt-5.6-sol",
    sessionId = "codex-session-42",
  }: {
    skills?: string[];
    issues?: Issue[];
    capabilities?: string | null;
    model?: string | null;
    sessionId?: string | null;
  } = {}) {
    const agent = {
      id: "agent-1",
      companyId: "company-1",
      name: "Codex Coder",
      urlKey: "codexcoder",
      role: "engineer",
      title: "Product engineer",
      status: "active",
      reportsTo: null,
      capabilities,
      adapterType: "codex_local",
      adapterConfig: model ? { model } : {},
      runtimeConfig: {},
      chainOfCommand: [],
      access: { canAssignTasks: true, taskAssignSource: "explicit_grant", membership: null, grants: [] },
    } as unknown as AgentDetail;
    const issue = {
      id: "issue-1",
      companyId: "company-1",
      identifier: "PAP-42",
      title: "Simplify agent information architecture",
      status: "in_progress",
      priority: "high",
      updatedAt: new Date("2026-08-31T12:00:00Z"),
    } as unknown as Issue;
    const assignedIssues = issues ?? [issue];
    const runtime = {
      sessionDisplayId: sessionId,
    } as unknown as AgentRuntimeState;

    return renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <AgentOverview
          agent={agent}
          runs={[] as HeartbeatRun[]}
          assignedIssues={assignedIssues}
          runtimeState={runtime}
          directReportCount={2}
          skillNames={skills}
          agentRouteId="codexcoder"
        />
      </QueryClientProvider>,
    );
  }

  it("prioritizes identity, capability, runtime, skills, tasks, and scoped Audit entry points", () => {
    const markup = renderOverview();

    expect(markup).toContain("Identity");
    expect(markup).toContain("Capabilities");
    expect(markup).toContain("Harness / Runtime");
    expect(markup).toContain("Design Guide");
    expect(markup).toContain("Simplify agent information architecture");
    expect(markup).toContain("PAP-42");
    expect(markup).toContain('href="/activity/costs?agentId=agent-1"');
    expect(markup).not.toContain("Run Activity");
    expect(markup).not.toContain("Tasks by Status");
  });

  it("localizes overview controls while preserving agent and task data", async () => {
    await i18n.changeLanguage("pt-BR");
    const markup = renderOverview();

    expect(markup).toContain("Identidade");
    expect(markup).toContain("ocioso");
    expect(markup).toContain("Engenharia");
    expect(markup).toContain("Chave pública");
    expect(markup).toContain("gpt-5.6-sol");
    expect(markup).toContain("Capacidades");
    expect(markup).toContain("Habilidades");
    expect(markup).toContain("Tarefas recentes");
    expect(markup).toContain("Auditoria");
    expect(markup).toContain("Execuções");
    expect(markup).toContain("Simplify agent information architecture");
    expect(markup).toContain('href="/activity/costs?agentId=agent-1"');
  });

  it("localizes empty and overflow states without translating user supplied text", async () => {
    await i18n.changeLanguage("pt-BR");
    const empty = renderOverview({ skills: [], issues: [], capabilities: " ", model: null, sessionId: null });

    expect(empty).toContain("Padrão do adaptador");
    expect(empty).toContain("Nenhuma sessão");
    expect(empty).toContain("Nenhuma execução");
    expect(empty).toContain("Nenhum resumo de capacidades foi adicionado.");
    expect(empty).toContain("Nenhuma habilidade ativada.");
    expect(empty).toContain("Nenhuma tarefa recente.");

    const overflow = renderOverview({
      skills: Array.from({ length: 10 }, (_, index) => `User skill ${index + 1}`),
      issues: Array.from({ length: 8 }, (_, index) => ({
        id: `issue-${index + 1}`,
        companyId: "company-1",
        identifier: `PAP-${index + 1}`,
        title: `User task ${index + 1}`,
        status: "in_progress",
        priority: "high",
        updatedAt: new Date("2026-08-31T12:00:00Z"),
      }) as unknown as Issue),
    });
    expect(overflow).toContain("+2 a mais");
    expect(overflow).toContain("+2 tarefas a mais");
    expect(overflow).toContain("User skill 1");
    expect(overflow).toContain("User task 1");
  });
});
