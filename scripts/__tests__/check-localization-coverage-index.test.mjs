import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("../check-localization-coverage-index.mjs", import.meta.url));

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-localization-index-"));
  const manifestDir = path.join(root, "ui/src/help");
  const coverageDir = path.join(root, "doc/localization");
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.mkdirSync(coverageDir, { recursive: true });
  const manifest = [
    { slug: "guides/start", source: "docs/start.md", portugueseSource: "docs/pt-BR/start.md" },
    { slug: "pipelines/tutorial", source: "docs/pipelines.md", portugueseSource: "docs/pt-BR/pipelines.md" },
  ];
  const coverage = {
    sourceIndexes: {
      documentation: {
        topics: manifest.map((topic) => ({ ...topic, status: "source-pair-present-review-pending" })),
      },
    },
  };
  fs.writeFileSync(path.join(manifestDir, "topics.json"), JSON.stringify(manifest));
  fs.writeFileSync(path.join(coverageDir, "coverage.json"), JSON.stringify(coverage));
  return {
    root,
    manifest,
    coverage,
    run() {
      return spawnSync(process.execPath, [checker, "--root", root], { encoding: "utf8" });
    },
    write() {
      fs.writeFileSync(path.join(manifestDir, "topics.json"), JSON.stringify(this.manifest));
      fs.writeFileSync(path.join(coverageDir, "coverage.json"), JSON.stringify(this.coverage));
    },
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

test("coverage index gate accepts an exact manifest inventory", () => {
  const current = fixture();
  try {
    const result = current.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /2 help topics match/);
  } finally {
    current.cleanup();
  }
});

test("coverage index gate rejects missing, stale, and mismatched topic sources", () => {
  const current = fixture();
  try {
    current.coverage.sourceIndexes.documentation.topics = [
      { ...current.coverage.sourceIndexes.documentation.topics[0], source: "docs/wrong.md" },
      { slug: "stale/topic", source: "docs/stale.md", portugueseSource: "docs/pt-BR/stale.md" },
    ];
    current.write();
    const result = current.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /paths differ for help topic 'guides\/start'/);
    assert.match(result.stderr, /missing help topic 'pipelines\/tutorial'/);
    assert.match(result.stderr, /stale help topic 'stale\/topic'/);
  } finally {
    current.cleanup();
  }
});
