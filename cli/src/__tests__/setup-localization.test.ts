import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { afterEach, describe, expect, it } from "vitest";
import { setCliLocale } from "../localization/index.js";
import { applySetupHelpLocalization, setupMessage } from "../localization/setup.js";

const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
const roots: string[] = [];

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "paperclip-setup-locale-"));
  roots.push(root);
  return root;
}

function run(root: string, args: string[]) {
  return spawnSync(process.execPath, [tsx, entry, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      PATH: process.env.PATH,
      PAPERCLIP_HOME: root,
      PAPERCLIP_TELEMETRY_DISABLED: "1",
      NODE_ENV: "test",
    },
  });
}

afterEach(() => {
  setCliLocale("pt-BR");
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("setup command localization", () => {
  it("localizes help descriptions while preserving command and option names", () => {
    const root = new Command();
    root.command("onboard").description("English placeholder")
      .option("-c, --config <path>", "English placeholder")
      .option("-d, --data-dir <path>", "English placeholder")
      .option("--bind <mode>", "English placeholder");
    root.command("configure").description("English placeholder")
      .option("-s, --section <section>", "English placeholder");
    root.command("env").description("English placeholder");

    applySetupHelpLocalization(root, "pt-BR");
    const portugueseHelp = root.commands[0]!.helpInformation();
    const normalizedPortugueseHelp = portugueseHelp.replace(/\s+/g, " ");
    expect(normalizedPortugueseHelp).toContain("Assistente interativo de configuração inicial");
    expect(normalizedPortugueseHelp).toContain("--config <path>");
    expect(normalizedPortugueseHelp).toContain("Caminho do arquivo de configuração");
    expect(normalizedPortugueseHelp).toContain("--bind <mode>");
    expect(normalizedPortugueseHelp).toContain("loopback, lan, tailnet");

    applySetupHelpLocalization(root, "en");
    const englishHelp = root.commands[0]!.helpInformation();
    const normalizedEnglishHelp = englishHelp.replace(/\s+/g, " ");
    expect(normalizedEnglishHelp).toContain("Interactive first-run setup wizard");
    expect(normalizedEnglishHelp).toContain("Path to config file");
    expect(normalizedEnglishHelp).toContain("--bind <mode>");
  });

  it("renders onboard and configure messages in the selected locale", () => {
    setCliLocale("pt-BR");
    expect(setupMessage("chooseSetupPath")).toBe("Escolha o tipo de configuração");
    expect(setupMessage("unknownSection", { section: "bad", sections: "llm, database" }))
      .toBe("Seção desconhecida: bad. Escolha entre: llm, database");
    setCliLocale("en");
    expect(setupMessage("chooseSetupPath")).toBe("Choose setup path");
    expect(setupMessage("unknownSection", { section: "bad", sections: "llm, database" }))
      .toBe("Unknown section: bad. Choose from: llm, database");
  });

  it.each([
    {
      command: "onboard",
      portuguese: "Assistente interativo de configuração inicial",
      english: "Interactive first-run setup wizard",
      flag: "--bind <mode>",
      flagPortuguese: "Predefinição de acesso do início rápido",
    },
    {
      command: "configure",
      portuguese: "Atualizar seções da configuração",
      english: "Update configuration sections",
      flag: "--section <section>",
      flagPortuguese: "Seção a configurar",
    },
    {
      command: "env",
      portuguese: "Exibir variáveis de ambiente para implantação",
      english: "Print environment variables for deployment",
      flag: "--config <path>",
      flagPortuguese: "Caminho do arquivo de configuração",
    },
  ])("localizes actual $command help in both supported languages", ({ command, portuguese, english, flag, flagPortuguese }) => {
    const root = temporaryRoot();
    const pt = run(root, [command, "--help", "--lang", "pt-BR"]);
    const en = run(root, [command, "--help", "--lang", "en"]);

    expect(pt.status).toBe(0);
    expect(pt.stdout.replace(/\s+/g, " ")).toContain(portuguese);
    expect(pt.stdout.replace(/\s+/g, " ")).toContain(flag);
    expect(pt.stdout.replace(/\s+/g, " ")).toContain(flagPortuguese);
    expect(en.status).toBe(0);
    expect(en.stdout.replace(/\s+/g, " ")).toContain(english);
    expect(en.stdout.replace(/\s+/g, " ")).toContain(flag);
  });

  it("translates env guidance and statuses while preserving shell exports and keys", () => {
    const root = temporaryRoot();
    const config = path.join(root, "missing-config.json");
    const pt = run(root, ["env", "--config", config, "--lang", "pt-BR"]);
    const en = run(root, ["env", "--config", config, "--lang", "en"]);

    expect(pt.status).toBe(0);
    expect(en.status).toBe(0);
    expect(pt.stdout).toContain("Variáveis de ambiente obrigatórias");
    expect(pt.stdout).toContain("Arquivo de configuração ausente:");
    expect(pt.stdout).toContain("export PAPERCLIP_AGENT_JWT_SECRET='<set-this-value>'");
    expect(pt.stdout).toContain("export DATABASE_URL='<set-this-value>'");
    expect(pt.stdout).toContain("Variáveis de ambiente opcionais");
    expect(en.stdout).toContain("Required environment variables");
    expect(en.stdout).toContain("Config file missing:");
    expect(en.stdout).toContain("export PAPERCLIP_AGENT_JWT_SECRET='<set-this-value>'");

    const shellAssignments = (output: string) => output.match(/^export .+$/gm) ?? [];
    expect(shellAssignments(pt.stdout)).toEqual(shellAssignments(en.stdout));
  });

  it("localizes configure errors without changing the failing exit status", () => {
    const root = temporaryRoot();
    const pt = run(root, ["configure", "--config", path.join(root, "absent.json"), "--lang", "pt-BR"]);
    const en = run(root, ["configure", "--config", path.join(root, "absent.json"), "--lang", "en"]);

    expect(pt.status).toBe(1);
    expect(pt.stdout + pt.stderr).toContain("Arquivo de configuração não encontrado");
    expect(en.status).toBe(1);
    expect(en.stdout + en.stderr).toContain("No config file found");
  });
});
