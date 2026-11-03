import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { addedLinesFromDiff, findHardcodedUserFacingLiterals, includeUntrackedSources } from "../check-localized-source-literals.mjs";

test("source gate detects added own labels and direct CLI output literals", () => {
  const ui = `
    <button aria-label="Delete project">Delete</button>
  `;
  const uiFindings = findHardcodedUserFacingLiterals(ui, "ui/src/components/example.tsx");
  assert.deepEqual(uiFindings.map(({ surface, text }) => [surface, text]), [
    ["aria-label", "Delete project"],
    ["JSX text", "Delete"],
  ]);

  const cli = `console.log("Reset complete");\nconsole.log(cliMessage("resetComplete"));`;
  const cliFindings = findHardcodedUserFacingLiterals(cli, "cli/src/commands/example.ts");
  assert.deepEqual(cliFindings.map(({ surface, text }) => [surface, text]), [["CLI output", "Reset complete"]]);
});

test("source gate permits localized expressions and ignores unchanged legacy literals", () => {
  const source = [
    "<button aria-label={t(\"actions.delete\")}>{t(\"actions.delete\")}</button>",
    "<code>Use --task-key</code>",
    "console.log(cliMessage(\"resetComplete\"));",
  ].join("\n");
  assert.deepEqual(findHardcodedUserFacingLiterals(source, "ui/src/components/example.tsx"), []);
  assert.deepEqual(findHardcodedUserFacingLiterals(source, "cli/src/commands/example.ts", new Set()), []);
});

test("source gate skips markup with code values and CLI text from localized message helpers", () => {
  const ui = [
    "<p>Reserved prefix <span className=\"font-mono\">PAPERCLIP_*</span></p>",
    "<Mono>wiki/projects/&lt;slug&gt;/standup.md</Mono>",
    "<TextField placeholder=\"production\" />",
    "<Link to=\"/costs\">/costs</Link>",
  ].join("\n");
  assert.deepEqual(findHardcodedUserFacingLiterals(ui, "ui/src/components/example.tsx"), []);

  const cli = `console.log(adminOperationMessage(installed.reused ? "installGitCached" : "installGitDone", { version }));`;
  assert.deepEqual(findHardcodedUserFacingLiterals(cli, "cli/src/commands/example.ts"), []);
});

test("source gate catches single-word text placeholders and preserves technical examples", () => {
  const source = [
    '<input placeholder="Email" />',
    '<TextField id="provider-vault-namespace" placeholder="production" />',
    '<TextField id="provider-vault-secret-name-prefix" placeholder="paperclip" />',
    '<TextField id="provider-vault-owner-tag" placeholder="platform" />',
    '<TextField id="provider-vault-environment-tag" placeholder="prod" />',
    '<TextField id="provider-vault-location" placeholder="global" />',
    '<TextField id="provider-vault-mount-path" placeholder="secret" />',
    '<TextField placeholder="production" />',
    '<input placeholder="scopeKind" />',
    '<input placeholder="PAPERCLIP_*" />',
  ].join("\n");
  assert.deepEqual(findHardcodedUserFacingLiterals(source, "ui/src/pages/Secrets.tsx").map(({ surface, text }) => [surface, text]), [
    ["placeholder", "Email"],
    ["placeholder", "production"],
  ]);
  assert.deepEqual(findHardcodedUserFacingLiterals(
    '<TextField id="provider-vault-namespace" placeholder="production" />',
    "ui/src/pages/Secrets.tsx",
  ), []);
});

test("diff parser scopes findings to added lines in owned source trees", () => {
  const changed = addedLinesFromDiff([
    "diff --git a/ui/src/components/example.tsx b/ui/src/components/example.tsx",
    "+++ b/ui/src/components/example.tsx",
    "@@ -4,0 +5 @@",
    "+      <button>Delete</button>",
    "diff --git a/ui/src/components/example.test.tsx b/ui/src/components/example.test.tsx",
    "+++ b/ui/src/components/example.test.tsx",
    "@@ -1 +1 @@",
    "+it(\"fixture\", () => {});",
  ].join("\n"));

  assert.deepEqual([...changed], [["ui/src/components/example.tsx", new Set([5])]]);
});

test("base comparisons also scan all lines of untracked owned sources", () => {
  const changed = includeUntrackedSources(new Map([["ui/src/existing.tsx", new Set([3])]]), [
    "ui/src/new.tsx",
    "cli/src/commands/new.ts",
    "ui/src/new.test.tsx",
    "docs/new.ts",
  ]);
  assert.deepEqual([...changed], [
    ["ui/src/existing.tsx", new Set([3])],
    ["ui/src/new.tsx", null],
    ["cli/src/commands/new.ts", null],
  ]);
  assert.equal(findHardcodedUserFacingLiterals('<button>Delete</button>', "ui/src/new.tsx", changed.get("ui/src/new.tsx")).length, 1);
});

test("source gate with a base rejects an untracked own label", () => {
  const fixture = fileURLToPath(new URL(`../../ui/src/__localization_gate_${process.pid}.tsx`, import.meta.url));
  const script = fileURLToPath(new URL("../check-localized-source-literals.mjs", import.meta.url));
  let created = false;
  try {
    fs.writeFileSync(fixture, '<button>Untranslated fixture</button>\n', { flag: "wx" });
    created = true;
    const result = spawnSync(process.execPath, [script, "--base", "HEAD"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Untranslated fixture/);
  } finally {
    if (created) fs.rmSync(fixture, { force: true });
  }
});
