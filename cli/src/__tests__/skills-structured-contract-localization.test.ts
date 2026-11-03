import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerSkillsCommands } from "../commands/client/skills.js";
import { setCliLocale } from "../localization/index.js";
import type { SupportedLocale } from "@paperclipai/shared/localization";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;

const COMPANY_SKILLS = [
  {
    id: "skill-1",
    companyId: "company-1",
    key: "paperclip/revisao-prs",
    slug: "revisao-prs",
    name: "Revisão de PRs",
    description: "Checklist mantido pela equipe para revisar pull requests.",
    markdown: "# Revisão de PRs\n\nPreserve este conteúdo livre.",
    sourceType: "local_path",
    sourceLocator: null,
    sourceRef: null,
    trustLevel: "markdown_only",
    compatibility: "compatible",
    fileInventory: [{ path: "SKILL.md", kind: "skill" }],
    metadata: { ownerNote: "Texto definido pela equipe" },
    createdAt: "2026-05-26T00:00:00.000Z",
    updatedAt: "2026-05-26T00:00:00.000Z",
    attachedAgentCount: 1,
    editable: true,
    editableReason: null,
    sourceLabel: null,
    sourceBadge: "local",
    sourcePath: null,
  },
];

const INSTALLED_SKILL = {
  id: "skill-installed",
  companyId: "company-1",
  key: "paperclip/minha-skill",
  slug: "minha-skill",
  name: "Minha skill",
  description: "Uma descrição livre.",
};

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerSkillsCommands(program);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function runCommand(args: string[], locale: SupportedLocale): Promise<void> {
  process.argv = ["node", "paperclipai", ...args];
  await makeProgram(locale).parseAsync(args, { from: "user" });
}

describe("skills CLI structured contract localization", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    process.argv = ["node", "paperclipai"];
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

  it("keeps list JSON, user-authored fields, route, and auth headers identical in PT-BR and en", async () => {
    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(COMPANY_SKILLS));
      await runCommand([
        "skills", "list",
        "--company-id", "company-1",
        "--api-base", "http://paperclip.test",
        "--api-key", "fixture-token",
        "--json",
      ], locale);
      outputs.push(String(logSpy.mock.calls.at(-1)?.[0]));
    }

    expect(outputs[0]).toBe(JSON.stringify(COMPANY_SKILLS, null, 2));
    expect(outputs[1]).toBe(outputs[0]);
    expect(JSON.parse(outputs[0]!)).toEqual(COMPANY_SKILLS);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method, options?.headers])).toEqual([
      ["http://paperclip.test/api/companies/company-1/skills", "GET", expect.objectContaining({ authorization: "Bearer fixture-token" })],
      ["http://paperclip.test/api/companies/company-1/skills", "GET", expect.objectContaining({ authorization: "Bearer fixture-token" })],
    ]);
  });

  it("preserves install route and request payload while returning the same structured result in both locales", async () => {
    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(INSTALLED_SKILL));
      await runCommand([
        "skills", "install", "paperclipai:bundled:review-prs",
        "--company-id", "company-1",
        "--api-base", "http://paperclip.test",
        "--api-key", "fixture-token",
        "--as", "minha-skill",
        "--force",
        "--json",
      ], locale);
      outputs.push(String(logSpy.mock.calls.at(-1)?.[0]));
      logSpy.mockClear();
    }

    expect(outputs[0]).toBe(JSON.stringify(INSTALLED_SKILL, null, 2));
    expect(outputs[1]).toBe(outputs[0]);
    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method, options?.headers, options?.body])).toEqual([
      [
        "http://paperclip.test/api/companies/company-1/skills/install-catalog",
        "POST",
        expect.objectContaining({ authorization: "Bearer fixture-token" }),
        JSON.stringify({ catalogSkillId: "paperclipai:bundled:review-prs", slug: "minha-skill", force: true }),
      ],
      [
        "http://paperclip.test/api/companies/company-1/skills/install-catalog",
        "POST",
        expect.objectContaining({ authorization: "Bearer fixture-token" }),
        JSON.stringify({ catalogSkillId: "paperclipai:bundled:review-prs", slug: "minha-skill", force: true }),
      ],
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("keeps JSON not-found stderr English and exits with code 1 in both locales", async () => {
    const errorOutputs: string[] = [];
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse([]));
      await expect(runCommand([
        "skills", "show", "SKILL FROM FIXTURE",
        "--company-id", "company-1",
        "--api-base", "http://paperclip.test",
        "--api-key", "fixture-token",
        "--json",
      ], locale)).rejects.toThrow("exit:1");
      errorOutputs.push(String(errorSpy.mock.calls.at(-1)?.[0]));
      logSpy.mockClear();
      errorSpy.mockClear();
    }

    expect(errorOutputs).toEqual([
      'Skill not found: SKILL FROM FIXTURE',
      'Skill not found: SKILL FROM FIXTURE',
    ]);
    expect(logSpy).not.toHaveBeenCalled();
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1]);
    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method])).toEqual([
      ["http://paperclip.test/api/companies/company-1/skills", "GET"],
      ["http://paperclip.test/api/companies/company-1/skills", "GET"],
    ]);
  });
});
