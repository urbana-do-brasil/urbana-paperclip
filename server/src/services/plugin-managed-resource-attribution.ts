import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { pluginManagedResources, plugins } from "@paperclipai/db";
import type { ManagedResourcePluginAttribution, PluginManagedResourceKind } from "@paperclipai/shared";

/**
 * Resolve only company-scoped ownership rows for the already-selected host
 * resources. Multiple bindings or stale plugin keys fail closed so UI
 * presentation never attributes an ambiguous resource to one plugin.
 */
export async function managedPluginAttributionsForResources(
  db: Db,
  input: {
    companyId: string;
    resourceKind: PluginManagedResourceKind;
    resourceIds: readonly string[];
  },
): Promise<Map<string, ManagedResourcePluginAttribution | null>> {
  const resourceIds = [...new Set(input.resourceIds.filter(Boolean))];
  if (resourceIds.length === 0) return new Map();

  const rows = await db
    .select({
      resourceId: pluginManagedResources.resourceId,
      bindingPluginKey: pluginManagedResources.pluginKey,
      pluginId: pluginManagedResources.pluginId,
      pluginKey: plugins.pluginKey,
      manifestJson: plugins.manifestJson,
      resourceKind: pluginManagedResources.resourceKind,
      resourceKey: pluginManagedResources.resourceKey,
    })
    .from(pluginManagedResources)
    .innerJoin(plugins, eq(pluginManagedResources.pluginId, plugins.id))
    .where(and(
      eq(pluginManagedResources.companyId, input.companyId),
      eq(pluginManagedResources.resourceKind, input.resourceKind),
      inArray(pluginManagedResources.resourceId, resourceIds),
    ));

  const rowsByResourceId = new Map<string, typeof rows>();
  for (const row of rows) {
    const group = rowsByResourceId.get(row.resourceId) ?? [];
    group.push(row);
    rowsByResourceId.set(row.resourceId, group);
  }

  const result = new Map<string, ManagedResourcePluginAttribution | null>();
  for (const resourceId of resourceIds) {
    const matches = rowsByResourceId.get(resourceId) ?? [];
    if (matches.length !== 1) {
      result.set(resourceId, null);
      continue;
    }
    const row = matches[0]!;
    if (row.bindingPluginKey !== row.pluginKey) {
      result.set(resourceId, null);
      continue;
    }
    result.set(resourceId, {
      pluginId: row.pluginId,
      pluginKey: row.pluginKey,
      pluginDisplayName: row.manifestJson.displayName ?? row.pluginKey,
      resourceKind: row.resourceKind as PluginManagedResourceKind,
      resourceKey: row.resourceKey,
    });
  }
  return result;
}
