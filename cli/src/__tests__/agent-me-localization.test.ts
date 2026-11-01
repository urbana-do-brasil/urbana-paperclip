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
  status: "active",
  reportsTo: "33333333-3333-4333-8333-333333333333",
};

describe("agent me localization", () => {
  let tempRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-me-l10n-"));
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

  function meArgs(...extra: string[]): string[] {
    return [
      "agent", "me",
      "--api-base", "http://paperclip.test",
      "--api-key", "agent-token",
      ...extra,
    ];
  }

  it.each([
    { locale: "pt-BR", description: "Mostrar a identidade do agente atual", apiBase: "URL base da API do Paperclip", json: "Exibir JSON bruto" },
    { locale: "en", description: "Show the current agent identity", apiBase: "Base URL for the Paperclip API", json: "Output raw JSON" },
  ] as const)("localizes $locale help and preserves command and flags", ({ locale, description, apiBase, json }) => {
    const program = makeProgram(locale);
    const agentCommand = program.commands.find((command) => command.name() === "agent");
    const meCommand = agentCommand?.commands.find((command) => command.name() === "me");

    expect(meCommand?.description()).toBe(description);
    const help = meCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(help).toContain("paperclipai agent me [options]");
    expect(help).toContain("--api-base <url>");
    expect(help).toContain(apiBase);
    expect(help).toContain("--json");
    expect(help).toContain(json);
  });

  it("preserves the API identity and JSON output across locales", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(AGENT))
      .mockResolvedValueOnce(jsonResponse(AGENT))
      .mockResolvedValueOnce(jsonResponse(AGENT))
      .mockResolvedValueOnce(jsonResponse(AGENT));

    await runCommand(meArgs(), "pt-BR");
    const ptHuman = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(meArgs(), "en");
    const enHuman = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();

    await runCommand(meArgs("--json"), "pt-BR");
    const ptJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(meArgs("--json"), "en");
    const enJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(ptHuman).toBe(JSON.stringify(AGENT, null, 2));
    expect(enHuman).toBe(ptHuman);
    expect(ptJson).toBe(enJson);
    expect(JSON.parse(ptJson)).toEqual(AGENT);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(
      Array(4).fill("/api/agents/me"),
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

    await runCommand(meArgs(), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(nulo)");
    logSpy.mockClear();
    await runCommand(meArgs(), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(null)");

    logSpy.mockClear();
    await runCommand(meArgs("--json"), "pt-BR");
    const ptJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(meArgs("--json"), "en");
    const enJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(ptJson).toBe("null");
    expect(enJson).toBe(ptJson);
  });

  it("localizes API framing while preserving external error details and exit code", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "Agent backend detail", details: { code: "AGENT_UNKNOWN" } }, 404))
      .mockResolvedValueOnce(jsonResponse({ error: "Agent backend detail", details: { code: "AGENT_UNKNOWN" } }, 404));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    await expect(runCommand(meArgs(), "pt-BR")).rejects.toThrow("exit:1");
    const ptError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand(meArgs(), "en")).rejects.toThrow("exit:1");
    const enError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(ptError).toContain("Erro de API 404: Não foi possível concluir a solicitação. Detalhes: Agent backend detail details={\"code\":\"AGENT_UNKNOWN\"}");
    expect(enError).toContain("API error 404: The request could not be completed. Details: Agent backend detail details={\"code\":\"AGENT_UNKNOWN\"}");
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1]);
  });
});
