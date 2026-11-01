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

const PAUSED_AGENT = { id: AGENT_ID, name: "Northstar Recovery", status: "paused" };
const RESUMED_AGENT = { id: AGENT_ID, name: "Northstar Recovery", status: "active" };

function capturedOutput(logSpy: ReturnType<typeof vi.spyOn>): string[] {
  return logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

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

describe("agent pause/resume localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-lifecycle-l10n-"));
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

  async function runCommand(action: "pause" | "resume", locale: SupportedLocale, ...extra: string[]): Promise<void> {
    const args = [
      "agent", action, AGENT_ID,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...extra,
    ];
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  it.each([
    { locale: "pt-BR", pauseDescription: "Pausar um agente", resumeDescription: "Retomar um agente", agentId: "ID do agente", apiBase: "URL base da API do Paperclip", json: "Exibir JSON bruto" },
    { locale: "en", pauseDescription: "Pause an agent", resumeDescription: "Resume an agent", agentId: "Agent ID", apiBase: "Base URL for the Paperclip API", json: "Output raw JSON" },
  ] as const)("localizes $locale help and preserves command names and flags", ({ locale, pauseDescription, resumeDescription, agentId, apiBase, json }) => {
    const program = makeProgram(locale);
    const agent = program.commands.find((command) => command.name() === "agent");
    const pause = agent?.commands.find((command) => command.name() === "pause");
    const resume = agent?.commands.find((command) => command.name() === "resume");

    expect(pause?.description()).toBe(pauseDescription);
    expect(resume?.description()).toBe(resumeDescription);
    for (const [action, command] of [["pause", pause], ["resume", resume]] as const) {
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(`paperclipai agent ${action} [options] <agentId>`);
      expect(help).toContain(agentId);
      expect(help).toContain("--api-base <url>");
      expect(help).toContain(apiBase);
      expect(help).toContain("--json");
      expect(help).toContain(json);
    }
  });

  it("localizes successful human output and preserves request and JSON contracts", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(PAUSED_AGENT))
      .mockResolvedValueOnce(jsonResponse(PAUSED_AGENT))
      .mockResolvedValueOnce(jsonResponse(RESUMED_AGENT))
      .mockResolvedValueOnce(jsonResponse(RESUMED_AGENT))
      .mockResolvedValueOnce(jsonResponse(PAUSED_AGENT))
      .mockResolvedValueOnce(jsonResponse(PAUSED_AGENT))
      .mockResolvedValueOnce(jsonResponse(RESUMED_AGENT))
      .mockResolvedValueOnce(jsonResponse(RESUMED_AGENT));

    await runCommand("pause", "pt-BR");
    expect(capturedOutput(logSpy)).toEqual([`Agente ${AGENT_ID} pausado.`, JSON.stringify(PAUSED_AGENT, null, 2)]);
    logSpy.mockClear();
    await runCommand("pause", "en");
    expect(capturedOutput(logSpy)).toEqual([`Paused agent ${AGENT_ID}.`, JSON.stringify(PAUSED_AGENT, null, 2)]);
    logSpy.mockClear();
    await runCommand("resume", "pt-BR");
    expect(capturedOutput(logSpy)).toEqual([`Agente ${AGENT_ID} retomado.`, JSON.stringify(RESUMED_AGENT, null, 2)]);
    logSpy.mockClear();
    await runCommand("resume", "en");
    expect(capturedOutput(logSpy)).toEqual([`Resumed agent ${AGENT_ID}.`, JSON.stringify(RESUMED_AGENT, null, 2)]);

    logSpy.mockClear();
    await runCommand("pause", "pt-BR", "--json");
    const pausePtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand("pause", "en", "--json");
    const pauseEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(pausePtJson).toBe(pauseEnJson);
    expect(JSON.parse(pausePtJson)).toEqual(PAUSED_AGENT);

    logSpy.mockClear();
    await runCommand("resume", "pt-BR", "--json");
    const resumePtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand("resume", "en", "--json");
    const resumeEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(resumePtJson).toBe(resumeEnJson);
    expect(JSON.parse(resumePtJson)).toEqual(RESUMED_AGENT);

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls.map(([url, init]) => [new URL(url).pathname, init.method, init.body])).toEqual([
      ...Array(2).fill([`/api/agents/${AGENT_ID}/pause`, "POST", "{}"]),
      ...Array(2).fill([`/api/agents/${AGENT_ID}/resume`, "POST", "{}"]),
      ...Array(2).fill([`/api/agents/${AGENT_ID}/pause`, "POST", "{}"]),
      ...Array(2).fill([`/api/agents/${AGENT_ID}/resume`, "POST", "{}"]),
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves API failure details and exit codes for both operations and locales", async () => {
    const pauseFailure = { error: "Pause backend detail", details: { code: "PAUSE_DENIED" } };
    const resumeFailure = { error: "Resume backend detail", details: { code: "RESUME_DENIED" } };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(pauseFailure, 503))
      .mockResolvedValueOnce(jsonResponse(pauseFailure, 503))
      .mockResolvedValueOnce(jsonResponse(pauseFailure, 503))
      .mockResolvedValueOnce(jsonResponse(pauseFailure, 503))
      .mockResolvedValueOnce(jsonResponse(resumeFailure, 409))
      .mockResolvedValueOnce(jsonResponse(resumeFailure, 409))
      .mockResolvedValueOnce(jsonResponse(resumeFailure, 409))
      .mockResolvedValueOnce(jsonResponse(resumeFailure, 409));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    await expect(runCommand("pause", "pt-BR")).rejects.toThrow("exit:1");
    const pausePtError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand("pause", "en")).rejects.toThrow("exit:1");
    const pauseEnError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand("pause", "pt-BR", "--json")).rejects.toThrow("exit:1");
    const pausePtJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand("pause", "en", "--json")).rejects.toThrow("exit:1");
    const pauseEnJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();

    await expect(runCommand("resume", "pt-BR")).rejects.toThrow("exit:1");
    const resumePtError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand("resume", "en")).rejects.toThrow("exit:1");
    const resumeEnError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand("resume", "pt-BR", "--json")).rejects.toThrow("exit:1");
    const resumePtJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand("resume", "en", "--json")).rejects.toThrow("exit:1");
    const resumeEnJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(pausePtError).toContain("Pause backend detail");
    expect(pausePtError).toContain('details={"code":"PAUSE_DENIED"}');
    expect(pauseEnError).toContain("Pause backend detail");
    expect(pauseEnError).toContain('details={"code":"PAUSE_DENIED"}');
    expect(resumePtError).toContain("Resume backend detail");
    expect(resumePtError).toContain('details={"code":"RESUME_DENIED"}');
    expect(resumeEnError).toContain("Resume backend detail");
    expect(resumeEnError).toContain('details={"code":"RESUME_DENIED"}');
    expect(pausePtJsonError).toBe(pauseEnJsonError);
    expect(pausePtJsonError).toBe('API error 503: Pause backend detail details={"code":"PAUSE_DENIED"}');
    expect(resumePtJsonError).toBe(resumeEnJsonError);
    expect(resumePtJsonError).toBe('API error 409: Resume backend detail details={"code":"RESUME_DENIED"}');
    expect(exitSpy.mock.calls.map((call: readonly unknown[]) => call[0])).toEqual(Array(8).fill(1));
    expect(logSpy).not.toHaveBeenCalled();
  });
});
