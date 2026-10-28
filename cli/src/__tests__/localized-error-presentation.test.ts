import { afterEach, describe, expect, it, vi } from "vitest";
import { Command } from "commander";
import { ApiRequestError } from "../client/http.js";
import { handleCommandError } from "../commands/client/common.js";
import { isCliJsonRequested, setCliCommandLineShape, setCliLocale } from "../localization/index.js";

const originalArgv = process.argv;
afterEach(() => { process.argv = originalArgv; setCliLocale("pt-BR"); setCliCommandLineShape(); vi.restoreAllMocks(); });

function capture(error: ApiRequestError) {
  const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
  const exit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("fixture exit"); });
  expect(() => handleCommandError(error)).toThrow("fixture exit");
  expect(exit).toHaveBeenCalledWith(1);
  const message = String(stderr.mock.calls.at(-1)?.[0]);
  stderr.mockRestore(); exit.mockRestore();
  return message;
}

describe("CLI presentation of API errors", () => {
  it("localizes an identified condition in each language without altering the error object", () => {
    const error = new ApiRequestError(401, "Original server error", undefined, { messageKey: "locale_auth_required" });
    process.argv = ["node", "paperclipai", "context", "show"];
    expect(capture(error)).toContain("Erro de API 401: Entre na sua conta");
    setCliLocale("en");
    expect(capture(error)).toContain("API error 401: Sign in");
    expect(error.message).toBe("Original server error");
  });

  it("preserves unknown external details, status and legacy stderr for structured mode", () => {
    const error = new ApiRequestError(502, "provider detail", { code: "EXTERNAL" });
    process.argv = ["node", "paperclipai", "issue", "list"];
    expect(capture(error)).toContain('Erro de API 502: Não foi possível concluir a solicitação. Detalhes: provider detail details={"code":"EXTERNAL"}');
    process.argv.push("--json");
    const pt = capture(error);
    setCliLocale("en");
    expect(capture(error)).toBe(pt);
    expect(pt).toBe('API error 502: provider detail details={"code":"EXTERNAL"}');
    expect(isCliJsonRequested(["issue", "list", "--", "--json"])).toBe(false);
  });

  it("distinguishes a literal option value from a structured-output flag", () => {
    const program = new Command();
    program.command("context").command("set").option("--agent-name <name>").option("--json");
    setCliCommandLineShape(program);
    expect(isCliJsonRequested(["context", "set", "--agent-name", "--json"])).toBe(false);
    expect(isCliJsonRequested(["context", "set", "--agent-name", "agent", "--json"])).toBe(true);
  });
});
