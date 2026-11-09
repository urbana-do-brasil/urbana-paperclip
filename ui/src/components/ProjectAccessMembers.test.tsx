// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project } from "@paperclipai/shared";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { ProjectAccessMembers } from "./ProjectAccessMembers";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({
  listMembers: vi.fn(),
  addMember: vi.fn(),
  removeMember: vi.fn(),
  listDirectory: vi.fn(),
  listAgents: vi.fn(),
  pushToast: vi.fn(),
}));

vi.mock("@/api/projects", () => ({
  projectsApi: {
    listAccessMembers: api.listMembers,
    addAccessMember: api.addMember,
    removeAccessMember: api.removeMember,
  },
}));
vi.mock("@/api/access", () => ({ accessApi: { listUserDirectory: api.listDirectory } }));
vi.mock("@/api/agents", () => ({ agentsApi: { list: api.listAgents } }));
vi.mock("@/context/ToastContext", () => ({ useToastActions: () => ({ pushToast: api.pushToast }) }));

const project = {
  id: "project-1",
  companyId: "company-1",
  personalOwnerUserId: "owner-1",
  privacyOwnerUserId: "owner-1",
} as Project;

const originalScrollIntoView = Element.prototype.scrollIntoView;
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = () => {};
  api.listMembers.mockResolvedValue([]);
  api.listDirectory.mockResolvedValue({
    users: [{ user: { id: "user-1", name: "Rita Pessoa", email: "rita@example.test", image: null } }],
  });
  api.listAgents.mockResolvedValue([
    {
      id: "agent-1",
      name: "Shared Agent",
      permissions: { authorizationPolicy: { agentVisibility: { mode: "discoverable" } } },
    },
  ]);
  await act(async () => { await i18n.changeLanguage("en"); });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  client.clear();
  container.remove();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  Element.prototype.scrollIntoView = originalScrollIntoView;
  await act(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
});

async function render(node: ReactNode) {
  await act(async () => { root.render(<QueryClientProvider client={client}>{node}</QueryClientProvider>); });
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function button(label: string): HTMLButtonElement {
  const found = [...document.body.querySelectorAll("button")].find((candidate) => candidate.textContent?.trim() === label);
  if (!found) throw new Error(`Button "${label}" not found`);
  return found;
}

async function openAccessDialog(label: string) {
  await act(async () => { button(label).click(); });
  await settle();
  if (!document.body.querySelector('[role="dialog"]')) throw new Error("Access dialog did not open");
}

describe("ProjectAccessMembers localization", () => {
  it("localizes private access, shows the shared-agent warning, and preserves the add payload", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    api.addMember.mockResolvedValue({});
    await render(<ProjectAccessMembers project={project} canManage />);

    await openAccessDialog("Gerenciar acesso");
    expect(document.body.textContent).toContain("Acesso ao projeto privado");
    expect(document.body.textContent).toContain("Pessoas e agentes com acesso podem encontrar este projeto e ler todas as tarefas dele. Uma tarefa também pode ser compartilhada diretamente.");

    const selector = document.body.querySelector('[role="combobox"]') as HTMLElement | null;
    if (!selector) throw new Error("Access member selector not found");
    if (selector.getAttribute("aria-expanded") !== "true") {
      await act(async () => { selector.click(); });
      await settle();
    }
    const option = [...document.body.querySelectorAll('[role="option"]')].find((candidate) => candidate.textContent?.includes("Shared Agent"));
    if (!option) throw new Error(`Shared Agent option not found; text=${document.body.textContent}`);
    await act(async () => { (option as HTMLElement).click(); });
    await settle();
    expect(document.body.textContent).toContain("Este agente pode manter informações privadas do projeto na memória e no espaço de trabalho para execuções futuras. Remover o acesso não apaga o que ele já aprendeu.");

    await act(async () => { button("Adicionar").click(); });
    await settle();
    expect(api.addMember).toHaveBeenCalledWith(
      "project-1",
      { subjectType: "agent", subjectId: "agent-1" },
      "company-1",
    );
  });

  it("keeps view-only access, owner protection, and disabled mutation controls", async () => {
    api.listMembers.mockResolvedValue([
      { id: "owner-member", subjectType: "user", subjectId: "owner-1", subjectDisplayName: "Project Owner" },
      { id: "member-1", subjectType: "user", subjectId: "user-1", subjectDisplayName: "Rita Pessoa" },
    ]);
    await render(<ProjectAccessMembers project={project} canManage={false} />);

    await openAccessDialog("View access");
    expect(button("Add").disabled).toBe(true);
    expect(document.body.querySelector('[aria-label="Remove Project Owner"]')).toBeNull();
    const removeButton = document.body.querySelector('[aria-label="Remove Rita Pessoa"]') as HTMLButtonElement | null;
    expect(removeButton?.disabled).toBe(true);
    expect(document.body.textContent).toContain("Owner");

    await act(async () => { button("Close project access").click(); });
    await settle();
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(api.addMember).not.toHaveBeenCalled();
    expect(api.removeMember).not.toHaveBeenCalled();
  });
});
