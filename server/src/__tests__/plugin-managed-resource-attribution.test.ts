import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  companies,
  createDb,
  pluginManagedResources,
  plugins,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { managedPluginAttributionsForResources } from "../services/plugin-managed-resource-attribution.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping managed resource attribution tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("managed resource attribution", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-managed-resource-attribution-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(pluginManagedResources);
    await db.delete(plugins);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function addCompany(name: string) {
    const id = randomUUID();
    await db.insert(companies).values({ id, name, issuePrefix: `T${id.replace(/-/g, "").slice(0, 6).toUpperCase()}` });
    return id;
  }

  async function addPlugin(pluginKey: string, displayName: string) {
    const id = randomUUID();
    const manifestJson = {
      id: pluginKey,
      apiVersion: 1,
      version: "0.1.0",
      displayName,
      description: "Attribution test plugin",
      author: "Paperclip",
      categories: ["automation" as const],
      capabilities: [],
      entrypoints: { worker: "./dist/worker.js" },
    };
    await db.insert(plugins).values({
      id,
      pluginKey,
      packageName: `@test/${pluginKey.replaceAll(".", "-")}`,
      version: "0.1.0",
      manifestJson,
      status: "ready",
    });
    return id;
  }

  it("limits resource ID lookup to the requested company and preserves one exact external owner", async () => {
    const [companyA, companyB] = await Promise.all([addCompany("A"), addCompany("B")]);
    const [companyAPluginId, companyBPluginId] = await Promise.all([
      addPlugin("example.external-a", "External A"),
      addPlugin("example.external-b", "External B"),
    ]);
    const sharedResourceId = randomUUID();
    const unownedResourceId = randomUUID();

    await db.insert(pluginManagedResources).values({
      companyId: companyA,
      pluginId: companyAPluginId,
      pluginKey: "example.external-a",
      resourceKind: "agent",
      resourceKey: "maintainer",
      resourceId: sharedResourceId,
    });
    await db.insert(pluginManagedResources).values({
      companyId: companyB,
      pluginId: companyBPluginId,
      pluginKey: "example.external-b",
      resourceKind: "agent",
      resourceKey: "maintainer",
      resourceId: sharedResourceId,
    });

    const foreignCompanyLookup = await managedPluginAttributionsForResources(db, {
      companyId: companyB,
      resourceKind: "agent",
      resourceIds: [sharedResourceId, unownedResourceId],
    });
    expect(foreignCompanyLookup.get(sharedResourceId)).toEqual({
      pluginId: companyBPluginId,
      pluginKey: "example.external-b",
      pluginDisplayName: "External B",
      resourceKind: "agent",
      resourceKey: "maintainer",
    });
    expect(foreignCompanyLookup.get(unownedResourceId)).toBeNull();

    const ownCompanyLookup = await managedPluginAttributionsForResources(db, {
      companyId: companyA,
      resourceKind: "agent",
      resourceIds: [sharedResourceId, unownedResourceId],
    });
    expect(ownCompanyLookup.get(sharedResourceId)).toEqual({
      pluginId: companyAPluginId,
      pluginKey: "example.external-a",
      pluginDisplayName: "External A",
      resourceKind: "agent",
      resourceKey: "maintainer",
    });
    expect(ownCompanyLookup.get(unownedResourceId)).toBeNull();
  });

  it("fails closed when multiple plugin bindings point at the same company resource ID", async () => {
    const companyId = await addCompany("Ambiguous");
    const firstPluginId = await addPlugin("example.first", "First Plugin");
    const secondPluginId = await addPlugin("example.second", "Second Plugin");
    const resourceId = randomUUID();
    await db.insert(pluginManagedResources).values([
      {
        companyId,
        pluginId: firstPluginId,
        pluginKey: "example.first",
        resourceKind: "skill",
        resourceKey: "first-skill",
        resourceId,
      },
      {
        companyId,
        pluginId: secondPluginId,
        pluginKey: "example.second",
        resourceKind: "skill",
        resourceKey: "second-skill",
        resourceId,
      },
    ]);

    const result = await managedPluginAttributionsForResources(db, {
      companyId,
      resourceKind: "skill",
      resourceIds: [resourceId],
    });
    expect(result.get(resourceId)).toBeNull();
  });

  it("rejects a stale resource plugin key instead of attributing it to another installed plugin", async () => {
    const companyId = await addCompany("Stale key");
    const pluginId = await addPlugin("example.installed", "Installed Plugin");
    const resourceId = randomUUID();
    await db.insert(pluginManagedResources).values({
      companyId,
      pluginId,
      pluginKey: "example.former",
      resourceKind: "project",
      resourceKey: "knowledge",
      resourceId,
    });

    const result = await managedPluginAttributionsForResources(db, {
      companyId,
      resourceKind: "project",
      resourceIds: [resourceId],
    });
    expect(result.get(resourceId)).toBeNull();
  });
});
