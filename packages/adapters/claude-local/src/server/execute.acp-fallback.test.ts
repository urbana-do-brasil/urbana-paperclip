import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureAdapterExecutionTargetCommandResolvable,
  ensureAdapterExecutionTargetRuntimeCommandInstalled,
  executeClaudeAcp,
  resolveAdapterExecutionTargetCommandForLogs,
  runAdapterExecutionTargetProcess,
} = vi.hoisted(() => ({
  ensureAdapterExecutionTargetCommandResolvable: vi.fn(async () => undefined),
  ensureAdapterExecutionTargetRuntimeCommandInstalled: vi.fn(async () => undefined),
  executeClaudeAcp: vi.fn(async () => {
    throw new Error('Transform failed with 1 error: execute.ts:818:0: ERROR: Unexpected "<<"');
  }),
  resolveAdapterExecutionTargetCommandForLogs: vi.fn(async () => "claude"),
  runAdapterExecutionTargetProcess: vi.fn(async () => ({
    exitCode: 0,
    signal: null,
    timedOut: false,
    stdout: [
      JSON.stringify({ type: "system", subtype: "init", session_id: "claude-session-1", model: "claude-sonnet" }),
      JSON.stringify({
        type: "assistant",
        session_id: "claude-session-1",
        message: { content: [{ type: "text", text: "hello" }] },
      }),
      JSON.stringify({
        type: "result",
        session_id: "claude-session-1",
        result: "hello",
        usage: { input_tokens: 1, cache_read_input_tokens: 0, output_tokens: 1 },
      }),
    ].join("\n"),
    stderr: "",
    pid: 123,
    startedAt: new Date().toISOString(),
  })),
}));

vi.mock("./acp.js", () => ({
  createClaudeAcpExecutor: () => executeClaudeAcp,
  resolveClaudeExecutionEngineForRun: async (ctx: { config: Record<string, unknown> }) =>
    ctx.config.engine === "cli"
      ? { engine: "cli", explicit: true }
      : ctx.config.engine === "acp"
      ? { engine: "acp", explicit: true }
      : { engine: "acp", explicit: false },
}));

vi.mock("@paperclipai/adapter-utils/execution-target", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/execution-target")>(
    "@paperclipai/adapter-utils/execution-target",
  );
  return {
    ...actual,
    ensureAdapterExecutionTargetCommandResolvable,
    ensureAdapterExecutionTargetRuntimeCommandInstalled,
    resolveAdapterExecutionTargetCommandForLogs,
    runAdapterExecutionTargetProcess,
  };
});

import { execute } from "./execute.js";
import type { AdapterInvocationMeta } from "@paperclipai/adapter-utils";
import { createCommunicationLocalePromptFixture } from "@paperclipai/adapter-utils/test-fixtures/prompt-context";

function buildContext(config: Record<string, unknown> = {}) {
  return {
    runId: "run-1",
    agent: {
      id: "agent-1",
      companyId: "company-1",
      name: "Claude Coder",
      adapterType: "claude_local",
      adapterConfig: {},
    },
    runtime: {
      sessionId: null,
      sessionParams: null,
      sessionDisplayId: null,
      taskKey: null,
    },
    config,
    context: {},
    onLog: vi.fn(async () => {}),
  };
}

