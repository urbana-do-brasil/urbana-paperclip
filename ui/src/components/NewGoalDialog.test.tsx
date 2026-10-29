// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Goal } from "@paperclipai/shared";
import { act as reactAct, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { queryKeys } from "../lib/queryKeys";
import { NewGoalDialog } from "./NewGoalDialog";

const mocks = vi.hoisted(() => ({
  newGoalDefaults: { parentId: null as string | null },
  closeNewGoal: vi.fn(),
  selectedCompanyId: "company-1" as string | null,
  selectedCompany: { issuePrefix: "PAP" },
  listGoals: vi.fn(),
  createGoal: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock("../api/goals", () => ({ goalsApi: { list: mocks.listGoals, create: mocks.createGoal } }));
vi.mock("../api/assets", () => ({ assetsApi: { uploadImage: mocks.uploadImage } }));
vi.mock("../context/DialogContext", () => ({
  useDialog: () => ({
    newGoalOpen: true,
    newGoalDefaults: mocks.newGoalDefaults,
    closeNewGoal: mocks.closeNewGoal,
  }),
}));
vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: mocks.selectedCompanyId,
    selectedCompany: mocks.selectedCompany,
  }),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children, showCloseButton: _showCloseButton, ...props }: ComponentProps<"div"> & { showCloseButton?: boolean }) => <div {...props}>{children}</div>,
}));
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode; asChild?: boolean }) => <>{children}</>,
  PopoverContent: ({ children, align: _align, ...props }: ComponentProps<"div"> & { align?: string }) => <div {...props}>{children}</div>,
}));
vi.mock("./MarkdownEditor", async () => {
  const { forwardRef } = await import("react");
  return {
    MarkdownEditor: forwardRef<HTMLTextAreaElement, {
      value: string;
      onChange: (value: string) => void;
      placeholder?: string;
    }>(({ value, onChange, placeholder }, ref) => (
      <textarea ref={ref} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    )),
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeParentGoal(): Goal {
  return {
    id: "goal-parent",
    companyId: "company-1",
    title: "Meta principal",
    description: null,
    status: "active",
    level: "company",
    parentId: null,
    ownerAgentId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  } as Goal;
}

describe("NewGoalDialog localization", () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;

  beforeEach(async () => {
    await reactAct(async () => { await i18n.changeLanguage("en"); });
    mocks.newGoalDefaults = { parentId: null };
    mocks.selectedCompanyId = "company-1";
    mocks.closeNewGoal.mockReset();
    mocks.listGoals.mockResolvedValue([makeParentGoal()]);
    mocks.createGoal.mockReset();
    mocks.createGoal.mockResolvedValue({ id: "goal-created" });
    mocks.uploadImage.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.goals.list("company-1"), [makeParentGoal()]);
  });

  afterEach(async () => {
    await reactAct(async () => { root.unmount(); });
    container.remove();
    await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
  });

  async function renderDialog(locale: "en" | "pt-BR", parentId: string | null = null) {
    mocks.newGoalDefaults = { parentId };
    await reactAct(async () => { await i18n.changeLanguage(locale); });
    await reactAct(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <NewGoalDialog />
        </QueryClientProvider>,
      );
    });
  }

  function setInputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("localizes new goal controls while submitting unchanged enum values", async () => {
    await renderDialog("pt-BR");

    expect(container.textContent).toContain("Nova meta");
    expect(container.querySelector('button[aria-label="Fechar diálogo de meta"]')).not.toBeNull();
    expect(container.querySelector('input[placeholder="Título da meta"]')).not.toBeNull();
    expect(container.querySelector("textarea[placeholder='Adicionar descrição...']")).not.toBeNull();
    expect(container.textContent).toContain("Planejada");
    expect(container.textContent).toContain("Tarefa");
    expect(container.textContent).toContain("Meta pai");
    expect(container.textContent).toContain("Sem meta pai");

    await reactAct(async () => {
      [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Alcançada")!.click();
      [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Equipe")!.click();
    });
    const titleInput = container.querySelector<HTMLInputElement>('input[placeholder="Título da meta"]')!;
    await reactAct(async () => { setInputValue(titleInput, "  Entregar tradução  "); });
    await reactAct(async () => {
      [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Criar meta")!.click();
      await vi.waitFor(() => expect(mocks.createGoal).toHaveBeenCalled());
    });

    expect(mocks.createGoal).toHaveBeenCalledWith("company-1", {
      title: "Entregar tradução",
      description: undefined,
      status: "achieved",
      level: "team",
    });
    expect(mocks.closeNewGoal).toHaveBeenCalledTimes(1);
  });

  it("preserves the preset parent when creating a localized sub-goal", async () => {
    await renderDialog("pt-BR", "goal-parent");
    expect(container.textContent).toContain("Nova submeta");
    expect(container.textContent).toContain("Meta principal");

    const titleInput = container.querySelector<HTMLInputElement>('input[placeholder="Título da meta"]')!;
    await reactAct(async () => { setInputValue(titleInput, "Submeta" ); });
    await reactAct(async () => {
      [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Criar submeta")!.click();
      await vi.waitFor(() => expect(mocks.createGoal).toHaveBeenCalled());
    });

    expect(mocks.createGoal).toHaveBeenCalledWith("company-1", {
      title: "Submeta",
      description: undefined,
      status: "planned",
      level: "task",
      parentId: "goal-parent",
    });
  });
});
