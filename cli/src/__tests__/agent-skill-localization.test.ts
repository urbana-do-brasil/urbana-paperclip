import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { registerSkillsCommands } from "../commands/client/skills.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const AGENT = {
  id: AGENT_ID,
  companyId: COMPANY_ID,
  name: "Northstar Recovery",
  role: "incident-response-captain",
  status: "active",
};

const SNAPSHOT = {
  adapterType: "codex_local",
  supported: true,
  mode: "persistent",
  desiredSkills: ["paperclip/review-prs", "paperclip/task-planning"],
  entries: [{
    key: "paperclip/review-prs",
    runtimeName: "review-prs",
    desired: true,
    managed: true,
    state: "installed",
    origin: "company_managed",
    detail: "Installed in ~/.codex/skills/review-prs",
  }],
  warnings: [],
};

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerAgentCommands(program);
  registerSkillsCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

describe("agent skill CLI localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-skills-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn();
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

  async function runCommand(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  function modernArgs(...args: string[]): string[] {
    return ["skills", "agent", ...args, "--company-id", COMPANY_ID];
  }

  it.each([
    {
      locale: "pt-BR",
      descriptions: [
        ["agent", "skills", "Listar skills do agente"],
        ["agent", "skills:sync", "Sincronizar as skills desejadas no agente"],
        ["skills", "agent", "list", "Listar o snapshot de skills do runtime de um agente"],
        ["skills", "agent", "sync", "Mesclar as skills desejadas da organização para um agente e sincronizar o estado do runtime"],
        ["skills", "agent", "clear", "Limpar as skills desejadas da organização para um agente e sincronizar o estado do runtime"],
      ],
      labels: ["ID do agente", "Nomes das skills desejadas, separados por vírgulas", "ID, chave ou slug da skill desejada; pode ser repetido"],
    },
    {
      locale: "en",
      descriptions: [
        ["agent", "skills", "List agent skills"],
        ["agent", "skills:sync", "Sync desired skills onto an agent"],
        ["skills", "agent", "list", "List an agent runtime skill snapshot"],
        ["skills", "agent", "sync", "Merge an agent's desired company skills and sync runtime state"],
        ["skills", "agent", "clear", "Clear an agent's desired company skills and sync runtime state"],
      ],
      labels: ["Agent ID", "Comma-separated desired skill names", "Desired company skill ID, key, or slug; may be repeated"],
    },
  ] as const)("localizes $locale help while preserving commands, argument names, flags, and enum values", ({ locale, descriptions, labels }) => {
    const program = makeProgram(locale);
    const getCommand = (segments: readonly string[]) => {
      let current: Command | undefined = program;
      for (const segment of segments) current = current?.commands.find((command) => command.name() === segment);
      return current;
    };

    const operations = [
      { path: ["agent", "skills"], description: descriptions[0][2], args: "<agentId>" },
      { path: ["agent", "skills:sync"], description: descriptions[1][2], args: "<agentId>" },
      { path: ["skills", "agent", "list"], description: descriptions[2][3], args: "<agentRef>" },
      { path: ["skills", "agent", "sync"], description: descriptions[3][3], args: "<agentRef>" },
      { path: ["skills", "agent", "clear"], description: descriptions[4][3], args: "<agentRef>" },
    ];

    for (const operation of operations) {
      const command = getCommand(operation.path);
      expect(command?.description()).toBe(operation.description);
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(operation.args);
      expect(help).toContain("--api-base <url>");
      expect(help).toContain("--json");
      expect(help).toContain(locale === "en" ? "Output raw JSON" : "Exibir JSON bruto");
    }

    const directSyncHelp = getCommand(["agent", "skills:sync"])?.helpInformation() ?? "";
    expect(directSyncHelp).toContain("--desired-skills <csv>");
    expect(directSyncHelp).toContain(labels[1]);
    expect(directSyncHelp).toContain("--mode <mode>");
    expect(directSyncHelp).toContain("add");
    expect(directSyncHelp).toContain("remove");
    expect(directSyncHelp).toContain("replace");

    const modernSyncHelp = getCommand(["skills", "agent", "sync"])?.helpInformation() ?? "";
    expect(modernSyncHelp).toContain("--skill <skillRef>");
    expect(modernSyncHelp).toContain(labels[2]);
    expect(modernSyncHelp).toContain("--mode <mode>");
    expect(modernSyncHelp).toContain("add");
    expect(modernSyncHelp).toContain("remove");
    expect(modernSyncHelp).toContain("replace");

    const clearHelp = getCommand(["skills", "agent", "clear"])?.helpInformation() ?? "";
    expect(clearHelp).toContain("--yes");
    expect(clearHelp).toContain(locale === "en" ? "Confirm clear without prompting" : "Confirmar a limpeza sem perguntar");
  });

  it("localizes every skill-family command and option while keeping command and argument signatures stable", () => {
    const collect = (locale: SupportedLocale) => {
      const program = makeProgram(locale);
      const entries = new Map<string, { description: string; args: string[]; options: string[]; optionDescriptions: string[] }>();
      const visit = (command: Command, parents: string[]) => {
        const segments = command === program ? parents : [...parents, command.name()];
        if (segments[0] === "skill" || segments[0] === "skills") {
          const key = segments.join(" ");
          entries.set(key, {
            description: command.description(),
            args: command.registeredArguments.map((argument) => argument.name()),
            options: command.options.map((option) => option.long ?? option.short ?? ""),
            optionDescriptions: command.options.map((option) => option.description),
          });
        }
        for (const child of command.commands) visit(child, segments);
      };
      visit(program, []);
      return entries;
    };

    const english = collect("en");
    const portuguese = collect("pt-BR");
    expect([...portuguese.keys()]).toEqual([...english.keys()]);
    for (const [commandName, en] of english) {
      const pt = portuguese.get(commandName)!;
      expect(pt.description, commandName).not.toBe(en.description);
      expect(pt.args, commandName).toEqual(en.args);
      expect(pt.options, commandName).toEqual(en.options);
      expect(pt.optionDescriptions, commandName).toHaveLength(en.optionDescriptions.length);
      for (let index = 0; index < en.optionDescriptions.length; index++) {
        expect(pt.optionDescriptions[index], `${commandName} option ${pt.options[index]}`).not.toBe(en.optionDescriptions[index]);
      }
    }
  });

  it("preserves direct agent skill routes, payloads, raw human output, and JSON bytes", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(SNAPSHOT))
      .mockResolvedValueOnce(jsonResponse(SNAPSHOT))
      .mockResolvedValueOnce(jsonResponse(SNAPSHOT))
      .mockResolvedValueOnce(jsonResponse(SNAPSHOT))
      .mockResolvedValueOnce(jsonResponse(SNAPSHOT))
      .mockResolvedValueOnce(jsonResponse(SNAPSHOT));

    const baseArgs = ["agent", "skills", AGENT_ID];
    await runCommand(baseArgs, "pt-BR");
    const ptHuman = outputLines(logSpy);
    expect(JSON.parse(ptHuman[0]!)).toEqual(SNAPSHOT);
    logSpy.mockClear();
    await runCommand(baseArgs, "en");
    const enHuman = outputLines(logSpy);
    expect(enHuman).toEqual(ptHuman);
    logSpy.mockClear();

    const syncArgs = ["agent", "skills:sync", AGENT_ID, "--desired-skills", "review-prs,task-planning", "--mode", "replace"];
    await runCommand(syncArgs, "pt-BR");
    const ptSyncHuman = outputLines(logSpy);
    expect(JSON.parse(ptSyncHuman[0]!)).toEqual(SNAPSHOT);
    logSpy.mockClear();
    await runCommand(syncArgs, "en");
    const enSyncHuman = outputLines(logSpy);
    expect(enSyncHuman).toEqual(ptSyncHuman);
    logSpy.mockClear();

    for (const locale of ["pt-BR", "en"] as const) {
      await runCommand([...baseArgs, "--json"], locale);
      const output = outputLines(logSpy);
      expect(output).toEqual([JSON.stringify(SNAPSHOT, null, 2)]);
      expect(JSON.parse(output[0]!)).toEqual(SNAPSHOT);
      logSpy.mockClear();
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      new URL(String(url)).pathname,
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual([
      [`/api/agents/${AGENT_ID}/skills`, "GET", undefined],
      [`/api/agents/${AGENT_ID}/skills`, "GET", undefined],
      [`/api/agents/${AGENT_ID}/skills/sync`, "POST", JSON.stringify({ mode: "replace", desiredSkills: ["review-prs", "task-planning"] })],
      [`/api/agents/${AGENT_ID}/skills/sync`, "POST", JSON.stringify({ mode: "replace", desiredSkills: ["review-prs", "task-planning"] })],
      [`/api/agents/${AGENT_ID}/skills`, "GET", undefined],
      [`/api/agents/${AGENT_ID}/skills`, "GET", undefined],
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit | undefined)?.headers).toEqual(expect.objectContaining({ authorization: "Bearer board-token" }));
    }
  });

  it("localizes the modern agent skill snapshot and sync framing without changing data or request shape", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(AGENT))
        .mockResolvedValueOnce(jsonResponse(SNAPSHOT));
      await runCommand(modernArgs("list", AGENT_ID), locale);
      expect(outputLines(logSpy)).toEqual([
        locale === "en"
          ? `Agent ${AGENT.name} (${AGENT_ID}) adapter=codex_local supported=true mode=persistent desiredCompanySkills=2`
          : `Agente ${AGENT.name} (${AGENT_ID}) adapter=codex_local supported=true mode=persistent desiredCompanySkills=2`,
        "key=paperclip/review-prs runtimeName=review-prs desired=true managed=true state=installed origin=company_managed detail=Installed in ~/.codex/skills/review-prs",
      ]);
      logSpy.mockClear();

      fetchMock
        .mockResolvedValueOnce(jsonResponse(AGENT))
        .mockResolvedValueOnce(jsonResponse(SNAPSHOT));
      await runCommand(modernArgs("sync", AGENT_ID, "--skill", "review-prs", "--skill", "task-planning", "--mode", "add"), locale);
      const lines = outputLines(logSpy);
      expect(lines[0]).toBe(locale === "en"
        ? `Desired company skills updated with add mode for ${AGENT.name} (${AGENT_ID}); runtime sync returned 1 skill(s).`
        : `Skills desejadas da organização atualizadas no modo add para ${AGENT.name} (${AGENT_ID}); sincronização do runtime retornou 1 skill(s).`);
      expect(lines[1]).toContain(`adapter=codex_local supported=true mode=persistent desiredCompanySkills=2`);
      logSpy.mockClear();
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      new URL(String(url)).pathname,
      new URL(String(url)).search,
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual([
      [`/api/agents/${AGENT_ID}`, `?companyId=${COMPANY_ID}`, "GET", undefined],
      [`/api/agents/${AGENT_ID}/skills`, "", "GET", undefined],
      [`/api/agents/${AGENT_ID}`, `?companyId=${COMPANY_ID}`, "GET", undefined],
      [`/api/agents/${AGENT_ID}/skills/sync`, "", "POST", JSON.stringify({ desiredSkills: ["review-prs", "task-planning"], mode: "add" })],
      [`/api/agents/${AGENT_ID}`, `?companyId=${COMPANY_ID}`, "GET", undefined],
      [`/api/agents/${AGENT_ID}/skills`, "", "GET", undefined],
      [`/api/agents/${AGENT_ID}`, `?companyId=${COMPANY_ID}`, "GET", undefined],
      [`/api/agents/${AGENT_ID}/skills/sync`, "", "POST", JSON.stringify({ desiredSkills: ["review-prs", "task-planning"], mode: "add" })],
    ]);
  });

  it("clears desired skills with the existing replace payload and JSON remains locale-independent", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(AGENT))
        .mockResolvedValueOnce(jsonResponse(SNAPSHOT));
      await runCommand(modernArgs("clear", AGENT_ID, "--yes"), locale);
      expect(outputLines(logSpy)[0]).toBe(locale === "en"
        ? `Desired company skills cleared for ${AGENT.name} (${AGENT_ID}).`
        : `Skills desejadas da organização removidas de ${AGENT.name} (${AGENT_ID}).`);
      logSpy.mockClear();
    }

    fetchMock
      .mockResolvedValueOnce(jsonResponse(AGENT))
      .mockResolvedValueOnce(jsonResponse(SNAPSHOT))
      .mockResolvedValueOnce(jsonResponse(AGENT))
      .mockResolvedValueOnce(jsonResponse(SNAPSHOT));
    const commandArgs = modernArgs("sync", AGENT_ID, "--skill", "review-prs", "--mode", "replace", "--json");
    await runCommand(commandArgs, "pt-BR");
    const ptJson = outputLines(logSpy);
    logSpy.mockClear();
    await runCommand(commandArgs, "en");
    const enJson = outputLines(logSpy);
    expect(enJson).toEqual(ptJson);
    expect(JSON.parse(ptJson[0]!)).toEqual(SNAPSHOT);
    expect(fetchMock.mock.calls.map(([, init]) => (init as RequestInit | undefined)?.body)).toEqual([
      undefined,
      JSON.stringify({ desiredSkills: [], mode: "replace" }),
      undefined,
      JSON.stringify({ desiredSkills: [], mode: "replace" }),
      undefined,
      JSON.stringify({ desiredSkills: ["review-prs"], mode: "replace" }),
      undefined,
      JSON.stringify({ desiredSkills: ["review-prs"], mode: "replace" }),
    ]);
  });

  it("localizes own skill errors for humans and preserves English stderr in structured mode", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const duplicateSkills = [
      { id: "skill-a", key: "paperclip/a", slug: "duplicate", name: "A" },
      { id: "skill-b", key: "paperclip/b", slug: "duplicate", name: "B" },
    ];
    const cases = [
      {
        makeArgs: (json: boolean) => modernArgs("sync", AGENT_ID, "--mode", "add", ...(json ? ["--json"] : [])),
        responses: () => [] as Response[],
        en: "At least one --skill value is required for skills agent sync.",
        pt: "Informe ao menos um valor para --skill no comando skills agent sync.",
      },
      {
        makeArgs: (json: boolean) => ["skills", "update", "review-prs", "--all", "--company-id", COMPANY_ID, ...(json ? ["--json"] : [])],
        responses: () => [] as Response[],
        en: "Use either a skill reference or --all, not both.",
        pt: "Use uma referência de skill ou --all, não os dois.",
      },
      {
        makeArgs: (json: boolean) => ["skills", "show", "duplicate", "--company-id", COMPANY_ID, ...(json ? ["--json"] : [])],
        responses: () => [jsonResponse(duplicateSkills)],
        en: "Ambiguous skill slug \"duplicate\". Use a skill ID or key instead.",
        pt: "O slug \"duplicate\" corresponde a mais de uma skill. Use o ID ou a chave da skill.",
      },
      {
        makeArgs: (json: boolean) => modernArgs("clear", AGENT_ID, ...(json ? ["--json"] : [])),
        responses: () => [jsonResponse(AGENT)],
        en: "This command requires --yes when not running in an interactive terminal.",
        pt: "Este comando exige --yes quando executado sem um terminal interativo.",
      },
    ];

    for (const locale of ["pt-BR", "en"] as const) {
      for (const operation of cases) {
        for (const json of [false, true]) {
          for (const response of operation.responses()) fetchMock.mockResolvedValueOnce(response);
          await expect(runCommand(operation.makeArgs(json), locale)).rejects.toThrow("exit:1");
          const expected = json ? operation.en : locale === "en" ? operation.en : operation.pt;
          expect(String(errorSpy.mock.calls.at(-1)?.[0])).toBe(expected);
          errorSpy.mockClear();
        }
      }
    }
    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      `/api/companies/${COMPANY_ID}/skills`,
      `/api/companies/${COMPANY_ID}/skills`,
      `/api/agents/${AGENT_ID}`,
      `/api/agents/${AGENT_ID}`,
      `/api/companies/${COMPANY_ID}/skills`,
      `/api/companies/${COMPANY_ID}/skills`,
      `/api/agents/${AGENT_ID}`,
      `/api/agents/${AGENT_ID}`,
    ]);
    expect(exitSpy.mock.calls).toEqual(Array(16).fill([1]));
  });

  it("preserves API permission errors, details, and exit codes across agent skill operations", async () => {
    const failure = { error: "Skill policy denied/KeepCase", details: { code: "SKILL_MANAGE_DENIED", agentId: AGENT_ID } };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const denied = () => jsonResponse(failure, 403);
    const operations = [
      { args: ["agent", "skills", AGENT_ID], beforeFailure: [] as Array<() => Response> },
      { args: ["agent", "skills:sync", AGENT_ID, "--desired-skills", "review-prs", "--mode", "add"], beforeFailure: [] as Array<() => Response> },
      { args: modernArgs("list", AGENT_ID), beforeFailure: [() => jsonResponse(AGENT)] },
      { args: modernArgs("sync", AGENT_ID, "--skill", "review-prs", "--mode", "add"), beforeFailure: [() => jsonResponse(AGENT)] },
      { args: modernArgs("clear", AGENT_ID, "--yes"), beforeFailure: [() => jsonResponse(AGENT)] },
    ];

    for (const locale of ["pt-BR", "en"] as const) {
      for (const operation of operations) {
        for (const response of operation.beforeFailure) fetchMock.mockResolvedValueOnce(response());
        fetchMock.mockResolvedValueOnce(denied());
        await expect(runCommand(operation.args, locale)).rejects.toThrow("exit:1");
        const humanError = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(humanError).toContain(locale === "en" ? "API error 403:" : "Erro de API 403:");
        expect(humanError).toContain("Skill policy denied/KeepCase");
        expect(humanError).toContain(`details={"code":"SKILL_MANAGE_DENIED","agentId":"${AGENT_ID}"}`);
        errorSpy.mockClear();
      }
    }

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(denied());
      await expect(runCommand(["agent", "skills", AGENT_ID, "--json"], locale)).rejects.toThrow("exit:1");
      const jsonError = String(errorSpy.mock.calls.at(-1)?.[0]);
      expect(jsonError).toContain("API error 403: Skill policy denied/KeepCase");
      expect(jsonError).toContain(`details={"code":"SKILL_MANAGE_DENIED","agentId":"${AGENT_ID}"}`);
      errorSpy.mockClear();
    }

    expect(exitSpy.mock.calls).toEqual(Array(12).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(18);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
