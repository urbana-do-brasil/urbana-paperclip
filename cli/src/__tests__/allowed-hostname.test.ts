import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import * as p from "@clack/prompts";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaperclipConfig } from "../config/schema.js";
import { addAllowedHostname } from "../commands/allowed-hostname.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { getCliLocale, setCliLocale } from "../localization/index.js";

const originalLocale = getCliLocale();
const tempRoots: string[] = [];
let messages: { error: string[]; info: string[]; success: string[]; message: string[] };

function createTempConfigPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-allowed-hostname-"));
  tempRoots.push(dir);
  return path.join(dir, "config.json");
}

function writeBaseConfig(configPath: string) {
  const base: PaperclipConfig = {
    $meta: {
      version: 1,
      updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
      source: "configure",
    },
    database: {
      mode: "embedded-postgres",
      embeddedPostgresDataDir: "/tmp/paperclip-db",
      embeddedPostgresPort: 54329,
      backup: {
        enabled: true,
        intervalMinutes: 60,
        retentionDays: 30,
        dir: "/tmp/paperclip-backups",
      },
    },
    logging: {
      mode: "file",
      logDir: "/tmp/paperclip-logs",
    },
    server: {
      deploymentMode: "authenticated",
      exposure: "private",
      host: "0.0.0.0",
      port: 3100,
      allowedHostnames: [],
      serveUi: true,
    },
    auth: {
      baseUrlMode: "auto",
      disableSignUp: false,
    },
    telemetry: {
      enabled: true,
    },
    storage: {
      provider: "local_disk",
      localDisk: { baseDir: "/tmp/paperclip-storage" },
      s3: {
        bucket: "paperclip",
        region: "us-east-1",
        prefix: "",
        forcePathStyle: false,
      },
    },
    secrets: {
      provider: "local_encrypted",
      strictMode: false,
      localEncrypted: { keyFilePath: "/tmp/paperclip-secrets/master.key" },
    },
  };
  fs.writeFileSync(configPath, JSON.stringify(base, null, 2));
}

function makeHelpProgram(locale: SupportedLocale) {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program
    .command("allowed-hostname")
    .description("English placeholder")
    .argument("<host>", "English placeholder")
    .option("-c, --config <path>", "English placeholder")
    .option("-d, --data-dir <path>", "English placeholder");
  applyOperationHelpLocalization(program, locale);
  return program;
}

function commandShape(program: Command) {
  return program.commands.map((command) => ({
    name: command.name(),
    arguments: command.registeredArguments.map((argument) => argument.name()),
    options: command.options.map((option) => option.flags),
  }));
}

beforeEach(() => {
  messages = { error: [], info: [], success: [], message: [] };
  vi.spyOn(p.log, "error").mockImplementation((message?: string | string[]) => {
    messages.error.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
  });
  vi.spyOn(p.log, "info").mockImplementation((message?: string | string[]) => {
    messages.info.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
  });
  vi.spyOn(p.log, "success").mockImplementation((message?: string | string[]) => {
    messages.success.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
  });
  vi.spyOn(p.log, "message").mockImplementation((message?: string | string[]) => {
    messages.message.push(Array.isArray(message) ? message.join("\n") : (message ?? ""));
  });
});

afterEach(() => {
  setCliLocale(originalLocale);
  vi.restoreAllMocks();
  for (const dir of tempRoots.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("allowed-hostname command", () => {
  it("adds and normalizes hostnames", async () => {
    const configPath = createTempConfigPath();
    writeBaseConfig(configPath);

    await addAllowedHostname("https://Dotta-MacBook-Pro:3100", { config: configPath });
    await addAllowedHostname("dotta-macbook-pro", { config: configPath });

    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8")) as PaperclipConfig;
    expect(raw.server.allowedHostnames).toEqual(["dotta-macbook-pro"]);
  });

  it("localizes add, duplicate, mode guidance, and missing-config output in both languages", async () => {
    const outputByLocale: string[] = [];

    for (const locale of ["en", "pt-BR"] as const) {
      const configPath = createTempConfigPath();
      writeBaseConfig(configPath);
      setCliLocale(locale);
      messages = { error: [], info: [], success: [], message: [] };

      await addAllowedHostname("https://Dotta-MacBook-Pro:3100", { config: configPath });
      const addedOutput = [...messages.success, ...messages.message].join("\n");
      expect(addedOutput).toContain("dotta-macbook-pro");
      expect(addedOutput).toContain(locale === "en"
        ? "Added allowed hostname:"
        : "Hostname permitido adicionado:");
      expect(addedOutput).toContain(locale === "en"
        ? "Restart the Paperclip server"
        : "Reinicie o servidor do Paperclip");
      expect(addedOutput).not.toContain(locale === "en" ? "Note:" : "Observação:");

      messages = { error: [], info: [], success: [], message: [] };
      await addAllowedHostname("dotta-macbook-pro", { config: configPath });
      expect(messages.info.join("\n")).toContain(locale === "en"
        ? "Hostname dotta-macbook-pro is already allowed."
        : "O hostname dotta-macbook-pro já está permitido.");

      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as PaperclipConfig;
      expect(config.server.allowedHostnames).toEqual(["dotta-macbook-pro"]);
      expect(config.server.port).toBe(3100);
      expect(config.$meta.source).toBe("configure");

      config.server.deploymentMode = "local_trusted";
      config.server.bind = "loopback";
      config.server.host = "127.0.0.1";
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      messages = { error: [], info: [], success: [], message: [] };
      await addAllowedHostname("second.example", { config: configPath });
      const modeOutput = messages.message.join("\n");
      expect(modeOutput).toContain(locale === "en"
        ? "allowed hostnames are enforced only in authenticated/private mode"
        : "os hostnames permitidos só são aplicados no modo autenticado/privado");

      const missingConfigPath = path.join(path.dirname(configPath), "missing.json");
      messages = { error: [], info: [], success: [], message: [] };
      await addAllowedHostname("no-write.example", { config: missingConfigPath });
      expect(messages.error.join("\n")).toContain(locale === "en"
        ? `No config found at ${missingConfigPath}. Run paperclip onboard first.`
        : `Configuração não encontrada em ${missingConfigPath}. Execute paperclip onboard primeiro.`);
      expect(fs.existsSync(missingConfigPath)).toBe(false);
      outputByLocale.push(addedOutput);
    }

    expect(outputByLocale[0]).not.toBe(outputByLocale[1]);
  });

  it("localizes help while preserving the command, argument, and option shape", () => {
    const en = makeHelpProgram("en");
    const pt = makeHelpProgram("pt-BR");

    expect(commandShape(pt)).toEqual(commandShape(en));
    const enCommand = en.commands[0]!;
    const ptCommand = pt.commands[0]!;
    const enHelp = enCommand.helpInformation();
    const ptHelp = ptCommand.helpInformation();
    expect(enCommand.description()).toContain("Allow a hostname");
    expect(ptCommand.description()).toContain("Permitir o acesso de um hostname");
    expect(enHelp).toContain("Hostname to allow");
    expect(ptHelp).toContain("Hostname a permitir");
    expect(enHelp).toContain("--config <path>");
    expect(ptHelp).toContain("--config <path>");
    expect(enHelp).not.toBe(ptHelp);
  });
});
