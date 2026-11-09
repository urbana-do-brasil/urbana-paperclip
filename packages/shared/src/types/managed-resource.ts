import type { PluginManagedResourceKind } from "./plugin.js";

/** Read-only attribution for a resource bound to a plugin in its company. */
export interface ManagedResourcePluginAttribution {
  pluginId: string;
  pluginKey: string;
  pluginDisplayName: string;
  resourceKind: PluginManagedResourceKind;
  resourceKey: string;
}

/** One company-scoped ownership row returned by the read-only attribution API. */
export interface ManagedResourceAttributionEntry extends ManagedResourcePluginAttribution {
  resourceId: string;
}
