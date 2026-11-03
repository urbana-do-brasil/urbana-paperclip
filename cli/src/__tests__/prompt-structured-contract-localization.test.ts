import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerPromptCommands } from "../commands/client/prompt.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const API_BASE = "http://paperclip.test";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const ISSUE_ID = "33333333-3333-4333-8333-333333333333";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const LOCALES = ["pt-BR", "en"] as const satisfies readonly SupportedLocale[];
const AGENT = {
  id: AGENT_ID,
  companyId: COMPANY_ID,
  name: "Northstar Recovery",
  urlKey: "northstar-recovery",
  role: "incident-response-captain",
  status: "active",
};

interface FixtureRequest {
  method: string;
  url: string;
  response: unknown;
  requestBody?: Record<string, unknown>;
  authorization?: string;
}

interface PromptOperation {
  name: string;
  args: string[];
  output: unknown;
  requests: FixtureRequest[];
}

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai").exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerPromptCommands(program);
  setCliCommandLineShape(program);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function operationFixtures(): PromptOperation[] {
  const boardTitle = "Board handoff — KeepCase";
  const boardPrompt = "Draft a careful plan; preserve this user wording.";
  const boardIssue = {
    id: "issue-board-1",
    companyId: COMPANY_ID,
    title: boardTitle,
    description: boardPrompt,
    status: "todo",
    priority: "medium",
    assigneeAgentId: AGENT_ID,
  };
  const boardWake = { id: "run-board-1", status: "queued" };
  const agentTitle = "Agent handoff KeepCase";
  const agentPrompt = "Review the change; retain supplied casing.";
  const agentIssue = {
    id: "issue-agent-1",
    companyId: COMPANY_ID,
    title: agentTitle,
    description: agentPrompt,
    status: "todo",
    priority: "medium",
    assigneeAgentId: AGENT_ID,
  };
  const commentText = "Append this exact follow-up / KeepCase.";
  const comment = { id: "comment-agent-1", issueId: ISSUE_ID, body: commentText };

  return [
    {
      name: "board prompt creates and wakes an assigned issue",
      args: [
        "board", "prompt", "--agent", AGENT_ID, "--company-id", COMPANY_ID,
        "--api-base", API_BASE, "--api-key", "fixture-board-token",
        "--title", boardTitle, "--json", ...boardPrompt.split(" "),
      ],
      output: {
        ok: true,
        mode: "issue",
        actor: "board",
        apiBase: API_BASE,
        companyId: COMPANY_ID,
        agent: { id: AGENT_ID, name: AGENT.name, urlKey: AGENT.urlKey },
        issue: boardIssue,
        wakeup: boardWake,
      },
      requests: [
        {
          method: "GET",
          url: `${API_BASE}/api/agents/${AGENT_ID}?companyId=${COMPANY_ID}`,
          authorization: "Bearer fixture-board-token",
          response: AGENT,
        },
        {
          method: "POST",
          url: `${API_BASE}/api/companies/${COMPANY_ID}/issues`,
          authorization: "Bearer fixture-board-token",
          requestBody: {
            title: boardTitle,
            description: boardPrompt,
            status: "todo",
            priority: "medium",
            assigneeAgentId: AGENT_ID,
          },
          response: boardIssue,
        },
        {
          method: "POST",
          url: `${API_BASE}/api/agents/${AGENT_ID}/wakeup`,
          authorization: "Bearer fixture-board-token",
          requestBody: {
            source: "on_demand",
            triggerDetail: "manual",
            reason: "Prompt issue handoff",
            payload: { issueId: boardIssue.id },
          },
          response: boardWake,
        },
      ],
    },
    {
      name: "agent prompt uses its environment key and keeps JSON stable",
      args: [
        "agent", "prompt", "--agent", AGENT_ID,
        "--api-base", API_BASE, "--api-key-env", "PAPERCLIP_FIXTURE_AGENT_TOKEN",
        "--title", agentTitle, "--no-wake", "--json", ...agentPrompt.split(" "),
      ],
      output: {
        ok: true,
        mode: "issue",
        actor: "agent",
        apiBase: API_BASE,
        companyId: COMPANY_ID,
        agent: { id: AGENT_ID, name: AGENT.name, urlKey: AGENT.urlKey },
        issue: agentIssue,
        wakeup: null,
      },
      requests: [
        {
          method: "GET",
          url: `${API_BASE}/api/agents/me`,
          authorization: "Bearer fixture-agent-token",
          response: AGENT,
        },
        {
          method: "POST",
          url: `${API_BASE}/api/companies/${COMPANY_ID}/issues`,
          authorization: "Bearer fixture-agent-token",
          requestBody: {
            title: agentTitle,
            description: agentPrompt,
            status: "todo",
            priority: "medium",
            assigneeAgentId: AGENT_ID,
          },
          response: agentIssue,
        },
      ],
    },
    {
      name: "agent-prompt appends a comment without waking",
      args: [
        "agent-prompt", AGENT_ID, "fixture-positional-agent-token",
        "--api-base", API_BASE, "--issue", ISSUE_ID, "--no-wake", "--json",
        ...commentText.split(" "),
      ],
      output: {
        ok: true,
        mode: "comment",
        actor: "agent",
        apiBase: API_BASE,
        companyId: COMPANY_ID,
        agent: { id: AGENT_ID, name: AGENT.name, urlKey: AGENT.urlKey },
        comment,
        wakeup: null,
      },
      requests: [
        {
          method: "GET",
          url: `${API_BASE}/api/agents/me`,
          authorization: "Bearer fixture-positional-agent-token",
          response: AGENT,
        },
        {
          method: "POST",
          url: `${API_BASE}/api/issues/${ISSUE_ID}/comments`,
          authorization: "Bearer fixture-positional-agent-token",
          requestBody: { body: commentText, resume: false },
          response: comment,
        },
      ],
    },
  ];
}

