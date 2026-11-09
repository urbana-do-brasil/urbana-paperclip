import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
let server: http.Server;
let dir: string;
let port: number;
async function run(args: string[]) {
  return await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [tsx, entry, "issue", "list", "--api-base", `http://127.0.0.1:${port}`, "--api-key", "fixture-token", "--company-id", "fixture", ...args], {
      cwd: dir,
      env: { PATH: process.env.PATH, PAPERCLIP_HOME: dir, PAPERCLIP_TELEMETRY_DISABLED: "1", NODE_ENV: "test" },
    });
    let stdout = ""; let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("localized CLI API errors over real HTTP", () => {
  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-cli-error-http-"));
    server = http.createServer((_req, res) => {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Original API error", details: { code: "FIXTURE" }, messageKey: "locale_auth_required" }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as { port: number }).port;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("uses the selected locale for human errors and keeps structured-mode stderr identical", async () => {
    const [pt, en, jsonPt, jsonEn] = await Promise.all([
      run(["--lang", "pt-BR"]), run(["--lang", "en"]), run(["--lang", "pt-BR", "--json"]), run(["--lang", "en", "--json"]),
    ]);
    for (const result of [pt, en, jsonPt, jsonEn]) { expect(result.code).toBe(1); expect(result.stdout).toBe(""); }
    expect(pt.stderr).toContain("Erro de API 401: Entre na sua conta");
    expect(en.stderr).toContain("API error 401: Sign in");
    expect(jsonPt.stderr).toBe('API error 401: Original API error details={"code":"FIXTURE"}\n');
    expect(jsonEn.stderr).toBe(jsonPt.stderr);
  }, 60_000);
});
