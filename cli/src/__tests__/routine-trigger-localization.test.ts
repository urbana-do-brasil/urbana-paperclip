import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerRoutineApiCommands } from "../commands/client/routine-api.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const ROUTINE_ID = "routine/alpha";
const TRIGGER_ID = "trigger/alpha";
const PUBLIC_ID = "public/alpha";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const operations = [
  {
    name: "trigger:create",
    args: ["routine", "trigger:create", ROUTINE_ID, "--payload-json", '{"kind":"schedule","enabled":true}'],
    method: "POST",
    url: `http://paperclip.test/api/routines/${encodeURIComponent(ROUTINE_ID)}/triggers`,
    payload: { kind: "schedule", enabled: true },
    description: { "pt-BR": "Criar um gatilho para uma rotina", en: "Create a trigger for a routine" },
    argument: { "pt-BR": "ID da rotina", en: "Routine ID" },
  },
  {
    name: "trigger:update",
    args: ["routine", "trigger:update", TRIGGER_ID, "--payload-json", '{"enabled":false}'],
    method: "PATCH",
    url: `http://paperclip.test/api/routine-triggers/${encodeURIComponent(TRIGGER_ID)}`,
    payload: { enabled: false },
    description: { "pt-BR": "Atualizar um gatilho de rotina", en: "Update a routine trigger" },
    argument: { "pt-BR": "ID do gatilho", en: "Trigger ID" },
  },
  {
    name: "trigger:delete",
    args: ["routine", "trigger:delete", TRIGGER_ID],
    method: "DELETE",
    url: `http://paperclip.test/api/routine-triggers/${encodeURIComponent(TRIGGER_ID)}`,
    payload: undefined,
    description: { "pt-BR": "Excluir um gatilho de rotina", en: "Delete a routine trigger" },
    argument: { "pt-BR": "ID do gatilho", en: "Trigger ID" },
  },
  {
    name: "trigger:rotate-secret",
    args: ["routine", "trigger:rotate-secret", TRIGGER_ID],
    method: "POST",
    url: `http://paperclip.test/api/routine-triggers/${encodeURIComponent(TRIGGER_ID)}/rotate-secret`,
    payload: {},
    description: { "pt-BR": "Girar o segredo de um gatilho de rotina", en: "Rotate a routine trigger secret" },
    argument: { "pt-BR": "ID do gatilho", en: "Trigger ID" },
  },
  {
    name: "trigger:fire",
    args: ["routine", "trigger:fire", PUBLIC_ID, "--payload-json", '{"source":"test"}'],
    method: "POST",
    url: `http://paperclip.test/api/routine-triggers/public/${encodeURIComponent(PUBLIC_ID)}/fire`,
    payload: { source: "test" },
    description: { "pt-BR": "Acionar um gatilho público de rotina", en: "Fire a public routine trigger" },
    argument: { "pt-BR": "ID público do gatilho", en: "Public trigger ID" },
  },
] as const;

const FAILURE = {
  error: "Routine trigger access denied/KeepCase",
  details: { code: "ROUTINE_TRIGGER_ACCESS_DENIED", triggerId: TRIGGER_ID, retryable: false },
};

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerRoutineApiCommands(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("routine trigger CLI localization", () => {
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

  async function run(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each(["pt-BR", "en"] as const)("localizes trigger help in %s and keeps names and flags stable", (locale) => {
    const program = makeProgram(locale);
    const routine = program.commands.find((command) => command.name() === "routine");
    const jsonDescription = locale === "pt-BR" ? "Exibir JSON bruto" : "Output raw JSON";

    for (const operation of operations) {
      const command = routine?.commands.find((candidate) => candidate.name() === operation.name);
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(command?.description()).toBe(operation.description[locale]);
      expect(help).toContain(`paperclipai routine ${operation.name}`);
      expect(help).toContain(operation.argument[locale]);
      expect(help).toContain("--json");
      expect(help).toContain(jsonDescription);
      if (operation.payload !== undefined) {
        expect(help).toContain("--payload-json <json>");
        expect(help).toContain(locale === "pt-BR" ? "Payload" : "payload");
      }
    }
  });

  it("preserves trigger routes, payloads, responses, and output across locales", async () => {
    const outputs: string[][] = operations.map(() => []);

    for (const [index, operation] of operations.entries()) {
      const response = {
        id: `response-${index}`,
        triggerId: TRIGGER_ID,
        message: "Preserve Café and KeepCase",
        secret: index === 3 ? "raw-secret/KeepCase" : undefined,
      };
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(response));
          await run([...operation.args, ...(json ? ["--json"] : [])], locale);
          const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
          expect(JSON.parse(output)).toEqual(response);
          outputs[index]?.push(output);

          const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
          expect(url).toBe(operation.url);
          expect(init.method).toBe(operation.method);
          expect((init.headers as Record<string, string>).authorization).toBe("Bearer board-token");
          if (operation.payload === undefined) {
            expect(init.body).toBeUndefined();
          } else {
            expect(JSON.parse(String(init.body))).toEqual(operation.payload);
          }
          stdoutSpy.mockClear();
        }
      }
    }

    for (const values of outputs) {
      expect(values).toEqual(Array(4).fill(values[0]));
    }
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("keeps API failures and JSON-mode stderr stable for every operation", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const jsonErrors: string[][] = operations.map(() => []);

    for (const [index, operation] of operations.entries()) {
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(FAILURE, 403));
          await expect(run([...operation.args, ...(json ? ["--json"] : [])], locale)).rejects.toThrow("exit:1");

          const error = String(stderrSpy.mock.calls.at(-1)?.[0]);
          expect(error).toContain(json || locale === "en" ? "API error 403:" : "Erro de API 403:");
          expect(error).toContain(FAILURE.error);
          expect(error).toContain(`details=${JSON.stringify(FAILURE.details)}`);
          if (json) jsonErrors[index]?.push(error);
          stderrSpy.mockClear();
        }
      }
    }

    for (const errors of jsonErrors) expect(errors[0]).toBe(errors[1]);
    expect(exitSpy.mock.calls).toEqual(Array(operations.length * 4).fill([1]));
    expect(fetchMock).toHaveBeenCalledTimes(operations.length * 4);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });
});
