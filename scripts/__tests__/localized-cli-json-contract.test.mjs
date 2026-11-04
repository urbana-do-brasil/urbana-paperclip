import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("the structured CLI contract rejects a deliberately renamed JSON field", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-cli-json-mutation-"));
  const preload = path.join(temp, "rename-json-field.mjs");
  try {
    // Mutate parsed CLI JSON at runtime so the existing end-to-end contract
    // test must reject a response field that was renamed/localized.
    fs.writeFileSync(preload, `
      const parse = JSON.parse;
      JSON.parse = function (source, reviver) {
        const value = parse.call(this, source, reviver);
        if (typeof source === "string" && source.includes('"status":"delivered"')
          && value && typeof value === "object" && !Array.isArray(value)) {
          value.localizedStatus = value.status;
          delete value.status;
        }
        return value;
      };
    `);

    const nodeOptions = [process.env.NODE_OPTIONS, `--import=${pathToFileURL(preload).href}`]
      .filter(Boolean)
      .join(" ");
    const result = spawnSync("pnpm", [
      "exec", "vitest", "run", "cli/src/__tests__/email-structured-contract.test.ts", "--testTimeout", "15000",
    ], {
      cwd: root,
      encoding: "utf8",
      timeout: 120_000,
      env: { ...process.env, NODE_OPTIONS: nodeOptions },
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 1, `the mutated field should fail the CLI contract test\n${output}`);
    assert.match(output, /localizedStatus/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
