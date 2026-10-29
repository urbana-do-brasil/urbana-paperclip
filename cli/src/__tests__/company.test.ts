import { Command } from "commander";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyPortabilityPreviewResult } from "@paperclipai/shared";
import { setCliLocale } from "../localization/index.js";
import {
  buildCompanyDashboardUrl,
  buildDefaultImportAdapterOverrides,
  buildDefaultImportSelectionState,
  buildImportSelectionCatalog,
  buildSelectedFilesFromImportSelection,
  renderCompanyImportPreview,
  renderCompanyImportResult,
  registerCompanyCommands,
  resolveCompanyImportApplyConfirmationMode,
  resolveCompanyImportApiPath,
} from "../commands/client/company.js";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const EMPTY_CONTEXT_PATH = path.join(os.tmpdir(), `paperclip-company-context-${randomUUID()}.json`);

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  registerCompanyCommands(program);
  return program;
}

async function runCommand(args: string[]): Promise<void> {
  await makeProgram().parseAsync(args, { from: "user" });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function company(overrides: Record<string, unknown> = {}) {
  return {
    id: COMPANY_ID,
    name: "Paperclip",
    description: null,
    status: "active",
    issuePrefix: "PAP",
    issueCounter: 1,
    budgetMonthlyCents: 0,
    spentMonthlyCents: 0,
    requireBoardApprovalForNewAgents: false,
    feedbackDataSharingEnabled: false,
    feedbackDataSharingConsentAt: null,
    feedbackDataSharingConsentByUserId: null,
    feedbackDataSharingTermsVersion: null,
    logoAssetId: null,
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
    logoUrl: null,
    ...overrides,
  };
}

describe("company CLI commands", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.PAPERCLIP_API_URL;
    delete process.env.PAPERCLIP_API_KEY;
    delete process.env.PAPERCLIP_COMPANY_ID;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.argv = ORIGINAL_ARGV;
    process.env = { ...ORIGINAL_ENV };
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("localizes empty company lists and preserves records and JSON contracts", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([company()]))
      .mockResolvedValueOnce(jsonResponse([company()]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([company()]))
      .mockResolvedValueOnce(jsonResponse([company()]));

    setCliLocale("pt-BR");
    await runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token"]);
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(vazio)");

    setCliLocale("en");
    await runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token"]);
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(empty)");

    setCliLocale("pt-BR");
    await runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token"]);
    const ptRecord = String(logSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token"]);
    const enRecord = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(ptRecord).toBe(enRecord);
    expect(ptRecord).toContain(`id=${COMPANY_ID} name=Paperclip status=active`);

    setCliLocale("pt-BR");
    await runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"]);
    const ptEmptyJson = String(logSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"]);
    const enEmptyJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(ptEmptyJson).toBe("[]");
    expect(enEmptyJson).toBe(ptEmptyJson);

    setCliLocale("pt-BR");
    await runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"]);
    const ptJson = String(logSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"]);
    const enJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(ptJson).toBe(enJson);
    expect(JSON.parse(ptJson)).toEqual([company()]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes company-list API failures while preserving details and exit status", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "company fixture failure" }, 500))
      .mockResolvedValueOnce(jsonResponse({ error: "company fixture failure" }, 500));
    process.argv = ["node", "paperclipai", "company", "list"];
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    setCliLocale("pt-BR");
    await expect(runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token"]))
      .rejects.toThrow("exit:1");
    const ptError = String(errorSpy.mock.calls.at(-1)?.[0]);

    setCliLocale("en");
    await expect(runCommand(["company", "list", "--api-base", "http://paperclip.test", "--api-key", "board-token"]))
      .rejects.toThrow("exit:1");
    const enError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(ptError).toContain("Erro de API 500: Não foi possível concluir a solicitação. Detalhes: company fixture failure");
    expect(enError).toContain("API error 500: The request could not be completed. Details: company fixture failure");
    expect(logSpy).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1]);
  });

  it("preserves company get and current JSON records across locales", async () => {
    const responseCompany = company({ name: "Acme", issuePrefix: "ACME" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(responseCompany))
      .mockResolvedValueOnce(jsonResponse(responseCompany))
      .mockResolvedValueOnce(jsonResponse(responseCompany))
      .mockResolvedValueOnce(jsonResponse(responseCompany));

    setCliLocale("pt-BR");
    await runCommand([
      "company", "get", COMPANY_ID,
      "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json",
    ]);
    const ptGet = String(logSpy.mock.calls.at(-1)?.[0]);

    setCliLocale("en");
    await runCommand([
      "company", "get", COMPANY_ID,
      "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json",
    ]);
    const enGet = String(logSpy.mock.calls.at(-1)?.[0]);

    setCliLocale("pt-BR");
    await runCommand([
      "company", "current", "--company-id", COMPANY_ID,
      "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json",
    ]);
    const ptCurrent = String(logSpy.mock.calls.at(-1)?.[0]);

    setCliLocale("en");
    await runCommand([
      "company", "current", "--company-id", COMPANY_ID,
      "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json",
    ]);
    const enCurrent = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(ptGet).toBe(enGet);
    expect(ptCurrent).toBe(enCurrent);
    expect(JSON.parse(ptGet)).toEqual(responseCompany);
    expect(JSON.parse(ptCurrent)).toEqual(responseCompany);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `http://paperclip.test/api/companies/${COMPANY_ID}`,
      `http://paperclip.test/api/companies/${COMPANY_ID}`,
      `http://paperclip.test/api/companies/${COMPANY_ID}`,
      `http://paperclip.test/api/companies/${COMPANY_ID}`,
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("localizes null company results only in human output", async () => {
    const noContent = () => new Response(null, { status: 204 });
    fetchMock
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent());

    setCliLocale("pt-BR");
    await runCommand(["company", "get", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token"]);
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(nulo)");
    setCliLocale("en");
    await runCommand(["company", "get", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token"]);
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(null)");

    setCliLocale("pt-BR");
    await runCommand(["company", "get", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"]);
    const ptGetJson = String(logSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await runCommand(["company", "get", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"]);
    const enGetJson = String(logSpy.mock.calls.at(-1)?.[0]);

    setCliLocale("pt-BR");
    await runCommand(["company", "current", "--company-id", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token"]);
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(nulo)");
    setCliLocale("en");
    await runCommand(["company", "current", "--company-id", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token"]);
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(null)");

    setCliLocale("pt-BR");
    await runCommand(["company", "current", "--company-id", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"]);
    const ptCurrentJson = String(logSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await runCommand(["company", "current", "--company-id", COMPANY_ID, "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"]);
    const enCurrentJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(ptGetJson).toBe("null");
    expect(enGetJson).toBe(ptGetJson);
    expect(ptCurrentJson).toBe("null");
    expect(enCurrentJson).toBe(ptCurrentJson);
  });

  it("localizes company get API errors and current-company resolution failures", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "Company not found" }, 404))
      .mockResolvedValueOnce(jsonResponse({ error: "Company not found" }, 404))
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403))
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403))
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403))
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403));
    process.argv = ["node", "paperclipai", "company", "get", COMPANY_ID];
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const base = ["--api-base", "http://paperclip.test", "--api-key", "board-token"];
    const contextOption = ["--context", EMPTY_CONTEXT_PATH];

    setCliLocale("pt-BR");
    await expect(runCommand(["company", "get", COMPANY_ID, ...base])).rejects.toThrow("exit:1");
    const ptGetError = String(errorSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await expect(runCommand(["company", "get", COMPANY_ID, ...base])).rejects.toThrow("exit:1");
    const enGetError = String(errorSpy.mock.calls.at(-1)?.[0]);

    process.argv = ["node", "paperclipai", "company", "current", ...contextOption];
    setCliLocale("pt-BR");
    await expect(runCommand(["company", "current", ...contextOption, ...base])).rejects.toThrow("exit:1");
    const ptCurrentError = String(errorSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await expect(runCommand(["company", "current", ...contextOption, ...base])).rejects.toThrow("exit:1");
    const enCurrentError = String(errorSpy.mock.calls.at(-1)?.[0]);

    process.argv = ["node", "paperclipai", "company", "current", "--json", ...contextOption];
    setCliLocale("pt-BR");
    await expect(runCommand(["company", "current", ...contextOption, ...base, "--json"]))
      .rejects.toThrow("exit:1");
    const ptCurrentJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await expect(runCommand(["company", "current", ...contextOption, ...base, "--json"]))
      .rejects.toThrow("exit:1");
    const enCurrentJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(ptGetError).toContain("Erro de API 404: Não foi possível concluir a solicitação. Detalhes: Company not found");
    expect(enGetError).toContain("API error 404: The request could not be completed. Details: Company not found");
    expect(ptCurrentError).toContain("A organização atual não está disponível. Informe --company-id");
    expect(enCurrentError).toContain("Current company is not available. Pass --company-id");
    expect(ptCurrentError).not.toContain("Board access required");
    expect(enCurrentError).not.toContain("Board access required");
    expect(ptCurrentJsonError).toBe(enCurrentJsonError);
    expect(ptCurrentJsonError).toContain("Current company is not available. Pass --company-id");
    expect(logSpy).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("preserves company stats JSON and localizes human and structured failures", async () => {
    const stats = {
      companyCount: 2,
      totalMonthlyBudgetCents: 45000,
      byAgent: [{ agentId: "agent-1", spentMonthlyCents: 12500 }],
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(stats))
      .mockResolvedValueOnce(jsonResponse(stats))
      .mockResolvedValueOnce(jsonResponse({ error: "provider unavailable", messageKey: "service_unavailable" }, 503))
      .mockResolvedValueOnce(jsonResponse({ error: "provider unavailable", messageKey: "service_unavailable" }, 503))
      .mockResolvedValueOnce(jsonResponse({ error: "stats fixture failure", details: { code: "STATS_FAILED" } }, 503))
      .mockResolvedValueOnce(jsonResponse({ error: "stats fixture failure", details: { code: "STATS_FAILED" } }, 503));

    const base = ["--api-base", "http://paperclip.test", "--api-key", "board-token"];
    setCliLocale("pt-BR");
    await runCommand(["company", "stats", ...base, "--json"]);
    const ptJson = String(logSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await runCommand(["company", "stats", ...base, "--json"]);
    const enJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(ptJson).toBe(enJson);
    expect(JSON.parse(ptJson)).toEqual(stats);

    process.argv = ["node", "paperclipai", "company", "stats"];
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    setCliLocale("pt-BR");
    await expect(runCommand(["company", "stats", ...base])).rejects.toThrow("exit:1");
    const ptHumanError = String(errorSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await expect(runCommand(["company", "stats", ...base])).rejects.toThrow("exit:1");
    const enHumanError = String(errorSpy.mock.calls.at(-1)?.[0]);

    process.argv = ["node", "paperclipai", "company", "stats", "--json"];
    setCliLocale("pt-BR");
    await expect(runCommand(["company", "stats", ...base, "--json"])).rejects.toThrow("exit:1");
    const ptJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await expect(runCommand(["company", "stats", ...base, "--json"])).rejects.toThrow("exit:1");
    const enJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(ptHumanError).toContain("Erro de API 503: O Paperclip está temporariamente indisponível.");
    expect(enHumanError).toContain("API error 503: Paperclip is temporarily unavailable.");
    expect(ptJsonError).toBe(enJsonError);
    expect(ptJsonError).toBe('API error 503: stats fixture failure details={"code":"STATS_FAILED"}');
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
  });

  it("localizes an empty company stats result without translating JSON null", async () => {
    const noContent = () => new Response(null, { status: 204 });
    fetchMock
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent())
      .mockResolvedValueOnce(noContent());
    const base = ["company", "stats", "--api-base", "http://paperclip.test", "--api-key", "board-token"];

    setCliLocale("pt-BR");
    await runCommand(base);
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(nulo)");
    setCliLocale("en");
    await runCommand(base);
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(null)");

    setCliLocale("pt-BR");
    await runCommand([...base, "--json"]);
    const ptJson = String(logSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await runCommand([...base, "--json"]);
    const enJson = String(logSpy.mock.calls.at(-1)?.[0]);
    expect(ptJson).toBe("null");
    expect(enJson).toBe(ptJson);
  });

  it("gets the current company from an explicit company context without board-wide listing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(company()));

    await runCommand([
      "company",
      "current",
      "--company-id",
      COMPANY_ID,
      "--api-base",
      "http://paperclip.test",
      "--api-key",
      "agent-token",
      "--json",
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://paperclip.test/api/companies/${COMPANY_ID}`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({ id: COMPANY_ID, name: "Paperclip" });
  });

  it("gets the current company from agent authentication when no company context is set", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: "agent-1", companyId: COMPANY_ID }))
      .mockResolvedValueOnce(jsonResponse(company()));

    await runCommand([
      "company",
      "current",
      "--api-base",
      "http://paperclip.test",
      "--api-key",
      "agent-token",
      "--json",
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://paperclip.test/api/agents/me",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://paperclip.test/api/companies/${COMPANY_ID}`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({ id: COMPANY_ID, name: "Paperclip" });
  });

  it("lists the scoped agent company when board-wide company listing is denied", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403))
      .mockResolvedValueOnce(jsonResponse({ id: "agent-1", companyId: COMPANY_ID }))
      .mockResolvedValueOnce(jsonResponse(company()));

    await runCommand([
      "company",
      "list",
      "--api-base",
      "http://paperclip.test",
      "--api-key",
      "agent-token",
      "--json",
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://paperclip.test/api/companies",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://paperclip.test/api/agents/me",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `http://paperclip.test/api/companies/${COMPANY_ID}`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject([{ id: COMPANY_ID, name: "Paperclip" }]);
  });

  it("localizes the company creation authorization guidance but stabilizes --json output", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403))
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403))
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403))
      .mockResolvedValueOnce(jsonResponse({ error: "Board access required" }, 403));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const args = ["company", "create", "--payload-json", "{\"name\":\"Disposable\"}", "--api-base", "http://paperclip.test", "--api-key", "agent-token"];

    process.argv = ["node", "paperclipai", "company", "create"];
    setCliLocale("pt-BR");
    await expect(runCommand(args)).rejects.toThrow("exit:1");
    const ptHuman = String(errorSpy.mock.calls.at(-1)?.[0]);
    process.argv = ["node", "paperclipai", "company", "create"];
    setCliLocale("en");
    await expect(runCommand(args)).rejects.toThrow("exit:1");
    const enHuman = String(errorSpy.mock.calls.at(-1)?.[0]);

    process.argv = ["node", "paperclipai", "company", "create", "--json"];
    setCliLocale("pt-BR");
    await expect(runCommand([...args, "--json"])).rejects.toThrow("exit:1");
    const ptJson = String(errorSpy.mock.calls.at(-1)?.[0]);
    process.argv = ["node", "paperclipai", "company", "create", "--json"];
    setCliLocale("en");
    await expect(runCommand([...args, "--json"])).rejects.toThrow("exit:1");
    const enJson = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(ptHuman).toContain("Para criar organizações é necessária autenticação board/instance-admin.");
    expect(ptHuman).toContain("paperclipai company list --json");
    expect(enHuman).toContain("Creating companies requires board/instance-admin authentication");
    expect(enHuman).toContain("paperclipai company list --json");
    expect(ptJson).toBe(enJson);
    expect(ptJson).toContain("Creating companies requires board/instance-admin authentication");
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
      ...Array.from({ length: 4 }, () => [
        "http://paperclip.test/api/companies",
        "POST",
        "{\"name\":\"Disposable\"}",
      ]),
    ]);
    expect(logSpy).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
  });

  it("preserves create, update, and archive payload and JSON contracts", async () => {
    const createPayload = { name: "Acme", issuePrefix: "ACME", budgetMonthlyCents: 25000 };
    const updatePayload = { name: "Acme Labs", requireBoardApprovalForNewAgents: true };
    const created = company({ name: "Acme", issuePrefix: "ACME", budgetMonthlyCents: 25000 });
    const updated = company({ name: "Acme Labs", requireBoardApprovalForNewAgents: true });
    const archived = company({ status: "archived" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(created))
      .mockResolvedValueOnce(jsonResponse(updated))
      .mockResolvedValueOnce(jsonResponse(archived))
      .mockResolvedValueOnce(jsonResponse(created))
      .mockResolvedValueOnce(jsonResponse(updated))
      .mockResolvedValueOnce(jsonResponse(archived));
    const base = ["--api-base", "http://paperclip.test", "--api-key", "board-token", "--json"];

    const runMutations = async (locale: "pt-BR" | "en") => {
      setCliLocale(locale);
      await runCommand(["company", "create", "--payload-json", JSON.stringify(createPayload), ...base]);
      const createOutput = String(logSpy.mock.calls.at(-1)?.[0]);
      await runCommand(["company", "update", COMPANY_ID, "--payload-json", JSON.stringify(updatePayload), ...base]);
      const updateOutput = String(logSpy.mock.calls.at(-1)?.[0]);
      await runCommand(["company", "archive", COMPANY_ID, ...base]);
      const archiveOutput = String(logSpy.mock.calls.at(-1)?.[0]);
      return { createOutput, updateOutput, archiveOutput };
    };

    const pt = await runMutations("pt-BR");
    const en = await runMutations("en");

    expect(pt).toEqual(en);
    expect(JSON.parse(pt.createOutput)).toEqual(created);
    expect(JSON.parse(pt.updateOutput)).toEqual(updated);
    expect(JSON.parse(pt.archiveOutput)).toEqual(archived);
    expect(fetchMock.mock.calls.map(([url, init]) => [init?.method ?? "GET", url, init?.body])).toEqual([
      ["POST", "http://paperclip.test/api/companies", JSON.stringify(createPayload)],
      ["PATCH", `http://paperclip.test/api/companies/${COMPANY_ID}`, JSON.stringify(updatePayload)],
      ["POST", `http://paperclip.test/api/companies/${COMPANY_ID}/archive`, "{}"],
      ["POST", "http://paperclip.test/api/companies", JSON.stringify(createPayload)],
      ["PATCH", `http://paperclip.test/api/companies/${COMPANY_ID}`, JSON.stringify(updatePayload)],
      ["POST", `http://paperclip.test/api/companies/${COMPANY_ID}/archive`, "{}"],
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves the company branding update payload, endpoint, and JSON response", async () => {
    const brandingPayload = {
      name: "Acme Studio",
      description: null,
      logoAssetId: "44444444-4444-4444-8444-444444444444",
    };
    const responseCompany = company(brandingPayload);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(responseCompany))
      .mockResolvedValueOnce(jsonResponse(responseCompany));
    const base = [
      "company", "branding:update", COMPANY_ID,
      "--payload-json", JSON.stringify(brandingPayload),
      "--api-base", "http://paperclip.test", "--api-key", "board-token", "--json",
    ];

    setCliLocale("pt-BR");
    await runCommand(base);
    const ptJson = String(logSpy.mock.calls.at(-1)?.[0]);
    setCliLocale("en");
    await runCommand(base);
    const enJson = String(logSpy.mock.calls.at(-1)?.[0]);

    expect(ptJson).toBe(enJson);
    expect(JSON.parse(ptJson)).toEqual(responseCompany);
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
      [
        `http://paperclip.test/api/companies/${COMPANY_ID}/branding`,
        "PATCH",
        JSON.stringify(brandingPayload),
      ],
      [
        `http://paperclip.test/api/companies/${COMPANY_ID}/branding`,
        "PATCH",
        JSON.stringify(brandingPayload),
      ],
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves company branding validation and structured errors across locales", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "Invalid branding fields", details: { field: "logoAssetId" }, messageKey: "validation" }, 422))
      .mockResolvedValueOnce(jsonResponse({ error: "Invalid branding fields", details: { field: "logoAssetId" }, messageKey: "validation" }, 422))
      .mockResolvedValueOnce(jsonResponse({ error: "Structured branding failure", details: { code: "BRANDING_REJECTED" } }, 422))
      .mockResolvedValueOnce(jsonResponse({ error: "Structured branding failure", details: { code: "BRANDING_REJECTED" } }, 422));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const args = [
      "company", "branding:update", COMPANY_ID,
      "--payload-json", "{\"name\":\"Acme Studio\"}",
      "--api-base", "http://paperclip.test", "--api-key", "board-token",
    ];

    process.argv = ["node", "paperclipai", "company", "branding:update", COMPANY_ID];
    setCliLocale("pt-BR");
    await expect(runCommand(args)).rejects.toThrow("exit:1");
    const ptHumanError = String(errorSpy.mock.calls.at(-1)?.[0]);
    process.argv = ["node", "paperclipai", "company", "branding:update", COMPANY_ID];
    setCliLocale("en");
    await expect(runCommand(args)).rejects.toThrow("exit:1");
    const enHumanError = String(errorSpy.mock.calls.at(-1)?.[0]);

    process.argv = ["node", "paperclipai", "company", "branding:update", COMPANY_ID, "--json"];
    setCliLocale("pt-BR");
    await expect(runCommand([...args, "--json"])).rejects.toThrow("exit:1");
    const ptJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);
    process.argv = ["node", "paperclipai", "company", "branding:update", COMPANY_ID, "--json"];
    setCliLocale("en");
    await expect(runCommand([...args, "--json"])).rejects.toThrow("exit:1");
    const enJsonError = String(errorSpy.mock.calls.at(-1)?.[0]);

    expect(ptHumanError).toContain("Erro de API 422: Os dados enviados são inválidos.");
    expect(ptHumanError).toContain('details={"field":"logoAssetId"}');
    expect(enHumanError).toContain("API error 422: The submitted data is invalid.");
    expect(enHumanError).toContain('details={"field":"logoAssetId"}');
    expect(ptJsonError).toBe(enJsonError);
    expect(ptJsonError).toBe('API error 422: Structured branding failure details={"code":"BRANDING_REJECTED"}');
    expect(logSpy).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
  });

  it("preserves update and archive error status, details, and --json presentation", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "Update rejected", details: { field: "name" }, messageKey: "validation" }, 422))
      .mockResolvedValueOnce(jsonResponse({ error: "Update rejected", details: { field: "name" }, messageKey: "validation" }, 422))
      .mockResolvedValueOnce(jsonResponse({ error: "Structured update failure", details: { code: "UPDATE_REJECTED" } }, 422))
      .mockResolvedValueOnce(jsonResponse({ error: "Structured update failure", details: { code: "UPDATE_REJECTED" } }, 422))
      .mockResolvedValueOnce(jsonResponse({ error: "Archive conflict", details: { code: "ACTIVE_AGENTS" } }, 409))
      .mockResolvedValueOnce(jsonResponse({ error: "Archive conflict", details: { code: "ACTIVE_AGENTS" } }, 409))
      .mockResolvedValueOnce(jsonResponse({ error: "Structured archive failure", details: { code: "ARCHIVE_REJECTED" } }, 409))
      .mockResolvedValueOnce(jsonResponse({ error: "Structured archive failure", details: { code: "ARCHIVE_REJECTED" } }, 409));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const base = ["--api-base", "http://paperclip.test", "--api-key", "board-token"];
    const payload = JSON.stringify({ name: "Renamed" });
    const runFailure = async (operation: "update" | "archive", locale: "pt-BR" | "en", json: boolean) => {
      setCliLocale(locale);
      const args = operation === "update"
        ? ["company", "update", COMPANY_ID, "--payload-json", payload, ...base]
        : ["company", "archive", COMPANY_ID, ...base];
      process.argv = ["node", "paperclipai", ...args, ...(json ? ["--json"] : [])];
      await expect(runCommand([...args, ...(json ? ["--json"] : [])])).rejects.toThrow("exit:1");
      return String(errorSpy.mock.calls.at(-1)?.[0]);
    };

    const ptUpdateHuman = await runFailure("update", "pt-BR", false);
    const enUpdateHuman = await runFailure("update", "en", false);
    const ptUpdateJson = await runFailure("update", "pt-BR", true);
    const enUpdateJson = await runFailure("update", "en", true);
    const ptArchiveHuman = await runFailure("archive", "pt-BR", false);
    const enArchiveHuman = await runFailure("archive", "en", false);
    const ptArchiveJson = await runFailure("archive", "pt-BR", true);
    const enArchiveJson = await runFailure("archive", "en", true);

    expect(ptUpdateHuman).toContain("Erro de API 422: Os dados enviados são inválidos.");
    expect(ptUpdateHuman).toContain('details={"field":"name"}');
    expect(enUpdateHuman).toContain("API error 422: The submitted data is invalid.");
    expect(ptUpdateJson).toBe(enUpdateJson);
    expect(ptUpdateJson).toBe('API error 422: Structured update failure details={"code":"UPDATE_REJECTED"}');
    expect(ptArchiveHuman).toContain("Erro de API 409: Não foi possível concluir a solicitação. Detalhes: Archive conflict");
    expect(ptArchiveHuman).toContain('details={"code":"ACTIVE_AGENTS"}');
    expect(enArchiveHuman).toContain("API error 409: The request could not be completed. Details: Archive conflict");
    expect(ptArchiveJson).toBe(enArchiveJson);
    expect(ptArchiveJson).toBe('API error 409: Structured archive failure details={"code":"ARCHIVE_REJECTED"}');
    expect(logSpy).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual(Array.from({ length: 8 }, () => 1));
  });
});

