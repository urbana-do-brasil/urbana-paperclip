// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { AgentDetail } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentConfigSaveBar, AgentRevisionsTab } from "./AgentDetail";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { queryKeys } from "../lib/queryKeys";

const mockAgentsApi = vi.hoisted(() => ({
  listConfigRevisions: vi.fn(),
  rollbackConfigRevision: vi.fn(),
}));

vi.mock("../api/agents", () => ({ agentsApi: mockAgentsApi }));
vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

const agent = { id: "agent-123", urlKey: "codex-agent" } as AgentDetail;
const revision = {
  id: "revision-abcdefgh",
  createdAt: "2026-10-20T12:30:00.000Z",
  source: "operator-save",
  changedKeys: ["adapterConfig.model", "heartbeat.intervalSeconds"],
};

function renderTab(revisions: typeof revision[] = []) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.agents.configRevisions(agent.id), revisions);
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AgentRevisionsTab agent={agent} companyId="company-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  queryClient.clear();
  return markup;
}

describe("AgentRevisionsTab localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    mockAgentsApi.listConfigRevisions.mockResolvedValue([]);
  });
  afterEach(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });

  it("localizes empty and populated revision history while preserving technical values", () => {
    const empty = renderTab();
    expect(empty).toContain("Ainda não há revisões de configuração.");
    expect(empty).toContain("Total: 0");

    const populated = renderTab([revision]);
    expect(populated).toContain("Revisões da configuração");
    expect(populated).toContain("revision</span>");
    expect(populated).toContain("operator-save");
    expect(populated).toContain("Restaurar");
    expect(populated).toContain("adapterConfig.model, heartbeat.intervalSeconds");
    expect(populated).toContain("Alterado:");
  });

  it("provides English labels when English is selected", async () => {
    await i18n.changeLanguage("en");
    const markup = renderTab([revision]);
    expect(markup).toContain("Configuration revisions");
    expect(markup).toContain("1 total");
    expect(markup).toContain("Restore");
    expect(markup).toContain("Changed:");
  });

  it("localizes the unsaved and saving states without changing button availability", async () => {
    const props = { dirty: true, saving: false, onDiscard: vi.fn(), onSave: vi.fn() };
    const portuguese = renderToStaticMarkup(<AgentConfigSaveBar {...props} />);
    expect(portuguese).toContain("Você tem alterações não salvas.");
    expect(portuguese).toContain("Descartar");
    expect(portuguese).toContain("Salvar alterações");

    const saving = renderToStaticMarkup(<AgentConfigSaveBar {...props} saving />);
    expect(saving).toContain("Salvando alterações…");
    expect(saving).toContain("Salvando…");
    expect(saving.match(/disabled=""/g) ?? []).toHaveLength(2);

    await i18n.changeLanguage("en");
    const english = renderToStaticMarkup(<AgentConfigSaveBar {...props} />);
    expect(english).toContain("You have unsaved changes.");
    expect(english).toContain("Save changes");
  });
});
