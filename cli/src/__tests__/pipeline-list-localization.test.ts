import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerPipelineCommands } from "../commands/pipelines.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const PIPELINE = {
  id: "11111111-1111-4111-8111-111111111111",
  key: "support-workflow",
  name: "Support workflow",
  description: "User supplied description",
  enforceTransitions: true,
  stageCount: 4,
  openCaseCount: 7,
};

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerPipelineCommands(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("pipelines list localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-pipeline-list-l10n-"));
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
    setCliCommandLineShape(undefined);
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function run(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [
      ...args,
      "--company-id", COMPANY_ID,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
    ];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      group: "Operações de pipelines e casos",
      description: "Listar pipelines",
      company: "ID da organização (substitui o padrão do contexto)",
      json: "Exibir JSON bruto",
      row: `ID=${PIPELINE.id} Nome=${PIPELINE.name} Chave=${PIPELINE.key} Exigir transições=true Etapas=4 Casos abertos=7`,
    },
    {
      locale: "en",
      group: "Pipeline and case operations",
      description: "List pipelines",
      company: "Company ID (overrides context default)",
      json: "Output raw JSON",
      row: `ID=${PIPELINE.id} Name=${PIPELINE.name} Key=${PIPELINE.key} Enforce transitions=true Stages=4 Open cases=7`,
    },
  ] as const)("localizes $locale help and list labels while preserving record values and route", async ({ locale, group, description, company, json, row }) => {
    const program = makeProgram(locale);
    const pipelines = program.commands.find((command) => command.name() === "pipelines");
    const list = pipelines?.commands.find((command) => command.name() === "list");
    const help = list?.helpInformation().replace(/\s+/g, " ") ?? "";

    expect(pipelines?.description()).toBe(group);
    expect(list?.description()).toBe(description);
    expect(help).toContain("paperclipai pipelines list [options]");
    expect(help).toContain("--company-id <id>");
    expect(help).toContain(company);
    expect(help).toContain("--json");
    expect(help).toContain(json);

    fetchMock.mockResolvedValueOnce(jsonResponse([PIPELINE]));
    await run(["pipelines", "list"], locale);
    expect(logSpy.mock.calls.map((call: unknown[]) => String(call[0]))).toEqual([row]);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://paperclip.test/api/companies/${COMPANY_ID}/pipelines`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes the empty marker and leaves JSON output equivalent across locales", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await run(["pipelines", "list"], "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(vazio)");
    logSpy.mockClear();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await run(["pipelines", "list"], "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(empty)");

    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      logSpy.mockClear();
      fetchMock.mockResolvedValueOnce(jsonResponse([PIPELINE]));
      await run(["pipelines", "list", "--json"], locale);
      outputs.push(String(logSpy.mock.calls.at(-1)?.[0]));
    }
    expect(outputs[0]).toBe(outputs[1]);
    expect(JSON.parse(outputs[0]!)).toEqual([PIPELINE]);
  });

  it("localizes human API framing but keeps JSON stderr, details, and exit status stable", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const failure = { error: "Pipeline backend detail", details: { code: "PIPELINE_LIST_UNAVAILABLE" } };

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 503));
      await expect(run(["pipelines", "list"], locale)).rejects.toThrow("exit:1");
      const message = String(errorSpy.mock.calls.at(-1)?.[0]);
      expect(message).toContain(locale === "en" ? "API error 503:" : "Erro de API 503:");
      expect(message).toContain("Pipeline backend detail code=PIPELINE_LIST_UNAVAILABLE");
      errorSpy.mockClear();
    }

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 503));
      await expect(run(["pipelines", "list", "--json"], locale)).rejects.toThrow("exit:1");
      expect(errorSpy.mock.calls.at(-1)?.[0]).toContain("API error 503: Pipeline backend detail code=PIPELINE_LIST_UNAVAILABLE");
      errorSpy.mockClear();
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
