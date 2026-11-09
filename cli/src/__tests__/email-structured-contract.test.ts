import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../client/http.js";
import { registerEmailCommands } from "../commands/client/email.js";
import { handleCommandError } from "../commands/client/common.js";
import { setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const ENDPOINT_ID = "11111111-1111-4111-8111-111111111111";
const ISSUE_ID = "33333333-3333-4333-8333-333333333333";
const CONVERSATION_ID = "44444444-4444-4444-8444-444444444444";
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_ARGV = process.argv;
const LOCALES = ["pt-BR", "en"] as const satisfies readonly SupportedLocale[];

function makeProgram(locale: SupportedLocale): Command {
  setCliLocale(locale);
  const program = new Command();
  program.name("paperclipai");
  program.exitOverride();
  program.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  registerEmailCommands(program);
  setCliCommandLineShape(program);
  return program;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("email structured CLI contract", () => {
  let tempRoot: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    process.env = { ...ORIGINAL_ENV };
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("PAPERCLIP_")) delete process.env[key];
    }
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "paperclip-email-contract-"));
    process.env.PAPERCLIP_HOME = tempRoot;
    process.env.PAPERCLIP_CONTEXT = path.join(tempRoot, "context.json");
    process.argv = ["node", "paperclipai"];
    fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
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

  function baseArgs(...args: string[]): string[] {
    return [
      ...args,
      "--company-id", COMPANY_ID,
      "--api-base", "http://paperclip.test",
      "--api-key", "fixture-token",
      "--json",
    ];
  }

  it("keeps JSON and HTTP contracts equivalent across locales for all email operations", async () => {
    const newMessage = {
      endpointId: ENDPOINT_ID,
      parentIssueId: ISSUE_ID,
      to: ["recipient@example.test"],
      subject: "Release notes — unchanged",
      text: "Olá — texto fornecido pelo usuário.",
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
    };
    const replyMessage = {
      endpointId: ENDPOINT_ID,
      conversationId: CONVERSATION_ID,
      replyToMessageId: "mail-message-19",
      text: "User supplied reply text.",
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
    };
    const newMessageFile = path.join(tempRoot, "new-message.json");
    const replyMessageFile = path.join(tempRoot, "reply-message.json");
    await writeFile(newMessageFile, JSON.stringify(newMessage));
    await writeFile(replyMessageFile, JSON.stringify(replyMessage));

    const operations = [
      {
        args: baseArgs("email", "inboxes"),
        method: "GET",
        pathname: `/api/companies/${COMPANY_ID}/email/inboxes`,
        response: [{ id: ENDPOINT_ID, address: "team@example.test" }],
      },
      {
        args: baseArgs("email", "send", "--file", newMessageFile),
        method: "POST",
        pathname: `/api/companies/${COMPANY_ID}/email/send`,
        requestBody: { ...newMessage, replyAll: false, attachmentIds: [] },
        response: { id: "publication-new", subject: newMessage.subject },
      },
      {
        args: baseArgs("email", "reply", "--file", replyMessageFile),
        method: "POST",
        pathname: `/api/companies/${COMPANY_ID}/email/send`,
        requestBody: { ...replyMessage, replyAll: false, attachmentIds: [] },
        response: { id: "publication-reply", conversationId: CONVERSATION_ID },
      },
      {
        args: baseArgs("email", "thread", "task / 1"),
        method: "GET",
        pathname: `/api/companies/${COMPANY_ID}/email/tasks/task%20%2F%201`,
        response: { id: "task / 1", messages: [{ text: "Fixture thread" }] },
      },
      {
        args: baseArgs("email", "delivery", "publication / 1"),
        method: "GET",
        pathname: `/api/companies/${COMPANY_ID}/email/deliveries/publication%20%2F%201`,
        response: { id: "publication / 1", status: "delivered" },
      },
    ] as const;

    for (const operation of operations) {
      const outputs: string[] = [];
      for (const locale of LOCALES) {
        fetchMock.mockResolvedValueOnce(jsonResponse(operation.response));
        await runCommand(operation.args, locale);

        const output = String(logSpy.mock.calls.at(-1)?.[0]);
        outputs.push(output);
        expect(JSON.parse(output)).toEqual(operation.response);

        const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
        expect(new URL(url).pathname).toBe(operation.pathname);
        expect(init.method ?? "GET").toBe(operation.method);
        if ("requestBody" in operation) {
          expect(JSON.parse(String(init.body))).toEqual(operation.requestBody);
        } else {
          expect(init.body).toBeUndefined();
        }
      }
      expect(outputs[0]).toBe(outputs[1]);
      logSpy.mockClear();
    }
  });

  it("preserves structured API error status, message and details in PT-BR and English", async () => {
    const body = {
      message: "Mail provider diagnostic remains verbatim",
      code: "DELIVERY_REJECTED",
      details: { attempt: 2, provider: "fixture" },
    };
    const outputs: string[] = [];

    for (const locale of LOCALES) {
      fetchMock.mockResolvedValueOnce(jsonResponse(body, 503));
      const args = baseArgs("email", "thread", ISSUE_ID);
      process.argv = ["node", "paperclipai", ...args];
      let requestError: unknown;
      try {
        await makeProgram(locale).parseAsync(args, { from: "user" });
      } catch (error) {
        requestError = error;
      }
      expect(requestError).toBeInstanceOf(ApiRequestError);
      expect(requestError).toMatchObject({
        status: 503,
        message: body.message,
        details: body.details,
        body,
      });
      if (!(requestError instanceof ApiRequestError)) throw requestError;

      const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("fixture exit"); });
      expect(() => handleCommandError(requestError)).toThrow("fixture exit");
      expect(exitSpy).toHaveBeenCalledWith(1);
      outputs.push(String(stderrSpy.mock.calls.at(-1)?.[0]));
      stderrSpy.mockRestore();
      exitSpy.mockRestore();
    }

    expect(outputs[0]).toContain("API error 503: Mail provider diagnostic remains verbatim details={\"attempt\":2,\"provider\":\"fixture\"}");
    expect(outputs[0]).toBe(outputs[1]);
  });
});
