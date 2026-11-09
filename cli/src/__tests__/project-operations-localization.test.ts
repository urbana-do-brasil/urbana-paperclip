import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerProjectCommands } from "../commands/client/project.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const GOAL_ID = "44444444-4444-4444-8444-444444444444";
const SECOND_GOAL_ID = "55555555-5555-4555-8555-555555555555";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const PROJECT_REF = "research-alpha";

const ENV = {
  PUBLIC_LABEL: "Café research",
  LEGACY_FLAG: { type: "plain", value: "Keep exactly" },
};
const CREATE_POLICY = { enabled: true, defaultMode: "isolated_workspace", allowIssueOverride: false };
const UPDATE_POLICY = { enabled: false, defaultMode: "shared_workspace" };

const CREATE_PAYLOAD = {
  name: "Research café",
  description: "Preserve the description as submitted.",
  status: "planned",
  goalIds: [GOAL_ID, SECOND_GOAL_ID],
  leadAgentId: AGENT_ID,
  targetDate: "2027-06-30",
  color: "#3755aa",
  env: ENV,
  executionWorkspacePolicy: CREATE_POLICY,
  visibility: "open",
};

const UPDATE_PAYLOAD = {
  name: "Updated café project",
  description: null,
  status: "in_progress",
  goalId: GOAL_ID,
  goalIds: [GOAL_ID, SECOND_GOAL_ID],
  leadAgentId: null,
  targetDate: null,
  color: "#123456",
  env: null,
  executionWorkspacePolicy: UPDATE_POLICY,
  archivedAt: null,
};

const PROJECT_ROW = {
  id: PROJECT_ID,
  companyId: COMPANY_ID,
  name: "Research café",
  description: "Leave all API response fields untouched.",
  status: "planned",
  urlKey: PROJECT_REF,
  goalIds: [GOAL_ID, SECOND_GOAL_ID],
  leadAgentId: AGENT_ID,
  customCode: "PreserveCase",
};

