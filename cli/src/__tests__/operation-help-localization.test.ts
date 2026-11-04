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

const commonClientOptionSignatures = [
  "-c, --config <path>",
  "-d, --data-dir <path>",
  "--context <path>",
  "--profile <name>",
  "--api-base <url>",
  "--api-key <token>",
  "--run-id <id>",
  "--json",
  "--lang <locale>",
  "-h, --help",
];

const expectedLeafHelpSignatures: Record<string, { arguments: string[]; options: string[] }> = {
  "issue attachment:upload": {
    arguments: ["issueId"],
    options: ["-C, --company-id <id>", "--file <path>", "--comment-id <id>", ...commonClientOptionSignatures],
  },
  "issue attachment:download": {
    arguments: ["attachmentId"],
    options: ["--out <path>", ...commonClientOptionSignatures],
  },
  "issue attachment:delete": { arguments: ["attachmentId"], options: commonClientOptionSignatures },
  "issue label:list": {
    arguments: [],
    options: ["-C, --company-id <id>", ...commonClientOptionSignatures],
  },
  "issue label:create": {
    arguments: [],
    options: ["-C, --company-id <id>", "--name <name>", "--color <hex>", ...commonClientOptionSignatures],
  },
  "issue label:delete": { arguments: ["labelId"], options: commonClientOptionSignatures },
  "issue feedback:votes": { arguments: ["issueId"], options: commonClientOptionSignatures },
  "issue feedback:vote": {
    arguments: ["issueId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "issue checkout": {
    arguments: ["issueId"],
    options: ["--agent-id <id>", "--expected-statuses <csv>", ...commonClientOptionSignatures],
  },
  "issue release": { arguments: ["issueId"], options: commonClientOptionSignatures },
  "issue feedback:export": {
    arguments: ["issueId"],
    options: [
      "--target-type <type>", "--vote <vote>", "--status <status>", "--from <iso8601>", "--to <iso8601>",
      "--shared-only", "--include-payload", "--out <path>", "--format <format>", ...commonClientOptionSignatures,
    ],
  },
  "agent instructions-bundle:update": {
    arguments: ["agentId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "agent me": { arguments: [], options: commonClientOptionSignatures },
  "agent inbox": { arguments: [], options: commonClientOptionSignatures },
  "agent inbox-mine": {
    arguments: [],
    options: ["--user-id <id>", "--status <csv>", ...commonClientOptionSignatures],
  },
  "agent pause": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent resume": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent approve": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent terminate": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent permissions:update": {
    arguments: ["agentId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "agent heartbeat:invoke": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent claude-login": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent configuration": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent config-revisions": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent config-revision:get": { arguments: ["agentId", "revisionId"], options: commonClientOptionSignatures },
  "agent config-revision:rollback": { arguments: ["agentId", "revisionId"], options: commonClientOptionSignatures },
  "agent runtime-state": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent runtime-state:reset-session": {
    arguments: ["agentId"],
    options: ["--task-key <key>", ...commonClientOptionSignatures],
  },
  "issue force-release": { arguments: ["issueId"], options: commonClientOptionSignatures },
};

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true });
});

