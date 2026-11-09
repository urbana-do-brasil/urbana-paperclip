import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { readContext, setCurrentProfile, upsertProfile } from "../client/context.js";
import { resolveCliLocale, setCliLocale } from "../localization/index.js";

const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
const dirs: string[] = [];
function temporary() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-cli-locale-"));
  dirs.push(dir);
  return { dir, context: path.join(dir, "context.json") };
}
function run(dir: string, args: string[], env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [tsx, entry, ...args], {
    cwd: dir, encoding: "utf8", timeout: 30_000,
    env: { PATH: process.env.PATH, PAPERCLIP_HOME: dir, PAPERCLIP_TELEMETRY_DISABLED: "1", PAPERCLIP_API_URL: "http://127.0.0.1:9", NODE_ENV: "test", ...env },
  });
}
afterEach(() => { setCliLocale("pt-BR"); for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

describe("CLI language selection", () => {
  it("resolves explicit option > environment > selected profile > default", () => {
    const { context } = temporary();
    upsertProfile("work", { locale: "en" }, context);
    upsertProfile("other", { locale: "pt-BR" }, context);
    setCurrentProfile("work", context);
    const env = { PAPERCLIP_CONTEXT: context };
    expect(resolveCliLocale([], env)).toBe("en");
    expect(resolveCliLocale(["context", "show", "--profile", "other"], env)).toBe("pt-BR");
    expect(resolveCliLocale([], { ...env, PAPERCLIP_LANG: "pt-BR" })).toBe("pt-BR");
    expect(resolveCliLocale(["context", "show", "--lang=en"], { ...env, PAPERCLIP_LANG: "pt-BR" })).toBe("en");
    expect(resolveCliLocale(["--lang", "pt-BR"], { ...env, PAPERCLIP_LANG: "invalid" })).toBe("pt-BR");
    expect(resolveCliLocale(["--profile", "missing"], env)).toBe("pt-BR");
    expect(resolveCliLocale(["--", "--lang", "pt-BR"], env)).toBe("en");
  });

  it("rejects invalid explicit, environment and selected profile values without exposing them", () => {
    const { context } = temporary();
    fs.writeFileSync(context, JSON.stringify({ currentProfile: "bad", profiles: { bad: { locale: "secret-should-not-appear" }, good: { locale: "en" } } }));
    const env = { PAPERCLIP_CONTEXT: context };
    for (const runCase of [() => resolveCliLocale(["--lang", "secret-should-not-appear"], env), () => resolveCliLocale([], { ...env, PAPERCLIP_LANG: "invalid" }), () => resolveCliLocale([], env)]) {
      expect(runCase).toThrow("Idioma inválido. Use pt-BR ou en.");
      try { runCase(); } catch (error) { expect(String(error)).not.toContain("secret-should-not-appear"); }
    }
    expect(resolveCliLocale(["--profile", "good"], env)).toBe("en");
    expect(resolveCliLocale(["--lang", "pt-BR"], env)).toBe("pt-BR");
    upsertProfile("good", { locale: "pt-BR" }, context);
    expect(JSON.parse(fs.readFileSync(context, "utf8")).profiles.bad.locale).toBe("secret-should-not-appear");
  });

  it("does not reveal malformed context contents while selecting language for help", () => {
    const { context } = temporary();
    fs.writeFileSync(context, '"secret-context-fixture" invalid');
    try { resolveCliLocale([], { PAPERCLIP_CONTEXT: context }); throw new Error("expected failure"); }
    catch (error) {
      expect(String(error)).toContain("Não foi possível ler o contexto");
      expect(String(error)).not.toContain("secret-context-fixture");
      expect(String(error)).not.toContain(context);
    }
  });

  it("keeps profile locales independent while preserving existing fields and legacy profiles", () => {
    const { context } = temporary();
    upsertProfile("one", { locale: "en", companyId: "COMPANY-1" }, context);
    upsertProfile("two", { locale: "pt-BR" }, context);
    upsertProfile("one", { agentName: "Original agent" }, context);
    expect(readContext(context).profiles.one).toMatchObject({ locale: "en", companyId: "COMPANY-1", agentName: "Original agent" });
    expect(readContext(context).profiles.two.locale).toBe("pt-BR");
    const before = fs.readFileSync(context, "utf8");
    expect(() => upsertProfile("two", { locale: "es" as never }, context)).toThrow();
    expect(fs.readFileSync(context, "utf8")).toBe(before);
  });

  it("uses data-dir context during early resolution and honors an explicit context override", () => {
    const first = temporary(); const second = temporary();
    upsertProfile("default", { locale: "en" }, first.context);
    upsertProfile("default", { locale: "pt-BR" }, second.context);
    expect(resolveCliLocale(["context", "show", "--data-dir", first.dir], {})).toBe("en");
    expect(resolveCliLocale(["context", "show", `-d${first.dir}`], {})).toBe("en");
    expect(resolveCliLocale(["--data-dir", first.dir, "--context", second.context], {})).toBe("pt-BR");
    expect(resolveCliLocale(["--data-dir", first.dir], { PAPERCLIP_CONTEXT: second.context })).toBe("pt-BR");
  });

  it("renders offline help in the selected language before the action hook", () => {
    const { dir, context } = temporary();
    upsertProfile("work", { locale: "en" }, context);
    setCurrentProfile("work", context);
    const en = run(dir, ["--help"], { PAPERCLIP_CONTEXT: context });
    expect(en.status).toBe(0); expect(en.stdout).toContain("Usage: paperclipai");
    const pt = run(dir, ["--lang", "pt-BR", "--help"], { PAPERCLIP_CONTEXT: context, PAPERCLIP_LANG: "en" });
    expect(pt.status).toBe(0); expect(pt.stdout).toContain("Uso: paperclipai");
    const nested = run(dir, ["context", "set", "--lang", "en", "--help"], { PAPERCLIP_CONTEXT: context, PAPERCLIP_LANG: "pt-BR" });
    expect(nested.status).toBe(0); expect(nested.stdout).toContain("Usage: paperclipai context set");
    expect(readContext(context).profiles.work.locale).toBe("en");
  }, 60_000);

  it("preserves JSON output and prevents mutations when language options are invalid", () => {
    const { dir, context } = temporary();
    const saved = run(dir, ["context", "set", "--profile", "work", "--locale", "en", "--context", context, "--json"]);
    expect(saved.status).toBe(0); expect(JSON.parse(saved.stdout).profile.locale).toBe("en");
    const before = fs.readFileSync(context, "utf8");
    for (const args of [
      ["context", "set", "--profile", "work", "--locale", "es", "--context", context, "--json"],
      ["context", "set", "--profile", "work", "--locale", "pt-BR", "--context", context, "--lang", "bad", "--json"],
    ]) {
      const result = run(dir, args);
      expect(result.status).not.toBe(0); expect(result.stderr).toContain("pt-BR"); expect(result.stderr).toContain("en");
      expect(fs.readFileSync(context, "utf8")).toBe(before);
    }
    const invalidEnvironment = run(dir, ["context", "set", "--profile", "work", "--locale", "pt-BR", "--context", context, "--json"], { PAPERCLIP_LANG: "es" });
    expect(invalidEnvironment.status).not.toBe(0);
    expect(fs.readFileSync(context, "utf8")).toBe(before);
    const english = run(dir, ["context", "show", "--profile", "work", "--context", context, "--lang", "en", "--json"]);
    const portuguese = run(dir, ["context", "show", "--profile", "work", "--context", context, "--lang", "pt-BR", "--json"]);
    expect(english.status).toBe(0); expect(portuguese.status).toBe(0);
    expect(JSON.parse(portuguese.stdout)).toEqual(JSON.parse(english.stdout));
    expect(fs.readFileSync(context, "utf8")).toBe(before);
  }, 90_000);

  it("does not reinterpret a command option's literal value as --lang or --json", () => {
    const { dir, context } = temporary();
    const result = run(dir, ["context", "set", "--profile", "work", "--agent-name", "--lang", "--locale", "en", "--context", context, "--json"]);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).profile).toMatchObject({ locale: "en", agentName: "--lang" });
  }, 30_000);
});
