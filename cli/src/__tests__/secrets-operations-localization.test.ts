import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerSecretCommands } from "../commands/client/secrets.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const SECRET = {
  id: "secret-1",
  companyId: COMPANY_ID,
  scope: "company",
  ownerUserId: null,
  userSecretDefinitionId: null,
  key: "vendor_api_key",
  name: "Vendor credentials",
  provider: "local_encrypted",
  status: "active",
  managedMode: "paperclip_managed",
  externalRef: null,
  providerConfigId: null,
  providerMetadata: null,
  latestVersion: 3,
  description: "Production integration credential",
  lastResolvedAt: null,
  lastRotatedAt: "2026-04-26T00:00:00.000Z",
  deletedAt: null,
  createdByAgentId: null,
  createdByUserId: null,
  createdAt: "2026-04-26T00:00:00.000Z",
  updatedAt: "2026-04-26T00:00:00.000Z",
};

const COMMAND_DESCRIPTIONS: Record<string, readonly [string, string]> = {
  declarations: ["List portable env declarations emitted by company export", "Listar declarações portáteis de variáveis de ambiente geradas pela exportação da organização"],
  create: ["Create a Paperclip-managed secret", "Criar um segredo gerenciado pelo Paperclip"],
  link: ["Link an external provider-owned secret without storing its value in Paperclip", "Vincular um segredo de provedor externo sem armazenar seu valor no Paperclip"],
  update: ["Update secret metadata", "Atualizar metadados do segredo"],
  rotate: ["Rotate a Paperclip-managed secret value", "Girar o valor de um segredo gerenciado pelo Paperclip"],
  usage: ["Show where a secret is referenced", "Mostrar onde um segredo é usado"],
  "access-events": ["List secret access events", "Listar eventos de acesso ao segredo"],
  delete: ["Delete a secret", "Excluir um segredo"],
  doctor: ["Run secret provider health checks through the Paperclip API", "Verificar a integridade dos provedores de segredos pela API do Paperclip"],
  providers: ["List configured secret provider descriptors", "Listar as descrições dos provedores de segredos configurados"],
  "provider-configs": ["List company secret provider vault configs", "Listar configurações de cofres de provedores de segredos da organização"],
  "provider-config:create": ["Create a secret provider vault config", "Criar uma configuração de cofre de provedor de segredos"],
  "provider-config:discovery-preview": ["Preview provider vault secret discovery", "Pré-visualizar a descoberta de segredos no cofre do provedor"],
  "provider-config:get": ["Get a secret provider vault config", "Consultar uma configuração de cofre de provedor de segredos"],
  "provider-config:update": ["Update a secret provider vault config", "Atualizar uma configuração de cofre de provedor de segredos"],
  "provider-config:default": ["Set the default provider vault config", "Definir a configuração de cofre padrão do provedor"],
  "provider-config:health": ["Check provider vault health", "Verificar a integridade do cofre do provedor"],
  "provider-config:delete": ["Delete a secret provider vault config", "Excluir uma configuração de cofre de provedor de segredos"],
  "remote-import:preview": ["Preview remote secret import", "Pré-visualizar a importação remota de segredos"],
  "remote-import": ["Import selected remote secrets", "Importar os segredos remotos selecionados"],
  "migrate-inline-env": ["Migrate inline sensitive agent env values into secret references", "Migrar valores sensíveis inline do ambiente dos agentes para referências a segredos"],
};

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerSecretCommands(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("secrets operations localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-secrets-operations-l10n-"));
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
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
    ];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it("localizes help for the full secrets command family and preserves command names and flags", () => {
    for (const locale of ["pt-BR", "en"] as const) {
      const program = makeProgram(locale);
      const secrets = program.commands.find((command) => command.name() === "secrets");
      expect(secrets).toBeDefined();
      expect(secrets?.description()).toBe(locale === "en" ? "Secret declaration and provider operations" : "Operações de declarações de segredos e provedores");
      const byName = new Map(secrets?.commands.map((command) => [command.name(), command]));

      for (const [name, descriptions] of Object.entries(COMMAND_DESCRIPTIONS)) {
        expect(byName.get(name)?.description()).toBe(descriptions[locale === "en" ? 0 : 1]);
      }
      expect(byName.size).toBe(Object.keys(COMMAND_DESCRIPTIONS).length + 1); // includes the already-localized list command

      const createHelp = byName.get("create")?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(createHelp).toContain("paperclipai secrets create [options]");
      expect(createHelp).toContain("--value-env <name>");
      expect(createHelp).toContain(locale === "en" ? "Read secret value from an environment variable" : "Ler o valor do segredo de uma variável de ambiente");

      const linkHelp = byName.get("link")?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(linkHelp).toContain("--external-ref <ref>");
      expect(linkHelp).toContain(locale === "en" ? "Provider secret ARN/name/path/reference" : "ARN/nome/caminho/referência do segredo no provedor");

      const configHelp = byName.get("provider-config:get")?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(configHelp).toContain(locale === "en" ? "Provider config ID" : "ID da configuração do provedor");
      expect(configHelp).toContain("<configId>");
    }
  });

  it.each([
    {
      name: "create",
      args: ["secrets", "create", "--company-id", COMPANY_ID, "--name", SECRET.name, "--key", SECRET.key, "--provider", "local_encrypted", "--value", "test-secret-value", "--description", SECRET.description],
      path: `http://paperclip.test/api/companies/${COMPANY_ID}/secrets`,
      body: { name: SECRET.name, key: SECRET.key, provider: "local_encrypted", value: "test-secret-value", description: SECRET.description },
      row: {
        en: "ID=secret-1 Name=Vendor credentials Status=active Key=vendor_api_key Provider=local_encrypted Managed mode=paperclip_managed Latest version=3 External reference=no",
        "pt-BR": "ID=secret-1 Nome=Vendor credentials Status=active Chave=vendor_api_key Provedor=local_encrypted Modo de gerenciamento=paperclip_managed Última versão=3 Referência externa=no",
      },
    },
    {
      name: "link",
      args: ["secrets", "link", "--company-id", COMPANY_ID, "--name", SECRET.name, "--key", SECRET.key, "--provider", "aws_secrets_manager", "--external-ref", "arn:aws:secretsmanager:us-east-1:111111111111:secret:VendorApiKey", "--provider-version-ref", "AWSCURRENT", "--description", SECRET.description],
      path: `http://paperclip.test/api/companies/${COMPANY_ID}/secrets`,
      body: { name: SECRET.name, key: SECRET.key, provider: "aws_secrets_manager", managedMode: "external_reference", externalRef: "arn:aws:secretsmanager:us-east-1:111111111111:secret:VendorApiKey", providerVersionRef: "AWSCURRENT", description: SECRET.description },
      row: {
        en: "ID=secret-1 Name=Vendor credentials Status=active Key=vendor_api_key Provider=local_encrypted Managed mode=paperclip_managed Latest version=3 External reference=no",
        "pt-BR": "ID=secret-1 Nome=Vendor credentials Status=active Chave=vendor_api_key Provedor=local_encrypted Modo de gerenciamento=paperclip_managed Última versão=3 Referência externa=no",
      },
    },
  ] as const)("localizes human $name output while preserving request data and route", async ({ args, path: route, body, row }) => {
    for (const locale of ["pt-BR", "en"] as const) {
      logSpy.mockClear();
      fetchMock.mockResolvedValueOnce(jsonResponse(SECRET));
      await run(args, locale);
      expect(fetchMock).toHaveBeenLastCalledWith(route, expect.objectContaining({ method: "POST", body: JSON.stringify(body) }));
      expect(logSpy.mock.calls.map((call: unknown[]) => String(call[0]))).toEqual([row[locale]]);
      expect(String(logSpy.mock.calls[0]?.[0])).not.toContain("test-secret-value");
      expect(String(logSpy.mock.calls[0]?.[0])).not.toContain("arn:aws:secretsmanager");
    }
  });

  it("keeps create and link JSON byte-for-byte equivalent across locales", async () => {
    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      logSpy.mockClear();
      fetchMock.mockResolvedValueOnce(jsonResponse(SECRET));
      await run(["secrets", "create", "--company-id", COMPANY_ID, "--name", SECRET.name, "--value", "not-printed", "--json"], locale);
      outputs.push(String(logSpy.mock.calls.at(-1)?.[0]));
    }
    expect(outputs[0]).toBe(outputs[1]);
    expect(JSON.parse(outputs[0]!)).toEqual(SECRET);
    expect(outputs[0]).not.toContain("not-printed");
  });

  it("preserves the prior create/link behavior when the API returns no body", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const commands = [
      ["secrets", "create", "--company-id", COMPANY_ID, "--name", SECRET.name, "--value", "test-secret"],
      ["secrets", "link", "--company-id", COMPANY_ID, "--name", SECRET.name, "--provider", "aws_secrets_manager", "--external-ref", "arn:aws:secret:vendor"],
    ];
    for (const args of commands) {
      for (const locale of ["pt-BR", "en"] as const) {
        logSpy.mockClear();
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
        await run([...args, "--json"], locale);
        expect(logSpy.mock.calls.at(-1)?.[0]).toBe("null");

        errorSpy.mockClear();
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
        await expect(run(args, locale)).rejects.toThrow("exit:1");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toContain("Cannot read properties of null (reading 'id')");
      }
    }
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
  });

  it("preserves provider health details while translating only the human framing", async () => {
    const health = {
      providers: [{
        provider: "aws_secrets_manager",
        status: "warn",
        message: "AWS role session expires soon",
        warnings: ["External KMS key policy needs review"],
        backupGuidance: ["Keep an encrypted offline backup"],
        details: { missingConfig: ["PAPERCLIP_SECRETS_AWS_REGION"] },
      }],
    };
    for (const locale of ["pt-BR", "en"] as const) {
      logSpy.mockClear();
      fetchMock.mockResolvedValueOnce(jsonResponse(health));
      await run(["secrets", "doctor", "--company-id", COMPANY_ID], locale);
      const output = logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
      expect(output).toContain("AWS role session expires soon");
      expect(output).toContain("External KMS key policy needs review");
      expect(output).toContain("missingConfig=PAPERCLIP_SECRETS_AWS_REGION");
      expect(output).toContain(locale === "en" ? "Provider=aws_secrets_manager" : "Provedor=aws_secrets_manager");
      expect(output).toContain(locale === "en" ? "Warning=External KMS" : "Aviso=External KMS");
      expect(output).toContain(locale === "en" ? "Backup guidance=Keep" : "Orientação de backup=Keep");
    }
    expect(fetchMock).toHaveBeenNthCalledWith(1, `http://paperclip.test/api/companies/${COMPANY_ID}/secret-providers/health`, expect.objectContaining({ method: "GET" }));

    for (const locale of ["pt-BR", "en"] as const) {
      logSpy.mockClear();
      fetchMock.mockResolvedValueOnce(jsonResponse(health));
      await run(["secrets", "doctor", "--company-id", COMPANY_ID, "--json"], locale);
      expect(String(logSpy.mock.calls.at(-1)?.[0])).toBe(JSON.stringify(health.providers, null, 2));
    }
  });

  it("preserves create/link API failures, details, and exit codes in both locales", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const failure = { error: "Secret already exists", details: { code: "SECRET_DUPLICATE", name: SECRET.name } };
    const args = {
      create: ["secrets", "create", "--company-id", COMPANY_ID, "--name", SECRET.name, "--value", "do-not-echo"],
      link: ["secrets", "link", "--company-id", COMPANY_ID, "--name", SECRET.name, "--provider", "aws_secrets_manager", "--external-ref", "arn:aws:secret:vendor"],
    };

    for (const command of ["create", "link"] as const) {
      for (const locale of ["pt-BR", "en"] as const) {
        errorSpy.mockClear();
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 409));
        await expect(run(args[command], locale)).rejects.toThrow("exit:1");
        const stderr = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(stderr).toContain(locale === "en" ? "API error 409:" : "Erro de API 409:");
        expect(stderr).toContain("Secret already exists");
        expect(stderr).toContain('details={"code":"SECRET_DUPLICATE","name":"Vendor credentials"}');
        expect(stderr).not.toContain("do-not-echo");

        errorSpy.mockClear();
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 409));
        await expect(run([...args[command], "--json"], locale)).rejects.toThrow("exit:1");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toContain("API error 409: Secret already exists");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toContain('details={"code":"SECRET_DUPLICATE","name":"Vendor credentials"}');
      }
    }
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("localizes secret validation errors in human mode and keeps JSON-mode stderr English", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const cases = [
      {
        args: ["secrets", "create", "--company-id", COMPANY_ID, "--name", "Example", "--value", "never-echo", "--value-env", "EMPTY_SECRET"],
        en: "Use only one of --value or --value-env.",
        pt: "Use somente uma das opções --value ou --value-env.",
      },
      {
        args: ["secrets", "create", "--company-id", COMPANY_ID, "--name", "Example", "--value-env", "EMPTY_SECRET"],
        en: "Environment variable EMPTY_SECRET is empty or unset.",
        pt: "A variável de ambiente EMPTY_SECRET está vazia ou não está definida.",
      },
      {
        args: ["secrets", "create", "--company-id", COMPANY_ID, "--name", "Example"],
        en: "Secret value is required. Pass --value or --value-env.",
        pt: "O valor do segredo é obrigatório. Informe --value ou --value-env.",
      },
      {
        args: ["secrets", "declarations", "--company-id", COMPANY_ID, "--include", "nope"],
        en: "Invalid --include value. Use one or more of: company,agents,projects,issues,tasks,skills",
        pt: "Valor inválido para --include. Use um ou mais de: company,agents,projects,issues,tasks,skills",
      },
      {
        args: ["secrets", "declarations", "--company-id", COMPANY_ID, "--kind", "invalid"],
        en: "Invalid --kind value. Use: all, secret, plain",
        pt: "Valor inválido para --kind. Use: all, secret, plain",
      },
      {
        args: ["secrets", "delete", "secret-1"],
        en: "Deletion requires --yes.",
        pt: "A exclusão requer --yes.",
      },
      {
        args: ["secrets", "delete", "secret-1", "--yes"],
        en: "Deletion requires --confirm <secretId> matching the secret ID.",
        pt: "A exclusão requer --confirm <secretId> igual ao ID do segredo.",
      },
    ];

    for (const testCase of cases) {
      for (const locale of ["pt-BR", "en"] as const) {
        errorSpy.mockClear();
        const { args } = testCase;
        await expect(run(args, locale)).rejects.toThrow("exit:1");
        const message = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(message).toContain(locale === "en" ? testCase.en : testCase.pt);
        expect(message).not.toContain("never-echo");

        errorSpy.mockClear();
        await expect(run([...args, "--json"], locale)).rejects.toThrow("exit:1");
        expect(errorSpy.mock.calls.at(-1)?.[0]).toContain(testCase.en);
      }
    }
    expect(exitSpy.mock.calls).toHaveLength(cases.length * 4);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
