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
  const optionsIndex = lines.findIndex((line, index) => index > usageIndex && /^(Options|Opções):$/.test(line.trim()));
  if (usageIndex < 0 || optionsIndex < 0) return "";
  return lines.slice(usageIndex + 1, optionsIndex).join(" ").trim();
}

function helpRows(output: string, heading: "Options" | "Opções" | "Commands" | "Comandos"): HelpRow[] {
  const lines = output.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === `${heading}:`);
  if (headingIndex < 0) return [];

  const rows: HelpRow[] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (/^(Options|Opções|Commands|Comandos):$/.test(line.trim())) break;
    // Commander wraps long descriptions on indented continuation lines. The
    // first row contains the stable signature and enough text to compare locales.
    if (!line.startsWith("  ") || line.startsWith("   ") || !line.trim()) continue;
    const match = line.match(/^  (.+?)(?:\s{2,}(\S.*))?$/);
    if (match) rows.push({ signature: match[1].trim(), description: match[2]?.trim() ?? "" });
  }
  return rows;
}

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true });
});

describe("registered CLI operation help", () => {
  it("localizes root, issue, agent, and mcp help while preserving command and option signatures", () => {
    const routes = [
      { name: "root", command: [] },
      { name: "issue", command: ["issue"] },
      { name: "agent", command: ["agent"] },
      { name: "mcp", command: ["mcp"] },
    ];

    for (const route of routes) {
      // spawnSync is intentionally called one route/locale at a time so CLI
      // module startup and telemetry setup do not overlap across subprocesses.
      const ptResult = runHelp("pt-BR", route.command);
      expect(ptResult.status, `${route.name} PT-BR stderr: ${ptResult.stderr}`).toBe(0);
      const enResult = runHelp("en", route.command);
      expect(enResult.status, `${route.name} English stderr: ${enResult.stderr}`).toBe(0);

      const pt = ptResult.stdout;
      const en = enResult.stdout;
      expect(helpSummary(pt), `${route.name} should show its PT-BR description`).not.toBe("");
      expect(helpSummary(en), `${route.name} should show its English description`).not.toBe("");
      expect(helpSummary(pt)).not.toBe(helpSummary(en));

      const ptCommands = helpRows(pt, "Comandos");
      const enCommands = helpRows(en, "Commands");
      expect(ptCommands.map((row) => row.signature)).toEqual(enCommands.map((row) => row.signature));
      expect(ptCommands.length).toBeGreaterThan(0);
      for (let index = 0; index < enCommands.length; index += 1) {
        const englishDescription = enCommands[index].description;
        if (englishDescription) {
          expect(ptCommands[index].description, `${route.name} ${enCommands[index].signature} description`).not.toBe(englishDescription);
        }
      }

      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expect(ptOptions.map((row) => row.signature)).toEqual(enOptions.map((row) => row.signature));
      expect(ptOptions.length).toBeGreaterThan(0);
    }
  }, 90_000);
});
