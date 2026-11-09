// @vitest-environment jsdom

import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Issue } from "@paperclipai/shared";
import {
  InboxIssueMetaLeading,
  InboxIssueTrailingColumns,
  IssueColumnPicker,
  issueColumnDescription,
  issueActivityText,
} from "./IssueColumns";
import { TooltipProvider } from "@/components/ui/tooltip";
import { i18n } from "../i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function act(callback: () => void): void {
  flushSync(callback);
}

function makeIssue(overrides: Partial<Issue>): Issue {
  return {
    id: "issue-id",
    identifier: "PAP-1",
    status: "in_progress",
    blockerAttention: false,
    updatedAt: new Date("2026-10-28T12:00:00.000Z"),
    ...overrides,
  } as unknown as Issue;
}

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

afterEach(() => {
  vi.restoreAllMocks();
  if (root) act(() => root!.unmount());
  root = null;
  container?.remove();
  container = null;
});

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

function renderLeading(element: React.ReactElement): string {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<TooltipProvider>{element}</TooltipProvider>));
  return container.textContent ?? "";
}

describe("IssueColumnPicker presentation options", () => {
  it("localizes column settings and preserves column IDs in the picker", async () => {
    await i18n.changeLanguage("pt-BR");
    const onToggleColumn = vi.fn();
    const onToggleDateGroupSeparators = vi.fn();
    renderLeading(
      <IssueColumnPicker
        availableColumns={["status", "id", "assignee", "updated"]}
        visibleColumnSet={new Set(["status", "id", "updated"] as const)}
        onToggleColumn={onToggleColumn}
        showDateGroupSeparators
        onToggleDateGroupSeparators={onToggleDateGroupSeparators}
        onResetColumns={() => undefined}
        titleKey="taskCollection.columns.chooseTaskColumns"
        iconOnly
        rowPresentation="task"
      />,
    );

    const columnsButton = container?.querySelector<HTMLButtonElement>('button[aria-label="Colunas"]');
    expect(columnsButton).not.toBeNull();
    act(() => columnsButton?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })));

    const responsibleOption = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]'))
      .find((item) => item.textContent?.includes("Responsável"));
    expect(responsibleOption?.getAttribute("aria-checked")).toBe("false");
    act(() => responsibleOption?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onToggleColumn).toHaveBeenCalledWith("assignee", true);

    const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]'))
      .find((item) => item.textContent?.includes("Separadores de grupos por data"));
    expect(option?.getAttribute("aria-checked")).toBe("true");

    act(() => option?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onToggleDateGroupSeparators).toHaveBeenCalledWith(false);
  });
});

describe("InboxIssueMetaLeading live state", () => {
  it("describes the canonical identifier at the trailing edge", () => {
    expect(issueColumnDescription("id", "task")).toContain("trailing edge");
    expect(issueColumnDescription("id", "legacy")).not.toContain("trailing edge");
  });

  it("shows the own Live chip for a running issue and never the subtree chip", () => {
    const text = renderLeading(
      <InboxIssueMetaLeading
        issue={makeIssue({ id: "child", identifier: "PAP-2", status: "in_progress" })}
        isLive
        subtreeLiveCount={3}
      />,
    );
    expect(text).toContain("Live");
    expect(text).not.toContain("live below");
  });

  it("shows the distinct subtree chip for a done parent with live descendants", () => {
    const text = renderLeading(
      <InboxIssueMetaLeading
        issue={makeIssue({ id: "parent", identifier: "PAP-1", status: "done" })}
        isLive={false}
        subtreeLiveCount={2}
      />,
    );
    // The done parent must NOT borrow the running child's "Live" chip.
    expect(text).toContain("2 live below");
    expect(text).not.toMatch(/(^|[^a-z])Live([^a-z]|$)/);
  });

  it("can suppress the subtree chip when the status glyph already carries descendant liveness", () => {
    const text = renderLeading(
      <InboxIssueMetaLeading
        issue={makeIssue({ id: "parent", identifier: "PAP-1", status: "blocked" })}
        isLive={false}
        subtreeLiveCount={2}
        showSubtreeLiveChip={false}
      />,
    );
    expect(text).not.toContain("live below");
  });

  it("renders no live treatment when the issue and its subtree are idle", () => {
    const text = renderLeading(
      <InboxIssueMetaLeading
        issue={makeIssue({ id: "idle", identifier: "PAP-3", status: "done" })}
        isLive={false}
        subtreeLiveCount={0}
      />,
    );
    expect(text).not.toContain("Live");
    expect(text).not.toContain("live below");
  });

  it("localizes live descendant indicators and their accessible descriptions", async () => {
    await i18n.changeLanguage("pt-BR");
    renderLeading(
      <InboxIssueMetaLeading
        issue={makeIssue({ id: "parent", identifier: "PAP-1", status: "done" })}
        isLive={false}
        subtreeLiveCount={2}
      />,
    );

    const subtreeBadge = Array.from(container!.querySelectorAll<HTMLElement>("[title]"))
      .find((badge) => badge.getAttribute("title")?.includes("em execução abaixo"));
    expect(container?.textContent).toContain("2 em execução abaixo");
    expect(subtreeBadge?.getAttribute("title")).toBe("2 em execução abaixo");
  });
});

