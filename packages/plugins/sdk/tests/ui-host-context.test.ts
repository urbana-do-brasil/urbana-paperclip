import { afterEach, describe, expect, it } from "vitest";
import { useHostContext } from "../src/ui/hooks.js";
import type { PluginHostContext } from "../src/ui/types.js";

type PluginBridgeGlobal = typeof globalThis & {
  __paperclipPluginBridge__?: {
    sdkUi?: Record<string, unknown>;
  };
};

afterEach(() => {
  delete (globalThis as PluginBridgeGlobal).__paperclipPluginBridge__;
});

describe("plugin SDK host locale context", () => {
  it.each(["pt-BR", "en"] as const)("exposes the host locale %s", (locale) => {
    const hostContext: PluginHostContext = {
      companyId: "company-1",
      companyPrefix: "PAP",
      projectId: null,
      entityId: null,
      entityType: null,
      userId: null,
      locale,
    };
    (globalThis as PluginBridgeGlobal).__paperclipPluginBridge__ = {
      sdkUi: { useHostContext: () => hostContext },
    };

    expect(useHostContext()).toEqual(hostContext);
  });
});