describe("resolveCompanyImportApiPath", () => {
  it("uses company-scoped preview route for existing-company dry runs", () => {
    expect(
      resolveCompanyImportApiPath({
        dryRun: true,
        targetMode: "existing_company",
        companyId: "company-123",
      }),
    ).toBe("/api/companies/company-123/imports/preview");
  });

  it("uses company-scoped apply route for existing-company imports", () => {
    expect(
      resolveCompanyImportApiPath({
        dryRun: false,
        targetMode: "existing_company",
        companyId: "company-123",
      }),
    ).toBe("/api/companies/company-123/imports/apply");
  });

  it("keeps global routes for new-company imports", () => {
    expect(
      resolveCompanyImportApiPath({
        dryRun: true,
        targetMode: "new_company",
      }),
    ).toBe("/api/companies/import/preview");

    expect(
      resolveCompanyImportApiPath({
        dryRun: false,
        targetMode: "new_company",
      }),
    ).toBe("/api/companies/import");
  });

  it("throws when an existing-company import is missing a company id", () => {
    expect(() =>
      resolveCompanyImportApiPath({
        dryRun: true,
        targetMode: "existing_company",
        companyId: " ",
      })
    ).toThrow(/require a companyId/i);
  });
});

describe("resolveCompanyImportApplyConfirmationMode", () => {
  it("skips confirmation when --yes is set", () => {
    expect(
      resolveCompanyImportApplyConfirmationMode({
        yes: true,
        interactive: false,
        json: false,
      }),
    ).toBe("skip");
  });

  it("prompts in interactive text mode when --yes is not set", () => {
    expect(
      resolveCompanyImportApplyConfirmationMode({
        yes: false,
        interactive: true,
        json: false,
      }),
    ).toBe("prompt");
  });

  it("requires --yes for non-interactive apply", () => {
    expect(() =>
      resolveCompanyImportApplyConfirmationMode({
        yes: false,
        interactive: false,
        json: false,
      })
    ).toThrow(/non-interactive terminal requires --yes/i);
  });

  it("requires --yes for json apply", () => {
    expect(() =>
      resolveCompanyImportApplyConfirmationMode({
        yes: false,
        interactive: false,
        json: true,
      })
    ).toThrow(/with --json requires --yes/i);
  });
});