describe("prompt structured CLI contracts", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-prompt-contract-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.env.PAPERCLIP_FIXTURE_AGENT_TOKEN = "fixture-agent-token";
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

  function expectRequests(expected: FixtureRequest[]): void {
    expect(fetchMock).toHaveBeenCalledTimes(expected.length);
    expected.forEach((request, index) => {
      const [url, init] = fetchMock.mock.calls[index] as unknown as [string, RequestInit | undefined];
      expect(url).toBe(request.url);
      expect(init?.method ?? "GET").toBe(request.method);
      expect(new Headers(init?.headers).get("authorization")).toBe(request.authorization);
      if (request.requestBody) {
        expect(JSON.parse(String(init?.body))).toMatchObject(request.requestBody);
      } else {
        expect(init?.body).toBeUndefined();
      }
    });
  }

  it("keeps issue/comment JSON, routes and payloads equivalent in both locales", async () => {
    for (const operation of operationFixtures()) {
      const outputs: string[] = [];
      for (const locale of LOCALES) {
        fetchMock.mockClear();
        for (const request of operation.requests) {
          fetchMock.mockResolvedValueOnce(jsonResponse(request.response));
        }
        stdoutSpy.mockClear();
        stderrSpy.mockClear();

        await runCommand(operation.args, locale);

        const output = String(stdoutSpy.mock.calls.at(-1)?.[0]);
        outputs.push(output);
        expect(JSON.parse(output), operation.name).toEqual(operation.output);
        expect(stderrSpy, operation.name).not.toHaveBeenCalled();
        expectRequests(operation.requests);
      }
      expect(outputs[0], operation.name).toBe(outputs[1]);
    }
  });

  it("preserves a structured API error and exit status across locales", async () => {
    const failure = {
      error: "Prompt handoff rejected by fixture API",
      details: { code: "PROMPT_HANDOFF_DENIED", reference: "KeepCase" },
    };
    const args = [
      "board", "prompt", "--agent", AGENT_ID, "--company-id", COMPANY_ID,
      "--api-base", API_BASE, "--api-key", "fixture-board-token", "--json",
      "Create", "the", "handoff",
    ];
    const outputs: string[] = [];
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("fixture exit"); });

    for (const locale of LOCALES) {
      fetchMock.mockClear();
      fetchMock.mockResolvedValueOnce(jsonResponse(failure, 403));
      stdoutSpy.mockClear();
      stderrSpy.mockClear();

      await expect(runCommand(args, locale)).rejects.toThrow("fixture exit");

      expect(exitSpy).toHaveBeenLastCalledWith(1);
      expect(stdoutSpy).not.toHaveBeenCalled();
      expect(stderrSpy).toHaveBeenCalledTimes(1);
      const message = String(stderrSpy.mock.calls[0]?.[0]);
      outputs.push(message);
      expect(message).toContain("API error 403: Prompt handoff rejected by fixture API");
      expect(message).toContain(`details=${JSON.stringify(failure.details)}`);
      expectRequests([{
        method: "GET",
        url: `${API_BASE}/api/agents/${AGENT_ID}?companyId=${COMPANY_ID}`,
        response: failure,
        authorization: "Bearer fixture-board-token",
      }]);
    }

    expect(outputs[0]).toBe(outputs[1]);
    expect(exitSpy.mock.calls.map(([code]) => code)).toEqual([1, 1]);
    exitSpy.mockRestore();
  });
});
