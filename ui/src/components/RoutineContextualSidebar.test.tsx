// @vitest-environment jsdom

import type { ReactNode } from "react";
import { act } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import {
  RoutineContextualSidebar,
  resolveRoutineDetailDestination,
  routineDetailHref,
} from "./RoutineContextualSidebar";

vi.mock("@/lib/router", () => ({
  useParams: () => ({ routineId: "routine-route" }),
}));

vi.mock("@/api/routines", () => ({
  routinesApi: { get: vi.fn() },
}));

vi.mock("./ContextualSidebarFrame", () => ({
  ContextualSidebarFrame: ({
    surface,
    title,
    fallbackTo,
    showHeader,
    className,
    children,
  }: {
    surface: string;
    title: string;
    fallbackTo: string;
    showHeader?: boolean;
    className?: string;
    children: ReactNode;
  }) => (
    <aside
      className={className}
      data-surface={surface}
      data-title={title}
      data-fallback={fallbackTo}
      data-show-header={String(showHeader)}
    >
      {children}
    </aside>
  ),
}));

vi.mock("./SidebarNavItem", () => ({
  SidebarNavItem: ({ to, label }: { to: string; label: string }) => <a href={to}>{label}</a>,
}));

describe("routine contextual navigation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it("builds stable routine detail destinations", () => {
    expect(routineDetailHref("routine-1")).toBe("/routines/routine-1/overview");
    expect(routineDetailHref("routine-1", "triggers")).toBe("/routines/routine-1/triggers");
    expect(routineDetailHref("routine-1", "runs")).toBe(
      "/routines/routine-1/runs",
    );
    expect(routineDetailHref("routine-1", "activity")).toBe(
      "/routines/routine-1/activity",
    );
  });

  it("defaults and resolves legacy operation routes locally without remembering a prior section", () => {
    expect(resolveRoutineDetailDestination({ routineId: "routine-1" }))
      .toBe("/routines/routine-1/overview");
    expect(resolveRoutineDetailDestination({ routineId: "routine-1", section: "unknown" }))
      .toBe("/routines/routine-1/overview");
    expect(resolveRoutineDetailDestination({ routineId: "routine-1", section: "runs" }))
      .toBe("/routines/routine-1/runs");
    expect(resolveRoutineDetailDestination({ routineId: "routine-1", legacyTab: "activity" }))
      .toBe("/routines/routine-1/activity");
  });

  it("renders the routine contextual sidebar with configuration and operation links", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    flushSync(() => root.render(
      <QueryClientProvider client={queryClient}>
        <RoutineContextualSidebar routineId="routine-1" title="Weekly release review" />
      </QueryClientProvider>,
    ));

    const frame = container.querySelector("aside");
    expect(frame?.getAttribute("data-surface")).toBe("routine");
    expect(frame?.getAttribute("data-title")).toBe("Weekly release review");
    expect(frame?.getAttribute("data-fallback")).toBe("/routines");
    expect(frame?.getAttribute("data-show-header")).toBe("false");
    expect(frame?.classList).toContain("bg-background");
    expect(frame?.classList).toContain("border-r");
    expect(container.querySelector('a[href="/routines/routine-1/overview"]')?.textContent).toBe("Overview");
    expect(container.querySelector('a[href="/routines/routine-1/triggers"]')?.textContent).toBe("Triggers");
    expect(container.querySelector('a[href="/routines/routine-1/variables"]')?.textContent).toBe("Variables");
    expect(container.querySelector('a[href="/routines/routine-1/delivery"]')?.textContent).toBe("Delivery");
    expect(container.querySelector('a[href="/routines/routine-1/secrets"]')?.textContent).toBe("Secrets");
    expect(container.querySelector('a[href="/routines/routine-1/runs"]')?.textContent).toBe("Runs");
    expect(container.querySelector('a[href="/routines/routine-1/activity"]')?.textContent).toBe("Activity");
    expect(container.querySelector('nav[aria-label="Routine sections"]')).not.toBeNull();
    expect(container.textContent).toContain("Operate");
    expect(container.textContent).not.toContain("History");
  });

  it("localizes the contextual navigation in PT-BR while preserving routine content and routes", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    flushSync(() => root.render(
      <QueryClientProvider client={queryClient}>
        <RoutineContextualSidebar routineId="routine-1" title="Weekly release review" />
      </QueryClientProvider>,
    ));

    await act(async () => { await i18n.changeLanguage("pt-BR"); });

    expect(container.querySelector("aside")?.getAttribute("data-title")).toBe("Weekly release review");
    expect(container.querySelector('nav[aria-label="Seções da rotina"]')).not.toBeNull();
    expect(Array.from(container.querySelectorAll("a")).map((link) => [link.getAttribute("href"), link.textContent])).toEqual([
      ["/routines/routine-1/overview", "Resumo"],
      ["/routines/routine-1/triggers", "Gatilhos"],
      ["/routines/routine-1/variables", "Variáveis"],
      ["/routines/routine-1/delivery", "Entrega"],
      ["/routines/routine-1/secrets", "Segredos"],
      ["/routines/routine-1/runs", "Execuções"],
      ["/routines/routine-1/activity", "Atividade"],
    ]);
    expect(container.textContent).toContain("Operação");
    expect(container.textContent).not.toContain("Operate");
    queryClient.clear();
  });
});
