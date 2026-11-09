import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatTargetDiagnostics,
  registerPluginCommands,
  renderPluginInitSuccess,
  runPluginInitCommand,
} from "../commands/client/plugin.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { pluginOperationMessage } from "../localization/plugin-operations.js";
import { cliMessage, localizeHelpTitle, parseCliLocale, setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const PLUGIN = {
  id: "plugin-id-keep-case",
  pluginKey: "@acme/linear-bridge",
  packageName: "@acme/plugin-linear",
  version: "1.2.3",
  status: "ready",
  displayName: "Linear Bridge",
  lastError: "External worker detail: KeepCase Café",
  installedAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride().helpOption("-h, --help", cliMessage("helpCommand"));
  program.configureHelp({ styleTitle: localizeHelpTitle });
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerPluginCommands(program);
  const registerLanguageOptionOnChildren = (command: Command) => {
    for (const child of command.commands) {
      child.option("--lang <locale>", cliMessage("languageOption"), parseCliLocale);
      registerLanguageOptionOnChildren(child);
    }
  };
  registerLanguageOptionOnChildren(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function commandShape(command: Command): unknown {
  return {
    name: command.name(),
    args: command.registeredArguments.map((arg) => arg.name()),
    options: command.options.map((option) => option.flags),
    children: command.commands.map(commandShape),
  };
}

describe("plugin CLI localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-plugin-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    stdoutSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
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
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
    ];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it("localizes every registered plugin help entry and preserves command, argument, and flag names", () => {
    const en = makeProgram("en");
    const pt = makeProgram("pt-BR");
    expect(commandShape(pt)).toEqual(commandShape(en));

    const getCommands = (root: Command) => {
      const result = new Map<string, Command>();
      const visit = (command: Command, parts: string[]) => {
        const names = command === root ? [] : [...parts, command.name()];
        if (names[0] === "plugin") result.set(names.join(" "), command);
        for (const child of command.commands) visit(child, names);
      };
      visit(root, []);
      return result;
    };
    const enCommands = getCommands(en);
    const ptCommands = getCommands(pt);
    expect(ptCommands.size).toBe(33);

    for (const [name, enCommand] of enCommands) {
      const ptCommand = ptCommands.get(name);
      expect(ptCommand, name).toBeDefined();
      expect(ptCommand?.description(), name).not.toBe(enCommand.description());
      expect(ptCommand?.helpInformation(), name).not.toBe(enCommand.helpInformation());
    }

    const installHelp = ptCommands.get("plugin install")?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(installHelp).toContain("paperclipai plugin install [options] <package>");
    expect(installHelp).toContain("--no-verify-target");
    expect(installHelp).toContain("@acme/plugin-linear@1.2");
    expect(installHelp).toContain("versão fixada");
    const localFolderHelp = ptCommands.get("plugin local-folder:set")?.helpInformation() ?? "";
    expect(localFolderHelp).toContain("--payload-json <json>");
    expect(localFolderHelp).toContain("ID da organização");
  });

  it("localizes lifecycle success and progress while preserving install requests and external detail", async () => {
    const requestBodies: unknown[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
        requestBodies.push(JSON.parse(String(init.body)));
        return jsonResponse(PLUGIN);
      });
      await run(["plugin", "install", "@acme/plugin-linear", "--version", "1.2.3", "--no-verify-target"], locale);

      const output = stdoutSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
      expect(output).toContain(locale === "en" ? "Installing plugin:" : "Instalando plugin:");
      expect(output).toContain(locale === "en" ? "Installed @acme/linear-bridge" : "Plugin @acme/linear-bridge");
      expect(output).toContain(locale === "en" ? "Warning:" : "Aviso:");
      expect(output).toContain(PLUGIN.lastError);
      stdoutSpy.mockClear();
    }

    expect(requestBodies).toEqual([
      { packageName: "@acme/plugin-linear", version: "1.2.3", isLocalPath: false },
      { packageName: "@acme/plugin-linear", version: "1.2.3", isLocalPath: false },
    ]);
  });

  it("localizes human list output but keeps plugin values and JSON bytes unchanged", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([PLUGIN]));
      await run(["plugin", "list"], locale);
      const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
      expect(output).toContain(locale === "en" ? "key=" : "chave=");
      expect(output).toContain(locale === "en" ? "version=1.2.3" : "versão=1.2.3");
      expect(output).toContain(PLUGIN.pluginKey);
      expect(output).toContain(PLUGIN.lastError);
      stdoutSpy.mockClear();
    }

    const jsonOutputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([PLUGIN]));
      await run(["plugin", "list", "--json"], locale);
      jsonOutputs.push(String(stdoutSpy.mock.calls.at(-1)?.[0]));
      stdoutSpy.mockClear();
    }
    expect(jsonOutputs[0]).toBe(jsonOutputs[1]);
    expect(JSON.parse(jsonOutputs[0]!)).toEqual([PLUGIN]);

    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await run(["plugin", "list"], "pt-BR");
    expect(stdoutSpy.mock.calls.at(-1)?.[0]).toBe("Nenhum plugin instalado.");
    stdoutSpy.mockClear();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await run(["plugin", "list"], "en");
    expect(stdoutSpy.mock.calls.at(-1)?.[0]).toBe("No plugins installed.");
  });

  it("localizes plugin lifecycle confirmations while preserving IDs, states, and example descriptions", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(PLUGIN));
      await run(["plugin", "uninstall", PLUGIN.pluginKey, "--force"], locale);
      let output = stdoutSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
      expect(output).toContain(locale === "en" ? "Uninstalling and purging" : "Desinstalando e removendo todos os dados");
      expect(output).toContain(locale === "en" ? "(purged)" : "(dados removidos)");
      expect(output).toContain(PLUGIN.pluginKey);
      let [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe(`http://paperclip.test/api/plugins/${encodeURIComponent(PLUGIN.pluginKey)}?purge=true`);
      expect(init.method).toBe("DELETE");
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ready" }));
      await run(["plugin", "enable", PLUGIN.pluginKey], locale);
      output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
      expect(output).toContain(locale === "en" ? "Enabled" : "ativado");
      expect(output).toContain("status: ready");
      [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe(`http://paperclip.test/api/plugins/${encodeURIComponent(PLUGIN.pluginKey)}/enable`);
      expect(init.method).toBe("POST");
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse({ status: "disabled" }));
      await run(["plugin", "disable", PLUGIN.pluginKey], locale);
      output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
      expect(output).toContain(locale === "en" ? "Disabled" : "desativado");
      expect(output).toContain("status: disabled");
      [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe(`http://paperclip.test/api/plugins/${encodeURIComponent(PLUGIN.pluginKey)}/disable`);
      expect(init.method).toBe("POST");
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse(PLUGIN));
      await run(["plugin", "inspect", PLUGIN.pluginKey], locale);
      output = stdoutSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
      expect(output).toContain(locale === "en" ? "Last error:" : "Último erro:");
      expect(output).toContain(PLUGIN.lastError);
      [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toBe(`http://paperclip.test/api/plugins/${encodeURIComponent(PLUGIN.pluginKey)}`);
      expect(init.method).toBe("GET");
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await run(["plugin", "examples"], locale);
      expect(stdoutSpy.mock.calls.at(-1)?.[0]).toBe(locale === "en" ? "No bundled examples available." : "Nenhum exemplo integrado disponível.");
      stdoutSpy.mockClear();

      fetchMock.mockResolvedValueOnce(jsonResponse([{
        packageName: "@acme/plugin-external",
        pluginKey: "acme.external",
        displayName: "Example KeepCase",
        description: "Provider supplied description Café",
        localPath: "/tmp/plugin-external",
        tag: "connector",
      }]));
      await run(["plugin", "examples"], locale);
      output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
      expect(output).toContain("Provider supplied description Café");
      expect(output).toContain("paperclipai plugin install /tmp/plugin-external");
      stdoutSpy.mockClear();
    }
  });

  it("localizes API framing while preserving upstream errors and JSON failure behavior", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const failure = { error: "Upstream plugin detail KeepCase Café", details: { code: "PLUGIN_WORKER_UNAVAILABLE" } };

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 503));
      await expect(run(["plugin", "list"], locale)).rejects.toThrow("exit:1");
      const message = String(stderrSpy.mock.calls.at(-1)?.[0]);
      expect(message).toContain(locale === "en" ? "API error 503:" : "Erro de API 503:");
      expect(message).toContain("Upstream plugin detail KeepCase Café");
      expect(message).toContain("PLUGIN_WORKER_UNAVAILABLE");
      stderrSpy.mockClear();
    }

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 503));
      await expect(run(["plugin", "list", "--json"], locale)).rejects.toThrow("exit:1");
      const message = String(stderrSpy.mock.calls.at(-1)?.[0]);
      expect(message).toContain("API error 503:");
      expect(message).toContain("Upstream plugin detail KeepCase Café");
      stderrSpy.mockClear();
    }
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("localizes target and scaffold framing without rewriting URLs, commands, or external details", () => {
    const targetOutputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      const target = formatTargetDiagnostics({
        apiBase: "http://Paperclip.test:3111/base",
        reachable: false,
        error: "ECONNREFUSED from external health check",
      });
      expect(target).toContain("http://Paperclip.test:3111/base");
      expect(target).toContain("ECONNREFUSED from external health check");
      targetOutputs.push(target);
    }
    expect(targetOutputs[0]).not.toBe(targetOutputs[1]);

    const nextCommands = ["cd '/tmp/plugin demo'", "pnpm install", "pnpm dev", "paperclipai plugin install '/tmp/plugin demo'"];
    const scaffoldOutputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      const rendered = renderPluginInitSuccess({ outputDir: "/tmp/plugin demo", nextCommands });
      expect(rendered).toContain("/tmp/plugin demo");
      for (const command of nextCommands) expect(rendered).toContain(command);
      scaffoldOutputs.push(rendered);
    }
    expect(scaffoldOutputs[0]).not.toBe(scaffoldOutputs[1]);
    expect(pluginOperationMessage("companyIdRequired", {}, "pt-BR")).toContain("--company-id");
    expect(pluginOperationMessage("invalidInteger", { value: "4x" }, "en")).toBe("Invalid integer value: 4x");
  });

  it("localizes plugin scaffold validation before creating files", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const locale of ["pt-BR", "en"] as const) {
      await expect(run(["plugin", "init", "Invalid/Name"], locale)).rejects.toThrow("exit:1");
      const invalidNameError = String(stderrSpy.mock.calls.at(-1)?.[0]);
      expect(invalidNameError).toContain(locale === "en" ? "Invalid plugin name." : "Nome de plugin inválido.");
      stderrSpy.mockClear();
    }

    const existingDir = path.join(tempRoot, "existing-plugin");
    await mkdir(existingDir);
    for (const locale of ["pt-BR", "en"] as const) {
      await expect(run(["plugin", "init", "existing-plugin", "--output", tempRoot], locale)).rejects.toThrow("exit:1");
      const directoryError = String(stderrSpy.mock.calls.at(-1)?.[0]);
      expect(directoryError).toContain(locale === "en" ? "Directory already exists:" : "O diretório já existe:");
      expect(directoryError).toContain(existingDir);
      stderrSpy.mockClear();
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("retains the scaffold validation order and localizes only known validation errors", async () => {
    setCliLocale("pt-BR");
    expect(() => runPluginInitCommand("Invalid/Name", {
      template: "not-a-template",
    } as unknown as Parameters<typeof runPluginInitCommand>[1])).toThrow("Modelo inválido 'not-a-template'.");

    expect(() => runPluginInitCommand("Invalid/Name", {
      category: "not-a-category",
    } as unknown as Parameters<typeof runPluginInitCommand>[1])).toThrow("Nome de plugin inválido.");

    await mkdir(path.join(tempRoot, "existing-before-category"));
    expect(() => runPluginInitCommand("existing-before-category", {
      output: tempRoot,
      category: "not-a-category",
    } as unknown as Parameters<typeof runPluginInitCommand>[1])).toThrow("Categoria inválida 'not-a-category'.");
  });

  it("uses English for plugin validation errors in real CLI subprocesses with --json", () => {
    const tsx = path.resolve(process.cwd(), "cli/node_modules/tsx/dist/cli.mjs");
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
      if (key.startsWith("PAPERCLIP_")) delete env[key];
    }
    env.PAPERCLIP_HOME = tempRoot;
    env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    env.PAPERCLIP_LANG = "pt-BR";

    const cases = [
      { args: ["plugin", "init", "Invalid/Name", "--json"], message: "Invalid plugin name." },
      { args: ["plugin", "config", "plugin-key", "--json"], message: "Company ID is required." },
    ];
    for (const scenario of cases) {
      const result = spawnSync(process.execPath, [tsx, "cli/src/index.ts", ...scenario.args], {
        cwd: process.cwd(),
        env,
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(result.error, scenario.args.join(" ")).toBeUndefined();
      expect(result.status, scenario.args.join(" ")).toBe(1);
      expect(result.stdout, scenario.args.join(" ")).toBe("");
      expect(result.stderr, scenario.args.join(" ")).toContain(scenario.message);
      expect(result.stderr, scenario.args.join(" ")).not.toContain("inválido");
      expect(result.stderr, scenario.args.join(" ")).not.toContain("obrigatório");
    }
  });

  it("localizes the missing company selection before a plugin config request", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const locale of ["pt-BR", "en"] as const) {
      await expect(run(["plugin", "config", "plugin-key"], locale)).rejects.toThrow("exit:1");
      const message = String(stderrSpy.mock.calls.at(-1)?.[0]);
      expect(message).toContain(locale === "en" ? "Company ID is required." : "O ID da organização é obrigatório.");
      expect(message).toContain("--company-id");
      stderrSpy.mockClear();
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
