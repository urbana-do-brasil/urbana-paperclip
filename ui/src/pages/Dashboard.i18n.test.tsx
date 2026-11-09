// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { i18n } from "@/i18n";
import { Dashboard } from "./Dashboard";

const mocks = vi.hoisted(() => ({
  company: { selectedCompanyId: null as string | null, companies: [] as { id: string; name: string; issuePrefix: string }[] },
  summary: {
    companyId: "company-1",
    agents: { active: 2, running: 1, paused: 1, error: 0 },
    tasks: { open: 2, inProgress: 1, blocked: 1, done: 0 },
    costs: { monthSpendCents: 1234, monthBudgetCents: 2468, monthUtilizationPercent: 50 },
    pendingApprovals: 0,
    budgets: { activeIncidents: 1, pendingApprovals: 1, pausedAgents: 1, pausedProjects: 0 },
    runActivity: [{ date: "2026-10-28", succeeded: 1, failed: 0, recovered: 0, other: 0, total: 1, failedByErrorCode: {} }],
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const key = String(queryKey[0]);
    const data = key === "dashboard"
      ? mocks.summary
      : key === "agents"
        ? [{ id: "agent-1", name: "Agent", status: "idle", pauseReason: null }]
        : key === "access"
          ? { users: [] }
          : [];
    return { data, isFetching: false, isLoading: false, error: null, dataUpdatedAt: 1 };
  },
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("../context/CompanyContext", () => ({ useCompany: () => mocks.company }));
vi.mock("../context/DialogContext", () => ({ useDialogActions: () => ({ openOnboarding: vi.fn() }) }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }) }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => createElement("a", { href: to }, children),
  useLocation: () => ({ pathname: "/dashboard" }),
}));
vi.mock("../hooks/useSharedPolling", () => ({
  useSharedPollingQuery: () => ({ enabled: true }),
  usePublishSharedQueryData: vi.fn(),
}));
vi.mock("../components/ActiveAgentsPanel", () => ({ ActiveAgentsPanel: () => null }));
vi.mock("../components/ActivityRow", () => ({ ActivityRow: () => null }));
vi.mock("../components/SmokeLabDashboardCard", () => ({ SmokeLabDashboardCard: () => null }));
vi.mock("@/plugins/slots", () => ({ PluginSlotOutlet: () => null }));

describe("Dashboard localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    mocks.company = { selectedCompanyId: null, companies: [] };
  });

  afterEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  it("localizes the initial organization state in both languages", async () => {
    const portuguese = renderToStaticMarkup(createElement(Dashboard));
    expect(portuguese).toContain("Bem-vindo ao Paperclip.");
    expect(portuguese).toContain("Começar");

    await i18n.changeLanguage("en");
    const english = renderToStaticMarkup(createElement(Dashboard));
    expect(english).toContain("Welcome to Paperclip.");
    expect(english).toContain("Get started");
  });

  it("localizes dashboard metrics and budget alerts while keeping USD values", () => {
    mocks.company = {
      selectedCompanyId: "company-1",
      companies: [{ id: "company-1", name: "Organization", issuePrefix: "ORG" }],
    };

    const html = renderToStaticMarkup(createElement(Dashboard));
    expect(html).toContain("Agentes habilitados");
    expect(html).toContain("1 em execução");
    expect(html).toContain("2 abertas, 1 bloqueada");
    expect(html).toContain("50% do orçamento de");
    expect(html).toContain("1 incidente de orçamento ativo");
    expect(html).toContain("1 agente pausado");
    expect(html).toContain("US$");
    expect(html).toContain("Tarefas recentes");
    expect(html).toContain("Ainda não há tarefas.");
  });
});