describe("buildCompanyDashboardUrl", () => {
  it("preserves the configured base path when building a dashboard URL", () => {
    expect(buildCompanyDashboardUrl("https://paperclip.example/app/", "PAP")).toBe(
      "https://paperclip.example/app/PAP/dashboard",
    );
  });
});

describe("renderCompanyImportPreview", () => {
  it("summarizes the preview with counts, selection info, and truncated examples", () => {
    const preview: CompanyPortabilityPreviewResult = {
      include: {
        company: true,
        agents: true,
        projects: true,
        issues: true,
        skills: true,
      },
      targetCompanyId: "company-123",
      targetCompanyName: "Imported Co",
      collisionStrategy: "rename",
      selectedAgentSlugs: ["ceo", "cto", "eng-1", "eng-2", "eng-3", "eng-4", "eng-5"],
      plan: {
        companyAction: "update",
        agentPlans: [
          { slug: "ceo", action: "create", plannedName: "CEO", existingAgentId: null, reason: null },
          { slug: "cto", action: "update", plannedName: "CTO", existingAgentId: "agent-2", reason: "replace strategy" },
          { slug: "eng-1", action: "skip", plannedName: "Engineer 1", existingAgentId: "agent-3", reason: "skip strategy" },
          { slug: "eng-2", action: "create", plannedName: "Engineer 2", existingAgentId: null, reason: null },
          { slug: "eng-3", action: "create", plannedName: "Engineer 3", existingAgentId: null, reason: null },
          { slug: "eng-4", action: "create", plannedName: "Engineer 4", existingAgentId: null, reason: null },
          { slug: "eng-5", action: "create", plannedName: "Engineer 5", existingAgentId: null, reason: null },
        ],
        projectPlans: [
          { slug: "alpha", action: "create", plannedName: "Alpha", existingProjectId: null, reason: null },
        ],
        issuePlans: [
          { slug: "kickoff", action: "create", plannedTitle: "Kickoff", reason: null },
        ],
      },
      manifest: {
        schemaVersion: 1,
        generatedAt: "2026-03-23T17:00:00.000Z",
        source: {
          companyId: "company-src",
          companyName: "Source Co",
        },
        includes: {
          company: true,
          agents: true,
          projects: true,
          issues: true,
          skills: true,
        },
        company: {
          path: "COMPANY.md",
          name: "Source Co",
          description: null,
          logoPath: null,
          requireBoardApprovalForNewAgents: false,
          feedbackDataSharingEnabled: false,
          feedbackDataSharingConsentAt: null,
          feedbackDataSharingConsentByUserId: null,
          feedbackDataSharingTermsVersion: null,
        },
        sidebar: {
          agents: ["ceo"],
          projects: ["alpha"],
        },
        agents: [
          {
            slug: "ceo",
            name: "CEO",
            path: "agents/ceo/AGENT.md",
            skills: [],
            role: "ceo",
            title: null,
            icon: null,
            capabilities: null,
            reportsToSlug: null,
            reportsToExistingAgentId: null,
            reportsToExistingAgentSlug: null,
            adapterType: "codex_local",
            adapterConfig: {},
            runtimeConfig: {},
            permissions: {},
            permissionGrants: [],
            budgetMonthlyCents: 0,
            metadata: null,
          },
        ],
        skills: [
          {
            key: "skill-a",
            slug: "skill-a",
            name: "Skill A",
            path: "skills/skill-a/SKILL.md",
            description: null,
            sourceType: "inline",
            sourceLocator: null,
            sourceRef: null,
            trustLevel: null,
            compatibility: null,
            metadata: null,
            fileInventory: [],
          },
        ],
        projects: [
          {
            slug: "alpha",
            name: "Alpha",
            path: "projects/alpha/PROJECT.md",
            description: null,
            ownerAgentSlug: null,
            leadAgentSlug: null,
            targetDate: null,
            color: null,
            icon: null,
            status: null,
            executionWorkspacePolicy: null,
            workspaces: [],
            env: null,
            metadata: null,
          },
        ],
        issues: [
          {
            slug: "kickoff",
            identifier: null,
            title: "Kickoff",
            path: "projects/alpha/issues/kickoff/TASK.md",
            projectSlug: "alpha",
            projectWorkspaceKey: null,
            assigneeAgentSlug: "ceo",
            description: null,
            recurring: false,
            routine: null,
            legacyRecurrence: null,
            status: null,
            priority: null,
            labelIds: [],
            billingCode: null,
            executionWorkspaceSettings: null,
            assigneeAdapterOverrides: null,
            comments: [],
            metadata: null,
          },
        ],
        envInputs: [
          {
            key: "OPENAI_API_KEY",
            description: null,
            agentSlug: "ceo",
            projectSlug: null,
            kind: "secret",
            requirement: "required",
            defaultValue: null,
            portability: "portable",
          },
        ],
      },
      files: {
        "COMPANY.md": "# Source Co",
      },
      envInputs: [
        {
          key: "OPENAI_API_KEY",
          description: null,
          agentSlug: "ceo",
          projectSlug: null,
          kind: "secret",
          requirement: "required",
          defaultValue: null,
          portability: "portable",
        },
      ],
      warnings: ["One warning"],
      errors: ["One error"],
    };

    const rendered = renderCompanyImportPreview(preview, {
      sourceLabel: "GitHub: https://github.com/paperclipai/companies/demo",
      targetLabel: "Imported Co (company-123)",
      infoMessages: ["Using claude-local adapter"],
    });

    expect(rendered).toContain("Include");
    expect(rendered).toContain("company, projects, tasks, agents, skills");
    expect(rendered).toContain("7 agents total");
    expect(rendered).toContain("1 project total");
    expect(rendered).toContain("1 task total");
    expect(rendered).toContain("skills: 1 skill packaged");
    expect(rendered).toContain("+1 more");
    expect(rendered).toContain("Using claude-local adapter");
    expect(rendered).toContain("Warnings");
    expect(rendered).toContain("Errors");
  });
});

