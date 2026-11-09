import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { updateAgentSchema } from "@paperclipai/shared";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const UPDATE_PAYLOAD = {
  name: "Northstar Recovery v2",
  role: "engineer",
};
const UPDATED_AGENT = {
  id: AGENT_ID,
  companyId: "22222222-2222-4222-8222-222222222222",
  name: UPDATE_PAYLOAD.name,
  role: UPDATE_PAYLOAD.role,
  status: "paused",
  adapterType: "codex_local",
  adapterConfig: { model: "gpt-6", nested: { preserved: true } },
  metadata: { source: "external runtime", preserved: ["complete", "response"] },
};
const DELETED_AGENT = {
  id: AGENT_ID,
  deleted: true,
  deletedAt: "2026-11-01T12:00:00.000Z",
  cleanup: { runsCancelled: 2, wakeupsCancelled: 1 },
};

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

describe("agent update and delete localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-update-delete-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn();
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

  async function runCommand(
    action: "update" | "delete",
    locale: SupportedLocale,
    options: { json?: boolean; yes?: boolean } = {},
  ): Promise<void> {
    const args = [
      "agent", action, AGENT_ID,
      ...(action === "update" ? ["--payload-json", JSON.stringify(UPDATE_PAYLOAD)] : []),
      ...(options.yes ? ["--yes"] : []),
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...(options.json ? ["--json"] : []),
    ];
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      updateDescription: "Atualizar um agente a partir de um payload JSON",
      deleteDescription: "Excluir um agente",
      agentId: "ID do agente",
      payloadDescription: "Payload JSON de UpdateAgent",
      confirm: "Confirmar exclusão",
      apiBase: "URL base da API do Paperclip",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      updateDescription: "Update an agent from a JSON payload",
      deleteDescription: "Delete an agent",
      agentId: "Agent ID",
      payloadDescription: "UpdateAgent JSON payload",
      confirm: "Confirm deletion",
      apiBase: "Base URL for the Paperclip API",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help and preserves commands, IDs, and flags", ({
    locale,
    updateDescription,
    deleteDescription,
    agentId,
    payloadDescription,
    confirm,
    apiBase,
    json,
  }) => {
    const program = makeProgram(locale);
    const agent = program.commands.find((command) => command.name() === "agent");
    const update = agent?.commands.find((command) => command.name() === "update");
    const remove = agent?.commands.find((command) => command.name() === "delete");

    expect(update?.description()).toBe(updateDescription);
    expect(remove?.description()).toBe(deleteDescription);
    for (const [action, command] of [["update", update], ["delete", remove]] as const) {
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(`paperclipai agent ${action} [options] <agentId>`);
      expect(help).toContain(agentId);
      expect(help).toContain("--api-base <url>");
      expect(help).toContain(apiBase);
      expect(help).toContain("--json");
      expect(help).toContain(json);
    }
    const updateHelp = update?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(updateHelp).toContain("--payload-json <json>");
    expect(updateHelp).toContain(payloadDescription);
    const deleteHelp = remove?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(deleteHelp).toContain("--yes");
    expect(deleteHelp).toContain(confirm);
  });

  it("localizes success and preserves complete human output, JSON, routes, and payloads", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(UPDATED_AGENT))
      .mockResolvedValueOnce(jsonResponse(UPDATED_AGENT))
      .mockResolvedValueOnce(jsonResponse(UPDATED_AGENT))
      .mockResolvedValueOnce(jsonResponse(UPDATED_AGENT))
      .mockResolvedValueOnce(jsonResponse(DELETED_AGENT))
      .mockResolvedValueOnce(jsonResponse(DELETED_AGENT))
      .mockResolvedValueOnce(jsonResponse(DELETED_AGENT))
      .mockResolvedValueOnce(jsonResponse(DELETED_AGENT));

    await runCommand("update", "pt-BR");
    expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
      `Agente ${AGENT_ID} atualizado.`,
      JSON.stringify(UPDATED_AGENT, null, 2),
    ]);
    logSpy.mockClear();
    await runCommand("update", "en");
    expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
      `Updated agent ${AGENT_ID}.`,
      JSON.stringify(UPDATED_AGENT, null, 2),
    ]);
    logSpy.mockClear();

    await runCommand("update", "pt-BR", { json: true });
    const updatePtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand("update", "en", { json: true });
    const updateEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(updatePtJson).toBe(updateEnJson);
    expect(JSON.parse(updatePtJson)).toEqual(UPDATED_AGENT);
    expect(logSpy).toHaveBeenCalledTimes(1);
    logSpy.mockClear();

    await runCommand("delete", "pt-BR", { yes: true });
    expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
      `Agente ${AGENT_ID} excluído.`,
      JSON.stringify(DELETED_AGENT, null, 2),
    ]);
    logSpy.mockClear();
    await runCommand("delete", "en", { yes: true });
    expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
      `Deleted agent ${AGENT_ID}.`,
      JSON.stringify(DELETED_AGENT, null, 2),
    ]);
    logSpy.mockClear();

    await runCommand("delete", "pt-BR", { yes: true, json: true });
    const deletePtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand("delete", "en", { yes: true, json: true });
    const deleteEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(deletePtJson).toBe(deleteEnJson);
    expect(JSON.parse(deletePtJson)).toEqual(DELETED_AGENT);
    expect(logSpy).toHaveBeenCalledTimes(1);

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const expectedPayload = updateAgentSchema.parse(UPDATE_PAYLOAD);
    expect(calls.map(([url, init]) => [new URL(url).pathname, init.method, init.body ? JSON.parse(String(init.body)) : undefined])).toEqual([
      ...Array(4).fill([`/api/agents/${AGENT_ID}`, "PATCH", expectedPayload]),
      ...Array(4).fill([`/api/agents/${AGENT_ID}`, "DELETE", undefined]),
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes the delete confirmation requirement without making an API request", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const [locale, expected, json] of [
      ["pt-BR", "A exclusão do agente foi recusada sem --yes.", false],
      ["en", "Refusing to delete an agent without --yes.", false],
      ["pt-BR", "Refusing to delete without --yes", true],
      ["en", "Refusing to delete without --yes", true],
    ] as const) {
      await expect(runCommand("delete", locale, { json })).rejects.toThrow("exit:1");
      expect(errorSpy.mock.calls.at(-1)?.[0]).toBe(expected);
      errorSpy.mockClear();
    }

    expect(fetchMock).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map((call: readonly unknown[]) => call[0])).toEqual([1, 1, 1, 1]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("preserves external failures and exit codes in both locales and JSON mode", async () => {
    const updateFailure = {
      error: "Adapter update detail",
      details: { code: "UPDATE_REJECTED", providerMessage: "provider-owned wording" },
    };
    const deleteFailure = {
      error: "Deletion backend detail",
      details: { code: "DELETE_DENIED", reason: "policy-owned wording" },
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(updateFailure, 422))
      .mockResolvedValueOnce(jsonResponse(updateFailure, 422))
      .mockResolvedValueOnce(jsonResponse(updateFailure, 422))
      .mockResolvedValueOnce(jsonResponse(updateFailure, 422))
      .mockResolvedValueOnce(jsonResponse(deleteFailure, 409))
      .mockResolvedValueOnce(jsonResponse(deleteFailure, 409))
      .mockResolvedValueOnce(jsonResponse(deleteFailure, 409))
      .mockResolvedValueOnce(jsonResponse(deleteFailure, 409));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const errors: Record<string, string> = {};

    for (const action of ["update", "delete"] as const) {
      for (const json of [false, true]) {
        for (const locale of ["pt-BR", "en"] as const) {
          await expect(runCommand(action, locale, { yes: action === "delete", json })).rejects.toThrow("exit:1");
          errors[`${action}:${json}:${locale}`] = String(errorSpy.mock.calls.at(-1)?.[0]);
          errorSpy.mockClear();
        }
      }
    }

    for (const action of ["update", "delete"] as const) {
      const status = action === "update" ? 422 : 409;
      const detail = action === "update" ? "Adapter update detail" : "Deletion backend detail";
      const code = action === "update" ? "UPDATE_REJECTED" : "DELETE_DENIED";
      expect(errors[`${action}:false:pt-BR`]).toContain(`Erro de API ${status}: Não foi possível concluir a solicitação. Detalhes: ${detail}`);
      expect(errors[`${action}:false:en`]).toContain(`API error ${status}: The request could not be completed. Details: ${detail}`);
      expect(errors[`${action}:false:pt-BR`]).toContain(`"code":"${code}"`);
      expect(errors[`${action}:false:en`]).toContain(`"code":"${code}"`);
      expect(errors[`${action}:true:pt-BR`]).toBe(errors[`${action}:true:en`]);
      expect(errors[`${action}:true:pt-BR`]).toContain(`API error ${status}: ${detail}`);
    }

    expect(exitSpy.mock.calls.map((call: readonly unknown[]) => call[0])).toEqual(Array(8).fill(1));
    expect(logSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });
});
