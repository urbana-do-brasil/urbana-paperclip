import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerGoalCommands } from "../commands/client/goal.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const GOAL_ID = "44444444-4444-4444-8444-444444444444";
const PARENT_GOAL_ID = "55555555-5555-4555-8555-555555555555";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const CREATE_PAYLOAD = {
  title: "Expand café research",
  description: "Preserve this goal description.",
  level: "company",
  status: "active",
  parentId: null,
  ownerAgentId: AGENT_ID,
};

const UPDATE_PAYLOAD = {
  title: "Expand café research further",
  description: null,
  level: "company",
  status: "active",
  parentId: PARENT_GOAL_ID,
  ownerAgentId: null,
};

const GOAL_ROW = {
  id: GOAL_ID,
  companyId: COMPANY_ID,
  title: "Expand café research",
  description: "Keep raw API response data unchanged.",
  level: "company",
  status: "active",
  parentId: PARENT_GOAL_ID,
  ownerAgentId: AGENT_ID,
  customCode: "KeepCase",
};

const RESPONSES = {
  list: [GOAL_ROW],
  get: GOAL_ROW,
  create: { ...GOAL_ROW, ...CREATE_PAYLOAD, createdBy: "server" },
  update: { ...GOAL_ROW, ...UPDATE_PAYLOAD, updatedBy: "server" },
  delete: { id: GOAL_ID, title: GOAL_ROW.title, deleted: true, customCode: "KeepCase" },
};

type Operation = {
  name: "list" | "get" | "create" | "update" | "delete";
  args: string[];
  method: string;
  path: string;
  body: unknown;
  response: unknown;
};

function operations(): Operation[] {
  return [
    {
      name: "list",
      args: ["goal", "list", "--company-id", COMPANY_ID],
      method: "GET",
      path: `/api/companies/${COMPANY_ID}/goals`,
      body: undefined,
      response: RESPONSES.list,
    },
    {
      name: "get",
      args: ["goal", "get", GOAL_ID],
      method: "GET",
      path: `/api/goals/${GOAL_ID}`,
      body: undefined,
      response: RESPONSES.get,
    },
    {
      name: "create",
      args: [
        "goal", "create", "--company-id", COMPANY_ID,
        "--title", CREATE_PAYLOAD.title,
        "--description", CREATE_PAYLOAD.description,
        "--level", CREATE_PAYLOAD.level,
        "--status", CREATE_PAYLOAD.status,
        "--parent-id", "null",
        "--owner-agent-id", AGENT_ID,
      ],
      method: "POST",
      path: `/api/companies/${COMPANY_ID}/goals`,
      body: CREATE_PAYLOAD,
      response: RESPONSES.create,
    },
    {
      name: "update",
      args: [
        "goal", "update", GOAL_ID,
        "--title", UPDATE_PAYLOAD.title,
        "--description", "null",
        "--level", UPDATE_PAYLOAD.level,
        "--status", UPDATE_PAYLOAD.status,
        "--parent-id", PARENT_GOAL_ID,
        "--owner-agent-id", "null",
      ],
      method: "PATCH",
      path: `/api/goals/${GOAL_ID}`,
      body: UPDATE_PAYLOAD,
      response: RESPONSES.update,
    },
    {
      name: "delete",
      args: ["goal", "delete", GOAL_ID, "--yes"],
      method: "DELETE",
      path: `/api/goals/${GOAL_ID}`,
      body: undefined,
      response: RESPONSES.delete,
    },
  ];
}

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerGoalCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

function expectedGoalListLine(locale: SupportedLocale): string {
  const labels = locale === "en"
    ? ["ID", "Status", "Title", "Level", "Parent goal ID", "Owner agent ID"]
    : ["ID", "Status", "Título", "Nível", "ID da meta pai", "ID do agente responsável"];
  return [
    `${labels[0]}=${GOAL_ID}`,
    `${labels[1]}=active`,
    `${labels[2]}=Expand café research`,
    `${labels[3]}=company`,
    `${labels[4]}=${PARENT_GOAL_ID}`,
    `${labels[5]}=${AGENT_ID}`,
  ].join(" ");
}

