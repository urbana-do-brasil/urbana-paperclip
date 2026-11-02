import type {
  ManagedResourceAttributionEntry,
  PluginManagedResourceKind,
} from "@paperclipai/shared";
import { api } from "./client";

const RESOURCE_IDS_PER_REQUEST = 250;

export const managedResourceAttributionsApi = {
  list: async (
    companyId: string,
    resourceKind: PluginManagedResourceKind,
    resourceIds: readonly string[],
  ): Promise<ManagedResourceAttributionEntry[]> => {
    const uniqueIds = [...new Set(resourceIds)];
    const batches: string[][] = [];
    for (let index = 0; index < uniqueIds.length; index += RESOURCE_IDS_PER_REQUEST) {
      batches.push(uniqueIds.slice(index, index + RESOURCE_IDS_PER_REQUEST));
    }

    const results = await Promise.all(batches.map((batch) => {
      const query = new URLSearchParams({ resourceKind });
      for (const resourceId of batch) query.append("resourceId", resourceId);
      return api.get<ManagedResourceAttributionEntry[]>(
        `/companies/${encodeURIComponent(companyId)}/managed-resource-attributions?${query.toString()}`,
      );
    }));
    return results.flat();
  },
};
