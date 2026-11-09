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
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

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

const AGENT = {
  id: AGENT_ID,
  name: "Northstar Recovery",
  role: "incident-response-captain",
  status: "pending_approval",
  reportsTo: "33333333-3333-4333-8333-333333333333",
  budgetMonthlyCents: 12345,
  spentMonthlyCents: 6789,
};

describe("agent get localization", () => {
  let tempRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-get-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse(AGENT));
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

  async function runCommand(args: string[], locale: SupportedLocale): Promise<void> {
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  function getArgs(...extra: string[]): string[] {
    return [
      "agent", "get", AGENT_ID,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...extra,
    ];
  }

  it.each([
    { locale: "pt-BR", description: "Consultar um agente", argument: "ID do agente" },
    { locale: "en", description: "Get one agent", argument: "Agent ID" },
  ] as const)("localizes $locale operation help while preserving command, argument, and flags", ({ locale, description, argument }) => {
    const program = makeProgram(locale);
    const agentCommand = program.commands.find((command) => command.name() === "agent");
    const getCommand = agentCommand?.commands.find((command) => command.name() === "get");

    expect(getCommand?.description()).toBe(description);
    const help = getCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(help).toContain("paperclipai agent get [options] <agentId>");
    expect(help).toContain(argument);
    expect(help).toContain("--json");
  });

  it("preserves successful agent fields and JSON output across locales", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(AGENT))
      .mockResolvedValueOnce(jsonResponse(AGENT))
      .mockResolvedValueOnce(jsonResponse(AGENT))
      .mockResolvedValueOnce(jsonResponse(AGENT));

    await runCommand(getArgs(), "pt-BR");
    const ptHuman = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(getArgs(), "en");
    const enHuman = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();

    await runCommand(getArgs("--json"), "pt-BR");
    const ptJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(getArgs("--json"), "en");
    const enJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(ptHuman).toBe(JSON.stringify(AGENT, null, 2));
    expect(enHuman).toBe(ptHuman);
    expect(ptJson).toBe(enJson);
    expect(JSON.parse(ptJson)).toEqual(AGENT);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(
      Array(4).fill(`/api/agents/${AGENT_ID}`),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes a null result only in human output", async () => {
    const noContent = () => new Response(null, { status: 204 });
    fetchMock
      .mockImplementationOnce(noContent)
      .mockImplementationOnce(noContent)
      .mockImplementationOnce(noContent)
      .mockImplementationOnce(noContent);

    await runCommand(getArgs(), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(nulo)");
    logSpy.mockClear();
    await runCommand(getArgs(), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(null)");

    logSpy.mockClear();
    await runCommand(getArgs("--json"), "pt-BR");
    const ptJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(getArgs("--json"), "en");
    const enJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(ptJson).toBe("null");
    expect(enJson).toBe(ptJson);
  });

  it("localizes API framing while preserving external error details, status, and exit code", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "Agent backend detail", details: { code: "AGENT_UNKNOWN" } }, 404))
      .mockResolvedValueOnce(jsonResponse({ error: "Agent backend detail", details: { code: "AGENT_UNKNOWN" } }, 404));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    await expect(runCommand(getArgs(), "pt-BR")).rejects.toThrow("exit:1");
    const ptError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand(getArgs(), "en")).rejects.toThrow("exit:1");
    const enError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(ptError).toContain("Erro de API 404: Não foi possível concluir a solicitação. Detalhes: Agent backend detail details={\"code\":\"AGENT_UNKNOWN\"}");
    expect(enError).toContain("API error 404: The request could not be completed. Details: Agent backend detail details={\"code\":\"AGENT_UNKNOWN\"}");
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1]);
  });
});
