import { Command } from "commander";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { CompanyPortabilityExportResult } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerCompanyCommands } from "../commands/client/company.js";
import { setCliLocale } from "../localization/index.js";

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

function exportFixture(): CompanyPortabilityExportResult {
  return {
    rootPath: "acme",
    manifest: {} as CompanyPortabilityExportResult["manifest"],
    files: { "COMPANY.md": "# Acme\n", "README.md": "Portable company data\n" },
    warnings: ["Server-provided warning remains unchanged."],
    paperclipExtensionPath: ".paperclip/extension.yaml",
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("company export localization", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(tmpdir(), "paperclip-company-export-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    setCliLocale("en");
    fetchMock = vi.fn(async () => jsonResponse(exportFixture()));
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function runCommand(args: string[]) {
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram().parseAsync(args, { from: "user" });
  }

  function exportArgs(out: string) {
    return [
      "company", "export", COMPANY_ID,
      "--out", out,
      "--include", "company,agents,projects,tasks,skills",
      "--skills", "design,script",
      "--projects", "delivery,release",
      "--issues", "PAP-1,PAP-2",
      "--project-issues", "delivery",
      "--expand-referenced-skills",
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
    ];
  }

  it.each([
    ["en", "Exported company to", "2 files", "Warning: Server-provided warning remains unchanged."],
    ["pt-BR", "Organização exportada para", "2 arquivos", "Aviso: Server-provided warning remains unchanged."],
  ] as const)("localizes success and warning messages in %s while preserving request data", async (locale, success, count, warning) => {
    setCliLocale(locale);
    const out = path.join(tempRoot, "package");
    await runCommand(exportArgs(out));

    const output = logSpy.mock.calls.map(([line]) => String(line)).join("\n");
    expect(output).toContain(`${success} ${out} (${count}).`);
    expect(output).toContain(warning);
    expect(await readFile(path.join(out, "COMPANY.md"), "utf8")).toBe("# Acme\n");
    expect(await readFile(path.join(out, "README.md"), "utf8")).toBe("Portable company data\n");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new URL(url).pathname).toBe(`/api/companies/${COMPANY_ID}/export`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      include: { company: true, agents: true, projects: true, issues: true, skills: true },
      skills: ["design", "script"],
      projects: ["delivery", "release"],
      issues: ["PAP-1", "PAP-2"],
      projectIssues: ["delivery"],
      expandReferencedSkills: true,
    });
  });

  it("keeps the structured export result identical across locales", async () => {
    const out = path.join(tempRoot, "structured-package");
    const args = [...exportArgs(out), "--json"];

    setCliLocale("pt-BR");
    await runCommand(args);
    const portugueseJson = String(logSpy.mock.calls.at(-1)?.[0]);

    setCliLocale("en");
    await runCommand([...args, "--force"]);
    const englishJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(portugueseJson).toBe(englishJson);
    expect(JSON.parse(portugueseJson)).toEqual({
      ok: true,
      out,
      rootPath: "acme",
      filesWritten: 2,
      paperclipExtensionPath: ".paperclip/extension.yaml",
      warningCount: 1,
    });
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes the non-interactive non-empty destination error in both locales and preserves existing files", async () => {
    const out = path.join(tempRoot, "existing-package");
    await mkdir(out);
    await writeFile(path.join(out, "KEEP.md"), "keep this file\n");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    setCliLocale("pt-BR");
    await expect(runCommand(exportArgs(out))).rejects.toThrow("exit:1");
    const portugueseError = String(errorSpy.mock.calls.at(-1)?.[0]);
    expect(portugueseError).toContain(`O diretório de saída da exportação ${out} já contém arquivos.`);
    expect(portugueseError).toContain("informe --force");

    errorSpy.mockClear();
    setCliLocale("en");
    await expect(runCommand(exportArgs(out))).rejects.toThrow("exit:1");
    const englishError = String(errorSpy.mock.calls.at(-1)?.[0]);
    expect(englishError).toContain(`Export output directory ${out} already contains files.`);
    expect(englishError).toContain("pass --force");

    errorSpy.mockClear();
    setCliLocale("pt-BR");
    await expect(runCommand([...exportArgs(out), "--json"])).rejects.toThrow("exit:1");
    const portugueseStructuredError = String(errorSpy.mock.calls.at(-1)?.[0]);

    errorSpy.mockClear();
    setCliLocale("en");
    await expect(runCommand([...exportArgs(out), "--json"])).rejects.toThrow("exit:1");
    const englishStructuredError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(portugueseStructuredError).toBe(englishStructuredError);
    expect(portugueseStructuredError).toContain(`Export output directory ${out} already contains files.`);
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
    expect(await readFile(path.join(out, "KEEP.md"), "utf8")).toBe("keep this file\n");
    expect(logSpy).not.toHaveBeenCalled();
  });
});
