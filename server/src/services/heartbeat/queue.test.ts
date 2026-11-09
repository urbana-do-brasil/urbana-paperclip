import type { Db } from "@paperclipai/db";
import { agents, agentWakeupRequests, authUsers, companies, createDb, EMBEDDED_POSTGRES_TEST_TIMEOUT_MS, heartbeatRuns, issues, issueThreadInteractions, userLocalePreferences } from "@paperclipai/db";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getEmbeddedPostgresTestSupport, startEmbeddedPostgresTestDatabase } from "../../__tests__/helpers/embedded-postgres.js";
import { createRunDispatch } from "../../modules/run-dispatch/index.js";
import type { createWakeQueue } from "../../modules/wake-queue/index.js";
import { createHeartbeatRunState } from "./run-state.js";
import { createHeartbeatRunPreparation } from "./run-preparation.js";
import { createHeartbeatQueue, type HeartbeatQueueDependencies } from "./queue.js";
import express from "express";
import request from "supertest";
import { captureLocalCommunicationLocale } from "../../middleware/communication-locale.js";
import { queueIssueAssignmentWakeup } from "../issue-assignment-wakeup.js";
import { issueThreadInteractionService } from "../issue-thread-interactions.js";

type Run = typeof heartbeatRuns.$inferSelect;
function callbacks(db: Db) {
  const state = createHeartbeatRunState(db);
  const preparation = createHeartbeatRunPreparation(db);
  return {
    ...preparation,
    ...state,
    getAgent: vi.fn<HeartbeatQueueDependencies["getAgent"]>(async () => { throw new Error("Unexpected agent lookup"); }),
    options: {},
    setRunStatus: vi.fn<HeartbeatQueueDependencies["setRunStatus"]>(async (id, status, patch) =>
      db.update(heartbeatRuns).set({ ...patch, status }).where(eq(heartbeatRuns.id, id)).returning().then(rows => rows[0] ?? null)),
    setWakeupStatus: vi.fn<HeartbeatQueueDependencies["setWakeupStatus"]>(async () => undefined),
    appendRunEvent: vi.fn<HeartbeatQueueDependencies["appendRunEvent"]>(async () => undefined),
    finalizeAgentStatus: vi.fn(async () => undefined),
    getAgentInvokability: vi.fn<HeartbeatQueueDependencies["getAgentInvokability"]>(async () => ({ invokable: true })),
    getWorktreeExecutionCutoff: vi.fn(async () => null),
    applyRunDispatchPostCommitEffects: vi.fn(),
    issuesSvc: {
      getDependencyReadiness: vi.fn<HeartbeatQueueDependencies["issuesSvc"]["getDependencyReadiness"]>(),
      listDependencyReadiness: vi.fn(async () => new Map()),
    },
    treeControlSvc: { getActivePauseHoldGate: vi.fn(async () => null) },
    budgets: { getInvocationBlock: vi.fn(async () => null) },
    instanceSettings: { getExperimental: vi.fn<HeartbeatQueueDependencies["instanceSettings"]["getExperimental"]>() },
    runDispatch: createRunDispatch(db),
    wakeQueue: {
      createAdmissionTransactionScope: vi.fn<ReturnType<typeof createWakeQueue>["createAdmissionTransactionScope"]>(),
      admitWakeBehindIssueExecution: vi.fn<ReturnType<typeof createWakeQueue>["admitWakeBehindIssueExecution"]>(),
    },
    activeRunExecutions: new Set<string>(),
    activeRunExecutionPromises: new Set<Promise<void>>(),
    activeWakeupPromises: new Set<Promise<unknown>>(),
    liveRunExecutions: { has: vi.fn(() => false) },
    isHeartbeatRunTerminalStatus: (status: string | null | undefined) => ["succeeded", "failed", "cancelled", "timed_out"].includes(status ?? ""),
    isSameTaskScope: (left: string | null, right: string | null) => left === right,
    runTaskKey: (run: Run) => typeof run.contextSnapshot?.issueId === "string" ? run.contextSnapshot.issueId : null,
    filterZombieCoalesceTarget: <T extends { id: string; status: string }>(run: T | null) => run,
    getSchedulingSuppression: vi.fn(async () => ({ suppressed: false, reason: null } as Awaited<ReturnType<HeartbeatQueueDependencies["getSchedulingSuppression"]>>)),
    executeRun: vi.fn(async () => undefined),
    applyWakeQueuePostCommitEffects: vi.fn(async () => undefined),
    releaseIssueExecutionAndPromote: vi.fn(async () => undefined),
    publishRunLifecyclePluginEvent: vi.fn(),
    cancelRunInternal: vi.fn(async () => undefined),
    cancelActiveForAgentInternal: vi.fn(async () => undefined),
    resumeExecutionWaitComments: vi.fn(async () => undefined),
    resumeQueuedCommentInterrupt: vi.fn(async () => undefined),
    resumeSavedLegacyComments: vi.fn(async () => undefined),
    formatIssueIdentifierLink: (_identifier: string | null, fallback: string) => fallback,
    sweepPendingCleanupLeases: vi.fn<HeartbeatQueueDependencies["sweepPendingCleanupLeases"]>(),
  } satisfies HeartbeatQueueDependencies;
}
function guardedDatabase() {
  const access = vi.fn(() => { throw new Error("Unexpected queue database access"); });
  return { db: new Proxy({}, { get: access }) as Db, access };
}

