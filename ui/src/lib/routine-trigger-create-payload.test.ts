import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { buildRoutineTriggerCreatePayload } from "./routine-trigger-create-payload";

describe.each(["en", "pt-BR"] as const)("routine trigger create payload (%s)", (locale) => {
  beforeEach(async () => {
    await i18n.changeLanguage(locale);
  });

  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("trims schedule expressions and preserves timezone and per-kind labels", () => {
    expect(buildRoutineTriggerCreatePayload(
      {
        kind: "schedule",
        cronExpression: " 0 9 * * 1-5 ",
        signingMode: "bearer",
        replayWindowSec: "300",
      },
      [{ kind: "schedule" }, { kind: "webhook" }],
      "America/Sao_Paulo",
    )).toEqual({
      kind: "schedule",
      label: "schedule-2",
      cronExpression: "0 9 * * 1-5",
      timezone: "America/Sao_Paulo",
    });
  });

  it("preserves webhook signing mode and numeric replay-window contract", () => {
    expect(buildRoutineTriggerCreatePayload(
      {
        kind: "webhook",
        cronExpression: "0 10 * * *",
        signingMode: "app_webhook",
        replayWindowSec: "900",
      },
      [{ kind: "webhook" }, { kind: "schedule" }, { kind: "webhook" }],
    )).toEqual({
      kind: "webhook",
      label: "webhook-3",
      signingMode: "app_webhook",
      replayWindowSec: 900,
    });
  });

  it("uses the existing default replay window when the draft is empty", () => {
    expect(buildRoutineTriggerCreatePayload(
      {
        kind: "webhook",
        cronExpression: "0 10 * * *",
        signingMode: "bearer",
        replayWindowSec: "",
      },
      [],
    )).toEqual({
      kind: "webhook",
      label: "webhook",
      signingMode: "bearer",
      replayWindowSec: 300,
    });
  });
});
