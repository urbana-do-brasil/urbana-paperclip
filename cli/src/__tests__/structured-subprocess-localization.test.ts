import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));

const ISSUE = {
  id: "11111111-1111-4111-8111-111111111111",
  identifier: "PAP-101",
  title: "Fixture issue title",
  description: "Fixture issue description",
  status: "todo",
  priority: "high",
  assigneeAgentId: "22222222-2222-4222-8222-222222222222",
  projectId: "33333333-3333-4333-8333-333333333333",
};
const AGENT = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Northstar Recovery",
  role: "incident-response-captain",
  status: "pending_approval",
  reportsTo: "44444444-4444-4444-8444-444444444444",
  budgetMonthlyCents: 12345,
  spentMonthlyCents: 6789,
};
const ERROR_BODY = {
  message: "Provider diagnostic remains verbatim",
  code: "FIXTURE_ERROR",
  details: { attempt: 7, provider: "fixture-provider" },
};

interface RunResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
  stdout: string;
  stderr: string;
}

let tempRoot: string;
let server: http.Server;
let port: number;

function run(args: string[], locale: "pt-BR" | "en"): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tsx, entry, "--lang", locale, ...args], {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        HOME: tempRoot,
        TMPDIR: tempRoot,
        PAPERCLIP_HOME: path.join(tempRoot, "home"),
        PAPERCLIP_CONTEXT: path.join(tempRoot, "context.json"),
        PAPERCLIP_TELEMETRY_DISABLED: "1",
        NODE_ENV: "test",
        NO_COLOR: "1",
      },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      clearTimeout(timer);
      resolve({ status: null, signal: null, error, stdout, stderr });
    });
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, stdout, stderr });
    });
  });
}

function clientArgs(companyId = "fixture") {
  return [
    "--api-base", `http://127.0.0.1:${port}`,
    "--api-key", "fixture-token",
    "--company-id", companyId,
  ];
}

beforeAll(async () => {
  tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-structured-subprocess-"));
  server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const send = (status: number, body: unknown) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (url.pathname === "/api/companies/fixture/issues") return send(200, [ISSUE]);
    if (url.pathname === "/api/companies/fixture-error/issues") return send(500, ERROR_BODY);
    if (url.pathname === "/api/companies/fixture/agents") return send(200, [AGENT]);
    return send(404, { message: "fixture route not found", code: "NOT_FOUND" });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as { port: number }).port;
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

describe("structured CLI subprocess output and documented examples", () => {
  it.each([
    {
      name: "issue list",
      args: ["issue", "list"],
      humanLabels: { "pt-BR": ["Identificador=", "Título=", ISSUE.title], en: ["Identifier=", "Title=", ISSUE.title] },
      json: [ISSUE],
    },
    {
      name: "agent list",
      args: ["agent", "list"],
      humanLabels: { "pt-BR": ["Nome=", "Papel=", AGENT.name], en: ["Name=", "Role=", AGENT.name] },
      json: [AGENT],
    },
  ] as const)("keeps $name human framing localized and structured stdout byte-identical across locales", async ({ args, humanLabels, json }) => {
    const jsonOutputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      const human = await run([...args, ...clientArgs()], locale);
      expect(human.error, human.stderr).toBeUndefined();
      expect(human.status, human.stderr).toBe(0);
      expect(human.stderr).toBe("");
      for (const text of humanLabels[locale]) expect(human.stdout).toContain(text);

      const structured = await run([...args, ...clientArgs(), "--json"], locale);
      expect(structured.error, structured.stderr).toBeUndefined();
      expect(structured.status, structured.stderr).toBe(0);
      expect(structured.stderr).toBe("");
      expect(JSON.parse(structured.stdout)).toEqual(json);
      jsonOutputs.push(structured.stdout);
    }
    expect(jsonOutputs[0]).toBe(jsonOutputs[1]);
  }, 120_000);

  it("keeps exit status and structured stderr identical for a scripted API failure", async () => {
    const outputs = [
      await run(["issue", "list", ...clientArgs("fixture-error"), "--json"], "pt-BR"),
      await run(["issue", "list", ...clientArgs("fixture-error"), "--json"], "en"),
    ];
    for (const result of outputs) {
      expect(result.error, result.stderr).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(ERROR_BODY.message);
      expect(result.stderr).toContain(`details=${JSON.stringify(ERROR_BODY.details)}`);
    }
    expect(outputs[0]?.stderr).toBe(outputs[1]?.stderr);
  }, 120_000);

  it("keeps every documented CLI command line paired between English and PT-BR", () => {
    const blocks = (file: string) => [...fs.readFileSync(path.join(root, file), "utf8")
      .matchAll(/```(?:bash|sh|shell)?\n([\s\S]*?)```/g)]
      .map((match) => match[1] ?? "");
    const commands = (block: string) => block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.endsWith("\\") ? line.slice(0, -1).trimEnd() : line);

    for (const name of ["overview", "setup-commands", "control-plane-commands"]) {
      const en = blocks(`docs/cli/${name}.md`);
      const pt = blocks(`docs/pt-BR/cli/${name}.md`);
      expect(pt, `${name} block count`).toHaveLength(en.length);
      for (let index = 0; index < en.length; index += 1) {
        expect(commands(pt[index] ?? ""), `${name} block ${index}`).toEqual(commands(en[index] ?? ""));
      }
    }
  });

  it("executes representative documented examples against a disposable fixture", async () => {
    const contextSet = await run([
      "context", "set",
      "--profile", "docs",
      "--api-base", `http://127.0.0.1:${port}`,
      "--company-id", "fixture",
      "--json",
    ], "pt-BR");
    expect(contextSet.error, contextSet.stderr).toBeUndefined();
    expect(contextSet.status, contextSet.stderr).toBe(0);
    expect(contextSet.stderr).toBe("");
    expect(JSON.parse(contextSet.stdout)).toMatchObject({
      profileName: "docs",
      profile: { apiBase: `http://127.0.0.1:${port}`, companyId: "fixture" },
    });

    const contextShow = await run(["context", "show", "--profile", "docs", "--json"], "en");
    expect(contextShow.error, contextShow.stderr).toBeUndefined();
    expect(contextShow.status, contextShow.stderr).toBe(0);
    expect(contextShow.stderr).toBe("");
    expect(JSON.parse(contextShow.stdout)).toMatchObject({
      profileName: "docs",
      profile: { apiBase: `http://127.0.0.1:${port}`, companyId: "fixture" },
    });

    for (const locale of ["pt-BR", "en"] as const) {
      const help = await run(["--help"], locale);
      expect(help.error, help.stderr).toBeUndefined();
      expect(help.status, help.stderr).toBe(0);
      expect(help.stderr).toBe("");
      expect(help.stdout).toContain(locale === "pt-BR" ? "Uso: paperclipai" : "Usage: paperclipai");
    }
  }, 120_000);
});
