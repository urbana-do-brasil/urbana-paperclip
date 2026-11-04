import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setCliLocale } from "../localization/index.js";

const mocks = vi.hoisted(() => ({
  backup: vi.fn(), message: vi.fn(), start: vi.fn(), stop: vi.fn(), outro: vi.fn(),
}));
vi.mock("@paperclipai/db", () => ({ runDatabaseBackup: mocks.backup, formatDatabaseBackupResult: () => "fixture.dump (12 bytes)" }));
vi.mock("@clack/prompts", () => ({ intro: vi.fn(), outro: mocks.outro, log: { message: mocks.message }, spinner: () => ({ start: mocks.start, stop: mocks.stop }) }));
vi.mock("../config/store.js", () => ({ readConfig: () => null, resolveConfigPath: () => "/fixture/config.json" }));
vi.mock("../utils/banner.js", () => ({ printPaperclipCliBanner: vi.fn() }));
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
      await dbBackupCommand({ dir: "/fixture/backups", retentionDays: 7, json: true });
      outputs.push(String(log.mock.calls.at(-1)?.[0]));
      expect(mocks.start).toHaveBeenLastCalledWith("Creating database backup...");
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
});
