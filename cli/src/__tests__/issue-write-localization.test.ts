import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerIssueCommands } from "../commands/client/issue.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const GOAL_ID = "66666666-6666-4666-8666-666666666666";
const PARENT_ID = "77777777-7777-4777-8777-777777777777";
const ISSUE_ID = "44444444-4444-4444-8444-444444444444";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const CREATE_PAYLOAD = {
  title: "Build café dashboard",
  description: "Keep this supplied description unchanged.",
  status: "todo",
  priority: "high",
  assigneeAgentId: AGENT_ID,
  projectId: PROJECT_ID,
  goalId: GOAL_ID,
  parentId: null,
  requestDepth: 2,
  billingCode: "BILL-42",
  workMode: "standard",
  visibility: "open",
  allowDuplicate: false,
};

const UPDATE_PAYLOAD = {
  title: "Update café dashboard",
  description: "Updated description",
  status: "in_progress",
  priority: "medium",
  assigneeAgentId: AGENT_ID,
  projectId: PROJECT_ID,
  goalId: GOAL_ID,
  parentId: PARENT_ID,
  requestDepth: 4,
  billingCode: "BILL-84",
  comment: "Update comment is sent unchanged",
  hiddenAt: null,
};

const RESPONSES = {
  create: { id: ISSUE_ID, identifier: "PC-24", ...CREATE_PAYLOAD, source: "api response" },
  update: { id: ISSUE_ID, identifier: "PC-24", ...UPDATE_PAYLOAD, revisionId: "revision-7" },
  delete: { id: ISSUE_ID, identifier: "PC-24", deleted: true, customCode: "KeepCase" },
};

type Operation = {
  name: "create" | "update" | "delete";
  args: string[];
  method: string;
  path: string;
  body: unknown;
  response: unknown;
};

