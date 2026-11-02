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

type RunOperation = "list" | "live" | "events";

function argsFor(operation: RunOperation, json = false): string[] {
  const args = operation === "list"
    ? ["run", "list", "--company-id", COMPANY_ID, "--agent-id", AGENT_ID, "--limit", "8"]
    : operation === "live"
      ? ["run", "live", "--company-id", COMPANY_ID, "--limit", "5", "--min-count", "4"]
      : ["run", "events", RUN_ID, "--after-seq", "3", "--limit", "6"];
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
