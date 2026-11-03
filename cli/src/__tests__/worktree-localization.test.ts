import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerWorktreeCommands,
  worktreeCleanupCommand,
  worktreeEnvCommand,
  worktreeEnsureSeededCommand,
  worktreeInitCommand,
  worktreeListCommand,
  worktreeMakeCommand,
} from "../commands/worktree.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { cliMessage, localizeHelpTitle, parseCliLocale, setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const ORIGINAL_ARGV = process.argv;
const ORIGINAL_CWD = process.cwd();
const ORIGINAL_ENV = { ...process.env };

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride().helpOption("-h, --help", cliMessage("helpCommand"));
  program.configureHelp({ styleTitle: localizeHelpTitle });
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerWorktreeCommands(program);
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

function commandShape(command: Command): unknown {
  return {
    name: command.name(),
    args: command.registeredArguments.map((arg) => arg.name()),
    options: command.options.map((option) => option.flags),
    children: command.commands.map(commandShape),
  };
}

describe("worktree CLI localization", () => {
  let tempRoot: string;
  let stdoutLogSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let stderrLogSpy: ReturnType<typeof vi.spyOn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-worktree-l10n-"));
    process.argv = ["node", "paperclipai"];
    stdoutLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockImplementation((() => true) as never);
    stderrLogSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    stderrWriteSpy = vi.spyOn(process.stderr, "write").mockImplementation((() => true) as never);
  });

  afterEach(() => {
    process.chdir(ORIGINAL_CWD);
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliCommandLineShape(undefined);
    setCliLocale("pt-BR");
    vi.restoreAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("localizes all registered worktree help while preserving commands, argument names, and flags", () => {
    const en = makeProgram("en");
    const pt = makeProgram("pt-BR");
    expect(commandShape(pt)).toEqual(commandShape(en));

    const paths = [
      "worktree",
      "worktree init",
      "worktree env",
      "worktree ensure-seeded",
      "worktree reseed",
      "worktree repair",
      "worktree:make",
      "worktree:list",
      "worktree:merge-history",
      "worktree:cleanup",
    ];
    expect(paths).toHaveLength(10);

    const getCommand = (program: Command, name: string): Command | undefined => {
      if (name.includes(":")) return program.commands.find((candidate) => candidate.name() === name);
      const [parentName, childName] = name.split(" ");
      const parent = program.commands.find((candidate) => candidate.name() === parentName);
      return childName ? parent?.commands.find((candidate) => candidate.name() === childName) : parent;
    };

    for (const name of paths) {
      const enCommand = getCommand(en, name);
      const ptCommand = getCommand(pt, name);
      expect(enCommand, name).toBeDefined();
      expect(ptCommand, name).toBeDefined();
      expect(ptCommand?.description(), name).not.toBe(enCommand?.description());
      expect(ptCommand?.helpInformation(), name).not.toBe(enCommand?.helpInformation());
    }

    const makeHelp = getCommand(pt, "worktree:make")?.helpInformation() ?? "";
    expect(makeHelp).toContain("paperclipai worktree:make [options] <name>");
    expect(makeHelp).toContain("--seed-mode <mode>");
    expect(makeHelp).toContain("minimal ou full");
    const envHelp = getCommand(pt, "worktree env")?.helpInformation() ?? "";
    expect(envHelp).toContain("--json");
    expect(envHelp).toContain("Exibir JSON em vez das exportações de shell");
    const cleanupHelp = getCommand(pt, "worktree:cleanup")?.helpInformation() ?? "";
    expect(cleanupHelp).toContain("--force");
    expect(cleanupHelp).toContain("Ignorar verificações de segurança");
  });

  it("keeps worktree env shell exports and JSON identical in both locales", async () => {
    const paperclipDir = path.join(tempRoot, ".paperclip");
    fs.mkdirSync(paperclipDir, { recursive: true });
    const configPath = path.join(paperclipDir, "config.json");
    const envPath = path.join(paperclipDir, ".env");
    fs.writeFileSync(envPath, [
      "PAPERCLIP_HOME=\"/tmp/Paperclip worktree's data\"",
      "PAPERCLIP_INSTANCE_ID=KeepCase_Feature-42",
      "PAPERCLIP_CONTEXT=/tmp/context.json",
      "",
    ].join("\n"));

    const shellOutputs: string[] = [];
    const jsonOutputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      stdoutLogSpy.mockClear();
      stdoutWriteSpy.mockClear();
      await worktreeEnvCommand({ config: configPath });
      shellOutputs.push(String(stdoutLogSpy.mock.calls.at(-1)?.[0]));
      stdoutLogSpy.mockClear();
      await worktreeEnvCommand({ config: configPath, json: true });
      jsonOutputs.push(String(stdoutLogSpy.mock.calls.at(-1)?.[0]));
    }

    expect(shellOutputs[0]).toBe(shellOutputs[1]);
    expect(shellOutputs[0]).toContain("export PAPERCLIP_HOME='/tmp/Paperclip worktree'\"'\"'s data'");
    expect(shellOutputs[0]).toContain("export PAPERCLIP_INSTANCE_ID='KeepCase_Feature-42'");
    expect(jsonOutputs[0]).toBe(jsonOutputs[1]);
    expect(JSON.parse(jsonOutputs[0]!)).toMatchObject({
      PAPERCLIP_CONFIG: configPath,
      PAPERCLIP_HOME: "/tmp/Paperclip worktree's data",
      PAPERCLIP_INSTANCE_ID: "KeepCase_Feature-42",
      PAPERCLIP_CONTEXT: "/tmp/context.json",
    });
    expect(stdoutWriteSpy).not.toHaveBeenCalled();
    expect(stderrLogSpy).not.toHaveBeenCalled();
    expect(stderrWriteSpy).not.toHaveBeenCalled();
  });

  it("localizes worktree list markers while preserving git branch/path data and JSON bytes", async () => {
    const linkedPath = path.join(tempRoot, "linked-feature");
    execFileSync("git", ["init", "--initial-branch=main"], { cwd: tempRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: tempRoot });
    execFileSync("git", ["config", "user.name", "Paperclip Test"], { cwd: tempRoot });
    fs.writeFileSync(path.join(tempRoot, "README.md"), "worktree localization fixture\n");
    execFileSync("git", ["add", "README.md"], { cwd: tempRoot });
    execFileSync("git", ["commit", "-m", "fixture"], { cwd: tempRoot, stdio: "ignore" });
    execFileSync("git", ["worktree", "add", "--quiet", "--detach", linkedPath, "HEAD"], { cwd: tempRoot });
    fs.mkdirSync(path.join(tempRoot, ".paperclip"));
    fs.writeFileSync(path.join(tempRoot, ".paperclip", "config.json"), "{}\n");
    process.chdir(tempRoot);

    const humanOutputs: string[] = [];
    const jsonOutputs: string[] = [];
    for (const locale of ["en", "pt-BR"] as const) {
      setCliLocale(locale);
      stdoutWriteSpy.mockClear();
      await worktreeListCommand({});
      humanOutputs.push(stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])).join(""));
      stdoutWriteSpy.mockClear();
      stdoutLogSpy.mockClear();
      await worktreeListCommand({ json: true });
      jsonOutputs.push(String(stdoutLogSpy.mock.calls.at(-1)?.[0]));
    }

    expect(humanOutputs[0]).toContain(`main  ${tempRoot}  [current, paperclip]`);
    expect(humanOutputs[0]).toContain(`${linkedPath}  [no-paperclip-config]`);
    expect(humanOutputs[1]).toContain(`main  ${tempRoot}  [atual, config-paperclip]`);
    expect(humanOutputs[1]).toContain(`${linkedPath}  [sem-config-paperclip]`);
    expect(humanOutputs[0]).not.toBe(humanOutputs[1]);
    expect(jsonOutputs[0]).toBe(jsonOutputs[1]);
    const choices = JSON.parse(jsonOutputs[0]!) as Array<Record<string, unknown>>;
    expect(choices).toEqual(expect.arrayContaining([
      expect.objectContaining({ worktree: tempRoot, branch: "refs/heads/main", isCurrent: true, hasPaperclipConfig: true }),
      expect.objectContaining({ worktree: linkedPath, branch: null, isCurrent: false, hasPaperclipConfig: false }),
    ]));
    expect(stderrLogSpy).not.toHaveBeenCalled();
    expect(stderrWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("")).toBe("");
  });

  it("keeps git diagnostics untouched when worktree listing fails", async () => {
    process.chdir(tempRoot);
    const errors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      try {
        await worktreeListCommand({});
        throw new Error("expected git listing to fail outside a repository");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    expect(errors[0]).toBe(errors[1]);
    expect(errors[0]).toContain("fatal: not a git repository");
    expect(stdoutLogSpy).not.toHaveBeenCalled();
    expect(stdoutWriteSpy).not.toHaveBeenCalled();
  });

  it("localizes the empty-init lifecycle while preserving generated config, env values, and ports", async () => {
    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      const repoRoot = path.join(tempRoot, locale);
      const home = path.join(tempRoot, "homes", locale);
      const instanceId = `empty-${locale.toLowerCase()}`;
      fs.mkdirSync(repoRoot, { recursive: true });
      execFileSync("git", ["init", "--initial-branch=feature-empty"], { cwd: repoRoot, stdio: "ignore" });
      process.chdir(repoRoot);
      setCliLocale(locale);
      stdoutLogSpy.mockClear();
      stdoutWriteSpy.mockClear();
      await worktreeInitCommand({
        name: "empty-fixture",
        instance: instanceId,
        home,
        fromConfig: path.join(tempRoot, "missing-source.json"),
        empty: true,
      });

      const output = [
        ...stdoutLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
      ].join("\n");
      outputs.push(output);
      expect(output).toContain(locale === "en" ? "Repo config:" : "Configuração do repositório:");
      expect(output).toContain(locale === "en" ? "Repo env:" : "Arquivo env do repositório:");
      expect(output).toContain(locale === "en" ? "Isolated home:" : "Diretório isolado:");
      expect(output).toContain(locale === "en" ? "Worktree ready." : "Worktree pronta.");

      const configPath = path.join(repoRoot, ".paperclip", "config.json");
      const envPath = path.join(repoRoot, ".paperclip", ".env");
      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
        server: { port: number };
        database: { embeddedPostgresPort: number };
      };
      const envContents = fs.readFileSync(envPath, "utf8");
      expect(output).toContain(configPath);
      expect(output).toContain(envPath);
      expect(output).toContain(home);
      expect(output).toContain(instanceId);
      expect(output).toContain(`Server port: ${config.server.port}`.replace("Server port:", locale === "en" ? "Server port:" : "Porta do servidor:"));
      expect(output).toContain(`${config.database.embeddedPostgresPort}`);
      expect(envContents).toContain(`PAPERCLIP_INSTANCE_ID=${instanceId}`);
      expect(envContents).toContain("PAPERCLIP_WORKTREE_NAME=empty-fixture");
      expect(fs.existsSync(path.join(repoRoot, ".paperclip", "seed-empty"))).toBe(true);
      expect(fs.existsSync(path.join(repoRoot, ".paperclip", "seed-manifest.json"))).toBe(false);
      expect(fs.existsSync(path.join(repoRoot, ".paperclip", "seed-pending"))).toBe(false);

      stdoutLogSpy.mockClear();
      stdoutWriteSpy.mockClear();
      await worktreeEnsureSeededCommand({ config: configPath });
      const ensureOutput = [
        ...stdoutLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
      ].join("\n");
      expect(ensureOutput).toContain(locale === "en"
        ? "Explicitly empty instance; automatic database copying is disabled."
        : "Instância explicitamente vazia; a cópia automática do banco de dados está desativada.");
      expect(ensureOutput).toContain(locale === "en" ? "Empty worktree ready." : "Worktree vazia pronta.");
      expect(fs.existsSync(path.join(repoRoot, ".paperclip", "seed-empty"))).toBe(true);
      expect(fs.existsSync(path.join(repoRoot, ".paperclip", "seed-manifest.json"))).toBe(false);
    }
    expect(outputs[0]).not.toBe(outputs[1]);
    expect(stderrLogSpy).not.toHaveBeenCalled();
    expect(stderrWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("")).toBe("");
  });

  it("localizes worktree init validation but leaves file parser diagnostics unchanged", async () => {
    const repoRoot = path.join(tempRoot, "init-errors");
    fs.mkdirSync(repoRoot, { recursive: true });
    execFileSync("git", ["init", "--initial-branch=init-errors"], { cwd: repoRoot, stdio: "ignore" });
    process.chdir(repoRoot);

    const invalidSeedErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      try {
        await worktreeInitCommand({ seedMode: "fast", home: path.join(tempRoot, "invalid-seed-home") });
        throw new Error("expected invalid seed mode to fail");
      } catch (error) {
        invalidSeedErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    expect(invalidSeedErrors[0]).toContain('Modo de cópia não suportado "fast"');
    expect(invalidSeedErrors[1]).toContain('Unsupported seed mode "fast"');

    const existingConfigDir = path.join(repoRoot, ".paperclip");
    fs.mkdirSync(existingConfigDir, { recursive: true });
    const configPath = path.join(existingConfigDir, "config.json");
    fs.writeFileSync(configPath, "{}\n");
    const existingConfigErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      try {
        await worktreeInitCommand({
          name: "init-errors",
          home: path.join(tempRoot, "existing-home"),
          fromConfig: path.join(tempRoot, "missing-source-for-existing.json"),
        });
        throw new Error("expected existing config to fail");
      } catch (error) {
        existingConfigErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    expect(existingConfigErrors[0]).toContain("A configuração da worktree já existe em");
    expect(existingConfigErrors[1]).toContain("Worktree config already exists at");
    expect(existingConfigErrors[0]).toContain(configPath);
    expect(existingConfigErrors[1]).toContain(configPath);

    const malformedSourcePath = path.join(tempRoot, "malformed-source.json");
    fs.writeFileSync(malformedSourcePath, "{ invalid json\n");
    const externalErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      try {
        await worktreeInitCommand({ empty: true, fromConfig: malformedSourcePath, home: path.join(tempRoot, `malformed-home-${locale}`) });
        throw new Error("expected malformed source config to fail");
      } catch (error) {
        externalErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    expect(externalErrors[0]).toBe(externalErrors[1]);
    expect(externalErrors[0]).toContain(`Failed to parse JSON at ${malformedSourcePath}`);
    expect(stderrLogSpy).not.toHaveBeenCalled();
  });

  it("localizes ensure-seeded registration errors and preserves malformed manifest diagnostics", async () => {
    const configPath = path.join(tempRoot, "ensure-error", ".paperclip", "config.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    const registrationErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      try {
        await worktreeEnsureSeededCommand({
          config: configPath,
          registeredBaseWorkspaceCwd: "/registered/source/workspace",
        });
        throw new Error("expected incomplete seed registration to fail");
      } catch (error) {
        registrationErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    expect(registrationErrors[0]).toContain("O registro da cópia da worktree está incompleto");
    expect(registrationErrors[1]).toContain("Managed worktree seed registration is incomplete");

    const manifestPath = path.join(path.dirname(configPath), "seed-manifest.json");
    fs.writeFileSync(manifestPath, "{ invalid manifest\n");
    const manifestErrors: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      try {
        await worktreeEnsureSeededCommand({ config: configPath });
        throw new Error("expected malformed seed manifest to fail");
      } catch (error) {
        manifestErrors.push(error instanceof Error ? error.message : String(error));
      }
    }
    expect(manifestErrors[0]).toBe(manifestErrors[1]);
    expect(manifestErrors[0]).toContain(`Invalid worktree seed manifest at ${manifestPath}`);
    expect(stderrLogSpy).not.toHaveBeenCalled();
  });

  it("localizes worktree cleanup safety and completion while preserving Git changes until forced", async () => {
    let activeHome = "";
    vi.spyOn(os, "homedir").mockImplementation(() => activeHome);

    for (const locale of ["pt-BR", "en"] as const) {
      const repoRoot = path.join(tempRoot, "cleanup", locale, "repo");
      activeHome = path.join(tempRoot, "cleanup", locale, "home");
      const instanceHome = path.join(tempRoot, "cleanup", locale, "instances-home");
      const branchName = "paperclip-cleanup-fixture";
      const targetPath = path.join(activeHome, branchName);
      const instanceId = `cleanup-${locale.toLowerCase()}`;
      const instanceRoot = path.join(instanceHome, "instances", instanceId);

      fs.mkdirSync(repoRoot, { recursive: true });
      fs.mkdirSync(activeHome, { recursive: true });
      execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoRoot, stdio: "ignore" });
      execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: repoRoot });
      execFileSync("git", ["config", "user.name", "Paperclip Test"], { cwd: repoRoot });
      fs.writeFileSync(path.join(repoRoot, "README.md"), "base branch\n");
      execFileSync("git", ["add", "README.md"], { cwd: repoRoot });
      execFileSync("git", ["commit", "-m", "base"], { cwd: repoRoot, stdio: "ignore" });
      execFileSync("git", ["worktree", "add", "--quiet", "-b", branchName, targetPath, "HEAD"], { cwd: repoRoot });
      fs.writeFileSync(path.join(targetPath, "README.md"), "unique feature commit\n");
      execFileSync("git", ["add", "README.md"], { cwd: targetPath });
      execFileSync("git", ["commit", "-m", "unique feature"], { cwd: targetPath, stdio: "ignore" });
      execFileSync("git", ["update-ref", `refs/remotes/origin/${branchName}`, "main"], { cwd: repoRoot });
      fs.writeFileSync(path.join(targetPath, "README.md"), "uncommitted change\n");
      fs.mkdirSync(instanceRoot, { recursive: true });
      process.chdir(repoRoot);
      setCliLocale(locale);

      const captureOutput = () => [
        ...stdoutLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stderrLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stderrWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
      ].join("\n");

      stdoutLogSpy.mockClear();
      stdoutWriteSpy.mockClear();
      stderrLogSpy.mockClear();
      stderrWriteSpy.mockClear();
      let safetyError = "";
      try {
        await worktreeCleanupCommand("cleanup-fixture", {
          home: instanceHome,
          instance: instanceId,
        });
      } catch (error) {
        safetyError = error instanceof Error ? error.message : String(error);
      }
      const safetyOutput = captureOutput();
      expect(safetyError).toBe(locale === "en"
        ? "Safety checks failed. Resolve the issues above or re-run with --force."
        : "As verificações de segurança falharam. Resolva os problemas acima ou execute novamente com --force.");
      expect(safetyOutput).toContain(locale === "en"
        ? `Branch "${branchName}" has commits not found on any other branch or remote.`
        : `O branch "${branchName}" tem commits que não existem em nenhum outro branch ou remoto.`);
      expect(safetyOutput).toContain(locale === "en"
        ? `Worktree directory ${targetPath} has uncommitted changes.`
        : `O diretório da worktree ${targetPath} tem alterações sem commit.`);
      expect(fs.existsSync(targetPath)).toBe(true);
      expect(fs.existsSync(instanceRoot)).toBe(true);
      expect(execFileSync("git", ["branch", "--list", branchName], { cwd: repoRoot, encoding: "utf8" }).trim()).toBe(`+ ${branchName}`);

      execFileSync("git", ["checkout", "--", "README.md"], { cwd: targetPath });
      stdoutLogSpy.mockClear();
      stdoutWriteSpy.mockClear();
      stderrLogSpy.mockClear();
      stderrWriteSpy.mockClear();
      let staleRemoteSafetyError = "";
      try {
        await worktreeCleanupCommand("cleanup-fixture", {
          home: instanceHome,
          instance: instanceId,
        });
      } catch (error) {
        staleRemoteSafetyError = error instanceof Error ? error.message : String(error);
      }
      const staleRemoteOutput = captureOutput();
      expect(staleRemoteSafetyError).toBe(safetyError);
      expect(staleRemoteOutput).toContain(locale === "en"
        ? `Branch "${branchName}" has commits not found on any other branch or remote.`
        : `O branch "${branchName}" tem commits que não existem em nenhum outro branch ou remoto.`);
      expect(staleRemoteOutput).not.toContain(locale === "en"
        ? "uncommitted changes"
        : "alterações sem commit");
      expect(fs.existsSync(targetPath)).toBe(true);
      expect(fs.existsSync(instanceRoot)).toBe(true);

      stdoutLogSpy.mockClear();
      stdoutWriteSpy.mockClear();
      stderrLogSpy.mockClear();
      stderrWriteSpy.mockClear();
      await worktreeCleanupCommand("cleanup-fixture", {
        home: instanceHome,
        instance: instanceId,
        force: true,
      });
      const forcedOutput = captureOutput();
      expect(forcedOutput).toContain(locale === "en" ? "Overridden by --force:" : "Ignorado por --force:");
      expect(forcedOutput).toContain(locale === "en" ? "Cleanup complete." : "Limpeza concluída.");
      expect(fs.existsSync(targetPath)).toBe(false);
      expect(fs.existsSync(instanceRoot)).toBe(false);
      expect(execFileSync("git", ["branch", "--list", branchName], { cwd: repoRoot, encoding: "utf8" }).trim()).toBe("");
    }
  });

  it("blocks cleanup and preserves Git diagnostics when a safety check cannot be completed", async () => {
    let activeHome = "";
    vi.spyOn(os, "homedir").mockImplementation(() => activeHome);

    for (const locale of ["pt-BR", "en"] as const) {
      for (const failureMode of ["branch-log", "worktree-status"] as const) {
        const repoRoot = path.join(tempRoot, "cleanup-check-error", locale, failureMode, "repo");
        activeHome = path.join(tempRoot, "cleanup-check-error", locale, failureMode, "home");
        const instanceHome = path.join(tempRoot, "cleanup-check-error", locale, failureMode, "instances-home");
        const branchName = "paperclip-cleanup-check-error";
        const targetPath = path.join(activeHome, branchName);
        const instanceId = `cleanup-check-${locale.toLowerCase()}-${failureMode}`;
        const instanceRoot = path.join(instanceHome, "instances", instanceId);

        fs.mkdirSync(repoRoot, { recursive: true });
        fs.mkdirSync(activeHome, { recursive: true });
        execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoRoot, stdio: "ignore" });
        execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: repoRoot });
        execFileSync("git", ["config", "user.name", "Paperclip Test"], { cwd: repoRoot });
        fs.writeFileSync(path.join(repoRoot, "README.md"), "base branch\n");
        execFileSync("git", ["add", "README.md"], { cwd: repoRoot });
        execFileSync("git", ["commit", "-m", "base"], { cwd: repoRoot, stdio: "ignore" });
        execFileSync("git", ["worktree", "add", "--quiet", "-b", branchName, targetPath, "HEAD"], { cwd: repoRoot });

        let expectedGitDiagnostic = "";
        if (failureMode === "branch-log") {
          fs.writeFileSync(path.join(targetPath, "README.md"), "unique commit\n");
          execFileSync("git", ["add", "README.md"], { cwd: targetPath });
          execFileSync("git", ["commit", "-m", "unique feature"], { cwd: targetPath, stdio: "ignore" });
          const commitHash = execFileSync("git", ["rev-parse", "HEAD"], { cwd: targetPath, encoding: "utf8" }).trim();
          const commonGitDir = path.resolve(repoRoot, execFileSync("git", ["rev-parse", "--git-common-dir"], { cwd: repoRoot, encoding: "utf8" }).trim());
          const commitObjectPath = path.join(commonGitDir, "objects", commitHash.slice(0, 2), commitHash.slice(2));
          expectedGitDiagnostic = "fatal: bad object";
          expect(fs.existsSync(commitObjectPath)).toBe(true);
          fs.unlinkSync(commitObjectPath);
        } else {
          const indexPath = execFileSync("git", ["rev-parse", "--git-path", "index"], { cwd: targetPath, encoding: "utf8" }).trim();
          fs.writeFileSync(path.resolve(targetPath, indexPath), "invalid git index\n");
          expectedGitDiagnostic = "index file smaller than expected";
        }

        fs.mkdirSync(instanceRoot, { recursive: true });
        process.chdir(repoRoot);
        setCliLocale(locale);
        stdoutLogSpy.mockClear();
        stdoutWriteSpy.mockClear();
        stderrLogSpy.mockClear();
        stderrWriteSpy.mockClear();
        let safetyError = "";
        try {
          await worktreeCleanupCommand("cleanup-check-error", {
            home: instanceHome,
            instance: instanceId,
          });
        } catch (error) {
          safetyError = error instanceof Error ? error.message : String(error);
        }
        const output = [
          ...stdoutLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
          ...stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
          ...stderrLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
          ...stderrWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ].join("\n");

        expect(safetyError).toBe(locale === "en"
          ? "Safety checks failed. Resolve the issues above or re-run with --force."
          : "As verificações de segurança falharam. Resolva os problemas acima ou execute novamente com --force.");
        expect(output).toContain(locale === "en"
          ? "Could not verify cleanup safety:"
          : "Não foi possível verificar a segurança da limpeza:");
        expect(output).toContain(expectedGitDiagnostic);
        expect(fs.existsSync(targetPath)).toBe(true);
        expect(fs.existsSync(instanceRoot)).toBe(true);
        expect(execFileSync("git", ["branch", "--list", branchName], { cwd: repoRoot, encoding: "utf8" }).trim()).toContain(branchName);
      }
    }
  });

  it("stops cleanup when Git refuses to remove a locked worktree and preserves stderr", async () => {
    let activeHome = "";
    vi.spyOn(os, "homedir").mockImplementation(() => activeHome);

    for (const locale of ["pt-BR", "en"] as const) {
      const repoRoot = path.join(tempRoot, "cleanup-locked", locale, "repo");
      activeHome = path.join(tempRoot, "cleanup-locked", locale, "home");
      const instanceHome = path.join(tempRoot, "cleanup-locked", locale, "instances-home");
      const branchName = "paperclip-locked-fixture";
      const targetPath = path.join(activeHome, branchName);
      const instanceId = `locked-${locale.toLowerCase()}`;
      const instanceRoot = path.join(instanceHome, "instances", instanceId);
      const lockReason = "fixture lock";

      fs.mkdirSync(repoRoot, { recursive: true });
      fs.mkdirSync(activeHome, { recursive: true });
      execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoRoot, stdio: "ignore" });
      execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: repoRoot });
      execFileSync("git", ["config", "user.name", "Paperclip Test"], { cwd: repoRoot });
      fs.writeFileSync(path.join(repoRoot, "README.md"), "base branch\n");
      execFileSync("git", ["add", "README.md"], { cwd: repoRoot });
      execFileSync("git", ["commit", "-m", "base"], { cwd: repoRoot, stdio: "ignore" });
      execFileSync("git", ["worktree", "add", "--quiet", "-b", branchName, targetPath, "HEAD"], { cwd: repoRoot });
      execFileSync("git", ["worktree", "lock", targetPath, "--reason", lockReason], { cwd: repoRoot });
      fs.mkdirSync(instanceRoot, { recursive: true });

      let expectedGitStderr = "";
      try {
        execFileSync("git", ["worktree", "remove", targetPath], {
          cwd: repoRoot,
          stdio: ["ignore", "pipe", "pipe"],
        });
      } catch (error) {
        const stderr = error && typeof error === "object" && "stderr" in error ? error.stderr : undefined;
        expectedGitStderr = Buffer.isBuffer(stderr) ? stderr.toString("utf8").trim() : String(stderr ?? "").trim();
      }
      expect(expectedGitStderr).toContain("fatal: cannot remove a locked working tree");
      expect(expectedGitStderr).toContain(lockReason);

      process.chdir(repoRoot);
      setCliLocale(locale);
      stdoutLogSpy.mockClear();
      stdoutWriteSpy.mockClear();
      stderrLogSpy.mockClear();
      stderrWriteSpy.mockClear();
      let cleanupError = "";
      try {
        await worktreeCleanupCommand("locked-fixture", {
          home: instanceHome,
          instance: instanceId,
        });
      } catch (error) {
        cleanupError = error instanceof Error ? error.message : String(error);
      }
      const output = [
        ...stdoutLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stderrLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stderrWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
      ].join("\n");

      expect(cleanupError).toBe(expectedGitStderr);
      expect(output).toContain(locale === "en"
        ? "Could not remove worktree cleanly, will prune instead."
        : "Não foi possível remover a worktree normalmente; ela será removida do registro.");
      expect(output).not.toContain(locale === "en" ? "Cleanup complete." : "Limpeza concluída.");
      expect(fs.existsSync(targetPath)).toBe(true);
      expect(fs.existsSync(instanceRoot)).toBe(true);
      expect(execFileSync("git", ["branch", "--list", branchName], { cwd: repoRoot, encoding: "utf8" }).trim()).toContain(branchName);
      expect(execFileSync("git", ["worktree", "list", "--porcelain"], { cwd: repoRoot, encoding: "utf8" })).toContain(targetPath);
    }
  });

  it("localizes worktree:make lifecycle and best-effort install status while preserving installer diagnostics", async () => {
    let activeHome = "";
    vi.spyOn(os, "homedir").mockImplementation(() => activeHome);

    for (const locale of ["pt-BR", "en"] as const) {
      const repoRoot = path.join(tempRoot, "make", locale, "repo");
      activeHome = path.join(tempRoot, "make", locale, "home");
      const instanceHome = path.join(tempRoot, "make", locale, "instances-home");
      const worktreeName = "paperclip-make-fixture";
      const targetPath = path.join(activeHome, worktreeName);
      const instanceId = `make-${locale.toLowerCase()}`;
      const installerPath = path.join(tempRoot, `fixture-pnpm-${locale.toLowerCase()}`);

      fs.mkdirSync(repoRoot, { recursive: true });
      fs.mkdirSync(activeHome, { recursive: true });
      execFileSync("git", ["init", "--initial-branch=main"], { cwd: repoRoot, stdio: "ignore" });
      execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: repoRoot });
      execFileSync("git", ["config", "user.name", "Paperclip Test"], { cwd: repoRoot });
      fs.writeFileSync(path.join(repoRoot, "README.md"), "worktree make fixture\n");
      fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({ name: "make-fixture", version: "1.0.0" }, null, 2));
      execFileSync("git", ["add", "README.md", "package.json"], { cwd: repoRoot });
      execFileSync("git", ["commit", "-m", "fixture"], { cwd: repoRoot, stdio: "ignore" });
      fs.writeFileSync(installerPath, "#!/usr/bin/env node\nprocess.stderr.write('fixture installer failure\\n');\nprocess.exit(1);\n");
      fs.chmodSync(installerPath, 0o755);
      process.chdir(repoRoot);
      setCliLocale(locale);
      process.env.npm_execpath = installerPath;
      stdoutLogSpy.mockClear();
      stdoutWriteSpy.mockClear();
      stderrLogSpy.mockClear();
      stderrWriteSpy.mockClear();

      await worktreeMakeCommand("make-fixture", {
        seed: false,
        home: instanceHome,
        instance: instanceId,
      });
      const output = [
        ...stdoutLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stderrLogSpy.mock.calls.map((call: unknown[]) => String(call[0])),
        ...stderrWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])),
      ].join("\n");

      expect(output).toContain(locale === "en" ? `Created git worktree at ${targetPath}.` : `Worktree do Git criada em ${targetPath}.`);
      expect(output).toContain(locale === "en"
        ? "Failed to install dependencies (continuing anyway)."
        : "Falha ao instalar dependências (continuando mesmo assim).");
      expect(output).toContain("fixture installer failure");
      expect(output).toContain(locale === "en" ? "Repo config:" : "Configuração do repositório:");
      expect(output).toContain(locale === "en" ? "Worktree ready." : "Worktree pronta.");
      expect(fs.existsSync(path.join(targetPath, ".paperclip", "config.json"))).toBe(true);
      expect(fs.existsSync(path.join(targetPath, ".paperclip", ".env"))).toBe(true);
      expect(execFileSync("git", ["branch", "--list", worktreeName], { cwd: repoRoot, encoding: "utf8" }).trim()).toBe(`+ ${worktreeName}`);

      let existingTargetError = "";
      try {
        await worktreeMakeCommand("make-fixture", {
          seed: false,
          home: instanceHome,
          instance: instanceId,
        });
      } catch (error) {
        existingTargetError = error instanceof Error ? error.message : String(error);
      }
      expect(existingTargetError).toBe(locale === "en"
        ? `Target path already exists: ${targetPath}`
        : `O caminho de destino já existe: ${targetPath}`);

      let invalidNameError = "";
      try {
        await worktreeMakeCommand("invalid/name", { seed: false, home: instanceHome });
      } catch (error) {
        invalidNameError = error instanceof Error ? error.message : String(error);
      }
      expect(invalidNameError).toBe(locale === "en"
        ? "Worktree name must contain only letters, numbers, dots, underscores, or dashes."
        : "O nome da worktree deve conter apenas letras, números, pontos, sublinhados ou hífens.");
    }
  });
});
