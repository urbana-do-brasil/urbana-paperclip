import express from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  agents,
  companies,
  createDb,
  pluginManagedResources,
  plugins,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping managed resource attribution route tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("managed resource attribution route", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;
  let managedResourceAttributionRoutes: (typeof import("../routes/managed-resource-attributions.js"))["managedResourceAttributionRoutes"];
  let errorHandler: (typeof import("../middleware/error-handler.js"))["errorHandler"];

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-managed-resource-attributions-route-");
    db = createDb(tempDb.connectionString);
    [{ managedResourceAttributionRoutes }, { errorHandler }] = await Promise.all([
      import("../routes/managed-resource-attributions.js"),
      import("../middleware/error-handler.js"),
    ]);
  }, 20_000);

  afterEach(async () => {
    await db.delete(pluginManagedResources);
    await db.delete(agents);
    await db.delete(plugins);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function addCompany(name: string) {
    const id = randomUUID();
    await db.insert(companies).values({ id, name, issuePrefix: `R${id.replaceAll("-", "").slice(0, 7).toUpperCase()}` });
    return id;
  }

  async function addPlugin(pluginKey: string, displayName: string) {
    const id = randomUUID();
    await db.insert(plugins).values({
      id,
      pluginKey,
      packageName: `@test/${pluginKey.replaceAll(".", "-")}`,
      version: "0.1.0",
      manifestJson: {
        id: pluginKey,
        apiVersion: 1,
        version: "0.1.0",
        displayName,
        description: "Attribution route test plugin",
        author: "Paperclip",
        categories: ["automation"],
        capabilities: [],
        entrypoints: { worker: "./dist/worker.js" },
      },
      status: "ready",
    });
    return id;
  }

  function appFor(actor: Record<string, unknown>) {
    const app = express();
    app.use((req, _res, next) => {
      req.actor = actor as typeof req.actor;
      next();
    });
    app.use("/api", managedResourceAttributionRoutes(db));
    app.use(errorHandler);
    return app;
  }

  const localBoard = { type: "board", userId: "local-board", source: "local_implicit", isInstanceAdmin: false };

  it("returns only the requested company's attribution for a shared resource ID and omits unmanaged resources", async () => {
    const companyA = await addCompany("Company A");
    const companyB = await addCompany("Company B");
    const pluginA = await addPlugin("example.company-a", "Company A plugin");
    const pluginB = await addPlugin("example.company-b", "Company B plugin");
    const resourceId = randomUUID();
    const unmanagedAgentId = randomUUID();
    await db.insert(agents).values([
      { id: resourceId, companyId: companyA, name: "Managed A", role: "engineer", adapterType: "process" },
      { id: unmanagedAgentId, companyId: companyA, name: "Unmanaged", role: "engineer", adapterType: "process" },
    ]);
    await db.insert(pluginManagedResources).values([
      {
        companyId: companyA,
        pluginId: pluginA,
        pluginKey: "example.company-a",
        resourceKind: "agent",
        resourceKey: "maintainer",
        resourceId,
      },
      {
        companyId: companyB,
        pluginId: pluginB,
        pluginKey: "example.company-b",
        resourceKind: "agent",
        resourceKey: "maintainer",
        resourceId,
      },
    ]);

    const app = appFor(localBoard);
    const scoped = await request(app)
      .get(`/api/companies/${companyA}/managed-resource-attributions`)
      .query({ resourceKind: "agent", resourceId });
    expect(scoped.status).toBe(200);
    expect(scoped.body).toEqual([{
      resourceId,
      pluginId: pluginA,
      pluginKey: "example.company-a",
      pluginDisplayName: "Company A plugin",
      resourceKind: "agent",
      resourceKey: "maintainer",
    }]);

    const unmanaged = await request(app)
      .get(`/api/companies/${companyA}/managed-resource-attributions`)
      .query({ resourceKind: "agent", resourceId: unmanagedAgentId });
    expect(unmanaged.status).toBe(200);
    expect(unmanaged.body).toEqual([]);
  });

  it("keeps the endpoint behind board and company access checks and validates bounded UUID inputs", async () => {
    const companyA = await addCompany("Company A");
    const companyB = await addCompany("Company B");
    const agentActor = { type: "agent", agentId: randomUUID(), companyId: companyA, source: "agent_key" };
    const companyBBoard = { type: "board", userId: "user-b", source: "session", isInstanceAdmin: false, companyIds: [companyB] };

    const agentResponse = await request(appFor(agentActor))
      .get(`/api/companies/${companyA}/managed-resource-attributions`)
      .query({ resourceKind: "agent", resourceId: randomUUID() });
    expect(agentResponse.status).toBe(403);

    const foreignCompanyResponse = await request(appFor(companyBBoard))
      .get(`/api/companies/${companyA}/managed-resource-attributions`)
      .query({ resourceKind: "agent", resourceId: randomUUID() });
    expect(foreignCompanyResponse.status).toBe(403);

    const malformedIdResponse = await request(appFor(localBoard))
      .get(`/api/companies/${companyA}/managed-resource-attributions`)
      .query({ resourceKind: "agent", resourceId: "not-a-uuid" });
    expect(malformedIdResponse.status).toBe(400);
  });
});
