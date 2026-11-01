import { Command } from "commander";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  CompanyPortabilityImportResult,
  CompanyPortabilityPreviewResult,
} from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as prompts from "@clack/prompts";
import { registerCompanyCommands } from "../commands/client/company.js";
import { setCliLocale } from "../localization/index.js";

vi.mock("@clack/prompts", () => ({
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  select: vi.fn(),
  multiselect: vi.fn(),
  note: vi.fn(),
  cancel: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn() },
}));

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerCompanyCommands(program);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function previewFixture(): CompanyPortabilityPreviewResult {
  const include = { company: true, agents: true, projects: true, issues: true, skills: true };
  return {
    include,
    targetCompanyId: COMPANY_ID,
    targetCompanyName: "Imported Acme",
    collisionStrategy: "rename",
    selectedAgentSlugs: [],
    plan: {
      companyAction: "create",
      agentPlans: [],
      projectPlans: [],
      issuePlans: [],
    },
    manifest: {
      schemaVersion: 1,
      generatedAt: "2026-03-23T17:00:00.000Z",
      source: { companyId: "company-source", companyName: "Source Acme" },
      includes: include,
      company: {
        path: "COMPANY.md",
        name: "Imported Acme",
        description: null,
        logoPath: null,
        requireBoardApprovalForNewAgents: false,
        feedbackDataSharingEnabled: false,
        feedbackDataSharingConsentAt: null,
        feedbackDataSharingConsentByUserId: null,
        feedbackDataSharingTermsVersion: null,
      },
      sidebar: { agents: [], projects: [] },
      agents: [],
      skills: [],
      projects: [],
      issues: [],
      envInputs: [],
    },
    files: { "COMPANY.md": "# Imported Acme\n" },
    envInputs: [],
    warnings: ["Server-provided warning remains unchanged."],
    errors: [],
  };
}

function importFixture(): CompanyPortabilityImportResult {
  return {
    company: { id: COMPANY_ID, name: "Imported Acme", action: "created" },
    agents: [],
    skills: [],
    projects: [],
    routines: [],
    envInputs: [],
    warnings: ["Provider warning remains unchanged."],
  };
}

