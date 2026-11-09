// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionWorkspaceCloseReadiness } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { ExecutionWorkspaceCloseDialog } from "./ExecutionWorkspaceCloseDialog";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockExecutionWorkspacesApi = vi.hoisted(() => ({
  getCloseReadiness: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../api/execution-workspaces", () => ({ executionWorkspacesApi: mockExecutionWorkspacesApi }));
vi.mock("../context/ToastContext", () => ({ useToastActions: () => ({ pushToast: vi.fn() }) }));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

function readiness(overrides: Partial<ExecutionWorkspaceCloseReadiness> = {}): ExecutionWorkspaceCloseReadiness {
  return {
    workspaceId: "workspace-1",
    deliveryState: "not_started",
    state: "ready_with_warnings",
    blockingReasons: [],
    warnings: [
      "Closing this workspace will stop 2 attached runtime services.",
      "The workspace has 1 modified tracked file.",
      "This workspace is 3 commits ahead of main and is not merged.",
      'Could not inspect git status for "/tmp/workspace": permission denied',
    ],
    linkedIssues: [],
    plannedActions: [
      {
        kind: "archive_record",
        label: "Archive workspace record",
        description: "Keep the execution workspace history and issue linkage, but remove it from active workspace lists.",
        command: null,
      },
      {
        kind: "stop_runtime_services",
        label: "Stop attached runtime services",
        description: "2 runtime services will be stopped before cleanup.",
        command: null,
      },
      {
        kind: "git_worktree_remove",
        label: "Remove git worktree",
        description: "Paperclip will run git worktree cleanup for /tmp/workspace/worktree.",
        command: "git worktree remove --force /tmp/workspace/worktree",
      },
    ],
    isDestructiveCloseAllowed: true,
    isSharedWorkspace: false,
    isProjectPrimaryWorkspace: false,
    git: {
      repoRoot: "/tmp/workspace",
      workspacePath: "/tmp/workspace/worktree",
      branchName: "feature/localization",
      baseRef: "main",
      hasDirtyTrackedFiles: true,
      hasUntrackedFiles: false,
      dirtyEntryCount: 1,
      untrackedEntryCount: 0,
      aheadCount: 3,
      behindCount: 0,
      isMergedIntoBase: false,
      createdByRuntime: true,
    },
    runtimeServices: [
      { id: "service-1", serviceName: "web", status: "running", lifecycle: "shared" },
      { id: "service-2", serviceName: "api", status: "running", lifecycle: "shared" },
    ],
    ...overrides,
  } as ExecutionWorkspaceCloseReadiness;
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("ExecutionWorkspaceCloseDialog", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;
  let queryClient: QueryClient;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockExecutionWorkspacesApi.getCloseReadiness.mockReset();
    mockExecutionWorkspacesApi.update.mockReset();
  });

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    queryClient.clear();
    await i18n.changeLanguage("en");
  });

  async function render() {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <QueryClientProvider client={queryClient}>
          <ExecutionWorkspaceCloseDialog
            workspaceId="workspace-1"
            workspaceName="Localization workspace"
            currentStatus="active"
            open
            onOpenChange={vi.fn()}
          />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await flush();
    });
  }

  it("localizes readiness warnings and cleanup actions while preserving paths and commands", async () => {
    await i18n.changeLanguage("pt-BR");
    mockExecutionWorkspacesApi.getCloseReadiness.mockResolvedValue(readiness());
    await render();

    const text = document.body.textContent ?? "";
    expect(text).toContain("Encerramento permitido com avisos");
    expect(text).toContain("O encerramento deste espaço de trabalho interromperá 2 serviços de runtime associados.");
    expect(text).toContain("O espaço de trabalho tem 1 arquivo versionado modificado.");
    expect(text).toContain("Este espaço de trabalho está 3 commits à frente de main e ainda não foi integrado.");
    expect(text).toContain('Não foi possível verificar o status do Git em "/tmp/workspace": permission denied');
    expect(text).toContain("Interromper serviços de runtime associados");
    expect(text).toContain("/tmp/workspace/worktree");
    expect(text).toContain("git worktree remove --force /tmp/workspace/worktree");
    expect(text).not.toContain("Close is allowed with warnings");
    expect(text).not.toContain("Closing this workspace will stop");
  });

  it("keeps close blocked when readiness reports an open linked task", async () => {
    await i18n.changeLanguage("pt-BR");
    mockExecutionWorkspacesApi.getCloseReadiness.mockResolvedValue(readiness({
      state: "blocked",
      warnings: [],
      blockingReasons: ["This workspace is still linked to an open issue."],
      isDestructiveCloseAllowed: false,
    }));
    await render();

    expect(document.body.textContent).toContain("Encerramento bloqueado");
    expect(document.body.textContent).toContain("Este espaço de trabalho ainda está vinculado a uma tarefa aberta.");
    const confirmButton = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Encerrar espaço de trabalho");
    expect(confirmButton?.disabled).toBe(true);
    expect(mockExecutionWorkspacesApi.update).not.toHaveBeenCalled();
  });
});
