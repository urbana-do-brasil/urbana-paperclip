import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
const homes: string[] = [];

type HelpRow = { signature: string; description: string };

function runHelp(locale: "pt-BR" | "en", command: string[]) {
  const home = mkdtempSync(path.join(os.tmpdir(), "paperclip-operation-help-"));
  homes.push(home);
  return spawnSync(process.execPath, [tsx, entry, "--lang", locale, ...command, "--help"], {
    cwd: home,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      PATH: process.env.PATH,
      PAPERCLIP_HOME: home,
      PAPERCLIP_TELEMETRY_DISABLED: "1",
      NODE_ENV: "test",
      FORCE_COLOR: "0",
    },
  });
}

function helpSummary(output: string): string {
  const lines = output.split(/\r?\n/);
  const usageIndex = lines.findIndex((line) => /^(Usage|Uso):/.test(line));
  const detailIndex = lines.findIndex((line, index) => index > usageIndex && /^(Arguments|Argumentos|Options|Opções):$/.test(line.trim()));
  if (usageIndex < 0 || detailIndex < 0) return "";
  return lines.slice(usageIndex + 1, detailIndex).join(" ").trim();
}

function helpRows(output: string, heading: "Arguments" | "Argumentos" | "Options" | "Opções" | "Commands" | "Comandos"): HelpRow[] {
  const lines = output.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === `${heading}:`);
  if (headingIndex < 0) return [];

  const rows: HelpRow[] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (/^(Arguments|Argumentos|Options|Opções|Commands|Comandos):$/.test(line.trim())) break;
    // Commander wraps long descriptions on indented continuation lines. The
    // first row contains the stable signature and enough text to compare locales.
    if (!line.startsWith("  ") || line.startsWith("   ") || !line.trim()) continue;
    const match = line.match(/^  (.+?)(?:\s{2,}(\S.*))?$/);
    if (match) rows.push({ signature: match[1].trim(), description: match[2]?.trim() ?? "" });
  }
  return rows;
}

function expectLocalizedRows(routeName: string, ptRows: HelpRow[], enRows: HelpRow[]) {
  expect(ptRows.map((row) => row.signature), `${routeName} signatures`).toEqual(enRows.map((row) => row.signature));
  for (let index = 0; index < enRows.length; index += 1) {
    const englishDescription = enRows[index].description;
    if (englishDescription) {
      expect(ptRows[index].description, `${routeName} ${enRows[index].signature} description`).not.toBe(englishDescription);
    }
  }
}

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true });
});

