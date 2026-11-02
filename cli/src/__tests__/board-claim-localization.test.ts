import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAccessCommands } from "../commands/client/access.js";
import { setCliLocale } from "../localization/index.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";

const TOKEN = "claim-token-1";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const CLAIM_PAYLOAD = { email: "operator@example.test", claimSecret: "fixture-secret", customCode: "KeepCase" };
const CLAIM_RESULT = { ok: true, companyId: COMPANY_ID, userId: USER_ID, role: "admin", customCode: "KeepCase" };

type Operation = "show" | "claim";

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

function outputLines(spy: ReturnType<typeof vi.spyOn>): string[] {
  return spy.mock.calls.map((call: readonly unknown[]) => String(call[0]));
}

function argsFor(operation: Operation, json = false): string[] {
  const args = ["board-claim", operation, TOKEN];
  if (operation === "claim") args.push("--payload-json", JSON.stringify(CLAIM_PAYLOAD));
  if (json) args.push("--json");
  return args;
}

describe("board-claim commands localization", () => {
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
      group: "Operações de reivindicação de acesso do board",
      descriptions: ["Consultar um token de reivindicação do board", "Reivindicar um token de acesso do board"],
      token: "Token de reivindicação",
      payload: "Payload JSON de reivindicação",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      group: "Board claim token operations",
      descriptions: ["Inspect a board claim token", "Claim a board claim token"],
      token: "Claim token",
      payload: "Claim JSON payload",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help while retaining command, argument, and flag names", ({ locale, group, descriptions, token, payload, json }) => {
    const program = makeProgram(locale);
    const groupCommand = program.commands.find((command) => command.name() === "board-claim");
    expect(groupCommand?.description()).toBe(group);
    const commands = ["show", "claim"].map((name) => groupCommand?.commands.find((command) => command.name() === name));
    expect(commands.map((command) => command?.description())).toEqual(descriptions);

    const showHelp = commands[0]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(showHelp).toContain("paperclipai board-claim show [options] <token>");
    expect(showHelp).toContain(token);
    expect(showHelp).toContain("--json");
    expect(showHelp).toContain(json);

    const claimHelp = commands[1]?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(claimHelp).toContain("paperclipai board-claim claim [options] <token>");
    expect(claimHelp).toContain(token);
    expect(claimHelp).toContain("--payload-json <json>");
    expect(claimHelp).toContain(payload);
    expect(claimHelp).toContain("--json");
    expect(claimHelp).toContain(json);
  });

  it("preserves each operation's route, payload, and output in both locales and modes", async () => {
    const outputs: Record<Operation, string[]> = { show: [], claim: [] };
    const calls: Array<[string, string, unknown]> = [];

    for (const operation of ["show", "claim"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          const response = CLAIM_RESULT;
          fetchMock.mockResolvedValueOnce(jsonResponse(response));
          await run(argsFor(operation, json), locale);
          const output = String(logSpy.mock.calls.at(-1)?.[0]);
          outputs[operation].push(output);
          expect(JSON.parse(output)).toEqual(response);
          logSpy.mockClear();
        }
      }
    }

    expect(outputs.show.every((output) => output === outputs.show[0])).toBe(true);
    expect(outputs.claim.every((output) => output === outputs.claim[0])).toBe(true);
    for (const [url, init] of fetchMock.mock.calls) {
      calls.push([
        String(url),
        String((init as RequestInit | undefined)?.method ?? "GET"),
        (init as RequestInit | undefined)?.body === undefined ? undefined : JSON.parse(String((init as RequestInit).body)),
      ]);
    }
    expect(calls).toEqual([
      ...Array.from({ length: 4 }, () => [`http://paperclip.test/api/board-claim/${TOKEN}`, "GET", undefined]),
      ...Array.from({ length: 4 }, () => [`http://paperclip.test/api/board-claim/${TOKEN}/claim`, "POST", CLAIM_PAYLOAD]),
    ]);
  });

  it("preserves API errors, details, status, and exit code, with English JSON errors identical across locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = {
      error: "Board claim backend detail/KeepCase",
      details: { code: "BOARD_CLAIM_DENIED", token: TOKEN, requestId: "req-1" },
    };
    const structuredErrors: Record<Operation, string[]> = { show: [], claim: [] };

    for (const operation of ["show", "claim"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
          await expect(run(argsFor(operation, json), locale)).rejects.toThrow("exit:1");
          const error = String(errorSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? "API error 403:" : "Erro de API 403:");
          expect(error).toContain("Board claim backend detail/KeepCase");
          expect(error).toContain(`details={"code":"BOARD_CLAIM_DENIED","token":"${TOKEN}","requestId":"req-1"}`);
          if (json) structuredErrors[operation].push(error);
          errorSpy.mockClear();
        }
      }
    }

    expect(structuredErrors.show[1]).toBe(structuredErrors.show[0]);
    expect(structuredErrors.claim[1]).toBe(structuredErrors.claim[0]);
    expect(exitSpy.mock.calls).toEqual(Array(8).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
