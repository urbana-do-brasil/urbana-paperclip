/** Disposable browser fixture: real auth, preference API, migrations and DB.
 * Unrelated product APIs return explicit empty fixture data. Never use this
 * server as an application entrypoint or attach it to an existing database. */
import express from "express";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";
import { companies, companyMemberships, createDb, startEmbeddedPostgresTestDatabase } from "@paperclipai/db";
import { authRoutes } from "../../routes/auth.js";
import { actorMiddleware } from "../../middleware/auth.js";
import { errorHandler } from "../../middleware/error-handler.js";
import { createBetterAuthHandler, createBetterAuthInstance, resolveBetterAuthSession } from "../../auth/better-auth.js";
import type { Config } from "../../config.js";

const home = fs.mkdtempSync(path.join(os.tmpdir(), "paperclip-locale-browser-home-"));
process.env.PAPERCLIP_HOME = home;
process.env.BETTER_AUTH_SECRET = "locale-browser-fixture-secret-not-a-real-credential";
process.env.PAPERCLIP_AUTH_RATE_LIMIT_ENABLED = "false";
const port = Number(process.env.PAPERCLIP_LOCALE_BROWSER_PORT ?? 3197);
const origin = `http://127.0.0.1:${port}`;
const database = await startEmbeddedPostgresTestDatabase("paperclip-locale-browser-db-");
const db = createDb(database.connectionString);
const auth = createBetterAuthInstance(db, {
  deploymentMode: "authenticated", deploymentExposure: "private", authBaseUrlMode: "explicit",
  authPublicBaseUrl: origin, authDisableSignUp: false, allowedHostnames: ["127.0.0.1"], port,
} as Config, [origin]);
const app = express();
app.use(actorMiddleware(db, { deploymentMode: "authenticated", resolveSession: (req) => resolveBetterAuthSession(auth, req) }));
app.use("/api/auth/locale-preference", express.json());
app.use("/api/auth/profile", express.json());
app.use("/api/auth", authRoutes(db));
app.all("/api/auth/{*authPath}", createBetterAuthHandler(auth));
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ status: "ok", deploymentMode: "authenticated", deploymentExposure: "private", authReady: true, bootstrapStatus: "ready", hiddenSettings: [] }));
app.post("/__fixture/organizations", async (req, res) => {
  if (!req.actor.userId) { res.sendStatus(401); return; }
  const rows = await db.insert(companies).values([
    { name: "Locale Fixture One", issuePrefix: "LFO" }, { name: "Locale Fixture Two", issuePrefix: "LFT" },
  ]).returning();
  await db.insert(companyMemberships).values(rows.map((company) => ({ companyId: company.id, principalType: "user", principalId: req.actor.userId!, membershipRole: "owner", status: "active" })));
  res.json(rows);
});
app.get("/api/companies", async (req, res) => {
  if (!req.actor.userId) { res.sendStatus(401); return; }
  const rows = await db.select({ company: companies }).from(companies).innerJoin(companyMemberships, and(eq(companyMemberships.companyId, companies.id), eq(companyMemberships.principalId, req.actor.userId)));
  res.json(rows.map((row) => row.company));
});
app.get("/api/instance/settings/experimental", (_req, res) => res.json({ enableStreamlinedUi: true }));
app.get("/api/cli-auth/me", async (req, res) => {
  const rows = req.actor.userId ? await db.select({ companyId: companyMemberships.companyId }).from(companyMemberships).where(eq(companyMemberships.principalId, req.actor.userId)) : [];
  res.json({ userId: req.actor.userId, isInstanceAdmin: false, companyIds: rows.map((row) => row.companyId) });
});
app.get(/\/api\/.*sidebar-preferences\/me$/, (_req, res) => res.json({ orderedIds: [] }));
app.get(/\/api\/companies\/[^/]+\/users\/me\/inbox-agent-policy$/, (req, res) => res.json({ userId: req.actor.userId, mode: "open", allowedAgentIds: [] }));
app.get(/\/api\/companies\/[^/]+\/primary-agent\/me$/, (_req, res) => res.json({ primaryAgentId: null, initialized: true }));
app.get(/\/api\/companies\/[^/]+\/tools\/action-requests$/, (_req, res) => res.json({ actionRequests: [] }));
app.get(/\/api\/companies\/[^/]+\/dashboard$/, (_req, res) => res.json({ agents: { active: 0, running: 0, paused: 0, error: 0 }, tasks: { open: 0, inProgress: 0, done: 0, blocked: 0 }, approvals: { pending: 0 }, costs: { monthCents: 0, budgetCents: 0 } }));
app.get(/\/api\/companies\/[^/]+\/resource-memberships\/me$/, (_req, res) => res.json({ projectMemberships: {}, agentMemberships: {}, starredProjectIds: [], starredAgentIds: [], starredDocumentIds: [], projectStarredAt: {}, agentStarredAt: {}, documentStarredAt: {}, updatedAt: null }));
app.get(/\/api\/companies\/[^/]+$/, async (req, res) => {
  const id = req.path.split("/").at(-1)!;
  const [company] = await db.select().from(companies).where(eq(companies.id, id));
  res.json(company ?? null);
});
app.get("/api/{*fixturePath}", (_req, res) => res.json([]));
app.use(errorHandler);
const dist = fileURLToPath(new URL("../../../../ui/dist/", import.meta.url));
app.use(express.static(dist));
app.get("/{*page}", (_req, res) => res.sendFile(path.join(dist, "index.html")));
const server = app.listen(port, "127.0.0.1", () => process.stdout.write(`Locale browser fixture ready on ${origin}\n`));
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  server.closeAllConnections(); server.close();
  await database.cleanup(); fs.rmSync(home, { recursive: true, force: true }); process.exit(0);
}
process.on("SIGTERM", () => { void stop(); });
process.on("SIGINT", () => { void stop(); });