describe("registered CLI operation help", () => {
  it.each([
    { name: "root", command: [] },
    { name: "issue", command: ["issue"] },
    { name: "agent", command: ["agent"] },
    { name: "mcp", command: ["mcp"] },
  ])("localizes $name help while preserving command and option signatures", ({ name, command }) => {
    // spawnSync is intentionally called one locale at a time so CLI module
    // startup and telemetry setup do not overlap across subprocesses.
    const ptResult = runHelp("pt-BR", command);
    expect(ptResult.status, `${name} PT-BR stderr: ${ptResult.stderr}`).toBe(0);
    const enResult = runHelp("en", command);
    expect(enResult.status, `${name} English stderr: ${enResult.stderr}`).toBe(0);

    const pt = ptResult.stdout;
    const en = enResult.stdout;
    expect(helpSummary(pt), `${name} should show its PT-BR description`).not.toBe("");
    expect(helpSummary(en), `${name} should show its English description`).not.toBe("");
    expect(helpSummary(pt)).not.toBe(helpSummary(en));

    const ptCommands = helpRows(pt, "Comandos");
    const enCommands = helpRows(en, "Commands");
    expectLocalizedRows(name, ptCommands, enCommands);
    expect(ptCommands.length).toBeGreaterThan(0);

    const ptOptions = helpRows(pt, "Opções");
    const enOptions = helpRows(en, "Options");
    expectLocalizedRows(`${name} options`, ptOptions, enOptions);
    expect(ptOptions.length).toBeGreaterThan(0);
  }, 15_000);

  it.each([
    { name: "issue list", command: ["issue", "list"] },
    { name: "issue get", command: ["issue", "get"] },
    { name: "issue create", command: ["issue", "create"] },
    { name: "issue update", command: ["issue", "update"] },
    { name: "issue delete", command: ["issue", "delete"] },
    { name: "issue comment", command: ["issue", "comment"] },
    { name: "issue comments", command: ["issue", "comments"] },
    { name: "agent list", command: ["agent", "list"] },
    { name: "agent get", command: ["agent", "get"] },
    { name: "agent create", command: ["agent", "create"] },
    { name: "agent hire", command: ["agent", "hire"] },
    { name: "agent update", command: ["agent", "update"] },
    { name: "agent delete", command: ["agent", "delete"] },
    { name: "mcp login", command: ["mcp", "login"] },
    { name: "mcp proxy", command: ["mcp", "proxy"] },
    { name: "issue heartbeat-context", command: ["issue", "heartbeat-context"] },
    { name: "issue comment:get", command: ["issue", "comment:get"] },
    { name: "issue comment:delete", command: ["issue", "comment:delete"] },
    { name: "issue approvals", command: ["issue", "approvals"] },
    { name: "issue approval:link", command: ["issue", "approval:link"] },
    { name: "issue approval:unlink", command: ["issue", "approval:unlink"] },
    { name: "issue read", command: ["issue", "read"] },
    { name: "issue unread", command: ["issue", "unread"] },
    { name: "issue archive", command: ["issue", "archive"] },
    { name: "issue unarchive", command: ["issue", "unarchive"] },
    { name: "issue recovery-actions", command: ["issue", "recovery-actions"] },
    { name: "issue work-products", command: ["issue", "work-products"] },
    { name: "issue work-product:delete", command: ["issue", "work-product:delete"] },
    { name: "issue documents", command: ["issue", "documents"] },
    { name: "issue document:get", command: ["issue", "document:get"] },
    { name: "issue interactions", command: ["issue", "interactions"] },
    { name: "issue tree-state", command: ["issue", "tree-state"] },
    { name: "issue tree-holds", command: ["issue", "tree-holds"] },
    { name: "issue tree-hold:get", command: ["issue", "tree-hold:get"] },
    { name: "issue tree-hold:release", command: ["issue", "tree-hold:release"] },
    { name: "issue attachments", command: ["issue", "attachments"] },
    { name: "issue feedback:list", command: ["issue", "feedback:list"] },
    { name: "issue runs", command: ["issue", "runs"] },
    { name: "issue live-runs", command: ["issue", "live-runs"] },
    { name: "issue active-run", command: ["issue", "active-run"] },
  ])("localizes arguments and options for $name help", ({ name, command }) => {
    // Each leaf runs in one PT-BR process followed by one English process.
    const ptResult = runHelp("pt-BR", command);
    expect(ptResult.status, `${name} PT-BR stderr: ${ptResult.stderr}`).toBe(0);
    const enResult = runHelp("en", command);
    expect(enResult.status, `${name} English stderr: ${enResult.stderr}`).toBe(0);

    const pt = ptResult.stdout;
    const en = enResult.stdout;
    expect(helpSummary(pt), `${name} should show its PT-BR description`).not.toBe("");
    expect(helpSummary(en), `${name} should show its English description`).not.toBe("");
    expect(helpSummary(pt)).not.toBe(helpSummary(en));

    const ptArguments = helpRows(pt, "Argumentos");
    const enArguments = helpRows(en, "Arguments");
    expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);

    const ptOptions = helpRows(pt, "Opções");
    const enOptions = helpRows(en, "Options");
    expect(ptOptions.length).toBeGreaterThan(0);
    expectLocalizedRows(`${name} options`, ptOptions, enOptions);
  }, 15_000);
});
