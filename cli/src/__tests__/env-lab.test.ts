import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as p from "@clack/prompts";
import * as sshFixture from "@paperclipai/adapter-utils/ssh";
import {
  buildEnvLabCleanupCommand,
  collectEnvLabDoctorStatus,
  envLabDownCommand,
  envLabDoctorCommand,
  envLabStatusCommand,
  envLabUpCommand,
  resolveEnvLabCliInvocation,
  resolveEnvLabSshStatePath,
  registerEnvLabCommands,
} from "../commands/env-lab.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { getCliLocale, setCliLocale } from "../localization/index.js";

describe("env-lab command", () => {
  it("resolves the default SSH fixture state path under the instance root", () => {
    const statePath = resolveEnvLabSshStatePath("fixture-test");

    expect(statePath).toContain(
      path.join("instances", "fixture-test", "env-lab", "ssh-fixture", "state.json"),
    );
  });

  it("reports doctor status for an instance without a running fixture", async () => {
    const status = await collectEnvLabDoctorStatus({ instance: "fixture-test-missing" });

    expect(status.statePath).toContain(
      path.join("instances", "fixture-test-missing", "env-lab", "ssh-fixture", "state.json"),
    );
    expect(typeof status.ssh.supported).toBe("boolean");
    expect(status.ssh.running).toBe(false);
    expect(status.ssh.environment).toBeNull();
  });
});

