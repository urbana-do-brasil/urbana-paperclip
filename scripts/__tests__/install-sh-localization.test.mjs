import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const installer = fileURLToPath(new URL("../install.sh", import.meta.url));

function createSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-install-locale-"));
  const bin = path.join(root, "bin");
  const tmp = path.join(root, "tmp");
  const home = path.join(root, "home");
  fs.mkdirSync(bin);
  fs.mkdirSync(tmp);
  fs.mkdirSync(home);

  const writeCommand = (name, body) => {
    const command = path.join(bin, name);
    fs.writeFileSync(command, `#!/bin/sh\nset -eu\n${body}\n`);
    fs.chmodSync(command, 0o755);
  };

  writeCommand("node", `if [ "${"$"}1" = "--version" ]; then printf 'v24.11.0\\n'; else exit 9; fi`);
  writeCommand("npm", "exit 0");
  writeCommand("uname", `case "${"$"}1" in -s) printf 'Linux\\n' ;; -m) printf 'x86_64\\n' ;; *) exit 2 ;; esac`);
  writeCommand("npx", [
    "printf 'raw stdout sentinel\\n'",
    "printf 'raw stderr sentinel\\n' >&2",
    `printf '%s\\n' "${"$"}@" >"${"$"}PAPERCLIP_TEST_NPX_ARGS"`,
  ].join("\n"));

  const cleanEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith("PAPERCLIP_INSTALL_") && key !== "PAPERCLIP_LANG"),
  );

  return {
    root,
    tmp,
    argsLog: path.join(root, "npx-args.txt"),
    run(args, extraEnv = {}) {
      return spawnSync("bash", [installer, ...args], {
        encoding: "utf8",
        env: {
          ...cleanEnvironment,
          PATH: `${bin}:/usr/bin:/bin`,
          HOME: home,
          TMPDIR: tmp,
          PAPERCLIP_TEST_NPX_ARGS: path.join(root, "npx-args.txt"),
          ...extraEnv,
        },
      });
    },
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

test("shell installer help defaults to PT-BR and supports English through PAPERCLIP_LANG", () => {
  const sandbox = createSandbox();
  try {
    const portuguese = sandbox.run(["--help"]);
    assert.equal(portuguese.status, 0);
    assert.match(portuguese.stdout, /\nUso:\n/);
    assert.match(portuguese.stdout, /Defina PAPERCLIP_LANG=en/);
    assert.doesNotMatch(portuguese.stdout, /\nUsage:\n/);
    assert.match(portuguese.stdout, /--no-prompt/);

    const english = sandbox.run(["--help"], { PAPERCLIP_LANG: "en" });
    assert.equal(english.status, 0);
    assert.match(english.stdout, /\nUsage:\n/);
    assert.match(english.stdout, /Set PAPERCLIP_LANG=pt-BR/);
    assert.doesNotMatch(english.stdout, /\nUso:\n/);
    assert.match(english.stdout, /--no-prompt/);
  } finally {
    sandbox.cleanup();
  }
});

test("invalid locale exits before temp files or installer actions", () => {
  const sandbox = createSandbox();
  try {
    const result = sandbox.run(["--help"], { PAPERCLIP_LANG: "es" });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /\[paperclip\] erro: Idioma inválido\. Use pt-BR ou en\./);
    assert.deepEqual(fs.readdirSync(sandbox.tmp), []);
    assert.equal(fs.existsSync(sandbox.argsLog), false);
  } finally {
    sandbox.cleanup();
  }
});

test("installer localizes its own progress while preserving raw npx output and arguments", () => {
  for (const locale of ["pt-BR", "en"]) {
    const sandbox = createSandbox();
    try {
      const result = sandbox.run(["--no-prompt", "--no-onboard"], { PAPERCLIP_LANG: locale });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, locale === "pt-BR" ? /\[paperclip\] Usando Node\.js v24\.11\.0/ : /\[paperclip\] Using Node\.js v24\.11\.0/);
      assert.match(result.stdout, locale === "pt-BR" ? /Encaminhando a instalação/ : /Delegating to the Paperclip CLI/);
      assert.match(result.stdout, /raw stdout sentinel\n/);
      assert.match(result.stderr, /^raw stderr sentinel\n$/);
      const args = fs.readFileSync(sandbox.argsLog, "utf8").split("\n");
      assert.ok(args.includes("paperclipai@latest"));
      assert.ok(args.includes("install"));
      assert.ok(args.includes("--yes"));
      assert.deepEqual(fs.readdirSync(sandbox.tmp), []);
    } finally {
      sandbox.cleanup();
    }
  }
});
