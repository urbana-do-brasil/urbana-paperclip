import { describe, expect, it } from "vitest";
import { DEFAULT_USER_LOCALE, FALLBACK_LOCALE, intlLocale, isSupportedLocale, resolveLocale } from "./localization.js";

describe("locale contract", () => {
  it("separates the user default from the reference language", () => {
    expect(DEFAULT_USER_LOCALE).toBe("pt-BR");
    expect(FALLBACK_LOCALE).toBe("en");
    expect(intlLocale("en")).toBe("en-US");
  });
  it("accepts only canonical supported values, without browser or host inference", () => {
    for (const value of [undefined, null, "", "pt", "pt-br", "en-US", "fr", {}, 1]) {
      expect(isSupportedLocale(value)).toBe(false);
      expect(resolveLocale(value)).toBe("pt-BR");
    }
    for (const locale of ["pt-BR", "en"] as const) {
      expect(isSupportedLocale(locale)).toBe(true);
      expect(resolveLocale(locale)).toBe(locale);
    }
  });
});
