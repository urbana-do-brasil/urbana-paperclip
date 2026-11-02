import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerRunCommands } from "../commands/client/run.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const RUN_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const RUN_ROW = {
  id: RUN_ID,
  status: "succeeded",
  agentId: AGENT_ID,
  invocationSource: "on_demand",
  triggerDetail: "manual",
  startedAt: "2026-10-31T09:10:11.000Z",
  finishedAt: "2026-10-31T09:12:13.000Z",
  logBytes: 123,
  customCode: "KeepCase",
};

const LIVE_RUN_ROW = { ...RUN_ROW, status: "running", finishedAt: null };

const EVENT_ROW = {
  seq: 7,
  eventType: "provider.output",
  stream: "stdout",
  level: "info",
  message: "Provider output: Café, KeepCase",
};

const RUN_ISSUE_ROW = {
  identifier: "PC-42",
  id: "55555555-5555-4555-8555-555555555555",
  status: "in_progress",
  priority: "high",
  title: "Preserve Café and KeepCase",
  runStatus: "succeeded",
};

const WORKSPACE_OPERATION_ROW = {
  id: "66666666-6666-4666-8666-666666666666",
  status: "succeeded",
  phase: "workspace_provision",
  command: "pnpm test --filter KeepCase",
  cwd: "/workspace/KeepCase",
  logBytes: 42,
};

type RunOperation = "list" | "live" | "events";
type RunReadOperation = "get" | "cancel";
type RunSummaryOperation = "issues" | "workspace-operations";
type RunLogOperation = "log" | "workspace-log";

const WORKSPACE_OPERATION_ID = "66666666-6666-4666-8666-666666666666";
const RUN_LOG_RESPONSE = {
  offset: 2,
  limitBytes: 10,
  text: "Provider output: Café, KeepCase\n",
};
const WATCHDOG_EVALUATION_ISSUE_ID = "77777777-7777-4777-8777-777777777777";
const WATCHDOG_DECISION_RESPONSE = {
  id: "88888888-8888-4888-8888-888888888888",
  runId: RUN_ID,
  decision: "snooze",
  reason: "KeepCase follow-up",
  snoozedUntil: "2026-10-31T12:30:00.000Z",
  evaluationIssueId: WATCHDOG_EVALUATION_ISSUE_ID,
  customCode: "KeepCase",
};

function argsFor(operation: RunOperation, json = false): string[] {
  const args = operation === "list"
    ? ["run", "list", "--company-id", COMPANY_ID, "--agent-id", AGENT_ID, "--limit", "8"]
    : operation === "live"
      ? ["run", "live", "--company-id", COMPANY_ID, "--limit", "5", "--min-count", "4"]
      : ["run", "events", RUN_ID, "--after-seq", "3", "--limit", "6"];
  if (json) args.push("--json");
  return args;
}

function readArgsFor(operation: RunReadOperation, json = false): string[] {
  const args = ["run", operation, RUN_ID];
  if (json) args.push("--json");
  return args;
}

function summaryArgsFor(operation: RunSummaryOperation, json = false): string[] {
  const args = ["run", operation, RUN_ID];
  if (json) args.push("--json");
  return args;
}

function logArgsFor(operation: RunLogOperation, json = false, text = false): string[] {
  const args = operation === "log"
    ? ["run", "log", RUN_ID, "--offset", "2", "--limit-bytes", "10"]
    : ["run", "workspace-log", WORKSPACE_OPERATION_ID, "--offset", "2", "--limit-bytes", "10"];
  if (text) args.push("--text");
  if (json) args.push("--json");
  return args;
}

function watchdogDecisionArgsFor(json = false): string[] {
  const args = [
    "run",
    "watchdog-decision",
    RUN_ID,
    "--decision",
    "snooze",
    "--reason",
    "KeepCase follow-up",
    "--snoozed-until",
    WATCHDOG_DECISION_RESPONSE.snoozedUntil,
    "--evaluation-issue-id",
    WATCHDOG_EVALUATION_ISSUE_ID,
  ];
  if (json) args.push("--json");
  return args;
}

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  const run = program.command("run").description("Bootstrap local setup").action(() => undefined);
  registerRunCommands(run);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

