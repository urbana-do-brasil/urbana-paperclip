import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PluginManagedResourceKind } from "@paperclipai/shared";

import { managedResourceAttributionsApi } from "@/api/managed-resource-attributions";
import { pluginsApi } from "@/api/plugins";
import { useTranslation } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import {
  hasOwnedPluginPresentation,
  localizeManagedPluginResourceDisplayName,
} from "@/lib/plugin-presentation-localization";

export interface ManagedPluginResourceNameInput {
  id: string;
  name: string;
}

/**
 * Resolve display-only names from the company-scoped attribution read API.
 * The resource and plugin APIs keep their existing JSON payloads; missing,
 * stale, renamed, third-party, or unauthorized origins retain the current name.
 */
export function useManagedPluginResourceDisplayNames(
  companyId: string | null | undefined,
  resourceKind: PluginManagedResourceKind,
  resources: readonly ManagedPluginResourceNameInput[] | undefined,
): ReadonlyMap<string, string> {
  const { t } = useTranslation();
  const resourceIds = useMemo(() => [...new Set((resources ?? []).map((resource) => resource.id))].sort(), [resources]);
  const attributionQuery = useQuery({
    queryKey: companyId
      ? queryKeys.managedResourceAttributions.list(companyId, resourceKind, resourceIds)
      : ["managed-resource-attributions", null, resourceKind, resourceIds],
    queryFn: () => managedResourceAttributionsApi.list(companyId!, resourceKind, resourceIds),
    enabled: Boolean(companyId && resourceIds.length),
  });
  const attributionsById = useMemo(
    () => new Map((attributionQuery.data ?? []).map((entry) => [entry.resourceId, entry])),
    [attributionQuery.data],
  );
  const needsBundleEvidence = [...attributionsById.values()].some((attribution) =>
    hasOwnedPluginPresentation(attribution.pluginKey),
  );
  const installedPluginsQuery = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: () => pluginsApi.list(),
    enabled: needsBundleEvidence,
  });
  const bundledPluginsQuery = useQuery({
    queryKey: queryKeys.plugins.examples,
    queryFn: () => pluginsApi.listBundled(),
    enabled: needsBundleEvidence,
  });

  return useMemo(() => new Map((resources ?? []).map((resource) => {
    const attribution = attributionsById.get(resource.id);
    return [
      resource.id,
      attribution
        ? localizeManagedPluginResourceDisplayName(
            attribution,
            resource.name,
            installedPluginsQuery.data,
            bundledPluginsQuery.data,
            t,
          )
        : resource.name,
    ];
  })), [resources, attributionsById, installedPluginsQuery.data, bundledPluginsQuery.data, t]);
}

export function useManagedPluginResourceDisplayName(
  companyId: string | null | undefined,
  resourceKind: PluginManagedResourceKind,
  resource: ManagedPluginResourceNameInput | null | undefined,
): string | null {
  const names = useManagedPluginResourceDisplayNames(companyId, resourceKind, resource ? [resource] : undefined);
  return resource ? names.get(resource.id) ?? resource.name : null;
}
