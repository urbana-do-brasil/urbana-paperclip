// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { RoutineListRow, type RoutineListRowItem } from "./RoutineList";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routine: RoutineListRowItem = {
  id: "routine-1",
  title: "Daily research",
  status: "paused",
  projectId: null,
  assigneeAgentId: null,
  lastRun: null,
};

describe("RoutineListRow", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    await i18n.changeLanguage("en");
  });

  it("localizes routine status, empty relationships, date fallback, and actions in PT-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    await act(async () => root.render(
      <RoutineListRow
        routine={routine}
        projectById={new Map()}
        agentById={new Map()}
        runningRoutineId={null}
        statusMutationRoutineId={null}
        href="/routines/routine-1"
        runNowButton
        onRunNow={vi.fn()}
        onToggleEnabled={vi.fn()}
      />,
    ));

    expect(container.textContent).toContain("rascunho");
    expect(container.textContent).toContain("Sem projeto");
    expect(container.textContent).toContain("Sem agente padrão");
    expect(container.textContent).toContain("Nunca");
    expect(container.textContent).toContain("Executar agora");
    expect(container.querySelector('button[aria-label="Ativar Daily research"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Mais ações para Daily research"]')).toBeTruthy();
  });

  it("keeps the same row behavior and accessible labels in English", async () => {
    await i18n.changeLanguage("en");
    await act(async () => root.render(
      <RoutineListRow
        routine={{ ...routine, status: "active" }}
        projectById={new Map()}
        agentById={new Map()}
        runningRoutineId={null}
        statusMutationRoutineId={null}
        href="/routines/routine-1"
        runNowButton
        onRunNow={vi.fn()}
        onToggleEnabled={vi.fn()}
      />,
    ));

    expect(container.textContent).toContain("No project");
    expect(container.textContent).toContain("No default agent");
    expect(container.textContent).toContain("Never");
    expect(container.textContent).toContain("Run now");
    expect(container.querySelector('button[aria-label="Disable Daily research"]')).toBeTruthy();
  });
});