describe("company import localization", () => {
  let tempRoot: string;
  let sourceDir: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let originalStdinIsTTY: boolean | undefined;
  let originalStdoutIsTTY: boolean | undefined;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-company-import-l10n-"));
    sourceDir = path.join(tempRoot, "source-package");
    await mkdir(sourceDir);
    await writeFile(path.join(sourceDir, "COMPANY.md"), "# Imported Acme\n");
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    setCliLocale("en");
    originalStdinIsTTY = process.stdin.isTTY;
    originalStdoutIsTTY = process.stdout.isTTY;
    vi.mocked(prompts.select).mockImplementation(async () => "confirm" as never);
    fetchMock = vi.fn(async (input: string | URL | Request) => {
      const pathname = new URL(String(input)).pathname;
      if (pathname.endsWith("/imports/preview") || pathname === "/api/companies/import/preview") {
        return jsonResponse(previewFixture());
      }
      if (pathname === "/api/companies/import") return jsonResponse(importFixture());
      if (pathname === `/api/companies/${COMPANY_ID}`) return jsonResponse({ issuePrefix: "PAP" });
      return jsonResponse({ error: `Unexpected route: ${pathname}` }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: originalStdinIsTTY });
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: originalStdoutIsTTY });
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function runCommand(args: string[], locale: "pt-BR" | "en") {
    setCliLocale(locale);
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram().parseAsync(args, { from: "user" });
  }

  function baseArgs() {
    return [
      "company", "import", sourceDir,
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
    ];
  }

  it("localizes the human preview while preserving server warnings, values, and the request contract", async () => {
    const args = [...baseArgs(), "--dry-run"];
    await runCommand(args, "pt-BR");
    const portuguese = logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");

    logSpy.mockClear();
    await runCommand(args, "en");
    const english = logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");

    expect(portuguese).toContain("Prévia da importação");
    expect(portuguese).toContain(`Origem  Pacote local: ${sourceDir.split(path.sep).at(-1)}`);
    expect(portuguese).toContain("Incluir organização, projetos, tarefas, agentes, skills");
    expect(portuguese).toContain("rename em caso de conflito");
    expect(portuguese).toContain("Avisos");
    expect(portuguese).toContain("Server-provided warning remains unchanged.");
    expect(portuguese).toContain("Imported Acme");
    expect(english).toContain("Import Preview");
    expect(english).toContain("Source  Local package: source-package");
    expect(english).toContain("Include company, projects, tasks, agents, skills");
    expect(english).toContain("rename collisions");
    expect(english).toContain("Warnings");
    expect(english).toContain("Server-provided warning remains unchanged.");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe("/api/companies/import/preview");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      source: {
        type: "inline",
        rootPath: "source-package",
        files: { "COMPANY.md": "# Imported Acme\n" },
      },
      include: { company: true, agents: true, projects: true, issues: true, skills: true },
      target: { mode: "new_company", newCompanyName: null },
      agents: "all",
      collisionStrategy: "rename",
      selectedFiles: undefined,
    });
  });

  it("keeps preview and applied JSON byte-for-byte equivalent across locales", async () => {
    const previewArgs = [...baseArgs(), "--dry-run", "--json"];
    await runCommand(previewArgs, "pt-BR");
    const portuguesePreview = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(previewArgs, "en");
    const englishPreview = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(portuguesePreview).toBe(englishPreview);
    expect(JSON.parse(portuguesePreview)).toEqual(previewFixture());

    logSpy.mockClear();
    const applyArgs = [...baseArgs(), "--yes", "--json"];
    await runCommand(applyArgs, "pt-BR");
    const portugueseImport = String(logSpy.mock.calls.at(-1)?.[0]);
    logSpy.mockClear();
    await runCommand(applyArgs, "en");
    const englishImport = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(portugueseImport).toBe(englishImport);
    expect(JSON.parse(portugueseImport)).toEqual(importFixture());
    const calls = fetchMock.mock.calls as unknown as Array<[string | URL | Request, RequestInit]>;
    expect(calls.map(([input]) => new URL(String(input)).pathname)).toEqual([
      "/api/companies/import/preview",
      "/api/companies/import/preview",
      "/api/companies/import/preview",
      "/api/companies/import",
      "/api/companies/import/preview",
      "/api/companies/import",
    ]);
    const portugueseApplyPayload = JSON.parse(String(calls[3]?.[1].body));
    const englishApplyPayload = JSON.parse(String(calls[5]?.[1].body));
    expect(portugueseApplyPayload).toEqual(englishApplyPayload);
    expect(portugueseApplyPayload).toEqual({
      source: {
        type: "inline",
        rootPath: "source-package",
        files: { "COMPANY.md": "# Imported Acme\n" },
      },
      include: { company: true, agents: true, projects: true, issues: true, skills: true },
      target: { mode: "new_company", newCompanyName: null },
      agents: "all",
      collisionStrategy: "rename",
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes the interactive selection menu and keeps its selection keys stable", async () => {
    Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: true });
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
    const args = [...baseArgs(), "--dry-run"];

    await runCommand(args, "pt-BR");
    const portugueseMenu = vi.mocked(prompts.select).mock.calls.at(-1)?.[0] as {
      message: string;
      options: Array<{ value: string; label: string; hint?: string }>;
    };
    expect(portugueseMenu.message).toBe("Selecione o que o Paperclip deve importar");
    expect(portugueseMenu.options.map(({ value }) => value)).toEqual([
      "company", "projects", "issues", "agents", "skills", "confirm",
    ]);
    expect(portugueseMenu.options.map(({ label }) => label)).toEqual([
      "Organização: incluída",
      "Selecionar projetos",
      "Selecionar tarefas",
      "Selecionar agentes",
      "Selecionar skills",
      "Confirmar",
    ]);

    vi.mocked(prompts.select).mockClear();
    await runCommand(args, "en");
    const englishMenu = vi.mocked(prompts.select).mock.calls.at(-1)?.[0] as {
      message: string;
      options: Array<{ value: string; label: string; hint?: string }>;
    };
    expect(englishMenu.message).toBe("Select what Paperclip should import");
    expect(englishMenu.options.map(({ value }) => value)).toEqual(portugueseMenu.options.map(({ value }) => value));
    expect(englishMenu.options.map(({ label }) => label)).toEqual([
      "Company: included",
      "Select Projects",
      "Select Tasks",
      "Select Agents",
      "Select Skills",
      "Confirm",
    ]);
  });

  it("localizes apply and browser confirmations without changing their decisions", async () => {
    Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: true });
    Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: true });
    const args = [...baseArgs(), "--include", "company"];

    vi.mocked(prompts.confirm).mockReset();
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await runCommand(args, "pt-BR");
    expect(prompts.confirm).toHaveBeenNthCalledWith(1, {
      message: "Aplicar esta importação? (y/N)",
      initialValue: false,
    });
    expect(prompts.confirm).toHaveBeenNthCalledWith(2, {
      message: "Abrir a organização importada no navegador?",
      initialValue: true,
    });
    expect(prompts.note).toHaveBeenCalledWith(
      expect.stringContaining("Provider warning remains unchanged."),
      "Resultado da importação",
    );

    vi.mocked(prompts.note).mockClear();
    vi.mocked(prompts.confirm).mockReset();
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await runCommand(args, "en");
    expect(prompts.confirm).toHaveBeenNthCalledWith(1, {
      message: "Apply this import? (y/N)",
      initialValue: false,
    });
    expect(prompts.confirm).toHaveBeenNthCalledWith(2, {
      message: "Open the imported company in your browser?",
      initialValue: true,
    });
    expect(prompts.note).toHaveBeenCalledWith(
      expect.stringContaining("Provider warning remains unchanged."),
      "Import Result",
    );
  });

  it("localizes invalid-operation errors while keeping --json errors and exit status stable", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const args = [...baseArgs(), "--collision", "invalid"];

    await expect(runCommand(args, "pt-BR")).rejects.toThrow("exit:1");
    const portuguese = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand(args, "en")).rejects.toThrow("exit:1");
    const english = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand([...args, "--json"], "pt-BR")).rejects.toThrow("exit:1");
    const portugueseJson = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand([...args, "--json"], "en")).rejects.toThrow("exit:1");
    const englishJson = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(portuguese).toContain("Valor inválido para --collision. Use: rename, skip, replace");
    expect(english).toContain("Invalid --collision value. Use: rename, skip, replace");
    expect(portugueseJson).toBe(englishJson);
    expect(portugueseJson).toContain("Invalid --collision value. Use: rename, skip, replace");
    expect(logSpy).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
  });

  it("localizes invalid --include errors and keeps structured stderr and exit status stable", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const args = [...baseArgs(), "--include", "invalid"];

    await expect(runCommand(args, "pt-BR")).rejects.toThrow("exit:1");
    const portuguese = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand(args, "en")).rejects.toThrow("exit:1");
    const english = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand([...args, "--json"], "pt-BR")).rejects.toThrow("exit:1");
    const portugueseJson = String(errorSpy.mock.calls.at(-1)?.[0]);
    errorSpy.mockClear();
    await expect(runCommand([...args, "--json"], "en")).rejects.toThrow("exit:1");
    const englishJson = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(portuguese).toContain("Valor inválido para --include. Use um ou mais de: company,agents,projects,issues,tasks,skills");
    expect(english).toContain("Invalid --include value. Use one or more of: company,agents,projects,issues,tasks,skills");
    expect(portugueseJson).toBe(englishJson);
    expect(portugueseJson).toContain("Invalid --include value. Use one or more of: company,agents,projects,issues,tasks,skills");
    expect(logSpy).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
  });
});
