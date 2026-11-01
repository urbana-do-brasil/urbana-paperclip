import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const MANAGER_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

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

const AGENT = {
  id: AGENT_ID,
  name: "Northstar Recovery",
  role: "incident-response-captain",
  status: "pending_approval",
  reportsTo: MANAGER_ID,
  budgetMonthlyCents: 12345,
  spentMonthlyCents: 6789,
};

describe("agent list localization", () => {
  let tempRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-list-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse([AGENT]));
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function runCommand(args: string[], locale: SupportedLocale): Promise<void> {
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  function listArgs(...extra: string[]): string[] {
    return [
      "agent", "list",
      "--company-id", COMPANY_ID,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...extra,
    ];
  }

  it.each([
    {
      locale: "pt-BR",
      description: "Listar agentes de uma organização",
      companyId: "ID da organização",
      row: `ID=${AGENT_ID} Nome=Northstar Recovery Papel=incident-response-captain Status=pending_approval Reporta a=${MANAGER_ID} Orçamento mensal (centavos)=12345 Gasto mensal (centavos)=6789`,
    },
    {
      locale: "en",
      description: "List agents for a company",
      companyId: "Company ID",
      row: `ID=${AGENT_ID} Name=Northstar Recovery Role=incident-response-captain Status=pending_approval Reports to=${MANAGER_ID} Monthly budget (cents)=12345 Monthly spend (cents)=6789`,
    },
  ] as const)("localizes $locale help and human-readable records, preserving supplied values", async ({ locale, description, companyId, row }) => {
    const program = makeProgram(locale);
    const agentCommand = program.commands.find((command) => command.name() === "agent");
    const listCommand = agentCommand?.commands.find((command) => command.name() === "list");
    expect(listCommand).toBeDefined();
    expect(listCommand?.description()).toBe(description);

    const help = listCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(help).toContain(description);
    expect(help).toContain("--company-id <id>");
    expect(help).toContain(companyId);

    await runCommand(listArgs(), locale);
    expect(logSpy.mock.calls.map((call: unknown[]) => String(call[0]))).toEqual([row]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [input] = fetchMock.mock.calls[0] as unknown as [string];
    expect(new URL(input).pathname).toBe(`/api/companies/${COMPANY_ID}/agents`);
  });

  it("localizes the empty marker and keeps JSON output identical across locales", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([AGENT]))
      .mockResolvedValueOnce(jsonResponse([AGENT]));

    await runCommand(listArgs(), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(vazio)");
    logSpy.mockClear();
    await runCommand(listArgs(), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(empty)");

    logSpy.mockClear();
    await runCommand(listArgs("--json"), "pt-BR");
    const portugueseJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(listArgs("--json"), "en");
    const englishJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(portugueseJson).toBe(englishJson);
    expect(JSON.parse(portugueseJson)).toEqual([AGENT]);
  });
});