describe("claude_local ACP startup fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not start CLI after default ACP fails", async () => {
    const ctx = buildContext();
    await expect(execute(ctx as never)).rejects.toThrow('Unexpected "<<"');
    expect(executeClaudeAcp).toHaveBeenCalledTimes(1);
    expect(runAdapterExecutionTargetProcess).not.toHaveBeenCalled();
  });

  it("trusts the Paperclip API URL when network access is allowlisted", async () => {
    const paperclipApiUrl = "http://127.0.0.1:4310";
    vi.stubEnv("PAPERCLIP_API_URL", paperclipApiUrl);
    const ctx = buildContext({ engine: "cli", networkScope: "allowlist" });

    await execute(ctx as never);

    expect(runAdapterExecutionTargetProcess).toHaveBeenCalledTimes(1);
    expect(runAdapterExecutionTargetProcess).toHaveBeenCalledWith(
      expect.any(String),
      null,
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        localProcessSandbox: expect.objectContaining({
          networkScope: "allowlist",
          networkTrustedUrls: [paperclipApiUrl],
        }),
      }),
    );
  });

  it("keeps explicit ACP strict when startup fails", async () => {
    const ctx = buildContext({ engine: "acp" });

    await expect(execute(ctx as never)).rejects.toThrow('Unexpected "<<"');

    expect(runAdapterExecutionTargetProcess).not.toHaveBeenCalled();
  });

  it.each(["pt-BR", "en"] as const)(
    "carries communication locale through the Claude CLI stdin prompt on fresh and resumed turns (%s)",
    async (locale) => {
      const prompts: string[] = [];
      const promptTemplate = "Configured agent instruction: preserve `response_mode=json` and token `TASK_PENDING`.";
      const resumedSessionId = "a73d0fb0-3bd7-4ce0-b484-1d3397ad1e6b";
      runAdapterExecutionTargetProcess.mockReset().mockResolvedValue({
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: [
          JSON.stringify({ type: "system", subtype: "init", session_id: "localized-claude-session" }),
          JSON.stringify({
            type: "result",
            session_id: "localized-claude-session",
            result: "done",
            usage: { input_tokens: 1, cache_read_input_tokens: 0, output_tokens: 1 },
          }),
        ].join("\n"),
        stderr: "",
        pid: 123,
        startedAt: new Date().toISOString(),
      });

      for (const sessionId of [null, resumedSessionId] as const) {
        const cwd = process.cwd();
        const ctx = buildContext({ engine: "cli", env: {}, cwd, promptTemplate });
        await execute({
          ...ctx,
          runtime: {
            ...ctx.runtime,
            sessionId,
            sessionParams: sessionId ? { sessionId, cwd } : null,
          },
          context: createCommunicationLocalePromptFixture(locale),
          onMeta: async (meta: AdapterInvocationMeta) => { prompts.push(meta.prompt ?? ""); },
        } as never);

        const call = (runAdapterExecutionTargetProcess.mock.calls as unknown[][]).at(-1);
        const args = call?.[3] as string[] | undefined;
        const options = call?.[4] as { stdin?: string } | undefined;
        const prompt = prompts.at(-1) ?? "";
        expect(options?.stdin).toBe(prompt);
        if (sessionId) expect(args).toContain(sessionId);
      }

      const languageDirective = locale === "pt-BR"
        ? "Write human-facing replies, comments, questions, confirmations, and options in Brazilian Portuguese (pt-BR)."
        : "Write human-facing replies, comments, questions, confirmations, and options in English.";
      expect(prompts).toHaveLength(2);
      for (const prompt of prompts) {
        expect(prompt).toContain("## Human communication language");
        expect(prompt).toContain(languageDirective);
        expect(prompt).toContain("`curl --fail --silent https://example.invalid/health`");
        expect(prompt).toContain("`X-Trace-Mode: RAW`");
        expect(prompt).toContain("`WAITING_FOR_REVIEW`");
      }
      expect(prompts[0]).toContain("Configured agent instruction: preserve `response_mode=json` and token `TASK_PENDING`.");
      expect(prompts[0]).toContain("## Owned assignment");
      expect(prompts[1]).toContain("## Compact assignment");
      expect(prompts[1]).not.toContain("Configured agent instruction:");
      if (locale === "pt-BR") {
        expect(prompts[0]).toContain("Do not switch these interactions to English.");
        expect(prompts[0]).not.toContain("ASD-STE100 Simplified Technical English");
      } else {
        expect(prompts[0]).toContain("ASD-STE100 Simplified Technical English");
      }
    },
  );
});
