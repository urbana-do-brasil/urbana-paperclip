import { and, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  agents,
  companySkills,
  projects,
  routines,
} from "@paperclipai/db";
import type { PluginManagedResourceKind } from "@paperclipai/shared";
import { z } from "zod";

import { badRequest } from "../errors.js";
import { accessService } from "../services/index.js";
import { managedPluginAttributionsForResources } from "../services/plugin-managed-resource-attribution.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

const RESOURCE_KINDS = ["agent", "project", "routine", "skill"] as const;
const MAX_RESOURCE_IDS = 250;

function parseAttributionQuery(query: Record<string, unknown>) {
  const unsupported = Object.keys(query).filter((key) => key !== "resourceKind" && key !== "resourceId");
  if (unsupported.length > 0) {
    throw badRequest(`Unsupported query parameter${unsupported.length === 1 ? "" : "s"}: ${unsupported.sort().join(", ")}`);
  }

  if (typeof query.resourceKind !== "string" || !RESOURCE_KINDS.includes(query.resourceKind as PluginManagedResourceKind)) {
    throw badRequest("resourceKind must be agent, project, routine, or skill");
  }

  const rawIds = query.resourceId;
  const values = typeof rawIds === "string"
    ? [rawIds]
    : Array.isArray(rawIds) && rawIds.every((value) => typeof value === "string")
      ? rawIds as string[]
      : null;
  if (!values || values.length < 1 || values.length > MAX_RESOURCE_IDS) {
    throw badRequest(`Provide between 1 and ${MAX_RESOURCE_IDS} resourceId values`);
  }

  const parsedIds = z.array(z.string().uuid()).safeParse(values);
  if (!parsedIds.success) throw badRequest("Every resourceId must be a UUID");

  return {
    resourceKind: query.resourceKind as PluginManagedResourceKind,
    resourceIds: [...new Set(parsedIds.data)],
  };
}

/**
 * Read-only attribution metadata for already-visible company resources.
 * Kept separate from resource APIs so their established JSON contracts stay
 * unchanged. Only board callers with company access can use this presentation
 * helper, and every requested ID is checked against its ordinary read gate.
 */
export function managedResourceAttributionRoutes(db: Db) {
  const router = Router();
  const access = accessService(db);

  router.get("/companies/:companyId/managed-resource-attributions", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.setHeader("Cache-Control", "private, no-store");

    const { resourceKind, resourceIds } = parseAttributionQuery(req.query);
    let companyResourceIds: string[];

    switch (resourceKind) {
      case "agent": {
        const rows = await db.select({ id: agents.id }).from(agents).where(and(
          eq(agents.companyId, companyId),
          inArray(agents.id, resourceIds),
        ));
        const decisions = await Promise.all(rows.map((row) => access.decide({
          actor: req.actor,
          action: "agent:read",
          resource: { type: "agent", companyId, agentId: row.id },
        })));
        companyResourceIds = rows.filter((_, index) => decisions[index]?.allowed).map((row) => row.id);
        break;
      }
      case "project": {
        const rows = await db.select({ id: projects.id }).from(projects).where(and(
          eq(projects.companyId, companyId),
          inArray(projects.id, resourceIds),
        ));
        const decisions = await Promise.all(rows.map((row) => access.decide({
          actor: req.actor,
          action: "project:read",
          resource: { type: "project", companyId, projectId: row.id },
        })));
        companyResourceIds = rows.filter((_, index) => decisions[index]?.allowed).map((row) => row.id);
        break;
      }
      case "routine": {
        const rows = await db.select({ id: routines.id }).from(routines).where(and(
          eq(routines.companyId, companyId),
          inArray(routines.id, resourceIds),
        ));
        companyResourceIds = rows.map((row) => row.id);
        break;
      }
      case "skill": {
        const rows = await db.select({ id: companySkills.id }).from(companySkills).where(and(
          eq(companySkills.companyId, companyId),
          inArray(companySkills.id, resourceIds),
        ));
        companyResourceIds = rows.map((row) => row.id);
        break;
      }
    }

    const attributions = await managedPluginAttributionsForResources(db, {
      companyId,
      resourceKind,
      resourceIds: companyResourceIds,
    });
    res.json(companyResourceIds.flatMap((resourceId) => {
      const attribution = attributions.get(resourceId);
      return attribution ? [{ resourceId, ...attribution }] : [];
    }));
  });

  return router;
}
