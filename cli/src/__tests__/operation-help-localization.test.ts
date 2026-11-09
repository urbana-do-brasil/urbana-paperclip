import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { applyCliHelpLocalization } from "../localization/cli-help.js";

const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
const homes: string[] = [];
let registeredProgram: Command;

type HelpRow = { signature: string; description: string; lines: string[] };

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

async function loadRegisteredProgram(): Promise<Command> {
  let captured: Command | undefined;
  const originalParseAsync = Command.prototype.parseAsync;
  const originalArgv = process.argv;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalTelemetryDisabled = process.env.PAPERCLIP_TELEMETRY_DISABLED;
  Command.prototype.parseAsync = function () {
    captured = this;
    return Promise.resolve(this);
  };
  process.argv = [process.execPath, entry, "--lang", "en"];
  process.env.NODE_ENV = "test";
  process.env.PAPERCLIP_TELEMETRY_DISABLED = "1";
  try {
    await import("../index.js");
    await new Promise<void>((resolve) => setImmediate(resolve));
  } finally {
    Command.prototype.parseAsync = originalParseAsync;
    process.argv = originalArgv;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalTelemetryDisabled === undefined) delete process.env.PAPERCLIP_TELEMETRY_DISABLED;
    else process.env.PAPERCLIP_TELEMETRY_DISABLED = originalTelemetryDisabled;
  }
  if (!captured) throw new Error("CLI registration did not reach Command.parseAsync");
  return captured;
}

function findCommand(pathParts: string[]): Command {
  return pathParts.reduce((parent, part) => {
    const child = parent.commands.find((candidate) => candidate.name() === part);
    if (!child) throw new Error(`Registered CLI command not found: ${[...pathParts].join(" ")}`);
    return child;
  }, registeredProgram);
}

function registeredLeafPaths(root: Command): string[][] {
  const result: string[][] = [];
  const visit = (command: Command, pathParts: string[]) => {
    const children = command.commands.filter((child) => child.name() !== "help");
    if (pathParts.length > 0 && children.length === 0) result.push(pathParts);
    for (const child of children) visit(child, [...pathParts, child.name()]);
  };
  visit(root, []);
  return result;
}

function renderRegisteredHelp(locale: "pt-BR" | "en", commandPath: string[]): string {
  applyCliHelpLocalization(registeredProgram, locale);
  return findCommand(commandPath).helpInformation();
}

function helpSummary(output: string): string {
  const lines = output.split(/\r?\n/);
  const usageIndex = lines.findIndex((line) => /^(Usage|Uso):/.test(line));
  const detailIndex = lines.findIndex((line, index) => index > usageIndex && /^(Arguments|Argumentos|Options|Opções|Commands|Comandos):$/.test(line.trim()));
  if (usageIndex < 0 || detailIndex < 0) return "";
  return lines.slice(usageIndex + 1, detailIndex).join(" ").trim();
}

function helpRows(output: string, heading: "Arguments" | "Argumentos" | "Options" | "Opções" | "Commands" | "Comandos"): HelpRow[] {
  const lines = output.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === `${heading}:`);
  if (headingIndex < 0) return [];

  const rows: HelpRow[] = [];
  let current: HelpRow | null = null;
  for (const line of lines.slice(headingIndex + 1)) {
    if (/^(Arguments|Argumentos|Options|Opções|Commands|Comandos):$/.test(line.trim())) break;
    if (!line.trim()) continue;
    // Commander wraps long descriptions on continuation lines indented past the
    // two-space row prefix. Join them so the audit checks the logical
    // description, not only its first physical line.
    if (/^(?: {4,}|\t)/.test(line)) {
      if (!current) continue;
      const text = line.trim();
      current.description = `${current.description} ${text}`.trim();
      current.lines.push(text);
      continue;
    }
    if (!line.startsWith("  ")) continue;
    const match = line.match(/^  (.+?)(?:\s{2,}(\S.*))?$/);
    if (match) {
      const description = match[2]?.trim() ?? "";
      current = {
        signature: match[1].trim(),
        description,
        lines: description ? [description] : [],
      };
      rows.push(current);
    }
  }
  return rows;
}

function normalizeHelpLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function looksLikeHumanProse(line: string): boolean {
  const normalized = normalizeHelpLine(line);
  const words = normalized.split(" ").filter(Boolean);
  // Identical technical snippets (flags, paths, URLs, placeholders) are
  // intentionally shared between locales. Human prose of at least two words
  // must not stay byte-identical to the English row.
  return words.length >= 2 && !/[<>:/\\_{}[\]$`=()"']|--|https?:\/\//i.test(normalized);
}

function expectLocalizedRows(routeName: string, ptRows: HelpRow[], enRows: HelpRow[]) {
  expect(ptRows.map((row) => row.signature), `${routeName} signatures`).toEqual(enRows.map((row) => row.signature));
  const englishProseLines = new Set(
    enRows.flatMap((row) => row.lines.map(normalizeHelpLine)).filter(looksLikeHumanProse),
  );
  for (let index = 0; index < enRows.length; index += 1) {
    const englishDescription = enRows[index].description;
    if (englishDescription) {
      expect(ptRows[index].description, `${routeName} ${enRows[index].signature} description`).not.toBe(englishDescription);
    }
    for (const line of ptRows[index].lines) {
      if (looksLikeHumanProse(line) && englishProseLines.has(normalizeHelpLine(line))) {
        throw new Error(`${routeName} ${enRows[index].signature} has untranslated continuation: ${line}`);
      }
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

const pipelineClientOptionSignatures = [
  ...commonClientOptionSignatures.slice(0, 8),
  "-C, --company-id <id>",
  ...commonClientOptionSignatures.slice(8),
];

const authLoginOptionSignatures = ["--instance-admin", "--no-browser", ...pipelineClientOptionSignatures];

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
  "agent task-sessions": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent skills": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent skills:sync": {
    arguments: ["agentId"],
    options: ["--desired-skills <csv>", "--mode <mode>", ...commonClientOptionSignatures],
  },
  "agent instructions-path:update": {
    arguments: ["agentId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "agent instructions-bundle": { arguments: ["agentId"], options: commonClientOptionSignatures },
  "agent instructions-file:get": {
    arguments: ["agentId"],
    options: ["--path <path>", ...commonClientOptionSignatures],
  },
  "agent instructions-file:put": {
    arguments: ["agentId"],
    options: [
      "--path <path>", "--content <text>", "--content-file <path>", "--clear-legacy-prompt-template",
      ...commonClientOptionSignatures,
    ],
  },
  "agent instructions-file:delete": {
    arguments: ["agentId"],
    options: ["--path <path>", ...commonClientOptionSignatures],
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
  "service install": {
    arguments: [],
    options: ["-i, --instance <id>", "--json", "--no-start-now", "--no-start-on-login", "--enable-linger", "--lang <locale>", "-h, --help"],
  },
  "service uninstall": {
    arguments: [],
    options: ["-i, --instance <id>", "--json", "--lang <locale>", "-h, --help"],
  },
  "service start": {
    arguments: [],
    options: ["-i, --instance <id>", "--json", "--lang <locale>", "-h, --help"],
  },
  "service stop": {
    arguments: [],
    options: ["-i, --instance <id>", "--json", "--lang <locale>", "-h, --help"],
  },
  "service restart": {
    arguments: [],
    options: ["-i, --instance <id>", "--json", "--wait", "--expected-version <version>", "--lang <locale>", "-h, --help"],
  },
  "service status": {
    arguments: [],
    options: ["-i, --instance <id>", "--json", "--lang <locale>", "-h, --help"],
  },
  "service logs": {
    arguments: [],
    options: ["-i, --instance <id>", "--json", "-f, --follow", "-n, --lines <count>", "--lang <locale>", "-h, --help"],
  },
  "env-lab up": { arguments: [], options: ["-i, --instance <id>", "--json", "--lang <locale>", "-h, --help"] },
  "env-lab status": { arguments: [], options: ["-i, --instance <id>", "--json", "--lang <locale>", "-h, --help"] },
  "env-lab down": { arguments: [], options: ["-i, --instance <id>", "--json", "--lang <locale>", "-h, --help"] },
  "env-lab doctor": { arguments: [], options: ["-i, --instance <id>", "--json", "--lang <locale>", "-h, --help"] },
  "routine list": {
    arguments: [],
    options: ["-C, --company-id <id>", "--project-id <id>", ...commonClientOptionSignatures],
  },
  "routine get": { arguments: ["id"], options: commonClientOptionSignatures },
  "routine revisions": { arguments: ["id"], options: commonClientOptionSignatures },
  "routine runs": { arguments: ["routineId"], options: ["--limit <n>", ...commonClientOptionSignatures] },
  "routine trigger:create": { arguments: ["id"], options: ["--payload-json <json>", ...commonClientOptionSignatures] },
  "routine trigger:update": { arguments: ["id"], options: ["--payload-json <json>", ...commonClientOptionSignatures] },
  "routine trigger:delete": { arguments: ["id"], options: commonClientOptionSignatures },
  "routine trigger:rotate-secret": { arguments: ["id"], options: ["--payload-json <json>", ...commonClientOptionSignatures] },
  "routine trigger:fire": { arguments: ["publicId"], options: ["--payload-json <json>", ...commonClientOptionSignatures] },
  "routine create": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "routine update": { arguments: ["id"], options: ["--payload-json <json>", ...commonClientOptionSignatures] },
  "routine revision:restore": { arguments: ["routineId", "revisionId"], options: commonClientOptionSignatures },
  "routine run": { arguments: ["id"], options: ["--payload-json <json>", ...commonClientOptionSignatures] },
  "teams list": {
    arguments: [],
    options: ["--kind <kind>", "--category <slug>", "--query <text>", ...pipelineClientOptionSignatures],
  },
  "teams inspect": {
    arguments: ["catalogRef"],
    options: ["--file <path>", ...commonClientOptionSignatures],
  },
  "teams preview": {
    arguments: ["catalogRef"],
    options: [
      "--target-manager-agent-id <id>", "--target-manager-slug <slug>", "--agent <slug>",
      "--collision-strategy <strategy>", "--name-override <slug=name>", "--selected-file <path>",
      "--allow-external-sources", "--allow-unpinned-optional-sources", "--allow-local-path-sources",
      ...pipelineClientOptionSignatures,
    ],
  },
  "teams install": {
    arguments: ["catalogRef"],
    options: [
      "--target-manager-agent-id <id>", "--target-manager-slug <slug>", "--agent <slug>",
      "--collision-strategy <strategy>", "--name-override <slug=name>", "--selected-file <path>",
      "--secret-value <key=value>", "--adapter-override <slug=type>", "--allow-external-sources",
      "--allow-unpinned-optional-sources", "--allow-local-path-sources", "--request-approval-on-forbidden",
      "--approval-issue-id <id>", ...pipelineClientOptionSignatures,
    ],
  },
  "adapter list": { arguments: [], options: commonClientOptionSignatures },
  "adapter get": { arguments: ["type"], options: commonClientOptionSignatures },
  "adapter delete": { arguments: ["type"], options: commonClientOptionSignatures },
  "adapter config-schema": { arguments: ["type"], options: commonClientOptionSignatures },
  "adapter ui-parser": { arguments: ["type"], options: commonClientOptionSignatures },
  "adapter models": {
    arguments: ["type"],
    options: ["-C, --company-id <id>", "--refresh", "--environment-id <id>", ...commonClientOptionSignatures],
  },
  "run list": {
    arguments: [],
    options: ["-C, --company-id <id>", "--agent-id <id>", "--limit <n>", ...commonClientOptionSignatures],
  },
  "run live": {
    arguments: [],
    options: ["-C, --company-id <id>", "--limit <n>", "--min-count <n>", ...commonClientOptionSignatures],
  },
  "run get": { arguments: ["runId"], options: commonClientOptionSignatures },
  "run cancel": { arguments: ["runId"], options: commonClientOptionSignatures },
  "run events": {
    arguments: ["runId"],
    options: ["--after-seq <n>", "--limit <n>", ...commonClientOptionSignatures],
  },
  "run log": {
    arguments: ["runId"],
    options: ["--offset <bytes>", "--limit-bytes <bytes>", "--text", ...commonClientOptionSignatures],
  },
  "run issues": { arguments: ["runId"], options: commonClientOptionSignatures },
  "run workspace-operations": { arguments: ["runId"], options: commonClientOptionSignatures },
  "run workspace-log": {
    arguments: ["operationId"],
    options: ["--offset <bytes>", "--limit-bytes <bytes>", "--text", ...commonClientOptionSignatures],
  },
  "run watchdog-decision": {
    arguments: ["runId"],
    options: [
      "--decision <decision>", "--reason <text>", "--snoozed-until <iso8601>", "--evaluation-issue-id <id>",
      ...commonClientOptionSignatures,
    ],
  },
  "pipelines create": {
    arguments: [],
    options: ["--key <key>", "--name <name>", "--description <text>", "--project-id <id>", "--enforce-transitions", "--stages-json <json>", "--stages-file <path>", ...pipelineClientOptionSignatures],
  },
  "pipelines get": { arguments: ["pipeline"], options: pipelineClientOptionSignatures },
  "pipelines set-transitions": {
    arguments: ["pipeline"],
    options: ["--file <path>", "--enforce", ...pipelineClientOptionSignatures],
  },
  "pipelines guidance get": { arguments: ["pipeline"], options: pipelineClientOptionSignatures },
  "pipelines guidance put": {
    arguments: ["pipeline"],
    options: ["--file <path>", "--body <markdown>", "--title <title>", ...pipelineClientOptionSignatures],
  },
  "pipelines set-automation": {
    arguments: ["pipeline"],
    options: ["--stage <key>", "--routine <id>", "--note <text>", ...pipelineClientOptionSignatures],
  },
  "pipelines ingest": {
    arguments: ["pipeline"],
    options: ["--case-key <key>", "--title <title>", "--summary <text>", "--fields-json <json>", "--fields-file <path>", "--stage <key>", "--parent-case <id>", "--workspace-ref-json <json>", "--blocked-by <csv>", "--blocked-by-key <csv>", ...pipelineClientOptionSignatures],
  },
  "pipelines ingest-batch": {
    arguments: ["pipeline"],
    options: ["--file <path>", ...pipelineClientOptionSignatures],
  },
  "pipelines cases": {
    arguments: ["pipeline"],
    options: ["--stage <key>", "--parent <caseId>", "--terminal", "--q <text>", ...pipelineClientOptionSignatures],
  },
  "pipelines case get": { arguments: ["caseId"], options: pipelineClientOptionSignatures },
  "pipelines case events": { arguments: ["caseId"], options: pipelineClientOptionSignatures },
  "pipelines case rollup": { arguments: ["caseId"], options: pipelineClientOptionSignatures },
  "pipelines case edit": {
    arguments: ["caseId"],
    options: ["--expected-version <n>", "--title <title>", "--summary <text>", "--fields-json <json>", "--fields-file <path>", "--workspace-ref-json <json>", "--parent-case <id>", "--lease-token <token>", ...pipelineClientOptionSignatures],
  },
  "pipelines case claim": {
    arguments: ["caseId"],
    options: ["--lease-seconds <n>", ...pipelineClientOptionSignatures],
  },
  "pipelines case release": {
    arguments: ["caseId"],
    options: ["--lease-token <token>", "--force", ...pipelineClientOptionSignatures],
  },
  "pipelines case transition": {
    arguments: ["caseId"],
    options: ["--to <stageKey>", "--expected-version <n>", "--reason <text>", "--lease-token <token>", "--accept-suggestion <id>", ...pipelineClientOptionSignatures],
  },
  "pipelines case suggest": {
    arguments: ["caseId"],
    options: ["--to <stageKey>", "--rationale <text>", "--confidence <n>", ...pipelineClientOptionSignatures],
  },
  "pipelines case resolve-suggestion": {
    arguments: ["caseId"],
    options: ["--suggestion <id>", "--accept", "--dismiss", "--expected-version <n>", "--reason <text>", "--lease-token <token>", ...pipelineClientOptionSignatures],
  },
  "pipelines case review": {
    arguments: ["caseId"],
    options: ["--approve", "--reject", "--request-changes", "--reason <text>", "--expected-version <n>", "--edits-json <json>", "--edits-file <path>", "--title <title>", "--summary <text>", "--fields-json <json>", "--fields-file <path>", "--lease-token <token>", ...pipelineClientOptionSignatures],
  },
  "pipelines case block": {
    arguments: ["caseId"],
    options: ["--by <csv>", ...pipelineClientOptionSignatures],
  },
  "pipelines case open-conversation": { arguments: ["caseId"], options: pipelineClientOptionSignatures },
  "pipelines review-inbox": {
    arguments: [],
    options: ["--pipeline <idOrKey>", "--parent <caseId>", ...pipelineClientOptionSignatures],
  },
  "pipelines review-bulk": {
    arguments: [],
    options: ["--file <path>", ...pipelineClientOptionSignatures],
  },
  "invite list": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "invite create": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "invite revoke": { arguments: ["inviteId"], options: commonClientOptionSignatures },
  "invite show": { arguments: ["token"], options: commonClientOptionSignatures },
  "invite logo": { arguments: ["token"], options: commonClientOptionSignatures },
  "invite onboarding": { arguments: ["token"], options: commonClientOptionSignatures },
  "invite onboarding:text": { arguments: ["token"], options: commonClientOptionSignatures },
  "invite skills:index": { arguments: ["token"], options: commonClientOptionSignatures },
  "invite test-resolution": {
    arguments: ["token"],
    options: ["--url <url>", ...commonClientOptionSignatures],
  },
  "invite skill": { arguments: ["token", "skillName"], options: commonClientOptionSignatures },
  "invite accept": {
    arguments: ["token"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "environment list": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "environment capabilities": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "environment create": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "environment get": { arguments: ["id"], options: commonClientOptionSignatures },
  "environment leases": { arguments: ["id"], options: commonClientOptionSignatures },
  "environment lease": { arguments: ["leaseId"], options: commonClientOptionSignatures },
  "environment update": {
    arguments: ["id"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "environment delete": { arguments: ["id"], options: commonClientOptionSignatures },
  "environment probe": { arguments: ["id"], options: commonClientOptionSignatures },
  "environment probe-config": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "auth bootstrap-ceo": {
    arguments: [],
    options: ["-c, --config <path>", "-d, --data-dir <path>", "--force", "--expires-hours <hours>", "--base-url <url>", "--lang <locale>", "-h, --help"],
  },
  "auth login": { arguments: [], options: authLoginOptionSignatures },
  "auth logout": { arguments: [], options: commonClientOptionSignatures },
  "auth revoke-current": { arguments: [], options: commonClientOptionSignatures },
  "auth whoami": { arguments: [], options: commonClientOptionSignatures },
  "auth challenge create": {
    arguments: [],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "auth challenge get": {
    arguments: ["id"],
    options: ["--token <token>", "--token-env <name>", ...commonClientOptionSignatures],
  },
  "auth challenge approve": {
    arguments: ["id"],
    options: ["--token <token>", "--token-env <name>", ...commonClientOptionSignatures],
  },
  "auth challenge cancel": {
    arguments: ["id"],
    options: ["--token <token>", "--token-env <name>", ...commonClientOptionSignatures],
  },
  "workspace list": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "workspace get": { arguments: ["id"], options: commonClientOptionSignatures },
  "workspace close-readiness": { arguments: ["id"], options: commonClientOptionSignatures },
  "workspace operations": { arguments: ["id"], options: commonClientOptionSignatures },
  "workspace update": {
    arguments: ["id"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "workspace runtime-service": {
    arguments: ["id", "action"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "workspace runtime-command": {
    arguments: ["id", "action"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "project-workspace list": { arguments: ["projectId"], options: commonClientOptionSignatures },
  "project-workspace create": {
    arguments: ["projectId", "workspaceId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "project-workspace update": {
    arguments: ["projectId", "workspaceId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "project-workspace delete": {
    arguments: ["projectId", "workspaceId"],
    options: commonClientOptionSignatures,
  },
  "project-workspace runtime-service": {
    arguments: ["projectId", "workspaceId", "action"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "project-workspace runtime-command": {
    arguments: ["projectId", "workspaceId", "action"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "member list": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "member user-directory": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "member update": {
    arguments: ["memberId"],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "member role-and-grants": {
    arguments: ["memberId"],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "member permissions": {
    arguments: ["memberId"],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "member archive": {
    arguments: ["memberId"],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "instance scheduler-heartbeats": { arguments: [], options: commonClientOptionSignatures },
  "instance settings:general": { arguments: [], options: commonClientOptionSignatures },
  "instance settings:general:update": {
    arguments: [],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "instance settings:experimental": { arguments: [], options: commonClientOptionSignatures },
  "instance settings:experimental:update": {
    arguments: [],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "instance database-backup": { arguments: [], options: commonClientOptionSignatures },
  "company export:preview": {
    arguments: ["companyId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "company export:api": {
    arguments: ["companyId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "company feedback:list": {
    arguments: [],
    options: ["-C, --company-id <id>", "--target-type <type>", "--vote <vote>", "--status <status>", "--project-id <id>", "--issue-id <id>", "--from <iso8601>", "--to <iso8601>", "--shared-only", "--include-payload", ...commonClientOptionSignatures],
  },
  "company feedback:export": {
    arguments: [],
    options: ["-C, --company-id <id>", "--target-type <type>", "--vote <vote>", "--status <status>", "--project-id <id>", "--issue-id <id>", "--from <iso8601>", "--to <iso8601>", "--shared-only", "--include-payload", "--out <path>", "--format <format>", ...commonClientOptionSignatures],
  },
  "company delete": {
    arguments: ["selector"],
    options: ["--by <mode>", "--yes", "--confirm <value>", ...commonClientOptionSignatures],
  },
  "finance event:create": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "finance events": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "finance summary": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "finance by-biller": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "finance by-kind": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "budget overview": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "budget policy:upsert": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "budget company:update": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "budget agent:update": {
    arguments: ["agentId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "budget incident:resolve": {
    arguments: ["incidentId"],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "sidebar preferences": { arguments: [], options: commonClientOptionSignatures },
  "sidebar preferences:update": { arguments: [], options: ["--payload-json <json>", ...commonClientOptionSignatures] },
  "sidebar project-preferences": {
    arguments: [],
    options: ["-C, --company-id <id>", ...commonClientOptionSignatures],
  },
  "sidebar project-preferences:update": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "sidebar badges": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "email inboxes": { arguments: [], options: pipelineClientOptionSignatures },
  "email send": { arguments: [], options: ["--file <path>", ...pipelineClientOptionSignatures] },
  "email reply": { arguments: [], options: ["--file <path>", ...pipelineClientOptionSignatures] },
  "email thread": { arguments: ["issueId"], options: pipelineClientOptionSignatures },
  "email delivery": { arguments: ["publicationId"], options: pipelineClientOptionSignatures },
  "admin user list": { arguments: [], options: ["--query <text>", ...commonClientOptionSignatures] },
  "admin user promote": { arguments: ["userId"], options: commonClientOptionSignatures },
  "admin user demote": { arguments: ["userId"], options: commonClientOptionSignatures },
  "admin user company-access": { arguments: ["userId"], options: commonClientOptionSignatures },
  "admin user company-access:update": {
    arguments: ["userId"],
    options: ["--payload-json <json>", ...commonClientOptionSignatures],
  },
  "project list": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "project get": { arguments: ["project"], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "project create": {
    arguments: [],
    options: [
      "-C, --company-id <id>", "--name <name>", "--description <text>", "--status <status>", "--goal-id <id>",
      "--goal-ids <csv>", "--lead-agent-id <id>", "--target-date <date>", "--color <value>", "--env-json <json>",
      "--execution-workspace-policy-json <json>", ...commonClientOptionSignatures,
    ],
  },
  "project update": {
    arguments: ["project"],
    options: [
      "-C, --company-id <id>", "--name <name>", "--description <text|null>", "--status <status>", "--goal-id <id|null>",
      "--goal-ids <csv>", "--lead-agent-id <id|null>", "--target-date <date|null>", "--color <value|null>",
      "--env-json <json|null>", "--execution-workspace-policy-json <json|null>", "--archived-at <iso8601|null>",
      ...commonClientOptionSignatures,
    ],
  },
  "project delete": {
    arguments: ["project"],
    options: ["-C, --company-id <id>", "--yes", ...commonClientOptionSignatures],
  },
  "join list": {
    arguments: [],
    options: ["-C, --company-id <id>", "--status <status>", "--request-type <type>", ...commonClientOptionSignatures],
  },
  "join approve": { arguments: ["requestId"], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "join reject": { arguments: ["requestId"], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "join claim-key": { arguments: ["requestId"], options: ["--claim-secret <secret>", ...commonClientOptionSignatures] },
  "available-skill list": { arguments: [], options: commonClientOptionSignatures },
  "available-skill index": { arguments: [], options: commonClientOptionSignatures },
  "available-skill get": { arguments: ["skillName"], options: commonClientOptionSignatures },
  "feedback export": {
    arguments: [],
    options: [
      "-C, --company-id <id>",
      "--target-type <type>",
      "--vote <vote>",
      "--status <status>",
      "--project-id <id>",
      "--issue-id <id>",
      "--from <iso8601>",
      "--to <iso8601>",
      "--shared-only",
      "--out <path>",
      ...commonClientOptionSignatures,
    ],
  },
  "feedback trace": { arguments: ["traceId"], options: commonClientOptionSignatures },
  "feedback bundle": { arguments: ["traceId"], options: commonClientOptionSignatures },
  "llm agent-configuration": { arguments: [], options: commonClientOptionSignatures },
  "llm agent-icons": { arguments: [], options: commonClientOptionSignatures },
  "llm agent-configuration:adapter": { arguments: ["adapterType"], options: commonClientOptionSignatures },
  "inbox dismissals": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "inbox dismiss": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "access whoami": { arguments: [], options: commonClientOptionSignatures },
  "agent prompt": {
    arguments: ["prompt"],
    options: [
      "--agent <agent>",
      "--api-key-env <name>",
      "--issue <issueId>",
      "--title <title>",
      "--no-wake",
      ...commonClientOptionSignatures,
    ],
  },
  "agent-config list": { arguments: [], options: ["-C, --company-id <id>", ...commonClientOptionSignatures] },
  "agent-prompt": {
    arguments: ["agent", "agentApiKey", "prompt"],
    options: ["--issue <issueId>", "--title <title>", "--no-wake", ...commonClientOptionSignatures],
  },
  "board prompt": {
    arguments: ["prompt"],
    options: [
      "--agent <agent>",
      "-C, --company-id <id>",
      "--issue <issueId>",
      "--title <title>",
      "--no-wake",
      ...commonClientOptionSignatures,
    ],
  },
  doctor: {
    arguments: [],
    options: [
      "-c, --config <path>",
      "-d, --data-dir <path>",
      "--repair",
      "-y, --yes",
      "--lang <locale>",
      "-h, --help",
    ],
  },
  "managed-agent setup": {
    arguments: [],
    options: [
      "--profile-key <key>",
      "--display-name <name>",
      "--api-key-secret-id <id>",
      "--model <id>",
      "--max-session-list-cost-usd <usd>",
      "--agent-id <id>",
      "--agent-version <version>",
      "--environment-id <id>",
      "--probe",
      "--acknowledge-retention",
      ...commonClientOptionSignatures.slice(0, 8),
      "-C, --company-id <id>",
      ...commonClientOptionSignatures.slice(8),
    ],
  },
  openapi: { arguments: [], options: commonClientOptionSignatures },
  "openclaw invite-prompt": {
    arguments: [],
    options: ["-C, --company-id <id>", "--payload-json <json>", ...commonClientOptionSignatures],
  },
  "test-drive": {
    arguments: [],
    options: [
      "-d, --data-dir <path>",
      "--company-name <name>",
      "--agent-name <name>",
      "--harness <harness>",
      "--model <model-id>",
      "--api-key-env <variable>",
      "--api-key <value>",
      "--no-browser",
      "--lang <locale>",
      "-h, --help",
    ],
  },
  whoami: { arguments: [], options: commonClientOptionSignatures },
};

const pipelineLeafNames = [
  "pipelines create",
  "pipelines get",
  "pipelines set-transitions",
  "pipelines guidance get",
  "pipelines guidance put",
  "pipelines set-automation",
  "pipelines ingest",
  "pipelines ingest-batch",
  "pipelines cases",
  "pipelines case get",
  "pipelines case events",
  "pipelines case rollup",
  "pipelines case edit",
  "pipelines case claim",
  "pipelines case release",
  "pipelines case transition",
  "pipelines case suggest",
  "pipelines case resolve-suggestion",
  "pipelines case review",
  "pipelines case block",
  "pipelines case open-conversation",
  "pipelines review-inbox",
  "pipelines review-bulk",
];

const inviteLeafNames = [
  "invite list",
  "invite create",
  "invite revoke",
  "invite show",
  "invite logo",
  "invite onboarding",
  "invite onboarding:text",
  "invite skills:index",
  "invite test-resolution",
  "invite skill",
  "invite accept",
];

const environmentLeafNames = [
  "environment list",
  "environment capabilities",
  "environment create",
  "environment get",
  "environment leases",
  "environment lease",
  "environment update",
  "environment delete",
  "environment probe",
  "environment probe-config",
];

const authLeafNames = [
  "auth bootstrap-ceo",
  "auth login",
  "auth logout",
  "auth revoke-current",
  "auth whoami",
  "auth challenge create",
  "auth challenge get",
  "auth challenge approve",
  "auth challenge cancel",
];

const workspaceLeafNames = [
  "workspace list",
  "workspace get",
  "workspace close-readiness",
  "workspace operations",
  "workspace update",
  "workspace runtime-service",
  "workspace runtime-command",
];

const projectWorkspaceLeafNames = [
  "project-workspace list",
  "project-workspace create",
  "project-workspace update",
  "project-workspace delete",
  "project-workspace runtime-service",
  "project-workspace runtime-command",
];

const memberLeafNames = [
  "member list",
  "member user-directory",
  "member update",
  "member role-and-grants",
  "member permissions",
  "member archive",
];

const instanceLeafNames = [
  "instance scheduler-heartbeats",
  "instance settings:general",
  "instance settings:general:update",
  "instance settings:experimental",
  "instance settings:experimental:update",
  "instance database-backup",
];

const companyLeafNames = [
  "company export:preview",
  "company export:api",
  "company feedback:list",
  "company feedback:export",
  "company delete",
];

const financeLeafNames = [
  "finance event:create",
  "finance events",
  "finance summary",
  "finance by-biller",
  "finance by-kind",
];

const budgetLeafNames = [
  "budget overview",
  "budget policy:upsert",
  "budget company:update",
  "budget agent:update",
  "budget incident:resolve",
];

const sidebarLeafNames = [
  "sidebar preferences",
  "sidebar preferences:update",
  "sidebar project-preferences",
  "sidebar project-preferences:update",
  "sidebar badges",
];

const emailLeafNames = [
  "email inboxes",
  "email send",
  "email reply",
  "email thread",
  "email delivery",
];

const adminLeafNames = [
  "admin user list",
  "admin user promote",
  "admin user demote",
  "admin user company-access",
  "admin user company-access:update",
];

const projectLeafNames = [
  "project list",
  "project get",
  "project create",
  "project update",
  "project delete",
];

const joinLeafNames = [
  "join list",
  "join approve",
  "join reject",
  "join claim-key",
];

const routineLeafNames = [
  "routine create",
  "routine update",
  "routine revision:restore",
  "routine run",
];

const teamsLeafNames = [
  "teams list",
  "teams inspect",
  "teams preview",
  "teams install",
];

const remainingLeafNames = [
  "available-skill list",
  "available-skill index",
  "available-skill get",
  "feedback export",
  "feedback trace",
  "feedback bundle",
  "llm agent-configuration",
  "llm agent-icons",
  "llm agent-configuration:adapter",
  "inbox dismissals",
  "inbox dismiss",
  "access whoami",
  "agent prompt",
  "agent-config list",
  "agent-prompt",
  "board prompt",
  "doctor",
  "managed-agent setup",
  "openapi",
  "openclaw invite-prompt",
  "test-drive",
  "whoami",
];

afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true });
});

beforeAll(async () => {
  registeredProgram = await loadRegisteredProgram();
});

describe("registered CLI operation help", () => {
  it("discovers every registered leaf from the Commander tree for in-process auditing", () => {
    const leaves = registeredLeafPaths(registeredProgram);
    expect(leaves).toHaveLength(459);
    expect(leaves.map((parts) => parts.join(" "))).toContain("run watchdog-decision");
    expect(leaves.map((parts) => parts.join(" "))).toContain("adapter models");
  });

  it.each([
    { name: "invite", command: ["invite"] },
    { name: "environment", command: ["environment"] },
    { name: "auth", command: ["auth"] },
    { name: "auth challenge", command: ["auth", "challenge"] },
    { name: "workspace", command: ["workspace"] },
    { name: "project-workspace", command: ["project-workspace"] },
    { name: "member", command: ["member"] },
    { name: "instance", command: ["instance"] },
    { name: "company", command: ["company"] },
    { name: "finance", command: ["finance"] },
    { name: "budget", command: ["budget"] },
    { name: "sidebar", command: ["sidebar"] },
    { name: "email", command: ["email"] },
    { name: "admin", command: ["admin"] },
    { name: "admin user", command: ["admin", "user"] },
    { name: "project", command: ["project"] },
    { name: "join", command: ["join"] },
    { name: "routine", command: ["routine"] },
    { name: "teams", command: ["teams"] },
    { name: "pipelines", command: ["pipelines"] },
    { name: "pipelines guidance", command: ["pipelines", "guidance"] },
    { name: "pipelines case", command: ["pipelines", "case"] },
  ])("localizes the $name group and its registered command rows in process", ({ name, command }) => {
    const pt = renderRegisteredHelp("pt-BR", command);
    const en = renderRegisteredHelp("en", command);

    expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
    expect(helpSummary(en), `${name} English summary`).not.toBe("");
    expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));
    expectLocalizedRows(`${name} commands`, helpRows(pt, "Comandos"), helpRows(en, "Commands"));
  });

  it.each(pipelineLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(inviteLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(environmentLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(authLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(workspaceLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(projectWorkspaceLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(memberLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(instanceLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(companyLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
      if (name === "company feedback:export") {
        expect(pt.replace(/\s+/g, " ")).toContain('default: "ndjson"');
        expect(en.replace(/\s+/g, " ")).toContain('default: "ndjson"');
      }
    });

  it.each(financeLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(budgetLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
      if (name === "budget incident:resolve") {
        expect(pt.replace(/\s+/g, " ")).toContain('default: "{}"');
        expect(en.replace(/\s+/g, " ")).toContain('default: "{}"');
      }
    });

  it.each(sidebarLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes every description and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(emailLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("adds meaningful descriptions and preserves registered signatures for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(adminLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes descriptions and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(projectLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes descriptions and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(joinLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes descriptions and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each(routineLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes descriptions and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
      if (name === "routine run") {
        expect(pt.replace(/\s+/g, " ")).toContain('default: "{}"');
        expect(en.replace(/\s+/g, " ")).toContain('default: "{}"');
      }
    });

  it.each(teamsLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes descriptions and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
      if (name === "teams preview" || name === "teams install") {
        const ptOutput = pt.replace(/\s+/g, " ");
        const enOutput = en.replace(/\s+/g, " ");
        expect(ptOutput).toContain("default: false");
        expect(enOutput).toContain("default: false");
      }
      if (name === "teams install") {
        expect(pt.replace(/\s+/g, " ")).toContain("PAPERCLIP_TASK_ID");
        expect(en.replace(/\s+/g, " ")).toContain("PAPERCLIP_TASK_ID");
      }
    });

  it.each(remainingLeafNames.map((name) => ({ name, command: name.split(" ") })))
    ("localizes descriptions and preserves every registered signature for $name in process", ({ name, command }) => {
      const pt = renderRegisteredHelp("pt-BR", command);
      const en = renderRegisteredHelp("en", command);
      const expected = expectedLeafHelpSignatures[name];

      expect(expected, `${name} signature coverage`).toBeDefined();
      expect(helpSummary(pt), `${name} PT-BR summary`).not.toBe("");
      expect(helpSummary(en), `${name} English summary`).not.toBe("");
      expect(helpSummary(pt), `${name} localized summary`).not.toBe(helpSummary(en));

      const ptArguments = helpRows(pt, "Argumentos");
      const enArguments = helpRows(en, "Arguments");
      const ptOptions = helpRows(pt, "Opções");
      const enOptions = helpRows(en, "Options");
      expectLocalizedRows(`${name} arguments`, ptArguments, enArguments);
      expectLocalizedRows(`${name} options`, ptOptions, enOptions);
      expect(ptArguments.map((row) => row.signature), `${name} PT-BR arguments`).toEqual(expected.arguments);
      expect(enArguments.map((row) => row.signature), `${name} English arguments`).toEqual(expected.arguments);
      expect(ptOptions.map((row) => row.signature), `${name} PT-BR options`).toEqual(expected.options);
      expect(enOptions.map((row) => row.signature), `${name} English options`).toEqual(expected.options);
    });

  it.each([
    { name: "root", command: [] },
    { name: "agent group", command: ["agent"] },
    { name: "run events", command: ["run", "events"] },
    { name: "service restart", command: ["service", "restart"] },
    { name: "issue feedback:export", command: ["issue", "feedback:export"] },
    { name: "pipelines group", command: ["pipelines"] },
    { name: "pipelines create", command: ["pipelines", "create"] },
    { name: "pipelines guidance put", command: ["pipelines", "guidance", "put"] },
    { name: "pipelines case review", command: ["pipelines", "case", "review"] },
    { name: "invite group", command: ["invite"] },
    { name: "invite create", command: ["invite", "create"] },
    { name: "invite show", command: ["invite", "show"] },
    { name: "invite test-resolution", command: ["invite", "test-resolution"] },
    { name: "invite accept", command: ["invite", "accept"] },
    { name: "environment group", command: ["environment"] },
    { name: "environment create", command: ["environment", "create"] },
    { name: "environment lease", command: ["environment", "lease"] },
    { name: "environment update", command: ["environment", "update"] },
    { name: "environment probe-config", command: ["environment", "probe-config"] },
    { name: "auth group", command: ["auth"] },
    { name: "auth challenge group", command: ["auth", "challenge"] },
    { name: "auth bootstrap-ceo", command: ["auth", "bootstrap-ceo"] },
    { name: "auth login", command: ["auth", "login"] },
    { name: "auth challenge create", command: ["auth", "challenge", "create"] },
    { name: "auth challenge get", command: ["auth", "challenge", "get"] },
    { name: "workspace group", command: ["workspace"] },
    { name: "workspace list", command: ["workspace", "list"] },
    { name: "workspace get", command: ["workspace", "get"] },
    { name: "workspace update", command: ["workspace", "update"] },
    { name: "workspace runtime-service", command: ["workspace", "runtime-service"] },
    { name: "workspace runtime-command", command: ["workspace", "runtime-command"] },
    { name: "project-workspace group", command: ["project-workspace"] },
    { name: "project-workspace create", command: ["project-workspace", "create"] },
    { name: "project-workspace update", command: ["project-workspace", "update"] },
    { name: "project-workspace runtime-command", command: ["project-workspace", "runtime-command"] },
    { name: "member group", command: ["member"] },
    { name: "member list", command: ["member", "list"] },
    { name: "member user-directory", command: ["member", "user-directory"] },
    { name: "member update", command: ["member", "update"] },
    { name: "member archive", command: ["member", "archive"] },
    { name: "instance group", command: ["instance"] },
    { name: "instance scheduler-heartbeats", command: ["instance", "scheduler-heartbeats"] },
    { name: "instance settings:general:update", command: ["instance", "settings:general:update"] },
    { name: "instance settings:experimental:update", command: ["instance", "settings:experimental:update"] },
    { name: "instance database-backup", command: ["instance", "database-backup"] },
    { name: "company group", command: ["company"] },
    { name: "company export:preview", command: ["company", "export:preview"] },
    { name: "company feedback:list", command: ["company", "feedback:list"] },
    { name: "company feedback:export", command: ["company", "feedback:export"] },
    { name: "company delete", command: ["company", "delete"] },
    { name: "finance group", command: ["finance"] },
    { name: "finance event:create", command: ["finance", "event:create"] },
    { name: "finance events", command: ["finance", "events"] },
    { name: "finance by-biller", command: ["finance", "by-biller"] },
    { name: "budget group", command: ["budget"] },
    { name: "budget overview", command: ["budget", "overview"] },
    { name: "budget policy:upsert", command: ["budget", "policy:upsert"] },
    { name: "budget agent:update", command: ["budget", "agent:update"] },
    { name: "budget incident:resolve", command: ["budget", "incident:resolve"] },
    { name: "sidebar group", command: ["sidebar"] },
    { name: "sidebar preferences:update", command: ["sidebar", "preferences:update"] },
    { name: "sidebar project-preferences", command: ["sidebar", "project-preferences"] },
    { name: "sidebar badges", command: ["sidebar", "badges"] },
    { name: "email group", command: ["email"] },
    { name: "email inboxes", command: ["email", "inboxes"] },
    { name: "email send", command: ["email", "send"] },
    { name: "email delivery", command: ["email", "delivery"] },
    { name: "admin group", command: ["admin"] },
    { name: "admin user group", command: ["admin", "user"] },
    { name: "admin user list", command: ["admin", "user", "list"] },
    { name: "admin user company-access:update", command: ["admin", "user", "company-access:update"] },
    { name: "project group", command: ["project"] },
    { name: "project list", command: ["project", "list"] },
    { name: "project create", command: ["project", "create"] },
    { name: "project delete", command: ["project", "delete"] },
    { name: "join group", command: ["join"] },
    { name: "join list", command: ["join", "list"] },
    { name: "join approve", command: ["join", "approve"] },
    { name: "join reject", command: ["join", "reject"] },
    { name: "join claim-key", command: ["join", "claim-key"] },
    { name: "routine group", command: ["routine"] },
    { name: "routine create", command: ["routine", "create"] },
    { name: "routine revision:restore", command: ["routine", "revision:restore"] },
    { name: "routine run", command: ["routine", "run"] },
    { name: "teams group", command: ["teams"] },
    { name: "teams list", command: ["teams", "list"] },
    { name: "teams inspect", command: ["teams", "inspect"] },
    { name: "teams preview", command: ["teams", "preview"] },
    { name: "teams install", command: ["teams", "install"] },
  ])("matches subprocess help in process for $name in both locales", ({ name, command }) => {
    for (const locale of ["pt-BR", "en"] as const) {
      const actual = runHelp(locale, command);
      expect(actual.status, `${name} ${locale} stderr: ${actual.stderr}`).toBe(0);
      expect(renderRegisteredHelp(locale, command), `${name} ${locale} in-process output`).toBe(actual.stdout);
    }
  }, 65_000);

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
    { name: "agent task-sessions", command: ["agent", "task-sessions"] },
    { name: "agent skills", command: ["agent", "skills"] },
    { name: "agent skills:sync", command: ["agent", "skills:sync"] },
    { name: "agent instructions-path:update", command: ["agent", "instructions-path:update"] },
    { name: "agent instructions-bundle", command: ["agent", "instructions-bundle"] },
    { name: "agent instructions-file:get", command: ["agent", "instructions-file:get"] },
    { name: "agent instructions-file:put", command: ["agent", "instructions-file:put"] },
    { name: "agent instructions-file:delete", command: ["agent", "instructions-file:delete"] },
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
    { name: "service install", command: ["service", "install"] },
    { name: "service uninstall", command: ["service", "uninstall"] },
    { name: "service start", command: ["service", "start"] },
    { name: "service stop", command: ["service", "stop"] },
    { name: "service restart", command: ["service", "restart"] },
    { name: "service status", command: ["service", "status"] },
    { name: "service logs", command: ["service", "logs"] },
    { name: "env-lab up", command: ["env-lab", "up"] },
    { name: "env-lab status", command: ["env-lab", "status"] },
    { name: "env-lab down", command: ["env-lab", "down"] },
    { name: "env-lab doctor", command: ["env-lab", "doctor"] },
    { name: "routine list", command: ["routine", "list"] },
    { name: "routine get", command: ["routine", "get"] },
    { name: "routine revisions", command: ["routine", "revisions"] },
    { name: "routine runs", command: ["routine", "runs"] },
    { name: "routine trigger:create", command: ["routine", "trigger:create"] },
    { name: "routine trigger:update", command: ["routine", "trigger:update"] },
    { name: "routine trigger:delete", command: ["routine", "trigger:delete"] },
    { name: "routine trigger:rotate-secret", command: ["routine", "trigger:rotate-secret"] },
    { name: "routine trigger:fire", command: ["routine", "trigger:fire"] },
    { name: "adapter list", command: ["adapter", "list"] },
    { name: "adapter get", command: ["adapter", "get"] },
    { name: "adapter delete", command: ["adapter", "delete"] },
    { name: "adapter config-schema", command: ["adapter", "config-schema"] },
    { name: "adapter ui-parser", command: ["adapter", "ui-parser"] },
    { name: "adapter models", command: ["adapter", "models"] },
    { name: "run list", command: ["run", "list"] },
    { name: "run live", command: ["run", "live"] },
    { name: "run get", command: ["run", "get"] },
    { name: "run cancel", command: ["run", "cancel"] },
    { name: "run events", command: ["run", "events"] },
    { name: "run log", command: ["run", "log"] },
    { name: "run issues", command: ["run", "issues"] },
    { name: "run workspace-operations", command: ["run", "workspace-operations"] },
    { name: "run workspace-log", command: ["run", "workspace-log"] },
    { name: "run watchdog-decision", command: ["run", "watchdog-decision"] },
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

  it("audits every registered leaf for localized human text and stable signatures", () => {
    const leaves = registeredLeafPaths(registeredProgram);
    expect(leaves).toHaveLength(459);
    const issues: string[] = [];

    for (const path of leaves) {
      const name = path.join(" ");
      const pt = renderRegisteredHelp("pt-BR", path);
      const en = renderRegisteredHelp("en", path);

      const ptSummary = helpSummary(pt);
      const enSummary = helpSummary(en);
      if (!ptSummary || !enSummary) issues.push(`${name}: missing summary`);
      else if (ptSummary === enSummary) issues.push(`${name}: untranslated summary`);

      for (const [ptHeading, enHeading] of [["Argumentos", "Arguments"], ["Opções", "Options"]] as const) {
        const ptRows = helpRows(pt, ptHeading);
        const enRows = helpRows(en, enHeading);
        if (ptRows.length !== enRows.length) {
          issues.push(`${name}: ${enHeading.toLowerCase()} row count ${ptRows.length} != ${enRows.length}`);
          continue;
        }
        for (let index = 0; index < enRows.length; index += 1) {
          const enRow = enRows[index]!;
          const ptRow = ptRows[index]!;
          if (ptRow.signature !== enRow.signature) {
            issues.push(`${name}: ${enRow.signature} signature changed to ${ptRow.signature}`);
          }
          if (enRow.description && ptRow.description === enRow.description) {
            issues.push(`${name}: ${enRow.signature} untranslated description`);
          }
          const englishProseLines = new Set(
            enRow.lines.map(normalizeHelpLine).filter(looksLikeHumanProse),
          );
          for (const line of ptRow.lines) {
            if (looksLikeHumanProse(line) && englishProseLines.has(normalizeHelpLine(line))) {
              issues.push(`${name}: ${enRow.signature} untranslated continuation "${line}"`);
            }
          }
        }
      }
    }

    expect(issues).toEqual([]);
  }, 120_000);
});

describe("help row parsing", () => {
  it("joins wrapped continuation lines and rejects an English continuation", () => {
    const pt = [
      "Opções:",
      "  --run-id <id>  ID da execução",
      "                 do heartbeat",
      "  --json  Exibir JSON bruto",
    ].join("\n");
    const en = [
      "Options:",
      "  --run-id <id>  Execution ID",
      "                 for heartbeat",
      "  --json  Show raw JSON",
    ].join("\n");

    const ptRows = helpRows(pt, "Opções");
    expect(ptRows[0]?.description).toBe("ID da execução do heartbeat");
    expect(ptRows[0]?.lines).toEqual(["ID da execução", "do heartbeat"]);
    expect(() => expectLocalizedRows("fixture", ptRows, helpRows(en, "Options"))).not.toThrow();

    const untranslated = pt.replace("do heartbeat", "for heartbeat");
    expect(() =>
      expectLocalizedRows("negative fixture", helpRows(untranslated, "Opções"), helpRows(en, "Options")),
    ).toThrow(/untranslated continuation/);
  });
});
