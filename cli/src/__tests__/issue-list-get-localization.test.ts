import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerIssueCommands } from "../commands/client/issue.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "33333333-3333-4333-8333-333333333333";
const ISSUE_ID = "44444444-4444-4444-8444-444444444444";
const OTHER_ISSUE_ID = "55555555-5555-4555-8555-555555555555";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const MATCHED_ISSUE = {
  id: ISSUE_ID,
  identifier: "PC-12",
  title: "Café restoration",
  description: "The selected text match remains in the response",
  status: "in_progress",
  priority: "high",
  assigneeAgentId: AGENT_ID,
  projectId: PROJECT_ID,
  code: "PRESERVE_CAMEL_CASE",
};

const NONMATCHED_ISSUE = {
  id: OTHER_ISSUE_ID,
  identifier: "PC-13",
  title: "Build dashboard",
  description: "No matching phrase here",
  status: "todo",
  priority: "low",
  assigneeAgentId: null,
  projectId: PROJECT_ID,
};

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

function expectedListLine(locale: SupportedLocale): string {
  const labels = locale === "en"
    ? ["Identifier", "ID", "Status", "Priority", "Title", "Assignee agent ID", "Project ID"]
    : ["Identificador", "ID", "Status", "Prioridade", "Título", "ID do agente responsável", "ID do projeto"];
  return [
    `${labels[0]}=PC-12`,
    `${labels[1]}=${ISSUE_ID}`,
    `${labels[2]}=in_progress`,
    `${labels[3]}=high`,
    `${labels[4]}=Café restoration`,
    `${labels[5]}=${AGENT_ID}`,
    `${labels[6]}=${PROJECT_ID}`,
  ].join(" ");
}