describe("renderCompanyImportResult", () => {
  it("summarizes import results with created, updated, and skipped counts", () => {
    const rendered = renderCompanyImportResult(
      {
        company: {
          id: "company-123",
          name: "Imported Co",
          action: "updated",
        },
        agents: [
          { slug: "ceo", id: "agent-1", action: "created", name: "CEO", reason: null },
          { slug: "cto", id: "agent-2", action: "updated", name: "CTO", reason: "replace strategy" },
          { slug: "ops", id: null, action: "skipped", name: "Ops", reason: "skip strategy" },
        ],
        skills: [
          {
            originalKey: "company/source/review",
            originalSlug: "review",
            key: "company/target/review-2",
            slug: "review-2",
            id: "skill-1",
            action: "renamed",
            reason: "rename strategy",
          },
        ],
        projects: [
          { slug: "app", id: "project-1", action: "created", name: "App", reason: null },
          { slug: "ops", id: "project-2", action: "updated", name: "Operations", reason: "replace strategy" },
          { slug: "archive", id: null, action: "skipped", name: "Archive", reason: "skip strategy" },
        ],
        routines: [
          { slug: "weekly-report", id: "routine-1", action: "created", title: "Weekly report", status: "paused" },
        ],
        envInputs: [],
        warnings: ["Review API keys"],
      },
      {
        targetLabel: "Imported Co (company-123)",
        companyUrl: "https://paperclip.example/PAP/dashboard",
        infoMessages: ["Using claude-local adapter"],
      },
    );

    expect(rendered).toContain("Company");
    expect(rendered).toContain("https://paperclip.example/PAP/dashboard");
    expect(rendered).toContain("3 agents total (1 created, 1 updated, 1 skipped)");
    expect(rendered).toContain("1 skill total (1 renamed)");
    expect(rendered).toContain("3 projects total (1 created, 1 updated, 1 skipped)");
    expect(rendered).toContain("Agent results");
    expect(rendered).toContain("Skill results");
    expect(rendered).toContain("Project results");
    expect(rendered).toContain("Using claude-local adapter");
    expect(rendered).toContain("Review API keys");
  });
});

