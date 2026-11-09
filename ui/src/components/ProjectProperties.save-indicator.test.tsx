// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Project } from "@paperclipai/shared";
import type { ReactNode } from "react";
import { act as reactAct } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { ProjectProperties, type ProjectFieldSaveState } from "./ProjectProperties";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryKeys } from "../lib/queryKeys";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function act(callback: () => void) {
  flushSync(() => {
    callback();
  });
}

const noop = vi.hoisted(() => () => undefined);

vi.mock("../api/projects", () => ({ projectsApi: { createWorkspace: vi.fn(), removeWorkspace: vi.fn(), updateWorkspace: vi.fn() } }));
vi.mock("../api/goals", () => ({ goalsApi: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("../api/secrets", () => ({ secretsApi: { list: vi.fn().mockResolvedValue([]), listUserSecretDefinitions: vi.fn().mockResolvedValue([]), create: vi.fn() } }));
vi.mock("../api/environments", () => ({ environmentsApi: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("../api/instanceSettings", () => ({ instanceSettingsApi: { getExperimental: vi.fn().mockResolvedValue({ enableIsolatedWorkspaces: true }) } }));
vi.mock("@/context/ToastContext", () => ({ useToastActions: () => ({ pushToast: vi.fn() }) }));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ companies: [{ id: "company-1", issuePrefix: "PAP" }], selectedCompanyId: "company-1", setSelectedCompanyId: vi.fn() }),
}));

// Heavy children that are unrelated to the save indicator.
vi.mock("./environment-variables-editor", () => ({ EnvironmentVariablesEditor: () => null }));
vi.mock("./InlineEditor", () => ({ InlineEditor: ({ value }: { value?: ReactNode }) => <div>{value}</div> }));
vi.mock("./PathInstructionsModal", () => ({ ChoosePathButton: () => null }));

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    urlKey: "project-1",
    name: "Test project",
    description: "A long description that fills the value column",
    status: "in_progress",
    targetDate: new Date("2026-06-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-05-01T00:00:00Z"),
    goalIds: [],
    goals: [],
    env: null,
    codebase: { workspaceId: null, repoUrl: null, repoRef: null, defaultRef: null, repoName: null },
    primaryWorkspace: null,
    workspaces: [],
    executionWorkspacePolicy: { enabled: true, defaultMode: "shared_workspace", allowIssueOverride: true },
    ...overrides,
  } as unknown as Project;
}

function primedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(queryKeys.health, { hiddenSettings: [] });
  client.setQueryData(queryKeys.instance.experimentalSettings, { enableIsolatedWorkspaces: true });
  client.setQueryData(queryKeys.auth.session, { user: { id: "privacy-owner" } });
  client.setQueryData(queryKeys.access.currentBoardAccess, { memberships: [] });
  return client;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  await reactAct(async () => { await i18n.changeLanguage("en"); });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
});

function render(
  getFieldSaveState: (field: string) => ProjectFieldSaveState,
  onArchive: (archived: boolean) => void = noop,
  onFieldUpdate: (field: string, data: Record<string, unknown>) => void = noop,
  project: Project = makeProject(),
) {
  act(() => {
    root.render(
      <QueryClientProvider client={primedClient()}>
        <TooltipProvider>
          <ProjectProperties
            project={project}
            onFieldUpdate={onFieldUpdate}
            getFieldSaveState={getFieldSaveState}
            onArchive={onArchive}
          />
        </TooltipProvider>
      </QueryClientProvider>,
    );
  });
}

function labelSpan(text: string): HTMLSpanElement {
  const span = Array.from(container.querySelectorAll("span")).find((el) => el.textContent === text);
  if (!span) throw new Error(`Label "${text}" not rendered`);
  return span;
}

describe("ProjectProperties save indicator placement", () => {
  it("stacks the Saving indicator below the Description label instead of beside it", () => {
    render((field) => (field === "description" ? "saving" : "idle"));

    const label = labelSpan("Description");
    const wrapper = label.parentElement;
    expect(wrapper).not.toBeNull();
    // The label column is a fixed 80px wide; laying the indicator out inline
    // overflows into the description text. It must be a stacked column.
    expect(wrapper!.className).toContain("flex-col");
    expect(wrapper!.className).not.toContain("items-center");

    const indicator = label.nextElementSibling;
    expect(indicator).not.toBeNull();
    expect(indicator!.textContent).toContain("Saving");
    expect(wrapper!.contains(indicator!)).toBe(true);
  });

  it("renders the Saved indicator in the same stacked position once the save completes", () => {
    render((field) => (field === "description" ? "saved" : "idle"));

    const label = labelSpan("Description");
    expect(label.parentElement!.className).toContain("flex-col");
    expect(label.nextElementSibling?.textContent).toContain("Saved");
  });

  it("renders no indicator when the field is idle", () => {
    render(() => "idle");

    const label = labelSpan("Description");
    expect(label.nextElementSibling).toBeNull();
  });

  it("localizes core project fields and archive confirmation while preserving the callback", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    const onArchive = vi.fn();
    render((field) => (field === "description" ? "saving" : "idle"), onArchive);

    expect(labelSpan("Nome")).not.toBeNull();
    const description = labelSpan("Descrição");
    expect(description.nextElementSibling?.textContent).toContain("Salvando");
    expect(container.textContent).toContain("Zona de perigo");

    const archiveButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Arquivar projeto"));
    expect(archiveButton).toBeTruthy();
    act(() => archiveButton?.click());
    expect(container.textContent).toContain("Arquivar “Test project”?");
    const confirmButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Confirmar");
    expect(confirmButton).toBeTruthy();
    act(() => confirmButton?.click());
    expect(onArchive).toHaveBeenCalledWith(true);
  });

  it("localizes private project visibility and retains the explicit open-confirmation gate", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    const onFieldUpdate = vi.fn();
    render(
      () => "idle",
      noop,
      onFieldUpdate,
      makeProject({ visibility: "private", privacyOwnerUserId: "privacy-owner" }),
    );

    expect(labelSpan("Visibilidade")).not.toBeNull();
    expect(container.textContent).toContain("Somente quem tem acesso pode encontrar este projeto.");
    expect(container.textContent).toContain("Gerenciar acesso");
    const visibilitySwitch = container.querySelector('button[role="switch"][aria-label="Projeto privado"]') as HTMLButtonElement | null;
    expect(visibilitySwitch).not.toBeNull();
    expect(visibilitySwitch!.disabled).toBe(false);

    act(() => visibilitySwitch!.click());
    expect(document.body.textContent).toContain("Abrir este projeto para a organização?");
    expect(document.body.textContent).toContain("Quem tiver acesso às tarefas somente por este projeto perderá esse acesso.");
    const confirm = [...document.body.querySelectorAll("button")]
      .find((candidate) => candidate.textContent?.trim() === "Aberto para a organização");
    expect(confirm).toBeTruthy();
    act(() => confirm?.click());

    expect(onFieldUpdate).toHaveBeenCalledWith("visibility", { visibility: "open" });
  });
});