describe("issue list/get CLI localization", () => {
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

  function listArgs(): string[] {
    return [
      "issue", "list",
      "--company-id", COMPANY_ID,
      "--status", "todo,in_progress",
      "--assignee-agent-id", AGENT_ID,
      "--project-id", PROJECT_ID,
      "--match", "café",
    ];
  }

  it.each([
    {
      locale: "pt-BR",
      listDescription: "Listar tarefas de uma organização",
      getDescription: "Consultar uma tarefa por UUID ou identificador (ex.: PC-12)",
      company: "ID da organização",
      statuses: "Status separados por vírgulas",
      assignee: "Filtrar pelo ID do agente responsável",
      project: "Filtrar pelo ID do projeto",
      match: "Busca local no identificador/título/descrição",
      argument: "ID ou identificador da tarefa",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      listDescription: "List issues for a company",
      getDescription: "Get an issue by UUID or identifier (e.g. PC-12)",
      company: "Company ID",
      statuses: "Comma-separated statuses",
      assignee: "Filter by assignee agent ID",
      project: "Filter by project ID",
      match: "Local text match on identifier/title/description",
      argument: "Issue ID or identifier",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help and retains issue command names and flags", ({ locale, listDescription, getDescription, company, statuses, assignee, project, match, argument, json }) => {
    const program = makeProgram(locale);
    const issue = program.commands.find((command) => command.name() === "issue");
    const list = issue?.commands.find((command) => command.name() === "list");
    const get = issue?.commands.find((command) => command.name() === "get");

    expect(list?.description()).toBe(listDescription);
    const listHelp = list?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(listHelp).toContain("paperclipai issue list [options]");
    expect(listHelp).toContain("-C, --company-id <id>");
    expect(listHelp).toContain(company);
    expect(listHelp).toContain("--status <csv>");
    expect(listHelp).toContain(statuses);
    expect(listHelp).toContain("--assignee-agent-id <id>");
    expect(listHelp).toContain(assignee);
    expect(listHelp).toContain("--project-id <id>");
    expect(listHelp).toContain(project);
    expect(listHelp).toContain("--match <text>");
    expect(listHelp).toContain(match);
    expect(listHelp).toContain("--json");
    expect(listHelp).toContain(json);

    expect(get?.description()).toBe(getDescription);
    const getHelp = get?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(getHelp).toContain("paperclipai issue get [options] <idOrIdentifier>");
    expect(getHelp).toContain(argument);
    expect(getHelp).toContain("--json");
    expect(getHelp).toContain(json);
  });

  it("preserves issue list filtering, fields, results, query values, and JSON while localizing human labels", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse([MATCHED_ISSUE, NONMATCHED_ISSUE]));
        const args = json ? [...listArgs(), "--json"] : listArgs();
        await runCommand(args, locale);

        if (json) {
          const expected = [MATCHED_ISSUE];
          expect(outputLines(logSpy)).toEqual([JSON.stringify(expected, null, 2)]);
          expect(JSON.parse(outputLines(logSpy)[0]!)).toEqual(expected);
        } else {
          expect(outputLines(logSpy)).toEqual([expectedListLine(locale)]);
        }
        logSpy.mockClear();
      }
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual(Array.from({ length: 4 }, () => [
      `http://paperclip.test/api/companies/${COMPANY_ID}/issues?status=todo%2Cin_progress&assigneeAgentId=${AGENT_ID}&projectId=${PROJECT_ID}`,
      "GET",
      undefined,
    ]));
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit | undefined)?.headers).toEqual(expect.objectContaining({ authorization: "Bearer board-token" }));
    }
  });

  it("keeps issue get fields and response output identical in both locales and modes", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse(MATCHED_ISSUE));
        const args = ["issue", "get", "PC-12"];
        if (json) args.push("--json");
        await runCommand(args, locale);
        expect(outputLines(logSpy)).toEqual([JSON.stringify(MATCHED_ISSUE, null, 2)]);
        expect(JSON.parse(outputLines(logSpy)[0]!)).toEqual(MATCHED_ISSUE);
        logSpy.mockClear();
      }
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual(Array.from({ length: 4 }, () => [
      "http://paperclip.test/api/issues/PC-12",
      "GET",
      undefined,
    ]));
  });

  it("localizes empty issue list and null issue markers without changing JSON output", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse([]));
        await runCommand(json ? [...listArgs(), "--json"] : listArgs(), locale);
        expect(outputLines(logSpy)).toEqual([json ? "[]" : locale === "en" ? "(empty)" : "(vazio)"]);
        logSpy.mockClear();

        fetchMock.mockResolvedValueOnce(jsonResponse(null));
        const getArgs = ["issue", "get", "PC-12"];
        if (json) getArgs.push("--json");
        await runCommand(getArgs, locale);
        expect(outputLines(logSpy)).toEqual([json ? "null" : locale === "en" ? "(null)" : "(nulo)"]);
        logSpy.mockClear();
      }
    }

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(Array.from({ length: 4 }, () => [
      `http://paperclip.test/api/companies/${COMPANY_ID}/issues?status=todo%2Cin_progress&assigneeAgentId=${AGENT_ID}&projectId=${PROJECT_ID}`,
      "http://paperclip.test/api/issues/PC-12",
    ]).flat());
  });

  it("preserves external errors, details, status, and exit code for list and get", async () => {
    const failure = {
      error: "External issue permission failure/KeepCase",
      details: { code: "ISSUE_ACCESS_DENIED", issueId: ISSUE_ID, canRetry: false },
    };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const operations = [
      { name: "list", args: listArgs(), path: `/api/companies/${COMPANY_ID}/issues?status=todo%2Cin_progress&assigneeAgentId=${AGENT_ID}&projectId=${PROJECT_ID}` },
      { name: "get", args: ["issue", "get", "PC-12"], path: "/api/issues/PC-12" },
    ] as const;

    for (const operation of operations) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, operation.name === "list" ? 403 : 404));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          const status = operation.name === "list" ? 403 : 404;
          expect(error).toContain(json || locale === "en" ? `API error ${status}:` : `Erro de API ${status}:`);
          expect(error).toContain("External issue permission failure/KeepCase");
          expect(error).toContain(`details={"code":"ISSUE_ACCESS_DENIED","issueId":"${ISSUE_ID}","canRetry":false}`);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(operations.length * 4).fill([1]));
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
    ])).toEqual(operations.flatMap((operation) => Array.from({ length: 4 }, () => [
      `http://paperclip.test${operation.path}`,
      "GET",
    ])));
    expect(logSpy).not.toHaveBeenCalled();
  });
});
