import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agents, agentWakeupRequests, authUsers, companies, companyMemberships, createDb,
  dotAgentBindings, dotMailboxItems, dotRunnerAssignments, heartbeatRuns, issueComments, issues,
  userLocalePreferences } from "@paperclipai/db";
import { startEmbeddedPostgresTestDatabase } from "./helpers/embedded-postgres.js";
import { heartbeatService } from "../services/heartbeat.js";
import { runningProcesses } from "../adapters/index.js";
import { createPostgresWakeQueueAdapter } from "../modules/wake-queue/adapters/postgres.js";
import { createReleaseIssueExecution } from "../modules/wake-queue/application/use-cases.js";

describe("Dot follow-up communication snapshots", () => {
  let temporary: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>;
  let db: ReturnType<typeof createDb>;
  beforeAll(async () => {
    temporary = await startEmbeddedPostgresTestDatabase("paperclip-dot-locale-");
    db = createDb(temporary.connectionString);
  }, 90_000);
  afterAll(async () => { runningProcesses.clear(); await temporary?.cleanup(); });

  it("retains each comment's captured locale when a Dot receipt coalesces and is promoted", async () => {
    const owner = `dot-locale-${randomUUID()}`;
    const other = `dot-locale-${randomUUID()}`;
    const portuguese = `dot-locale-${randomUUID()}`;
    const now = new Date();
    await db.insert(authUsers).values([owner, other, portuguese].map(id => ({ id, name: id, email: `${id}@example.test`, createdAt: now, updatedAt: now })));
    await db.insert(userLocalePreferences).values([{ userId: owner, locale: "en" }, { userId: other, locale: "en" }, { userId: portuguese, locale: "pt-BR" }]);
    const [company] = await db.insert(companies).values({ name: "Dot locale", issuePrefix: `DL${randomUUID().slice(0, 6)}`, defaultResponsibleUserId: owner }).returning();
    await db.insert(companyMemberships).values([owner, other, portuguese].map(id => ({ companyId: company.id, principalType: "user", principalId: id, membershipRole: "owner", status: "active" })));
    const [agent] = await db.insert(agents).values({ companyId: company.id, name: "Dot", status: "active", adapterType: "paperclip_runner", adapterConfig: { provider: "openai_dot", allowUnmeteredProvider: true, lifecycleMode: "per_turn" } }).returning();
    const [binding] = await db.insert(dotAgentBindings).values({ companyId: company.id, agentId: agent.id, operatorId: owner, status: "ready" }).returning();
    await db.update(agents).set({ adapterConfig: { provider: "openai_dot", dotBindingId: binding.id, allowUnmeteredProvider: true, lifecycleMode: "per_turn" } }).where(eq(agents.id, agent.id));
    const [run] = await db.insert(heartbeatRuns).values({ companyId: company.id, agentId: agent.id, status: "running", invocationSource: "assignment", runtimeMode: "native", nativeSessionId: randomUUID(), responsibleUserId: owner, contextSnapshot: { communicationLocale: "en", communicationLocaleSource: "user" } }).returning();
    const [task] = await db.insert(issues).values({ companyId: company.id, title: "Dot follow-up", status: "in_progress", assigneeAgentId: agent.id, responsibleUserId: owner, executionRunId: run.id, checkoutRunId: run.id }).returning();
    await db.update(heartbeatRuns).set({ nativeIssueId: task.id, issueId: task.id, contextSnapshot: { issueId: task.id, communicationLocale: "en", communicationLocaleSource: "user" } }).where(eq(heartbeatRuns.id, run.id));
    const [assignment] = await db.insert(dotRunnerAssignments).values({ companyId: company.id, bindingId: binding.id, bindingGeneration: binding.generation, runId: run.id, agentId: agent.id, normalizedSessionId: run.nativeSessionId!, turnId: randomUUID(), controllerGeneration: 1, catalogDigest: "test", status: "accepted", projection: {}, acceptBy: new Date(Date.now() + 60_000), expiresAt: new Date(Date.now() + 600_000) }).returning();
    const comments = await db.insert(issueComments).values([owner, owner, other, portuguese].map((authorUserId, index) => ({ companyId: company.id, issueId: task.id, authorUserId, body: `Message ${index}` }))).returning();
    const heartbeat = heartbeatService(db);
    // The accepted assignment represents a live provider process; no process
    // or network is started by this fixture.
    runningProcesses.set(run.id, { child: {} as never, graceSec: 0, processGroupId: null });
    for (const comment of comments) {
      await heartbeat.wakeup(agent.id, { source: "assignment", triggerDetail: "system", reason: "issue_commented", payload: { issueId: task.id, commentId: comment.id }, requestedByActorType: "user", requestedByActorId: comment.authorUserId! });
    }
    const wakes = await db.select().from(agentWakeupRequests).where(and(eq(agentWakeupRequests.companyId, company.id), eq(agentWakeupRequests.status, "deferred_issue_execution")));
    const ownerWake = wakes.find(wake => wake.requestedByActorId === owner)!;
    expect(wakes).toHaveLength(3);
    expect(ownerWake.payload?._paperclipWakeContext).toMatchObject({ communicationLocale: "en", communicationLocaleByCommentId: {
      [comments[0].id]: { communicationLocale: "en", communicationLocaleSource: "user" },
      [comments[1].id]: { communicationLocale: "en", communicationLocaleSource: "user" },
    } });
    expect(wakes.find(wake => wake.requestedByActorId === other)?.payload?._paperclipWakeContext).toMatchObject({ communicationLocale: "en", communicationLocaleByCommentId: { [comments[2].id]: { communicationLocale: "en" } } });
    expect(wakes.find(wake => wake.requestedByActorId === portuguese)?.payload?._paperclipWakeContext).toMatchObject({ communicationLocale: "pt-BR", communicationLocaleByCommentId: { [comments[3].id]: { communicationLocale: "pt-BR" } } });
    expect((await db.select().from(dotMailboxItems).where(and(eq(dotMailboxItems.assignmentId, assignment.id), eq(dotMailboxItems.kind, "follow_up"))))).toHaveLength(3);
    expect((await db.select().from(issues).where(eq(issues.id, task.id)))[0]).toMatchObject({ executionRunId: run.id, responsibleUserId: owner });
    await db.update(userLocalePreferences).set({ locale: "pt-BR" }).where(eq(userLocalePreferences.userId, owner));
    runningProcesses.delete(run.id);
    await db.update(heartbeatRuns).set({ status: "succeeded", finishedAt: new Date() }).where(eq(heartbeatRuns.id, run.id));
    await db.update(issues).set({ status: "done" }).where(eq(issues.id, task.id));
    const release = createReleaseIssueExecution({ issueLock: createPostgresWakeQueueAdapter(db, {
      resolveResponsibleUserId: async () => owner, getRoutineEnv: async () => ({ routineId: null, env: null, responsibleUserId: null }), resolveSessionBeforeForWakeup: async () => null,
    }), recovery: { escalateStrandedAssignedIssue: async () => { throw new Error("unexpected escalation"); }, escalateStrandedRecoveryIssueInPlace: async () => { throw new Error("unexpected escalation"); } } });
    await release({ companyId: company.id, runId: run.id, now: new Date(), suppressImmediateRecovery: true });
    await release({ companyId: company.id, runId: run.id, now: new Date(), suppressImmediateRecovery: true });
    const [promotedReceipt] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, ownerWake.id));
    expect(promotedReceipt).toMatchObject({ status: "queued" });
    const [promoted] = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, promotedReceipt.runId!));
    expect(promoted).toMatchObject({ companyId: company.id, agentId: agent.id, contextSnapshot: { communicationLocale: "en", communicationLocaleByCommentId: {
      [comments[0].id]: { communicationLocale: "en" }, [comments[1].id]: { communicationLocale: "en" },
    } } });
    expect((await db.select().from(issues).where(eq(issues.id, task.id)))[0]).toMatchObject({ executionRunId: promoted.id, responsibleUserId: owner });
    const [remaining] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, wakes.find(wake => wake.requestedByActorId === portuguese)!.id));
    expect(remaining).toMatchObject({ status: "deferred_issue_execution", runId: null });
  }, 30_000);
});
