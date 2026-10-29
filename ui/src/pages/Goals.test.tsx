// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Goal } from "@paperclipai/shared";
import { act as reactAct, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { queryKeys } from "../lib/queryKeys";
import { Goals } from "./Goals";

const mocks = vi.hoisted(() => ({
  selectedCompanyId: "company-1" as string | null,
  openNewGoal: vi.fn(),
  setBreadcrumbs: vi.fn(),
}));

vi.mock("../api/goals", () => ({ goalsApi: { list: vi.fn() } }));
vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: mocks.selectedCompanyId }),
}));
vi.mock("../context/DialogContext", () => ({
  useDialogActions: () => ({ openNewGoal: mocks.openNewGoal }),
}));
vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mocks.setBreadcrumbs }),
}));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: ComponentProps<"a"> & { to: string }) => <a href={to} {...props}>{children}</a>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    companyId: "company-1",
    title: "Goal",
    description: null,
    status: "planned",
    level: "task",
    parentId: null,
    ownerAgentId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  } as Goal;
}

describe("Goals collection and hierarchy localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await reactAct(async () => { await i18n.changeLanguage("en"); });
    mocks.selectedCompanyId = "company-1";
    mocks.openNewGoal.mockReset();
    mocks.setBreadcrumbs.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await reactAct(async () => { root.unmount(); });
    container.remove();
    await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
  });

  async function renderGoals(locale: "en" | "pt-BR", goals: Goal[]) {
    await reactAct(async () => { await i18n.changeLanguage(locale); });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.goals.list("company-1"), goals);
    await reactAct(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Goals />
        </QueryClientProvider>,
      );
    });
  }

  it("localizes the empty collection and opens the create dialog", async () => {
    await renderGoals("pt-BR", []);

    expect(container.textContent).toContain("Ainda não há metas.");
    expect(mocks.setBreadcrumbs).toHaveBeenCalledWith([{ label: "Metas" }]);
    const addButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Adicionar meta");
    expect(addButton).not.toBeUndefined();
    await reactAct(async () => { addButton!.click(); });
    expect(mocks.openNewGoal).toHaveBeenCalledTimes(1);
  });

  it("localizes hierarchy labels while keeping goal IDs, parent relationships, and collapse behavior", async () => {
    const parent = createGoal({ id: "goal-parent", title: "Meta estratégica", level: "company", status: "active" });
    const child = createGoal({ id: "goal-child", title: "Meta da tarefa", parentId: parent.id, level: "task", status: "planned" });
    await renderGoals("pt-BR", [parent, child]);

    expect(container.textContent).toContain("Organização");
    expect(container.textContent).toContain("Ativa");
    expect(container.textContent).toContain("Tarefa");
    expect(container.textContent).toContain("Planejada");
    expect(container.querySelector("a[href='/goals/goal-parent']")).not.toBeNull();
    expect(container.querySelector("a[href='/goals/goal-child']")).not.toBeNull();

    const toggle = container.querySelector<HTMLButtonElement>('button[aria-label="Recolher as submetas de Meta estratégica"]');
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    await reactAct(async () => { toggle!.click(); });
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("a[href='/goals/goal-child']")).toBeNull();
  });

  it("shows the organization prompt when no organization is selected", async () => {
    mocks.selectedCompanyId = null;
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    const client = new QueryClient();
    await reactAct(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Goals />
        </QueryClientProvider>,
      );
    });
    expect(container.textContent).toContain("Selecione uma organização para ver as metas.");
  });
});
