import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const packagePaths = ["cli", "packages/shared", "packages/db", "packages/adapter-utils", "packages/adapters/claude-local", "packages/adapters/codex-local", "packages/adapters/hermes-gateway", "packages/adapters/hermes", "packages/adapters/opencode-local", "packages/adapters/openclaw-gateway"];
let fixture: string;
function run(command: string, args: string[], cwd = root) {
  const result = spawnSync(command, args, {
    cwd, encoding: "utf8", timeout: 45_000,
    env: { PATH: process.env.PATH, PAPERCLIP_HOME: path.join(fixture, "state"), PAPERCLIP_TELEMETRY_DISABLED: "1", PAPERCLIP_API_URL: "http://127.0.0.1:9", NODE_ENV: "test" },
  });
  if (result.error) throw result.error;
  return result;
}

describe("published CLI localization", () => {
  beforeAll(() => {
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-published-cli-"));
    const build = run("pnpm", ["--filter", "paperclipai", "build"]);
    expect(build.status, build.stderr).toBe(0);
    fs.mkdirSync(path.join(fixture, "dist"));
    fs.mkdirSync(path.join(fixture, "node_modules"));
    fs.copyFileSync(path.join(root, "cli/dist/index.js"), path.join(fixture, "dist/index.js"));
    const generated = run(process.execPath, ["scripts/generate-npm-package-json.mjs", "--output", path.join(fixture, "package.json")]);
    expect(generated.status, generated.stderr).toBe(0);
    const manifest = JSON.parse(fs.readFileSync(path.join(fixture, "package.json"), "utf8")) as { dependencies: Record<string, string> };
    // The published manifest flattens workspace dependencies. Resolve only
    // those declared dependencies from the frozen local install; no registry or
    // production configuration is accessed by this disposable fixture.
    for (const name of Object.keys(manifest.dependencies)) {
      const source = packagePaths.map((pkg) => path.join(root, pkg, "node_modules", name)).find((candidate) => fs.existsSync(candidate));
      expect(source, `missing locally installed published dependency ${name}`).toBeDefined();
      const target = path.join(fixture, "node_modules", name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.symlinkSync(fs.realpathSync(source!), target, "dir");
    }
  }, 60_000);
  afterAll(() => { if (fixture) fs.rmSync(fixture, { recursive: true, force: true }); });

  it("runs the bundled artifact offline, saves a profile and preserves JSON across languages", () => {
    const binary = path.join(fixture, "dist/index.js");
    const ptHelp = run(process.execPath, [binary, "--help"], fixture);
    const enHelp = run(process.execPath, [binary, "--lang", "en", "--help"], fixture);
    expect(ptHelp.status, ptHelp.stderr).toBe(0); expect(ptHelp.stdout).toContain("Uso: paperclipai");
    expect(enHelp.status, enHelp.stderr).toBe(0); expect(enHelp.stdout).toContain("Usage: paperclipai");
    const saved = run(process.execPath, [binary, "context", "set", "--profile", "work", "--locale", "en", "--json"], fixture);
    expect(saved.status, saved.stderr).toBe(0); expect(JSON.parse(saved.stdout).profile.locale).toBe("en");
    const en = run(process.execPath, [binary, "context", "show", "--profile", "work", "--json"], fixture);
    const pt = run(process.execPath, [binary, "context", "show", "--profile", "work", "--lang", "pt-BR", "--json"], fixture);
    expect(en.status, en.stderr).toBe(0); expect(pt.status, pt.stderr).toBe(0);
    expect(JSON.parse(pt.stdout)).toEqual(JSON.parse(en.stdout));
  }, 60_000);
});
