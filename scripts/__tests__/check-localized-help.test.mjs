import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("../check-localized-help.mjs", import.meta.url));
test("coverage gate rejects missing translations and duplicate slugs", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-help-gate-"));
  try {
    fs.mkdirSync(path.join(tmp, "docs/start"), { recursive: true });
    const en = path.join(tmp, "docs/start/en.md"); const pt = path.join(tmp, "docs/start/pt.md"); const manifest = path.join(tmp, "topics.json");
    fs.writeFileSync(en, "# English\n");
    const row = { slug: "start/test", group: "introduction", source: "docs/start/en.md", portugueseSource: "docs/start/pt.md" };
    const check = () => spawnSync(process.execPath, [checker, "--manifest", manifest, "--root", tmp], { encoding: "utf8" });
    fs.writeFileSync(manifest, JSON.stringify([row]));
    const missing = check(); assert.equal(missing.status, 1); assert.match(missing.stderr, /missing PT-BR guide/);
    fs.writeFileSync(pt, "# Português\n"); assert.equal(check().status, 0);
    fs.writeFileSync(manifest, JSON.stringify([row, row]));
    const duplicate = check(); assert.equal(duplicate.status, 1); assert.match(duplicate.stderr, /Duplicate topic/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("coverage gate accepts root-level public guides", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-help-root-guide-"));
  try {
    fs.mkdirSync(path.join(tmp, "docs/guides"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "docs/pt-BR/guides"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "docs/guides/example.md"), "# English\n");
    fs.writeFileSync(path.join(tmp, "docs/pt-BR/guides/example.md"), "# Português\n");
    const manifest = path.join(tmp, "topics.json");
    fs.writeFileSync(manifest, JSON.stringify([{
      slug: "guides/example",
      group: "operator",
      source: "docs/guides/example.md",
      portugueseSource: "docs/pt-BR/guides/example.md",
    }]));

    const result = spawnSync(process.execPath, [checker, "--manifest", manifest, "--root", tmp], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 topics with both source files/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("coverage gate rejects an existing source outside the public help bundle", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-help-gate-outside-"));
  try {
    fs.mkdirSync(path.join(tmp, "doc"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "doc/GOAL.md"), "# Internal goal\n");
    fs.writeFileSync(path.join(tmp, "doc/GOAL.pt-BR.md"), "# Objetivo interno\n");
    const manifest = path.join(tmp, "topics.json");
    fs.writeFileSync(manifest, JSON.stringify([{
      slug: "internal/goal",
      group: "internal",
      source: "doc/GOAL.md",
      portugueseSource: "doc/GOAL.pt-BR.md",
    }]));

    const result = spawnSync(process.execPath, [checker, "--manifest", manifest, "--root", tmp], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside the public help bundle/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("coverage gate rejects the deliberately excluded MCP fixture guide", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-help-gate-excluded-"));
  try {
    const source = "docs/guides/agent-developer/mcp-fixture-smoke.md";
    fs.mkdirSync(path.dirname(path.join(tmp, source)), { recursive: true });
    fs.writeFileSync(path.join(tmp, source), "# Fixture\n");
    const portugueseSource = "docs/pt-BR/guides/agent-developer/mcp-fixture-smoke.md";
    fs.mkdirSync(path.dirname(path.join(tmp, portugueseSource)), { recursive: true });
    fs.writeFileSync(path.join(tmp, portugueseSource), "# Fixture\n");
    const manifest = path.join(tmp, "topics.json");
    fs.writeFileSync(manifest, JSON.stringify([{
      slug: "agents/mcp-fixture-smoke",
      group: "agents",
      source,
      portugueseSource,
    }]));

    const result = spawnSync(process.execPath, [checker, "--manifest", manifest, "--root", tmp], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside the public help bundle/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
