import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const REVISION_ID = "22222222-2222-4222-8222-222222222222";
const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const CONFIGURATION = {
  id: AGENT_ID,
  companyId: COMPANY_ID,
  name: "Northstar Recovery",
  role: "incident-response-captain",
  title: "Recovery lead",
  status: "active",
  reportsTo: null,
  adapterType: "claude_local",
  adapterConfig: { model: "claude-sonnet", env: { API_KEY: "[REDACTED]" } },
  runtimeConfig: { heartbeat: { intervalSeconds: 300 } },
  permissions: { canAssignTasks: true },
  updatedAt: "2026-10-31T12:00:00.000Z",
};

const REVISION = {
  id: REVISION_ID,
  companyId: COMPANY_ID,
  agentId: AGENT_ID,
  createdByAgentId: null,
  createdByUserId: "44444444-4444-4444-8444-444444444444",
  source: "agent.update",
  rolledBackFromRevisionId: null,
  changedKeys: ["adapterConfig.model", "runtimeConfig.heartbeat.intervalSeconds"],
  beforeConfig: { adapterType: "claude_local", adapterConfig: { model: "claude-haiku" } },
  afterConfig: { adapterType: "claude_local", adapterConfig: { model: "claude-sonnet" } },
  createdAt: "2026-10-31T11:00:00.000Z",
};
const REVISION_HUMAN_ROW = [
  `id=${REVISION_ID}`,
  `companyId=${COMPANY_ID}`,
  `agentId=${AGENT_ID}`,
  "createdByUserId=44444444-4444-4444-8444-444444444444",
  "source=agent.update",
  "createdAt=2026-10-31T11:00:00.000Z",
].join(" ");

const OPERATIONS = [
  {
    name: "configuration",
    args: ["agent", "configuration", AGENT_ID],
    method: "GET",
    path: `/api/agents/${AGENT_ID}/configuration`,
    response: CONFIGURATION,
    labels: {
      en: "Agent configuration (secrets redacted):",
      "pt-BR": "Configuração do agente (segredos ocultos):",
    },
    descriptions: { en: "Get redacted agent configuration", "pt-BR": "Consultar a configuração do agente com segredos ocultos" },
  },
  {
    name: "config-revisions",
    args: ["agent", "config-revisions", AGENT_ID],
    method: "GET",
    path: `/api/agents/${AGENT_ID}/config-revisions`,
    response: [REVISION],
    labels: {
      en: "Agent configuration revisions:",
      "pt-BR": "Revisões da configuração do agente:",
    },
    descriptions: { en: "List agent config revisions", "pt-BR": "Listar revisões da configuração do agente" },
  },
  {
    name: "config-revision:get",
    args: ["agent", "config-revision:get", AGENT_ID, REVISION_ID],
    method: "GET",
    path: `/api/agents/${AGENT_ID}/config-revisions/${REVISION_ID}`,
    response: REVISION,
    labels: {
      en: "Agent configuration revision:",
      "pt-BR": "Revisão da configuração do agente:",
    },
    descriptions: { en: "Get one agent config revision", "pt-BR": "Consultar uma revisão da configuração do agente" },
  },
  {
    name: "config-revision:rollback",
    args: ["agent", "config-revision:rollback", AGENT_ID, REVISION_ID],
    method: "POST",
    path: `/api/agents/${AGENT_ID}/config-revisions/${REVISION_ID}/rollback`,
    body: {},
    response: CONFIGURATION,
    labels: {
      en: `Agent configuration rolled back to revision ${REVISION_ID}.`,
      "pt-BR": `Configuração do agente restaurada para a revisão ${REVISION_ID}.`,
    },
    descriptions: {
      en: "Roll an agent back to a config revision",
      "pt-BR": "Restaurar a configuração do agente para uma revisão",
    },
  },
] as const;

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

describe("agent configuration localization", () => {
  let tempRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-config-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
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

  async function runCommand(args: string[], locale: SupportedLocale): Promise<void> {
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  function operationArgs(args: readonly string[], ...extra: string[]): string[] {
    return [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token", ...extra];
  }

  it.each(["pt-BR", "en"] as const)("localizes help in %s while preserving command names, arguments, and flags", (locale) => {
    const program = makeProgram(locale);
    const agentCommand = program.commands.find((command) => command.name() === "agent");

    for (const operation of OPERATIONS) {
      const command = agentCommand?.commands.find((candidate) => candidate.name() === operation.name);
      expect(command?.description()).toBe(operation.descriptions[locale]);
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(`paperclipai agent ${operation.name} [options] <agentId>`);
      expect(help).toContain(locale === "en" ? "Agent ID" : "ID do agente");
      expect(help).toContain("--json");
      expect(help).toContain(locale === "en" ? "Output raw JSON" : "Exibir JSON bruto");
      if (operation.name.includes(":")) {
        expect(help).toContain(`<revisionId>`);
        expect(help).toContain(locale === "en" ? "Revision ID" : "ID da revisão");
      }
    }
  });

  it("localizes result framing while retaining prior human formatting, requests, and JSON", async () => {
    for (const operation of OPERATIONS) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
        await runCommand(operationArgs(operation.args), locale);
        expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
          operation.labels[locale],
          operation.name === "config-revisions"
            ? REVISION_HUMAN_ROW
            : JSON.stringify(operation.response, null, 2),
        ]);
        logSpy.mockClear();
      }

      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
        await runCommand(operationArgs(operation.args, "--json"), locale);
        expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
          JSON.stringify(operation.response, null, 2),
        ]);
        logSpy.mockClear();
      }
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      new URL(String(url)).pathname,
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual(OPERATIONS.flatMap((operation) => [
      ...Array(4).fill([
        operation.path,
        operation.method,
        operation.method === "POST" ? JSON.stringify(operation.body) : undefined,
      ]),
    ]));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves API error details and exit codes for all operations and locales", async () => {
    const failure = { error: "Configuration backend detail", details: { code: "CONFIG_READ_DENIED" } };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const operation of OPERATIONS) {
      const status = operation.method === "POST" ? 409 : 404;
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, status));
        await expect(runCommand(operationArgs(operation.args), locale)).rejects.toThrow("exit:1");
        const message = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(message).toContain("Configuration backend detail");
        expect(message).toContain('details={"code":"CONFIG_READ_DENIED"}');
        expect(message).toContain(locale === "en" ? `API error ${status}:` : `Erro de API ${status}:`);
        errorSpy.mockClear();
      }

      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, status));
        await expect(runCommand(operationArgs(operation.args, "--json"), locale)).rejects.toThrow("exit:1");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toContain(
          `API error ${status}: Configuration backend detail details={"code":"CONFIG_READ_DENIED"}`,
        );
        errorSpy.mockClear();
      }
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual(Array(OPERATIONS.length * 4).fill(1));
    expect(fetchMock).toHaveBeenCalledTimes(OPERATIONS.length * 4);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
