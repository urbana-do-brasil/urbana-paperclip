import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setStoredBoardCredential } from "../client/board-auth.js";
import { registerClientAuthCommands } from "../commands/client/auth.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const API_BASE = "http://paperclip.test";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const LOCALES = ["pt-BR", "en"] as const satisfies readonly SupportedLocale[];

interface FixtureRequest {
  method: string;
  url: string;
  response: unknown;
  status?: number;
  requestBody?: unknown;
  authorization?: string;
}

interface AuthOperation {
  args: string[];
  output: unknown;
  requests: FixtureRequest[];
  stderr?: string[];
}

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerClientAuthCommands(program.command("auth"));
  setCliCommandLineShape(program);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function authArgs(...args: string[]): string[] {
  return [
    "auth",
    ...args,
    "--api-base", API_BASE,
    "--api-key", "fixture-board-token",
    "--json",
  ];
}

function operations(): AuthOperation[] {
  const challengePayload = {
    command: "paperclipai auth login",
    clientName: "fixture-client",
    requestedAccess: "board",
    requestedCompanyId: COMPANY_ID,
  };
  const whoami = {
    user: { id: USER_ID, name: "Board Operator", email: "operator@example.test" },
    userId: USER_ID,
    isInstanceAdmin: false,
    companyIds: [COMPANY_ID],
    source: "board_token",
    keyId: "key-fixture",
  };
  const challenge = {
    id: "challenge-fixture",
    status: "pending",
    command: "paperclipai auth login",
    clientName: "fixture-client",
    requestedAccess: "board",
    requestedCompanyId: COMPANY_ID,
    expiresAt: "2099-01-01T00:00:00.000Z",
  };

  return [
    {
      args: authArgs("whoami"),
      output: whoami,
      requests: [{
        method: "GET",
        url: `${API_BASE}/api/cli-auth/me`,
        authorization: "Bearer fixture-board-token",
        response: whoami,
      }],
    },
    {
      args: authArgs("revoke-current"),
      output: { ok: true, revoked: true },
      requests: [{
        method: "POST",
        url: `${API_BASE}/api/cli-auth/revoke-current`,
        authorization: "Bearer fixture-board-token",
        requestBody: {},
        response: { ok: true, revoked: true },
      }],
    },
    {
      args: authArgs("logout"),
      output: {
        ok: true,
        apiBase: API_BASE,
        revoked: true,
        removedLocalCredential: true,
      },
      requests: [{
        method: "POST",
        url: `${API_BASE}/api/cli-auth/revoke-current`,
        authorization: "Bearer persisted-board-token",
        requestBody: {},
        response: { revoked: true },
      }],
    },
    {
      args: authArgs("challenge", "create", "--payload-json", JSON.stringify(challengePayload)),
      output: { id: "challenge-fixture", token: "challenge-secret" },
      requests: [{
        method: "POST",
        url: `${API_BASE}/api/cli-auth/challenges`,
        authorization: "Bearer fixture-board-token",
        requestBody: challengePayload,
        response: { id: "challenge-fixture", token: "challenge-secret" },
      }],
    },
    {
      args: authArgs("challenge", "get", "challenge/fixture", "--token", "challenge-secret /?&"),
      output: challenge,
      requests: [{
        method: "GET",
        url: `${API_BASE}/api/cli-auth/challenges/challenge%2Ffixture?token=challenge-secret+%2F%3F%26`,
        authorization: "Bearer fixture-board-token",
        response: challenge,
      }],
    },
    ...(["approve", "cancel"] as const).map((action) => ({
      args: authArgs("challenge", action, "challenge/fixture", "--token", "challenge-secret"),
      output: { ok: true, action },
      requests: [{
        method: "POST",
        url: `${API_BASE}/api/cli-auth/challenges/challenge%2Ffixture/${action}`,
        authorization: "Bearer fixture-board-token",
        requestBody: { token: "challenge-secret" },
        response: { ok: true, action },
      }],
    })),
    {
      args: authArgs("login", "--no-browser", "--company-id", COMPANY_ID),
      output: {
        ok: true,
        apiBase: API_BASE,
        userId: USER_ID,
        approvalUrl: `${API_BASE}/approve/challenge-login`,
      },
      stderr: [
        "Board authentication required",
        `Open this URL in your browser to approve CLI access:\n${API_BASE}/approve/challenge-login`,
        "Browser open skipped — open the URL above to approve.",
      ],
      requests: [
        {
          method: "POST",
          url: `${API_BASE}/api/cli-auth/challenges`,
          requestBody: {
            command: "paperclipai auth login",
            clientName: "paperclipai cli",
            requestedAccess: "board",
            requestedCompanyId: COMPANY_ID,
          },
          response: {
            id: "challenge-login",
            token: "login-challenge-secret",
            boardApiToken: "issued-board-token",
            approvalPath: "/approve/challenge-login",
            approvalUrl: `${API_BASE}/approve/challenge-login`,
            pollPath: "/cli-auth/challenges/challenge-login",
            expiresAt: "2099-01-01T00:00:00.000Z",
            suggestedPollIntervalMs: 500,
          },
        },
        {
          method: "GET",
          url: `${API_BASE}/api/cli-auth/challenges/challenge-login?token=login-challenge-secret`,
          response: { id: "challenge-login", status: "approved" },
        },
        {
          method: "GET",
          url: `${API_BASE}/api/cli-auth/me`,
          authorization: "Bearer issued-board-token",
          response: { userId: USER_ID },
        },
      ],
    },
  ];
}