function operations(): Operation[] {
  return [
    {
      name: "create",
      args: [
        "issue", "create", "--company-id", COMPANY_ID,
        "--title", CREATE_PAYLOAD.title,
        "--description", CREATE_PAYLOAD.description,
        "--status", CREATE_PAYLOAD.status,
        "--priority", CREATE_PAYLOAD.priority,
        "--assignee-agent-id", AGENT_ID,
        "--project-id", PROJECT_ID,
        "--goal-id", GOAL_ID,
        "--standalone",
        "--request-depth", String(CREATE_PAYLOAD.requestDepth),
        "--billing-code", CREATE_PAYLOAD.billingCode,
      ],
      method: "POST",
      path: `/api/companies/${COMPANY_ID}/issues`,
      body: CREATE_PAYLOAD,
      response: RESPONSES.create,
    },
    {
      name: "update",
      args: [
        "issue", "update", ISSUE_ID,
        "--title", UPDATE_PAYLOAD.title,
        "--description", UPDATE_PAYLOAD.description,
        "--status", UPDATE_PAYLOAD.status,
        "--priority", UPDATE_PAYLOAD.priority,
        "--assignee-agent-id", AGENT_ID,
        "--project-id", PROJECT_ID,
        "--goal-id", GOAL_ID,
        "--parent-id", PARENT_ID,
        "--request-depth", String(UPDATE_PAYLOAD.requestDepth),
        "--billing-code", UPDATE_PAYLOAD.billingCode,
        "--comment", UPDATE_PAYLOAD.comment,
        "--hidden-at", "null",
      ],
      method: "PATCH",
      path: `/api/issues/${ISSUE_ID}`,
      body: UPDATE_PAYLOAD,
      response: RESPONSES.update,
    },
    {
      name: "delete",
      args: ["issue", "delete", ISSUE_ID, "--yes"],
      method: "DELETE",
      path: `/api/issues/${ISSUE_ID}`,
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
  registerIssueCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

describe("issue create/update/delete CLI localization", () => {
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
      descriptions: ["Criar uma tarefa", "Atualizar uma tarefa", "Excluir uma tarefa"],
      company: "ID da organização",
      title: "Título da tarefa",
      description: "Descrição da tarefa",
      status: "Status da tarefa",
      priority: "Prioridade da tarefa",
      assignee: "ID do agente responsável",
      project: "ID do projeto",
      goal: "ID da meta",
      parent: "ID da tarefa pai",
      standalone: "Criar uma tarefa de nível superior.",
      requestDepth: "Profundidade da solicitação (inteiro)",
      billingCode: "Código de faturamento",
      comment: "Comentário opcional para adicionar junto com a atualização",
      hiddenAt: "Definir o timestamp de hiddenAt ou o literal 'null'",
      issueId: "ID da tarefa",
      confirm: "Confirmar exclusão",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      descriptions: ["Create an issue", "Update an issue", "Delete an issue"],
      company: "Company ID",
      title: "Issue title",
      description: "Issue description",
      status: "Issue status",
      priority: "Issue priority",
      assignee: "Assignee agent ID",
      project: "Project ID",
      goal: "Goal ID",
      parent: "Parent issue ID",
      standalone: "Create a top-level issue.",
      requestDepth: "Request depth integer",
      billingCode: "Billing code",
      comment: "Optional comment to add with update",
      hiddenAt: "Set hiddenAt timestamp or literal 'null'",
      issueId: "Issue ID",
      confirm: "Confirm deletion",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help and preserves command names and flags", ({ locale, descriptions, company, title, description, status, priority, assignee, project, goal, parent, standalone, requestDepth, billingCode, comment, hiddenAt, issueId, confirm, json }) => {
    const program = makeProgram(locale);
    const issue = program.commands.find((command) => command.name() === "issue");
    const create = issue?.commands.find((command) => command.name() === "create");
    const update = issue?.commands.find((command) => command.name() === "update");
    const remove = issue?.commands.find((command) => command.name() === "delete");

    expect(create?.description()).toBe(descriptions[0]);
    const createHelp = create?.helpInformation().replace(/\s+/g, " ") ?? "";
    for (const flag of [
      "-C, --company-id <id>", "--title <title>", "--description <text>", "--status <status>",
      "--priority <priority>", "--assignee-agent-id <id>", "--project-id <id>", "--goal-id <id>",
      "--parent-id <id>", "--standalone", "--request-depth <n>", "--billing-code <code>", "--json",
    ]) expect(createHelp).toContain(flag);
    for (const label of [company, title, description, status, priority, assignee, project, goal, parent, standalone, requestDepth, billingCode, json]) {
      expect(createHelp).toContain(label);
    }

    expect(update?.description()).toBe(descriptions[1]);
    const updateHelp = update?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(updateHelp).toContain("paperclipai issue update [options] <issueId>");
    expect(updateHelp).toContain(issueId);
    for (const flag of [
      "--title <title>", "--description <text>", "--status <status>", "--priority <priority>",
      "--assignee-agent-id <id>", "--project-id <id>", "--goal-id <id>", "--parent-id <id>",
      "--request-depth <n>", "--billing-code <code>", "--comment <text>", "--hidden-at <iso8601|null>", "--json",
    ]) expect(updateHelp).toContain(flag);
    for (const label of [title, description, status, priority, assignee, project, goal, parent, requestDepth, billingCode, comment, hiddenAt, json]) {
      expect(updateHelp).toContain(label);
    }

    expect(remove?.description()).toBe(descriptions[2]);
    const deleteHelp = remove?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(deleteHelp).toContain("paperclipai issue delete [options] <issueId>");
    expect(deleteHelp).toContain(issueId);
    expect(deleteHelp).toContain("--yes");
    expect(deleteHelp).toContain(confirm);
    expect(deleteHelp).toContain("--json");
    expect(deleteHelp).toContain(json);
  });

  it("preserves successful responses, API methods, routes, payloads, and output in both locales and modes", async () => {
    for (const operation of operations()) {
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

  it("keeps external API errors, details, statuses, and exit codes unchanged", async () => {
    const failure = {
      error: "External issue write failure/KeepCase",
      details: { code: "ISSUE_WRITE_DENIED", issueId: ISSUE_ID, retries: 0 },
    };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const operation of operations()) {
      const status = operation.name === "create" ? 409 : operation.name === "update" ? 422 : 403;
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, status));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? `API error ${status}:` : `Erro de API ${status}:`);
          expect(error).toContain("External issue write failure/KeepCase");
          expect(error).toContain(`details={"code":"ISSUE_WRITE_DENIED","issueId":"${ISSUE_ID}","retries":0}`);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(operations().length * 4).fill([1]));
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method,
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

  it("localizes missing delete confirmation for human output and keeps structured stderr in English", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        const args = ["issue", "delete", ISSUE_ID];
        if (json) args.push("--json");
        await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
        const error = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(error).toContain(json || locale === "en" ? "Refusing to delete without --yes" : "Informe --yes para confirmar a exclusão");
        errorSpy.mockClear();
      }
    }

    expect(exitSpy.mock.calls).toEqual([[1], [1], [1], [1]]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("localizes command-specific validation errors without changing JSON stderr", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const cases = [
      {
        args: ["issue", "create", "--company-id", COMPANY_ID, "--title", "Conflict", "--standalone", "--parent-id", PARENT_ID],
        english: "--standalone cannot be combined with --parent-id",
        portuguese: "--standalone não pode ser usado junto com --parent-id",
      },
      {
        args: ["issue", "create", "--company-id", COMPANY_ID, "--title", "Bad depth", "--request-depth", "unknown"],
        english: "Invalid integer value: unknown",
        portuguese: "Valor inteiro inválido: unknown",
      },
      {
        args: ["issue", "update", ISSUE_ID, "--request-depth", "unknown"],
        english: "Invalid integer value: unknown",
        portuguese: "Valor inteiro inválido: unknown",
      },
    ];

    for (const testCase of cases) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          const args = json ? [...testCase.args, "--json"] : testCase.args;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? testCase.english : testCase.portuguese);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(cases.length * 4).fill([1]));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