describe("import selection catalog", () => {
  it("defaults to everything and keeps project selection separate from task selection", () => {
    const preview: CompanyPortabilityPreviewResult = {
      include: {
        company: true,
        agents: true,
        projects: true,
        issues: true,
        skills: true,
      },
      targetCompanyId: "company-123",
      targetCompanyName: "Imported Co",
      collisionStrategy: "rename",
      selectedAgentSlugs: ["ceo"],
      plan: {
        companyAction: "create",
        agentPlans: [],
        projectPlans: [],
        issuePlans: [],
      },
      manifest: {
        schemaVersion: 1,
        generatedAt: "2026-03-23T18:00:00.000Z",
        source: {
          companyId: "company-src",
          companyName: "Source Co",
        },
        includes: {
          company: true,
          agents: true,
          projects: true,
          issues: true,
          skills: true,
        },
        company: {
          path: "COMPANY.md",
          name: "Source Co",
          description: null,
          logoPath: "images/company-logo.png",
          requireBoardApprovalForNewAgents: false,
          feedbackDataSharingEnabled: false,
          feedbackDataSharingConsentAt: null,
          feedbackDataSharingConsentByUserId: null,
          feedbackDataSharingTermsVersion: null,
        },
        sidebar: {
          agents: ["ceo"],
          projects: ["alpha"],
        },
        agents: [
          {
            slug: "ceo",
            name: "CEO",
            path: "agents/ceo/AGENT.md",
            skills: [],
            role: "ceo",
            title: null,
            icon: null,
            capabilities: null,
            reportsToSlug: null,
            reportsToExistingAgentId: null,
            reportsToExistingAgentSlug: null,
            adapterType: "codex_local",
            adapterConfig: {},
            runtimeConfig: {},
            permissions: {},
            permissionGrants: [],
            budgetMonthlyCents: 0,
            metadata: null,
          },
        ],
        skills: [
          {
            key: "skill-a",
            slug: "skill-a",
            name: "Skill A",
            path: "skills/skill-a/SKILL.md",
            description: null,
            sourceType: "inline",
            sourceLocator: null,
            sourceRef: null,
            trustLevel: null,
            compatibility: null,
            metadata: null,
            fileInventory: [{ path: "skills/skill-a/helper.md", kind: "doc" }],
          },
        ],
        projects: [
          {
            slug: "alpha",
            name: "Alpha",
            path: "projects/alpha/PROJECT.md",
            description: null,
            ownerAgentSlug: null,
            leadAgentSlug: null,
            targetDate: null,
            color: null,
            icon: null,
            status: null,
            executionWorkspacePolicy: null,
            workspaces: [],
            env: null,
            metadata: null,
          },
        ],
        issues: [
          {
            slug: "kickoff",
            identifier: null,
            title: "Kickoff",
            path: "projects/alpha/issues/kickoff/TASK.md",
            projectSlug: "alpha",
            projectWorkspaceKey: null,
            assigneeAgentSlug: "ceo",
            description: null,
            recurring: false,
            routine: null,
            legacyRecurrence: null,
            status: null,
            priority: null,
            labelIds: [],
            billingCode: null,
            executionWorkspaceSettings: null,
            assigneeAdapterOverrides: null,
            comments: [],
            metadata: null,
          },
        ],
        envInputs: [],
      },
      files: {
        "COMPANY.md": "# Source Co",
        "README.md": "# Readme",
        ".paperclip.yaml": "schema: paperclip/v1\n",
        "images/company-logo.png": {
          encoding: "base64",
          data: "",
          contentType: "image/png",
        },
        "projects/alpha/PROJECT.md": "# Alpha",
        "projects/alpha/notes.md": "project notes",
        "projects/alpha/issues/kickoff/TASK.md": "# Kickoff",
        "projects/alpha/issues/kickoff/details.md": "task details",
        "agents/ceo/AGENT.md": "# CEO",
        "agents/ceo/prompt.md": "prompt",
        "skills/skill-a/SKILL.md": "# Skill A",
        "skills/skill-a/helper.md": "helper",
      },
      envInputs: [],
      warnings: [],
      errors: [],
    };

    const catalog = buildImportSelectionCatalog(preview);
    const state = buildDefaultImportSelectionState(catalog);

    expect(state.company).toBe(true);
    expect(state.projects.has("alpha")).toBe(true);
    expect(state.issues.has("kickoff")).toBe(true);
    expect(state.agents.has("ceo")).toBe(true);
    expect(state.skills.has("skill-a")).toBe(true);

    state.company = false;
    state.issues.clear();
    state.agents.clear();
    state.skills.clear();

    const selectedFiles = buildSelectedFilesFromImportSelection(catalog, state);

    expect(selectedFiles).toContain(".paperclip.yaml");
    expect(selectedFiles).toContain("projects/alpha/PROJECT.md");
    expect(selectedFiles).toContain("projects/alpha/notes.md");
    expect(selectedFiles).not.toContain("projects/alpha/issues/kickoff/TASK.md");
    expect(selectedFiles).not.toContain("projects/alpha/issues/kickoff/details.md");
  });

  it("includes extension file even when all entities are deselected", () => {
    const preview: CompanyPortabilityPreviewResult = {
      include: {
        company: true,
        agents: true,
        projects: true,
        issues: true,
        skills: true,
      },
      targetCompanyId: "company-123",
      targetCompanyName: "Imported Co",
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
        generatedAt: "2026-03-23T18:00:00.000Z",
        source: {
          companyId: "company-src",
          companyName: "Source Co",
        },
        includes: {
          company: true,
          agents: true,
          projects: true,
          issues: true,
          skills: true,
        },
        company: {
          path: "COMPANY.md",
          name: "Source Co",
          description: null,
          logoPath: null,
          requireBoardApprovalForNewAgents: false,
          feedbackDataSharingEnabled: false,
          feedbackDataSharingConsentAt: null,
          feedbackDataSharingConsentByUserId: null,
          feedbackDataSharingTermsVersion: null,
        },
        sidebar: {
          agents: [],
          projects: [],
        },
        agents: [],
        skills: [],
        projects: [],
        issues: [],
        envInputs: [],
      },
      files: {
        ".paperclip.yaml": "schema: paperclip/v1\n",
      },
      envInputs: [],
      warnings: [],
      errors: [],
    };

    const catalog = buildImportSelectionCatalog(preview);
    const state = buildDefaultImportSelectionState(catalog);

    state.company = false;
    state.projects.clear();
    state.issues.clear();
    state.agents.clear();
    state.skills.clear();

    const selectedFiles = buildSelectedFilesFromImportSelection(catalog, state);

    expect(selectedFiles).toContain(".paperclip.yaml");
    expect(selectedFiles).toHaveLength(1);
  });
});

