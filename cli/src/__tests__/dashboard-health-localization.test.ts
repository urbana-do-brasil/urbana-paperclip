import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAccessCommands } from "../commands/client/access.js";
import { registerDashboardCommands } from "../commands/client/dashboard.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const HEALTH_RESULT = { status: "ok", version: "1.2.3", instance: "KeepCase" };
const DASHBOARD_RESULT = {
  issues: { open: 4, inProgress: 2 },
  spendUsd: 12.5,
  companyId: COMPANY_ID,
  title: "KeepCase dashboard",
};
const FAILURE = {
  error: "upstream KeepCase unavailable",
  details: { code: "UPSTREAM_UNAVAILABLE", companyId: COMPANY_ID, requestId: "req-7" },
};

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerAccessCommands(program);
  registerDashboardCommands(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("health and dashboard CLI localization", () => {
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
    setCliCommandLineShape(undefined);
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
      health: "Verificar a integridade da API",
      dashboard: "Operações de resumo do painel",
      dashboardGet: "Consultar o resumo do painel de uma organização",
      companyId: "ID da organização",
      apiKey: "Token bearer para chamadas autenticadas de agente",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      health: "Check API health",
      dashboard: "Dashboard summary operations",
      dashboardGet: "Get dashboard summary for a company",
      companyId: "Company ID",
      apiKey: "Bearer token for agent-authenticated calls",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help while preserving command names and flags", ({
    locale,
    health,
    dashboard,
    dashboardGet,
    companyId,
    apiKey,
    json,
  }) => {
    const program = makeProgram(locale);
    const healthCommand = program.commands.find((command) => command.name() === "health");
    const dashboardCommand = program.commands.find((command) => command.name() === "dashboard");
    const dashboardGetCommand = dashboardCommand?.commands.find((command) => command.name() === "get");

    expect(healthCommand?.description()).toBe(health);
    expect(dashboardCommand?.description()).toBe(dashboard);
    expect(dashboardGetCommand?.description()).toBe(dashboardGet);

    const healthHelp = healthCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(healthHelp).toContain("paperclipai health [options]");
    expect(healthHelp).toContain("--api-key <token>");
    expect(healthHelp).toContain(apiKey);
    expect(healthHelp).toContain("--json");
    expect(healthHelp).toContain(json);

    const dashboardHelp = dashboardGetCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(dashboardHelp).toContain("paperclipai dashboard get [options]");
    expect(dashboardHelp).toContain("--company-id <id>");
    expect(dashboardHelp).toContain(companyId);
    expect(dashboardHelp).toContain("--json");
    expect(dashboardHelp).toContain(json);
  });

  it("preserves successful API data and JSON output in both locales", async () => {
    const operations = [
      { args: ["health"], endpoint: "http://paperclip.test/api/health", result: HEALTH_RESULT },
      {
        args: ["dashboard", "get", "--company-id", COMPANY_ID],
        endpoint: `http://paperclip.test/api/companies/${COMPANY_ID}/dashboard`,
        result: DASHBOARD_RESULT,
      },
    ];
    const outputs: string[][] = operations.map(() => []);

    for (const [index, operation] of operations.entries()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(operation.result));
          await run([...operation.args, ...(json ? ["--json"] : [])], locale);
          const output = String(logSpy.mock.calls.at(-1)?.[0]);
          expect(JSON.parse(output)).toEqual(operation.result);
          outputs[index]?.push(output);
          logSpy.mockClear();
        }
      }
    }

    expect(outputs[0]).toEqual(Array(4).fill(JSON.stringify(HEALTH_RESULT, null, 2)));
    expect(outputs[1]).toEqual(Array(4).fill(JSON.stringify(DASHBOARD_RESULT, null, 2)));
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "http://paperclip.test/api/health",
      "http://paperclip.test/api/health",
      "http://paperclip.test/api/health",
      "http://paperclip.test/api/health",
      ...Array(4).fill(`http://paperclip.test/api/companies/${COMPANY_ID}/dashboard`),
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes API failure presentation while preserving structured errors and exit status", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const operations = [
      { args: ["health"] },
      { args: ["dashboard", "get", "--company-id", COMPANY_ID] },
    ];
    const structuredErrors: string[][] = operations.map(() => []);

    for (const [index, operation] of operations.entries()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(FAILURE, 503));
          await expect(run([...operation.args, ...(json ? ["--json"] : [])], locale)).rejects.toThrow("exit:1");
          const output = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(output).toContain(json || locale === "en" ? "API error 503:" : "Erro de API 503:");
          expect(output).toContain(FAILURE.error);
          expect(output).toContain(`details=${JSON.stringify(FAILURE.details)}`);
          if (json) structuredErrors[index]?.push(output);
          errorSpy.mockClear();
        }
      }
    }

    expect(structuredErrors[0]?.[0]).toBe(structuredErrors[0]?.[1]);
    expect(structuredErrors[1]?.[0]).toBe(structuredErrors[1]?.[1]);
    expect(exitSpy.mock.calls).toEqual(Array(8).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
