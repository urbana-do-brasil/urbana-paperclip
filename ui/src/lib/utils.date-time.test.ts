import { i18n } from "../i18n";
import { beforeEach, describe, expect, it } from "vitest";
import { formatDateTime } from "./utils";

beforeEach(async () => { await i18n.changeLanguage("en"); });

describe("formatDateTime", () => {
  // Local construction avoids assuming the test runner's timezone.
  const timestamp = new Date(2026, 8, 7, 13, 2, 54);

  it("preserves minute precision for existing callers", () => {
    expect(formatDateTime(timestamp)).toBe("Sep 7, 2026, 1:02 PM");
  });

  it("distinguishes activity in the same minute when seconds are requested", () => {
    expect(formatDateTime(timestamp, { includeSeconds: true })).toBe(
      "Sep 7, 2026, 1:02:54 PM",
    );
    expect(
      formatDateTime(new Date(2026, 8, 7, 13, 2, 55), { includeSeconds: true }),
    ).toBe("Sep 7, 2026, 1:02:55 PM");
  });

  it("formats serialized server timestamps identically to Date values", () => {
    expect(
      formatDateTime(timestamp.toISOString(), { includeSeconds: true }),
    ).toBe(formatDateTime(timestamp, { includeSeconds: true }));
  });

  it("uses Portuguese presentation with an explicit timezone", async () => {
    await i18n.changeLanguage("pt-BR");
    expect(formatDateTime("2026-09-07T01:02:55.000Z", { includeSeconds: true, timeZone: "America/Sao_Paulo" })).toBe("6 de set. de 2026, 22:02:55");
  });
});