describe("heartbeat queue module boundary", () => {
  it("constructs without querying, dispatching, or registering background work", () => {
    const database = guardedDatabase();
    const deps = callbacks(database.db);
    createHeartbeatQueue(database.db, deps);
    expect(database.access).not.toHaveBeenCalled();
    for (const callback of Object.values(deps)) if (vi.isMockFunction(callback)) expect(callback).not.toHaveBeenCalled();
    expect(deps.activeRunExecutionPromises.size).toBe(0);
    expect(deps.activeWakeupPromises.size).toBe(0);
  });

  it.each(["startNextQueuedRunForAgent", "resumeQueuedRuns"] as const)("honors suppression before %s reads or resumes work", async (operation) => {
    const database = guardedDatabase();
    const deps = callbacks(database.db);
    deps.getSchedulingSuppression.mockResolvedValue({ suppressed: true, reason: "task_drain" });
    const queue = createHeartbeatQueue(database.db, deps);
    await queue[operation]("agent");
    expect(database.access).not.toHaveBeenCalled();
    expect(deps.getAgent).not.toHaveBeenCalled();
    expect(deps.resumeExecutionWaitComments).not.toHaveBeenCalled();
    expect(deps.executeRun).not.toHaveBeenCalled();
  });

  it("tracks pending wakes across instances and clears each rejected wake", async () => {
    const database = guardedDatabase();
    const deps = callbacks(database.db);
    let rejectFirst!: (reason: Error) => void;
    let rejectSecond!: (reason: Error) => void;
    deps.getAgent.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject; }));
    deps.getAgent.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSecond = reject; }));
    const first = createHeartbeatQueue(database.db, deps).trackWakeup("first");
    const second = createHeartbeatQueue(database.db, deps).trackWakeup("second");
    const firstCheck = expect(first).rejects.toThrow("first lookup failed");
    const secondCheck = expect(second).rejects.toThrow("second lookup failed");
    expect(deps.activeWakeupPromises).toEqual(new Set([first, second]));
    rejectFirst(new Error("first lookup failed"));
    await firstCheck;
    await Promise.resolve();
    expect(deps.activeWakeupPromises).toEqual(new Set([second]));
    rejectSecond(new Error("second lookup failed"));
    await secondCheck;
    await Promise.resolve();
    expect(deps.activeWakeupPromises.size).toBe(0);
    expect(deps.activeRunExecutionPromises.size).toBe(0);
    expect(database.access).not.toHaveBeenCalled();
  });

  it("uses the same policy limits for dispatch and execution", () => {
    const database = guardedDatabase();
    const queue = createHeartbeatQueue(database.db, callbacks(database.db));
    const agent = { adapterType: "paperclip_runner", adapterConfig: { provider: "openai_dot" }, runtimeConfig: { heartbeat: { maxConcurrentRuns: 20, maxDailyRuns: 3.8 } } } as unknown as typeof agents.$inferSelect;
    expect(queue.parseHeartbeatPolicy(agent)).toMatchObject({ maxConcurrentRuns: 1, maxDailyRuns: 3 });
    expect(queue.parseHeartbeatPolicy({ ...agent, adapterConfig: { provider: "codex" } })).toMatchObject({ maxConcurrentRuns: 20, maxDailyRuns: 3 });
    expect(database.access).not.toHaveBeenCalled();
  });
});