describe("registered CLI operation help", () => {
  it.each([
    { name: "root", command: [] },
    { name: "issue", command: ["issue"] },
    { name: "agent", command: ["agent"] },
    { name: "mcp", command: ["mcp"] },
    { name: "runtime", command: ["runtime"] },
    { name: "heartbeat", command: ["heartbeat"] },
    { name: "context", command: ["context"] },
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
    if (name === "root") {
      // Pin the current top-level help inventory so a newly registered command
      // cannot silently bypass the bilingual description check.
      expect(ptCommands).toHaveLength(75);
      expect(enCommands).toHaveLength(75);
    }

    const ptOptions = helpRows(pt, "Opções");
    const enOptions = helpRows(en, "Options");
    expectLocalizedRows(`${name} options`, ptOptions, enOptions);
    expect(ptOptions.length).toBeGreaterThan(0);

    if (name === "agent wake") {
      const ptOutput = pt.replace(/\s+/g, " ");
      const enOutput = en.replace(/\s+/g, " ");
      expect(ptOutput.match(/default: "on_demand"/g)).toHaveLength(1);
      expect(ptOutput.match(/default: "manual"/g)).toHaveLength(1);
      expect(enOutput.match(/default: "on_demand"/g)).toHaveLength(1);
      expect(enOutput.match(/default: "manual"/g)).toHaveLength(1);
    }
  }, 15_000);

  it.each([
    { name: "channels", command: ["channels"] },
    { name: "db:backup", command: ["db:backup"] },
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
    { name: "agent wake", command: ["agent", "wake"] },
    { name: "agent local-cli", command: ["agent", "local-cli"] },
    { name: "agent me", command: ["agent", "me"] },
    { name: "agent inbox", command: ["agent", "inbox"] },
    { name: "agent inbox-mine", command: ["agent", "inbox-mine"] },
    { name: "agent pause", command: ["agent", "pause"] },
    { name: "agent resume", command: ["agent", "resume"] },
    { name: "agent approve", command: ["agent", "approve"] },
    { name: "agent terminate", command: ["agent", "terminate"] },
    { name: "agent permissions:update", command: ["agent", "permissions:update"] },
    { name: "agent heartbeat:invoke", command: ["agent", "heartbeat:invoke"] },
    { name: "agent claude-login", command: ["agent", "claude-login"] },
    { name: "agent configuration", command: ["agent", "configuration"] },
    { name: "agent config-revisions", command: ["agent", "config-revisions"] },
    { name: "agent config-revision:get", command: ["agent", "config-revision:get"] },
    { name: "agent config-revision:rollback", command: ["agent", "config-revision:rollback"] },
    { name: "agent runtime-state", command: ["agent", "runtime-state"] },
    { name: "agent runtime-state:reset-session", command: ["agent", "runtime-state:reset-session"] },
    { name: "mcp login", command: ["mcp", "login"] },
    { name: "mcp proxy", command: ["mcp", "proxy"] },
    { name: "connect", command: ["connect"] },
    { name: "runtime import-remote", command: ["runtime", "import-remote"] },
    { name: "runtime setup", command: ["runtime", "setup"] },
    { name: "heartbeat run", command: ["heartbeat", "run"] },
    { name: "context show", command: ["context", "show"] },
    { name: "context list", command: ["context", "list"] },
    { name: "context use", command: ["context", "use"] },
    { name: "context set", command: ["context", "set"] },
    { name: "issue heartbeat-context", command: ["issue", "heartbeat-context"] },
    { name: "issue force-release", command: ["issue", "force-release"] },
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
    { name: "issue recovery:resolve", command: ["issue", "recovery:resolve"] },
    { name: "issue child:create", command: ["issue", "child:create"] },
    { name: "issue work-products", command: ["issue", "work-products"] },
    { name: "issue work-product:create", command: ["issue", "work-product:create"] },
    { name: "issue work-product:update", command: ["issue", "work-product:update"] },
    { name: "issue work-product:delete", command: ["issue", "work-product:delete"] },
    { name: "issue documents", command: ["issue", "documents"] },
    { name: "issue document:get", command: ["issue", "document:get"] },
    { name: "issue document:put", command: ["issue", "document:put"] },
    { name: "issue document:delete", command: ["issue", "document:delete"] },
    { name: "issue document:lock", command: ["issue", "document:lock"] },
    { name: "issue document:unlock", command: ["issue", "document:unlock"] },
    { name: "issue document:revisions", command: ["issue", "document:revisions"] },
    { name: "issue document:restore", command: ["issue", "document:restore"] },
    { name: "issue interactions", command: ["issue", "interactions"] },
    { name: "issue interaction:create", command: ["issue", "interaction:create"] },
    { name: "issue interaction:accept", command: ["issue", "interaction:accept"] },
    { name: "issue interaction:reject", command: ["issue", "interaction:reject"] },
    { name: "issue interaction:cancel", command: ["issue", "interaction:cancel"] },
    { name: "issue interaction:respond", command: ["issue", "interaction:respond"] },
    { name: "issue tree-state", command: ["issue", "tree-state"] },
    { name: "issue tree-preview", command: ["issue", "tree-preview"] },
    { name: "issue tree-holds", command: ["issue", "tree-holds"] },
    { name: "issue tree-hold:create", command: ["issue", "tree-hold:create"] },
    { name: "issue tree-hold:get", command: ["issue", "tree-hold:get"] },
    { name: "issue tree-hold:release", command: ["issue", "tree-hold:release"] },
    { name: "issue attachments", command: ["issue", "attachments"] },
    { name: "issue attachment:upload", command: ["issue", "attachment:upload"] },
    { name: "issue attachment:download", command: ["issue", "attachment:download"] },
    { name: "issue attachment:delete", command: ["issue", "attachment:delete"] },
    { name: "issue label:list", command: ["issue", "label:list"] },
    { name: "issue label:create", command: ["issue", "label:create"] },
    { name: "issue label:delete", command: ["issue", "label:delete"] },
    { name: "issue feedback:votes", command: ["issue", "feedback:votes"] },
    { name: "issue feedback:vote", command: ["issue", "feedback:vote"] },
    { name: "issue feedback:list", command: ["issue", "feedback:list"] },
    { name: "issue feedback:export", command: ["issue", "feedback:export"] },
    { name: "issue checkout", command: ["issue", "checkout"] },
    { name: "issue release", command: ["issue", "release"] },
    { name: "agent instructions-bundle:update", command: ["agent", "instructions-bundle:update"] },
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

    const expected = expectedLeafHelpSignatures[name];
    if (expected) {
      expect(helpRows(pt, "Argumentos").map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    }

    if (name === "issue feedback:export") {
      const ptOutput = pt.replace(/\s+/g, " ");
      const enOutput = en.replace(/\s+/g, " ");
      expect(ptOutput).toMatch(/Formato da exportação: json ou ndjson \(default: "ndjson"\)/);
      expect(enOutput).toMatch(/Export format: json or ndjson \(default: "ndjson"\)/);
    }
    if (name === "issue checkout") {
      const ptOutput = pt.replace(/\s+/g, " ");
      const enOutput = en.replace(/\s+/g, " ");
      expect(ptOutput).toMatch(/Status atuais esperados \(default: "todo,backlog,blocked"\)/);
      expect(enOutput).toMatch(/Expected current statuses \(default: "todo,backlog,blocked"\)/);
    }
    if (name === "issue feedback:vote") {
      expect(pt).toContain("UpsertIssueFeedbackVote");
      expect(en).toContain("UpsertIssueFeedbackVote");
    }
    if (name === "issue label:create") {
      expect(pt).toContain("#4f46e5");
      expect(en).toContain("#4f46e5");
    }
    if (name === "agent instructions-bundle:update") {
      expect(pt).toContain("UpdateAgentInstructionsBundle");
      expect(en).toContain("UpdateAgentInstructionsBundle");
    }

    if (name === "issue document:put") {
      expect(pt.replace(/\s+/g, " ")).toContain('default: "markdown"');
      expect(en.replace(/\s+/g, " ")).toContain('default: "markdown"');
    }
  }, 15_000);
});
