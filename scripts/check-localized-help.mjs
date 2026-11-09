#!/usr/bin/env node
// Coverage gate for the public help map. Fallback keeps the UI usable but never
// makes a missing Portuguese guide or broken local link pass this check.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
// Vite requires import.meta.glob arguments to remain literals. Keep this list
// aligned with ui/src/help/content.ts and fail closed if that bundle contract
// changes without the coverage gate being updated too.
const publicHelpGlobPatterns = [
  "../../../docs/*.md",
  "../../../docs/start/*.md", "../../../docs/guides/*.md", "../../../docs/guides/board-operator/*.md",
  "../../../docs/guides/agent-developer/*.md", "../../../docs/deploy/*.md",
  "../../../docs/adapters/*.md", "../../../docs/cli/*.md", "../../../docs/api/*.md",
  "../../../docs/companies/companies-spec.md", "../../../docs/built-in-agents.md",
  "../../../docs/pt-BR/*.md",
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
  const publicSlugs = new Set(manifest.map((topic) => topic?.slug).filter((slug) => typeof slug === "string"));
  const seen = new Set();
  const errors = [];

  // The manifest is the public-help inventory, so every Markdown file shipped
  // by the bundle globs must be represented there. Checking only manifest
  // entries misses newly added docs that were never registered.
  const mappedSources = new Set();
  for (const topic of manifest) {
    for (const source of [topic?.source, topic?.portugueseSource]) {
      if (typeof source !== "string" || !source) continue;
      const normalized = source.replaceAll("\\", "/");
      if (path.posix.isAbsolute(normalized) || normalized.split("/").includes("..")) continue;
      const absolute = path.resolve(contentRoot, normalized);
      if (absolute !== contentRoot && !absolute.startsWith(`${contentRoot}${path.sep}`)) continue;
      mappedSources.add(path.relative(contentRoot, absolute).replaceAll("\\", "/"));
    }
  }
  for (const source of bundledMarkdownSources(contentRoot)) {
    if (!mappedSources.has(source)) errors.push(`${source}: public help source is not referenced by the topic manifest`);
  }

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
        continue;
      }
      for (const href of markdownLinkTargets(fs.readFileSync(file, "utf8"))) {
        const problem = resolveLocalHelpLink(href, file, contentRoot, publicSlugs);
        if (problem) errors.push(`${topic.slug}: ${label} guide has ${problem}`);
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

function bundledMarkdownSources(contentRoot) {
  const docsRoot = path.join(contentRoot, "docs");
  const files = [];
  const visit = (directory) => {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(path.relative(contentRoot, absolute).replaceAll("\\", "/"));
      }
    }
  };
  visit(docsRoot);

  const includedPatterns = publicHelpGlobPatterns.filter((pattern) => !pattern.startsWith("!"));
  const excludedPatterns = publicHelpGlobPatterns.filter((pattern) => pattern.startsWith("!"));
  return files.filter((source) => {
    const bundledPath = `../../../${source}`;
    const included = includedPatterns.some((pattern) => globMatches(pattern, bundledPath));
    const excluded = excludedPatterns.some((pattern) => globMatches(pattern.slice(1), bundledPath));
    return included && !excluded;
  });
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

function markdownLinkTargets(markdown) {
  const withoutFences = markdown.replace(/^\s{0,3}(```+|~~~+)[^\n]*\n[\s\S]*?^\s{0,3}\1\s*$/gm, "");
  const withoutInlineCode = withoutFences.replace(/(`+)[^`]*?\1/g, "");
  const links = [];
  for (const match of withoutInlineCode.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^)]*["'])?\s*\)/g)) {
    links.push((match[1] ?? match[2] ?? "").trim());
  }

  const definitions = new Map();
  const definitionPattern = /^[ \t]{0,3}\[([^\]]+)\]:[ \t]*(?:<([^>\n]+)>|(\S+))(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/gm;
  const withoutDefinitions = withoutInlineCode.replace(definitionPattern, (_line, label, angleTarget, plainTarget) => {
    definitions.set(normalizeReferenceLabel(label), (angleTarget ?? plainTarget ?? "").trim());
    return "";
  });
  for (const match of withoutDefinitions.matchAll(/!?\[([^\]]*)\](?:\[([^\]]*)\])?/g)) {
    // Inline links were already collected above. Their link text can otherwise
    // look like a shortcut reference when a definition has the same label.
    const afterLinkText = (match.index ?? 0) + match[0].length;
    if (withoutDefinitions[afterLinkText] === "(") continue;
    const label = normalizeReferenceLabel(match[2] || match[1] || "");
    const target = definitions.get(label);
    if (target) links.push(target);
  }
  return links;
}

function normalizeReferenceLabel(label) {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function resolveLocalHelpLink(href, sourceFile, contentRoot, publicSlugs) {
  if (!href || href.startsWith("#") || href.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(href)) return undefined;
  if (href.startsWith("/")) {
    let slug;
    try {
      slug = decodeURIComponent(href).slice(1).split(/[?#]/)[0];
    } catch {
      return `a malformed local link '${href}'`;
    }
    slug = path.posix.normalize(slug).replace(/^\.\//, "").replace(/\.md$/i, "").replace(/\/$/, "");
    if (!slug || !publicSlugs.has(slug)) return `a link to missing public help topic '${href}'`;
    return undefined;
  }

  let relativePath;
  try {
    relativePath = decodeURIComponent(href.split(/[?#]/)[0]);
  } catch {
    return `a malformed local link '${href}'`;
  }
  if (!relativePath) return undefined;
  const target = path.resolve(path.dirname(sourceFile), relativePath);
  if (target !== contentRoot && !target.startsWith(`${contentRoot}${path.sep}`)) {
    return `a link outside the repository '${href}'`;
  }
  const candidates = path.extname(target)
    ? [target]
    : [target, `${target}.md`, path.join(target, "index.md")];
  if (!candidates.some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) {
    return `a link to missing local file '${href}'`;
  }
  return undefined;
}
