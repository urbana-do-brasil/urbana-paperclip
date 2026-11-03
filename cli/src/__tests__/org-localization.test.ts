import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerWorkspaceCommands } from "../commands/client/workspace.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const OPERATIONS = [
  {
    name: "get",
    path: `/api/companies/${COMPANY_ID}/org`,
    descriptions: { en: "Get org chart data", "pt-BR": "Consultar dados do organograma" },
  },
  {
    name: "svg",
    path: `/api/companies/${COMPANY_ID}/org.svg`,
    descriptions: { en: "Download org chart SVG", "pt-BR": "Baixar SVG do organograma" },
  },
  {
    name: "png",
    path: `/api/companies/${COMPANY_ID}/org.png`,
    descriptions: { en: "Download org chart PNG", "pt-BR": "Baixar PNG do organograma" },
  },
] as const;

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerWorkspaceCommands(program);
  applyOperationHelpLocalization(program, locale);
  setCliCommandLineShape(program);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("organization chart CLI localization", () => {
  let tempRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-org-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliLocale("pt-BR");
    setCliCommandLineShape();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await rm(tempRoot, { recursive: true, force: true });
  });

  async function runCommand(args: string[], locale: SupportedLocale): Promise<void> {
    process.argv = ["node", "paperclipai", ...args];
    await makeProgram(locale).parseAsync(args, { from: "user" });
  }

  function operationArgs(...command: string[]): string[] {
    return [...command, "--company-id", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
  }

  it.each(["pt-BR", "en"] as const)("localizes help in %s without changing commands or flags", (locale) => {
    const program = makeProgram(locale);
    const group = program.commands.find((command) => command.name() === "org");
    expect(group?.description()).toBe(locale === "en" ? "Organization chart operations" : "Operações do organograma");

    for (const operation of OPERATIONS) {
      const command = group?.commands.find((candidate) => candidate.name() === operation.name);
      expect(command?.description()).toBe(operation.descriptions[locale]);
      const help = command?.helpInformation().replace(/\s+/g, " ") ?? "";
      expect(help).toContain(`paperclipai org ${operation.name} [options]`);
      expect(help).toContain("--company-id <id>");
      expect(help).toContain(locale === "en" ? "Company ID" : "ID da organização");
      expect(help).toContain("--json");
      expect(help).toContain(locale === "en" ? "Output raw JSON" : "Exibir JSON bruto");
      if (operation.name !== "get") {
        expect(help).toContain("--out <path>");
        expect(help).toContain(locale === "en" ? "Write output to file" : "Gravar a saída em um arquivo");
      }
    }
  });

  it("preserves org JSON and binary bytes for successes in both locales", async () => {
    const org = { companyId: COMPANY_ID, rootAgentId: "agent-root", nodes: [{ id: "agent-root", name: "CEO" }] };
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(org));
      await runCommand(operationArgs("org", "get", "--json"), locale);
      expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([JSON.stringify(org, null, 2)]);
      logSpy.mockClear();
    }
    expect(fetchMock.mock.calls.slice(0, 2).map(([url]) => new URL(String(url)).pathname)).toEqual([
      OPERATIONS[0].path,
      OPERATIONS[0].path,
    ]);

    const svgBytes = Buffer.from("<svg><text>raw: Organização</text></svg>", "utf8");
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(new Response(svgBytes, { headers: { "content-type": "image/svg+xml" } }));
      await runCommand(operationArgs("org", "svg"), locale);
      expect(stdoutSpy.mock.calls.map(([chunk]) => chunk)).toEqual([svgBytes]);
      stdoutSpy.mockClear();
    }

    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
    const pngPath = path.join(tempRoot, "org-chart.png");
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(new Response(pngBytes, { headers: { "content-type": "image/png" } }));
      await runCommand(["org", "png", "--out", pngPath, "--json", "--company-id", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token"], locale);
      expect(await readFile(pngPath)).toEqual(pngBytes);
      expect(logSpy.mock.calls.map((call: readonly unknown[]) => String(call[0]))).toEqual([
        JSON.stringify({ out: pngPath, bytes: pngBytes.byteLength }, null, 2),
      ]);
      logSpy.mockClear();
    }

    expect(fetchMock.mock.calls.slice(2).map(([url]) => new URL(String(url)).pathname)).toEqual([
      OPERATIONS[1].path,
      OPERATIONS[1].path,
      OPERATIONS[2].path,
      OPERATIONS[2].path,
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes human API errors but preserves structured stderr and exit status", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const failure = { error: "Org chart backend detail", details: { code: "ORG_READ_DENIED" } };

    for (const operation of OPERATIONS) {
      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 502));
        await expect(runCommand(operationArgs("org", operation.name), locale)).rejects.toThrow("exit:1");
        const message = String(errorSpy.mock.calls.at(-1)?.[0]);
        expect(message).toContain(locale === "en" ? "API error 502:" : "Erro de API 502:");
        if (operation.name === "get") {
          expect(message).toContain("Org chart backend detail");
          expect(message).toContain('details={"code":"ORG_READ_DENIED"}');
        } else {
          expect(message).toContain(JSON.stringify(failure));
        }
        errorSpy.mockClear();
      }

      for (const locale of ["pt-BR", "en"] as const) {
        fetchMock.mockResolvedValueOnce(jsonResponse(failure, 502));
        await expect(runCommand(["org", operation.name, "--json", "--company-id", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token"], locale)).rejects.toThrow("exit:1");
        const expected = operation.name === "get"
          ? "API error 502: Org chart backend detail details={\"code\":\"ORG_READ_DENIED\"}"
          : `API error 502: ${JSON.stringify(failure)}`;
        expect(errorSpy.mock.calls.at(-1)?.[0]).toContain(expected);
        errorSpy.mockClear();
      }
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual(Array(OPERATIONS.length * 4).fill(1));
    expect(fetchMock).toHaveBeenCalledTimes(OPERATIONS.length * 4);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
