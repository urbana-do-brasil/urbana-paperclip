import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const PERMISSIONS = { canCreateAgents: true, canCreateSkills: false, canAssignTasks: true };

const RESPONSES = {
  permissions: { ...PERMISSIONS, trustPreset: "balanced" },
  heartbeat: { queued: true, runId: "heartbeat-run-42" },
  claudeLogin: { loginUrl: "https://claude.example/login?agent=builder" },
};

type Operation = {
  name: string;
  args: string[];
  method: string;
  path: string;
  body: unknown;
  response: unknown;
};

const OPERATIONS: Operation[] = [
  {
    name: "permissions:update",
    args: ["agent", "permissions:update", AGENT_ID, "--payload-json", JSON.stringify(PERMISSIONS)],
    method: "PATCH",
    path: `/api/agents/${AGENT_ID}/permissions`,
    body: PERMISSIONS,
    response: RESPONSES.permissions,
  },
  {
    name: "heartbeat:invoke",
    args: ["agent", "heartbeat:invoke", AGENT_ID],
    method: "POST",
    path: `/api/agents/${AGENT_ID}/heartbeat/invoke`,
    body: {},
    response: RESPONSES.heartbeat,
  },
  {
    name: "claude-login",
    args: ["agent", "claude-login", AGENT_ID],
    method: "POST",
    path: `/api/agents/${AGENT_ID}/claude-login`,
    body: {},
    response: RESPONSES.claudeLogin,
  },
];

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

describe("agent operations CLI localization", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function runCommand(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      descriptions: ["Atualizar as permissões do agente", "Invocar um heartbeat do agente", "Iniciar o login do Claude para um agente"],
      agentId: "ID do agente",
      json: "Exibir JSON bruto",
      payload: "Payload JSON de UpdateAgentPermissions",
    },
    {
      locale: "en",
      descriptions: ["Update agent permissions", "Invoke an agent heartbeat", "Trigger Claude login for an agent"],
      agentId: "Agent ID",
      json: "Output raw JSON",
      payload: "UpdateAgentPermissions JSON payload",
    },
  ] as const)("localizes $locale help and preserves command and option names", ({ locale, descriptions, agentId, json, payload }) => {
    const program = makeProgram(locale);
    const agent = program.commands.find((command) => command.name() === "agent");

    OPERATIONS.forEach((operation, index) => {
      const command = agent?.commands.find((candidate) => candidate.name() === operation.name);
      expect(command?.description()).toBe(descriptions[index]);
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(`paperclipai agent ${operation.name} [options] <agentId>`);
      expect(help).toContain(agentId);
      expect(help).toContain("--api-base <url>");
      expect(help).toContain("--json");
      expect(help).toContain(json);
      if (operation.name === "permissions:update") {
        expect(help).toContain("--payload-json <json>");
        expect(help).toContain(payload);
      }
    });
  });

  it("preserves successful responses, request routes, payloads, and output in both locales and modes", async () => {
    for (const operation of OPERATIONS) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await runCommand(args, locale);
          expect(outputLines(logSpy)).toEqual([JSON.stringify(operation.response, null, 2)]);
          expect(JSON.parse(outputLines(logSpy)[0]!)).toEqual(operation.response);
          logSpy.mockClear();
        }
      }
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method,
      (init as RequestInit | undefined)?.body,
    ])).toEqual(OPERATIONS.flatMap((operation) => Array.from({ length: 4 }, () => [
      `http://paperclip.test${operation.path}`,
      operation.method,
      JSON.stringify(operation.body),
    ])));
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit | undefined)?.headers).toEqual(expect.objectContaining({ authorization: "Bearer board-token" }));
    }
  });

  it("keeps API failures, details, and exit code intact across locales and JSON mode", async () => {
    const failure = {
      error: "Agent operation denied/KeepCase",
      details: { code: "AGENT_OPERATION_DENIED", agentId: AGENT_ID, retryAfterMs: 1250 },
    };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const operation of OPERATIONS) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? "API error 403:" : "Erro de API 403:");
          expect(error).toContain("Agent operation denied/KeepCase");
          expect(error).toContain(`details={"code":"AGENT_OPERATION_DENIED","agentId":"${AGENT_ID}","retryAfterMs":1250}`);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(OPERATIONS.length * 4).fill([1]));
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method,
      (init as RequestInit | undefined)?.body,
    ])).toEqual(OPERATIONS.flatMap((operation) => Array.from({ length: 4 }, () => [
      `http://paperclip.test${operation.path}`,
      operation.method,
      JSON.stringify(operation.body),
    ])));
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("keeps permission payload validation failures locale-independent and avoids sending a request", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    let firstError: string | undefined;

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        const args = ["agent", "permissions:update", AGENT_ID, "--payload-json", JSON.stringify({ canCreateAgents: "yes", canAssignTasks: true })];
        if (json) args.push("--json");
        await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
        const error = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(error).toContain("expected boolean");
        if (firstError === undefined) firstError = error;
        else expect(error).toBe(firstError);
        errorSpy.mockClear();
      }
    }

    expect(exitSpy.mock.calls).toEqual([[1], [1], [1], [1]]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
