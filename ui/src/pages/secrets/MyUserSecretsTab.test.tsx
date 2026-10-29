// @vitest-environment jsdom

import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CompanySecret, UserSecretDefinition } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MyUserSecretEntry } from "../../api/secrets";
import { i18n } from "../../i18n";
import { MyUserSecretsTab } from "./MyUserSecretsTab";

const mockSecretsApi = vi.hoisted(() => ({
  listMyUserSecrets: vi.fn(),
  rotateMyUserSecret: vi.fn(),
  removeMyUserSecret: vi.fn(),
}));
const mockPushToast = vi.hoisted(() => vi.fn());

vi.mock("../../api/secrets", () => ({ secretsApi: mockSecretsApi }));
vi.mock("../../context/ToastContext", () => ({
  useToastActions: () => ({ pushToast: mockPushToast }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function definition(overrides: Partial<UserSecretDefinition> = {}): UserSecretDefinition {
  return {
    id: "def-1",
    companyId: "c1",
    key: "PERSONAL_GH_TOKEN",
    name: "Personal GitHub token",
    description: null,
    status: "active",
    provider: "local_encrypted",
    managedMode: "paperclip_managed",
    providerConfigId: null,
    providerMetadata: null,
    usageGuidance: null,
    createdByAgentId: null,
    createdByUserId: null,
    updatedByAgentId: null,
    updatedByUserId: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function secret(overrides: Partial<CompanySecret> = {}): CompanySecret {
  return {
    id: "sec-1",
    companyId: "c1",
    scope: "user",
    ownerUserId: "u1",
    userSecretDefinitionId: "def-1",
    key: "PERSONAL_GH_TOKEN",
    name: "Personal GitHub token",
    provider: "local_encrypted",
    status: "active",
    managedMode: "paperclip_managed",
    externalRef: null,
    providerConfigId: null,
    providerMetadata: null,
    latestVersion: 1,
    description: null,
    lastResolvedAt: null,
    lastRotatedAt: null,
    deletedAt: null,
    createdByAgentId: null,
    createdByUserId: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> = undefined;
  flushSync(() => {
    result = callback();
  });
  await result;
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("pt-BR");
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(async () => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
  await i18n.changeLanguage("en");
});

function render() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  root = createRoot(container);
  return act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MyUserSecretsTab companyId="c1" />
      </QueryClientProvider>,
    );
  });
}

describe("MyUserSecretsTab", () => {
  it("updates an existing personal value through the rotation endpoint", async () => {
    mockSecretsApi.listMyUserSecrets.mockResolvedValue([
      { definition: definition(), secret: secret() },
    ]);
    mockSecretsApi.rotateMyUserSecret.mockResolvedValue(secret());

    await render();
    await flushReact();
    const updateButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Atualizar",
    );
    expect(updateButton).toBeTruthy();
    await act(() => updateButton!.click());
    await flushReact();

    expect(document.body.textContent).toContain("Atualizar seu valor");
    const valueInput = document.getElementById("my-secret-value") as HTMLTextAreaElement | null;
    expect(valueInput).not.toBeNull();
    await act(() => setTextareaValue(valueInput!, "rotated-private-token"));
    const saveButton = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Atualizar valor",
    );
    expect(saveButton).toBeTruthy();
    await act(() => saveButton!.click());
    await flushReact();

    expect(mockSecretsApi.rotateMyUserSecret).toHaveBeenCalledWith("c1", "sec-1", {
      value: "rotated-private-token",
    });
    expect(mockPushToast).toHaveBeenCalledWith({
      title: "Valor atualizado",
      body: "Personal GitHub token",
      tone: "success",
    });
    expect(document.body.textContent).not.toContain("rotated-private-token");
  });

  it("updates an external personal reference through the rotation endpoint", async () => {
    const externalDefinition = definition({
      id: "def-ext",
      key: "PERSONAL_VAULT_TOKEN",
      name: "Vault token",
      managedMode: "external_reference",
    });
    const externalSecret = secret({
      id: "sec-ext",
      userSecretDefinitionId: "def-ext",
      key: "PERSONAL_VAULT_TOKEN",
      name: "Vault token",
      managedMode: "external_reference",
    });
    mockSecretsApi.listMyUserSecrets.mockResolvedValue([
      { definition: externalDefinition, secret: externalSecret },
    ]);
    mockSecretsApi.rotateMyUserSecret.mockResolvedValue(externalSecret);

    await render();
    await flushReact();
    const updateButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Atualizar",
    );
    await act(() => updateButton!.click());
    await flushReact();

    expect(document.body.textContent).toContain("Referência externa");
    const referenceInput = document.getElementById("my-secret-external-ref") as HTMLInputElement | null;
    expect(referenceInput).not.toBeNull();
    await act(() => setInputValue(referenceInput!, "vault://users/u1/github-token-v5"));
    const saveButton = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Atualizar valor",
    );
    expect(saveButton).toBeTruthy();
    await act(() => saveButton!.click());
    await flushReact();

    expect(mockSecretsApi.rotateMyUserSecret).toHaveBeenCalledWith("c1", "sec-ext", {
      externalRef: "vault://users/u1/github-token-v5",
    });
    expect(document.body.textContent).not.toContain("vault://users/u1/github-token-v5");
  });

  it("shows private value states and clears only the signed-in user's value", async () => {
    const entries: MyUserSecretEntry[] = [
      { definition: definition(), secret: secret() },
      {
        definition: definition({ id: "def-2", key: "PERSONAL_SLACK_TOKEN", name: "Slack token" }),
        secret: null,
      },
    ];
    mockSecretsApi.listMyUserSecrets.mockResolvedValue(entries);
    mockSecretsApi.removeMyUserSecret.mockResolvedValue(undefined);

    await render();
    await flushReact();

    expect(container.textContent).toContain("Estas são credenciais fornecidas somente por você.");
    expect(container.textContent).toContain("1 segredo obrigatório ainda precisa do seu valor.");
    expect(container.textContent).toContain("Valor configurado");
    expect(container.textContent).toContain("Não configurado");
    expect(container.textContent).toContain("Atualizar");
    expect(container.textContent).toContain("Definir valor");
    expect(container.textContent).not.toContain("private-token-value");

    const clearButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Limpar meu valor"]',
    );
    expect(clearButton).not.toBeNull();
    await act(() => clearButton!.click());
    await flushReact();

    expect(mockSecretsApi.removeMyUserSecret).toHaveBeenCalledWith("c1", "sec-1");
    expect(mockPushToast).toHaveBeenCalledWith({ title: "Valor removido", tone: "info" });
  });
});