describe("default adapter overrides", () => {
  it("maps process-only imported agents to claude_local", () => {
    const preview: CompanyPortabilityPreviewResult = {
      include: {
        company: false,
        agents: true,
        projects: false,
        issues: false,
        skills: false,
      },
      targetCompanyId: null,
      targetCompanyName: null,
      collisionStrategy: "rename",
      selectedAgentSlugs: ["legacy-agent", "explicit-agent"],
      plan: {
        companyAction: "none",
        agentPlans: [],
        projectPlans: [],
        issuePlans: [],
      },
      manifest: {
        schemaVersion: 1,
        generatedAt: "2026-03-23T18:20:00.000Z",
        source: null,
        includes: {
          company: false,
          agents: true,
          projects: false,
          issues: false,
          skills: false,
        },
        company: null,
        sidebar: null,
        agents: [
          {
            slug: "legacy-agent",
            name: "Legacy Agent",
            path: "agents/legacy-agent/AGENT.md",
            skills: [],
            role: "agent",
            title: null,
            icon: null,
            capabilities: null,
            reportsToSlug: null,
            reportsToExistingAgentId: null,
            reportsToExistingAgentSlug: null,
            adapterType: "process",
            adapterConfig: {},
            runtimeConfig: {},
            permissions: {},
            permissionGrants: [],
            budgetMonthlyCents: 0,
            metadata: null,
          },
          {
            slug: "explicit-agent",
            name: "Explicit Agent",
            path: "agents/explicit-agent/AGENT.md",
            skills: [],
            role: "agent",
            title: null,
            icon: null,
            capabilities: null,
            reportsToSlug: null,
            reportsToExistingAgentId: null,
            reportsToExistingAgentSlug: null,
            adapterType: "codex_local",
            adapterConfig: {},
            runtimeConfig: {},
            permissions: {},
            permissionGrants: [],
            budgetMonthlyCents: 0,
            metadata: null,
          },
        ],
        skills: [],
        projects: [],
        issues: [],
        envInputs: [],
      },
      files: {},
      envInputs: [],
      warnings: [],
      errors: [],
    };

    expect(buildDefaultImportAdapterOverrides(preview)).toEqual({
      "legacy-agent": {
        adapterType: "claude_local",
      },
    });
  });
});
