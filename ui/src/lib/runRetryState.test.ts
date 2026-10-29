import { describe, expect, it } from "vitest";
import { describeRunRetryState, formatRetryReason } from "./runRetryState";
import { i18n } from "../i18n";

describe("runRetryState", () => {
  it("formats internal retry reasons for operators", () => {
    expect(formatRetryReason("transient_failure")).toBe("Transient failure");
    expect(formatRetryReason("native_provider_overloaded")).toBe("Model at capacity");
    expect(formatRetryReason("issue_continuation_needed")).toBe("Continuation needed");
    expect(formatRetryReason("max_turns_continuation")).toBe("Max-turn continuation");
    expect(formatRetryReason("custom_reason")).toBe("custom reason");
  });

  it("describes scheduled retries", () => {
    expect(
      describeRunRetryState({
        status: "scheduled_retry",
        retryOfRunId: "run-1",
        scheduledRetryAttempt: 2,
        scheduledRetryReason: "transient_failure",
        scheduledRetryAt: "2026-04-18T20:15:00.000Z",
      }),
    ).toMatchObject({
      kind: "scheduled",
      badgeLabel: "Retry scheduled",
      detail: "Attempt 2 · Transient failure",
    });
  });

  it("describes max-turn continuation retries distinctly", () => {
    expect(
      describeRunRetryState({
        status: "scheduled_retry",
        retryOfRunId: "run-max-turns",
        scheduledRetryAttempt: 1,
        scheduledRetryReason: "max_turns_continuation",
        scheduledRetryAt: "2026-04-18T20:15:00.000Z",
      }),
    ).toMatchObject({
      kind: "scheduled",
      badgeLabel: "Continuation scheduled",
      detail: "Attempt 1 · Max-turn continuation",
    });
  });

  it("describes exhausted retries", () => {
    expect(
      describeRunRetryState({
        status: "failed",
        retryOfRunId: "run-1",
        scheduledRetryAttempt: 4,
        scheduledRetryReason: "transient_failure",
        retryExhaustedReason: "Bounded retry exhausted after 4 scheduled attempts; no further automatic retry will be queued",
      }),
    ).toMatchObject({
      kind: "exhausted",
      badgeLabel: "Retry exhausted",
      detail: "Attempt 4 · Transient failure · Automatic retries exhausted",
      secondary: "Bounded retry exhausted after 4 scheduled attempts; no further automatic retry will be queued Manual intervention required.",
    });
  });

  it("uses localized retry labels while retaining the raw exhaustion diagnostic", () => {
    const translate = (key: string, options?: { count?: number; reason?: string; date?: string }) =>
      i18n.t(key, { ...options, lng: "pt-BR" });
    const summary = describeRunRetryState({
      status: "failed",
      retryOfRunId: "run-1",
      scheduledRetryAttempt: 4,
      scheduledRetryReason: "transient_failure",
      retryExhaustedReason: "Retry limit reached after 4 attempts",
    }, translate);

    expect(summary).toMatchObject({
      badgeLabel: "Tentativas esgotadas",
      detail: "Tentativa 4 · Falha temporária · Tentativas automáticas esgotadas",
      secondary: "Retry limit reached after 4 attempts É necessária intervenção manual.",
    });
  });
});
