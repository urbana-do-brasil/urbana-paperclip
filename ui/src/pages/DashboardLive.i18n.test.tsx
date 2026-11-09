// @vitest-environment node

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DashboardLive } from "./DashboardLive";

const mocks = vi.hoisted(() => ({
  company: { selectedCompanyId: null as string | null, companies: [] as { id: string; name: string; issuePrefix: string }[] },
}));

vi.mock("../context/CompanyContext", () => ({ useCompany: () => mocks.company }));
vi.mock("../context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }) }));
vi.mock("../components/ActiveAgentsPanel", () => ({ ActiveAgentsPanel: () => null }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => createElement("a", { href: to }, children),
}));

describe("DashboardLive localization", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    mocks.company = { selectedCompanyId: null, companies: [] };
  });

  afterEach(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  it("localizes organization selection states", () => {
    const createOrganization = renderToStaticMarkup(createElement(DashboardLive));
    expect(createOrganization).toContain("Crie uma organização para ver as execuções ao vivo.");

    mocks.company.companies = [{ id: "company-1", name: "Organization", issuePrefix: "ORG" }];
    const selectOrganization = renderToStaticMarkup(createElement(DashboardLive));
    expect(selectOrganization).toContain("Selecione uma organização para ver as execuções ao vivo.");
  });

  it("localizes the live-runs page in Portuguese and English", async () => {
    mocks.company = {
      selectedCompanyId: "company-1",
      companies: [{ id: "company-1", name: "Organization", issuePrefix: "ORG" }],
    };
    const portuguese = renderToStaticMarkup(createElement(DashboardLive));
    expect(portuguese).toContain("Execuções ao vivo de agentes");
    expect(portuguese).toContain("As execuções ativas aparecem primeiro");
    expect(portuguese).toContain("Exibindo até 50");

    await i18n.changeLanguage("en");
    const english = renderToStaticMarkup(createElement(DashboardLive));
    expect(english).toContain("Live agent runs");
    expect(english).toContain("Active runs first");
    expect(english).toContain("Showing up to 50");
  });
});
