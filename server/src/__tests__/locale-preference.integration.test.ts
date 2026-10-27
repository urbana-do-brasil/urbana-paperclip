import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyPendingMigrations, authUsers, createDb, startEmbeddedPostgresTestDatabase } from "@paperclipai/db";
import { authRoutes } from "../routes/auth.js";
import { errorHandler } from "../middleware/error-handler.js";

describe("personal locale HTTP contract and real PostgreSQL", () => {
  let database: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>;
  let db: ReturnType<typeof createDb>;
  let sql: ReturnType<typeof createDb>["$client"];
  const alice = { type: "board", userId: "locale-alice", source: "session", companyIds: [] } as const;

  function app(actor: Express.Request["actor"] = { ...alice, companyIds: [] }) {
    const application = express();
    application.use(express.json());
    application.use((req, _res, next) => { req.actor = actor; next(); });
    application.use("/api/auth", authRoutes(db));
    application.use(errorHandler);
    return application;
  }
  function save(locale: unknown, actor?: Express.Request["actor"]) {
    return request(app(actor)).put("/api/auth/locale-preference").set("Origin", "http://localhost:3100").send({ locale });
  }
  async function events(userId: string = alice.userId) {
    return sql`SELECT * FROM user_locale_preference_events WHERE user_id = ${userId}`;
  }

  beforeAll(async () => {
    // Fails loudly rather than treating skipped native integration as evidence.
    database = await startEmbeddedPostgresTestDatabase("paperclip-locale-http-");
    db = createDb(database.connectionString);
    sql = db.$client;
    const now = new Date();
    await db.insert(authUsers).values(["locale-alice", "locale-bob", "locale-concurrent", "locale-atomic"].map((id) => ({ id, name: id, email: `${id}@example.test`, createdAt: now, updatedAt: now })));
  }, 90_000);

  afterAll(async () => { await sql?.end(); await database?.cleanup(); });

  it("returns the Portuguese default for an account without any organization, without writing", async () => {
    const response = await request(app()).get("/api/auth/locale-preference");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ locale: "pt-BR", source: "default" });
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(await events()).toHaveLength(0);
  });

  it("saves a private preference across organizations/devices and makes repeats idempotent", async () => {
    expect((await save("en")).body).toEqual({ locale: "en", source: "user" });
    const [before] = await sql`SELECT * FROM user_locale_preferences WHERE user_id = ${alice.userId}`;
    expect((await save("en")).status).toBe(200);
    expect(await events()).toHaveLength(1);
    const [after] = await sql`SELECT * FROM user_locale_preferences WHERE user_id = ${alice.userId}`;
    expect(after).toEqual(before);
    const anotherSession = app({ ...alice, companyIds: ["different-selected-organization"], sessionId: "new-browser" });
    expect((await request(anotherSession).get("/api/auth/locale-preference")).body).toEqual({ locale: "en", source: "user" });
    expect((await sql`SELECT * FROM activity_log WHERE actor_id = ${alice.userId}`)).toHaveLength(0);
    expect((await save("pt-BR")).body).toEqual({ locale: "pt-BR", source: "user" });
    expect(await events()).toHaveLength(2);
  });

  it("rejects invalid bodies and account selectors without changing either account", async () => {
    for (const locale of ["es", "", "pt-br", null, 1, {}, ["en"]]) expect((await save(locale)).status).toBe(400);
    for (const body of [{}, { locale: "en", userId: "locale-bob" }, { locale: "en", companyId: "other" }]) {
      expect((await request(app()).put("/api/auth/locale-preference").set("Origin", "http://localhost:3100").send(body)).status).toBe(400);
    }
    expect((await request(app()).get("/api/auth/locale-preference?userId=locale-bob")).status).toBe(400);
    expect((await request(app()).put("/api/auth/locale-preference/locale-bob").set("Origin", "http://localhost:3100").send({ locale: "en" })).status).toBe(404);
    const bob = app({ type: "board", userId: "locale-bob", source: "session" });
    expect((await request(bob).get("/api/auth/locale-preference")).body).toEqual({ locale: "pt-BR", source: "default" });
    expect(await events("locale-bob")).toHaveLength(0);
    expect((await request(app()).get("/api/auth/locale-preference")).body.locale).toBe("pt-BR");
    expect(await events()).toHaveLength(2);
  });

  it("rejects signed-out, agent, synthetic local and missing-account actors", async () => {
    const actors: Array<[Express.Request["actor"], number]> = [
      [{ type: "none" }, 401], [{ type: "agent", agentId: "agent", source: "agent_key" }, 403],
      [{ type: "board", userId: "local-board", source: "local_implicit" }, 403],
      [{ type: "board", source: "session" }, 403],
      [{ type: "board", userId: "deleted-user", source: "session" }, 401],
    ];
    for (const [actor, status] of actors) {
      expect((await request(app(actor)).get("/api/auth/locale-preference")).status).toBe(status);
      expect((await save("en", actor)).status).toBe(status);
    }
    expect((await request(app()).put("/api/auth/locale-preference").set("Origin", "https://attacker.example").send({ locale: "en" })).status).toBe(403);
    expect(await events()).toHaveLength(2);
  });

  it("serializes concurrent first saves, preserves one row, and restores the last confirmed write", async () => {
    const actor: Express.Request["actor"] = { type: "board", userId: "locale-concurrent", source: "session" };
    const repeated = await Promise.all(Array.from({ length: 8 }, () => save("en", actor)));
    expect(repeated.every((response) => response.status === 200)).toBe(true);
    expect(await events(actor.userId)).toHaveLength(1);
    const mixed = await Promise.all([save("pt-BR", actor), save("en", actor)]);
    expect(mixed.map((response) => response.status)).toEqual([200, 200]);
    expect(await sql`SELECT * FROM user_locale_preferences WHERE user_id = ${actor.userId!}`).toHaveLength(1);
    expect((await save("pt-BR", actor)).status).toBe(200);
    expect((await request(app(actor)).get("/api/auth/locale-preference")).body).toEqual({ locale: "pt-BR", source: "user" });
  });

  it("rolls back preference writes if private auditing fails", async () => {
    const actor: Express.Request["actor"] = { type: "board", userId: "locale-atomic", source: "session" };
    await sql.unsafe(`CREATE FUNCTION locale_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'locale audit test fixture'; END $$;
      CREATE TRIGGER locale_audit_failure BEFORE INSERT ON user_locale_preference_events FOR EACH ROW EXECUTE FUNCTION locale_audit_failure();`);
    try {
      expect((await save("en", actor)).status).toBe(500);
      expect(await sql`SELECT * FROM user_locale_preferences WHERE user_id = ${actor.userId!}`).toHaveLength(0);
      expect(await events(actor.userId)).toHaveLength(0);
    } finally {
      await sql.unsafe("DROP TRIGGER locale_audit_failure ON user_locale_preference_events; DROP FUNCTION locale_audit_failure();");
    }
    expect((await save("en", actor)).status).toBe(200);
  });

  it("enforces locale/FK constraints and applies the migration over existing users without backfill", async () => {
    await expect(sql`UPDATE user_locale_preferences SET locale = 'es' WHERE user_id = ${alice.userId}`).rejects.toMatchObject({ code: "23514" });
    await expect(sql`INSERT INTO user_locale_preferences (user_id, locale) VALUES ('missing-user', 'en')`).rejects.toMatchObject({ code: "23503" });
    const migration = await readFile(new URL("../../../packages/db/src/migrations/0331_absent_landau.sql", import.meta.url), "utf8");
    const hash = createHash("sha256").update(migration).digest("hex");
    const before = await sql`SELECT * FROM "user" ORDER BY id`;
    await sql.unsafe("DROP TABLE user_locale_preference_events; DROP TABLE user_locale_preferences;");
    await sql`DELETE FROM drizzle.__drizzle_migrations WHERE hash = ${hash}`;
    await applyPendingMigrations(database.connectionString);
    await applyPendingMigrations(database.connectionString);
    expect(await sql`SELECT * FROM "user" ORDER BY id`).toEqual(before);
    expect(await sql`SELECT * FROM user_locale_preferences`).toHaveLength(0);
    expect((await request(app()).get("/api/auth/locale-preference")).body).toEqual({ locale: "pt-BR", source: "default" });
    expect((await save("en")).status).toBe(200);
    const bob: Express.Request["actor"] = { type: "board", userId: "locale-bob", source: "session" };
    expect((await save("en", bob)).status).toBe(200);
    await sql`DELETE FROM "user" WHERE id = 'locale-bob'`;
    expect(await events("locale-bob")).toHaveLength(0);
    expect(await sql`SELECT * FROM user_locale_preferences WHERE user_id = 'locale-bob'`).toHaveLength(0);
  }, 90_000);
});
