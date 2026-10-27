import { describe, expect, it } from "vitest";
import { createLocaleFormatters } from "./localized-format.js";

const pt = createLocaleFormatters("pt-BR");
const en = createLocaleFormatters("en");
describe("localized presentation", () => {
  it("preserves USD and the amount while changing separators", () => {
    expect(pt.cents(123456)).toBe("US$\u00a01.234,56");
    expect(en.cents(123456)).toBe("$1,234.56");
    expect(pt.cents(123456, "BRL")).toBe("R$\u00a01.234,56");
    expect(pt.cents(123456, "legacy")).toBe("legacy 1.234,56");
    expect(en.cents(0.1234567, "USD", 9)).toBe("$0.001234567");
  });
  it("formats quantities and fractions using the selected language", () => {
    expect(pt.number(1234.5)).toBe("1.234,5");
    expect(en.number(1234.5)).toBe("1,234.5");
    expect(pt.number(0.125, { style: "percent", maximumFractionDigits: 1 })).toBe("12,5%");
    expect(en.number(0.125, { style: "percent", maximumFractionDigits: 1 })).toBe("12.5%");
    expect(pt.tokens(1500)).toBe("1,5\u00a0mil");
    expect(en.tokens(1500)).toBe("1.5K");
  });
  it("keeps the original instant and explicit timezone across languages", () => {
    const instant = new Date("2026-09-07T01:02:55.000Z");
    const options: Intl.DateTimeFormatOptions = { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };
    expect(pt.date(instant, options)).toBe("06/09/2026, 22:02");
    expect(en.date(instant, options)).toBe("09/06/2026, 22:02");
    expect(instant.toISOString()).toBe("2026-09-07T01:02:55.000Z");
    expect(pt.date(instant, { ...options, timeZone: "UTC" })).toBe("07/09/2026, 01:02");
  });
  it("formats elapsed time and relative quantities independently of stored values", () => {
    expect(pt.duration(3720000)).toBe("1 h 2 min");
    expect(en.duration(3720000)).toBe("1 hr 2 min");
    expect(pt.duration(0)).toBe("0 s");
    expect(en.duration(0)).toBe("0 sec");
    expect(pt.relative(-2, "minute")).toBe("há 2 min.");
    expect(en.relative(-2, "minute")).toBe("2 min. ago");
  });
});
