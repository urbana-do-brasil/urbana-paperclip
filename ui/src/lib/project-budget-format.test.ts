import { i18n } from "../i18n";
import { beforeEach, describe, expect, it } from "vitest";
import { formatProjectBudget } from "./utils";

beforeEach(async () => { await i18n.changeLanguage("en"); });

describe("formatProjectBudget", () => {
  it("renders a /mo suffix for monthly budgets", () => {
    expect(formatProjectBudget({ amountCents: 120_000, windowKind: "calendar_month_utc" })).toBe("$1,200.00/mo");
  });

  it("renders the bare amount for lifetime budgets", () => {
    expect(formatProjectBudget({ amountCents: 50_000, windowKind: "lifetime" })).toBe("$500.00");
  });

  it("formats sub-dollar amounts with cents", () => {
    expect(formatProjectBudget({ amountCents: 150, windowKind: "lifetime" })).toBe("$1.50");
  });

  it("updates the same amount and period after a confirmed language change", async () => {
    const budget = { amountCents: 120_000, windowKind: "calendar_month_utc" };
    await i18n.changeLanguage("pt-BR");
    expect(formatProjectBudget(budget)).toBe("US$\u00a01.200,00/mês");
    await i18n.changeLanguage("en");
    expect(formatProjectBudget(budget)).toBe("$1,200.00/mo");
    expect(budget.amountCents).toBe(120_000);
  });
});
