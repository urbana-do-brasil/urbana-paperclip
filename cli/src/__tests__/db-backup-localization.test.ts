import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setCliLocale } from "../localization/index.js";

const mocks = vi.hoisted(() => ({
  backup: vi.fn(), banner: vi.fn(), intro: vi.fn(), message: vi.fn(), start: vi.fn(), stop: vi.fn(), outro: vi.fn(),
}));
vi.mock("@paperclipai/db", () => ({ runDatabaseBackup: mocks.backup, formatDatabaseBackupResult: () => "fixture.dump (12 bytes)" }));
vi.mock("@clack/prompts", () => ({ intro: mocks.intro, outro: mocks.outro, log: { message: mocks.message }, spinner: () => ({ start: mocks.start, stop: mocks.stop }) }));
vi.mock("../config/store.js", () => ({ readConfig: () => null, resolveConfigPath: () => "/fixture/config.json" }));
vi.mock("../utils/banner.js", () => ({ printPaperclipCliBanner: mocks.banner }));
import { dbBackupCommand } from "../commands/db-backup.js";

const originalUrl = process.env.DATABASE_URL;
beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = "postgres://fixture:secret@localhost:5432/example";
  mocks.backup.mockResolvedValue({ backupFile: "/fixture/backup.dump", sizeBytes: 12, prunedCount: 2 });
});
afterEach(() => {
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
  setCliLocale("pt-BR");
  vi.restoreAllMocks();
});

describe("database backup localization", () => {
  it("localizes own messages while preserving backup arguments and JSON output", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const outputs: string[] = [];
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      await dbBackupCommand({ dir: "/fixture/backups", retentionDays: 7 });
      expect(mocks.backup).toHaveBeenLastCalledWith(expect.objectContaining({
        connectionString: "postgres://fixture:secret@localhost:5432/example",
        backupDir: "/fixture/backups", retention: { dailyDays: 7, weeklyWeeks: 4, monthlyMonths: 1 },
      }));
      expect(mocks.start).toHaveBeenLastCalledWith(locale === "pt-BR" ? "Criando backup do banco de dados..." : "Creating database backup...");
      const startCallsBeforeJson = mocks.start.mock.calls.length;
      await dbBackupCommand({ dir: "/fixture/backups", retentionDays: 7, json: true });
      outputs.push(String(log.mock.calls.at(-1)?.[0]));
      expect(mocks.start).toHaveBeenCalledTimes(startCallsBeforeJson);
    }
    expect(outputs[0]).toBe(outputs[1]);
    expect(JSON.parse(outputs[0])).toMatchObject({ backupFile: "/fixture/backup.dump", sizeBytes: 12, prunedCount: 2, retentionDays: 7, connectionSource: "DATABASE_URL" });
    expect(outputs[0]).not.toContain("secret");
  });

  it("rejects invalid retention before backup in both locales and keeps structured errors stable", async () => {
    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      await expect(dbBackupCommand({ retentionDays: 0 })).rejects.toThrow(locale === "pt-BR" ? "Dias de retenção inválidos" : "Invalid retention days");
      await expect(dbBackupCommand({ retentionDays: 0, json: true })).rejects.toThrow("Invalid retention days");
    }
    expect(mocks.backup).not.toHaveBeenCalled();
  });

  it("keeps successful JSON stdout free of banner and progress in both locales", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const expected = {
      backupFile: "/fixture/backup.dump",
      sizeBytes: 12,
      prunedCount: 2,
      backupDir: "/fixture/backups",
      retentionDays: 7,
      connectionSource: "DATABASE_URL",
    };

    for (const locale of ["pt-BR", "en"] as const) {
      setCliLocale(locale);
      vi.clearAllMocks();
      log.mockClear();
      await dbBackupCommand({ dir: "/fixture/backups", retentionDays: 7, json: true });

      expect(log.mock.calls).toEqual([[JSON.stringify(expected, null, 2)]]);
      expect(mocks.banner).not.toHaveBeenCalled();
      expect(mocks.intro).not.toHaveBeenCalled();
      expect(mocks.message).not.toHaveBeenCalled();
      expect(mocks.start).not.toHaveBeenCalled();
      expect(mocks.stop).not.toHaveBeenCalled();
      expect(mocks.outro).not.toHaveBeenCalled();
    }
  });

  it("keeps real structured validation failures on stderr only with stable exit status", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "paperclip-db-backup-json-"));
    const entry = fileURLToPath(new URL("../index.ts", import.meta.url));
    const tsx = fileURLToPath(new URL("../../node_modules/tsx/dist/cli.mjs", import.meta.url));
    try {
      const results = (["pt-BR", "en"] as const).map((locale) => spawnSync(
        process.execPath,
        [tsx, entry, "db:backup", "--lang", locale, "--json", "--retention-days", "0", "--config", path.join(root, "missing.json")],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          timeout: 30_000,
          env: {
            PATH: process.env.PATH,
            HOME: root,
            PAPERCLIP_HOME: path.join(root, "home"),
            PAPERCLIP_TELEMETRY_DISABLED: "1",
            NODE_ENV: "test",
          },
        },
      ));

      for (const result of results) {
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe("Invalid retention days '0'. Use a positive integer.\n");
      }
      expect(results[0]?.stdout).toBe(results[1]?.stdout);
      expect(results[0]?.stderr).toBe(results[1]?.stderr);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
