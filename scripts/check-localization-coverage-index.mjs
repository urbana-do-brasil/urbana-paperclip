#!/usr/bin/env node
// Keep the manually reviewed public-help source index aligned with the runtime
// manifest so newly shipped topics cannot silently escape final reconciliation.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const rootPosition = args.indexOf("--root");
const root = rootPosition < 0 ? defaultRoot : path.resolve(args[rootPosition + 1] ?? "");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function topicMap(rows, label, errors) {
  if (!Array.isArray(rows)) {
    errors.push(`${label} must be an array`);
    return new Map();
  }

  const topics = new Map();
  for (const row of rows) {
    if (!row || typeof row.slug !== "string" || !row.slug) {
      errors.push(`${label} contains a topic without a slug`);
      continue;
    }
    if (topics.has(row.slug)) {
      errors.push(`${label} contains duplicate topic '${row.slug}'`);
      continue;
    }
    topics.set(row.slug, {
      source: row.source,
      portugueseSource: row.portugueseSource,
    });
  }
  return topics;
}

try {
  const manifest = readJson("ui/src/help/topics.json");
  const coverage = readJson("doc/localization/coverage.json");
  const indexedTopics = coverage?.sourceIndexes?.documentation?.topics;
  const errors = [];
  const manifestTopics = topicMap(manifest, "Help manifest", errors);
  const sourceIndex = topicMap(indexedTopics, "Documentation source index", errors);

  for (const slug of manifestTopics.keys()) {
    if (!sourceIndex.has(slug)) {
      errors.push(`Documentation source index is missing help topic '${slug}'`);
      continue;
    }
    const manifestTopic = manifestTopics.get(slug);
    const indexedTopic = sourceIndex.get(slug);
    if (
      manifestTopic.source !== indexedTopic.source ||
      manifestTopic.portugueseSource !== indexedTopic.portugueseSource
    ) {
      errors.push(`Documentation source index paths differ for help topic '${slug}'`);
    }
  }
  for (const slug of sourceIndex.keys()) {
    if (!manifestTopics.has(slug)) {
      errors.push(`Documentation source index contains stale help topic '${slug}'`);
    }
  }

  if (errors.length) {
    for (const error of errors) process.stderr.write(`${error}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`Documentation source index: ${manifestTopics.size} help topics match.\n`);
  }
} catch (error) {
  process.stderr.write(`Localization coverage index check failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
