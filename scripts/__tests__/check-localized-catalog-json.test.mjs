import assert from "node:assert/strict";
import test from "node:test";
import { findDuplicateKeys } from "../check-localized-catalog-json.mjs";

test("detects duplicate keys per object, including escaped spellings and arrays", () => {
  const source = '{"outer":{"name":"first","na\\u006de":"second"},"list":[{"x":1,"x":2}],"other":{"name":"ok"}}';
  assert.deepEqual(findDuplicateKeys(source), ["outer.name", "list.0.x"]);
});

test("accepts matching names in separate objects and rejects malformed JSON", () => {
  assert.deepEqual(findDuplicateKeys('{"a":{"x":"},\\\""},"b":{"x":null}}'), []);
  assert.throws(() => findDuplicateKeys('{"a":1,}'));
});