const support = await getEmbeddedPostgresTestSupport();
if (!support.supported) console.warn(`Skipping queue module database tests: ${support.reason}`);
describe.skipIf(!support.supported)("heartbeat queue database wiring", () => {
  let database: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>>;
  let db: Db;
  beforeAll(async () => {
    database = await startEmbeddedPostgresTestDatabase("paperclip-heartbeat-queue-module");
    db = createDb(database.connectionString);
  }, EMBEDDED_POSTGRES_TEST_TIMEOUT_MS);
  afterAll(async () => {
    await db?.$client.end();
    await database?.cleanup();
  });
  beforeEach(async () => {
    await db.execute(sql`truncate table companies restart identity cascade`);
  });

  async function fixture(status = "running") {
    const [company] = await db.insert(companies).values({ name: "Queue module", issuePrefix: "QM" }).returning();
    const [agent] = await db.insert(agents).values({ companyId: company.id, name: "Queue agent", role: "engineer", status: "idle", adapterType: "process", adapterConfig: {} }).returning();
    const [issue] = await db.insert(issues).values({ companyId: company.id, title: "Queue task", status: "todo", assigneeAgentId: agent.id }).returning();
    const [wake] = await db.insert(agentWakeupRequests).values({ companyId: company.id, agentId: agent.id, source: "assignment", status: "claimed", claimedAt: new Date() }).returning();
    const [run] = await db.insert(heartbeatRuns).values({ companyId: company.id, agentId: agent.id, status, invocationSource: "assignment", wakeupRequestId: wake.id, startedAt: status === "running" ? new Date() : null, contextSnapshot: { issueId: issue.id } }).returning();
    await db.update(issues).set({ executionRunId: run.id, executionAgentNameKey: agent.name, executionLockedAt: new Date() }).where(eq(issues.id, issue.id));
    return { company, agent, issue, wake, run };
  }

  it.each(["claimed", "cancelled"] as const)("releases a running claim while preserving a %s wake", async (wakeStatus) => {
    const { run, issue, wake } = await fixture();
    await db.update(agentWakeupRequests).set({ status: wakeStatus }).where(eq(agentWakeupRequests.id, wake.id));
    await createHeartbeatQueue(db, callbacks(db)).releaseRunClaimedJustBeforeSuppression(run.id);
    const [released] = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, run.id));
    const [releasedIssue] = await db.select().from(issues).where(eq(issues.id, issue.id));
    const [releasedWake] = await db.select().from(agentWakeupRequests).where(eq(agentWakeupRequests.id, wake.id));
    expect(released).toMatchObject({ status: "queued", startedAt: null, responsibleUserId: null });
    expect(releasedIssue).toMatchObject({ executionRunId: null, executionAgentNameKey: null, executionLockedAt: null });
    expect(releasedWake.status).toBe(wakeStatus === "cancelled" ? "cancelled" : "queued");
    if (wakeStatus === "claimed") expect(releasedWake.claimedAt).toBeNull();
  });

  it("preserves a newer execution owner when releasing an old claim", async () => {
    const { run, issue, agent, company } = await fixture();
    const [newOwner] = await db.insert(heartbeatRuns).values({ companyId: company.id, agentId: agent.id, status: "running", invocationSource: "assignment" }).returning();
    await db.update(issues).set({ executionRunId: newOwner.id }).where(eq(issues.id, issue.id));
    await createHeartbeatQueue(db, callbacks(db)).releaseRunClaimedJustBeforeSuppression(run.id);
    const [current] = await db.select().from(issues).where(eq(issues.id, issue.id));
    expect(current.executionRunId).toBe(newOwner.id);
  });

  it("persists distinct requester languages without coalescing or changing execution ownership", async () => {
    const { agent, company } = await fixture();
    // Remove the fixture's unrelated active execution; task drain prevents the
    // two queued runs below from dispatching or invoking any provider.
    await db.delete(issues).where(eq(issues.companyId, company.id));
    await db.delete(heartbeatRuns).where(eq(heartbeatRuns.companyId, company.id));
    const now = new Date();
    await db.insert(authUsers).values(["queue-locale-pt", "queue-locale-en"].map((id) => ({ id, name: id, email: `${id}@example.test`, createdAt: now, updatedAt: now }))).onConflictDoNothing();
    await db.insert(userLocalePreferences).values([{ userId: "queue-locale-pt", locale: "pt-BR" }, { userId: "queue-locale-en", locale: "en" }]).onConflictDoUpdate({ target: userLocalePreferences.userId, set: { locale: sql`excluded.locale` } });
    const deps = callbacks(db);
    deps.getAgent.mockResolvedValue(agent);
    deps.getSchedulingSuppression.mockResolvedValue({ suppressed: true, reason: "task_drain" } as Awaited<ReturnType<HeartbeatQueueDependencies["getSchedulingSuppression"]>>);
    const queue = createHeartbeatQueue(db, deps);
    const pt = await queue.enqueueWakeup(agent.id, { source: "on_demand", requestedByActorType: "user", requestedByActorId: "queue-locale-pt" });
    const en = await queue.enqueueWakeup(agent.id, { source: "on_demand", requestedByActorType: "user", requestedByActorId: "queue-locale-en" });
    expect(pt?.id).toBeTruthy(); expect(en?.id).toBeTruthy(); expect(pt?.id).not.toBe(en?.id);
    expect(pt?.contextSnapshot).toMatchObject({ communicationLocale: "pt-BR", communicationLocaleSource: "user" });
    expect(en?.contextSnapshot).toMatchObject({ communicationLocale: "en", communicationLocaleSource: "user" });
    const rows = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.companyId, company.id));
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.agentId === agent.id && row.companyId === company.id && row.status === "queued")).toBe(true);
    expect(deps.executeRun).not.toHaveBeenCalled();
  });

  it("persists the local board browser language through the HTTP request context", async () => {
    const { agent, company } = await fixture();
    await db.delete(issues).where(eq(issues.companyId, company.id));
    await db.delete(heartbeatRuns).where(eq(heartbeatRuns.companyId, company.id));
    const deps = callbacks(db);
    deps.getAgent.mockResolvedValue(agent);
    deps.getSchedulingSuppression.mockResolvedValue({ suppressed: true, reason: "task_drain" } as Awaited<ReturnType<HeartbeatQueueDependencies["getSchedulingSuppression"]>>);
    const queue = createHeartbeatQueue(db, deps);
    const app = express();
    app.use((req, _res, next) => { req.actor = { type: "board", source: "local_implicit", userId: "local-board", isInstanceAdmin: true }; next(); });
    app.use(captureLocalCommunicationLocale);
    app.post("/wake", async (_req, res, next) => {
      try {
        const run = await queue.enqueueWakeup(agent.id, { source: "on_demand", requestedByActorType: "user", requestedByActorId: "local-board" });
        res.json(run);
      } catch (error) { next(error); }
    });
    const response = await request(app).post("/wake").set("X-Paperclip-Communication-Locale", "en");
    expect(response.status).toBe(200);
    expect(response.body.contextSnapshot).toMatchObject({ communicationLocale: "en", communicationLocaleSource: "user" });
    const [stored] = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, response.body.id));
    expect(stored.contextSnapshot).toMatchObject({ communicationLocale: "en", communicationLocaleSource: "user" });
    expect(stored.companyId).toBe(company.id); expect(stored.agentId).toBe(agent.id);
  });

  it("inherits a delegated run language without changing the target agent or company", async () => {
    const { run, agent, company } = await fixture("succeeded");
    await db.delete(issues).where(eq(issues.companyId, company.id));
    await db.update(heartbeatRuns).set({ contextSnapshot: { communicationLocale: "en", communicationLocaleSource: "user" } }).where(eq(heartbeatRuns.id, run.id));
    const [child] = await db.insert(agents).values({ companyId: company.id, name: "Delegated agent", role: "engineer", status: "idle", adapterType: "process", adapterConfig: {} }).returning();
    const deps = callbacks(db);
    deps.getAgent.mockResolvedValue(child);
    deps.getSchedulingSuppression.mockResolvedValue({ suppressed: true, reason: "task_drain" });
    const delegated = await createHeartbeatQueue(db, deps).enqueueWakeup(child.id, {
      source: "on_demand", requestedByActorType: "agent", requestedByActorId: agent.id,
      communicationOriginRunId: run.id, contextSnapshot: { responsibleUserId: "delegation-owner" },
    });
    expect(delegated).toMatchObject({ companyId: company.id, agentId: child.id, responsibleUserId: "delegation-owner",
      contextSnapshot: { communicationLocale: "en", communicationLocaleSource: "origin" } });
    expect(deps.executeRun).not.toHaveBeenCalled();
  });

  it("uses the assigning run instead of the task's old origin, and falls back to the old origin when no run is supplied", async () => {
    const { run: historical, agent, company, issue } = await fixture("succeeded");
    await db.update(heartbeatRuns).set({ contextSnapshot: { communicationLocale: "pt-BR", communicationLocaleSource: "user" } }).where(eq(heartbeatRuns.id, historical.id));
    const [current] = await db.insert(heartbeatRuns).values({ companyId: company.id, agentId: agent.id, status: "succeeded", contextSnapshot: { communicationLocale: "en", communicationLocaleSource: "user" } }).returning();
    await db.update(issues).set({ originRunId: historical.id, executionRunId: null, executionAgentNameKey: null, executionLockedAt: null, responsibleUserId: "task-owner" }).where(eq(issues.id, issue.id));
    const deps = callbacks(db);
    deps.getAgent.mockResolvedValue(agent);
    deps.instanceSettings.getExperimental.mockResolvedValue({ enableIsolatedWorkspaces: false } as Awaited<ReturnType<HeartbeatQueueDependencies["instanceSettings"]["getExperimental"]>>);
    deps.getSchedulingSuppression.mockResolvedValue({ suppressed: true, reason: "task_drain" });
    const queue = createHeartbeatQueue(db, deps);
    const assignment = { heartbeat: { wakeup: queue.enqueueWakeup }, issue, reason: "issue_assigned", mutation: "create", contextSource: "issue.create", requestedByActorType: "agent" as const, requestedByActorId: agent.id };
    const delegated = await queueIssueAssignmentWakeup({ ...assignment, communicationOriginRunId: current.id }) as Run;
    expect(delegated).toMatchObject({ companyId: company.id, agentId: agent.id, responsibleUserId: "task-owner", contextSnapshot: { communicationLocale: "en", communicationLocaleSource: "origin" } });
    // A separate task permits independent admission while the first is queued.
    const [fallbackIssue] = await db.insert(issues).values({ companyId: company.id, title: "Fallback task", status: "todo", assigneeAgentId: agent.id, responsibleUserId: "task-owner", originRunId: historical.id }).returning();
    const fallback = await queueIssueAssignmentWakeup({ ...assignment, issue: fallbackIssue }) as Run;
    expect(fallback).toMatchObject({ companyId: company.id, agentId: agent.id, responsibleUserId: "task-owner", contextSnapshot: { communicationLocale: "pt-BR", communicationLocaleSource: "origin" } });
    expect(deps.executeRun).not.toHaveBeenCalled();
  });

  it("uses the persisted interaction source for a merged-PR continuation instead of the task's historical origin", async () => {
    const { run: historical, agent, company, issue } = await fixture("succeeded");
    await db.update(heartbeatRuns).set({ contextSnapshot: { communicationLocale: "pt-BR", communicationLocaleSource: "user" } }).where(eq(heartbeatRuns.id, historical.id));
    const [source] = await db.insert(heartbeatRuns).values({ companyId: company.id, agentId: agent.id, status: "succeeded", contextSnapshot: { communicationLocale: "en", communicationLocaleSource: "user" } }).returning();
    await db.update(issues).set({ status: "in_review", originRunId: historical.id, executionRunId: null, executionAgentNameKey: null, executionLockedAt: null, responsibleUserId: "task-owner" }).where(eq(issues.id, issue.id));
    await db.insert(issueThreadInteractions).values({ companyId: company.id, issueId: issue.id, sourceRunId: source.id,
      kind: "request_confirmation", status: "pending", continuationPolicy: "wake_assignee_on_accept", requestedResolverPolicy: "human_only", effectiveResolverPolicy: "human_only",
      title: "Merge paperclipai/paperclip#39?", payload: { version: 1, prompt: "Merge the PR?" } });
    const deps = callbacks(db);
    deps.getAgent.mockResolvedValue(agent);
    deps.instanceSettings.getExperimental.mockResolvedValue({ enableIsolatedWorkspaces: false } as Awaited<ReturnType<HeartbeatQueueDependencies["instanceSettings"]["getExperimental"]>>);
    deps.getSchedulingSuppression.mockResolvedValue({ suppressed: true, reason: "task_drain" });
    const queue = createHeartbeatQueue(db, deps);
    const service = issueThreadInteractionService(db, { wakeup: queue.enqueueWakeup, resolvePullRequestState: async () => "merged" });
    expect(await service.sweepMergedPullRequestConfirmations([{ companyId: company.id, owner: "paperclipai", repo: "paperclip", number: 39 }])).toMatchObject({ accepted: 1, woken: 1 });
    const successors = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.companyId, company.id));
    const successor = successors.find(row => row.id !== historical.id && row.id !== source.id);
    expect(successor).toMatchObject({ companyId: company.id, agentId: agent.id, responsibleUserId: "task-owner", contextSnapshot: { communicationLocale: "en", communicationLocaleSource: "origin" } });
    expect(deps.executeRun).not.toHaveBeenCalled();
  });

  it("cancels at the daily run cap before claiming or dispatching", async () => {
    const { run, agent } = await fixture("queued");
    const cappedAgent = { ...agent, runtimeConfig: { heartbeat: { maxDailyRuns: 0 } } };
    const deps = callbacks(db);
    deps.getAgent.mockResolvedValue(cappedAgent);
    expect(await createHeartbeatQueue(db, deps).claimQueuedRun(run)).toBeNull();
    const [cancelled] = await db.select().from(heartbeatRuns).where(eq(heartbeatRuns.id, run.id));
    expect(cancelled).toMatchObject({ status: "cancelled", errorCode: "heartbeat.daily_run_limit" });
    expect(deps.setWakeupStatus).toHaveBeenCalledWith(run.wakeupRequestId, "skipped", expect.any(Object));
    expect(deps.releaseIssueExecutionAndPromote).toHaveBeenCalledWith(cancelled, { suppressImmediateRecovery: true });
    expect(deps.treeControlSvc.getActivePauseHoldGate).not.toHaveBeenCalled();
    expect(deps.executeRun).not.toHaveBeenCalled();
  });
});