describe("heartbeat run command localization", () => {
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

  async function runCommand(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      descriptions: [
        "Listar execuções de heartbeat de uma organização",
        "Listar execuções de heartbeat na fila ou em andamento de uma organização",
        "Listar eventos de uma execução de heartbeat",
      ],
      company: "ID da organização",
      agent: "Filtrar pelo ID do agente",
      limit: "Número máximo de execuções retornadas",
      minCount: "Completar com execuções recentes concluídas até esta quantidade",
      runId: "ID da execução de heartbeat",
      sequence: "Retornar somente eventos após esta sequência",
      eventLimit: "Número máximo de eventos retornados",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      descriptions: [
        "List heartbeat runs for a company",
        "List queued and running heartbeat runs for a company",
        "List heartbeat run events",
      ],
      company: "Company ID",
      agent: "Filter by agent ID",
      limit: "Maximum runs to return",
      minCount: "Pad with recent completed runs up to this count",
      runId: "Heartbeat run ID",
      sequence: "Only return events after this sequence",
      eventLimit: "Maximum events to return",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help without changing operation names or flags", ({ locale, descriptions, company, agent, limit, minCount, runId, sequence, eventLimit, json }) => {
    const program = makeProgram(locale);
    const run = program.commands.find((command) => command.name() === "run");
    const commands = ["list", "live", "events"].map((name) => run?.commands.find((command) => command.name() === name));
    expect(commands.map((command) => command?.description())).toEqual(descriptions);

    const listHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(listHelp).toContain("paperclipai run list [options]");
    expect(listHelp).toContain("-C, --company-id <id>");
    expect(listHelp).toContain(company);
    expect(listHelp).toContain("--agent-id <id>");
    expect(listHelp).toContain(agent);
    expect(listHelp).toContain("--limit <n>");
    expect(listHelp).toContain(limit);
    expect(listHelp).toContain(json);

    const liveHelp = commands[1]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(liveHelp).toContain("paperclipai run live [options]");
    expect(liveHelp).toContain("--min-count <n>");
    expect(liveHelp).toContain(minCount);

    const eventsHelp = commands[2]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(eventsHelp).toContain("paperclipai run events [options] <runId>");
    expect(eventsHelp).toContain(runId);
    expect(eventsHelp).toContain("--after-seq <n>");
    expect(eventsHelp).toContain(sequence);
    expect(eventsHelp).toContain(eventLimit);

    const get = run?.commands.find((command) => command.name() === "get");
    const cancel = run?.commands.find((command) => command.name() === "cancel");
    const getHelp = get?.helpInformation().replace(/\s+/g, " ") ?? "";
    const cancelHelp = cancel?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(get?.description()).toBe(locale === "en" ? "Get a heartbeat run" : "Consultar uma execução de heartbeat");
    expect(cancel?.description()).toBe(locale === "en"
      ? "Cancel a queued or running heartbeat run"
      : "Cancelar uma execução de heartbeat na fila ou em andamento");
    expect(getHelp).toContain("paperclipai run get [options] <runId>");
    expect(getHelp).toContain(runId);
    expect(getHelp).toContain(json);
    expect(cancelHelp).toContain("paperclipai run cancel [options] <runId>");
    expect(cancelHelp).toContain(runId);
    expect(cancelHelp).toContain(json);

    const issues = run?.commands.find((command) => command.name() === "issues");
    const workspaceOperations = run?.commands.find((command) => command.name() === "workspace-operations");
    const issuesHelp = issues?.helpInformation().replace(/\s+/g, " ") ?? "";
    const workspaceOperationsHelp = workspaceOperations?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(issues?.description()).toBe(locale === "en"
      ? "List issues associated with a heartbeat run"
      : "Listar tarefas associadas a uma execução de heartbeat");
    expect(workspaceOperations?.description()).toBe(locale === "en"
      ? "List workspace operations for a heartbeat run"
      : "Listar operações do espaço de trabalho de uma execução de heartbeat");
    expect(issuesHelp).toContain("paperclipai run issues [options] <runId>");
    expect(issuesHelp).toContain(runId);
    expect(issuesHelp).toContain(json);
    expect(workspaceOperationsHelp).toContain("paperclipai run workspace-operations [options] <runId>");
    expect(workspaceOperationsHelp).toContain(runId);
    expect(workspaceOperationsHelp).toContain(json);
  });

  it.each([
    {
      locale: "pt-BR",
      description: "Registrar uma decisão do watchdog para uma execução de heartbeat",
      runId: "ID da execução de heartbeat",
      decision: "snooze, continue ou dismissed_false_positive",
      reason: "Motivo da decisão",
      snoozedUntil: "Obrigatório para decisões snooze",
      evaluationIssueId: "ID da tarefa de avaliação do watchdog relacionada",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      description: "Record a watchdog decision for a heartbeat run",
      runId: "Heartbeat run ID",
      decision: "snooze, continue, or dismissed_false_positive",
      reason: "Decision reason",
      snoozedUntil: "Required for snooze decisions",
      evaluationIssueId: "Related watchdog evaluation issue ID",
      json: "Output raw JSON",
    },
  ] as const)("localizes run watchdog decision help in $locale without translating accepted values", ({
    locale,
    description,
    runId,
    decision,
    reason,
    snoozedUntil,
    evaluationIssueId,
    json,
  }) => {
    const program = makeProgram(locale);
    const run = program.commands.find((command) => command.name() === "run");
    const watchdogDecision = run?.commands.find((command) => command.name() === "watchdog-decision");
    const help = watchdogDecision?.helpInformation().replace(/\s+/g, " ") ?? "";

    expect(watchdogDecision?.description()).toBe(description);
    expect(help).toContain("paperclipai run watchdog-decision [options] <runId>");
    expect(help).toContain(runId);
    expect(help).toContain("--decision <decision>");
    expect(help).toContain(decision);
    expect(help).toContain("--reason <text>");
    expect(help).toContain(reason);
    expect(help).toContain("--snoozed-until <iso8601>");
    expect(help).toContain(snoozedUntil);
    expect(help).toContain("--evaluation-issue-id <id>");
    expect(help).toContain(evaluationIssueId);
    expect(help).toContain(json);
  });

  it.each([
    {
      locale: "pt-BR",
      runDescription: "Ler bytes do log de uma execução de heartbeat",
      operationDescription: "Ler o log de uma operação do espaço de trabalho",
      runId: "ID da execução de heartbeat",
      operationId: "ID da operação do espaço de trabalho",
      offset: "Deslocamento em bytes",
      limit: "Número máximo de bytes para leitura",
      text: "Exibir somente o texto do log quando a API retornar um campo text",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      runDescription: "Read heartbeat run log bytes",
      operationDescription: "Read a workspace operation log",
      runId: "Heartbeat run ID",
      operationId: "Workspace operation ID",
      offset: "Byte offset",
      limit: "Maximum bytes to read",
      text: "Print only the log text when the API returns a text field",
      json: "Output raw JSON",
    },
  ] as const)("localizes run log help in $locale without changing command names or flags", ({
    locale,
    runDescription,
    operationDescription,
    runId,
    operationId,
    offset,
    limit,
    text,
    json,
  }) => {
    const program = makeProgram(locale);
    const run = program.commands.find((command) => command.name() === "run");
    const log = run?.commands.find((command) => command.name() === "log");
    const workspaceLog = run?.commands.find((command) => command.name() === "workspace-log");
    const logHelp = log?.helpInformation().replace(/\s+/g, " ") ?? "";
    const workspaceLogHelp = workspaceLog?.helpInformation().replace(/\s+/g, " ") ?? "";

    expect(log?.description()).toBe(runDescription);
    expect(logHelp).toContain("paperclipai run log [options] <runId>");
    expect(logHelp).toContain(runId);
    expect(logHelp).toContain("--offset <bytes>");
    expect(logHelp).toContain(offset);
    expect(logHelp).toContain("--limit-bytes <bytes>");
    expect(logHelp).toContain(limit);
    expect(logHelp).toContain("--text");
    expect(logHelp).toContain(text);
    expect(logHelp).toContain(json);

    expect(workspaceLog?.description()).toBe(operationDescription);
    expect(workspaceLogHelp).toContain("paperclipai run workspace-log [options] <operationId>");
    expect(workspaceLogHelp).toContain(operationId);
    expect(workspaceLogHelp).toContain("--offset <bytes>");
    expect(workspaceLogHelp).toContain(offset);
    expect(workspaceLogHelp).toContain("--limit-bytes <bytes>");
    expect(workspaceLogHelp).toContain(limit);
    expect(workspaceLogHelp).toContain("--text");
    expect(workspaceLogHelp).toContain(text);
    expect(workspaceLogHelp).toContain(json);
  });

  it("localizes human labels while leaving run values and event messages unchanged", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([RUN_ROW]));
      await runCommand(argsFor("list"), locale);
      expect(outputLines(stdoutSpy)).toEqual([locale === "en"
        ? `ID=${RUN_ID} Status=succeeded Agent ID=${AGENT_ID} Invocation source=on_demand Trigger detail=manual Started at=${RUN_ROW.startedAt} Finished at=${RUN_ROW.finishedAt} Log bytes=123`
        : `ID=${RUN_ID} Status=succeeded ID do agente=${AGENT_ID} Origem da invocação=on_demand Detalhe do acionador=manual Iniciado em=${RUN_ROW.startedAt} Concluído em=${RUN_ROW.finishedAt} Bytes de log=123`]);
      expect(stderrSpy).not.toHaveBeenCalled();
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([LIVE_RUN_ROW]));
      await runCommand(argsFor("live"), locale);
      expect(outputLines(stdoutSpy)).toHaveLength(1);
      expect(String(stdoutSpy.mock.calls[0]?.[0])).toContain(`ID=${RUN_ID}`);
      expect(stderrSpy).not.toHaveBeenCalled();
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([EVENT_ROW]));
      await runCommand(argsFor("events"), locale);
      expect(outputLines(stdoutSpy)).toEqual([locale === "en"
        ? "Sequence=7 Event type=provider.output Stream=stdout Level=info Message=Provider output: Café, KeepCase"
        : "Sequência=7 Tipo do evento=provider.output Fluxo=stdout Nível=info Mensagem=Provider output: Café, KeepCase"]);
      expect(stderrSpy).not.toHaveBeenCalled();
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await runCommand(argsFor("list"), locale);
      expect(outputLines(stdoutSpy)).toEqual([locale === "en" ? "(empty)" : "(vazio)"]);
      stdoutSpy.mockClear();
    }

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      ...["pt-BR", "en"].flatMap(() => [
        `http://paperclip.test/api/companies/${COMPANY_ID}/heartbeat-runs?agentId=${AGENT_ID}&limit=8`,
        `http://paperclip.test/api/companies/${COMPANY_ID}/live-runs?limit=5&minCount=4`,
        `http://paperclip.test/api/heartbeat-runs/${RUN_ID}/events?afterSeq=3&limit=6`,
        `http://paperclip.test/api/companies/${COMPANY_ID}/heartbeat-runs?agentId=${AGENT_ID}&limit=8`,
      ]),
    ]);
  });

  it("keeps JSON stdout byte-for-byte equivalent across locales and preserves request routes", async () => {
    const responses: Record<RunOperation, unknown> = {
      list: [RUN_ROW],
      live: [LIVE_RUN_ROW],
      events: [EVENT_ROW],
    };
    const outputs: Record<RunOperation, string[]> = { list: [], live: [], events: [] };

    for (const operation of ["list", "live", "events"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(responses[operation]));
        await runCommand(argsFor(operation, true), locale);
        const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
        outputs[operation].push(output);
        expect(JSON.parse(output)).toEqual(responses[operation]);
        expect(stderrSpy).not.toHaveBeenCalled();
        stdoutSpy.mockClear();
      }
    }

    for (const operation of ["list", "live", "events"] as const) {
      expect(outputs[operation][1]).toBe(outputs[operation][0]);
    }
    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), (init as RequestInit | undefined)?.method ?? "GET"])).toEqual([
      ...["list", "live", "events"].flatMap((operation) => ["pt-BR", "en"].map(() => [
        operation === "list"
          ? `http://paperclip.test/api/companies/${COMPANY_ID}/heartbeat-runs?agentId=${AGENT_ID}&limit=8`
          : operation === "live"
            ? `http://paperclip.test/api/companies/${COMPANY_ID}/live-runs?limit=5&minCount=4`
            : `http://paperclip.test/api/heartbeat-runs/${RUN_ID}/events?afterSeq=3&limit=6`,
        "GET",
      ])),
    ]);
  });

  it("preserves get/cancel JSON responses, methods, and API routes in both locales", async () => {
    const responses: Record<RunReadOperation, unknown> = {
      get: { ...RUN_ROW, companyId: COMPANY_ID, outputPreview: "KeepCase" },
      cancel: { ...RUN_ROW, companyId: COMPANY_ID, status: "cancelled", cancelReason: "operator request" },
    };
    const outputs: Record<RunReadOperation, string[]> = { get: [], cancel: [] };

    for (const operation of ["get", "cancel"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(responses[operation]));
        await runCommand(readArgsFor(operation, true), locale);
        const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
        outputs[operation].push(output);
        expect(JSON.parse(output)).toEqual(responses[operation]);
        expect(stderrSpy).not.toHaveBeenCalled();
        stdoutSpy.mockClear();
      }
    }

    for (const operation of ["get", "cancel"] as const) {
      expect(outputs[operation][1]).toBe(outputs[operation][0]);
    }
    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), (init as RequestInit | undefined)?.method ?? "GET", (init as RequestInit | undefined)?.body])).toEqual([
      ...["get", "cancel"].flatMap((operation) => ["pt-BR", "en"].map(() => [
        `http://paperclip.test/api/heartbeat-runs/${RUN_ID}${operation === "cancel" ? "/cancel" : ""}`,
        operation === "cancel" ? "POST" : "GET",
        operation === "cancel" ? "{}" : undefined,
      ])),
    ]);
  });

  it("localizes issue and workspace operation summaries while preserving values and routes", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([RUN_ISSUE_ROW]));
      await runCommand(summaryArgsFor("issues"), locale);
      expect(outputLines(stdoutSpy)).toEqual([locale === "en"
        ? "Identifier=PC-42 ID=55555555-5555-4555-8555-555555555555 Status=in_progress Priority=high Title=Preserve Café and KeepCase Run status=succeeded"
        : "Identificador=PC-42 ID=55555555-5555-4555-8555-555555555555 Status=in_progress Prioridade=high Título=Preserve Café and KeepCase Status da execução=succeeded"]);
      expect(stderrSpy).not.toHaveBeenCalled();
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([WORKSPACE_OPERATION_ROW]));
      await runCommand(summaryArgsFor("workspace-operations"), locale);
      expect(outputLines(stdoutSpy)).toEqual([locale === "en"
        ? "ID=66666666-6666-4666-8666-666666666666 Status=succeeded Phase=workspace_provision Command=pnpm test --filter KeepCase Working directory=/workspace/KeepCase Log bytes=42"
        : "ID=66666666-6666-4666-8666-666666666666 Status=succeeded Fase=workspace_provision Comando=pnpm test --filter KeepCase Diretório de trabalho=/workspace/KeepCase Bytes de log=42"]);
      expect(stderrSpy).not.toHaveBeenCalled();
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await runCommand(summaryArgsFor("issues"), locale);
      expect(outputLines(stdoutSpy)).toEqual([locale === "en" ? "(empty)" : "(vazio)"]);
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await runCommand(summaryArgsFor("workspace-operations"), locale);
      expect(outputLines(stdoutSpy)).toEqual([locale === "en" ? "(empty)" : "(vazio)"]);
      stdoutSpy.mockClear();
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), (init as RequestInit | undefined)?.method ?? "GET"])).toEqual([
      ...["pt-BR", "en"].flatMap(() => [
        [`http://paperclip.test/api/heartbeat-runs/${RUN_ID}/issues`, "GET"],
        [`http://paperclip.test/api/heartbeat-runs/${RUN_ID}/workspace-operations`, "GET"],
        [`http://paperclip.test/api/heartbeat-runs/${RUN_ID}/issues`, "GET"],
        [`http://paperclip.test/api/heartbeat-runs/${RUN_ID}/workspace-operations`, "GET"],
      ]),
    ]);
  });

  it("keeps issue and workspace operation JSON byte-equivalent across locales", async () => {
    const responses: Record<RunSummaryOperation, unknown> = {
      issues: [RUN_ISSUE_ROW],
      "workspace-operations": [WORKSPACE_OPERATION_ROW],
    };
    const outputs: Record<RunSummaryOperation, string[]> = { issues: [], "workspace-operations": [] };

    for (const operation of ["issues", "workspace-operations"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(responses[operation]));
        await runCommand(summaryArgsFor(operation, true), locale);
        const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
        outputs[operation].push(output);
        expect(JSON.parse(output)).toEqual(responses[operation]);
        expect(stderrSpy).not.toHaveBeenCalled();
        stdoutSpy.mockClear();
      }
    }

    for (const operation of ["issues", "workspace-operations"] as const) {
      expect(outputs[operation][1]).toBe(outputs[operation][0]);
    }
    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), (init as RequestInit | undefined)?.method ?? "GET"])).toEqual([
      ...["issues", "workspace-operations"].flatMap((operation) => ["pt-BR", "en"].map(() => [
        `http://paperclip.test/api/heartbeat-runs/${RUN_ID}/${operation}`,
        "GET",
      ])),
    ]);
  });

  it("keeps issue and workspace operation API errors structured across locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Run summary unavailable/KeepCase",
      details: { code: "RUN_ACCESS_DENIED", runId: RUN_ID },
    };
    const errors: string[] = [];

    for (const operation of ["issues", "workspace-operations"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
        await expect(runCommand(summaryArgsFor(operation, true), locale)).rejects.toThrow("exit:1");
        expect(stdoutSpy).not.toHaveBeenCalled();
        const error = String(stderrSpy.mock.calls.at(-1)?.[0]);
        errors.push(error);
        expect(error).toContain("API error 403: Run summary unavailable/KeepCase");
        expect(error).toContain(`details={"code":"RUN_ACCESS_DENIED","runId":"${RUN_ID}"}`);
        stderrSpy.mockClear();
      }
    }

    for (let index = 0; index < errors.length; index += 2) {
      expect(errors[index + 1]).toBe(errors[index]);
    }
    expect(exitSpy).toHaveBeenCalledTimes(4);
  });

  it("prints API log text unchanged in both locales and preserves byte-range requests", async () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((() => true) as never);

    for (const operation of ["log", "workspace-log"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(RUN_LOG_RESPONSE));
        await runCommand(logArgsFor(operation, false, true), locale);
        expect(writeSpy.mock.calls.at(-1)?.[0]).toBe(RUN_LOG_RESPONSE.text);
        expect(stdoutSpy).not.toHaveBeenCalled();
        expect(stderrSpy).not.toHaveBeenCalled();
      }
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), (init as RequestInit | undefined)?.method ?? "GET"])).toEqual([
      ...["log", "workspace-log"].flatMap((operation) => ["pt-BR", "en"].map(() => [
        operation === "log"
          ? `http://paperclip.test/api/heartbeat-runs/${RUN_ID}/log?offset=2&limitBytes=10`
          : `http://paperclip.test/api/workspace-operations/${WORKSPACE_OPERATION_ID}/log?offset=2&limitBytes=10`,
        "GET",
      ])),
    ]);
  });

  it("keeps run and workspace log JSON byte-equivalent across locales", async () => {
    const outputs: Record<RunLogOperation, string[]> = { log: [], "workspace-log": [] };

    for (const operation of ["log", "workspace-log"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(RUN_LOG_RESPONSE));
        await runCommand(logArgsFor(operation, true), locale);
        const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
        outputs[operation].push(output);
        expect(JSON.parse(output)).toEqual(RUN_LOG_RESPONSE);
        expect(stderrSpy).not.toHaveBeenCalled();
        stdoutSpy.mockClear();
      }
    }

    for (const operation of ["log", "workspace-log"] as const) {
      expect(outputs[operation][1]).toBe(outputs[operation][0]);
    }
    expect(fetchMock.mock.calls.map(([url, init]) => [String(url), (init as RequestInit | undefined)?.method ?? "GET"])).toEqual([
      ...["log", "workspace-log"].flatMap((operation) => ["pt-BR", "en"].map(() => [
        operation === "log"
          ? `http://paperclip.test/api/heartbeat-runs/${RUN_ID}/log?offset=2&limitBytes=10`
          : `http://paperclip.test/api/workspace-operations/${WORKSPACE_OPERATION_ID}/log?offset=2&limitBytes=10`,
        "GET",
      ])),
    ]);
  });

  it("keeps run and workspace log API failures structured across locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Run log unavailable/KeepCase",
      details: { code: "RUN_LOG_ACCESS_DENIED", runId: RUN_ID },
    };
    const errors: string[] = [];

    for (const operation of ["log", "workspace-log"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
        await expect(runCommand(logArgsFor(operation, true), locale)).rejects.toThrow("exit:1");
        expect(stdoutSpy).not.toHaveBeenCalled();
        const error = String(stderrSpy.mock.calls.at(-1)?.[0]);
        errors.push(error);
        expect(error).toContain("API error 403: Run log unavailable/KeepCase");
        expect(error).toContain(`details={"code":"RUN_LOG_ACCESS_DENIED","runId":"${RUN_ID}"}`);
        stderrSpy.mockClear();
      }
    }

    for (let index = 0; index < errors.length; index += 2) {
      expect(errors[index + 1]).toBe(errors[index]);
    }
    expect(exitSpy).toHaveBeenCalledTimes(4);
  });

  it("preserves watchdog decision JSON, payload, route, and method across locales", async () => {
    const outputs: string[] = [];
    const expectedPayload = {
      decision: "snooze",
      reason: "KeepCase follow-up",
      snoozedUntil: WATCHDOG_DECISION_RESPONSE.snoozedUntil,
      evaluationIssueId: WATCHDOG_EVALUATION_ISSUE_ID,
    };

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(WATCHDOG_DECISION_RESPONSE));
      await runCommand(watchdogDecisionArgsFor(true), locale);
      const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
      outputs.push(output);
      expect(JSON.parse(output)).toEqual(WATCHDOG_DECISION_RESPONSE);
      expect(stderrSpy).not.toHaveBeenCalled();
      stdoutSpy.mockClear();
    }

    expect(outputs[1]).toBe(outputs[0]);
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual(["pt-BR", "en"].map(() => [
      `http://paperclip.test/api/heartbeat-runs/${RUN_ID}/watchdog-decisions`,
      "POST",
      JSON.stringify(expectedPayload),
    ]));
  });

  it("keeps watchdog decision API failures structured across locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Watchdog decision rejected/KeepCase",
      details: { code: "WATCHDOG_DECISION_INVALID", runId: RUN_ID },
    };
    const errors: string[] = [];

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 422));
      await expect(runCommand(watchdogDecisionArgsFor(true), locale)).rejects.toThrow("exit:1");
      expect(stdoutSpy).not.toHaveBeenCalled();
      const error = String(stderrSpy.mock.calls.at(-1)?.[0]);
      errors.push(error);
      expect(error).toContain("API error 422: Watchdog decision rejected/KeepCase");
      expect(error).toContain(`details={"code":"WATCHDOG_DECISION_INVALID","runId":"${RUN_ID}"}`);
      stderrSpy.mockClear();
    }

    expect(errors[1]).toBe(errors[0]);
    expect(exitSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps failures on stderr with stable status, details, and exit code in both locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Run backend failure/KeepCase",
      details: { code: "RUN_ACCESS_DENIED", runId: RUN_ID },
    };
    const errors: string[] = [];

    for (const operation of ["list", "live", "events"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
        await expect(runCommand(argsFor(operation, true), locale)).rejects.toThrow("exit:1");
        expect(stdoutSpy).not.toHaveBeenCalled();
        const error = String(stderrSpy.mock.calls.at(-1)?.[0]);
        errors.push(error);
        expect(error).toContain("API error 403: Run backend failure/KeepCase");
        expect(error).toContain(`details={"code":"RUN_ACCESS_DENIED","runId":"${RUN_ID}"}`);
        stderrSpy.mockClear();
      }
    }

    for (let index = 0; index < errors.length; index += 2) {
      expect(errors[index + 1]).toBe(errors[index]);
    }
    expect(exitSpy).toHaveBeenCalledTimes(6);
  });

  it("keeps get/cancel API failures structured and identical across locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Run backend failure/KeepCase",
      details: { code: "RUN_ACCESS_DENIED", runId: RUN_ID },
    };
    const errors: string[] = [];

    for (const operation of ["get", "cancel"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
        await expect(runCommand(readArgsFor(operation, true), locale)).rejects.toThrow("exit:1");
        expect(stdoutSpy).not.toHaveBeenCalled();
        const error = String(stderrSpy.mock.calls.at(-1)?.[0]);
        errors.push(error);
        expect(error).toContain("API error 403: Run backend failure/KeepCase");
        expect(error).toContain(`details={"code":"RUN_ACCESS_DENIED","runId":"${RUN_ID}"}`);
        stderrSpy.mockClear();
      }
    }

    for (let index = 0; index < errors.length; index += 2) {
      expect(errors[index + 1]).toBe(errors[index]);
    }
    expect(exitSpy).toHaveBeenCalledTimes(4);
  });

  it("localizes human API error framing on stderr while retaining provider details", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Run backend failure/KeepCase",
      details: { code: "RUN_ACCESS_DENIED", runId: RUN_ID },
    };

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
      await expect(runCommand(argsFor("events"), locale)).rejects.toThrow("exit:1");
      expect(stdoutSpy).not.toHaveBeenCalled();
      const error = String(stderrSpy.mock.calls.at(-1)?.[0]);
      expect(error).toContain(locale === "en" ? "API error 403:" : "Erro de API 403:");
      expect(error).toContain("Run backend failure/KeepCase");
      expect(error).toContain(`details={"code":"RUN_ACCESS_DENIED","runId":"${RUN_ID}"}`);
      stderrSpy.mockClear();
    }

    expect(exitSpy).toHaveBeenCalledTimes(2);
  });
});
