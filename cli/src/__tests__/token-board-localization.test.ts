import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTokenCommands } from "../commands/client/token.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const KEY_ID = "board-key-1";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const BOARD_KEY = {
  id: KEY_ID,
  name: "external-admin",
  token: "pcp_board_plaintext",
  createdAt: "2026-05-23T00:00:00.000Z",
  lastUsedAt: "2026-05-24T00:00:00.000Z",
  revokedAt: null,
  expiresAt: "2026-06-23T00:00:00.000Z",
};
const BOARD_KEY_ROW = {
  id: KEY_ID,
  name: "external-admin",
  createdAt: BOARD_KEY.createdAt,
  lastUsedAt: BOARD_KEY.lastUsedAt,
  revokedAt: "2026-06-01T00:00:00.000Z",
  expiresAt: BOARD_KEY.expiresAt,
};

type Operation = "create" | "list" | "revoke";

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerTokenCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

function argsFor(operation: Operation, json = false): string[] {
  const args = ["token", "board", operation];
  if (operation === "create") {
    args.push("--company-id", COMPANY_ID, "--name", "external-admin", "--expires-at", "2026-06-23T00:00:00.000Z");
  }
  if (operation === "revoke") args.push(KEY_ID);
  if (json) args.push("--json");
  return args;
}