describe("env-lab cleanup command hint", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  // Resolve a source-checkout invocation for a fabricated checkout root. A source
  // checkout runs this module from `<root>/src/commands/env-lab.ts`, so the
  // resolver reads that layout and returns the tsx runner and source entry.
  function sourceInvocation(root: string) {
    return resolveEnvLabCliInvocation(path.join(root, "src", "commands", "env-lab.ts"));
  }

  // Resolve a bundled-build invocation for a fabricated package root. The bundled
  // build runs this module from `<root>/dist/index.js`, so the resolver returns
  // that file as the entry with no tsx runner.
  function bundledInvocation(root: string) {
    return resolveEnvLabCliInvocation(path.join(root, "dist", "index.js"));
  }

  // Split a command that uses POSIX single-quoting into its argument tokens. The
  // parser reads a single-quoted span verbatim and reads `\'` outside a span as a
  // literal single quote. This is the same rule a POSIX shell obeys, so a token
  // list proves the shell reads the exact paths and runs no embedded command.
  function tokenizePosix(command: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let started = false;
    let inQuotes = false;
    for (let index = 0; index < command.length; index += 1) {
      const character = command[index];
      if (inQuotes) {
        if (character === "'") {
          inQuotes = false;
        } else {
          current += character;
        }
      } else if (character === "'") {
        inQuotes = true;
        started = true;
      } else if (character === "\\") {
        index += 1;
        current += command[index];
        started = true;
      } else if (character === " ") {
        if (started) {
          tokens.push(current);
          current = "";
          started = false;
        }
      } else {
        current += character;
        started = true;
      }
    }
    if (started) {
      tokens.push(current);
    }
    return tokens;
  }

  // Return the two path arguments from the `node` command.
  function extractPaths(command: string): string[] {
    const tokens = tokenizePosix(command);
    return tokens.slice(1, 3);
  }

  it("resolves both CLI paths to absolute paths", () => {
    const command = buildEnvLabCleanupCommand();
    const paths = extractPaths(command);

    expect(paths).toHaveLength(2);
    for (const resolved of paths) {
      expect(path.isAbsolute(resolved)).toBe(true);
    }
    expect(command.endsWith("env-lab down")).toBe(true);
  });

  it("points at the checked-out tsx runner and cli source entry", () => {
    const [tsxBin, entry] = extractPaths(buildEnvLabCleanupCommand());

    expect(tsxBin).toContain(
      path.join("cli", "node_modules", "tsx", "dist", "cli.mjs"),
    );
    expect(entry).toContain(path.join("cli", "src", "index.ts"));
  });

  it("returns the same command from a checkout subdirectory", () => {
    const fromRoot = buildEnvLabCleanupCommand();

    // Simulate a contributor who runs `env-lab doctor` from a subdirectory of
    // the checkout. A relative path would change with the working directory, so
    // this asserts the command stays constant.
    process.chdir(path.dirname(originalCwd));
    const fromParent = buildEnvLabCleanupCommand();
    process.chdir(originalCwd);

    expect(fromParent).toBe(fromRoot);
  });

  it("never restores the unsafe pnpm invocation forms", () => {
    const command = buildEnvLabCleanupCommand();

    // The bare `pnpm paperclipai` script form is unsafe. The `pnpm exec` form
    // does not resolve the CLI binary. Keep both out of the hint.
    expect(command).not.toContain("pnpm paperclipai");
    expect(command).not.toContain("pnpm exec paperclipai");
  });

  // A checkout path can hold shell metacharacters. A contributor copies the hint
  // and pastes it into a shell. The hint must neutralize each metacharacter, so
  // the shell reads the exact path and runs no embedded command. Each case below
  // is a checkout root with one dangerous construct.
  const dangerousRoots = [
    { label: "a dollar sign", root: "/tmp/env$lab/checkout" },
    { label: "command substitution", root: "/tmp/$(touch pwned)/checkout" },
    { label: "backticks", root: "/tmp/`touch pwned`/checkout" },
    { label: "a double quote", root: '/tmp/env"lab/checkout' },
    { label: "a single quote", root: "/tmp/env'lab/checkout" },
  ];

  for (const { label, root } of dangerousRoots) {
    it(`keeps a checkout path with ${label} inert in the cleanup hint`, () => {
      const command = buildEnvLabCleanupCommand({ invocation: sourceInvocation(root) });
      const tokens = tokenizePosix(command);
      const tsxBin = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
      const entry = path.join(root, "src", "index.ts");

      // The shell reads the exact paths as single argument tokens. It does not
      // split the paths or run the embedded construct.
      expect(tokens).toEqual(["node", tsxBin, entry, "env-lab", "down"]);

      // The old double-quoted form left `$(...)`, a backtick pair, and `$NAME`
      // live. Do not restore it.
      expect(command).not.toContain(`"${tsxBin}"`);
      expect(command).not.toContain(`"${entry}"`);
    });
  }

  it("forwards the inspected instance to the cleanup hint", () => {
    const command = buildEnvLabCleanupCommand({
      instance: "fixture-test",
      invocation: sourceInvocation("/tmp/checkout"),
    });
    const tokens = tokenizePosix(command);

    // The hint ends with `--instance <id>`, so it stops the fixture the doctor
    // command diagnosed, not the default instance.
    expect(tokens.slice(-2)).toEqual(["--instance", "fixture-test"]);
  });

  it("omits the instance flag when the doctor command uses the default instance", () => {
    const command = buildEnvLabCleanupCommand({ invocation: sourceInvocation("/tmp/checkout") });

    // Without a selected instance, `env-lab down` resolves the same default
    // instance the doctor command inspected. Do not add an empty flag.
    expect(command).not.toContain("--instance");
    expect(command.endsWith("env-lab down")).toBe(true);
  });

  it("keeps an instance id with shell metacharacters inert", () => {
    const command = buildEnvLabCleanupCommand({
      instance: "$(touch pwned)",
      invocation: sourceInvocation("/tmp/checkout"),
    });
    const tokens = tokenizePosix(command);

    // The shell reads the instance id as one literal token and runs no embedded
    // command.
    expect(tokens.slice(-2)).toEqual(["--instance", "$(touch pwned)"]);
    expect(command).not.toContain('"$(touch pwned)"');
  });

  it("runs the bundled dist entry directly, without the tsx runner", () => {
    const command = buildEnvLabCleanupCommand({
      invocation: bundledInvocation("/opt/pkg"),
    });
    const tokens = tokenizePosix(command);

    // The published package ships one `dist/index.js` file and no tsx runner, so
    // node runs that file directly.
    expect(tokens).toEqual(["node", path.join("/opt/pkg", "dist", "index.js"), "env-lab", "down"]);
    expect(command).not.toContain("tsx");
    expect(command).not.toContain(path.join("src", "index.ts"));
  });

  it("keeps a bundled package path with shell metacharacters inert", () => {
    const root = "/opt/$(touch pwned)/pkg";
    const command = buildEnvLabCleanupCommand({ invocation: bundledInvocation(root) });
    const tokens = tokenizePosix(command);
    const entry = path.join(root, "dist", "index.js");

    // The shell reads the exact bundled path as one token and runs no embedded
    // command.
    expect(tokens).toEqual(["node", entry, "env-lab", "down"]);
    expect(command).not.toContain(`"${entry}"`);
  });
});

