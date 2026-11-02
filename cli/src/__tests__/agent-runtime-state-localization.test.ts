import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const TASK_KEY = "task:Recovery-17";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const RUNTIME_STATE = {
  agentId: AGENT_ID,
  state: "waiting_for_approval",
  activeSessionId: "session_CaseSensitive-9",
  adapterType: "codex_local",
  lastRunAt: "2026-10-31T23:15:00.000Z",
  runtimeMetadata: { providerStatus: "RateLimit/429", opaqueValue: "KEEP/This-Case" },
};

const RESET_RESULT = {
  agentId: AGENT_ID,
  taskKey: TASK_KEY,
  reset: true,
  previousSessionId: "session_CaseSensitive-9",
  nextSessionId: null,
};

const TASK_SESSIONS = [{
  taskKey: TASK_KEY,
  sessionId: "provider:Session-ABC",
  status: "completed_by_provider",
  providerType: "codex_local",
  updatedAt: "2026-10-31T23:15:00.000Z",
  sessionParamsJson: { turnCount: 4, toolNames: ["Read", "Write"] },
}];

const OPERATIONS = [
  {
    name: "runtime-state",
    args: ["agent", "runtime-state", AGENT_ID],
    path: `/api/agents/${AGENT_ID}/runtime-state`,
    method: "GET",
    response: RUNTIME_STATE,
    description: { en: "Get agent runtime state", "pt-BR": "Consultar o estado de runtime do agente" },
    label: { en: "Agent runtime state:", "pt-BR": "Estado de runtime do agente:" },
  },
  {
    name: "runtime-state:reset-session",
    args: ["agent", "runtime-state:reset-session", AGENT_ID, "--task-key", TASK_KEY],
    path: `/api/agents/${AGENT_ID}/runtime-state/reset-session`,
    method: "POST",
    body: { taskKey: TASK_KEY },
    response: RESET_RESULT,
    description: { en: "Reset an agent runtime session", "pt-BR": "Redefinir uma sessão de runtime do agente" },
    success: {
      en: `Reset runtime session for agent ${AGENT_ID}.`,
      "pt-BR": `Sessão de runtime redefinida para o agente ${AGENT_ID}.`,
    },
  },
  {
    name: "task-sessions",
    args: ["agent", "task-sessions", AGENT_ID],
    path: `/api/agents/${AGENT_ID}/task-sessions`,
    method: "GET",
    response: TASK_SESSIONS,
    description: { en: "List agent task sessions", "pt-BR": "Listar sessões de tarefas do agente" },
    label: { en: "Agent task sessions:", "pt-BR": "Sessões de tarefas do agente:" },
  },
] as const;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerAgentCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

function assertJsonApiContract(actual: unknown, expected: unknown): void {
  expect(actual).toEqual(expected);
}

