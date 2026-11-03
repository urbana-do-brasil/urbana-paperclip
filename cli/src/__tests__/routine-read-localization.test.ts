import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerRoutineApiCommands } from "../commands/client/routine-api.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "project/Alpha";
const ROUTINE_ID = "routine/alpha";
const ROUTINE_ROWS = [
  {
    id: ROUTINE_ID,
    name: "Café closeout",
    status: "active",
    description: "Preserve this user-authored description.",
    customCode: "KeepCase",
  },
];
const FAILURE = {
  error: "Routine access denied/KeepCase",
  details: { code: "ROUTINE_ACCESS_DENIED", routineId: ROUTINE_ID, retryable: false },
};

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerRoutineApiCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("routine list/get CLI localization", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    stdoutSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
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
      group: "Operações da API de rotinas",
      list: "Listar rotinas",
      projectId: "Filtrar pelo ID do projeto",
      get: "Consultar uma rotina",
      routineId: "ID da rotina",
      companyId: "ID da organização",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      group: "Routine API operations",
      list: "List routines",
      projectId: "Filter by project ID",
      get: "Get a routine",
      routineId: "Routine ID",
      companyId: "Company ID",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help while preserving commands and flags", ({
    locale,
    group,
    list,
    projectId,
    get,
    routineId,
    companyId,
    json,
  }) => {
    const program = makeProgram(locale);
    const routine = program.commands.find((command) => command.name() === "routine");
    const listCommand = routine?.commands.find((command) => command.name() === "list");
    const getCommand = routine?.commands.find((command) => command.name() === "get");

    expect(routine?.description()).toBe(group);
    expect(listCommand?.description()).toBe(list);
    expect(getCommand?.description()).toBe(get);

    const listHelp = listCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(listHelp).toContain("paperclipai routine list [options]");
    expect(listHelp).toContain("-C, --company-id <id>");
    expect(listHelp).toContain(companyId);
    expect(listHelp).toContain("--project-id <id>");
    expect(listHelp).toContain(projectId);
    expect(listHelp).toContain("--json");
    expect(listHelp).toContain(json);

    const getHelp = getCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(getHelp).toContain("paperclipai routine get [options] <id>");
    expect(getHelp).toContain(`id ${routineId}`);
    expect(getHelp).toContain("--json");
    expect(getHelp).toContain(json);
  });

  it("preserves successful API data, routes, auth, and JSON in both locales", async () => {
    const cases = [
      {
        args: ["routine", "list", "--company-id", COMPANY_ID, "--project-id", PROJECT_ID],
        url: `http://paperclip.test/api/companies/${COMPANY_ID}/routines?projectId=project%2FAlpha`,
        result: ROUTINE_ROWS,
      },
      {
        args: ["routine", "get", ROUTINE_ID],
        url: `http://paperclip.test/api/routines/routine%2Falpha`,
        result: ROUTINE_ROWS[0],
      },
    ];

    for (const operation of cases) {
      const outputs: string[] = [];
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.result));
        await run([...operation.args, "--json"], locale);

        const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
        expect(JSON.parse(output)).toEqual(operation.result);
        outputs.push(output);
        const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
        expect(url).toBe(operation.url);
        expect(init.method).toBe("GET");
        expect((init.headers as Record<string, string>).authorization).toBe("Bearer board-token");
        stdoutSpy.mockClear();
      }
      expect(outputs).toEqual(Array(2).fill(JSON.stringify(operation.result, null, 2)));
    }

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("localizes the empty list marker without changing the list request", async () => {
    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await run(["routine", "list", "--company-id", COMPANY_ID], locale);
      outputs.push(String(stdoutSpy.mock.calls.at(-1)?.[0]));
      stdoutSpy.mockClear();
    }

    expect(outputs).toEqual(["(vazio)", "(empty)"]);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(
      Array(2).fill(`http://paperclip.test/api/companies/${COMPANY_ID}/routines`),
    );
  });

  it("preserves API failure details, stderr mode, and exit status in both locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const operations = [
      ["routine", "list", "--company-id", COMPANY_ID],
      ["routine", "get", ROUTINE_ID],
    ];
    const structuredErrors: string[][] = operations.map(() => []);

    for (const [index, args] of operations.entries()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(FAILURE, 403));
          await expect(run([...args, ...(json ? ["--json"] : [])], locale)).rejects.toThrow("exit:1");

          const output = String(stderrSpy.mock.calls.at(-1)?.[0]);
          expect(output).toContain(json || locale === "en" ? "API error 403:" : "Erro de API 403:");
          expect(output).toContain(FAILURE.error);
          expect(output).toContain(`details=${JSON.stringify(FAILURE.details)}`);
          if (json) structuredErrors[index]?.push(output);
          stderrSpy.mockClear();
        }
      }
    }

    expect(structuredErrors[0]?.[0]).toBe(structuredErrors[0]?.[1]);
    expect(structuredErrors[1]?.[0]).toBe(structuredErrors[1]?.[1]);
    expect(exitSpy.mock.calls).toEqual(Array(8).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
