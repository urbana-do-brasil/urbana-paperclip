import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agents, authUsers, companies, createDb, heartbeatRuns, startEmbeddedPostgresTestDatabase, userLocalePreferences } from "@paperclipai/db";
import { readCommunicationLocaleSnapshot, resolveCommunicationLocaleSnapshot } from "../services/heartbeat/communication-locale.js";

describe("communication locale: persisted identity and company boundaries", () => {
  let temporary: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>;
  let db: ReturnType<typeof createDb>;
  let company1: string; let company2: string; let agent1: string; let agent2: string; let origin: string;
  beforeAll(async () => {
    temporary = await startEmbeddedPostgresTestDatabase("paperclip-communication-locale-");
    db = createDb(temporary.connectionString);
    const now = new Date();
    await db.insert(authUsers).values(["locale-user-pt", "locale-user-en"].map((id) => ({ id, name: id, email: `${id}@example.test`, createdAt: now, updatedAt: now })));
    await db.insert(userLocalePreferences).values([{ userId: "locale-user-pt", locale: "pt-BR" }, { userId: "locale-user-en", locale: "en" }]);
    const created = await db.insert(companies).values([{ name: "Locale one", issuePrefix: "LCONE" }, { name: "Locale two", issuePrefix: "LCTWO" }]).returning();
    company1 = created[0]!.id; company2 = created[1]!.id;
    const roster = await db.insert(agents).values([{ companyId: company1, name: "One" }, { companyId: company2, name: "Two" }]).returning();
    agent1 = roster[0]!.id; agent2 = roster[1]!.id;
    const [run] = await db.insert(heartbeatRuns).values({ companyId: company1, agentId: agent1, contextSnapshot: { communicationLocale: "en", communicationLocaleSource: "user" } }).returning();
    origin = run!.id;
  }, 90_000);
  afterAll(async () => { await temporary?.cleanup(); });

  it("prioritizes a validated explicit language over the requester's preference", async () => {
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "user", requesterId: "locale-user-en", explicitLocale: "pt-BR" }))
      .toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "explicit" });
    for (const bad of ["es", "en-US", "", null, {}, 1]) {
      await expect(resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, explicitLocale: bad })).rejects.toMatchObject({ status: 400 });
    }
  });

  it("uses only the actual requester's preference, without deriving a default company user", async () => {
    const forUser = (requesterId: string) => resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "user", requesterId });
    expect(await forUser("locale-user-en")).toEqual({ communicationLocale: "en", communicationLocaleSource: "user" });
    expect(await forUser("locale-user-pt")).toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "user" });
    expect(await forUser("no-preference")).toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "default" });
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "system" })).toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "default" });
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "user", requesterId: "local-board", localLocale: "en" })).toEqual({ communicationLocale: "en", communicationLocaleSource: "user" });
  });

  it("inherits only a company-scoped origin, without changing ownership", async () => {
    const inherited = await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "agent", originRunId: origin });
    expect(inherited).toEqual({ communicationLocale: "en", communicationLocaleSource: "origin" });
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company2, agentId: agent2, requesterType: "agent", originRunId: origin })).toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "default" });
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "user", requesterId: "locale-user-pt", originRunId: origin })).toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "user" });
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "user", requesterId: "no-preference", originRunId: origin })).toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "default" });
    const [run] = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, origin));
    expect(run?.agentId).toBe(agent1); expect(run?.companyId).toBe(company1); expect(run?.responsibleUserId).toBeNull();
  });

  it("keeps the original snapshot on retry and deferred delivery after a preference changes", async () => {
    const saved = { communicationLocale: "en", communicationLocaleSource: "user" };
    await db.update(userLocalePreferences).set({ locale: "pt-BR" }).where(eq(userLocalePreferences.userId, "locale-user-en"));
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "user", requesterId: "locale-user-en", retryRunId: origin })).toEqual(saved);
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "user", requesterId: "locale-user-en", deferredSnapshot: saved })).toEqual(saved);
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company1, agentId: agent1, requesterType: "user", requesterId: "locale-user-en" })).toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "user" });
    expect(await resolveCommunicationLocaleSnapshot(db, { companyId: company2, agentId: agent2, requesterType: "user", requesterId: "locale-user-en", retryRunId: origin })).toEqual({ communicationLocale: "pt-BR", communicationLocaleSource: "default" });
  });

  it("rejects incomplete or malformed snapshots", () => {
    expect(readCommunicationLocaleSnapshot({ communicationLocale: "en", communicationLocaleSource: "user" })).toEqual({ communicationLocale: "en", communicationLocaleSource: "user" });
    for (const value of [null, {}, { communicationLocale: "en" }, { communicationLocale: "es", communicationLocaleSource: "user" }, { communicationLocale: "en", communicationLocaleSource: "untrusted" }]) {
      expect(readCommunicationLocaleSnapshot(value)).toBeNull();
    }
  });
});
