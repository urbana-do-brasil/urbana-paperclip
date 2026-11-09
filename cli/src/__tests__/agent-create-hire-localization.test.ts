import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createAgentSchema } from "@paperclipai/shared";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const APPROVAL_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const CREATE_PAYLOAD = {
  name: "Northstar Recovery",
  role: "engineer",
  adapterType: "codex_local",
  metadata: { source: "CLI fixture", preserved: { release: 4 } },
};
const HIRE_PAYLOAD = {
  name: "Northstar Recovery",
  role: "engineer",
  adapterType: "codex_local",
  adapterConfig: { model: "gpt-6", privateProviderValue: "provider-owned" },
  sourceIssueIds: ["44444444-4444-4444-8444-444444444444"],
};
const CREATED_AGENT = {
  id: AGENT_ID,
  companyId: COMPANY_ID,
  name: "Northstar Recovery",
  role: "engineer",
  status: "idle",
  adapterType: "codex_local",
  adapterConfig: { model: "gpt-6", nested: { preserved: true } },
  spentMonthlyCents: 0,
  createdAt: "2026-11-01T12:00:00.000Z",
};
const HIRE_RESULT = {
  agent: { ...CREATED_AGENT, status: "pending_approval" },
  approval: {
    id: APPROVAL_ID,
    type: "hire_agent",
    status: "pending",
    payload: { name: "Northstar Recovery", preservedField: "full approval draft" },
  },
  idempotent: false,
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

describe("agent create and hire localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-create-hire-l10n-"));
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
    action: "create" | "hire",
    payload: Record<string, unknown>,
    locale: SupportedLocale,
    json = false,
  ): Promise<void> {
    const args = [
      "agent", action,
      "--company-id", COMPANY_ID,
      "--payload-json", JSON.stringify(payload),
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...(json ? ["--json"] : []),
    ];
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      createDescription: "Criar um agente a partir de um payload JSON",
      hireDescription: "Criar uma solicitação de contratação de agente",
      companyId: "ID da organização",
      createPayload: "Payload JSON de CreateAgent",
      hirePayload: "Payload JSON de CreateAgentHire",
      apiBase: "URL base da API do Paperclip",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      createDescription: "Create an agent from a JSON payload",
      hireDescription: "Create an agent hire request",
      companyId: "Company ID",
      createPayload: "CreateAgent JSON payload",
      hirePayload: "CreateAgentHire JSON payload",
      apiBase: "Base URL for the Paperclip API",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help and preserves command names and flags", ({
    locale,
    createDescription,
    hireDescription,
    companyId,
    createPayload,
    hirePayload,
    apiBase,
    json,
  }) => {
    const program = makeProgram(locale);
    const agent = program.commands.find((command) => command.name() === "agent");
    const create = agent?.commands.find((command) => command.name() === "create");
    const hire = agent?.commands.find((command) => command.name() === "hire");

    expect(create?.description()).toBe(createDescription);
    expect(hire?.description()).toBe(hireDescription);
    for (const [action, command, payloadDescription] of [
      ["create", create, createPayload],
      ["hire", hire, hirePayload],
    ] as const) {
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(`paperclipai agent ${action} [options]`);
      expect(help).toContain("--company-id <id>");
      expect(help).toContain(companyId);
      expect(help).toContain("--payload-json <json>");
      expect(help).toContain(payloadDescription);
      expect(help).toContain("--api-base <url>");
      expect(help).toContain(apiBase);
      expect(help).toContain("--json");
      expect(help).toContain(json);
    }
  });

  it("localizes success and preserves complete human output, JSON, routes, IDs, and payloads", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(CREATED_AGENT))
      .mockResolvedValueOnce(jsonResponse(CREATED_AGENT))
      .mockResolvedValueOnce(jsonResponse(CREATED_AGENT))
      .mockResolvedValueOnce(jsonResponse(CREATED_AGENT))
      .mockResolvedValueOnce(jsonResponse(HIRE_RESULT))
      .mockResolvedValueOnce(jsonResponse(HIRE_RESULT))
      .mockResolvedValueOnce(jsonResponse(HIRE_RESULT))
      .mockResolvedValueOnce(jsonResponse(HIRE_RESULT));

    await runCommand("create", CREATE_PAYLOAD, "pt-BR");
    expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
      "Agente criado.",
      JSON.stringify(CREATED_AGENT, null, 2),
    ]);
    logSpy.mockClear();
    await runCommand("create", CREATE_PAYLOAD, "en");
    expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
      "Created agent.",
      JSON.stringify(CREATED_AGENT, null, 2),
    ]);
    logSpy.mockClear();

    await runCommand("create", CREATE_PAYLOAD, "pt-BR", true);
    const createPtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand("create", CREATE_PAYLOAD, "en", true);
    const createEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(createPtJson).toBe(createEnJson);
    expect(JSON.parse(createPtJson)).toEqual(CREATED_AGENT);
    expect(logSpy).toHaveBeenCalledTimes(1);
    logSpy.mockClear();

    await runCommand("hire", HIRE_PAYLOAD, "pt-BR");
    expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
      "Solicitação de contratação de agente criada.",
      JSON.stringify(HIRE_RESULT, null, 2),
    ]);
    logSpy.mockClear();
    await runCommand("hire", HIRE_PAYLOAD, "en");
    expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
      "Created agent hire request.",
      JSON.stringify(HIRE_RESULT, null, 2),
    ]);
    logSpy.mockClear();

    await runCommand("hire", HIRE_PAYLOAD, "pt-BR", true);
    const hirePtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand("hire", HIRE_PAYLOAD, "en", true);
    const hireEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(hirePtJson).toBe(hireEnJson);
    expect(JSON.parse(hirePtJson)).toEqual(HIRE_RESULT);
    expect(logSpy).toHaveBeenCalledTimes(1);

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const expectedCreatePayload = createAgentSchema.parse(CREATE_PAYLOAD);
    expect(calls.map(([url, init]) => [new URL(url).pathname, init.method, JSON.parse(String(init.body))])).toEqual([
      ...Array(4).fill([`/api/companies/${COMPANY_ID}/agents`, "POST", expectedCreatePayload]),
      ...Array(4).fill([`/api/companies/${COMPANY_ID}/agent-hires`, "POST", HIRE_PAYLOAD]),
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves external failures, details, and exit codes in both locales and JSON mode", async () => {
    const failure = {
      error: "Adapter upstream detail",
      details: { code: "UPSTREAM_HIRE_REJECTED", providerMessage: "provider-owned wording" },
    };
    fetchMock.mockImplementation(async () => jsonResponse(failure, 422));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    const errors: Record<string, string> = {};
    for (const action of ["create", "hire"] as const) {
      for (const json of [false, true]) {
        for (const locale of ["pt-BR", "en"] as const) {
          await expect(runCommand(action, action === "create" ? CREATE_PAYLOAD : HIRE_PAYLOAD, locale, json))
            .rejects.toThrow("exit:1");
          errors[`${action}:${json}:${locale}`] = String(errorSpy.mock.calls.at(-1)?.[0]);
          errorSpy.mockClear();
        }
      }
    }

    for (const action of ["create", "hire"] as const) {
      expect(errors[`${action}:false:pt-BR`]).toContain("Erro de API 422: Não foi possível concluir a solicitação. Detalhes: Adapter upstream detail");
      expect(errors[`${action}:false:en`]).toContain("API error 422: The request could not be completed. Details: Adapter upstream detail");
      expect(errors[`${action}:false:pt-BR`]).toContain('details={"code":"UPSTREAM_HIRE_REJECTED","providerMessage":"provider-owned wording"}');
      expect(errors[`${action}:false:en`]).toContain('details={"code":"UPSTREAM_HIRE_REJECTED","providerMessage":"provider-owned wording"}');
      expect(errors[`${action}:true:pt-BR`]).toBe(errors[`${action}:true:en`]);
      expect(errors[`${action}:true:pt-BR`]).toBe(
        'API error 422: Adapter upstream detail details={"code":"UPSTREAM_HIRE_REJECTED","providerMessage":"provider-owned wording"}',
      );
    }

    expect(exitSpy.mock.calls.map((call) => call[0])).toEqual(Array(8).fill(1));
    expect(logSpy).not.toHaveBeenCalled();
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls).toHaveLength(8);
  });
});