describe("env-lab doctor cleanup hint instance", () => {
  const originalInstanceId = process.env.PAPERCLIP_INSTANCE_ID;
  const originalLocale = getCliLocale();

  beforeEach(() => {
    setCliLocale("en");
  });

  afterEach(() => {
    if (originalInstanceId === undefined) {
      delete process.env.PAPERCLIP_INSTANCE_ID;
    } else {
      process.env.PAPERCLIP_INSTANCE_ID = originalInstanceId;
    }
    setCliLocale(originalLocale);
    vi.restoreAllMocks();
  });

  // Capture the cleanup hint the doctor prints. The doctor reports through
  // `p.log`, so the test replaces each channel and reads the captured lines.
  function captureDoctorMessages(): string[] {
    const messages: string[] = [];
    vi.spyOn(p.log, "message").mockImplementation((message?: string | string[]) => {
      messages.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
    });
    vi.spyOn(p.log, "success").mockImplementation(() => {});
    vi.spyOn(p.log, "warn").mockImplementation(() => {});
    vi.spyOn(p.log, "info").mockImplementation(() => {});
    return messages;
  }

  it("pins the PAPERCLIP_INSTANCE_ID instance when opts.instance is absent", async () => {
    // The doctor diagnoses the instance that `PAPERCLIP_INSTANCE_ID` selects.
    // The cleanup hint must target that instance, not the default instance.
    process.env.PAPERCLIP_INSTANCE_ID = "env-selected-instance";
    const messages = captureDoctorMessages();

    await envLabDoctorCommand({ instance: undefined });

    const cleanup = messages.find((message) => message.startsWith("Cleanup:"));
    expect(cleanup).toBeDefined();
    expect(cleanup).toContain("env-lab down");
    expect(cleanup).toContain("--instance");
    expect(cleanup).toContain("env-selected-instance");
  });

  it("pins the explicit instance over PAPERCLIP_INSTANCE_ID", async () => {
    // An explicit `--instance` flag overrides the environment variable, so the
    // hint targets the explicit instance the doctor inspected.
    process.env.PAPERCLIP_INSTANCE_ID = "env-selected-instance";
    const messages = captureDoctorMessages();

    await envLabDoctorCommand({ instance: "explicit-instance" });

    const cleanup = messages.find((message) => message.startsWith("Cleanup:"));
    expect(cleanup).toBeDefined();
    expect(cleanup).toContain("--instance");
    expect(cleanup).toContain("explicit-instance");
    expect(cleanup).not.toContain("env-selected-instance");
  });
});

