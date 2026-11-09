import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const FILE_PATH = "runbooks/Agent Policy – café.md";
const FILE_CONTENT = "# Agent policy\r\nKeep the supplied bytes: café / 日本語.  \r\n";

const RESPONSES = {
  bundle: {
    agentId: AGENT_ID,
    mode: "managed",
    entryFile: "AGENTS.md",
    files: [{ path: "AGENTS.md", content: "# Agent\r\nDo not rewrite this text.\n" }],
    revisionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  },
  file: {
    path: FILE_PATH,
    content: FILE_CONTENT,
    revisionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    baseRevisionId: null,
    baseHash: "a".repeat(64),
  },
  put: {
    path: FILE_PATH,
    content: FILE_CONTENT,
    revisionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    baseRevisionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    baseHash: "b".repeat(64),
  },
  deleted: { deleted: true, path: FILE_PATH },
  pathUpdated: { instructionsPath: "./instructions/AGENTS.md", adapterConfigKey: "instructionsFilePath" },
};

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

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

describe("agent instruction CLI localization", () => {
  let tempRoot: string;
  let contentFile: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-instructions-l10n-"));
    contentFile = path.join(tempRoot, "instructions fixture.md");
    await writeFile(contentFile, FILE_CONTENT, "utf8");
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

  function commands() {
    return [
      {
        name: "instructions-bundle",
        args: ["agent", "instructions-bundle", AGENT_ID],
        path: `/api/agents/${AGENT_ID}/instructions-bundle`,
        method: "GET",
        response: RESPONSES.bundle,
      },
      {
        name: "instructions-file:get",
        args: ["agent", "instructions-file:get", AGENT_ID, "--path", FILE_PATH],
        path: `/api/agents/${AGENT_ID}/instructions-bundle/file?${new URLSearchParams({ path: FILE_PATH }).toString()}`,
        method: "GET",
        response: RESPONSES.file,
      },
      {
        name: "instructions-file:put",
        args: ["agent", "instructions-file:put", AGENT_ID, "--path", FILE_PATH, "--content-file", contentFile, "--clear-legacy-prompt-template"],
        path: `/api/agents/${AGENT_ID}/instructions-bundle/file`,
        method: "PUT",
        body: { path: FILE_PATH, content: FILE_CONTENT, clearLegacyPromptTemplate: true },
        response: RESPONSES.put,
      },
      {
        name: "instructions-file:delete",
        args: ["agent", "instructions-file:delete", AGENT_ID, "--path", FILE_PATH],
        path: `/api/agents/${AGENT_ID}/instructions-bundle/file?${new URLSearchParams({ path: FILE_PATH }).toString()}`,
        method: "DELETE",
        response: RESPONSES.deleted,
      },
      {
        name: "instructions-path:update",
        args: ["agent", "instructions-path:update", AGENT_ID, "--payload-json", JSON.stringify({ path: "./instructions/AGENTS.md", adapterConfigKey: "instructionsFilePath" })],
        path: `/api/agents/${AGENT_ID}/instructions-path`,
        method: "PATCH",
        body: { path: "./instructions/AGENTS.md", adapterConfigKey: "instructionsFilePath" },
        response: RESPONSES.pathUpdated,
      },
    ] as const;
  }

  async function runCommand(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    { locale: "pt-BR", filePath: "Caminho do arquivo relativo ao pacote de instruções", contentFile: "Ler o conteúdo do arquivo do disco", clearLegacy: "Limpar o template de prompt legado", payload: "Payload JSON de UpdateAgentInstructionsPath" },
    { locale: "en", filePath: "Bundle-relative file path", contentFile: "Read file content from disk", clearLegacy: "Clear legacy prompt template", payload: "UpdateAgentInstructionsPath JSON payload" },
  ] as const)("localizes $locale help while preserving command names, argument identifiers, options, and JSON example", ({ locale, filePath, contentFile, clearLegacy, payload }) => {
    const program = makeProgram(locale);
    const agent = program.commands.find((command) => command.name() === "agent");
    const descriptions = {
      "instructions-bundle": locale === "en" ? "Get an agent instructions bundle" : "Consultar o pacote de instruções do agente",
      "instructions-file:get": locale === "en" ? "Get an agent instructions file" : "Consultar um arquivo de instruções do agente",
      "instructions-file:put": locale === "en" ? "Create or update an agent instructions file" : "Criar ou atualizar um arquivo de instruções do agente",
      "instructions-file:delete": locale === "en" ? "Delete an agent instructions file" : "Excluir um arquivo de instruções do agente",
      "instructions-path:update": locale === "en"
        ? "Update an agent instructions path. Process adapters require adapterConfigKey and relative paths require adapterConfig.cwd."
        : "Atualizar o caminho de instruções do agente. Adapters process exigem adapterConfigKey; caminhos relativos exigem adapterConfig.cwd.",
    };

    for (const operation of commands()) {
      const command = agent?.commands.find((candidate) => candidate.name() === operation.name);
      expect(command?.description()).toBe(descriptions[operation.name]);
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(`paperclipai agent ${operation.name} [options] <agentId>`);
      expect(help).toContain(locale === "en" ? "Agent ID" : "ID do agente");
      expect(help).toContain("--json");
      expect(help).toContain(locale === "en" ? "Output raw JSON" : "Exibir JSON bruto");
      if (operation.name.includes("instructions-file:")) {
        expect(help).toContain("--path <path>");
        expect(help).toContain(filePath);
      }
      if (operation.name === "instructions-file:put") {
        expect(help).toContain("--content <text>");
        expect(help).toContain("--content-file <path>");
        expect(help).toContain(contentFile);
        expect(help).toContain("--clear-legacy-prompt-template");
        expect(help).toContain(clearLegacy);
      }
      if (operation.name === "instructions-path:update") {
        expect(help).toContain("--payload-json <json>");
        expect(help).toContain(payload);
        expect(help).toContain('{"path":"/tmp/AGENTS.md","adapterConfigKey":"instructionsFilePath"}');
      }
    }
  });

  it("keeps instruction content, request shape, and output identical in both locales and modes", async () => {
    const operations = commands();
    for (const operation of operations) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
          await runCommand(json ? [...operation.args, "--json"] : operation.args, locale);
          expect(outputLines(logSpy)).toEqual([JSON.stringify(operation.response, null, 2)]);
          expect(JSON.parse(outputLines(logSpy)[0]!)).toEqual(operation.response);
          logSpy.mockClear();
        }
      }
    }

    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual(operations.flatMap((operation) => Array.from({ length: 4 }, () => [
      `http://paperclip.test${operation.path}`,
      operation.method,
      "body" in operation ? JSON.stringify(operation.body) : undefined,
    ])));
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit | undefined)?.headers).toEqual(expect.objectContaining({ authorization: "Bearer board-token" }));
    }
  });

  it("preserves permission failures, response details, status, and exit code for each command", async () => {
    const failure = { error: "Instructions permission denied/KeepCase", details: { code: "INSTRUCTIONS_WRITE_DENIED", agentId: AGENT_ID } };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const operation of commands()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
          const args = json ? [...operation.args, "--json"] : operation.args;
          await expect(runCommand(args, locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? "API error 403:" : "Erro de API 403:");
          expect(error).toContain("Instructions permission denied/KeepCase");
          expect(error).toContain(`details={"code":"INSTRUCTIONS_WRITE_DENIED","agentId":"${AGENT_ID}"}`);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(commands().length * 4).fill([1]));
    expect(fetchMock.mock.calls.map(([url, init]) => {
      const parsed = new URL(String(url));
      return [
      parsed.pathname + parsed.search,
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
      ];
    })).toEqual(commands().flatMap((operation) => Array.from({ length: 4 }, () => [
      `/api/agents/${AGENT_ID}${operation.path.slice(`/api/agents/${AGENT_ID}`.length)}`,
      operation.method,
      "body" in operation ? JSON.stringify(operation.body) : undefined,
    ])));
    expect(logSpy).not.toHaveBeenCalled();
  });
});
