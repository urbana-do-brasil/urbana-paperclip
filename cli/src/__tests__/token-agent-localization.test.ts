import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTokenCommands } from "../commands/client/token.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const AGENT = {
  id: AGENT_ID,
  companyId: COMPANY_ID,
  name: "Worker",
  urlKey: "worker",
  role: "Engineer",
  status: "active",
};

const KEY = {
  id: "key-1",
  name: "external-worker",
  token: "pcp_plaintext",
  createdAt: "2026-05-23T00:00:00.000Z",
  revokedAt: null,
};
const REVOKED_KEY = { ...KEY, revokedAt: "2026-05-24T00:00:00.000Z" };

type AgentTokenOperation = "create" | "list" | "revoke";

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerTokenCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

function argsFor(operation: AgentTokenOperation, json = false): string[] {
  const base = [
    "token", "agent", operation,
    "--company-id", COMPANY_ID,
    "--agent", "worker",
  ];
  if (operation === "create") base.push("--name", "external-worker");
  if (operation === "revoke") base.push("key-1");
  if (json) base.push("--json");
  return base;
}

describe("token agent command localization", () => {
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

  async function run(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      group: "Gerenciar chaves de API de agentes",
      descriptions: ["Criar uma chave de API de agente", "Listar chaves de API de um agente", "Revogar uma chave de API de agente"],
      company: "ID da organização",
      agent: "ID, nome curto ou nome sem ambiguidade do agente",
      name: "Nome da chave de API",
      keyId: "ID da chave de API do agente",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      group: "Manage agent API keys",
      descriptions: ["Create an agent API key", "List agent API keys", "Revoke an agent API key"],
      company: "Company ID",
      agent: "Agent ID, shortname, or unambiguous name",
      name: "API key label",
      keyId: "Agent API key ID",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help while preserving names and options", ({ locale, group, descriptions, company, agent, name, keyId, json }) => {
    const program = makeProgram(locale);
    const token = program.commands.find((command) => command.name() === "token");
    const agentGroup = token?.commands.find((command) => command.name() === "agent");
    expect(agentGroup?.description()).toBe(group);

    const commands = ["create", "list", "revoke"].map((name) => agentGroup?.commands.find((command) => command.name() === name));
    expect(commands.map((command) => command?.description())).toEqual(descriptions);

    const createHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(createHelp).toContain("paperclipai token agent create [options]");
    expect(createHelp).toContain("-C, --company-id <id>");
    expect(createHelp).toContain(company);
    expect(createHelp).toContain("--agent <agent>");
    expect(createHelp).toContain(agent);
    expect(createHelp).toContain("--name <name>");
    expect(createHelp).toContain(name);
    expect(createHelp).toContain(json);

    const revokeHelp = commands[2]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(revokeHelp).toContain("<keyId>");
    expect(revokeHelp).toContain(keyId);
    expect(revokeHelp).toContain("--agent <agent>");
    expect(revokeHelp).toContain(agent);
  });

  it("preserves each operation's request and JSON output across locales", async () => {
    const outputs: Record<AgentTokenOperation, string[]> = { create: [], list: [], revoke: [] };
    for (const operation of ["create", "list", "revoke"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(AGENT));
        const response: unknown = operation === "create"
          ? { ...KEY }
          : operation === "list"
            ? [KEY]
            : { ok: true, keyId: KEY.id };
        fetchMock.mockResolvedValueOnce(jsonResponse(response, operation === "create" ? 201 : 200));

        await run(argsFor(operation, true), locale);
        const output = String(logSpy.mock.calls.at(-1)?.[0]);
        outputs[operation].push(output);
        expect(JSON.parse(output)).toEqual(operation === "create"
          ? { agentId: AGENT_ID, agentName: AGENT.name, companyId: COMPANY_ID, key: response }
          : operation === "list"
            ? { agentId: AGENT_ID, companyId: COMPANY_ID, keys: response }
            : { ok: true, agentId: AGENT_ID, companyId: COMPANY_ID, keyId: KEY.id });
        logSpy.mockClear();
      }
    }

    expect(outputs.create[1]).toBe(outputs.create[0]);
    expect(outputs.list[1]).toBe(outputs.list[0]);
    expect(outputs.revoke[1]).toBe(outputs.revoke[0]);
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body === undefined ? undefined : JSON.parse(String((init as RequestInit).body)),
    ])).toEqual([
      ...["pt-BR", "en"].flatMap(() => [
        [`http://paperclip.test/api/agents/worker?companyId=${COMPANY_ID}`, "GET", undefined],
        [`http://paperclip.test/api/agents/${AGENT_ID}/keys`, "POST", { name: "external-worker", scope: { kind: "standard" } }],
      ]),
      ...["pt-BR", "en"].flatMap(() => [
        [`http://paperclip.test/api/agents/worker?companyId=${COMPANY_ID}`, "GET", undefined],
        [`http://paperclip.test/api/agents/${AGENT_ID}/keys`, "GET", undefined],
      ]),
      ...["pt-BR", "en"].flatMap(() => [
        [`http://paperclip.test/api/agents/worker?companyId=${COMPANY_ID}`, "GET", undefined],
        [`http://paperclip.test/api/agents/${AGENT_ID}/keys/key-1`, "DELETE", undefined],
      ]),
    ]);
  });

  it("localizes list labels and the empty marker while preserving values", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(AGENT)).mockResolvedValueOnce(jsonResponse([REVOKED_KEY]));
      await run(argsFor("list"), locale);
      expect(outputLines(logSpy)).toEqual([locale === "en"
        ? `ID=key-1 Name=external-worker Created at=${KEY.createdAt} Revoked at=${REVOKED_KEY.revokedAt}`
        : `ID=key-1 Nome=external-worker Criado em=${KEY.createdAt} Revogado em=${REVOKED_KEY.revokedAt}`]);
      logSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse(AGENT)).mockResolvedValueOnce(jsonResponse([]));
      await run(argsFor("list"), locale);
      expect(outputLines(logSpy)).toEqual([locale === "en" ? "(empty)" : "(vazio)"]);
      logSpy.mockClear();
    }
  });

  it("keeps API failures, details, status, and exit code for every operation", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Key backend detail/KeepCase",
      details: { code: "KEY_ACCESS_DENIED", agentId: AGENT_ID },
    };

    for (const operation of ["create", "list", "revoke"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(AGENT));
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
        await expect(run(argsFor(operation), locale)).rejects.toThrow("exit:1");
        const error = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(error).toContain(locale === "en" ? "API error 403:" : "Erro de API 403:");
        expect(error).toContain("Key backend detail/KeepCase");
        expect(error).toContain(`details={"code":"KEY_ACCESS_DENIED","agentId":"${AGENT_ID}"}`);
        expect(exitSpy).toHaveBeenLastCalledWith(1);
        errorSpy.mockClear();
      }
    }
  });

  it("localizes own errors for human output and preserves English structured stderr", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        const structuredOrEnglish = json || locale === "en";
        const referenceArgs = ["token", "agent", "list", "--company-id", COMPANY_ID, "--agent", "   "];
        if (json) referenceArgs.push("--json");
        await expect(run(referenceArgs, locale)).rejects.toThrow("exit:1");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toBe(structuredOrEnglish
          ? "Agent reference is required"
          : "Informe a referência do agente");
        errorSpy.mockClear();

        fetchMock.mockResolvedValueOnce(jsonResponse(null));
        await expect(run(argsFor("list", json), locale)).rejects.toThrow("exit:1");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toBe(structuredOrEnglish
          ? "Agent not found: worker"
          : "Agente não encontrado: worker");
        errorSpy.mockClear();

        fetchMock.mockResolvedValueOnce(jsonResponse(AGENT)).mockResolvedValueOnce(jsonResponse(null));
        await expect(run(argsFor("create", json), locale)).rejects.toThrow("exit:1");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toBe(structuredOrEnglish
          ? "Failed to create agent API key"
          : "Não foi possível criar a chave de API do agente");
        errorSpy.mockClear();
      }
    }
    expect(exitSpy.mock.calls).toEqual(Array(12).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(12);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
