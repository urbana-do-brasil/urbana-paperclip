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
    const en = path.join(tmp, "en.md"); const pt = path.join(tmp, "pt.md"); const manifest = path.join(tmp, "topics.json");
    fs.writeFileSync(en, "# English\n");
    const row = { slug: "start/test", group: "introduction", source: en, portugueseSource: pt };
    const check = () => spawnSync(process.execPath, [checker, "--manifest", manifest], { encoding: "utf8" });
    fs.writeFileSync(manifest, JSON.stringify([row]));
    const missing = check(); assert.equal(missing.status, 1); assert.match(missing.stderr, /missing PT-BR guide/);
    fs.writeFileSync(pt, "# Português\n"); assert.equal(check().status, 0);
    fs.writeFileSync(manifest, JSON.stringify([row, row]));
    const duplicate = check(); assert.equal(duplicate.status, 1); assert.match(duplicate.stderr, /Duplicate topic/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
