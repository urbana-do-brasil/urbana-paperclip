#!/usr/bin/env node
// Incremental heuristic for common visible literals in changed own sources. It
// is a guardrail, not an exhaustive parser or approval of unchanged surfaces.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["ui/src/", "cli/src/commands/", "packages/plugins/"];

function isSourcePath(file) {
  return sourceRoots.some((prefix) => file.startsWith(prefix))
    && /\.(?:tsx|ts)$/.test(file)
    && !/\.(?:test|spec)\.(?:tsx|ts)$/.test(file);
}

export function addedLinesFromDiff(diff) {
  const files = new Map();
  let file;
  let line = 0;
  for (const entry of diff.split(/\r?\n/)) {
    if (entry.startsWith("+++ b/")) {
      file = entry.slice("+++ b/".length);
      if (isSourcePath(file)) files.set(file, new Set());
      else file = undefined;
      continue;
    }
    const hunk = entry.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (!file) continue;
    if (entry.startsWith("+")) {
      if (!entry.startsWith("+++")) files.get(file)?.add(line);
      line += 1;
    } else if (entry.startsWith(" ")) {
      line += 1;
    }
  }
  return files;
}

function isUserFacingText(value) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || !/[A-Za-zÀ-ÖØ-öø-ÿ]/u.test(normalized)) return false;
  // Stable identifiers and documented routes remain data/code rather than
  // prose. Sentence-like text containing these tokens is still detected.
  if (/^[A-Z0-9][A-Z0-9_:/.*-]*$/.test(normalized)) return false;
  if (/^https?:\/\//i.test(normalized) || /^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(normalized)) return false;
  if (/&lt;[^\s]*&gt;/.test(normalized)) return false;
  if (!/\s/.test(normalized) && /^[a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*$/.test(normalized)) return false;
  if (!/\s/.test(normalized) && /^[A-Za-z0-9]+(?:[_:/.-][A-Za-z0-9]+)+$/.test(normalized)) return false;
  return true;
}

function pushFinding(findings, line, column, surface, rawText) {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (isUserFacingText(text)) findings.push({ line, column, surface, text });
}

function isTechnicalPlaceholderExample(filename, line, value) {
  if (filename !== "ui/src/pages/Secrets.tsx") return false;
  const field = line.match(/\bid=["']([^"']+)["']/)?.[1];
  // These are concrete provider values/examples in the vault configuration
  // form: namespace, resource prefix, ownership/environment tags, region, and
  // mount path. The same words in other placeholders remain findings.
  const examplesByField = {
    "provider-vault-namespace": new Set(["production", "admin"]),
    "provider-vault-secret-name-prefix": new Set(["paperclip"]),
    "provider-vault-owner-tag": new Set(["platform"]),
    "provider-vault-environment-tag": new Set(["prod"]),
    "provider-vault-location": new Set(["global"]),
    "provider-vault-mount-path": new Set(["secret"]),
  };
  return Boolean(field && examplesByField[field]?.has(value));
}

function stringLiterals(value) {
  const literals = [];
  const matcher = /(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`$]*(?:\$\{[^}]*\}[^`$]*)*)`)/g;
  for (const match of value.matchAll(matcher)) {
    literals.push({
      text: (match[1] ?? match[2] ?? match[3] ?? "")
        .replace(/\\(["'`\\])/g, "$1")
        .replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, " "),
      index: match.index ?? 0,
    });
  }
  return literals;
}

function callArgument(value, openingParen) {
  let depth = 0;
  let quote;
  let escaped = false;
  for (let index = openingParen; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    else if (character === ")") {
      depth -= 1;
      if (depth === 0) return value.slice(openingParen + 1, index);
    }
  }
  return value.slice(openingParen + 1);
}

function maskLocalizedMessageCalls(value) {
  // Keys and interpolation data passed to the localized CLI message helpers
  // are not raw output literals; catalog parity is checked separately.
  const pattern = /\b[a-zA-Z_$][\w$]*Message\s*\(/g;
  let masked = "";
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const openingParen = match.index + match[0].lastIndexOf("(");
    const argument = callArgument(value, openingParen);
    const closeParen = openingParen + argument.length + 1;
    masked += value.slice(cursor, match.index) + " ";
    cursor = closeParen + 1;
    pattern.lastIndex = cursor;
  }
  return masked + value.slice(cursor);
}