describe("env-lab localization", () => {
  const originalEnv = { ...process.env };
  const originalLocale = getCliLocale();
  let tempHome: string;
  let messages: string[];
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-env-lab-l10n-"));
    process.env = { ...originalEnv, PAPERCLIP_HOME: tempHome, PAPERCLIP_INSTANCE_ID: "l10n-fixture" };
    messages = [];
    stdoutWriteSpy = vi.spyOn(process.stdout, "write").mockImplementation((() => true) as never);
    vi.spyOn(p.log, "message").mockImplementation((message?: string | string[]) => {
      messages.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
    });
    vi.spyOn(p.log, "success").mockImplementation((message?: string | string[]) => {
      messages.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
    });
    vi.spyOn(p.log, "warn").mockImplementation((message?: string | string[]) => {
      messages.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
    });
    vi.spyOn(p.log, "info").mockImplementation((message?: string | string[]) => {
      messages.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    setCliLocale(originalLocale);
    vi.restoreAllMocks();
    fs.rmSync(tempHome, { recursive: true, force: true });
  });

  it("localizes missing-fixture status and safe no-op shutdown while keeping JSON identical", async () => {
    const instance = "l10n-fixture";
    const statePath = resolveEnvLabSshStatePath(instance);
    const statusJson: string[] = [];
    const downJson: string[] = [];
    const doctorJson: string[] = [];
    const doctorHuman: string[] = [];

    for (const locale of ["en", "pt-BR"] as const) {
      setCliLocale(locale);
      messages = [];
      expect(fs.existsSync(statePath)).toBe(false);
      await envLabStatusCommand({ instance });
      expect(messages.join("\n")).toContain(locale === "en"
        ? `SSH env-lab fixture is not running (${statePath}).`
        : `O fixture SSH do env-lab não está em execução (${statePath}).`);
      expect(fs.existsSync(statePath)).toBe(false);

      stdoutWriteSpy.mockClear();
      await envLabStatusCommand({ instance, json: true });
      statusJson.push(stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])).join(""));

      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, "{ invalid fixture state\n");
      messages = [];
      await envLabDownCommand({ instance });
      expect(messages.join("\n")).toContain(locale === "en"
        ? `No SSH env-lab fixture was running (${statePath}).`
        : `Nenhum fixture SSH do env-lab estava em execução (${statePath}).`);
      expect(fs.readFileSync(statePath, "utf8")).toBe("{ invalid fixture state\n");

      stdoutWriteSpy.mockClear();
      await envLabDownCommand({ instance, json: true });
      downJson.push(stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])).join(""));
      expect(fs.readFileSync(statePath, "utf8")).toBe("{ invalid fixture state\n");

      messages = [];
      await envLabDoctorCommand({ instance });
      doctorHuman.push(messages.join("\n"));
      expect(messages.join("\n")).toContain(locale === "en"
        ? "SSH env-lab fixture is not running."
        : "O fixture SSH do env-lab não está em execução.");
      expect(messages.join("\n")).toContain(locale === "en" ? "Cleanup:" : "Limpeza:");
      expect(fs.readFileSync(statePath, "utf8")).toBe("{ invalid fixture state\n");

      stdoutWriteSpy.mockClear();
      await envLabDoctorCommand({ instance, json: true });
      doctorJson.push(stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])).join(""));
      expect(fs.readFileSync(statePath, "utf8")).toBe("{ invalid fixture state\n");
      fs.rmSync(statePath, { force: true });
    }

    expect(statusJson[0]).toBe(statusJson[1]);
    expect(downJson[0]).toBe(downJson[1]);
    expect(doctorJson[0]).toBe(doctorJson[1]);
    expect(JSON.parse(statusJson[0]!)).toMatchObject({ running: false, state: null, environment: null, statePath });
    expect(JSON.parse(downJson[0]!)).toEqual({ stopped: false, statePath });
    expect(JSON.parse(doctorJson[0]!)).toMatchObject({
      statePath,
      ssh: { running: false, state: null, environment: null },
    });
    expect(doctorHuman[0]).not.toBe(doctorHuman[1]);
  });

  it("localizes successful startup details without changing its JSON payload", async () => {
    const instance = "l10n-fixture";
    const statePath = resolveEnvLabSshStatePath(instance);
    const state: Awaited<ReturnType<typeof sshFixture.startSshEnvLabFixture>> = {
      kind: "ssh_openbsd",
      bindHost: "127.0.0.1",
      host: "127.0.0.1",
      port: 2222,
      username: "fixture-user",
      rootDir: path.dirname(statePath),
      workspaceDir: path.join(path.dirname(statePath), "workspace"),
      statePath,
      pid: 12345,
      createdAt: "2026-01-01T00:00:00.000Z",
      clientPrivateKeyPath: path.join(path.dirname(statePath), "client_key"),
      clientPublicKeyPath: path.join(path.dirname(statePath), "client_key.pub"),
      hostPrivateKeyPath: path.join(path.dirname(statePath), "host_key"),
      hostPublicKeyPath: path.join(path.dirname(statePath), "host_key.pub"),
      authorizedKeysPath: path.join(path.dirname(statePath), "authorized_keys"),
      knownHostsPath: path.join(path.dirname(statePath), "known_hosts"),
      sshdConfigPath: path.join(path.dirname(statePath), "sshd_config"),
      sshdLogPath: path.join(path.dirname(statePath), "sshd.log"),
    };
    const environment: Awaited<ReturnType<typeof sshFixture.buildSshEnvLabFixtureConfig>> = {
      host: state.host,
      port: state.port,
      username: state.username,
      remoteWorkspacePath: state.workspaceDir,
      privateKey: "fixture-private-key",
      knownHosts: "fixture-known-hosts",
      strictHostKeyChecking: true,
    };
    const startSpy = vi.spyOn(sshFixture, "startSshEnvLabFixture").mockResolvedValue(state);
    vi.spyOn(sshFixture, "buildSshEnvLabFixtureConfig").mockResolvedValue(environment);
    const jsonByLocale: string[] = [];

    for (const locale of ["en", "pt-BR"] as const) {
      setCliLocale(locale);
      messages = [];
      await envLabUpCommand({ instance });
      const human = messages.join("\n");
      for (const label of locale === "en"
        ? ["SSH env-lab fixture is running.", "Host:", "User:", "Workspace:", "Log:", "State:"]
        : ["O fixture SSH do env-lab está em execução.", "Host:", "Usuário:", "Diretório de trabalho:", "Arquivo de log:", "Estado:"]) {
        expect(human).toContain(label);
      }
      expect(human).toContain(state.workspaceDir);

      stdoutWriteSpy.mockClear();
      await envLabUpCommand({ instance, json: true });
      jsonByLocale.push(stdoutWriteSpy.mock.calls.map((call: unknown[]) => String(call[0])).join(""));
    }

    expect(startSpy).toHaveBeenCalledWith({ statePath });
    expect(jsonByLocale[0]).toBe(jsonByLocale[1]);
    expect(JSON.parse(jsonByLocale[0]!)).toEqual({ state, environment });
  });

  it("localizes env-lab help without changing command names, arguments, or flags", () => {
    const commandShape = (command: Command): unknown => ({
      name: command.name(),
      args: command.registeredArguments.map((argument) => argument.name()),
      options: command.options.map((option) => option.flags),
      children: command.commands.map(commandShape),
    });
    const makeProgram = (locale: SupportedLocale) => {
      setCliLocale(locale);
      const program = new Command();
      program.name("paperclipai");
      registerEnvLabCommands(program);
      applyOperationHelpLocalization(program, locale);
      return program;
    };

    const en = makeProgram("en");
    const pt = makeProgram("pt-BR");
    expect(commandShape(pt)).toEqual(commandShape(en));
    const paths = ["env-lab", "env-lab up", "env-lab status", "env-lab down", "env-lab doctor"];
    for (const commandPath of paths) {
      const parts = commandPath.split(" ");
      const enCommand = en.commands.find((command) => command.name() === parts[0]);
      const ptCommand = pt.commands.find((command) => command.name() === parts[0]);
      const enTarget = parts.length === 2 ? enCommand?.commands.find((command) => command.name() === parts[1]) : enCommand;
      const ptTarget = parts.length === 2 ? ptCommand?.commands.find((command) => command.name() === parts[1]) : ptCommand;
      expect(enTarget, commandPath).toBeDefined();
      expect(ptTarget, commandPath).toBeDefined();
      expect(ptTarget?.description()).not.toBe(enTarget?.description());
      expect(ptTarget?.helpInformation()).not.toBe(enTarget?.helpInformation());
    }
  });
});
