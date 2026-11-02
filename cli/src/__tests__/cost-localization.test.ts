import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerCostCommands } from "../commands/client/cost.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const ISSUE_ID = "33333333-3333-4333-8333-333333333333";
const API_RESULT = { amountUsd: 12.5, item: "KeepCase", companyId: COMPANY_ID };
const CREATE_PAYLOAD = { amountUsd: 12.5, source: "manual", externalCode: "KeepCase" };
const FAILURE = {
  error: "upstream KeepCase unavailable",
  details: { code: "UPSTREAM_UNAVAILABLE", companyId: COMPANY_ID, requestId: "req-cost-7" },
};

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

type Operation = {
  args: string[];
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

const OPERATIONS: Operation[] = [
  { args: ["cost", "summary"], method: "GET", path: `/api/companies/${COMPANY_ID}/costs/summary` },
  { args: ["cost", "by-agent"], method: "GET", path: `/api/companies/${COMPANY_ID}/costs/by-agent` },
  { args: ["cost", "by-agent-model"], method: "GET", path: `/api/companies/${COMPANY_ID}/costs/by-agent-model` },
  { args: ["cost", "by-provider"], method: "GET", path: `/api/companies/${COMPANY_ID}/costs/by-provider` },
  { args: ["cost", "by-biller"], method: "GET", path: `/api/companies/${COMPANY_ID}/costs/by-biller` },
  { args: ["cost", "by-project"], method: "GET", path: `/api/companies/${COMPANY_ID}/costs/by-project` },
  { args: ["cost", "window-spend"], method: "GET", path: `/api/companies/${COMPANY_ID}/costs/window-spend` },
  { args: ["cost", "quota-windows"], method: "GET", path: `/api/companies/${COMPANY_ID}/costs/quota-windows` },
  { args: ["cost", "issue", ISSUE_ID], method: "GET", path: `/api/issues/${ISSUE_ID}/cost-summary` },
  {
    args: ["cost", "event:create", "--payload-json", JSON.stringify(CREATE_PAYLOAD)],
    method: "POST",
    path: `/api/companies/${COMPANY_ID}/cost-events`,
    body: CREATE_PAYLOAD,
  },
];

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerCostCommands(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("cost CLI localization", () => {
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

  async function run(args: readonly string[], locale: SupportedLocale, json = false): Promise<void> {
    const commandArgs = [
      ...args,
      ...(args[1] === "issue" ? [] : ["--company-id", COMPANY_ID]),
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...(json ? ["--json"] : []),
    ];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      group: "Operações de custos e finanças",
      summary: "Consultar dados de custos resumidos",
      byAgent: "Consultar custos por agente",
      byModel: "Consultar custos por agente e modelo",
      issue: "Consultar o resumo de custos de uma tarefa",
      issueId: "ID da tarefa",
      companyId: "ID da organização",
      payload: "Payload JSON",
    },
    {
      locale: "en",
      group: "Cost and finance operations",
      summary: "Get summarized cost data",
      byAgent: "Get costs by agent",
      byModel: "Get costs by agent and model",
      issue: "Get cost summary for an issue",
      issueId: "Issue ID",
      companyId: "Company ID",
      payload: "JSON payload",
    },
  ] as const)("localizes $locale help while preserving commands and flags", ({
    locale,
    group,
    summary,
    byAgent,
    byModel,
    issue,
    issueId,
    companyId,
    payload,
  }) => {
    const program = makeProgram(locale);
    const cost = program.commands.find((command) => command.name() === "cost");
    const commands = cost?.commands;
    const find = (name: string) => commands?.find((command) => command.name() === name);

    expect(cost?.description()).toBe(group);
    expect(find("summary")?.description()).toBe(summary);
    expect(find("by-agent")?.description()).toBe(byAgent);
    expect(find("by-agent-model")?.description()).toBe(byModel);
    expect(find("issue")?.description()).toBe(issue);

    const summaryHelp = find("summary")?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(summaryHelp).toContain("paperclipai cost summary [options]");
    expect(summaryHelp).toContain("-C, --company-id <id>");
    expect(summaryHelp).toContain(companyId);
    expect(summaryHelp).toContain("--json");

    const issueHelp = find("issue")?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(issueHelp).toContain("paperclipai cost issue [options] <issueId>");
    expect(issueHelp).toContain(issueId);

    const createHelp = find("event:create")?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(createHelp).toContain("paperclipai cost event:create [options]");
    expect(createHelp).toContain("--payload-json <json>");
    expect(createHelp).toContain(payload);
  });

  it("preserves cost API paths, payloads, values, and output across locales and JSON mode", async () => {
    for (const operation of OPERATIONS) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(API_RESULT));
          await run(operation.args, locale, json);

          expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]))).toEqual(API_RESULT);
          logSpy.mockClear();
        }
      }
    }

    const expectedCalls = OPERATIONS.flatMap((operation) =>
      Array.from({ length: 4 }, () => ({
        url: `http://paperclip.test${operation.path}`,
        method: operation.method,
        body: operation.body === undefined ? undefined : JSON.stringify(operation.body),
      })),
    );
    expect(fetchMock.mock.calls).toHaveLength(expectedCalls.length);
    for (const [index, [input, init]] of fetchMock.mock.calls.entries()) {
      const expected = expectedCalls[index]!;
      expect(String(input)).toBe(expected.url);
      expect((init as RequestInit).method ?? "GET").toBe(expected.method);
      if (expected.body !== undefined) expect((init as RequestInit).body).toBe(expected.body);
    }
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes human API failures and keeps JSON-mode stderr and structured details stable", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const outputs: string[] = [];

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse(FAILURE, 503));
        await expect(run(["cost", "summary"], locale, json)).rejects.toThrow("exit:1");
        const stderr = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(stderr).toContain(json || locale === "en" ? "API error 503:" : "Erro de API 503:");
        expect(stderr).toContain(FAILURE.error);
        expect(stderr).toContain(`details=${JSON.stringify(FAILURE.details)}`);
        if (json) outputs.push(stderr);
        errorSpy.mockClear();
      }
    }

    expect(outputs[0]).toBe(outputs[1]);
    expect(exitSpy.mock.calls).toEqual(Array(4).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
