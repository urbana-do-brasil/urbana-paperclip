import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerApprovalCommands } from "../commands/client/approval.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const APPROVAL_ID = "44444444-4444-4444-8444-444444444444";
const ISSUE_ID = "55555555-5555-4555-8555-555555555555";
const SECOND_ISSUE_ID = "66666666-6666-4666-8666-666666666666";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const CREATE_PAYLOAD = {
  type: "hire_agent",
  payload: { name: "Research lead", adapterType: "codex_local", note: "café" },
  requestedByAgentId: AGENT_ID,
  issueIds: [ISSUE_ID, SECOND_ISSUE_ID],
};

const APPROVAL_ROW = {
  id: APPROVAL_ID,
  companyId: COMPANY_ID,
  type: "hire_agent",
  status: "pending",
  requestedByAgentId: AGENT_ID,
  requestedByUserId: USER_ID,
  payload: { title: "Keep exact payload" },
  customCode: "KeepCase",
};

const DECISION_RESPONSE = { ...APPROVAL_ROW, status: "approved", decisionNote: "Looks good" };
const REVISION_RESPONSE = { ...APPROVAL_ROW, status: "revision_requested", decisionNote: "Add details" };
const RESUBMIT_RESPONSE = { ...APPROVAL_ROW, status: "pending", payload: { title: "Revised payload" } };
const COMMENT_RESPONSE = { id: "77777777-7777-4777-8777-777777777777", approvalId: APPROVAL_ID, body: "The evidence is ready.", customCode: "KeepCase" };

type Operation = {
  name: "list" | "get" | "create" | "approve" | "reject" | "request-revision" | "resubmit" | "comment";
  args: string[];
  method: string;
  path: string;
  body: unknown;
  response: unknown;
};

function operations(): Operation[] {
  return [
    {
      name: "list",
      args: ["approval", "list", "--company-id", COMPANY_ID, "--status", "pending"],
      method: "GET",
      path: `/api/companies/${COMPANY_ID}/approvals?status=pending`,
      body: undefined,
      response: [APPROVAL_ROW],
    },
    {
      name: "get",
      args: ["approval", "get", APPROVAL_ID],
      method: "GET",
      path: `/api/approvals/${APPROVAL_ID}`,
      body: undefined,
      response: APPROVAL_ROW,
    },
    {
      name: "create",
      args: [
        "approval", "create", "--company-id", COMPANY_ID,
        "--type", CREATE_PAYLOAD.type,
        "--payload", JSON.stringify(CREATE_PAYLOAD.payload),
        "--requested-by-agent-id", AGENT_ID,
        "--issue-ids", `${ISSUE_ID},${SECOND_ISSUE_ID}`,
      ],
      method: "POST",
      path: `/api/companies/${COMPANY_ID}/approvals`,
      body: CREATE_PAYLOAD,
      response: { ...APPROVAL_ROW, ...CREATE_PAYLOAD, status: "pending", createdBy: "server" },
    },
    {
      name: "approve",
      args: ["approval", "approve", APPROVAL_ID, "--decision-note", "Looks good"],
      method: "POST",
      path: `/api/approvals/${APPROVAL_ID}/approve`,
      body: { decisionNote: "Looks good" },
      response: DECISION_RESPONSE,
    },
    {
      name: "reject",
      args: ["approval", "reject", APPROVAL_ID, "--decision-note", "Needs more evidence"],
      method: "POST",
      path: `/api/approvals/${APPROVAL_ID}/reject`,
      body: { decisionNote: "Needs more evidence" },
      response: { ...APPROVAL_ROW, status: "rejected", decisionNote: "Needs more evidence" },
    },
    {
      name: "request-revision",
      args: ["approval", "request-revision", APPROVAL_ID, "--decision-note", "Add details"],
      method: "POST",
      path: `/api/approvals/${APPROVAL_ID}/request-revision`,
      body: { decisionNote: "Add details" },
      response: REVISION_RESPONSE,
    },
    {
      name: "resubmit",
      args: ["approval", "resubmit", APPROVAL_ID, "--payload", JSON.stringify({ title: "Revised payload" })],
      method: "POST",
      path: `/api/approvals/${APPROVAL_ID}/resubmit`,
      body: { payload: { title: "Revised payload" } },
      response: RESUBMIT_RESPONSE,
    },
    {
      name: "comment",
      args: ["approval", "comment", APPROVAL_ID, "--body", "The evidence is ready."],
      method: "POST",
      path: `/api/approvals/${APPROVAL_ID}/comments`,
      body: { body: "The evidence is ready." },
      response: COMMENT_RESPONSE,
    },
  ];
}

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerApprovalCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