function sourceLineFindings(line, filename, lineNumber, sourceLines) {
  const findings = [];
  const codeLikeTags = /<\s*(?:code|kbd|pre|script|style|mono|keycap)(?:\s|>)/i;
  const codeLike = codeLikeTags.test(line) || codeLikeTags.test(sourceLines[lineNumber - 2] ?? "");
  if (!filename.startsWith("cli/src/commands/") && !codeLike) {
    // Generic `label` props often carry enum keys that components translate
    // internally; visible DOM labels are covered as JSX text and aria labels.
    const attribute = /\b(alt|aria-description|aria-label|description|placeholder|title)\s*=\s*(?:"([^"{}]+)"|'([^'{}]+)'|\{\s*(["'`])([^{}]*?)\4\s*\})/g;
    for (const match of line.matchAll(attribute)) {
      const value = match[2] ?? match[3] ?? match[5] ?? "";
      if (match[1] === "placeholder" && isTechnicalPlaceholderExample(filename, line, value)) continue;
      const valueOffset = match.index + match[0].indexOf(value);
      pushFinding(findings, lineNumber, valueOffset + 1, match[1], value);
    }

    const inlineText = /<([A-Za-z][\w.]*)\b[^<>]*>\s*([^<>{}]+?)\s*<\/\1\s*>/g;
    for (const match of line.matchAll(inlineText)) {
      const openingTag = match[0].slice(0, match[0].indexOf(">") + 1);
      if (codeLikeTags.test(openingTag)) continue;
      // Styled keycaps in the shortcut help are literal key names, not prose.
      if (match[1] === "span" && /font-(?:mono|semibold)/.test(openingTag) && /^(?:Esc|Enter|Tab|Space|[a-z])$/.test(match[2].trim())) continue;
      const value = match[2];
      const valueOffset = match.index + match[0].indexOf(value);
      pushFinding(findings, lineNumber, valueOffset + 1, "JSX text", value);
    }

    // JSX text is often placed on its own line. Only treat it as visible text
    // when the next non-empty line immediately closes an element.
    if (/^\s*[A-Za-zÀ-ÖØ-öø-ÿ][^<>={}]*\s*$/.test(line) && !codeLike) {
      let following = lineNumber;
      while (sourceLines && following < sourceLines.length && !sourceLines[following].trim()) following += 1;
      if (sourceLines && /^\s*<\/[A-Za-z][\w.]*\s*>/.test(sourceLines[following] ?? "")) {
        pushFinding(findings, lineNumber, line.search(/\S/) + 1, "JSX text", line);
      }
    }
  }

  if (filename.startsWith("cli/src/commands/")) {
    const sinks = [
      { expression: /\bconsole\s*\.\s*(?:error|info|log|warn)\s*\(/g, surface: "CLI output" },
      { expression: /\bprocess\s*\.\s*(?:stdout|stderr)\s*\.\s*write\s*\(/g, surface: "CLI output" },
      { expression: /\bnew\s+Error\s*\(/g, surface: "CLI error" },
    ];
    for (const sink of sinks) {
      for (const match of line.matchAll(sink.expression)) {
        const openingParen = match.index + match[0].lastIndexOf("(");
        const argument = maskLocalizedMessageCalls(callArgument(line, openingParen));
        for (const literal of stringLiterals(argument)) {
          pushFinding(findings, lineNumber, openingParen + literal.index + 2, sink.surface, literal.text);
        }
      }
    }
  }
  return findings;
}

export function findHardcodedUserFacingLiterals(source, filename, addedLines = null) {
  const lines = source.split(/\r?\n/);
  const findings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    if (addedLines !== null && !addedLines.has(lineNumber)) continue;
    findings.push(...sourceLineFindings(lines[index], filename, lineNumber, lines));
  }
  return findings;
}

function gitDiff(base) {
  const args = ["diff", "--no-ext-diff", "--unified=0"];
  if (base) {
    const mergeBase = execFileSync("git", ["merge-base", base, "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    // Compare the PR merge-base tree to the worktree so local, uncommitted
    // fixes are visible without including unrelated newer base-branch commits.
    args.push(mergeBase);
  } else args.push("HEAD");
  args.push("--", "ui/src", "cli/src/commands", "packages/plugins");
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function untrackedSourcePaths() {
  return execFileSync("git", ["ls-files", "--others", "--exclude-standard", "--", "ui/src", "cli/src/commands", "packages/plugins"], {
    cwd: root,
    encoding: "utf8",
  }).split(/\r?\n/).filter((file) => isSourcePath(file));
}

function main() {
  const baseIndex = process.argv.indexOf("--base");
  const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : process.env.PAPERCLIP_LOCALIZATION_BASE;
  if (baseIndex >= 0 && (!base || base.startsWith("--"))) {
    process.stderr.write("Missing value for --base\n");
    process.exitCode = 2;
    return;
  }

  try {
    const changed = addedLinesFromDiff(gitDiff(base));
    if (!base) {
      for (const file of untrackedSourcePaths()) changed.set(file, null);
    }
    const findings = [];
    for (const [file, addedLines] of changed) {
      const fullPath = path.join(root, file);
      if (!fs.existsSync(fullPath)) continue;
      const source = fs.readFileSync(fullPath, "utf8");
      for (const finding of findHardcodedUserFacingLiterals(source, file, addedLines)) {
        findings.push(`${file}:${finding.line}:${finding.column}: hardcoded user-facing ${finding.surface} '${finding.text}'`);
      }
    }
    if (findings.length) {
      process.stderr.write(`${findings.join("\n")}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(`Localized-source gate passed (${changed.size} changed source files checked).\n`);
    }
  } catch (error) {
    process.stderr.write(`Localized-source gate failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
