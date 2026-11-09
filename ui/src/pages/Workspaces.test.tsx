// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceOverviewItem, WorkspaceOverviewResponse } from "@paperclipai/shared";
import { act as reactAct, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executionWorkspacesApi } from "../api/execution-workspaces";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { queryKeys } from "../lib/queryKeys";
import { Workspaces } from "./Workspaces";

const mocks = vi.hoisted(() => ({
  selectedCompanyId: "company-1" as string | null,
  setBreadcrumbs: vi.fn(),
  getExperimental: vi.fn(),
  listOverview: vi.fn(),
}));

vi.mock("../api/execution-workspaces", () => ({ executionWorkspacesApi: { listOverview: mocks.listOverview } }));
vi.mock("../api/instanceSettings", () => ({ instanceSettingsApi: { getExperimental: mocks.getExperimental } }));
vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mocks.setBreadcrumbs }),
}));
vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: mocks.selectedCompanyId }),
}));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: ComponentProps<"a"> & { to: string }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));
vi.mock("../components/SummarySlotCard", () => ({
  SummarySlotCard: ({ title, description }: { title: string; description: string }) => <section><h2>{title}</h2><p>{description}</p></section>,
}));
vi.mock("../components/ProjectWorkspacesContent", () => ({
  ProjectWorkspacesContent: ({ summaries }: { summaries: Array<{ workspaceId: string }> }) => (
    <div data-testid="project-workspaces-content">{summaries.map((summary) => summary.workspaceId).join(",")}</div>
  ),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function item(workspaceId: string): WorkspaceOverviewItem {
  return {
    key: `execution:${workspaceId}`,
    kind: "execution_workspace",
    workspaceId,
    workspaceName: workspaceId,
    projectId: "project-1",
    projectUrlKey: "project-alpha",
    projectName: "Project Alpha",
    mode: "isolated_workspace",
    strategyType: "git_worktree",
    cwd: "/workspaces/project-alpha",
    branchName: "feature/example",
    lastUpdatedAt: new Date("2026-05-01T00:00:00Z"),
    projectWorkspaceId: "project-workspace-1",
    executionWorkspaceId: workspaceId,
    executionWorkspaceStatus: "active",
    serviceCount: 0,
    runningServiceCount: 0,
    primaryServiceUrl: null,
    primaryServiceUrlRunning: false,
    primaryService: null,
    hasRuntimeConfig: false,
    linkedIssueCount: 0,
    linkedIssues: [],
  };
}

function page(items: WorkspaceOverviewItem[], total: number, nextOffset: number | null): WorkspaceOverviewResponse {
  return { items, total, limit: 1, offset: 0, hasMore: nextOffset !== null, nextOffset };
}

describe("Workspaces overview localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await reactAct(async () => { await i18n.changeLanguage("en"); });
    mocks.selectedCompanyId = "company-1";
    mocks.setBreadcrumbs.mockReset();
    mocks.getExperimental.mockReset();
    mocks.listOverview.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await reactAct(async () => { root.unmount(); });
    container.remove();
    await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
  });

  async function renderPage(locale: "en" | "pt-BR", settings: Record<string, unknown>, firstPage: WorkspaceOverviewResponse) {
    await reactAct(async () => { await i18n.changeLanguage(locale); });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(queryKeys.instance.experimentalSettings, settings);
    client.setQueryData(queryKeys.executionWorkspaces.overview("company-1"), {
      pages: [firstPage],
      pageParams: [0],
    });
    await reactAct(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Workspaces />
        </QueryClientProvider>,
      );
    });
    return client;
  }

  it.each([
    ["en", "Workspaces", "Workspace summary", "No workspace activity yet."],
    ["pt-BR", "Espaços de trabalho", "Resumo dos espaços de trabalho", "Ainda não há atividade em espaços de trabalho."],
  ] as const)("localizes the empty overview in %s", async (locale, title, summaryTitle, emptyMessage) => {
    await renderPage(locale, { enableIsolatedWorkspaces: true }, page([], 0, null));
    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain(summaryTitle);
    expect(container.textContent).toContain(emptyMessage);
    expect(mocks.setBreadcrumbs).toHaveBeenCalledWith([{ label: title }]);
  });

  it("localizes grouped counts and pagination while preserving project routing", async () => {
    const client = await renderPage("pt-BR", { enableIsolatedWorkspaces: true }, page([item("workspace-1")], 2, 1));
    mocks.listOverview.mockResolvedValueOnce(page([item("workspace-2")], 2, null));

    expect(container.textContent).toContain("1 espaço de trabalho");
    expect(container.textContent).toContain("Exibindo 1 de 2 espaços de trabalho.");
    expect(container.querySelector("a[href='/projects/project-alpha/workspaces']")).not.toBeNull();
    expect(container.querySelector('[data-testid="project-workspaces-content"]')?.textContent).toBe("workspace-1");

    const loadMoreButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Carregar mais");
    expect(loadMoreButton).not.toBeUndefined();
    await reactAct(async () => {
      loadMoreButton!.click();
      await vi.waitFor(() => expect(container.textContent).toContain("workspace-2"));
    });

    expect(container.querySelector('[data-testid="project-workspaces-content"]')?.textContent).toBe("workspace-1,workspace-2");
    expect(executionWorkspacesApi.listOverview).toHaveBeenCalledWith("company-1", { offset: 1 });
    expect(client.getQueryData(queryKeys.executionWorkspaces.overview("company-1"))).toBeDefined();
  });

  it("keeps the existing feature-flag redirect", async () => {
    await renderPage("pt-BR", { enableIsolatedWorkspaces: false }, page([], 0, null));
    expect(container.querySelector('[data-testid="navigate"]')?.getAttribute("data-to")).toBe("/issues");
  });
});
