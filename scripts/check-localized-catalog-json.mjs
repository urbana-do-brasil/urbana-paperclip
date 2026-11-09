#!/usr/bin/env node
// JSON.parse accepts duplicate keys and silently discards earlier translations.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function findDuplicateKeys(source) {
  JSON.parse(source); // Validate syntax before walking tokens.
  let pos = 0;
  const duplicates = [];
  const whitespace = () => { while (/\s/.test(source[pos] ?? "") && pos < source.length) pos++; };
  function string() {
    const start = pos++;
    while (pos < source.length) {
      if (source[pos] === "\\") pos += 2;
      else if (source[pos++] === '"') break;
    }
    return JSON.parse(source.slice(start, pos));
  }
  function value(prefix) {
    whitespace();
    if (source[pos] === '"') { string(); return; }
    if (source[pos] === "{") {
      pos++; whitespace();
      const seen = new Set();
      while (source[pos] !== "}") {
        whitespace(); const key = string(); whitespace(); pos++; // colon
        const keyPath = [...prefix, key];
        if (seen.has(key)) duplicates.push(keyPath.join("."));
        seen.add(key);
        value(keyPath); whitespace();
        if (source[pos] === ",") { pos++; whitespace(); } else break;
      }
      pos++; return;
    }
    if (source[pos] === "[") {
      pos++; whitespace(); let index = 0;
      while (source[pos] !== "]") {
        value([...prefix, String(index++)]); whitespace();
        if (source[pos] === ",") { pos++; whitespace(); } else break;
      }
      pos++; return;
    }
    while (pos < source.length && !/[\s,}\]]/.test(source[pos])) pos++;
  }
  value([]);
  return duplicates;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  let failed = false;
  for (const locale of ["en", "pt-BR"]) {
    const file = path.join(root, "ui/src/i18n/locales", `${locale}.json`);
    try {
      for (const key of findDuplicateKeys(fs.readFileSync(file, "utf8"))) {
        console.error(`${locale}: duplicate key ${key}`); failed = true;
      }
    } catch (error) {
      console.error(`${locale}: invalid JSON: ${error.message}`); failed = true;
    }
  }
  if (failed) process.exitCode = 1;
  else console.log("Localized catalogs: JSON keys are unique.");
}
