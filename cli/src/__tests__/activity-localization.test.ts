import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerActivityCommands } from "../commands/client/activity.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const ISSUE_ID = "33333333-3333-4333-8333-333333333333";
const ACTIVITY_ID = "44444444-4444-4444-8444-444444444444";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const ACTIVITY_ROW = {
  id: ACTIVITY_ID,
  action: "issue.updated",
  actorType: "agent",
  actorId: AGENT_ID,
  entityType: "issue",
  entityId: ISSUE_ID,
  createdAt: "2026-08-01T10:00:00.000Z",
  customCode: "KeepCase",
};

const CREATE_PAYLOAD = {
  action: "issue.updated",
  actorType: "agent",
  actorId: AGENT_ID,
  entityType: "issue",
  entityId: ISSUE_ID,
  payload: { note: "café", customCode: "KeepCase" },
};

type Operation = {
  name: "list" | "create" | "issue";
  args: string[];
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  response: unknown;
};

function operations(): Operation[] {
  return [
    {
      name: "list",
      args: ["activity", "list", "--company-id", COMPANY_ID, "--agent-id", AGENT_ID],
      method: "GET",
      path: `/api/companies/${COMPANY_ID}/activity?agentId=${AGENT_ID}`,
      response: [ACTIVITY_ROW],
    },
    {
      name: "create",
      args: ["activity", "create", "--company-id", COMPANY_ID, "--payload-json", JSON.stringify(CREATE_PAYLOAD)],
      method: "POST",
      path: `/api/companies/${COMPANY_ID}/activity`,
      body: CREATE_PAYLOAD,
      response: { id: ACTIVITY_ID, ...CREATE_PAYLOAD, customCode: "KeepCase" },
    },
    {
      name: "issue",
      args: ["activity", "issue", ISSUE_ID],
      method: "GET",
      path: `/api/issues/${ISSUE_ID}/activity`,
      response: [ACTIVITY_ROW],
    },
  ];
}

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerActivityCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

describe("activity command family localization", () => {
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
      group: "Operações do registro de atividade",
      descriptions: [
        "Listar entradas do registro de atividade da organização",
        "Criar uma entrada no registro de atividade da organização",
        "Listar a atividade de uma tarefa",
      ],
      company: "ID da organização",
      agent: "Filtrar pelo ID do agente",
      payload: "Payload JSON de CreateActivity",
      issueId: "ID da tarefa",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      group: "Activity log operations",
      descriptions: [
        "List company activity log entries",
        "Create a company activity log entry",
        "List activity for an issue",
      ],
      company: "Company ID",
      agent: "Filter by agent ID",
      payload: "CreateActivity JSON payload",
      issueId: "Issue ID",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help while retaining command names and flags", ({ locale, group, descriptions, company, agent, payload, issueId, json }) => {
    const program = makeProgram(locale);
    const activity = program.commands.find((command) => command.name() === "activity");
    const commands = activity?.commands;
    const list = commands?.find((command) => command.name() === "list");
    const create = commands?.find((command) => command.name() === "create");
    const issue = commands?.find((command) => command.name() === "issue");

    expect(activity?.description()).toBe(group);
    expect([list?.description(), create?.description(), issue?.description()]).toEqual(descriptions);
    const listHelp = list?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(listHelp).toContain("paperclipai activity list [options]");
    expect(listHelp).toContain("-C, --company-id <id>");
    expect(listHelp).toContain(company);
    expect(listHelp).toContain("--agent-id <id>");
    expect(listHelp).toContain(agent);
    expect(listHelp).toContain("--json");
    expect(listHelp).toContain(json);

    const createHelp = create?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(createHelp).toContain("paperclipai activity create [options]");
    expect(createHelp).toContain("--payload-json <json>");
    expect(createHelp).toContain(payload);
    expect(createHelp).toContain("--json");
    expect(createHelp).toContain(json);

    const issueHelp = issue?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(issueHelp).toContain("paperclipai activity issue [options] <issueId>");
    expect(issueHelp).toContain(issueId);
    expect(issueHelp).toContain("--json");
    expect(issueHelp).toContain(json);
  });

  it("localizes human activity labels while preserving row values and JSON bytes", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([ACTIVITY_ROW]));
      await runCommand(operations()[0]!.args, locale);
      const labels = locale === "en"
        ? ["ID", "Action", "Actor type", "Actor ID", "Entity type", "Entity ID", "Created at"]
        : ["ID", "Ação", "Tipo de ator", "ID do ator", "Tipo de entidade", "ID da entidade", "Criado em"];
      expect(outputLines(logSpy)).toEqual([[
        `${labels[0]}=${ACTIVITY_ID}`,
        `${labels[1]}=issue.updated`,
        `${labels[2]}=agent`,
        `${labels[3]}=${AGENT_ID}`,
        `${labels[4]}=issue`,
        `${labels[5]}=${ISSUE_ID}`,
        `${labels[6]}=${ACTIVITY_ROW.createdAt}`,
      ].join(" ")]);
      logSpy.mockClear();
    }

    const outputs: string[] = [];
    for (const operation of operations()) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
        await runCommand([...operation.args, "--json"], locale);
        outputs.push(...outputLines(logSpy));
        expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]))).toEqual(operation.response);
        logSpy.mockClear();
      }
    }

    for (let index = 0; index < outputs.length; index += 2) {
      expect(outputs[index + 1]).toBe(outputs[index]);
    }
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body === undefined
        ? undefined
        : JSON.parse(String((init as RequestInit).body)),
    ])).toEqual([
      ...operations().slice(0, 1).flatMap((operation) => Array.from({ length: 2 }, () => [
        `http://paperclip.test${operation.path}`,
        operation.method,
        operation.body,
      ])),
      ...operations().flatMap((operation) => Array.from({ length: 2 }, () => [
        `http://paperclip.test${operation.path}`,
        operation.method,
        operation.body,
      ])),
    ]);
  });

  it("preserves each operation's API error, details, status, and exit code in both languages", async () => {
    const failure = {
      error: "External activity failure/KeepCase",
      details: { code: "ACTIVITY_ACCESS_DENIED", companyId: COMPANY_ID, retryable: false },
    };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const statuses = [403, 422, 404] as const;

    for (const [index, operation] of operations().entries()) {
      const status = statuses[index]!;
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, status));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? `API error ${status}:` : `Erro de API ${status}:`);
          expect(error).toContain("External activity failure/KeepCase");
          expect(error).toContain(`details={"code":"ACTIVITY_ACCESS_DENIED","companyId":"${COMPANY_ID}","retryable":false}`);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(operations().length * 4).fill([1]));
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body === undefined
        ? undefined
        : JSON.parse(String((init as RequestInit).body)),
    ])).toEqual(operations().flatMap((operation) => Array.from({ length: 4 }, () => [
      `http://paperclip.test${operation.path}`,
      operation.method,
      operation.body,
    ])));
    expect(logSpy).not.toHaveBeenCalled();
  });
});
