// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { MobileBottomNav } from "./MobileBottomNav";

vi.mock("@/lib/router", () => ({
  NavLink: ({ to, children, className, ...props }: {
    to: string;
    children: React.ReactNode | ((state: { isActive: boolean }) => React.ReactNode);
    className?: string | ((state: { isActive: boolean }) => string);
  }) => (
    <a href={to} className={typeof className === "function" ? className({ isActive: false }) : className} {...props}>
      {typeof children === "function" ? children({ isActive: false }) : children}
    </a>
  ),
  useLocation: () => ({ pathname: "/dashboard" }),
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

vi.mock("../context/DialogContext", () => ({
  useDialogActions: () => ({ openNewIssue: vi.fn() }),
}));

vi.mock("../hooks/useInboxBadge", () => ({
  useInboxBadge: () => ({ inbox: 3, failedRuns: 0 }),
}));

vi.mock("@/hooks/useAgentChatEnabled", () => ({
  useAgentChatEnabled: () => ({ enabled: false }),
}));

vi.mock("@/hooks/useCombinedInboxTasksEnabled", () => ({
  useCombinedInboxTasksEnabled: () => ({ enabled: false }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("MobileBottomNav localization", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("renders the mobile navigation actions in PT-BR", async () => {
    const root = createRoot(container);
    await act(async () => root.render(<MobileBottomNav visible />));

    const nav = container.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Navegação móvel");
    expect(nav?.textContent).toContain("Início");
    expect(nav?.textContent).toContain("Tarefas");
    expect(nav?.textContent).toContain("Nova tarefa");
    expect(nav?.textContent).toContain("Agentes");
    expect(nav?.textContent).toContain("Caixa de entrada");

    await act(async () => root.unmount());
  });

  it("keeps the mobile navigation available in English", async () => {
    await i18n.changeLanguage("en");
    const root = createRoot(container);
    await act(async () => root.render(<MobileBottomNav visible />));

    const nav = container.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Mobile navigation");
    expect(nav?.textContent).toContain("Home");
    expect(nav?.textContent).toContain("Tasks");
    expect(nav?.textContent).toContain("New Task");

    await act(async () => root.unmount());
  });
});