describe("Issue row activity labels", () => {
  it("formats relative activity and its prefix in the active locale", async () => {
    const now = new Date("2026-10-28T12:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    const issue = makeIssue({ updatedAt: new Date(now - 3 * 60_000) });

    await i18n.changeLanguage("en");
    expect(issueActivityText(issue)).toBe("Updated 3m ago");

    await i18n.changeLanguage("pt-BR");
    expect(issueActivityText(issue)).toBe("Atualizada há 3 min.");
  });
});

describe("InboxIssueTrailingColumns attribution", () => {
  it("localizes empty row metadata while keeping parent identifiers as data", async () => {
    await i18n.changeLanguage("pt-BR");
    const text = renderLeading(
      <InboxIssueTrailingColumns
        issue={makeIssue({
          assigneeAgentId: null,
          assigneeUserId: null,
          createdByAgentId: null,
          createdByUserId: null,
          parentId: "parent-1",
        })}
        columns={["assignee", "kickedOffBy", "project", "parent"]}
        projectName={null}
        projectColor={null}
        workspaceName={null}
        assigneeName={null}
        currentUserId="user-1"
        parentIdentifier={null}
        parentTitle="Parent title"
      />,
    );

    expect(text).toContain("Sem responsável");
    expect(text).toContain("Desconhecido");
    expect(text).toContain("Sem projeto");
    expect(text).toContain("Subtarefa");
    expect(text).not.toContain("parent-1");
  });

  it("renders a kicked off by column for agent creators with a character identity", () => {
    const text = renderLeading(
      <InboxIssueTrailingColumns
        issue={makeIssue({
          createdByAgentId: "agent-1",
          createdByUserId: null,
          updatedAt: new Date("2026-04-06T12:00:00.000Z"),
        })}
        columns={["kickedOffBy"]}
        projectName={null}
        projectColor={null}
        workspaceName={null}
        assigneeName={null}
        creatorAgentName="CodexCoder"
        currentUserId="user-1"
        parentIdentifier={null}
        parentTitle={null}
      />,
    );

    expect(text).toContain("CodexCoder");
    expect(container?.querySelector('[data-slot="agent-avatar"]')).not.toBeNull();
  });

  it("renders a kicked off by column for user creators", () => {
    const text = renderLeading(
      <InboxIssueTrailingColumns
        issue={makeIssue({
          createdByAgentId: null,
          createdByUserId: "user-1",
          updatedAt: new Date("2026-04-06T12:00:00.000Z"),
        })}
        columns={["kickedOffBy"]}
        projectName={null}
        projectColor={null}
        workspaceName={null}
        assigneeName={null}
        creatorUserName="Riley Board"
        currentUserId="user-1"
        parentIdentifier={null}
        parentTitle={null}
      />,
    );

    expect(text).toContain("Riley Board");
    expect(container?.querySelector('[data-shape="circle"]')).not.toBeNull();
  });

  it("attributes an agent-created issue to the transitive responsible user (circle, not agent square)", () => {
    const text = renderLeading(
      <InboxIssueTrailingColumns
        issue={makeIssue({
          createdByAgentId: "agent-1",
          createdByUserId: null,
          responsibleUserId: "user-2",
          updatedAt: new Date("2026-04-06T12:00:00.000Z"),
        })}
        columns={["kickedOffBy"]}
        projectName={null}
        projectColor={null}
        workspaceName={null}
        assigneeName={null}
        creatorAgentName="CodexCoder"
        creatorUserName="Morgan Product"
        viaAgentName="CodexCoder"
        currentUserId="user-1"
        parentIdentifier={null}
        parentTitle={null}
      />,
    );

    // The responsible user wins over the creating agent.
    expect(text).toContain("Morgan Product");
    expect(container?.querySelector('[data-shape="circle"]')).not.toBeNull();
    expect(container?.querySelector('[data-slot="agent-avatar"]')).toBeNull();
  });

  it("surfaces the responsible user for a routine execution with no creator", () => {
    const text = renderLeading(
      <InboxIssueTrailingColumns
        issue={makeIssue({
          createdByAgentId: null,
          createdByUserId: null,
          responsibleUserId: "user-2",
          updatedAt: new Date("2026-04-06T12:00:00.000Z"),
        })}
        columns={["kickedOffBy"]}
        projectName={null}
        projectColor={null}
        workspaceName={null}
        assigneeName={null}
        creatorUserName="Morgan Product"
        currentUserId="user-1"
        parentIdentifier={null}
        parentTitle={null}
      />,
    );

    expect(text).toContain("Morgan Product");
    expect(text).not.toContain("Unknown");
  });
});
