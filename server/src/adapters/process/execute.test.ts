import { describe, expect, it } from "vitest";
import { execute } from "./execute.js";

const SCRIPT = `process.stdout.write(JSON.stringify({
  locale: process.env.PAPERCLIP_COMMUNICATION_LOCALE,
  guidance: process.env.PAPERCLIP_COMMUNICATION_GUIDANCE,
  args: process.argv.slice(1),
  hasWakeJson: Object.prototype.hasOwnProperty.call(process.env, "PAPERCLIP_WAKE_PAYLOAD_JSON"),
  customFlag: process.env.CUSTOM_PROCESS_FLAG,
}));`;

describe("process adapter communication environment", () => {
  it.each([
    {
      label: "English with simplified interaction style",
      wake: { communicationLocale: "en", simplifiedEnglishInteractions: true },
      expectedLocale: "en",
      requiredGuidance: "ASD-STE100 Simplified Technical English",
      forbiddenGuidance: "Brazilian Portuguese (pt-BR)",
    },
    {
      label: "Brazilian Portuguese with the experimental style flag",
      wake: { communicationLocale: "pt-BR", simplifiedEnglishInteractions: true },
      expectedLocale: "pt-BR",
      requiredGuidance: "keep structured human interactions brief and clear in Brazilian Portuguese (pt-BR)",
      forbiddenGuidance: "ASD-STE100 Simplified Technical English",
    },
    {
      label: "historical wake without a locale",
      wake: { reason: "issue_commented" },
      expectedLocale: "pt-BR",
      requiredGuidance: "Brazilian Portuguese (pt-BR)",
      forbiddenGuidance: "ASD-STE100 Simplified Technical English",
    },
    {
      label: "wake with an unsupported locale",
      wake: { communicationLocale: "es", reason: "issue_commented" },
      expectedLocale: "pt-BR",
      requiredGuidance: "Brazilian Portuguese (pt-BR)",
      forbiddenGuidance: "ASD-STE100 Simplified Technical English",
    },
  ])("passes a small server-owned communication contract to the child: $label", async (input) => {
    const wakeText = "private wake content that must not enter the environment";
    const args = ["-e", SCRIPT, "original-argument"];
    const metadata: Record<string, unknown>[] = [];
    const result = await execute({
      runId: "run-process-locale",
      agent: {
        id: "agent-process-locale",
        companyId: "company-process-locale",
        name: "Custom process agent",
        adapterType: "process",
        adapterConfig: {},
      },
      runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
      config: {
        command: process.execPath,
        args,
        cwd: process.cwd(),
        timeoutSec: 10,
        graceSec: 1,
        env: {
          CUSTOM_PROCESS_FLAG: "kept",
          PAPERCLIP_COMMUNICATION_LOCALE: "forged-locale",
          PAPERCLIP_COMMUNICATION_GUIDANCE: "forged guidance",
          PAPERCLIP_WAKE_PAYLOAD_JSON: "stale configured wake",
        },
      },
      context: {
        paperclipWake: {
          ...input.wake,
          issue: { id: "issue-process-locale", description: wakeText },
          comments: [{ id: "comment-process-locale", body: wakeText }],
        },
      },
      onLog: async () => {},
      onMeta: async (meta) => { metadata.push(meta as unknown as Record<string, unknown>); },
    });

    expect(result).toMatchObject({ exitCode: 0, timedOut: false });
    const childOutput = JSON.parse(String(result.resultJson?.stdout ?? "")) as Record<string, unknown>;
    expect(childOutput.locale).toBe(input.expectedLocale);
    expect(childOutput.guidance).toContain(input.requiredGuidance);
    expect(childOutput.guidance).not.toContain(input.forbiddenGuidance);
    expect(childOutput.guidance).not.toContain(wakeText);
    expect(childOutput.args).toEqual(["original-argument"]);
    expect(childOutput.hasWakeJson).toBe(false);
    expect(childOutput.customFlag).toBe("kept");
    expect(metadata[0]?.commandArgs).toEqual(args);
    expect(metadata[0]?.env).toMatchObject({
      PAPERCLIP_COMMUNICATION_LOCALE: input.expectedLocale,
      PAPERCLIP_COMMUNICATION_GUIDANCE: expect.stringContaining(input.requiredGuidance),
      CUSTOM_PROCESS_FLAG: "kept",
    });
  });
});
