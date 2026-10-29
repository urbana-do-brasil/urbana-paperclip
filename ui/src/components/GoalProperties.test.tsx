// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Goal } from "@paperclipai/shared";
import { act as reactAct, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { queryKeys } from "../lib/queryKeys";
import { GoalProperties } from "./GoalProperties";

const mocks = vi.hoisted(() => ({
  selectedCompanyId: "company-1" as string | null,
}));

vi.mock("../api/agents", () => ({ agentsApi: { list: vi.fn() } }));
vi.mock("../api/goals", () => ({ goalsApi: { list: vi.fn() } }));
vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: mocks.selectedCompanyId }),
}));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: ComponentProps<"a"> & { to: string }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => <>{children}</>,
  PopoverContent: ({ children, align: _align, ...props }: ComponentProps<"div"> & { align?: string }) => <div {...props}>{children}</div>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-child",
    companyId: "company-1",
    title: "Meta da tarefa",
    description: "Descrição",
    status: "active",
    level: "task",
    parentId: "goal-parent",
    ownerAgentId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  } as Goal;
}

function makeParentGoal(): Goal {
  return makeGoal({ id: "goal-parent", title: "Meta principal", parentId: null, level: "company" });
}

describe("GoalProperties localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await reactAct(async () => { await i18n.changeLanguage("en"); });
    mocks.selectedCompanyId = "company-1";
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await reactAct(async () => { root.unmount(); });
    container.remove();
    await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
  });

  it("localizes goal properties and preserves enum values in update callbacks", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    const onUpdate = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.agents.list("company-1"), []);
    client.setQueryData(queryKeys.goals.list("company-1"), [makeParentGoal()]);

    await reactAct(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <GoalProperties goal={makeGoal()} onUpdate={onUpdate} />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain("Status");
    expect(container.textContent).toContain("Nível");
    expect(container.textContent).toContain("Responsável");
    expect(container.textContent).toContain("Nenhum");
    expect(container.textContent).toContain("Meta pai");
    expect(container.textContent).toContain("Criada");
    expect(container.textContent).toContain("Atualizada");
    expect(container.textContent).toContain("Ativa");
    expect(container.textContent).toContain("Tarefa");
    expect(container.querySelector("a[href='/goals/goal-parent']")?.textContent).toBe("Meta principal");

    await reactAct(async () => {
      [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Alcançada")!.click();
      [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Equipe")!.click();
    });
    expect(onUpdate).toHaveBeenCalledWith({ status: "achieved" });
    expect(onUpdate).toHaveBeenCalledWith({ level: "team" });
  });
});
