import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureAdapterExecutionTargetCommandResolvable,
  ensureAdapterExecutionTargetRuntimeCommandInstalled,
  executeCodexAcp,
  prepareCodexRuntimeConfig,
  readPaperclipRuntimeSkillEntries,
  resolveAdapterExecutionTargetCommandForLogs,
  runAdapterExecutionTargetProcess,
  tempCodexHome,
} = vi.hoisted(() => ({
  ensureAdapterExecutionTargetCommandResolvable: vi.fn(async () => undefined),
  ensureAdapterExecutionTargetRuntimeCommandInstalled: vi.fn(async () => undefined),
  executeCodexAcp: vi.fn(async () => {
    throw new Error('Transform failed with 1 error: execute.ts:818:0: ERROR: Unexpected "<<"');
  }),
  prepareCodexRuntimeConfig: vi.fn(async () => ({ cleanup: vi.fn(async () => undefined), notes: [] })),
  readPaperclipRuntimeSkillEntries: vi.fn(async () => []),
  resolveAdapterExecutionTargetCommandForLogs: vi.fn(async () => "codex"),
  runAdapterExecutionTargetProcess: vi.fn(async () => ({
    exitCode: 0,
    signal: null,
    timedOut: false,
    stdout: [
      JSON.stringify({ type: "thread.started", thread_id: "codex-thread-1" }),
      JSON.stringify({
        type: "item.completed",
        item: { type: "agent_message", text: "hello" },
      }),
      JSON.stringify({
        type: "turn.completed",
        usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 },
      }),
    ].join("\n"),
    stderr: "",
    pid: 123,
    startedAt: new Date().toISOString(),
  })),
  tempCodexHome: "/tmp/paperclip-codex-acp-fallback-test-home",
}));

vi.mock("./acp.js", () => ({
  createCodexAcpExecutor: () => executeCodexAcp,
  resolveCodexExecutionEngineForRun: async (ctx: { config: Record<string, unknown> }) =>
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

vi.mock("@paperclipai/adapter-utils/server-utils", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/adapter-utils/server-utils")>(
    "@paperclipai/adapter-utils/server-utils",
  );
  return {
    ...actual,
    readPaperclipRuntimeSkillEntries,
  };
});

vi.mock("./codex-home.js", async () => {
  const actual = await vi.importActual<typeof import("./codex-home.js")>("./codex-home.js");
  return {
    ...actual,
    evaluateCodexCredentialReadiness: vi.fn(async () => ({
      managed: true,
      authMode: "api",
      ready: true,
      effectiveHome: tempCodexHome,
      sharedSourceHome: tempCodexHome,
    })),
    isManagedCodexHomePath: vi.fn(() => true),
    prepareManagedCodexHome: vi.fn(async () => ({ status: "seeded", home: tempCodexHome })),
    resolveManagedCodexHomeDir: vi.fn(() => tempCodexHome),
    seedManagedCodexHome: vi.fn(async () => ({ status: "seeded", home: tempCodexHome })),
  };
});

vi.mock("./runtime-config.js", async () => {
  const actual = await vi.importActual<typeof import("./runtime-config.js")>("./runtime-config.js");
  return {
    ...actual,
    prepareCodexRuntimeConfig,
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
      name: "Codex Coder",
      adapterType: "codex_local",
      adapterConfig: {},
    },
    runtime: {
      sessionId: null,
      sessionParams: null,
      sessionDisplayId: null,
      taskKey: null,
    },
    config: {
      outputInactivityTimeoutMs: null,
      env: { OPENAI_API_KEY: "test-key" },
      ...config,
    },
    context: {},
    onLog: vi.fn(async () => {}),
  };
}

describe("codex_local ACP startup fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not start CLI after default ACP fails", async () => {
    const ctx = buildContext();
    await expect(execute(ctx as never)).rejects.toThrow('Unexpected "<<"');
    expect(executeCodexAcp).toHaveBeenCalledTimes(1);
    expect(runAdapterExecutionTargetProcess).not.toHaveBeenCalled();
  });

  it("keeps explicit ACP strict when startup fails", async () => {
    const ctx = buildContext({ engine: "acp" });

    await expect(execute(ctx as never)).rejects.toThrow('Unexpected "<<"');

    expect(runAdapterExecutionTargetProcess).not.toHaveBeenCalled();
  });

  it.each(["pt-BR", "en"] as const)(
    "carries communication locale through the Codex CLI stdin prompt on fresh and resumed turns (%s)",
    async (locale) => {
      const prompts: string[] = [];
      const promptTemplate = "Configured agent instruction: preserve `response_mode=json` and token `TASK_PENDING`.";
      runAdapterExecutionTargetProcess.mockReset().mockResolvedValue({
        exitCode: 0,
        signal: null,
        timedOut: false,
        stdout: [
          JSON.stringify({ type: "thread.started", thread_id: "localized-codex-session" }),
          JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }),
        ].join("\n"),
        stderr: "",
        pid: 123,
        startedAt: new Date().toISOString(),
      });

      for (const sessionId of [null, "codex-session-existing"] as const) {
        const ctx = buildContext({ engine: "cli", env: {}, promptTemplate });
        await execute({
          ...ctx,
          runtime: { ...ctx.runtime, sessionId },
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
