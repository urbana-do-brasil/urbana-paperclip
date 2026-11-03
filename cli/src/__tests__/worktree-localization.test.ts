import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerWorktreeCommands,
  worktreeEnvCommand,
  worktreeListCommand,
} from "../commands/worktree.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { cliMessage, localizeHelpTitle, parseCliLocale, setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const ORIGINAL_ARGV = process.argv;
const ORIGINAL_CWD = process.cwd();

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
});
