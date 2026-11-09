import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAccessCommands } from "../commands/client/access.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const USER_SLUG = "ops-alias";
const PROFILE_PAYLOAD = { name: "KeepCase Operator", locale: "en", customCode: "KeepCase" };
const PROFILE_RESULT = {
  id: USER_ID,
  name: "KeepCase Operator",
  email: "operator@example.test",
  locale: "en",
  customCode: "KeepCase",
};

type Operation = "session" | "get" | "update" | "company-user";

const operationResults: Record<Operation, unknown> = {
  session: { user: { id: USER_ID, name: "KeepCase Operator" }, session: { id: "session-1", token: "opaque-Token" } },
  get: PROFILE_RESULT,
  update: PROFILE_RESULT,
  "company-user": { id: USER_ID, slug: USER_SLUG, companyId: COMPANY_ID, role: "admin", name: "KeepCase Operator" },
};

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerAccessCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function argsFor(operation: Operation, json = false): string[] {
  const args = ["profile", operation];
  if (operation === "update") args.push("--payload-json", JSON.stringify(PROFILE_PAYLOAD));
  if (operation === "company-user") args.push(USER_SLUG, "--company-id", COMPANY_ID);
  if (json) args.push("--json");
  return args;
}

describe("profile CLI localization", () => {
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
      group: "Operações do perfil do usuário atual",
      descriptions: [
        "Consultar a sessão de autenticação",
        "Consultar o perfil de autenticação atual",
        "Atualizar o perfil de autenticação atual",
        "Consultar o perfil de um usuário em uma organização",
      ],
      payload: "Payload JSON",
      companyId: "ID da organização",
      userSlug: "Slug do usuário",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      group: "Current user profile operations",
      descriptions: ["Get auth session", "Get current auth profile", "Update current auth profile", "Get a user profile within a company"],
      payload: "JSON payload",
      companyId: "Company ID",
      userSlug: "User slug",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale profile help while preserving names and flags", ({ locale, group, descriptions, payload, companyId, userSlug, json }) => {
    const program = makeProgram(locale);
    const profile = program.commands.find((command) => command.name() === "profile");
    expect(profile?.description()).toBe(group);

    const commands = ["session", "get", "update", "company-user"].map((name) => profile?.commands.find((command) => command.name() === name));
    expect(commands.map((command) => command?.description())).toEqual(descriptions);

    const sessionHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(sessionHelp).toContain("paperclipai profile session [options]");
    expect(sessionHelp).toContain("--json");
    expect(sessionHelp).toContain(json);

    const updateHelp = commands[2]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(updateHelp).toContain("paperclipai profile update [options]");
    expect(updateHelp).toContain("--payload-json <json>");
    expect(updateHelp).toContain(payload);
    expect(updateHelp).toContain(json);

    const companyUserHelp = commands[3]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(companyUserHelp).toContain("paperclipai profile company-user [options] <userSlug>");
    expect(companyUserHelp).toContain(userSlug);
    expect(companyUserHelp).toContain("--company-id <id>");
    expect(companyUserHelp).toContain(companyId);
  });

  it("preserves profile routes, request payloads, data, and JSON output in both locales", async () => {
    const outputs: Record<Operation, string[]> = { session: [], get: [], update: [], "company-user": [] };
    for (const operation of ["session", "get", "update", "company-user"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          const result = operationResults[operation];
          fetchMock.mockResolvedValueOnce(jsonResponse(result));
          await run(argsFor(operation, json), locale);
          const output = String(logSpy.mock.calls.at(-1)?.[0]);
          outputs[operation].push(output);
          expect(JSON.parse(output)).toEqual(result);
          logSpy.mockClear();
        }
      }
    }

    for (const operation of ["session", "get", "update", "company-user"] as const) {
      expect(new Set(outputs[operation]).size).toBe(1);
    }

    const expectedCalls = [
      ["GET", "http://paperclip.test/api/auth/get-session", undefined],
      ["GET", "http://paperclip.test/api/auth/profile", undefined],
      ["PATCH", "http://paperclip.test/api/auth/profile", PROFILE_PAYLOAD],
      ["GET", `http://paperclip.test/api/companies/${COMPANY_ID}/users/${USER_SLUG}/profile`, undefined],
    ];
    expect(fetchMock.mock.calls.map(([url, init]) => [
      String(url),
      String((init as RequestInit | undefined)?.method ?? "GET"),
      (init as RequestInit | undefined)?.body === undefined ? undefined : JSON.parse(String((init as RequestInit).body)),
    ])).toEqual(expectedCalls.flatMap(([method, url, body]) =>
      Array.from({ length: 4 }, () => [url, method, body]),
    ));
  });

  it("preserves API failure data and exit status, with structured stderr identical across locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Profile update conflict/KeepCase",
      details: { code: "PROFILE_CONFLICT", userId: USER_ID, requestId: "req-1" },
    };
    const structuredErrors: string[] = [];

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 409));
        await expect(run(argsFor("update", json), locale)).rejects.toThrow("exit:1");
        const error = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(error).toContain(json || locale === "en" ? "API error 409:" : "Erro de API 409:");
        expect(error).toContain("Profile update conflict/KeepCase");
        expect(error).toContain(`details={"code":"PROFILE_CONFLICT","userId":"${USER_ID}","requestId":"req-1"}`);
        if (json) structuredErrors.push(error);
        errorSpy.mockClear();
      }
    }

    expect(structuredErrors[1]).toBe(structuredErrors[0]);
    expect(exitSpy.mock.calls).toEqual(Array(4).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
