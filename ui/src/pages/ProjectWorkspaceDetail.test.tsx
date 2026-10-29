// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project, ProjectWorkspace } from "@paperclipai/shared";
import { act as reactAct, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { ProjectWorkspaceDetail } from "./ProjectWorkspaceDetail";

const mocks = vi.hoisted(() => ({
  project: null as Project | null,
  companyPrefix: "PAP",
  search: "",
  hideHostPaths: false,
  setBreadcrumbs: vi.fn(),
  setSelectedCompanyId: vi.fn(),
  navigate: vi.fn(),
  getProject: vi.fn(),
  updateWorkspace: vi.fn(),
  controlWorkspaceCommands: vi.fn(),
}));

vi.mock("../api/projects", () => ({
  projectsApi: {
    get: mocks.getProject,
    updateWorkspace: mocks.updateWorkspace,
    controlWorkspaceCommands: mocks.controlWorkspaceCommands,
  },
}));
vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: mocks.setBreadcrumbs }),
}));
vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    companies: [{ id: "company-1", issuePrefix: "PAP" }],
    selectedCompanyId: "company-1",
    setSelectedCompanyId: mocks.setSelectedCompanyId,
  }),
}));
vi.mock("../hooks/useManagedSandboxOnly", () => ({
  useManagedSandboxOnly: () => ({ hideHostPaths: mocks.hideHostPaths }),
}));
vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: ComponentProps<"a"> & { to: string }) => <a href={to} {...props}>{children}</a>,
  useParams: () => ({ companyPrefix: mocks.companyPrefix, projectId: "project-alpha", workspaceId: "workspace-1" }),
  useLocation: () => ({ search: mocks.search }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/plugins/slots", () => ({
  PluginSlotMount: () => <div data-testid="plugin-slot" />,
  usePluginSlots: () => ({ slots: [], isLoading: false, errorMessage: null }),
}));
vi.mock("../components/WorkspaceRuntimeControls", () => ({
  buildWorkspaceRuntimeControlSections: vi.fn(() => []),
  WorkspaceRuntimeControls: ({ serviceEmptyMessage, jobEmptyMessage }: { serviceEmptyMessage: string; jobEmptyMessage: string }) => (
    <div data-testid="runtime-controls">{serviceEmptyMessage} {jobEmptyMessage}</div>
  ),
}));
vi.mock("../components/PageTabBar", () => ({
  PageTabBar: ({ items }: { items: Array<{ value: string; label: string }> }) => (
    <div data-testid="workspace-tabs">{items.map((item) => <span key={item.value}>{item.label}</span>)}</div>
  ),
}));
vi.mock("../components/PathInstructionsModal", () => ({ ChoosePathButton: () => <button type="button">Escolher pasta</button> }));
vi.mock("../components/MissingPluginTabPlaceholder", () => ({
  MissingPluginTabPlaceholder: ({ defaultTabLabel }: { defaultTabLabel: string }) => <div>{defaultTabLabel}</div>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeWorkspace(overrides: Partial<ProjectWorkspace> = {}): ProjectWorkspace {
  return {
    id: "workspace-1",
    projectId: "project-1",
    name: "Workspace Alpha",
    sourceType: "local_path",
    cwd: "/srv/project-alpha",
    repoUrl: "https://github.com/example/project-alpha",
    repoRef: "feature/alpha",
    defaultRef: "origin/main",
    visibility: "default",
    setupCommand: "pnpm install",
    cleanupCommand: "pnpm cleanup",
    remoteProvider: null,
    remoteWorkspaceRef: null,
    sharedWorkspaceKey: "alpha",
    runtimeConfig: { workspaceRuntime: null },
    runtimeServices: [],
    updatedAt: new Date("2026-07-04T15:30:00Z"),
    isPrimary: false,
    ...overrides,
  } as ProjectWorkspace;
}

function makeProject(workspace: ProjectWorkspace): Project {
  return {
    id: "project-1",
    urlKey: "project-alpha",
    companyId: "company-1",
    name: "Project Alpha",
    workspaces: [workspace],
  } as unknown as Project;
}

describe("ProjectWorkspaceDetail localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await reactAct(async () => { await i18n.changeLanguage("en"); });
    mocks.project = makeProject(makeWorkspace());
    mocks.companyPrefix = "PAP";
    mocks.search = "";
    mocks.hideHostPaths = false;
    mocks.setBreadcrumbs.mockReset();
    mocks.setSelectedCompanyId.mockReset();
    mocks.navigate.mockReset();
    mocks.getProject.mockReset().mockImplementation(async () => mocks.project);
    mocks.updateWorkspace.mockReset().mockResolvedValue(mocks.project);
    mocks.controlWorkspaceCommands.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await reactAct(async () => { root.unmount(); });
    container.remove();
    await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
  });

  async function renderDetail(locale: "en" | "pt-BR", hideHostPaths = false) {
    await reactAct(async () => { await i18n.changeLanguage(locale); });
    mocks.hideHostPaths = hideHostPaths;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    await reactAct(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <ProjectWorkspaceDetail />
        </QueryClientProvider>,
      );
    });
    await reactAct(async () => {
      await vi.waitFor(() => expect(container.querySelector('input[placeholder="Nome do espaço de trabalho"]') || locale === "en" && container.querySelector('input[placeholder="Workspace name"]')).not.toBeNull());
    });
  }

  function setInputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  it("localizes workspace configuration and preserves update values and routes", async () => {
    await renderDetail("pt-BR");

    expect(container.textContent).toContain("Espaço de trabalho do projeto");
    expect(container.textContent).toContain("Voltar aos espaços de trabalho");
    expect(container.textContent).toContain("Definir como principal");
    expect(container.textContent).toContain("Configuração");
    expect(container.textContent).toContain("Comando de configuração");
    expect(container.textContent).toContain("JSON dos comandos do espaço de trabalho");
    expect(container.textContent).toContain("Dados do espaço de trabalho");
    expect(container.textContent).toContain("Serviços e tarefas pontuais");
    expect(container.querySelector("a[href='/projects/project-alpha/workspaces']")).not.toBeNull();
    expect(container.textContent).toContain("/srv/project-alpha");
    expect(container.textContent).toContain("https://github.com/example/project-alpha");
    expect(mocks.setBreadcrumbs).toHaveBeenCalledWith([
      { label: "Projetos", href: "/projects" },
      { label: "Project Alpha", href: "/projects/project-alpha" },
      { label: "Espaços de trabalho", href: "/projects/project-alpha/workspaces" },
      { label: "Workspace Alpha" },
    ]);

    await reactAct(async () => {
      [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Definir como principal"))!.click();
      await vi.waitFor(() => expect(mocks.updateWorkspace).toHaveBeenCalled());
    });
    expect(mocks.updateWorkspace).toHaveBeenCalledWith("project-1", "workspace-1", { isPrimary: true }, "company-1");

    const nameInput = [...container.querySelectorAll<HTMLInputElement>("input")]
      .find((input) => input.value === "Workspace Alpha")!;
    await reactAct(async () => { setInputValue(nameInput, "Workspace Localizado"); });
    await reactAct(async () => {
      [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Salvar alterações")!.click();
      await vi.waitFor(() => expect(mocks.updateWorkspace).toHaveBeenCalledWith(
        "project-1",
        "workspace-1",
        { name: "Workspace Localizado" },
        "company-1",
      ));
    });
  });

  it("localizes validation and continues to hide host paths when policy requires it", async () => {
    await renderDetail("pt-BR", true);
    expect(container.textContent).not.toContain("/srv/project-alpha");
    expect(container.textContent).not.toContain("Caminho local");

    mocks.hideHostPaths = false;
    await reactAct(async () => { root.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })}>
        <ProjectWorkspaceDetail />
      </QueryClientProvider>,
    ); });
    await reactAct(async () => {
      await vi.waitFor(() => expect(container.textContent).toContain("Caminho local"));
    });

    const localPath = container.querySelector<HTMLInputElement>('input[placeholder="/absolute/path/to/workspace"]')!;
    await reactAct(async () => { setInputValue(localPath, "relative/path"); });
    await reactAct(async () => {
      [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Salvar alterações")!.click();
    });
    expect(container.textContent).toContain("O caminho local do espaço de trabalho precisa ser absoluto.");
    expect(mocks.updateWorkspace).not.toHaveBeenCalled();
  });
});