describe("auth structured CLI contracts", () => {
  let tempRoot: string;
  let authStorePath: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-auth-contract-"));
    authStorePath = path.join(tempRoot, "auth-store.json");
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_AUTH_STORE = authStorePath;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    stdoutSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
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

  function setResponses(requests: FixtureRequest[]): void {
    const queue = [...requests];
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => {
      const next = queue.shift();
      if (!next) throw new Error("Unexpected auth API request without a fixture response");
      return jsonResponse(next.response, next.status ?? 200);
    });
  }

  function expectRequests(expected: FixtureRequest[]): void {
    expect(fetchMock).toHaveBeenCalledTimes(expected.length);
    expected.forEach((request, index) => {
      const [url, init] = fetchMock.mock.calls[index] as unknown as [string, RequestInit | undefined];
      expect(url).toBe(request.url);
      expect(init?.method ?? "GET").toBe(request.method);
      const headers = new Headers(init?.headers);
      if (request.authorization) expect(headers.get("authorization")).toBe(request.authorization);
      if ("requestBody" in request) {
        expect(JSON.parse(String(init?.body))).toEqual(request.requestBody);
      } else {
        expect(init?.body).toBeUndefined();
      }
    });
  }

  it("keeps JSON, routes, payloads and login stderr equivalent in both locales", async () => {
    const authOperations = operations();

    for (const operation of authOperations) {
      const outputs: string[] = [];
      const errorsByLocale: string[][] = [];
      for (const locale of LOCALES) {
        if (operation.args.includes("logout")) {
          setStoredBoardCredential({
            apiBase: API_BASE,
            token: "persisted-board-token",
            userId: USER_ID,
            storePath: authStorePath,
          });
        }
        setResponses(operation.requests);
        stdoutSpy.mockClear();
        stderrSpy.mockClear();

        await runCommand(operation.args, locale);

        const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
        outputs.push(output);
        expect(JSON.parse(output)).toEqual(operation.output);
        expectRequests(operation.requests);
        errorsByLocale.push(stderrSpy.mock.calls.map((call: unknown[]) => String(call[0])));
      }
      expect(outputs[0]).toBe(outputs[1]);
      if (operation.stderr) {
        expect(errorsByLocale[0]).toEqual(operation.stderr);
        expect(errorsByLocale[1]).toEqual(operation.stderr);
      } else {
        expect(errorsByLocale[0]).toEqual(errorsByLocale[1]);
      }
    }
  });

  it("keeps API failure status, provider wording, details and stderr stable across locales", async () => {
    const failure = {
      error: "Fixture auth provider diagnostic",
      details: { code: "AUTH_PROVIDER_DENIED", retryable: false },
    };
    const stderr: string[] = [];

    for (const locale of LOCALES) {
      setResponses([{
        method: "GET",
        url: `${API_BASE}/api/cli-auth/me`,
        authorization: "Bearer fixture-board-token",
        response: failure,
        status: 403,
      }]);
      stdoutSpy.mockClear();
      stderrSpy.mockClear();
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("fixture exit"); });

      await expect(runCommand(authArgs("whoami"), locale)).rejects.toThrow("fixture exit");

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      stderr.push(String(stderrSpy.mock.calls[0]?.[0]));
      expect(stderr.at(-1)).toContain("API error 403: Fixture auth provider diagnostic details={\"code\":\"AUTH_PROVIDER_DENIED\",\"retryable\":false}");
      expectRequests([{
        method: "GET",
        url: `${API_BASE}/api/cli-auth/me`,
        authorization: "Bearer fixture-board-token",
        response: failure,
        status: 403,
      }]);
      exitSpy.mockRestore();
    }

    expect(stderr[0]).toBe(stderr[1]);
  });
});
