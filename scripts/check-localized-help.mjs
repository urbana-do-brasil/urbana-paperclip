#!/usr/bin/env node
// Coverage gate for the public help map. Fallback keeps the UI usable but never
// makes a missing Portuguese guide pass this check. CI integration belongs to
// OpenSpec task 7.1, once all currently pending guides have been translated.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function option(name) {
  const position = args.indexOf(name);
  if (position < 0) return undefined;
  const value = args[position + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}

try {
  const manifestPath = option("--manifest") ?? path.join(root, "ui/src/help/topics.json");
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
      const file = typeof source === "string" ? path.resolve(root, source) : "";
      if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
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
