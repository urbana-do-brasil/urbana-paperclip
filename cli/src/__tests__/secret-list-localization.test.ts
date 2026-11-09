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
  externalRef: "arn:aws:secretsmanager:us-east-1:111111111111:secret:VendorApiKey",
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

describe("secrets list localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-secret-list-l10n-"));
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
      group: "Operações de declarações de segredos e provedores",
      description: "Listar metadados dos segredos de uma organização",
      company: "ID da organização",
      json: "Exibir JSON bruto",
      row: `ID=${SECRET.id} Nome=${SECRET.name} Status=${SECRET.status} Chave=${SECRET.key} Provedor=${SECRET.provider} Modo de gerenciamento=${SECRET.managedMode} Última versão=3 Referência externa=yes`,
    },
    {
      locale: "en",
      group: "Secret declaration and provider operations",
      description: "List secret metadata for a company",
      company: "Company ID",
      json: "Output raw JSON",
      row: `ID=${SECRET.id} Name=${SECRET.name} Status=${SECRET.status} Key=${SECRET.key} Provider=${SECRET.provider} Managed mode=${SECRET.managedMode} Latest version=3 External reference=yes`,
    },
  ] as const)("localizes $locale help and metadata labels while retaining supplied values and route", async ({ locale, group, description, company, json, row }) => {
    const program = makeProgram(locale);
    const secrets = program.commands.find((command) => command.name() === "secrets");
    const list = secrets?.commands.find((command) => command.name() === "list");
    const help = list?.helpInformation().replace(/\s+/g, " ") ?? "";

    expect(secrets?.description()).toBe(group);
    expect(list?.description()).toBe(description);
    expect(help).toContain("paperclipai secrets list [options]");
    expect(help).toContain("-C, --company-id <id>");
    expect(help).toContain(company);
    expect(help).toContain("--json");
    expect(help).toContain(json);

    fetchMock.mockResolvedValueOnce(jsonResponse([SECRET]));
    await run(["secrets", "list"], locale);
    const output = logSpy.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(output).toEqual([row]);
    expect(output.join("\n")).not.toContain(SECRET.externalRef);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://paperclip.test/api/companies/${COMPANY_ID}/secrets`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes empty output and leaves secret JSON identical in both locales", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await run(["secrets", "list"], "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(vazio)");
    logSpy.mockClear();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await run(["secrets", "list"], "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(empty)");

    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      logSpy.mockClear();
      fetchMock.mockResolvedValueOnce(jsonResponse([SECRET]));
      await run(["secrets", "list", "--json"], locale);
      outputs.push(String(logSpy.mock.calls.at(-1)?.[0]));
    }
    expect(outputs[0]).toBe(outputs[1]);
    expect(JSON.parse(outputs[0]!)).toEqual([SECRET]);
  });

  it("localizes human API framing but preserves structured stderr, details, and exit status", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const failure = { error: "Secret metadata unavailable", details: { code: "SECRET_LIST_UNAVAILABLE" } };

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 503));
      await expect(run(["secrets", "list"], locale)).rejects.toThrow("exit:1");
      const message = String(errorSpy.mock.calls.at(-1)?.[0]);
      expect(message).toContain(locale === "en" ? "API error 503:" : "Erro de API 503:");
      expect(message).toContain("Secret metadata unavailable");
      expect(message).toContain('details={"code":"SECRET_LIST_UNAVAILABLE"}');
      errorSpy.mockClear();
    }

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 503));
      await expect(run(["secrets", "list", "--json"], locale)).rejects.toThrow("exit:1");
      expect(errorSpy.mock.calls.at(-1)?.[0]).toContain(
        'API error 503: Secret metadata unavailable details={"code":"SECRET_LIST_UNAVAILABLE"}',
      );
      errorSpy.mockClear();
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
