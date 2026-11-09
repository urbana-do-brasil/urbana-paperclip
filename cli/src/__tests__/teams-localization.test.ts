import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTeamCommands } from "../commands/client/teams.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const TEAM = {
  id: "paperclipai:bundled:software-development:product-engineering",
  key: "paperclipai/bundled/software-development/product-engineering",
  kind: "bundled",
  category: "software-development",
  slug: "product-engineering",
  name: "Product Engineering",
  description: "A software development team with CTO, coder, and QA roles.",
  path: "catalog/bundled/software-development/product-engineering",
  entrypoint: "TEAM.md",
  schema: "agentcompanies/v1",
  defaultInstall: true,
  recommendedForCompanyTypes: ["software"],
  tags: ["engineering"],
  counts: { agents: 3, projects: 1, tasks: 1, routines: 0, localSkills: 0, catalogSkills: 1, externalSkillSources: 0 },
  rootAgentSlugs: ["cto"],
  agentSlugs: ["cto", "senior-coder", "qa"],
  projectSlugs: ["product-engineering"],
  requiredSkills: [],
  envInputs: [],
  sourceRefs: [],
  files: [{ path: "TEAM.md", kind: "team", sizeBytes: 128, sha256: "sha256:team" }],
  trustLevel: "markdown_only",
  compatibility: "compatible",
  contentHash: "sha256:catalog-team",
};

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerTeamCommands(program);
  setCliCommandLineShape(program);
  applyOperationHelpLocalization(program, locale);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("teams catalog browse/search localization", () => {
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
    setCliCommandLineShape(undefined);
    setCliLocale("pt-BR");
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function run(args: readonly string[], locale: SupportedLocale): Promise<void> {
    const commandArgs = [...args, "--api-base", "http://paperclip.test", "--api-key", "board-token"];
    process.argv = ["node", "paperclipai", ...commandArgs];
    await makeProgram(locale).parseAsync(commandArgs, { from: "user" });
  }

  it.each([
    {
      locale: "pt-BR",
      group: "Operações do catálogo de equipes incluídas no Paperclip",
      browse: "Explorar equipes incluídas no catálogo sem instalá-las",
      search: "Buscar equipes incluídas no catálogo sem instalá-las",
      kind: "Filtrar pelo tipo do catálogo (bundled ou optional)",
      category: "Filtrar pela categoria do catálogo",
      query: "Texto da busca",
      json: "Exibir JSON bruto",
    },
    {
      locale: "en",
      group: "App-shipped team catalog operations",
      browse: "Browse app-shipped catalog teams without installing them",
      search: "Search app-shipped catalog teams without installing them",
      kind: "Catalog kind filter (bundled or optional)",
      category: "Catalog category filter",
      query: "Search text",
      json: "Output raw JSON",
    },
  ] as const)("localizes $locale help and rendered labels while keeping names, flags, and data", async ({ locale, group, browse, search, kind, category, query, json }) => {
    const program = makeProgram(locale);
    const teams = program.commands.find((command) => command.name() === "teams");
    const browseCommand = teams?.commands.find((command) => command.name() === "browse");
    const searchCommand = teams?.commands.find((command) => command.name() === "search");

    expect(teams?.description()).toBe(group);
    expect(browseCommand?.description()).toBe(browse);
    expect(searchCommand?.description()).toBe(search);
    const browseHelp = browseCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    const searchHelp = searchCommand?.helpInformation().replace(/\s+/g, " ") ?? "";
    expect(browseHelp).toContain("paperclipai teams browse [options]");
    expect(browseHelp).toContain("--kind <kind>");
    expect(browseHelp).toContain(kind);
    expect(browseHelp).toContain("--category <slug>");
    expect(browseHelp).toContain(category);
    expect(browseHelp).toContain("--json");
    expect(browseHelp).toContain(json);
    expect(searchHelp).toContain("paperclipai teams search [options] <query>");
    expect(searchHelp).toContain(`query ${query}`);

    fetchMock.mockResolvedValueOnce(jsonResponse([TEAM]));
    await run(["teams", "browse", "--kind", "bundled", "--category", "software-development", "--query", "engineering"], locale);
    const rendered = logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n");
    for (const label of locale === "pt-BR"
      ? ["Chave", "Tipo", "Categoria", "Nome", "Confiança", "Agentes", "Projetos"]
      : ["Key", "Kind", "Category", "Name", "Trust", "Agents", "Projects"]) {
      expect(rendered).toContain(label);
    }
    for (const value of [TEAM.id, TEAM.key, TEAM.kind, TEAM.category, TEAM.slug, TEAM.name, TEAM.trustLevel, "3", "1"]) {
      expect(rendered).toContain(value);
    }
    expect(fetchMock).toHaveBeenCalledWith(
      "http://paperclip.test/api/teams/catalog?kind=bundled&category=software-development&q=engineering",
      expect.objectContaining({ method: "GET" }),
    );

    logSpy.mockClear();
    fetchMock.mockResolvedValueOnce(jsonResponse([TEAM]));
    await run(["teams", "search", "engineering"], locale);
    expect(logSpy.mock.calls.map((call: unknown[]) => String(call[0])).join("\n")).toContain(TEAM.name);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://paperclip.test/api/teams/catalog?q=engineering",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("localizes empty human output and leaves JSON bytes equivalent in both locales", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await run(["teams", "browse"], "pt-BR");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(vazio)");
    logSpy.mockClear();
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    await run(["teams", "browse"], "en");
    expect(logSpy.mock.calls.at(-1)?.[0]).toBe("(empty)");

    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      logSpy.mockClear();
      fetchMock.mockResolvedValueOnce(jsonResponse([TEAM]));
      await run(["teams", "browse", "--json"], locale);
      outputs.push(String(logSpy.mock.calls.at(-1)?.[0]));
    }
    expect(outputs[0]).toBe(outputs[1]);
    expect(JSON.parse(outputs[0]!)).toEqual([TEAM]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("preserves API failure details, JSON stderr framing, and exit status", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`exit:${code ?? 0}`);
    }) as typeof process.exit);
    const failure = { error: "Catalog backend detail", details: { code: "TEAM_CATALOG_UNAVAILABLE" } };

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 503));
      await expect(run(["teams", "browse"], locale)).rejects.toThrow("exit:1");
      const message = String(errorSpy.mock.calls.at(-1)?.[0]);
      expect(message).toContain(locale === "en" ? "API error 503:" : "Erro de API 503:");
      expect(message).toContain("Catalog backend detail");
      expect(message).toContain('details={"code":"TEAM_CATALOG_UNAVAILABLE"}');
      errorSpy.mockClear();
    }

    for (const locale of ["pt-BR", "en"] as const) {
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 503));
      await expect(run(["teams", "browse", "--json"], locale)).rejects.toThrow("exit:1");
      expect(errorSpy.mock.calls.at(-1)?.[0]).toContain(
        'API error 503: Catalog backend detail details={"code":"TEAM_CATALOG_UNAVAILABLE"}',
      );
      errorSpy.mockClear();
    }

    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1, 1, 1]);
    expect(logSpy).not.toHaveBeenCalled();
  });
});