describe("agent runtime state and task session localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-runtime-state-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function runCommand(args: readonly string[], locale: SupportedLocale, ...extra: string[]): Promise<void> {
    const commandArgs = [
      ...args,
      ...extra,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
    ];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it("rejects a changed field in the raw JSON API contract", () => {
    const expected = { taskKey: TASK_KEY, sessionId: "provider:Session-ABC" };
    const changedField = { taskId: TASK_KEY, sessionId: "provider:Session-ABC" };

    expect(() => assertJsonApiContract(changedField, expected)).toThrow();
  });

  it.each(["pt-BR", "en"] as const)("localizes %s help and preserves command names, argument, flags, and task-key option", (locale) => {
    const program = makeProgram(locale);
    const agent = program.commands.find((command) => command.name() === "agent");

    for (const operation of OPERATIONS) {
      const command = agent?.commands.find((candidate) => candidate.name() === operation.name);
      expect(command?.description()).toBe(operation.description[locale]);
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(`paperclipai agent ${operation.name} [options] <agentId>`);
      expect(help).toContain(locale === "en" ? "Agent ID" : "ID do agente");
      expect(help).toContain("--api-base <url>");
      expect(help).toContain(locale === "en" ? "Base URL for the Paperclip API" : "URL base da API do Paperclip");
      expect(help).toContain("--json");
      expect(help).toContain(locale === "en" ? "Output raw JSON" : "Exibir JSON bruto");
      if (operation.name === "runtime-state:reset-session") {
        expect(help).toContain("--task-key <key>");
        expect(help).toContain(locale === "en" ? "Specific task session key" : "Chave específica da sessão da tarefa");
      }
    }
  });

  it("localizes human framing while preserving response records, JSON, routes, methods, and payloads", async () => {
    for (const operation of OPERATIONS) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
        await runCommand(operation.args, locale);
        const expectedHuman = "success" in operation
          ? [operation.success[locale], JSON.stringify(operation.response, null, 2)]
          : [operation.label[locale], ...(operation.name === "task-sessions"
            ? ["status=completed_by_provider taskKey=task:Recovery-17 sessionId=provider:Session-ABC providerType=codex_local updatedAt=2026-10-31T23:15:00.000Z"]
            : [JSON.stringify(operation.response, null, 2)])];
        expect(outputLines(logSpy)).toEqual(expectedHuman);
        logSpy.mockClear();
      }

      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
        await runCommand(operation.args, locale, "--json");
        const output = outputLines(logSpy);
        expect(output).toEqual([JSON.stringify(operation.response, null, 2)]);
        assertJsonApiContract(JSON.parse(output[0]!), operation.response);
        logSpy.mockClear();
      }
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      new URL(String(url)).pathname,
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual(OPERATIONS.flatMap((operation) => [
      ...Array(4).fill([
        operation.path,
        operation.method,
        "body" in operation ? JSON.stringify(operation.body) : undefined,
      ]),
    ]));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes the empty task-sessions marker without changing JSON null/list semantics", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]));

    await runCommand(["agent", "task-sessions", AGENT_ID], "pt-BR");
    expect(outputLines(logSpy)).toEqual(["Sessões de tarefas do agente:", "(vazio)"]);
    logSpy.mockClear();
    await runCommand(["agent", "task-sessions", AGENT_ID], "en");
    expect(outputLines(logSpy)).toEqual(["Agent task sessions:", "(empty)"]);
  });

  it("preserves external API errors, status, and exit code for each operation in both modes and locales", async () => {
    const failure = { error: "Runtime provider detail/KeepCase", details: { code: "SESSION_RESET_DENIED", taskKey: TASK_KEY } };
    const status = 409;
    fetchMock.mockImplementation(async () => jsonResponse(failure, status));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const operation of OPERATIONS) {
      for (const locale of ["pt-BR", "en"] as const) {
        await expect(runCommand(operation.args, locale)).rejects.toThrow("exit:1");
        const error = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(error).toContain(`Runtime provider detail/KeepCase`);
        expect(error).toContain(`details={"code":"SESSION_RESET_DENIED","taskKey":"${TASK_KEY}"}`);
        expect(error).toContain(locale === "en" ? `API error ${status}:` : `Erro de API ${status}:`);
        errorSpy.mockClear();
      }

      for (const locale of ["pt-BR", "en"] as const) {
        await expect(runCommand(operation.args, locale, "--json")).rejects.toThrow("exit:1");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toContain(
          `API error ${status}: Runtime provider detail/KeepCase details={"code":"SESSION_RESET_DENIED","taskKey":"${TASK_KEY}"}`,
        );
        errorSpy.mockClear();
      }
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual(Array(OPERATIONS.length * 4).fill(1));
    expect(fetchMock).toHaveBeenCalledTimes(OPERATIONS.length * 4);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("keeps the reset endpoint payload empty when task-key is omitted", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ reset: true }));
    await runCommand(["agent", "runtime-state:reset-session", AGENT_ID], "en");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`http://paperclip.test/api/agents/${AGENT_ID}/runtime-state/reset-session`);
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body).toBe("{}");
    expect(outputLines(logSpy)[0]).toBe(`Reset runtime session for agent ${AGENT_ID}.`);
  });
});
