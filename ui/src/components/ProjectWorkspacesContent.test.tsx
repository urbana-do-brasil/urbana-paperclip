// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act as reactAct, type ComponentProps, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { queryKeys } from "../lib/queryKeys";
import type { ProjectWorkspaceSummary } from "../lib/project-workspaces-tab";
import { ProjectWorkspacesContent } from "./ProjectWorkspacesContent";

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: ComponentProps<"a"> & { to: string }) => <a href={to} {...props}>{children}</a>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderContent(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(queryKeys.instance.experimentalSettings, {});
  return (
    <QueryClientProvider client={client}>
      {node}
    </QueryClientProvider>
  );
}

function createCleanupFailureSummary(): ProjectWorkspaceSummary {
  return {
    key: "execution:workspace-1",
    kind: "execution_workspace",
    workspaceId: "workspace-1",
    workspaceName: "PAP-1234-workspace",
    cwd: null,
    branchName: null,
    lastUpdatedAt: new Date("2026-01-01T00:00:00Z"),
    projectWorkspaceId: "project-workspace-1",
    executionWorkspaceId: "workspace-1",
    executionWorkspaceStatus: "cleanup_failed",
    serviceCount: 0,
    runningServiceCount: 0,
    primaryServiceUrl: null,
    primaryServiceUrlRunning: false,
    hasRuntimeConfig: false,
    linkedIssueCount: 0,
    issues: [],
  };
}

describe("ProjectWorkspacesContent localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await reactAct(async () => { await i18n.changeLanguage("en"); });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    flushSync(() => root.unmount());
    container.remove();
    await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
  });

  it.each([
    ["en", "No non-default workspace activity yet.", "Cleanup attention needed", "Cleanup failed"],
    ["pt-BR", "Ainda não há atividade em espaços de trabalho não padrão.", "A limpeza precisa de atenção", "Falha na limpeza"],
  ] as const)("shows empty and cleanup states in %s", async (locale, emptyMessage, cleanupHeading, statusLabel) => {
    await reactAct(async () => { await i18n.changeLanguage(locale); });

    await reactAct(async () => root.render(renderContent(
      <ProjectWorkspacesContent
        companyId="company-1"
        projectId="project-1"
        projectRef="project-one"
        summaries={[]}
      />,
    )));
    expect(container.textContent).toContain(emptyMessage);

    await reactAct(async () => root.render(renderContent(
      <ProjectWorkspacesContent
        companyId="company-1"
        projectId="project-1"
        projectRef="project-one"
        summaries={[createCleanupFailureSummary()]}
      />,
    )));
    expect(container.textContent).toContain(cleanupHeading);
    expect(container.textContent).toContain(statusLabel);
    expect(container.textContent).toContain(locale === "pt-BR" ? "Tentar encerrar novamente" : "Retry close");
  });
});