describe("goal list/get/create/update/delete CLI localization", () => {
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
      groupDescription: "Operações de metas",
      descriptions: ["Listar metas de uma organização", "Consultar uma meta", "Criar uma meta", "Atualizar uma meta", "Excluir uma meta"],
      company: "ID da organização",
      title: "Título da meta",
      description: "Descrição da meta",
      level: "Nível da meta",
      status: "Status da meta",
      parent: "ID da meta pai",
      owner: "ID do agente responsável",
      goalId: "ID da meta",
      confirm: "Confirmar exclusão",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      groupDescription: "Goal operations",
      descriptions: ["List goals for a company", "Get one goal", "Create a goal", "Update a goal", "Delete a goal"],
      company: "Company ID",
      title: "Goal title",
      description: "Goal description",
      level: "Goal level",
      status: "Goal status",
      parent: "Parent goal ID",
      owner: "Owner agent ID",
      goalId: "Goal ID",
      confirm: "Confirm deletion",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help and preserves goal commands and flags", ({ locale, groupDescription, descriptions, company, title, description, level, status, parent, owner, goalId, confirm, json }) => {
    const program = makeProgram(locale);
    const goal = program.commands.find((command) => command.name() === "goal");
    expect(goal?.description()).toBe(groupDescription);
    const commands = ["list", "get", "create", "update", "delete"].map((name) =>
      goal?.commands.find((candidate) => candidate.name() === name));

    commands.forEach((command, index) => expect(command?.description()).toBe(descriptions[index]));

    const listHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(listHelp).toContain("-C, --company-id <id>");
    expect(listHelp).toContain(company);
    expect(listHelp).toContain("--json");
    expect(listHelp).toContain(json);

    const getHelp = commands[1]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(getHelp).toContain("paperclipai goal get [options] <goalId>");
    expect(getHelp).toContain(goalId);
    expect(getHelp).toContain("--json");
    expect(getHelp).toContain(json);

    const createHelp = commands[2]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(createHelp).toContain("-C, --company-id <id>");
    for (const flag of ["--title <title>", "--description <text>", "--level <level>", "--status <status>", "--parent-id <id>", "--owner-agent-id <id>", "--json"]) {
      expect(createHelp).toContain(flag);
    }
    for (const label of [company, title, description, level, status, parent, owner, json]) expect(createHelp).toContain(label);

    const updateHelp = commands[3]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(updateHelp).toContain("paperclipai goal update [options] <goalId>");
    expect(updateHelp).toContain(goalId);
    for (const flag of ["--title <title>", "--description <text|null>", "--level <level>", "--status <status>", "--parent-id <id|null>", "--owner-agent-id <id|null>", "--json"]) {
      expect(updateHelp).toContain(flag);
    }
    for (const label of [title, description, level, status, parent, owner, json]) expect(updateHelp).toContain(label);

    const deleteHelp = commands[4]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(deleteHelp).toContain("paperclipai goal delete [options] <goalId>");
    expect(deleteHelp).toContain(goalId);
    expect(deleteHelp).toContain("--yes");
    expect(deleteHelp).toContain(confirm);
    expect(deleteHelp).toContain("--json");
    expect(deleteHelp).toContain(json);
  });

  it("preserves success responses, payloads, routes, auth, and JSON across all five operations", async () => {
    for (const operation of operations()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await runCommand(args, locale);
          if (operation.name === "list" && !json) {
            expect(outputLines(logSpy)).toEqual([expectedGoalListLine(locale)]);
          } else {
            expect(outputLines(logSpy)).toEqual([JSON.stringify(operation.response, null, 2)]);
            expect(JSON.parse(outputLines(logSpy)[0]!)).toEqual(operation.response);
          }
          logSpy.mockClear();
        }
      }
    }

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
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit | undefined)?.headers).toEqual(expect.objectContaining({ authorization: "Bearer board-token" }));
    }
  });

  it("localizes empty list and null get markers without changing JSON", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse([]));
        const listArgs = ["goal", "list", "--company-id", COMPANY_ID];
        if (json) listArgs.push("--json");
        await runCommand(listArgs, locale);
        expect(outputLines(logSpy)).toEqual([json ? "[]" : locale === "en" ? "(empty)" : "(vazio)"]);
        logSpy.mockClear();

        fetchMock.mockResolvedValueOnce(jsonResponse(null));
        const getArgs = ["goal", "get", GOAL_ID];
        if (json) getArgs.push("--json");
        await runCommand(getArgs, locale);
        expect(outputLines(logSpy)).toEqual([json ? "null" : locale === "en" ? "(null)" : "(nulo)"]);
        logSpy.mockClear();
      }
    }
  });

  it("preserves external API errors, details, status codes, and exit codes", async () => {
    const failure = {
      error: "External goal failure/KeepCase",
      details: { code: "GOAL_ACCESS_DENIED", goalId: GOAL_ID, retryable: false },
    };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const statusByOperation = { list: 403, get: 404, create: 409, update: 422, delete: 403 } as const;

    for (const operation of operations()) {
      const status = statusByOperation[operation.name];
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, status));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? `API error ${status}:` : `Erro de API ${status}:`);
          expect(error).toContain("External goal failure/KeepCase");
          expect(error).toContain(`details={"code":"GOAL_ACCESS_DENIED","goalId":"${GOAL_ID}","retryable":false}`);
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

  it("localizes missing delete confirmation for human output and preserves structured stderr", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        const args = ["goal", "delete", GOAL_ID];
        if (json) args.push("--json");
        await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
        const error = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(error).toContain(json || locale === "en" ? "Deletion requires --yes." : "A exclusão requer --yes.");
        errorSpy.mockClear();
      }
    }

    expect(exitSpy.mock.calls).toEqual([[1], [1], [1], [1]]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