describe("token board command localization", () => {
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

  async function run(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      group: "Gerenciar chaves de API do board",
      descriptions: ["Criar uma chave de API nomeada do board", "Listar as chaves de API do usuário atual do board", "Revogar uma chave de API do board"],
      name: "Nome da chave de API",
      expires: "Data e hora de expiração",
      ttl: "Prazo de expiração em dias a partir de agora",
      never: "Criar uma chave sem expiração",
      keyId: "ID da chave de API do board",
    },
    {
      locale: "en",
      group: "Manage board API keys",
      descriptions: ["Create a named board API key", "List board API keys for the current board user", "Revoke a board API key"],
      name: "API key label",
      expires: "Expiration timestamp",
      ttl: "Expiration in days from now",
      never: "Create a non-expiring key",
      keyId: "Board API key ID",
    },
  ] as const)("localizes $locale help while preserving command names and flags", ({ locale, group, descriptions, name, expires, ttl, never, keyId }) => {
    const program = makeProgram(locale);
    const token = program.commands.find((command) => command.name() === "token");
    const board = token?.commands.find((command) => command.name() === "board");
    expect(board?.description()).toBe(group);

    const commands = ["create", "list", "revoke"].map((command) => board?.commands.find((entry) => entry.name() === command));
    expect(commands.map((command) => command?.description())).toEqual(descriptions);
    const createHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(createHelp).toContain("paperclipai token board create [options]");
    expect(createHelp).toContain("--company-id <id>");
    expect(createHelp).toContain("--name <name>");
    expect(createHelp).toContain(name);
    expect(createHelp).toContain("--expires-at <iso8601>");
    expect(createHelp).toContain(expires);
    expect(createHelp).toContain("--ttl-days <days>");
    expect(createHelp).toContain(ttl);
    expect(createHelp).toContain("--never-expires");
    expect(createHelp).toContain(never);

    const revokeHelp = commands[2]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(revokeHelp).toContain("<keyId>");
    expect(revokeHelp).toContain(keyId);
  });

  it("preserves each operation's route, payload, and JSON output across locales", async () => {
    const outputs: Record<Operation, string[]> = { create: [], list: [], revoke: [] };
    for (const operation of ["create", "list", "revoke"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        const response = operation === "create"
          ? BOARD_KEY
          : operation === "list"
            ? [BOARD_KEY_ROW]
            : { ok: true, keyId: KEY_ID };
        fetchMock.mockResolvedValueOnce(jsonResponse(response, operation === "create" ? 201 : 200));
        await run(argsFor(operation, true), locale);
        const output = String(logSpy.mock.calls.at(-1)?.[0]);
        outputs[operation].push(output);
        expect(JSON.parse(output)).toEqual(operation === "create"
          ? { key: BOARD_KEY }
          : response);
        logSpy.mockClear();
      }
    }

    for (const operation of ["create", "list", "revoke"] as const) {
      expect(outputs[operation][1]).toBe(outputs[operation][0]);
    }
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body === undefined ? undefined : JSON.parse(String((init as RequestInit).body)),
    ])).toEqual([
      ["http://paperclip.test/api/board-api-keys", "POST", {
        name: "external-admin",
        requestedCompanyId: COMPANY_ID,
        expiresAt: "2026-06-23T00:00:00.000Z",
      }],
      ["http://paperclip.test/api/board-api-keys", "POST", {
        name: "external-admin",
        requestedCompanyId: COMPANY_ID,
        expiresAt: "2026-06-23T00:00:00.000Z",
      }],
      ["http://paperclip.test/api/board-api-keys", "GET", undefined],
      ["http://paperclip.test/api/board-api-keys", "GET", undefined],
      [`http://paperclip.test/api/board-api-keys/${KEY_ID}`, "DELETE", undefined],
      [`http://paperclip.test/api/board-api-keys/${KEY_ID}`, "DELETE", undefined],
    ]);
  });

  it("localizes human list labels and the empty marker without changing values", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([BOARD_KEY_ROW]));
      await run(argsFor("list"), locale);
      expect(outputLines(logSpy)).toEqual([locale === "en"
        ? `ID=${KEY_ID} Name=external-admin Created at=${BOARD_KEY_ROW.createdAt} Last used at=${BOARD_KEY_ROW.lastUsedAt} Expires at=${BOARD_KEY_ROW.expiresAt} Revoked at=${BOARD_KEY_ROW.revokedAt}`
        : `ID=${KEY_ID} Nome=external-admin Criado em=${BOARD_KEY_ROW.createdAt} Último uso em=${BOARD_KEY_ROW.lastUsedAt} Expira em=${BOARD_KEY_ROW.expiresAt} Revogado em=${BOARD_KEY_ROW.revokedAt}`]);
      logSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await run(argsFor("list"), locale);
      expect(outputLines(logSpy)).toEqual([locale === "en" ? "(empty)" : "(vazio)"]);
      logSpy.mockClear();
    }
  });

  it("preserves external API errors, details, status, and exit code in both modes", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = { error: "Board key backend detail/KeepCase", details: { code: "BOARD_KEY_DENIED", keyId: KEY_ID } };

    for (const operation of ["create", "list", "revoke"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
          await expect(run(argsFor(operation, json), locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? "API error 403:" : "Erro de API 403:");
          expect(error).toContain("Board key backend detail/KeepCase");
          expect(error).toContain(`details={"code":"BOARD_KEY_DENIED","keyId":"${KEY_ID}"}`);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(12).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it("localizes owned failures for human output and keeps --json stderr in English", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failures = [
      {
        args: () => argsFor("create"),
        respond: () => fetchMock.mockResolvedValueOnce(jsonResponse(null)),
        english: "Failed to create board API key",
        portuguese: "Não foi possível criar a chave de API do board",
      },
      {
        args: () => ["token", "board", "create", "--expires-at", "invalid-date"],
        respond: () => undefined,
        english: "Invalid --expires-at value: invalid-date",
        portuguese: "Valor inválido para --expires-at: invalid-date",
      },
      {
        args: () => ["token", "board", "create", "--ttl-days", "invalid-days"],
        respond: () => undefined,
        english: "Invalid --ttl-days value: invalid-days",
        portuguese: "Valor inválido para --ttl-days: invalid-days",
      },
    ] as const;

    for (const failure of failures) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          failure.respond();
          const args = failure.args();
          if (json) args.push("--json");
          await expect(run(args, locale)).rejects.toThrow("exit:1");
          expect(errorSpy.mock.calls.at(-1)?.[0]).toBe(json || locale === "en" ? failure.english : failure.portuguese);
          errorSpy.mockClear();
        }
      }
    }

    expect(exitSpy.mock.calls).toEqual(Array(12).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
