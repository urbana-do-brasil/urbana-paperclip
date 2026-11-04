import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../smoke/pipelines-tutorial-smoke.sh", import.meta.url));
const source = fs.readFileSync(script, "utf8");

test("pipeline tutorial smoke refuses persistent instances by default without contacting the configured URL", () => {
  const result = spawnSync("bash", [script], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      PAPERCLIP_API_URL: "https://example.invalid",
      PAPERCLIP_API_KEY: "fixture-only",
      PAPERCLIP_COMPANY_ID: "fixture-only",
    },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /PAPERCLIP_SMOKE_DISPOSABLE=1/);
  assert.match(result.stderr, /API has no cleanup endpoint/i);
  assert.doesNotMatch(result.stderr, /jq is required/);
});

test("persistent smoke case keys are unique per run", () => {
  for (const key of [
    "FEATURE_UI_CASE_KEY",
    "FEATURE_WEBHOOKS_CASE_KEY",
    "BLOG_CASE_KEY",
    "CHANGELOG_CASE_KEY",
    "TWEET_CASE_KEY",
    "HERO_CASE_KEY",
    "CARD_CASE_KEY",
    "ASSEMBLY_CASE_KEY",
  ]) {
    assert.match(source, new RegExp(`${key}="[^"]+-\\$\\{RUN_KEY\\}"`));
  }
  assert.doesNotMatch(source, /caseKey: "(?:feature-pipelines-ui|feature-routine-webhooks|blog-post|changelog-entry|launch-tweet|blog-hero-image|blog-social-card|blog-assembly-package)"/);
});
