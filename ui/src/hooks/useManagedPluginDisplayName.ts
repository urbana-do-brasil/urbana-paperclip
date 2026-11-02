import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { pluginsApi } from "@/api/plugins";
import { queryKeys } from "@/lib/queryKeys";
import {
  hasOwnedPluginPresentation,
  localizeManagedPluginDisplayName,
  type ManagedPluginAttributionIdentity,
} from "@/lib/plugin-presentation-localization";
import { useTranslation } from "@/i18n";

/**
 * Localize plugin attribution on managed-resource details without trusting the
 * resource API's plugin key alone. Queries are enabled only for plugin keys
 * with host-owned translations; until both sources arrive, the API label is
 * returned unchanged.
 */
export function useManagedPluginDisplayName(
  attribution: ManagedPluginAttributionIdentity | null | undefined,
): string | null {
  const { t } = useTranslation();
  const needsBundleEvidence = Boolean(
    attribution
    && attribution.pluginId
    && hasOwnedPluginPresentation(attribution.pluginKey),
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

  return useMemo(() => {
    if (!attribution) return null;
    return localizeManagedPluginDisplayName(
      attribution,
      installedPluginsQuery.data,
      bundledPluginsQuery.data,
      t,
    );
  }, [attribution, installedPluginsQuery.data, bundledPluginsQuery.data, t]);
}