const RESPONSES = {
  list: [PROJECT_ROW],
  get: PROJECT_ROW,
  create: { ...PROJECT_ROW, ...CREATE_PAYLOAD, createdBy: "server" },
  update: { ...PROJECT_ROW, ...UPDATE_PAYLOAD, updatedBy: "server" },
  delete: { id: PROJECT_ID, urlKey: PROJECT_REF, deleted: true, customCode: "KeepCase" },
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
      args: ["project", "list", "--company-id", COMPANY_ID],
      method: "GET",
      path: `/api/companies/${COMPANY_ID}/projects`,
      body: undefined,
      response: RESPONSES.list,
    },
    {
      name: "get",
      args: ["project", "get", PROJECT_REF, "--company-id", COMPANY_ID],
      method: "GET",
      path: `/api/projects/${PROJECT_REF}?companyId=${COMPANY_ID}`,
      body: undefined,
      response: RESPONSES.get,
    },
    {
      name: "create",
      args: [
        "project", "create", "--company-id", COMPANY_ID,
        "--name", CREATE_PAYLOAD.name,
        "--description", CREATE_PAYLOAD.description,
        "--status", CREATE_PAYLOAD.status,
        "--goal-ids", CREATE_PAYLOAD.goalIds.join(","),
        "--lead-agent-id", AGENT_ID,
        "--target-date", CREATE_PAYLOAD.targetDate,
        "--color", CREATE_PAYLOAD.color,
        "--env-json", JSON.stringify(ENV),
        "--execution-workspace-policy-json", JSON.stringify(CREATE_POLICY),
      ],
      method: "POST",
      path: `/api/companies/${COMPANY_ID}/projects`,
      body: CREATE_PAYLOAD,
      response: RESPONSES.create,
    },
    {
      name: "update",
      args: [
        "project", "update", PROJECT_REF, "--company-id", COMPANY_ID,
        "--name", UPDATE_PAYLOAD.name,
        "--description", "null",
        "--status", UPDATE_PAYLOAD.status,
        "--goal-id", GOAL_ID,
        "--goal-ids", UPDATE_PAYLOAD.goalIds.join(","),
        "--lead-agent-id", "null",
        "--target-date", "null",
        "--color", UPDATE_PAYLOAD.color,
        "--env-json", "null",
        "--execution-workspace-policy-json", JSON.stringify(UPDATE_POLICY),
        "--archived-at", "null",
      ],
      method: "PATCH",
      path: `/api/projects/${PROJECT_REF}?companyId=${COMPANY_ID}`,
      body: UPDATE_PAYLOAD,
      response: RESPONSES.update,
    },
    {
      name: "delete",
      args: ["project", "delete", PROJECT_REF, "--company-id", COMPANY_ID, "--yes"],
      method: "DELETE",
      path: `/api/projects/${PROJECT_REF}?companyId=${COMPANY_ID}`,
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
  registerProjectCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

function expectedProjectListLine(locale: SupportedLocale): string {
  const labels = locale === "en"
    ? ["ID", "Name", "Status", "URL key", "Goal IDs", "Lead agent ID"]
    : ["ID", "Nome", "Status", "Chave de URL", "IDs de metas", "ID do agente responsável"];
  return [
    `${labels[0]}=${PROJECT_ID}`,
    `${labels[1]}=Research café`,
    `${labels[2]}=planned`,
    `${labels[3]}=${PROJECT_REF}`,
    `${labels[4]}=${GOAL_ID},${SECOND_GOAL_ID}`,
    `${labels[5]}=${AGENT_ID}`,
  ].join(" ");
}

describe("project list/get/create/update/delete CLI localization", () => {
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
      descriptions: ["Listar projetos de uma organização", "Consultar um projeto por ID ou nome curto", "Criar um projeto", "Atualizar um projeto", "Excluir um projeto"],
      company: "ID da organização",
      companyLookup: "ID da organização para buscar pelo nome curto",
      name: "Nome do projeto",
      description: "Descrição do projeto",
      status: "Status do projeto",
      goalId: "ID único de meta (obsoleto)",
      goalIds: "IDs de metas separados por vírgulas",
      lead: "ID do agente responsável",
      targetDate: "Data de destino",
      color: "Cor do projeto",
      env: "JSON de variáveis de ambiente do projeto",
      policy: "JSON da política de espaço de execução",
      archived: "Timestamp de arquivamento ou null",
      projectArg: "ID ou nome curto do projeto",
      confirm: "Confirmar exclusão",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      descriptions: ["List projects for a company", "Get one project by ID or shortname", "Create a project", "Update a project", "Delete a project"],
      company: "Company ID",
      companyLookup: "Company ID for shortname lookup",
      name: "Project name",
      description: "Project description",
      status: "Project status",
      goalId: "Deprecated single goal ID",
      goalIds: "Comma-separated goal IDs",
      lead: "Lead agent ID",
      targetDate: "Target date",
      color: "Project color",
      env: "Project env binding JSON",
      policy: "Execution workspace policy JSON",
      archived: "Archive timestamp or null",
      projectArg: "Project ID or shortname",
      confirm: "Confirm deletion",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help and preserves project commands and flags", ({ locale, descriptions, company, companyLookup, name, description, status, goalId, goalIds, lead, targetDate, color, env, policy, archived, projectArg, confirm, json }) => {
    const program = makeProgram(locale);
    const project = program.commands.find((command) => command.name() === "project");
    const commands = ["list", "get", "create", "update", "delete"].map((name) =>
      project?.commands.find((candidate) => candidate.name() === name));

    commands.forEach((command, index) => expect(command?.description()).toBe(descriptions[index]));

    const listHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(listHelp).toContain("-C, --company-id <id>");
    expect(listHelp).toContain(company);
    expect(listHelp).toContain("--json");
    expect(listHelp).toContain(json);

    const getHelp = commands[1]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(getHelp).toContain("paperclipai project get [options] <project>");
    expect(getHelp).toContain(projectArg);
    expect(getHelp).toContain("--company-id <id>");
    expect(getHelp).toContain(companyLookup);
    expect(getHelp).toContain("--json");
    expect(getHelp).toContain(json);

    const createHelp = commands[2]?.helpInformation().replace(/\s+/g, " ") ?? "";
    for (const flag of [
      "-C, --company-id <id>", "--name <name>", "--description <text>", "--status <status>",
      "--goal-id <id>", "--goal-ids <csv>", "--lead-agent-id <id>", "--target-date <date>",
      "--color <value>", "--env-json <json>", "--execution-workspace-policy-json <json>", "--json",
    ]) expect(createHelp).toContain(flag);
    for (const label of [company, name, description, status, goalId, goalIds, lead, targetDate, color, env, policy, json]) {
      expect(createHelp).toContain(label);
    }

    const updateHelp = commands[3]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(updateHelp).toContain("paperclipai project update [options] <project>");
    expect(updateHelp).toContain(projectArg);
    expect(updateHelp).toContain(companyLookup);
    for (const flag of [
      "--name <name>", "--description <text|null>", "--status <status>", "--goal-id <id|null>",
      "--goal-ids <csv>", "--lead-agent-id <id|null>", "--target-date <date|null>", "--color <value|null>",
      "--env-json <json|null>", "--execution-workspace-policy-json <json|null>", "--archived-at <iso8601|null>", "--json",
    ]) expect(updateHelp).toContain(flag);
    for (const label of [name, description, status, goalId, goalIds, lead, targetDate, color, env, policy, archived, json]) {
      expect(updateHelp).toContain(label);
    }

    const deleteHelp = commands[4]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(deleteHelp).toContain("paperclipai project delete [options] <project>");
    expect(deleteHelp).toContain(projectArg);
    expect(deleteHelp).toContain(companyLookup);
    expect(deleteHelp).toContain("--yes");
    expect(deleteHelp).toContain(confirm);
    expect(deleteHelp).toContain("--json");
    expect(deleteHelp).toContain(json);
  });

  it("preserves success responses, query values, payloads, auth, and JSON across all five operations", async () => {
    for (const operation of operations()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await runCommand(args, locale);
          if (operation.name === "list" && !json) {
            expect(outputLines(logSpy)).toEqual([expectedProjectListLine(locale)]);
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
        const listArgs = ["project", "list", "--company-id", COMPANY_ID];
        if (json) listArgs.push("--json");
        await runCommand(listArgs, locale);
        expect(outputLines(logSpy)).toEqual([json ? "[]" : locale === "en" ? "(empty)" : "(vazio)"]);
        logSpy.mockClear();

        fetchMock.mockResolvedValueOnce(jsonResponse(null));
        const getArgs = ["project", "get", PROJECT_REF, "--company-id", COMPANY_ID];
        if (json) getArgs.push("--json");
        await runCommand(getArgs, locale);
        expect(outputLines(logSpy)).toEqual([json ? "null" : locale === "en" ? "(null)" : "(nulo)"]);
        logSpy.mockClear();
      }
    }
  });

  it("preserves external API errors, details, status codes, and exit codes", async () => {
    const failure = {
      error: "External project failure/KeepCase",
      details: { code: "PROJECT_ACCESS_DENIED", projectId: PROJECT_ID, retryable: false },
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
          expect(error).toContain("External project failure/KeepCase");
          expect(error).toContain(`details={"code":"PROJECT_ACCESS_DENIED","projectId":"${PROJECT_ID}","retryable":false}`);
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

  it("localizes missing delete confirmation while keeping structured stderr in English", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        const args = ["project", "delete", PROJECT_REF, "--company-id", COMPANY_ID];
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

  it("localizes malformed JSON messages but preserves their English structured form", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const cases = [
      ["project", "create", "--company-id", COMPANY_ID, "--name", "Broken env", "--env-json", "{"],
      ["project", "update", PROJECT_REF, "--env-json", "{"],
    ];
    let englishSuffix: string | undefined;

    for (const argsBase of cases) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          const args = json ? [...argsBase, "--json"] : argsBase;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(locale === "pt-BR" && !json ? "JSON inválido:" : "Invalid JSON:");
          const suffix = error.slice(error.indexOf(":") + 1);
          if (englishSuffix === undefined) englishSuffix = suffix;
          else expect(suffix).toBe(englishSuffix);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(cases.length * 4).fill([1]));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
