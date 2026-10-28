// @vitest-environment jsdom

import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { Issue, IssueStatus } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getKanbanColumnTone, KanbanBoard, resolveKanbanTargetStatus } from "./KanbanBoard";
import { i18n } from "../i18n";

vi.mock("@/lib/router", () => ({
  Link: ({
    children,
    to,
    disableIssueQuicklook: _disableIssueQuicklook,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    disableIssueQuicklook?: boolean;
  }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots: Root[] = [];

function act(callback: () => void): void {
  flushSync(callback);
}

function createIssue(index: number, status: IssueStatus): Issue {
  return {
    id: `issue-${status}-${index}`,
    identifier: `PAP-${index}`,
    companyId: "company-1",
    projectId: null,
    projectWorkspaceId: null,
    goalId: null,
    parentId: null,
    title: `Issue ${index}`,
    description: null,
    status,
    workMode: "standard",
    priority: "medium",
    reviewPolicy: null,
    assigneeAgentId: index === 1 ? "agent-1" : null,
    assigneeUserId: null,
    responsibleUserId: null,
    createdByAgentId: null,
    createdByUserId: null,
    issueNumber: index,
    requestDepth: 0,
    billingCode: null,
    assigneeAdapterOverrides: null,
    executionWorkspaceId: null,
    executionWorkspacePreference: null,
    executionWorkspaceSettings: null,
    checkoutRunId: null,
    executionRunId: null,
    executionAgentNameKey: null,
    executionLockedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    hiddenAt: null,
    createdAt: new Date("2026-05-05T00:00:00.000Z"),
    updatedAt: new Date("2026-05-05T00:00:00.000Z"),
    labels: [],
    labelIds: [],
    myLastTouchAt: null,
    lastExternalCommentAt: null,
    lastActivityAt: null,
    isUnreadForMe: false,
  };
}

function createIssues(count: number, status: IssueStatus): Issue[] {
  return Array.from({ length: count }, (_, index) => createIssue(index + 1, status));
}

function renderBoard(
  props: Partial<React.ComponentProps<typeof KanbanBoard>> & { issues: Issue[] },
) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push(root);

  const render = (nextProps: Partial<React.ComponentProps<typeof KanbanBoard>> & { issues: Issue[] }) => {
    act(() => {
      root.render(
        <KanbanBoard
          agents={[{ id: "agent-1", name: "Codex" }]}
          liveIssueIds={new Set(["issue-todo-1"])}
          onUpdateIssue={vi.fn()}
          {...nextProps}
        />,
      );
    });
  };

  render(props);

  return { container, root, render };
}

describe("KanbanBoard", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    document.body.innerHTML = "";
  });

  afterEach(async () => {
    while (mountedRoots.length > 0) {
      const root = mountedRoots.pop();
      if (root) {
        act(() => root.unmount());
      }
    }
    document.body.innerHTML = "";
    await i18n.changeLanguage("pt-BR");
  });

  it("localizes empty board, status columns, and keyboard drag guidance in both languages", async () => {
    const { container, render } = renderBoard({ issues: [] });

    expect(container.textContent).toContain("Nenhuma tarefa para exibir no quadro.");
    expect(container.textContent).toContain("A fazer");
    expect(container.textContent).toContain("Em andamento");
    expect(container.textContent).toContain("Em revisão");
    expect(container.textContent).toContain("Bloqueada");
    expect(container.textContent).toContain("Concluída");
    expect(container.textContent).toContain("Cancelada");

    render({ issues: [createIssue(1, "todo")] });
    const draggable = container.querySelector<HTMLElement>("[aria-describedby]");
    const descriptionId = draggable?.getAttribute("aria-describedby")?.split(" ")[0];
    expect(descriptionId ? document.getElementById(descriptionId)?.textContent : "").toContain(
      "Para mover uma tarefa, pressione Espaço.",
    );
    act(() => {
      draggable?.dispatchEvent(new KeyboardEvent("keydown", {
        key: " ",
        code: "Space",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(container.textContent).toContain("Movendo PAP-1 — Issue 1.");
    await new Promise((resolve) => setTimeout(resolve, 0));
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(container.textContent).toContain("O movimento de PAP-1 — Issue 1 foi cancelado.");

    await i18n.changeLanguage("en");
    render({ issues: [] });
    expect(container.textContent).toContain("No tasks to display on the board.");
    expect(container.textContent).toContain("In Progress");
    expect(container.textContent).toContain("In Review");
    render({ issues: [createIssue(1, "todo")] });
    const englishDraggable = container.querySelector<HTMLElement>("[aria-describedby]");
    const englishDescriptionId = englishDraggable?.getAttribute("aria-describedby")?.split(" ")[0];
    expect(englishDescriptionId ? document.getElementById(englishDescriptionId)?.textContent : "").toContain(
      "To move a task, press Space.",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    act(() => {
      englishDraggable?.dispatchEvent(new KeyboardEvent("keydown", {
        key: " ",
        code: "Space",
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(container.textContent).toContain("Started moving PAP-1 — Issue 1.");
  });

  it("limits visible cards and reveals more cards per column", () => {
    const { container } = renderBoard({
      issues: createIssues(60, "todo"),
      compactCards: true,
      initialVisibleCount: 50,
      revealIncrement: 50,
    });

    expect(container.textContent).toContain("Exibindo 50 de 60");
    expect(container.textContent).toContain("Mostrar mais 10");
    expect(container.textContent).toContain("Issue 50");
    expect(container.textContent).not.toContain("Issue 51");

    const showMoreButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Mostrar mais 10"),
    );
    expect(showMoreButton).toBeTruthy();

    act(() => {
      showMoreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Issue 60");
    expect(container.textContent).not.toContain("Mostrar mais 10");
  });

  it("resets visible counts when the column page size changes", () => {
    const issues = createIssues(60, "todo");
    const { container, render } = renderBoard({
      issues,
      initialVisibleCount: 50,
      revealIncrement: 50,
    });

    const showMoreButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Mostrar mais 10"),
    );
    expect(showMoreButton).toBeTruthy();

    act(() => {
      showMoreButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Issue 60");

    render({
      issues,
      initialVisibleCount: 10,
      revealIncrement: 10,
    });

    expect(container.textContent).toContain("Exibindo 10 de 60");
    expect(container.textContent).toContain("Mostrar mais 10");
    expect(container.textContent).toContain("Issue 10");
    expect(container.textContent).not.toContain("Issue 11");
  });

  it("renders collapsed statuses as rails without cards", () => {
    const { container } = renderBoard({
      issues: createIssues(3, "done"),
      collapsedStatuses: ["done"],
    });

    expect(container.textContent).toContain("Concluída");
    expect(container.textContent).toContain("3");
    expect(container.textContent).not.toContain("Issue 1");
  });

  it("gives every column a status-hued tone", () => {
    expect(getKanbanColumnTone("backlog").body).toContain("bg-muted/30");
    expect(getKanbanColumnTone("todo").body).toContain("amber");
    expect(getKanbanColumnTone("in_progress").body).toContain("blue");
    expect(getKanbanColumnTone("in_review").body).toContain("violet");
    expect(getKanbanColumnTone("blocked").body).toContain("red");
    expect(getKanbanColumnTone("done").body).toContain("green");
    expect(getKanbanColumnTone("cancelled").body).toContain("bg-muted/25");
    expect(getKanbanColumnTone("cancelled").card).toContain("opacity-80");
  });

  it("ghosts cancelled lane cards", () => {
    const { container } = renderBoard({
      issues: createIssues(1, "cancelled"),
    });

    const card = container.querySelector('a[href="/issues/PAP-1"]')?.parentElement;

    expect(card?.className).toContain("bg-muted/35");
    expect(card?.className).toContain("opacity-80");
  });

  it("keeps core issue signals in compact cards", () => {
    const { container } = renderBoard({
      issues: createIssues(1, "todo"),
      compactCards: true,
    });

    expect(container.textContent).toContain("PAP-1");
    expect(container.textContent).toContain("Issue 1");
    expect(container.textContent).toContain("Codex");
    expect(container.textContent).toContain("Em execução");
  });

  it("resolves drop targets from status rails and cards", () => {
    const issues = [
      createIssue(1, "todo"),
      createIssue(2, "blocked"),
    ];

    expect(resolveKanbanTargetStatus("done", issues)).toBe("done");
    expect(resolveKanbanTargetStatus("issue-blocked-2", issues)).toBe("blocked");
    expect(resolveKanbanTargetStatus("missing", issues)).toBeNull();
  });
});
