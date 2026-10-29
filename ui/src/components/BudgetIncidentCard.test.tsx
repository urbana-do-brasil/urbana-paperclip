// @vitest-environment jsdom

import type { BudgetIncident } from "@paperclipai/shared";
import { act, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { formatCents } from "../lib/utils";
import { BudgetIncidentCard } from "./BudgetIncidentCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function incident(overrides: Partial<BudgetIncident> = {}): BudgetIncident {
  const now = new Date("2026-10-29T12:00:00.000Z");
  return {
    id: "incident-1",
    companyId: "company-1",
    policyId: "policy-1",
    scopeType: "project",
    scopeId: "project-1",
    scopeName: "Projeto Atlas",
    metric: "billed_cents",
    windowKind: "lifetime",
    windowStart: new Date("2026-10-01T00:00:00.000Z"),
    windowEnd: new Date("2026-11-01T00:00:00.000Z"),
    thresholdType: "hard",
    amountLimit: 1000,
    amountObserved: 1200,
    status: "open",
    approvalId: null,
    approvalStatus: null,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  await act(async () => { await i18n.changeLanguage("en"); });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  flushSync(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  await act(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
});

function render(node: ReactNode) {
  act(() => root.render(node));
}

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === label);
  if (!found) throw new Error(`Button "${label}" not found`);
  return found;
}

function input(label: string): HTMLInputElement {
  const found = container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
  if (!found) throw new Error(`Input "${label}" not found`);
  return found;
}

function setInputValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("Input value setter is unavailable");
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("BudgetIncidentCard localization", () => {
  it("localizes incident details and accepts a Brazilian decimal without changing resolution actions", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    const onRaiseAndResume = vi.fn();
    const onKeepPaused = vi.fn();
    render(
      <BudgetIncidentCard
        incident={incident()}
        onRaiseAndResume={onRaiseAndResume}
        onKeepPaused={onKeepPaused}
      />,
    );

    expect(container.textContent).toContain("Bloqueio rígido de Projeto");
    expect(container.textContent).toContain("Aberto");
    expect(container.textContent).toContain("O gasto chegou a");
    expect(container.textContent).toContain(formatCents(1200));
    expect(container.textContent).toContain(formatCents(1000));
    expect(container.textContent).toContain("Projeto Atlas");
    expect(container.textContent).toContain("A execução do projeto está pausada.");
    expect(input("Novo orçamento (USD)").value).toBe("22,00");

    await act(async () => setInputValue(input("Novo orçamento (USD)"), "12,00"));
    expect(container.textContent).toContain("O novo orçamento precisa ser maior que o gasto observado atual.");
    expect(button("Aumentar orçamento e retomar").disabled).toBe(true);
    await act(async () => setInputValue(input("Novo orçamento (USD)"), "25,75"));
    await act(async () => button("Aumentar orçamento e retomar").click());
    expect(onRaiseAndResume).toHaveBeenCalledWith(2575);

    await act(async () => button("Manter pausado").click());
    expect(onKeepPaused).toHaveBeenCalledOnce();

    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("Project hard stop");
    expect(container.textContent).toContain("Open");
    expect(container.textContent).toContain("Raise budget & resume");
    expect(container.textContent).toContain("Keep paused");
    expect(input("New budget (USD)")).toBeTruthy();
    expect(container.textContent).toContain("Projeto Atlas");
  });

  it("localizes incomplete-accounting and pending-approval states", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    render(
      <BudgetIncidentCard
        incident={incident({ scopeType: "agent", thresholdType: "hard", amountObserved: 700, amountLimit: 1000, approvalStatus: "pending" })}
        onRaiseAndResume={vi.fn()}
        onKeepPaused={vi.fn()}
      />,
    );

    expect(container.textContent).toContain("Bloqueio rígido de Agente");
    expect(container.textContent).toContain("Aguardando aprovação");
    expect(container.textContent).toContain("A contabilização está incompleta.");
    expect(container.textContent).toContain(formatCents(700));

    await act(async () => { await i18n.changeLanguage("en"); });
    expect(container.textContent).toContain("Agent hard stop");
    expect(container.textContent).toContain("Pending approval");
    expect(container.textContent).toContain("Accounting is incomplete.");
    expect(container.textContent).toContain("Projeto Atlas");
  });
});
