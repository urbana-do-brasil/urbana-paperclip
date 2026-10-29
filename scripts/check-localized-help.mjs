#!/usr/bin/env node
// Coverage gate for the public help map. Fallback keeps the UI usable but never
// makes a missing Portuguese guide pass this check. CI integration belongs to
// OpenSpec task 7.1, once all currently pending guides have been translated.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
// Vite requires import.meta.glob arguments to remain literals. Keep this list
// aligned with ui/src/help/content.ts and fail closed if that bundle contract
// changes without the coverage gate being updated too.
const publicHelpGlobPatterns = [
  "../../../docs/start/*.md", "../../../docs/guides/*.md", "../../../docs/guides/board-operator/*.md",
  "../../../docs/guides/agent-developer/*.md", "../../../docs/deploy/*.md",
  "../../../docs/adapters/*.md", "../../../docs/cli/*.md", "../../../docs/api/*.md",
  "../../../docs/companies/companies-spec.md", "../../../docs/built-in-agents.md",
  "../../../docs/pt-BR/start/*.md", "../../../docs/pt-BR/guides/*.md", "../../../docs/pt-BR/guides/board-operator/*.md",
  "../../../docs/pt-BR/guides/agent-developer/*.md", "../../../docs/pt-BR/deploy/*.md",
  "../../../docs/pt-BR/adapters/*.md", "../../../docs/pt-BR/cli/*.md", "../../../docs/pt-BR/api/*.md",
  "../../../docs/pt-BR/companies/companies-spec.md", "../../../docs/pt-BR/built-in-agents.md",
  "!../../../docs/guides/agent-developer/mcp-fixture-smoke.md",
  "!../../../docs/pt-BR/guides/agent-developer/mcp-fixture-smoke.md",
];
function option(name) {
  const position = args.indexOf(name);
  if (position < 0) return undefined;
  const value = args[position + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

try {
  const contentPath = path.join(root, "ui/src/help/content.ts");
  assertBundlePatternsMatch(contentPath);
  const manifestPath = option("--manifest") ?? path.join(root, "ui/src/help/topics.json");
  const contentRoot = path.resolve(option("--root") ?? root);
  const group = option("--group");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(manifest)) throw new Error("Manifest must be an array");
  const selected = group ? manifest.filter((topic) => topic.group === group) : manifest;
  if (!selected.length) throw new Error(`No topics found${group ? ` for group ${group}` : ""}`);
  const seen = new Set();
  const errors = [];
  for (const topic of selected) {
    if (!topic || typeof topic.slug !== "string" || !/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*$/.test(topic.slug)) {
      errors.push("Invalid topic slug"); continue;
    }
    if (seen.has(topic.slug)) errors.push(`Duplicate topic: ${topic.slug}`);
    seen.add(topic.slug);
    for (const [label, source] of [["English", topic.source], ["PT-BR", topic.portugueseSource]]) {
      const sourcePath = typeof source === "string" ? source : "";
      const file = sourcePath ? path.resolve(contentRoot, sourcePath) : "";
      const normalized = sourcePath.replaceAll("\\", "/");
      const insideRoot = file && (file === contentRoot || file.startsWith(`${contentRoot}${path.sep}`));
      if (!sourcePath || path.posix.isAbsolute(normalized) || normalized.split("/").includes("..") || !insideRoot) {
        errors.push(`${topic.slug}: ${label} source must be a relative path inside the repository root`);
        continue;
      }
      if (!isBundledHelpSource(normalized)) {
        errors.push(`${topic.slug}: ${label} source ${sourcePath} is outside the public help bundle`);
        continue;
      }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        errors.push(`${topic.slug}: missing ${label} guide`);
      }
    }
  }
  if (errors.length) {
    for (const error of errors) process.stderr.write(`${error}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Help coverage: ${selected.length} topics with both source files.\n`);
  }
} catch (error) {
  process.stderr.write(`Help coverage check failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

/** Keep this list in sync with the literal import.meta.glob patterns in
 * ui/src/help/content.ts. Vite requires literal patterns there, so the gate
 * mirrors their exact public roots and the intentional fixture exclusion. */
function isBundledHelpSource(source) {
  const sourceGlobPath = `../../../${source}`;
  const included = publicHelpGlobPatterns
    .filter((pattern) => !pattern.startsWith("!"))
    .some((pattern) => globMatches(pattern, sourceGlobPath));
  const excluded = publicHelpGlobPatterns
    .filter((pattern) => pattern.startsWith("!"))
    .some((pattern) => globMatches(pattern.slice(1), sourceGlobPath));
  return included && !excluded;
}

function globMatches(pattern, value) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*");
  return new RegExp(`^${escaped}$`).test(value);
}

function assertBundlePatternsMatch(contentPath) {
  const content = fs.readFileSync(contentPath, "utf8");
  const globArguments = content.match(/const rawDocuments = import\.meta\.glob<string>\(\[([\s\S]*?)\], \{ query: "\?raw"/)?.[1];
  if (!globArguments) throw new Error("Could not read the public help bundle glob from ui/src/help/content.ts");
  const actualPatterns = [...globArguments.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  if (JSON.stringify(actualPatterns) !== JSON.stringify(publicHelpGlobPatterns)) {
    throw new Error("Public help bundle patterns changed; update the localized-help coverage gate to match ui/src/help/content.ts");
  }
}
