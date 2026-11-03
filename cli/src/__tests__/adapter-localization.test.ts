import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAdapterCommands } from "../commands/client/adapter.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const COMPANY_ID = "company-keep-case";
const ENVIRONMENT_ID = "environment-keep-case";
const ADAPTER_TYPE = "codex_local";
const RESPONSE = { adapterType: ADAPTER_TYPE, displayName: "KeepCase Café", settings: { maxRuns: 3 } };
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const operations = [
  {
    name: "list",
    args: [],
    method: "GET",
    url: "http://paperclip.test/api/adapters",
    description: { en: "List registered adapters", "pt-BR": "Listar adapters registrados" },
  },
  {
    name: "install",
    args: ["--payload-json", '{"adapterType":"external_keep_case","source":"npm"}'],
    method: "POST",
    url: "http://paperclip.test/api/adapters/install",
    body: { adapterType: "external_keep_case", source: "npm" },
    description: { en: "Install an external adapter", "pt-BR": "Instalar um adapter externo" },
  },
  {
    name: "get",
    args: [ADAPTER_TYPE],
    method: "GET",
    url: `http://paperclip.test/api/adapters/${ADAPTER_TYPE}`,
    description: { en: "Get one adapter", "pt-BR": "Consultar um adapter" },
    argument: { en: "Adapter type", "pt-BR": "Tipo de adapter" },
  },
  {
    name: "update",
    args: [ADAPTER_TYPE, "--payload-json", '{"enabled":false,"keepCase":"Café"}'],
    method: "PATCH",
    url: `http://paperclip.test/api/adapters/${ADAPTER_TYPE}`,
    body: { enabled: false, keepCase: "Café" },
    description: { en: "Update adapter settings", "pt-BR": "Atualizar as configurações do adapter" },
  },
  {
    name: "override",
    args: [ADAPTER_TYPE, "--payload-json", '{"paused":true}'],
    method: "PATCH",
    url: `http://paperclip.test/api/adapters/${ADAPTER_TYPE}/override`,
    body: { paused: true },
    description: {
      en: "Pause or resume a built-in adapter override",
      "pt-BR": "Pausar ou retomar uma substituição de adapter integrado",
    },
  },
  {
    name: "reload",
    args: [ADAPTER_TYPE],
    method: "POST",
    url: `http://paperclip.test/api/adapters/${ADAPTER_TYPE}/reload`,
    body: {},
    description: { en: "Reload an adapter", "pt-BR": "Recarregar um adapter" },
  },
  {
    name: "reinstall",
    args: [ADAPTER_TYPE],
    method: "POST",
    url: `http://paperclip.test/api/adapters/${ADAPTER_TYPE}/reinstall`,
    body: {},
    description: { en: "Reinstall an adapter", "pt-BR": "Reinstalar um adapter" },
  },
  {
    name: "delete",
    args: [ADAPTER_TYPE],
    method: "DELETE",
    url: `http://paperclip.test/api/adapters/${ADAPTER_TYPE}`,
    description: { en: "Delete an external adapter registration", "pt-BR": "Excluir o registro de um adapter externo" },
  },
  {
    name: "config-schema",
    args: [ADAPTER_TYPE],
    method: "GET",
    url: `http://paperclip.test/api/adapters/${ADAPTER_TYPE}/config-schema`,
    description: { en: "Get adapter config schema", "pt-BR": "Consultar o esquema de configuração do adapter" },
  },
  {
    name: "ui-parser",
    args: [ADAPTER_TYPE],
    method: "GET",
    url: `http://paperclip.test/api/adapters/${ADAPTER_TYPE}/ui-parser.js`,
    description: {
      en: "Get adapter UI parser JavaScript",
      "pt-BR": "Consultar o JavaScript do parser de interface do adapter",
    },
  },
  {
    name: "models",
    args: [ADAPTER_TYPE, "--company-id", COMPANY_ID, "--refresh", "--environment-id", ENVIRONMENT_ID],
    method: "GET",
    url: `http://paperclip.test/api/companies/${COMPANY_ID}/adapters/${ADAPTER_TYPE}/models?refresh=true&environmentId=${ENVIRONMENT_ID}`,
    description: { en: "List adapter models for a company", "pt-BR": "Listar modelos do adapter para uma organização" },
  },
  {
    name: "detect-model",
    args: [ADAPTER_TYPE, "--company-id", COMPANY_ID],
    method: "GET",
    url: `http://paperclip.test/api/companies/${COMPANY_ID}/adapters/${ADAPTER_TYPE}/detect-model`,
    description: { en: "Detect adapter model", "pt-BR": "Detectar o modelo do adapter" },
  },
  {
    name: "test-environment",
    args: [ADAPTER_TYPE, "--company-id", COMPANY_ID, "--payload-json", '{"probe":"KeepCase"}'],
    method: "POST",
    url: `http://paperclip.test/api/companies/${COMPANY_ID}/adapters/${ADAPTER_TYPE}/test-environment`,
    body: { probe: "KeepCase" },
    description: {
      en: "Test adapter environment configuration",
      "pt-BR": "Testar a configuração de ambiente do adapter",
    },
  },
] as const;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerAdapterCommands(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("adapter CLI localization", () => {
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
    setCliCommandLineShape(undefined);
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function run(args: readonly string[], locale: SupportedLocale, json: boolean): Promise<void> {
    const commandArgs = [
      "adapter",
      ...args,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...(json ? ["--json"] : []),
    ];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each(["pt-BR", "en"] as const)("localizes all adapter help in %s without translating command or flag names", (locale) => {
    const program = makeProgram(locale);
    const adapter = program.commands.find((command) => command.name() === "adapter");
    expect(adapter?.description()).toBe(locale === "pt-BR" ? "Operações de gerenciamento de adapters" : "Adapter management operations");

    for (const operation of operations) {
      const command = adapter?.commands.find((candidate) => candidate.name() === operation.name);
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(command?.description()).toBe(operation.description[locale]);
      expect(help).toContain(`paperclipai adapter ${operation.name}`);
      expect(help).toContain("--json");
      if ("argument" in operation) expect(help).toContain(operation.argument[locale]);
      if ("body" in operation) {
        expect(help).toContain("--payload-json <json>");
      }
    }

    const modelsHelp = adapter?.commands.find((command) => command.name() === "models")?.helpInformation() ?? "";
    expect(modelsHelp).toContain(locale === "pt-BR" ? "Atualizar a lista de modelos do provedor" : "Refresh provider model list");
    expect(modelsHelp).toContain(locale === "pt-BR" ? "ID do ambiente para adapters que consideram o ambiente" : "Environment ID for environment-aware adapters");
  });

  it("preserves adapter routes, payloads, data, and output bytes across locales and JSON mode", async () => {
    for (const operation of operations) {
      const outputs: string[] = [];
      for (const locale of ["pt-BR", "en"] as const) {
        for (const json of [false, true]) {
          fetchMock.mockResolvedValueOnce(jsonResponse(RESPONSE));
          await run([operation.name, ...operation.args], locale, json);
          const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
          expect(JSON.parse(output)).toEqual(RESPONSE);
          outputs.push(output);

          const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
          expect(url).toBe(operation.url);
          expect(init.method).toBe(operation.method);
          expect((init.headers as Record<string, string>).authorization).toBe("Bearer board-token");
          if ("body" in operation) expect(JSON.parse(String(init.body))).toEqual(operation.body);
          else expect(init.body).toBeUndefined();
          stdoutSpy.mockClear();
        }
      }
      expect(outputs).toEqual(Array(4).fill(outputs[0]));
    }
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("localizes only the human API error label and preserves structured stderr", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    }) as never);
    const failure = { error: "Adapter refused KeepCase", details: { code: "ADAPTER_CONFIG_INVALID", name: "Café" } };
    const outputs: string[] = [];

    for (const locale of ["pt-BR", "en"] as const) {
      for (const json of [false, true]) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 422));
        await expect(run(["update", ADAPTER_TYPE, "--payload-json", "{}"], locale, json)).rejects.toThrow("exit:1");
        const output = String(stderrSpy.mock.calls.at(-1)?.[0]);
        expect(output).toContain("422");
        expect(output).toContain("Adapter refused KeepCase");
        expect(output).toContain(JSON.stringify(failure.details));
        if (json) expect(output).toMatch(/^API error 422:/);
        else expect(output).toMatch(locale === "pt-BR" ? /^Erro de API 422:/ : /^API error 422:/);
        outputs.push(output);
        stderrSpy.mockClear();
      }
    }

    expect(outputs[1]).toBe(outputs[3]);
    expect(outputs[0]).not.toBe(outputs[2]);
    expect(exitSpy).toHaveBeenCalledTimes(4);
  });
});
