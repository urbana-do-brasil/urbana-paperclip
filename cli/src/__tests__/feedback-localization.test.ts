import { Command } from "commander";
import type { FeedbackTrace } from "@paperclipai/shared";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerFeedbackCommands, renderFeedbackReport, summarizeFeedbackTraces } from "../commands/client/feedback.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const TRACE: FeedbackTrace = {
  id: "trace-12345678",
  companyId: COMPANY_ID,
  feedbackVoteId: "vote-12345678",
  issueId: "issue-123",
  projectId: "project-123",
  issueIdentifier: "PAP-123",
  issueTitle: "Fix the Feedback Report",
  authorUserId: "user-123",
  targetType: "issue_comment",
  targetId: "comment-123",
  vote: "down",
  status: "local_only",
  destination: "paperclip_feedback_v1",
  exportId: null,
  consentVersion: "feedback-data-sharing-v1",
  schemaVersion: "1",
  bundleVersion: "1",
  payloadVersion: "1",
  payloadDigest: null,
  payloadSnapshot: { vote: { value: "down", reason: "Keep this provider text" } },
  targetSummary: {
    label: "Comment",
    excerpt: "Keep this excerpt as submitted.",
    authorAgentId: "agent-123",
    authorUserId: null,
    createdAt: new Date("2026-03-31T12:00:00.000Z"),
    documentKey: null,
    documentTitle: null,
    revisionNumber: null,
  },
  redactionSummary: null,
  attemptCount: 0,
  lastAttemptedAt: null,
  exportedAt: null,
  failureReason: null,
  createdAt: new Date("2026-03-31T12:01:00.000Z"),
  updatedAt: new Date("2026-03-31T12:02:00.000Z"),
};

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerFeedbackCommands(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("feedback report CLI localization", () => {
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
    const commandArgs = [
      ...args,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
    ];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      description: "Gerar um relatório de traces de feedback no terminal",
      company: "ID da organização (substitui o padrão do contexto)",
      payloads: "Incluir dumps dos payloads brutos no relatório do terminal",
    },
    {
      locale: "en",
      description: "Render a terminal report for company feedback traces",
      company: "Company ID (overrides context default)",
      payloads: "Include raw payload dumps in the terminal report",
    },
  ] as const)("localizes $locale help while retaining command names and flags", ({ locale, description, company, payloads }) => {
    const program = makeProgram(locale);
    const feedback = program.commands.find((command) => command.name() === "feedback");
    const report = feedback?.commands.find((command) => command.name() === "report");
    const help = report?.helpInformation().replace(/\s+/g, " ") ?? "";

    expect(report?.description()).toBe(description);
    expect(help).toContain("paperclipai feedback report [options]");
    expect(help).toContain("--company-id <id>");
    expect(help).toContain(company);
    expect(help).toContain("--target-type <type>");
    expect(help).toContain("--payloads");
    expect(help).toContain(payloads);
  });

  it.each([
    {
      locale: "pt-BR",
      expected: ["Relatório de feedback do Paperclip", "Resumo", "votos negativos", "Status de exportação:", "Detalhes dos traces", "Rastro:", "Data:", "Alvo:", "Trecho:", "Motivo:", "Payloads brutos", "Traces exibidos: 1"],
    },
    {
      locale: "en",
      expected: ["Paperclip Feedback Report", "Summary", "negative votes", "Export status:", "Trace Details", "Trace:", "Date:", "Target:", "Excerpt:", "Reason:", "Raw Payloads", "Traces displayed: 1"],
    },
  ] as const)("renders human output in $locale and preserves server data", async ({ locale, expected }) => {
    fetchMock.mockResolvedValueOnce(jsonResponse([TRACE]));
    await run(["feedback", "report", "--company-id", COMPANY_ID, "--payloads"], locale);

    const output = String(logSpy.mock.calls[0]?.[0]);
    for (const label of expected) expect(output).toContain(label);
    expect(output).toContain("PAP-123");
    expect(output).toContain("Fix the Feedback Report");
    expect(output).toContain("local_only");
    expect(output).toContain("Keep this excerpt as submitted.");
    expect(output).toContain("Keep this provider text");
    expect(output).toContain("http://paperclip.test");
    expect(errorSpy).not.toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://paperclip.test/api/companies/${COMPANY_ID}/feedback-traces?includePayload=true`);
    expect(init.method).toBe("GET");
  });

  it.each([
    { locale: "pt-BR", expected: "Nenhum trace de feedback encontrado." },
    { locale: "en", expected: "No feedback traces found." },
  ] as const)("localizes the empty report in $locale", ({ locale, expected }) => {
    const report = renderFeedbackReport({
      apiBase: "http://paperclip.test",
      companyId: COMPANY_ID,
      traces: [],
      summary: summarizeFeedbackTraces([]),
      includePayloads: false,
      locale,
    });
    expect(report).toContain(expected);
  });

  it("keeps JSON bytes and the response contract equivalent across locales", async () => {
    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([TRACE]));
      logSpy.mockClear();
      await run(["feedback", "report", "--company-id", COMPANY_ID, "--json"], locale);
      outputs.push(String(logSpy.mock.calls[0]?.[0]));
    }

    expect(outputs[0]).toBe(outputs[1]);
    expect(JSON.parse(outputs[0]!)).toEqual({
      apiBase: "http://paperclip.test",
      companyId: COMPANY_ID,
      summary: {
        total: 1,
        thumbsUp: 0,
        thumbsDown: 1,
        withReason: 1,
        statuses: { local_only: 1 },
      },
      traces: JSON.parse(JSON.stringify([TRACE])),
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes a missing-company failure and keeps JSON-mode stderr stable", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("test process exit");
    }) as typeof process.exit);
    const humanErrors: string[] = [];

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await expect(run(["feedback", "report"], locale)).rejects.toThrow("test process exit");
      humanErrors.push(String(errorSpy.mock.calls.at(-1)?.[0] ?? ""));
      errorSpy.mockClear();
    }
    expect(humanErrors[0]).toContain("ID da organização obrigatório");
    expect(humanErrors[1]).toContain("Company ID is required");

    const jsonErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await expect(run(["feedback", "report", "--json"], locale)).rejects.toThrow("test process exit");
      jsonErrors.push(String(errorSpy.mock.calls.at(-1)?.[0] ?? ""));
      errorSpy.mockClear();
    }
    expect(jsonErrors[0]).toContain("Company ID is required");
    expect(jsonErrors[0]).toBe(jsonErrors[1]);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
