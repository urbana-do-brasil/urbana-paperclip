// @vitest-environment jsdom

import type { BudgetPolicySummary } from "@paperclipai/shared";
import { act as reactAct, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { formatCents } from "../lib/utils";
import { BudgetPolicyCard } from "./BudgetPolicyCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function summary(overrides: Partial<BudgetPolicySummary> = {}): BudgetPolicySummary {
  return {
    policyId: "policy-1",
    companyId: "company-1",
    scopeType: "project",
    scopeId: "project-1",
    scopeName: "Paperclip project",
    metric: "billed_cents",
    windowKind: "calendar_month_utc",
    amount: 5000,
    reservationCents: "0.0000000",
    observedAmount: 2500,
    observedAmountExact: "25.00",
    unpricedEventCount: 2,
    pendingRunCount: 1,
    remainingAmount: 2500,
    utilizationPercent: 50,
    warnPercent: 80,
    hardStopEnabled: true,
    unpricedUsagePolicy: "block",
    notifyEnabled: true,
    isActive: true,
    status: "warning",
    paused: false,
    pauseReason: null,
    windowStart: new Date("2026-10-01T00:00:00.000Z"),
    windowEnd: new Date("2026-11-01T00:00:00.000Z"),
    ...overrides,
  };
}

let root: Root;
let container: HTMLDivElement;

beforeEach(async () => {
  await reactAct(async () => { await i18n.changeLanguage("en"); });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  flushSync(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
});

function render(node: ReactNode) {
  flushSync(() => root.render(node));
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

describe("BudgetPolicyCard localization", () => {
  it("localizes the project budget and accepts a Brazilian decimal while preserving the USD amount", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    const onSave = vi.fn();
    render(<BudgetPolicyCard summary={summary()} onSave={onSave} variant="plain" />);

    expect(container.textContent).toContain("Orçamento mensal (UTC)");
    expect(container.textContent).toContain("Atenção");
    expect(container.querySelector('[role="progressbar"][aria-label="Utilização do orçamento: 50% usado"]')).not.toBeNull();
    expect(container.textContent).toContain(formatCents(2500));
    expect(container.textContent).toContain("1 execução concluída aguarda contabilização.");
    expect(container.textContent).toContain("2 eventos de uso não têm preço confiável. Seus custos ficam fora do gasto conhecido.");

    const amount = input("Orçamento (USD)");
    expect(amount.value).toBe("50,00");
    expect(amount.placeholder).toBe("0,00");
    await reactAct(async () => setInputValue(amount, "25,75"));
    await reactAct(async () => button("Atualizar orçamento").click());

    expect(onSave).toHaveBeenCalledWith(2575);
  });

  it("localizes advanced settings while preserving reservation and unpriced-usage callbacks", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    const onReservationChange = vi.fn();
    const onUnpricedUsagePolicyChange = vi.fn();
    render(
      <BudgetPolicyCard
        summary={summary({ paused: true, pauseReason: "budget" })}
        onReservationChange={onReservationChange}
        onUnpricedUsagePolicyChange={onUnpricedUsagePolicyChange}
      />,
    );

    expect(container.textContent).toContain("Pausado");
    expect(container.textContent).toContain("A execução deste projeto está pausada até que o bloqueio de orçamento seja resolvido.");
    const advanced = container.querySelector<HTMLElement>("summary");
    if (!advanced) throw new Error("Advanced settings summary not found");
    await reactAct(async () => advanced.click());

    const reservation = input("Reserva por execução (USD)");
    await reactAct(async () => setInputValue(reservation, "2,50"));
    await reactAct(async () => button("Atualizar reserva").click());
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!checkbox) throw new Error("Unpriced usage policy checkbox not found");
    await reactAct(async () => checkbox.click());

    expect(onReservationChange).toHaveBeenCalledWith("250.0000000");
    expect(onUnpricedUsagePolicyChange).toHaveBeenCalledWith("allow");
  });

  it("keeps the English labels and decimal input available", () => {
    render(<BudgetPolicyCard summary={summary({ scopeType: "agent", windowKind: "lifetime" })} onSave={vi.fn()} />);

    expect(container.textContent).toContain("Lifetime budget");
    expect(container.textContent).toContain("Agent");
    expect(input("Budget (USD)").value).toBe("50.00");
  });
});
