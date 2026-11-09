// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConnectionGrant, ToolConnection } from "@paperclipai/shared";
import { getAppStoreDefinition } from "@paperclipai/shared";
import { i18n } from "@/i18n";
import { AdvancedPanel, DangerZone } from "./AdvancedPanel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function act(callback: () => void) {
  flushSync(callback);
}

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  if (root) act(() => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  await i18n.changeLanguage("en");
});

function renderDangerZone(props: Partial<Parameters<typeof DangerZone>[0]> = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<DangerZone appName="PostHog" removing={false} onRemove={vi.fn()} {...props} />));
  return container;
}

function renderAdvancedPanel(connection: ToolConnection) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(
    <AdvancedPanel
      connection={connection}
      appName="MCP Service"
      galleryEntry={null}
      removing={false}
      onRemove={vi.fn()}
      onReplaced={vi.fn()}
      appToggleDisabled={false}
      onToggleApp={vi.fn()}
    />,
  ));
  return container;
}

function expandDangerZone(node: HTMLDivElement, label = "Danger zone") {
  const trigger = Array.from(node.querySelectorAll("button"))
    .find((button) => button.textContent?.includes(label));
  expect(trigger).toBeTruthy();
  act(() => trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

/**
 * Remove app deletes the operator's credentials and revokes agent access
 * (PAP-17119). The compact confirmation still names both effects before the
 * operator commits.
 */
describe("DangerZone", () => {
  it("keeps removal available without reconnecting an obsolete Anthropic method", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const onRemove = vi.fn();
    act(() => root?.render(
      <DangerZone
        appName="Anthropic"
        connection={{
          id: "obsolete-anthropic",
          uid: "obsolete-anthropic",
          companyId: "company-1",
          applicationId: "app-1",
          name: "Anthropic",
          connectionKind: "managed",
          connectionPurpose: "tool",
          ownership: "customer",
          transport: "rest_api",
          authKind: "api_key",
          credentialSource: "paperclip_vault",
          credentialPolicy: "shared",
          transportConfig: {},
          config: { sourceTemplateKey: "anthropic", connectionMethodKey: "api-key" },
          credentialSecretRefs: [],
          healthStatus: "error",
          healthCheckedAt: null,
          lastError: "This connection has no supported tool integration.",
          enabled: true,
          createdByAgentId: null,
          createdByUserId: "user-1",
          createdAt: new Date("2026-09-12T00:00:00Z"),
          updatedAt: new Date("2026-09-12T00:00:00Z"),
        }}
        galleryEntry={getAppStoreDefinition("anthropic")!}
        removing={false}
        onRemove={onRemove}
      />,
    ));
    expandDangerZone(container);
    const button = (label: string) => Array.from(container!.querySelectorAll("button"))
      .find((candidate) => candidate.textContent?.trim() === label);
    expect(button("Reconnect")).toBeUndefined();
    act(() => button("Remove app")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    act(() => button("Yes, remove it")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onRemove).toHaveBeenCalledOnce();
    act(() => root?.unmount());
    root = null;
  });

  it("keeps dangerous actions folded by default", () => {
    const node = renderDangerZone();

    expect(node.textContent).toContain("Danger zone");
    expect(node.textContent).not.toContain("Remove app");
    expect(node.textContent).not.toContain("Deletes credentials");
  });

  it("promises credential deletion and re-authentication before the operator confirms", () => {
    const node = renderDangerZone();
    expandDangerZone(node);
    const text = node.textContent ?? "";

    expect(text).toContain("Deletes credentials for PostHog");
    expect(text).toContain("removes agent access");
    expect(text).toContain("requires a new sign-in or key");
  });

  it("keeps the warning visible in the confirming state", () => {
    const node = renderDangerZone();
    expandDangerZone(node);
    const trigger = Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Remove app");
    expect(trigger).toBeTruthy();

    act(() => trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    const text = node.textContent ?? "";
    expect(text).toContain("Yes, remove it");
    expect(text).toContain("Deletes credentials for PostHog");
    expect(text).toContain("requires a new sign-in or key");
  });

  it("localizes the connection removal lifecycle in Brazilian Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");
    const node = renderDangerZone();
    expandDangerZone(node, "Zona de risco");

    expect(node.textContent).toContain("Remover este app");
    expect(node.textContent).toContain("Exclui as credenciais de PostHog e remove o acesso dos agentes.");
    expect(Array.from(node.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "Remover app",
    )).toBe(true);
  });

  it("localizes advanced connection details and preserves the endpoint and transport", async () => {
    await i18n.changeLanguage("pt-BR");
    const connection = {
      id: "connection-1",
      transport: "mcp_remote",
      config: { url: "https://mcp.example.test/server" },
      transportConfig: {},
      authKind: "api_key",
      credentialSource: "paperclip_vault",
      credentialPolicy: "shared",
      enabled: true,
      status: "connected",
    } as unknown as ToolConnection;
    const node = renderAdvancedPanel(connection);

    const detailsTrigger = Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Detalhes da conexão"));
    expect(detailsTrigger).toBeTruthy();
    act(() => detailsTrigger!.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    expect(node.textContent).toContain("Endereço");
    expect(node.textContent).toContain("Tipo");
    expect(node.textContent).toContain("https://mcp.example.test/server");
    expect(node.textContent).toContain("HTTP remoto");
  });

  it("localizes identity reconnect and revocation controls without changing their callbacks", async () => {
    await i18n.changeLanguage("pt-BR");
    const onReconnectIdentity = vi.fn();
    const onRevokeIdentity = vi.fn();
    const grant = {
      id: "grant-1",
      kind: "user",
      subjectUserId: "user-2",
      status: "active",
      capabilities: { canRevoke: true },
    } as unknown as ConnectionGrant;
    const connection = {
      id: "connection-1",
      transport: "mcp_remote",
      config: {},
      authKind: "oauth",
      enabled: true,
      status: "connected",
    } as unknown as ToolConnection;
    const node = renderDangerZone({
      appName: "Okta Cloud",
      connection,
      identityGrant: grant,
      identityCurrentUserId: "user-1",
      identityProviderName: "Okta Cloud",
      credentialPolicy: "shared",
      onReconnectIdentity,
      onRevokeIdentity,
    });
    expandDangerZone(node, "Zona de risco");

    expect(node.textContent).toContain("Entre novamente no Okta Cloud.");
    expect(node.textContent).toContain("Desconecta a identidade que este app está usando no momento.");
    const reconnect = Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Reconectar");
    expect(reconnect).toBeTruthy();
    act(() => reconnect!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onReconnectIdentity).toHaveBeenCalledOnce();

    const revoke = Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Revogar");
    expect(revoke).toBeTruthy();
    act(() => revoke!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.body.textContent).toContain("Revogar esta identidade do Okta Cloud?");
    const confirm = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Revogar identidade");
    expect(confirm).toBeTruthy();
    act(() => confirm!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onRevokeIdentity).toHaveBeenCalledWith(grant);
  });

});
