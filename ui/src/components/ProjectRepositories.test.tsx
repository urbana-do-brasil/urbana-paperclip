// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project, ProjectRepository, ProjectWorkspace } from "@paperclipai/shared";
import { act as reactAct } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { ProjectRepositories } from "./ProjectRepositories";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockProjectsApi = vi.hoisted(() => ({
  setRepositories: vi.fn(),
  updateWorkspace: vi.fn(),
  removeWorkspace: vi.fn(),
}));
const mockRepository: ProjectRepository = {
  id: "repository-1",
  fullName: "acme/api",
  url: "https://github.com/acme/api",
  connections: [],
};

vi.mock("@/api/projects", () => ({ projectsApi: mockProjectsApi }));
vi.mock("./ProjectRepositoryInput", () => ({
  ProjectRepositoryInput: ({ selected, onChange }: {
    selected: ProjectRepository[];
    onChange: (repositories: ProjectRepository[]) => void;
  }) => <button type="button" onClick={() => onChange([...selected, mockRepository])}>Add repository fixture</button>,
  repositoryOptionsKey: (companyId: string) => ["project-repositories", companyId],
}));
vi.mock("@/features/connections/ConnectionSetupFlow", () => ({ ConnectionSetupFlow: () => null }));

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;

beforeEach(async () => {
  await reactAct(async () => { await i18n.changeLanguage("en"); });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mockProjectsApi.setRepositories.mockReset();
  mockProjectsApi.updateWorkspace.mockReset();
  mockProjectsApi.removeWorkspace.mockReset();
});

afterEach(async () => {
  await reactAct(async () => { root.unmount(); });
  client.clear();
  container.remove();
  document.body.innerHTML = "";
  await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
});

function makeProject(workspaces: ProjectWorkspace[] = []): Project {
  return {
    id: "project-1",
    companyId: "company-1",
    urlKey: "project-alpha",
    name: "Project Alpha",
    workspaces,
  } as unknown as Project;
}

async function render(project: Project) {
  await reactAct(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <ProjectRepositories project={project} />
      </QueryClientProvider>,
    );
  });
}

async function click(button: HTMLButtonElement | null) {
  expect(button).not.toBeNull();
  await reactAct(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("ProjectRepositories", () => {
  it("localizes repository saving and preserves the repository ID sent to the API", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    mockProjectsApi.setRepositories.mockResolvedValue(makeProject());
    await render(makeProject());

    expect(container.querySelector('section[aria-label="Repositórios"]')).not.toBeNull();
    await click(container.querySelector<HTMLButtonElement>('button:not([disabled])'));
    const save = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Salvar alterações");
    await click(save ?? null);

    expect(mockProjectsApi.setRepositories).toHaveBeenCalledWith("project-1", ["repository-1"]);
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Alterações salvas");
  });

  it("localizes legacy repository editing without changing the URL payload", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    const workspace = {
      id: "legacy-workspace",
      projectId: "project-1",
      companyId: "company-1",
      name: "Legacy workspace",
      repoUrl: "https://github.com/acme/legacy",
      cwd: null,
      remoteWorkspaceRef: null,
      metadata: null,
    } as unknown as ProjectWorkspace;
    mockProjectsApi.updateWorkspace.mockResolvedValue(workspace);
    await render(makeProject([workspace]));

    expect(container.textContent).toContain("URL do repositório existente");
    expect(container.textContent).toContain("https://github.com/acme/legacy");
    await click(Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Editar") ?? null);
    const input = container.querySelector<HTMLInputElement>('input[aria-label="URL do repositório existente"]');
    expect(input).not.toBeNull();
    await reactAct(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "https://github.com/acme/renamed");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Salvar URL") ?? null);

    expect(mockProjectsApi.updateWorkspace).toHaveBeenCalledWith("project-1", "legacy-workspace", {
      repoUrl: "https://github.com/acme/renamed",
    });
  });

  it("keeps raw server save errors visible beside localized controls", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    mockProjectsApi.setRepositories.mockRejectedValue(new Error("Repository policy denied this change."));
    await render(makeProject());
    await click(container.querySelector<HTMLButtonElement>('button:not([disabled])'));
    await click(Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Salvar alterações") ?? null);

    expect(container.querySelector('[role="alert"]')?.textContent).toBe("Repository policy denied this change.");
    expect(container.textContent).toContain("Descartar alterações");
  });
});
