import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const USER_ID = "22222222-2222-4222-8222-222222222222";
const ISSUE_ID = "11111111-1111-4111-8111-111111111111";
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

const INBOX_ISSUE = {
  identifier: "PC-17",
  id: ISSUE_ID,
  status: "in_progress",
  priority: "high",
  title: "Repair router",
  projectId: "project-9",
};

const MINE_ISSUE = {
  ...INBOX_ISSUE,
  projectId: "project-9",
  assigneeUserId: "user-4",
  description: "Investigate the recurring disconnect",
  createdAt: "2026-10-30T12:34:56.000Z",
  labels: [{ id: "label-1", name: "network" }],
};

const INBOX_EDGE_ISSUE = {
  identifier: { opaque: true },
  id: ISSUE_ID,
  status: null,
  priority: ["high"],
  title: null,
  projectId: null,
};

const MINE_EDGE_ISSUE = {
  identifier: null,
  id: { opaque: true },
  name: "agent-name",
  status: "blocked",
  priority: ["high"],
  title: { opaque: true },
  action: { state: "run" },
  projectId: "project-edge",
  nullableMetadata: null,
  nestedMetadata: { ignored: true },
};

describe("agent inbox localization", () => {
  let tempRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-inbox-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse([INBOX_ISSUE]));
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

  function inboxArgs(...extra: string[]): string[] {
    return ["agent", "inbox", "--api-base", "http://paperclip.test", "--api-key", "agent-token", ...extra];
  }

  function inboxMineArgs(...extra: string[]): string[] {
    return [
      "agent", "inbox-mine", "--user-id", USER_ID,
      "--api-base", "http://paperclip.test", "--api-key", "agent-token", ...extra,
    ];
  }

  it.each([
    {
      locale: "pt-BR",
      inboxDescription: "Listar tarefas atribuídas ao agente atual",
      mineDescription: "Listar tarefas do agente atual com atividade ou arquivadas por um usuário do board",
      userIdDescription: "ID do usuário do board",
      statusDescription: "Status das tarefas separados por vírgulas",
      jsonDescription: "Exibir JSON bruto",
    },
    {
      locale: "en",
      inboxDescription: "List current agent assigned inbox items",
      mineDescription: "List the current agent's inbox items touched or archived by a board user",
      userIdDescription: "Board user ID",
      statusDescription: "Comma-separated issue statuses",
      jsonDescription: "Output raw JSON",
    },
  ] as const)("localizes $locale command help and preserves names and flags", ({ locale, inboxDescription, mineDescription, userIdDescription, statusDescription, jsonDescription }) => {
    const program = makeProgram(locale);
    const agent = program.commands.find((command) => command.name() === "agent");
    const inbox = agent?.commands.find((command) => command.name() === "inbox");
    const inboxMine = agent?.commands.find((command) => command.name() === "inbox-mine");

    expect(inbox?.description()).toBe(inboxDescription);
    expect(inboxMine?.description()).toBe(mineDescription);
    const inboxHelp = inbox?.helpInformation().replace(/\s+/g, " ") ?? "";
    const mineHelp = inboxMine?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(inboxHelp).toContain("paperclipai agent inbox [options]");
    expect(inboxHelp).toContain("--json");
    expect(inboxHelp).toContain(jsonDescription);
    expect(mineHelp).toContain("paperclipai agent inbox-mine [options]");
    expect(mineHelp).toContain("--user-id <id>");
    expect(mineHelp).toContain(userIdDescription);
    expect(mineHelp).toContain("--status <csv>");
    expect(mineHelp).toContain(statusDescription);
    expect(mineHelp).toContain(jsonDescription);
  });

  it("localizes successful human output and preserves all JSON fields and values", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([INBOX_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([INBOX_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([INBOX_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([INBOX_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([MINE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([MINE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([MINE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([MINE_ISSUE]));

    await runCommand(inboxArgs(), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe(
      `Identificador=PC-17 ID=${ISSUE_ID} Status=in_progress Prioridade=high Título=Repair router ID do projeto=project-9`,
    );
    logSpy.mockClear();
    await runCommand(inboxArgs(), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe(
      `Identifier=PC-17 ID=${ISSUE_ID} Status=in_progress Priority=high Title=Repair router Project ID=project-9`,
    );
    logSpy.mockClear();
    await runCommand(inboxArgs("--json"), "pt-BR");
    const inboxPtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(inboxArgs("--json"), "en");
    const inboxEnJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(inboxPtJson).toBe(inboxEnJson);
    expect(JSON.parse(inboxPtJson)).toEqual([INBOX_ISSUE]);
    logSpy.mockClear();

    await runCommand(inboxMineArgs("--status", "todo,in_progress"), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe(
      `Identificador=PC-17 ID=${ISSUE_ID} Status=in_progress Prioridade=high Título=Repair router ID do projeto=project-9 assigneeUserId=user-4 description=Investigate the recurring disconnect createdAt=2026-10-30T12:34:56.000Z`,
    );
    logSpy.mockClear();
    await runCommand(inboxMineArgs("--status", "todo,in_progress"), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe(
      `Identifier=PC-17 ID=${ISSUE_ID} Status=in_progress Priority=high Title=Repair router Project ID=project-9 assigneeUserId=user-4 description=Investigate the recurring disconnect createdAt=2026-10-30T12:34:56.000Z`,
    );
    logSpy.mockClear();
    await runCommand(inboxMineArgs("--status", "todo,in_progress", "--json"), "pt-BR");
    const minePtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(inboxMineArgs("--status", "todo,in_progress", "--json"), "en");
    const mineEnJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(minePtJson).toBe(mineEnJson);
    expect(JSON.parse(minePtJson)).toEqual([MINE_ISSUE]);
    const requests = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(requests.slice(0, 4).map((url) => url.pathname)).toEqual(Array(4).fill("/api/agents/me/inbox-lite"));
    expect(requests.slice(4).map((url) => url.pathname)).toEqual(Array(4).fill("/api/agents/me/inbox/mine"));
    expect(requests.slice(4).map((url) => [url.searchParams.get("userId"), url.searchParams.get("status")])).toEqual(
      Array(4).fill([USER_ID, "todo,in_progress"]),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves preferred-field ordering and value rendering for nulls and objects", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([INBOX_EDGE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([INBOX_EDGE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([INBOX_EDGE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([INBOX_EDGE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([MINE_EDGE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([MINE_EDGE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([MINE_EDGE_ISSUE]))
      .mockResolvedValueOnce(jsonResponse([MINE_EDGE_ISSUE]));

    await runCommand(inboxArgs(), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe(
      `Identificador=[object] ID=${ISSUE_ID} Status=- Prioridade=[object] Título=-`,
    );
    logSpy.mockClear();
    await runCommand(inboxArgs(), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe(
      `Identifier=[object] ID=${ISSUE_ID} Status=- Priority=[object] Title=-`,
    );
    logSpy.mockClear();
    await runCommand(inboxArgs("--json"), "pt-BR");
    const inboxPtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(inboxArgs("--json"), "en");
    const inboxEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(inboxPtJson).toBe(inboxEnJson);
    expect(JSON.parse(inboxPtJson)).toEqual([INBOX_EDGE_ISSUE]);

    logSpy.mockClear();
    await runCommand(inboxMineArgs(), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe(
      "Identificador=- ID=[object] Nome=agent-name Status=blocked Prioridade=[object] Título=[object] action=[object] ID do projeto=project-edge",
    );
    logSpy.mockClear();
    await runCommand(inboxMineArgs(), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe(
      "Identifier=- ID=[object] Name=agent-name Status=blocked Priority=[object] Title=[object] action=[object] Project ID=project-edge",
    );
    logSpy.mockClear();
    await runCommand(inboxMineArgs("--json"), "pt-BR");
    const minePtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(inboxMineArgs("--json"), "en");
    const mineEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(minePtJson).toBe(mineEnJson);
    expect(JSON.parse(minePtJson)).toEqual([MINE_EDGE_ISSUE]);
  });

  it("localizes empty lists and emits the same empty JSON in both locales", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse([])));

    await runCommand(inboxArgs(), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(vazio)");
    logSpy.mockClear();
    await runCommand(inboxArgs(), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(empty)");
    logSpy.mockClear();
    await runCommand(inboxArgs("--json"), "pt-BR");
    const inboxPtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(inboxArgs("--json"), "en");
    const inboxEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(inboxPtJson).toBe(inboxEnJson);
    expect(JSON.parse(inboxPtJson)).toEqual([]);

    logSpy.mockClear();
    await runCommand(inboxMineArgs(), "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(vazio)");
    logSpy.mockClear();
    await runCommand(inboxMineArgs(), "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(empty)");
    logSpy.mockClear();
    await runCommand(inboxMineArgs("--json"), "pt-BR");
    const minePtJson = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(inboxMineArgs("--json"), "en");
    const mineEnJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(minePtJson).toBe(mineEnJson);
    expect(JSON.parse(minePtJson)).toEqual([]);
  });

  it("preserves external API details, status, and exit code on both commands", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ error: "Agent backend detail", details: { code: "AGENT_UNKNOWN" } }, 403)));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    await expect(runCommand(inboxArgs(), "pt-BR")).rejects.toThrow("exit:1");
    const ptInboxError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand(inboxArgs(), "en")).rejects.toThrow("exit:1");
    const enInboxError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand(inboxMineArgs(), "pt-BR")).rejects.toThrow("exit:1");
    const ptMineError = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand(inboxMineArgs(), "en")).rejects.toThrow("exit:1");
    const enMineError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(ptInboxError).toContain('Erro de API 403: Não foi possível concluir a solicitação. Detalhes: Agent backend detail details={"code":"AGENT_UNKNOWN"}');
    expect(enInboxError).toContain('API error 403: The request could not be completed. Details: Agent backend detail details={"code":"AGENT_UNKNOWN"}');
    expect(ptMineError).toBe(ptInboxError);
    expect(enMineError).toBe(enInboxError);
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
  });
});
