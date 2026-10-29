import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
const roots: string[] = [];

function help(args: string[]) {
  const home = mkdtempSync(path.join(os.tmpdir(), "paperclip-admin-help-"));
  roots.push(home);
  return spawnSync(process.execPath, [tsx, entry, ...args], {
    cwd: home,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      PATH: process.env.PATH,
      PAPERCLIP_HOME: home,
      PAPERCLIP_TELEMETRY_DISABLED: "1",
      NODE_ENV: "test",
    },
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("localized CLI help", () => {
  it.each([
    { command: ["install"], portuguese: "Instalar o Paperclip em um diretório gerenciado", english: "Install Paperclip into a managed per-user CLI store" },
    { command: ["update"], portuguese: "Verificar, atualizar ou reverter", english: "Check, update, or roll back" },
    { command: ["service", "install"], portuguese: "Instalar e registrar o serviço", english: "Install and register the background service" },
    { command: ["doctor"], portuguese: "Executar verificações de diagnóstico", english: "Run diagnostic checks" },
    { command: ["company"], portuguese: "Operações de organizações", english: "Company operations" },
    { command: ["company", "list"], portuguese: "Listar organizações", english: "List companies" },
    { command: ["company", "get"], portuguese: "Consultar uma organização", english: "Get one company" },
    {
      command: ["company", "current"],
      portuguese: "Consultar a organização atual do escopo",
      english: "Get the current scoped company",
    },
    { command: ["company", "stats"], portuguese: "Consultar estatísticas da organização", english: "Get company stats" },
  ])("localizes help for $command", ({ command, portuguese, english }) => {
    const pt = help([...command, "--help", "--lang", "pt-BR"]);
    expect(pt.status).toBe(0);
    expect(pt.stdout).toContain(portuguese);
    expect(pt.stdout).toContain("Opções:");

    const en = help([...command, "--help", "--lang", "en"]);
    expect(en.status).toBe(0);
    expect(en.stdout).toContain(english);
    expect(en.stdout).toContain("Options:");
  }, 65_000);

  it("preserves command and option names while localizing descriptions", () => {
    const result = help(["service", "restart", "--help", "--lang", "pt-BR"]);
    const output = result.stdout.replace(/\s+/g, " ");
    expect(result.status).toBe(0);
    expect(output).toContain("paperclipai service restart");
    expect(output).toContain("--expected-version <version>");
    expect(output).toContain("Exigir que o servidor reiniciado informe esta versão");
  }, 35_000);

  it("localizes company list options while preserving command and flag names", () => {
    const result = help(["company", "list", "--help", "--lang", "pt-BR"]);
    const output = result.stdout.replace(/\s+/g, " ");
    expect(result.status).toBe(0);
    expect(output).toContain("paperclipai company list");
    expect(output).toContain("--config <path>");
    expect(output).toContain("Caminho para o arquivo de configuração do Paperclip");
    expect(output).toContain("--data-dir <path>");
    expect(output).toContain("Diretório raiz dos dados do Paperclip");
    expect(output).toContain("--context <path>");
    expect(output).toContain("--profile <name>");
    expect(output).toContain("--api-base <url>");
    expect(output).toContain("URL base da API do Paperclip");
    expect(output).toContain("--api-key <token>");
    expect(output).toContain("--run-id <id>");
    expect(output).toContain("ID da execução do heartbeat");
    expect(output).toContain("--json");
    expect(output).toContain("Exibir JSON bruto");
  }, 35_000);

  it("localizes company get arguments and current company options without changing identifiers", () => {
    const get = help(["company", "get", "--help", "--lang", "pt-BR"]);
    const getOutput = get.stdout.replace(/\s+/g, " ");
    expect(get.status).toBe(0);
    expect(getOutput).toContain("paperclipai company get [options] <companyId>");
    expect(getOutput).toContain("companyId");
    expect(getOutput).toContain("ID da organização");

    const current = help(["company", "current", "--help", "--lang", "pt-BR"]);
    const currentOutput = current.stdout.replace(/\s+/g, " ");
    expect(current.status).toBe(0);
    expect(currentOutput).toContain("paperclipai company current");
    expect(currentOutput).toContain("--company-id <id>");
    expect(currentOutput).toContain("ID da organização (substitui o padrão do contexto)");
    expect(currentOutput).toContain("--json");
  }, 65_000);
});
