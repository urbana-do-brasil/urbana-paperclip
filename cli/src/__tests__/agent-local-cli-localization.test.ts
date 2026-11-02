import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerAgentCommands } from "../commands/client/agent.js";
import { applyOperationHelpLocalization } from "../localization/operation-help.js";
import { setCliLocale } from "../localization/index.js";

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const API_KEY_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const AGENT = { id: AGENT_ID, companyId: COMPANY_ID, name: "Northstar Recovery", urlKey: "northstar-recovery" };
const CREATED_KEY = {
  id: API_KEY_ID,
  name: "local-cli",
  token: "sk-agent-test-token",
  createdAt: "2026-11-01T00:00:00.000Z",
};
const EXPORTS = [
  "export PAPERCLIP_API_URL='http://paperclip.test'",
  `export PAPERCLIP_COMPANY_ID='${COMPANY_ID}'`,
  `export PAPERCLIP_AGENT_ID='${AGENT_ID}'`,
  "export PAPERCLIP_API_KEY='sk-agent-test-token'",
].join("\n");

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

describe("agent local-cli output localization", () => {
  let tempRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-agent-local-cli-l10n-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      if (url.pathname === `/api/agents/${AGENT_ID}` && method === "GET") return jsonResponse(AGENT);
      if (url.pathname === `/api/agents/${AGENT_ID}/keys` && method === "POST") return jsonResponse(CREATED_KEY);
      return new Response(JSON.stringify({ error: `Unexpected ${method} ${url.pathname}` }), { status: 500 });
    });
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

  async function runCommand(locale: SupportedLocale, json = false): Promise<void> {
    const args = [
      "agent", "local-cli", AGENT_ID,
      "--company-id", COMPANY_ID,
      "--no-install-skills",
      "--api-base", "http://paperclip.test",
      "--api-key", "board-token",
      ...(json ? ["--json"] : []),
    ];
    process.argv = ["node", "paperclipai", ...args];
    setCliLocale(locale);
    const program = new Command();
    program.name("paperclipai").exitOverride();
    program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
    registerAgentCommands(program);
    applyOperationHelpLocalization(program, locale);
    await program.parseAsync(args, { from: "user" });
  }

  it.each([
    { locale: "pt-BR" as const, instruction: "# Execute no seu shell antes de iniciar codex/claude:" },
    { locale: "en" as const, instruction: "# Run this in your shell before launching codex/claude:" },
  ])("localizes the shell comment in $locale while preserving copyable exports", async ({ locale, instruction }) => {
    await runCommand(locale);

    expect(logSpy.mock.calls.map(([line]) => String(line))).toEqual([
      `Agent: ${AGENT.name} (${AGENT_ID})`,
      `API key created: ${CREATED_KEY.name} (${API_KEY_ID})`,
      "",
      instruction,
      EXPORTS,
    ]);
    expect(fetchMock.mock.calls.map(([input, init]) => [
      new URL(String(input)).pathname,
      (init as RequestInit | undefined)?.method ?? "GET",
      (init as RequestInit | undefined)?.body,
    ])).toEqual([
      [`/api/agents/${AGENT_ID}`, "GET", undefined],
      [`/api/agents/${AGENT_ID}/keys`, "POST", JSON.stringify({ name: "local-cli" })],
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it.each(["pt-BR", "en"] as const)("keeps the structured %s response free of localized framing", async (locale) => {
    await runCommand(locale, true);

    const [output] = logSpy.mock.calls.map(([line]) => String(line));
    expect(JSON.parse(output!)).toEqual({
      agent: { id: AGENT_ID, name: AGENT.name, urlKey: AGENT.urlKey, companyId: COMPANY_ID },
      key: CREATED_KEY,
      skills: [],
      exports: EXPORTS,
    });
    expect(output).not.toContain("# Run this in your shell");
    expect(output).not.toContain("# Execute no seu shell");
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