function expectedApprovalListLine(locale: SupportedLocale): string {
  const labels = locale === "en"
    ? ["ID", "Status", "Type", "Requested by agent ID", "Requested by user ID"]
    : ["ID", "Status", "Tipo", "Solicitado pelo ID do agente", "Solicitado pelo ID do usuário"];
  return [
    `${labels[0]}=${APPROVAL_ID}`,
    `${labels[1]}=pending`,
    `${labels[2]}=hire_agent`,
    `${labels[3]}=${AGENT_ID}`,
    `${labels[4]}=${USER_ID}`,
  ].join(" ");
}

describe("approval command family localization", () => {
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

  it.each([
    {
      locale: "pt-BR",
      group: "Operações de aprovação",
      descriptions: ["Listar aprovações de uma organização", "Consultar uma aprovação", "Criar uma solicitação de aprovação", "Aprovar uma solicitação de aprovação", "Rejeitar uma solicitação de aprovação", "Solicitar revisão de uma aprovação", "Reenviar uma aprovação (opcionalmente com um novo payload)", "Adicionar comentário a uma aprovação"],
      company: "ID da organização",
      status: "Filtro de status",
      approvalId: "ID da aprovação",
      type: "Tipo de aprovação (hire_agent|approve_ceo_strategy)",
      payload: "Payload da aprovação como objeto JSON",
      requester: "ID do agente solicitante",
      issueIds: "IDs das tarefas vinculadas, separados por vírgulas",
      note: "Nota da decisão",
      actor: "ID do usuário responsável pela decisão",
      resubmitPayload: "Payload como objeto JSON",
      body: "Conteúdo do comentário",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      group: "Approval operations",
      descriptions: ["List approvals for a company", "Get one approval", "Create an approval request", "Approve an approval request", "Reject an approval request", "Request revision for an approval", "Resubmit an approval (optionally with new payload)", "Add comment to an approval"],
      company: "Company ID",
      status: "Status filter",
      approvalId: "Approval ID",
      type: "Approval type (hire_agent|approve_ceo_strategy)",
      payload: "Approval payload as JSON object",
      requester: "Requesting agent ID",
      issueIds: "Comma-separated linked issue IDs",
      note: "Decision note",
      actor: "Decision actor user ID",
      resubmitPayload: "Payload JSON object",
      body: "Comment body",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale group and operation help while preserving flags", ({ locale, group, descriptions, company, status, approvalId, type, payload, requester, issueIds, note, actor, resubmitPayload, body, json }) => {
    const program = makeProgram(locale);
    const approval = program.commands.find((command) => command.name() === "approval");
    expect(approval?.description()).toBe(group);
    const names = ["list", "get", "create", "approve", "reject", "request-revision", "resubmit", "comment"];
    const commands = names.map((name) => approval?.commands.find((candidate) => candidate.name() === name));
    commands.forEach((command, index) => expect(command?.description()).toBe(descriptions[index]));

    const listHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(listHelp).toContain("-C, --company-id <id>");
    expect(listHelp).toContain(company);
    expect(listHelp).toContain("--status <status>");
    expect(listHelp).toContain(status);
    expect(listHelp).toContain("--json");
    expect(listHelp).toContain(json);

    for (const index of [1, 3, 4, 5, 6, 7]) {
      const help = commands[index]?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain("<approvalId>");
      expect(help).toContain(approvalId);
      expect(help).toContain("--json");
      expect(help).toContain(json);
    }

    const createHelp = commands[2]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(createHelp).toContain("-C, --company-id <id>");
    expect(createHelp).toContain("--type <type>");
    expect(createHelp).toContain("--payload <json>");
    expect(createHelp).toContain("--requested-by-agent-id <id>");
    expect(createHelp).toContain("--issue-ids <csv>");
    for (const label of [company, type, payload, requester, issueIds, json]) expect(createHelp).toContain(label);

    for (const index of [3, 4, 5]) {
      const help = commands[index]?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain("--decision-note <text>");
      expect(help).toContain("--decided-by-user-id <id>");
      expect(help).toContain(note);
      expect(help).toContain(actor);
    }

    const resubmitHelp = commands[6]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(resubmitHelp).toContain("--payload <json>");
    expect(resubmitHelp).toContain(resubmitPayload);
    const commentHelp = commands[7]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(commentHelp).toContain("--body <text>");
    expect(commentHelp).toContain(body);
  });

  it("preserves successful output, routes, payloads, auth, and JSON for every approval operation", async () => {
    for (const operation of operations()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await runCommand(args, locale);
          if (operation.name === "list" && !json) {
            expect(outputLines(logSpy)).toEqual([expectedApprovalListLine(locale)]);
          } else {
            expect(outputLines(logSpy)).toEqual([JSON.stringify(operation.response, null, 2)]);
            expect(JSON.parse(outputLines(logSpy)[0]!)).toEqual(operation.response);
          }
          logSpy.mockClear();
        }
      }
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body === undefined
        ? undefined
        : JSON.parse(String((init as RequestInit).body)),
    ])).toEqual(operations().flatMap((operation) => Array.from({ length: 4 }, () => [
      `http://paperclip.test${operation.path}`,
      operation.method,
      operation.body,
    ])));
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit | undefined)?.headers).toEqual(expect.objectContaining({ authorization: "Bearer board-token" }));
    }
  });

  it("localizes empty list and null get markers while preserving JSON", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse([]));
        const listArgs = ["approval", "list", "--company-id", COMPANY_ID];
        if (json) listArgs.push("--json");
        await runCommand(listArgs, locale);
        expect(outputLines(logSpy)).toEqual([json ? "[]" : locale === "en" ? "(empty)" : "(vazio)"]);
        logSpy.mockClear();

        fetchMock.mockResolvedValueOnce(jsonResponse(null));
        const getArgs = ["approval", "get", APPROVAL_ID];
        if (json) getArgs.push("--json");
        await runCommand(getArgs, locale);
        expect(outputLines(logSpy)).toEqual([json ? "null" : locale === "en" ? "(null)" : "(nulo)"]);
        logSpy.mockClear();
      }
    }
  });

  it("preserves external API errors, details, statuses, and exit codes for every operation", async () => {
    const failure = {
      error: "External approval failure/KeepCase",
      details: { code: "APPROVAL_ACCESS_DENIED", approvalId: APPROVAL_ID, retryable: false },
    };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const statuses = [403, 404, 409, 409, 409, 409, 422, 403] as const;

    for (const [index, operation] of operations().entries()) {
      const status = statuses[index]!;
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, status));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? `API error ${status}:` : `Erro de API ${status}:`);
          expect(error).toContain("External approval failure/KeepCase");
          expect(error).toContain(`details={"code":"APPROVAL_ACCESS_DENIED","approvalId":"${APPROVAL_ID}","retryable":false}`);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(operations().length * 4).fill([1]));
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body === undefined
        ? undefined
        : JSON.parse(String((init as RequestInit).body)),
    ])).toEqual(operations().flatMap((operation) => Array.from({ length: 4 }, () => [
      `http://paperclip.test${operation.path}`,
      operation.method,
      operation.body,
    ])));
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("keeps approval payload JSON parse errors unchanged across locales and modes", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const cases = [
      ["approval", "create", "--company-id", COMPANY_ID, "--type", "hire_agent", "--payload", "[]"],
      ["approval", "resubmit", APPROVAL_ID, "--payload", "[]"],
    ];
    const expected = "Invalid payload JSON: payload must be a JSON object";

    for (const argsBase of cases) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          const args = json ? [...argsBase, "--json"] : argsBase;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          expect(String(errorSpy.mock.calls.at(-1)?.[0])).toContain(expected);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(cases.length * 4).fill([1]));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
