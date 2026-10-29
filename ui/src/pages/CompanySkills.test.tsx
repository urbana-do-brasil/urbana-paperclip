// @vitest-environment jsdom

import { act as reactAct, type ComponentProps, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CatalogSkill, CompanySkillDetail, CompanySkillFileDetail, CompanySkillListItem, CompanySkillVersion, FolderListResult } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import {
  DiscoveryGrid,
  CatalogDetailPane,
  InstallPreviewDialog,
  SkillDetailPage,
  buildDiscoveryCards,
  defaultInstallAgentSelection,
  getSkillVersionDiffSelection,
  resolveDiscoveryTab,
  withDiscoveryTab,
  skillDetailBreadcrumbs,
} from "./CompanySkills";
import {
  CatalogDetailPane as ProductionCatalogDetailPane,
  DiscoveryGrid as ProductionDiscoveryGrid,
  SkillDetailPage as ProductionSkillDetailPage,
} from "./CompanySkills.production";
import { skillStudioNewRoute } from "../lib/company-skill-routes";

vi.mock("@/lib/router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    type = "button",
    variant: _variant,
    size: _size,
    asChild: _asChild,
    ...props
  }: ComponentProps<"button"> & { asChild?: boolean; variant?: string; size?: string }) => (
    <button type={type} {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open?: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuRadioGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuRadioItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuSub: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuSubContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: () => null,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: ComponentProps<"input">) => <input type="checkbox" {...props} />,
}));

vi.mock("../components/MarkdownBody", () => ({
  MarkdownBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("../components/MarkdownEditor", () => ({
  MarkdownEditor: ({ value }: { value: string }) => <textarea readOnly value={value} />,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function act(callback: () => void | Promise<void>) {
  await reactAct(async () => {
    await callback();
  });
}

afterEach(() => {
  root?.unmount();
  root = null;
  container?.remove();
  container = null;
});

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE);
});

function makeVersion(revisionNumber: number, content: string): CompanySkillVersion {
  return {
    id: `version-${revisionNumber}`,
    companyId: "company-1",
    companySkillId: "skill-1",
    revisionNumber,
    label: null,
    releaseId: null,
    releaseName: null,
    releasedAt: null,
    fileInventory: [
      {
        path: "SKILL.md",
        kind: "skill",
        content,
      },
    ],
    authorAgentId: null,
    authorUserId: null,
    createdAt: new Date(`2026-01-0${revisionNumber}T00:00:00Z`),
  };
}

function makeDetail(currentVersion: CompanySkillVersion, overrides: Partial<CompanySkillDetail> = {}): CompanySkillDetail {
  return {
    id: "skill-1",
    companyId: "company-1",
    key: "demo-skill",
    slug: "demo-skill",
    name: "Demo Skill",
    description: "A demo skill.",
    markdown: "# Demo Skill",
    sourceType: "local_path",
    sourceLocator: null,
    sourceRef: null,
    trustLevel: "markdown_only",
    compatibility: "compatible",
    fileInventory: [{ path: "SKILL.md", kind: "skill" }],
    iconUrl: null,
    color: null,
    tagline: null,
    authorName: null,
    homepageUrl: null,
    categories: [],
    sharingScope: "private",
    publicShareToken: null,
    forkedFromSkillId: null,
    forkedFromCompanyId: null,
    starCount: 0,
    installCount: 0,
    forkCount: 0,
    currentVersionId: currentVersion.id,
    metadata: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    attachedAgentCount: 0,
    usedByAgents: [],
    existingForks: [],
    editable: true,
    editableReason: null,
    sourceLabel: "Local",
    sourceBadge: "local",
    sourcePath: null,
    currentVersion,
    starredByCurrentActor: false,
    ...overrides,
  };
}

async function renderSkillDetail(
  versions: CompanySkillVersion[],
  props: Partial<ComponentProps<typeof SkillDetailPage>> = {},
  Component: typeof SkillDetailPage = SkillDetailPage,
) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const detail = props.detail ?? makeDetail(versions[0]!);
  const DetailPage = Component;

  await act(async () => {
    root?.render(
      <DetailPage
        detail={detail}
        loading={false}
        activeTab={props.activeTab ?? "versions"}
        onTabChange={vi.fn()}
        selectedPath="SKILL.md"
        file={null}
        fileLoading={false}
        viewMode="preview"
        editMode={false}
        draft=""
        setViewMode={vi.fn()}
        setEditMode={vi.fn()}
        setDraft={vi.fn()}
        onSave={vi.fn()}
        savePending={false}
        versions={versions}
        versionsLoading={false}
        attachAgents={[]}
        onSubmitAttach={vi.fn()}
        attachPending={false}
        expandedDirs={new Set()}
        onToggleDir={vi.fn()}
        onSelectPath={vi.fn()}
        updateStatus={null}
        updateStatusLoading={false}
        onCheckUpdates={vi.fn()}
        checkUpdatesPending={false}
        onInstallUpdate={vi.fn()}
        installUpdatePending={false}
        onToggleStar={vi.fn()}
        starPending={false}
        onFork={vi.fn()}
        onUpdateSettings={vi.fn()}
        updateSettingsPending={false}
        onDelete={vi.fn()}
        deletePending={false}
        {...props}
      />,
    );
  });

  return container;
}

async function renderDiscoveryGrid(props: Partial<ComponentProps<typeof DiscoveryGrid>> = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <DiscoveryGrid
        tab="installed"
        categories={[]}
        categoryTotal={0}
        activeCategory={null}
        onCategoryChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        sort="agents"
        onSortChange={vi.fn()}
        cards={[]}
        onOpenCard={vi.fn()}
        loading={false}
        error={null}
        totalCount={0}
        onCreate={vi.fn()}
        onImport={vi.fn()}
        onImportFromProject={vi.fn()}
        onBrowseDiscover={vi.fn()}
        onScan={vi.fn()}
        scanPending={false}
        scanStatus={null}
        {...props}
      />,
    );
  });

  return container;
}

async function renderProductionDiscoveryGrid(
  props: Partial<ComponentProps<typeof ProductionDiscoveryGrid>> = {},
) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <ProductionDiscoveryGrid
        tab="all"
        tabCounts={{ all: 0, installed: 0, catalog: 0, bundled: 0 }}
        onTabChange={vi.fn()}
        categories={[]}
        categoryTotal={0}
        activeCategory={null}
        onCategoryChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        sort="agents"
        onSortChange={vi.fn()}
        cards={[]}
        onOpenCard={vi.fn()}
        loading={false}
        error={null}
        totalCount={0}
        onCreate={vi.fn()}
        onImport={vi.fn()}
        onImportFromProject={vi.fn()}
        onBrowseCatalog={vi.fn()}
        onScan={vi.fn()}
        scanPending={false}
        scanStatus={null}
        {...props}
      />,
    );
  });

  return container;
}

const projectFolderResult: FolderListResult = {
  kind: "skill",
  allCount: 1,
  unfiledCount: 0,
  folders: [
    {
      id: "projects-root",
      companyId: "company-1",
      kind: "skill",
      parentId: null,
      name: "Projects",
      slug: "projects",
      systemKey: "projects",
      path: "projects",
      depth: 1,
      color: null,
      position: 0,
      createdAt: new Date("2026-08-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
      itemCount: 1,
    },
    {
      id: "project-folder",
      companyId: "company-1",
      kind: "skill",
      parentId: "projects-root",
      name: "Acme",
      slug: "acme",
      systemKey: "project:project-1",
      path: "projects/acme",
      depth: 2,
      color: null,
      position: 0,
      createdAt: new Date("2026-08-01T00:00:00Z"),
      updatedAt: new Date("2026-08-01T00:00:00Z"),
      itemCount: 1,
    },
  ],
};

function projectFolderGridProps() {
  return {
    folderResult: projectFolderResult,
    onFolderSelect: vi.fn(),
    onCreateFolder: vi.fn(),
    onCreateFolderIn: vi.fn(),
    onRenameFolder: vi.fn(),
    onEditFolder: vi.fn(),
    onMoveFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
  } satisfies Partial<ComponentProps<typeof DiscoveryGrid>>;
}

function buttonsNamed(node: ParentNode, name: string) {
  return Array.from(node.querySelectorAll("button")).filter((button) => button.textContent?.trim() === name);
}

async function click(button: HTMLButtonElement) {
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function inputValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function selectValue(select: HTMLSelectElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    setter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("getSkillVersionDiffSelection", () => {
  it("selects the previous saved revision or the initial baseline for row diffs", () => {
    const v1 = makeVersion(1, "first");
    const v2 = makeVersion(2, "second");

    expect(getSkillVersionDiffSelection([v2, v1], v2.id)).toEqual({
      leftVersionId: v1.id,
      rightVersionId: v2.id,
    });
    expect(getSkillVersionDiffSelection([v2, v1], v1.id)).toEqual({
      leftVersionId: null,
      rightVersionId: v1.id,
    });
  });
});

describe("DiscoveryGrid IA presentation", () => {
  it("localizes the streamlined discovery grid and keeps remote skill metadata intact", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    const localCard = {
      key: "local-skill",
      skillId: "local-1",
      catalogRef: null,
      name: "Security audit",
      slug: "security-audit",
      author: "Equipe Azul",
      version: null,
      tagline: null,
      description: "Review repository permissions.",
      categories: ["Security"],
      iconUrl: null,
      color: null,
      starCount: 0,
      agentCount: 1,
      forkCount: 0,
      installed: true,
      required: false,
      forkedFrom: true,
      updatedAt: 0,
      sourceBadge: "local" as const,
    } satisfies ComponentProps<typeof DiscoveryGrid>["cards"][number];
    const remoteCard = {
      ...localCard,
      key: "remote-skill",
      skillId: null,
      catalogRef: "remote-1",
      name: "API threat review",
      slug: "api-threat-review",
      author: "Acme Security",
      description: "Inspect endpoints for common threats.",
      categories: ["Threat Modeling"],
      agentCount: 0,
      installed: false,
      forkedFrom: false,
      sourceBadge: "github" as const,
      sourceLabel: "acme/security-skills",
    };
    const node = await renderDiscoveryGrid({
      tab: "discover",
      categories: [{ slug: "Security", count: 1 }],
      categoryTotal: 2,
      cards: [localCard, remoteCard],
      totalCount: 2,
    });

    expect(node.querySelector('input[aria-label="Buscar skills disponíveis para descoberta"]')).not.toBeNull();
    expect(node.textContent).toContain("Ordenar");
    expect(node.textContent).toContain("Mais agentes");
    expect(node.textContent).toContain("Todas as origens");
    expect(node.textContent).toContain("2 skills");
    expect(node.textContent).toContain("Ativada para 1 agente");
    expect(node.textContent).toContain("Pasta");
    expect(node.textContent).toContain("por Equipe Azul");
    expect(node.textContent).toContain("acme/security-skills");
    expect(node.textContent).toContain("API threat review");
    expect(node.textContent).toContain("Inspect endpoints for common threats.");
    expect(node.textContent).toContain("Threat Modeling");
    expect(node.textContent).toContain("Derivada");
  });

  it("localizes the production catalog tabs, source labels, and empty state", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    const node = await renderProductionDiscoveryGrid();

    expect(node.textContent).toContain("Loja de skills");
    expect(node.textContent).toContain("Descubra, instale, derive e compartilhe");
    expect(node.textContent).toContain("Todas");
    expect(node.textContent).toContain("Instaladas");
    expect(node.textContent).toContain("Catálogo");
    expect(node.textContent).toContain("Incluídas");
    expect(node.textContent).toContain("Ainda não há skills. Crie uma ou instale uma pelo catálogo.");
    expect(node.textContent).toContain("Explorar catálogo");
    expect(node.textContent).toContain("Importar do GitHub");
  });

  it("preserves remote names and descriptions in the production card presentation", async () => {
    await act(async () => { await i18n.changeLanguage("pt-BR"); });
    const remoteCard = {
      key: "remote-skill",
      skillId: null,
      catalogRef: "remote-1",
      name: "API threat review",
      slug: "api-threat-review",
      author: "Acme Security",
      version: null,
      tagline: null,
      description: "Inspect endpoints for common threats.",
      categories: ["Threat Modeling"],
      iconUrl: null,
      color: null,
      starCount: 0,
      agentCount: 2,
      forkCount: 0,
      installed: false,
      required: false,
      forkedFrom: false,
      updatedAt: 0,
      sourceBadge: "github" as const,
      sourceLabel: "acme/security-skills",
    } satisfies ComponentProps<typeof ProductionDiscoveryGrid>["cards"][number];
    const node = await renderProductionDiscoveryGrid({ cards: [remoteCard], totalCount: 1 });

    expect(node.querySelector('input[aria-label="Buscar skills, autores ou categorias…"]')).not.toBeNull();
    expect(node.textContent).toContain("2 agentes");
    expect(node.textContent).toContain("API threat review");
    expect(node.textContent).toContain("por Acme Security");
    expect(node.textContent).toContain("Inspect endpoints for common threats.");
    expect(node.textContent).toContain("Threat Modeling");
    expect(node.querySelector('[aria-label="De acme/security-skills"]')).not.toBeNull();
  });

  it("makes the search scope explicit for Installed and Discover", async () => {
    let node = await renderDiscoveryGrid({ tab: "installed" });
    expect(node.querySelector('input[aria-label="Search installed skills"]')).not.toBeNull();

    root?.unmount();
    container?.remove();
    root = null;
    container = null;

    node = await renderDiscoveryGrid({ tab: "discover" });
    expect(node.querySelector('input[aria-label="Search discoverable skills"]')).not.toBeNull();
    expect(node.textContent).not.toContain("Catalog");
  });

  it("distinguishes installation from agent enablement on cards", async () => {
    const installedCard = {
      key: "installed",
      skillId: "skill-installed",
      catalogRef: null,
      name: "Installed Skill",
      slug: "installed",
      author: "Paperclip",
      version: null,
      tagline: null,
      description: null,
      categories: [],
      iconUrl: null,
      color: null,
      starCount: 0,
      agentCount: 0,
      forkCount: 0,
      installed: true,
      required: false,
      forkedFrom: false,
      updatedAt: 0,
      sourceBadge: "local" as const,
      sourceLabel: "Local workspace",
    };
    const availableCard = {
      ...installedCard,
      key: "available",
      skillId: null,
      catalogRef: "catalog-available",
      name: "Available Skill",
      slug: "available",
      installed: false,
      sourceBadge: "catalog" as const,
      sourceLabel: "Paperclip catalog",
    };
    const node = await renderDiscoveryGrid({
      tab: "discover",
      cards: [installedCard, availableCard],
      totalCount: 2,
    });

    expect(node.textContent).toContain("Not enabled for any agents");
    expect(node.textContent).toContain("Available to install");
    expect(node.textContent).toContain("Local workspace");
    expect(node.textContent).toContain("Paperclip catalog");
  });

  it("uses the create callback from the New menu and empty state", async () => {
    const onCreate = vi.fn();
    const node = await renderDiscoveryGrid({ onCreate });

    await click(buttonsNamed(node, "Create new skill")[0] as HTMLButtonElement);
    await click(buttonsNamed(node, "Create a skill")[0] as HTMLButtonElement);

    expect(onCreate).toHaveBeenCalledTimes(2);
  });

  it("uses one Discover action instead of Catalog or Bundled navigation", async () => {
    const onBrowseDiscover = vi.fn();
    const node = await renderDiscoveryGrid({ onBrowseDiscover });

    await click(buttonsNamed(node, "Discover skills")[0] as HTMLButtonElement);

    expect(onBrowseDiscover).toHaveBeenCalledOnce();
    expect(node.textContent).not.toContain("Browse catalog");
    expect(node.textContent).not.toContain("Bundled tab");
  });

  it("keeps folder creation in the compact rail control", async () => {
    const props = projectFolderGridProps();
    const node = await renderDiscoveryGrid(props);
    const compactCreateButton = node.querySelector<HTMLButtonElement>('button[title="New folder"]');

    expect(buttonsNamed(node, "New folder")).toHaveLength(0);
    expect(compactCreateButton).not.toBeNull();

    await click(compactCreateButton!);

    expect(props.onCreateFolderIn).toHaveBeenCalledWith(null);
    expect(props.onCreateFolder).not.toHaveBeenCalled();
  });

  it("removes category and folder browse rails while keeping search available", async () => {
    const node = await renderDiscoveryGrid({
      ...projectFolderGridProps(),
      categories: [{ slug: "design", count: 1 }],
      categoryTotal: 1,
      showBrowseRails: false,
    });

    expect(node.querySelector('nav[aria-label="Skill folders"]')).toBeNull();
    expect(node.querySelector("aside")).toBeNull();
    expect(node.textContent).not.toContain("Browse by category");
    expect(node.querySelector('input[aria-label="Search installed skills"]')).not.toBeNull();
  });

  it("omits bulk selection when its entry point is not supplied", async () => {
    const node = await renderDiscoveryGrid({
      ...projectFolderGridProps(),
      onToggleSelectMode: undefined,
    });

    expect(buttonsNamed(node, "Select")).toHaveLength(0);
  });

  it("keeps folder creation available when no folder rail exists", async () => {
    const onCreateFolder = vi.fn();
    const node = await renderDiscoveryGrid({
      ...projectFolderGridProps(),
      folderResult: { ...projectFolderResult, folders: [] },
      onCreateFolder,
    });
    const createButton = buttonsNamed(node, "New folder")[0] as HTMLButtonElement;

    expect(createButton).toBeDefined();

    await click(createButton);

    expect(onCreateFolder).toHaveBeenCalledOnce();
  });

  it("refreshes only the project represented by the active project folder", async () => {
    const onScan = vi.fn();
    const node = await renderDiscoveryGrid({
      ...projectFolderGridProps(),
      folderSelection: "project-folder",
      onScan,
    });
    const refreshButton = node.querySelector<HTMLButtonElement>(
      'button[aria-label="Refresh Acme project skills"]',
    );

    expect(refreshButton).not.toBeNull();

    await click(refreshButton!);

    expect(onScan).toHaveBeenCalledOnce();
    expect(onScan).toHaveBeenCalledWith("project-1");
  });

  it("does not open a skill when keyboard-activating its actions button", async () => {
    const onOpenCard = vi.fn();
    const card = {
      key: "demo-skill",
      skillId: "skill-1",
      folderId: null,
      catalogRef: null,
      name: "Demo Skill",
      slug: "demo-skill",
      author: "Paperclip",
      version: null,
      tagline: null,
      description: null,
      categories: [],
      iconUrl: null,
      color: null,
      starCount: 0,
      agentCount: 0,
      forkCount: 0,
      installed: true,
      required: false,
      forkedFrom: false,
      updatedAt: 0,
    };
    const node = await renderDiscoveryGrid({
      cards: [card],
      totalCount: 1,
      onOpenCard,
      folderResult: { kind: "skill", folders: [], allCount: 1, unfiledCount: 1 },
      onMoveCard: vi.fn(),
      onCreateFolderAndMoveCard: vi.fn(),
    });
    const actionsButton = node.querySelector<HTMLButtonElement>('[aria-label="More actions for Demo Skill"]');

    await act(async () => {
      actionsButton?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onOpenCard).not.toHaveBeenCalled();
  });

  it("does not offer move actions for skills in the bundled folder", async () => {
    const card = {
      key: "bundled-skill",
      skillId: "skill-1",
      folderId: "bundled-folder",
      catalogRef: null,
      name: "Bundled Skill",
      slug: "bundled-skill",
      author: "Paperclip",
      version: null,
      tagline: null,
      description: null,
      categories: [],
      iconUrl: null,
      color: null,
      starCount: 0,
      agentCount: 0,
      forkCount: 0,
      installed: true,
      required: false,
      forkedFrom: false,
      updatedAt: 0,
    };
    const node = await renderDiscoveryGrid({
      cards: [card],
      totalCount: 1,
      selectMode: true,
      folderResult: {
        kind: "skill",
        folders: [{
          id: "bundled-folder",
          companyId: "company-1",
          kind: "skill",
          parentId: null,
          name: "Bundled",
          slug: "bundled",
          systemKey: "bundled",
          path: "bundled",
          depth: 1,
          color: null,
          position: 0,
          createdAt: new Date("2026-01-01T00:00:00Z"),
          updatedAt: new Date("2026-01-01T00:00:00Z"),
          itemCount: 1,
        }],
        allCount: 1,
        unfiledCount: 0,
      },
      onMoveCard: vi.fn(),
      onCreateFolderAndMoveCard: vi.fn(),
      onOpenMoveCard: vi.fn(),
    });

    expect(node.querySelector('[aria-label="More actions for Bundled Skill"]')).toBeNull();
    expect(node.querySelector('input[type="checkbox"]')).toBeNull();
    expect(node.textContent).not.toContain("Move to folder");
  });
});

describe("skills discovery tab routing", () => {
  it("opens the folder-first installed view when the URL has no tab", () => {
    expect(resolveDiscoveryTab(null)).toBe("installed");
    expect(resolveDiscoveryTab("all")).toBe("discover");
    expect(resolveDiscoveryTab("catalog")).toBe("discover");
    expect(resolveDiscoveryTab("bundled")).toBe("discover");
  });

  it("uses Discover as the only explicit discovery URL and Installed as the default", () => {
    const discoverParams = withDiscoveryTab(new URLSearchParams("folder=my&category=writing"), "discover");
    expect(discoverParams.toString()).toBe("tab=discover");

    const installedParams = withDiscoveryTab(new URLSearchParams("tab=all&folder=my"), "installed");
    expect(installedParams.toString()).toBe("folder=my");
  });
});

describe("skills discovery card reconciliation", () => {
  it("renders one installed card when installed and catalog data share a key", () => {
    const installed = {
      id: "installed-new",
      key: "PaperclipAI/Review",
      name: "Review",
      slug: "review",
      updatedAt: new Date("2026-08-30T00:00:00Z"),
      folderId: null,
      authorName: "Paperclip",
      packageVersion: "2.0.0",
      sourceRef: null,
      tagline: null,
      description: "Installed copy",
      categories: [],
      iconUrl: null,
      color: null,
      starCount: 0,
      attachedAgentCount: 2,
      forkCount: 0,
      catalogKind: "optional",
      forkedFromSkillId: null,
      sourceBadge: "catalog",
      sourceLabel: "Paperclip",
    } as unknown as CompanySkillListItem;
    const olderDuplicate = {
      ...installed,
      id: "installed-old",
      key: "paperclipai/review",
      updatedAt: new Date("2026-08-01T00:00:00Z"),
    } as CompanySkillListItem;
    const catalog = {
      id: "catalog-review",
      key: "paperclipai/review",
      name: "Review",
      slug: "review",
      kind: "optional",
      category: "quality",
      description: "Catalog copy",
      packageName: "Paperclip",
      packageVersion: "2.0.0",
      tags: [],
    } as unknown as CatalogSkill;

    const cards = buildDiscoveryCards([olderDuplicate, installed], [catalog, { ...catalog, id: "catalog-duplicate" }]);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      skillId: "installed-new",
      catalogRef: "catalog-review",
      installed: true,
      agentCount: 2,
      sourceKind: "optional",
    });
  });
});

describe("skill detail breadcrumbs", () => {
  it("links each folder ancestor back to the installed folder view", () => {
    const folders: FolderListResult = {
      kind: "skill",
      allCount: 1,
      unfiledCount: 0,
      folders: [
        {
          id: "my-root",
          companyId: "company-1",
          kind: "skill",
          parentId: null,
          name: "My Skills",
          slug: "my",
          systemKey: "my",
          path: "my",
          depth: 1,
          color: null,
          position: 0,
          itemCount: 1,
          createdAt: new Date("2026-07-16T00:00:00.000Z"),
          updatedAt: new Date("2026-07-16T00:00:00.000Z"),
        },
        {
          id: "review-folder",
          companyId: "company-1",
          kind: "skill",
          parentId: "my-root",
          name: "Review",
          slug: "review",
          systemKey: null,
          path: "my/review",
          depth: 2,
          color: null,
          position: 0,
          itemCount: 1,
          createdAt: new Date("2026-07-16T00:00:00.000Z"),
          updatedAt: new Date("2026-07-16T00:00:00.000Z"),
        },
      ],
    };

    expect(skillDetailBreadcrumbs({ name: "Deal with PR", folderId: "review-folder" }, folders)).toEqual([
      { label: "Skills", href: "/skills" },
      { label: "My Skills", href: "/skills?folder=my-root" },
      { label: "Review", href: "/skills?folder=review-folder" },
      { label: "Deal with PR" },
    ]);
  });
});

describe("skillStudioNewRoute", () => {
  it("builds a direct fork draft URL for a specific skill", () => {
    expect(skillStudioNewRoute("skill 1")).toBe("/skills/studio/new?forkFrom=skill%201");
  });
});

async function verifyLocalizedSkillDetailVariant(Component: typeof SkillDetailPage) {
  await act(async () => { await i18n.changeLanguage("pt-BR"); });
  const version = makeVersion(1, "# Demo Skill");
  const detail = makeDetail(version, {
    description: "Review repository permissions.",
    authorName: "Equipe Azul",
    sourceBadge: "local",
    sourceLabel: null,
    sourceRef: "1234567890abcdef",
    folderPath: "my/ada/code-review",
    metadata: {
      skillSourceId: "source-1",
      skillSourceState: "removed",
      skillSourcePath: "acme/security-skills",
    },
  });

  let node = await renderSkillDetail([version], { activeTab: "overview", detail }, Component);

  expect(node.textContent).toContain("Visão geral");
  expect(node.textContent).toContain("Arquivos");
  expect(node.textContent).toContain("Sobre");
  expect(node.textContent).toContain("Chave");
  expect(node.textContent).toContain("Origem");
  expect(node.textContent).toContain("Versão");
  expect(node.textContent).toContain("Modo");
  expect(node.textContent).toContain("Minhas skills / Ada / Code Review");
  expect(node.textContent).toContain("Removida da origem · última versão instalada mantida");
  expect(node.textContent).toContain("acme/security-skills · 12345678");
  expect(node.textContent).toContain("Demo Skill");
  expect(node.textContent).toContain("Review repository permissions.");

  await act(async () => { root?.unmount(); });
  root = null;
  container?.remove();
  container = null;

  const file: CompanySkillFileDetail = {
    skillId: detail.id,
    path: "docs/Review Guide.md",
    kind: "skill",
    content: "# Review checklist",
    language: "markdown",
    markdown: true,
    editable: false,
  };
  node = await renderSkillDetail([version], {
    activeTab: "files",
    detail,
    selectedPath: file.path,
    file,
  }, Component);

  expect(node.textContent).toContain("Visualizar");
  expect(node.textContent).toContain("Código");
  expect(node.textContent).toContain("docs/Review Guide.md");
  expect(node.textContent).toContain("Review checklist");
}

describe("Skill detail localization", () => {
  it("localizes the streamlined detail and file browser while preserving skill metadata", async () => {
    await verifyLocalizedSkillDetailVariant(SkillDetailPage);
  });

  it("localizes the production detail and file browser while preserving skill metadata", async () => {
    await verifyLocalizedSkillDetailVariant(ProductionSkillDetailPage);
  });
});

async function verifyLocalizedCatalogDetailVariant(Component: typeof CatalogDetailPane) {
  await act(async () => { await i18n.changeLanguage("pt-BR"); });
  const skill: CatalogSkill = {
    id: "catalog-security-audit",
    key: "paperclipai/optional/engineering/security-audit",
    kind: "optional",
    category: "engineering",
    slug: "security-audit",
    name: "Security audit",
    description: "Review repository permissions.",
    path: "catalog/optional/engineering/security-audit",
    entrypoint: "SKILL.md",
    trustLevel: "markdown_only",
    compatibility: "compatible",
    defaultInstall: false,
    recommendedForRoles: ["Engineering"],
    requires: ["git"],
    tags: ["security-review"],
    files: [{ path: "SKILL.md", kind: "skill", sizeBytes: 128, sha256: "abc123" }],
    contentHash: "sha256:abc12345678901234567890123456789",
  };
  const node = await renderCatalogDetail(Component, {
    skill,
    packageName: "Paperclip",
    packageVersion: "2.0.0",
    installedSkill: null,
    installedSkillId: null,
    fileQuery: {
      data: {
        catalogSkillId: skill.id,
        path: "guides/Checklist.md",
        kind: "skill",
        content: "# External guide\n\nPreserve this heading.",
        language: "markdown",
        markdown: true,
      },
      isLoading: false,
      error: null,
    },
    selectedPath: "guides/Checklist.md",
    onInstall: vi.fn(),
    onUpdate: vi.fn(),
    onOpenInstalled: vi.fn(),
    loadingPrimaryAction: false,
  });

  expect(node.textContent).toContain("Security audit");
  expect(node.textContent).toContain("Review repository permissions.");
  expect(node.textContent).toContain("Instalar skill nesta organização");
  expect(node.textContent).toContain("Opcional");
  expect(node.textContent).toContain("Requisitos: git");
  expect(node.textContent).toContain("Funções: Engineering");
  expect(node.textContent).toContain("Tags: security-review");
  expect(node.textContent).toContain("Chave");
  expect(node.textContent).toContain(skill.key);
  expect(node.textContent).toContain("Hash");
  expect(node.textContent).toContain("Somente Markdown");
  expect(node.textContent).toContain("Instalada do catálogo incluído no aplicativo.");
  expect(node.textContent).toContain("guides/Checklist.md");
  expect(node.textContent).toContain("External guide");
  expect(node.textContent).toContain("Preserve this heading.");
}

async function renderCatalogDetail(
  Component: typeof CatalogDetailPane,
  props: ComponentProps<typeof CatalogDetailPane>,
) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<Component {...props} />);
  });

  return container as ParentNode;
}

describe("catalog skill detail localization", () => {
  it("localizes catalog details and file navigation while preserving catalog content", async () => {
    await verifyLocalizedCatalogDetailVariant(CatalogDetailPane);
  });

  it("localizes production catalog details and file navigation while preserving catalog content", async () => {
    await verifyLocalizedCatalogDetailVariant(ProductionCatalogDetailPane);
  });
});

describe("SkillDetailPage versions tab", () => {
  it("opens per-row version diffs for newest and oldest revisions", async () => {
    const v1 = makeVersion(1, "# Demo Skill\n\nFirst line");
    const v2 = makeVersion(2, "# Demo Skill\n\nSecond line");
    const node = await renderSkillDetail([v2, v1]);
    const viewDiffButtons = buttonsNamed(node, "View diff") as HTMLButtonElement[];

    expect(viewDiffButtons).toHaveLength(2);

    await click(viewDiffButtons[0]!);
    let dialog = node.querySelector('[role="dialog"]') as HTMLElement;
    let selects = Array.from(dialog.querySelectorAll("select"));

    expect(dialog.textContent).toContain("Diff");
    expect(selects[0]?.value).toBe(v1.id);
    expect(selects[1]?.value).toBe(v2.id);
    expect(dialog.textContent).toContain("Second line");

    await click(viewDiffButtons[1]!);
    dialog = node.querySelector('[role="dialog"]') as HTMLElement;
    selects = Array.from(dialog.querySelectorAll("select"));

    expect(selects[0]?.value).toBe("");
    expect(selects[1]?.value).toBe(v1.id);
    expect(dialog.textContent).toContain("Initial");
    expect(dialog.textContent).toContain("First line");
    expect(dialog.textContent).not.toContain("Both sides are the same version");
  });
});

describe("SkillDetailPage settings", () => {
  it("humanizes the server folder path on a cold detail render", async () => {
    const v1 = makeVersion(1, "# Demo Skill");
    const node = await renderSkillDetail([v1], {
      activeTab: "overview",
      detail: makeDetail(v1, { folderPath: "engineering/code-review" }),
    });

    expect(node.textContent).toContain("Organization / Engineering / Code Review");
  });

  it("shows a direct make-a-copy action for read-only GitHub skills", async () => {
    const v1 = makeVersion(1, "# Demo Skill");
    const onFork = vi.fn();
    const node = await renderSkillDetail([v1], {
      activeTab: "overview",
      detail: makeDetail(v1, {
        editable: false,
        editableReason: "Remote GitHub skills are read-only. Fork or import locally to edit them.",
        sourceBadge: "github",
        sourceLabel: "GitHub",
        sourceType: "github",
      }),
      onFork,
    });

    expect(node.textContent).not.toContain("Fork or import locally");

    const forkButton = buttonsNamed(node, "Make a copy")[0] as HTMLButtonElement;
    expect(forkButton).toBeTruthy();

    await click(forkButton);

    expect(onFork).toHaveBeenCalledOnce();
  });

  it("renders long source paths in full so they can wrap inside the sidebar", async () => {
    const v1 = makeVersion(1, "# Demo Skill");
    const longSourcePath = "/srv/paperclip/home/paperclipai/paperclip/.agents/skills/prepare-pr/SKILL.md";
    const node = await renderSkillDetail([v1], {
      activeTab: "agents",
      detail: makeDetail(v1, {
        sourcePath: longSourcePath,
        sourceLocator: null,
      }),
    });

    const sourceValue = Array.from(node.querySelectorAll("div")).find((element) =>
      element.textContent === longSourcePath,
    );

    expect(sourceValue).toBeTruthy();
    expect(sourceValue?.className).toContain("[overflow-wrap:anywhere]");
    expect(node.textContent).not.toContain("...");
  });

  it("saves normalized category edits from the settings dialog", async () => {
    const v1 = makeVersion(1, "# Demo Skill");
    const onUpdateSettings = vi.fn();
    const node = await renderSkillDetail([v1], {
      activeTab: "overview",
      detail: makeDetail(v1, {
        categories: ["engineering"],
        sharingScope: "company",
      }),
      onUpdateSettings,
    });

    await click(buttonsNamed(node, "Settings")[0] as HTMLButtonElement);
    const dialog = node.querySelector('[role="dialog"]') as HTMLElement;
    const categoryInput = dialog.querySelector("input") as HTMLInputElement;
    const saveButton = buttonsNamed(dialog, "Save settings")[0] as HTMLButtonElement;

    expect(categoryInput.value).toBe("engineering");

    await inputValue(categoryInput, " Memory Tools, review, memory tools ,,");
    await click(saveButton);

    expect(onUpdateSettings).toHaveBeenCalledWith({
      sharingScope: "company",
      categories: ["Memory Tools", "review"],
    });
  });

  it("allows clearing categories and saving sharing together", async () => {
    const v1 = makeVersion(1, "# Demo Skill");
    const onUpdateSettings = vi.fn();
    const node = await renderSkillDetail([v1], {
      activeTab: "overview",
      detail: makeDetail(v1, {
        categories: ["engineering"],
        sharingScope: "company",
      }),
      onUpdateSettings,
    });

    await click(buttonsNamed(node, "Settings")[0] as HTMLButtonElement);
    const dialog = node.querySelector('[role="dialog"]') as HTMLElement;

    await inputValue(dialog.querySelector("input") as HTMLInputElement, "");
    await selectValue(dialog.querySelector("select") as HTMLSelectElement, "private");
    await click(buttonsNamed(dialog, "Save settings")[0] as HTMLButtonElement);

    expect(onUpdateSettings).toHaveBeenCalledWith({
      sharingScope: "private",
      categories: [],
    });
  });

  it("does not treat reordered categories as dirty", async () => {
    const v1 = makeVersion(1, "# Demo Skill");
    const node = await renderSkillDetail([v1], {
      activeTab: "overview",
      detail: makeDetail(v1, {
        categories: ["memory", "review"],
        sharingScope: "company",
      }),
    });

    await click(buttonsNamed(node, "Settings")[0] as HTMLButtonElement);
    const dialog = node.querySelector('[role="dialog"]') as HTMLElement;

    await inputValue(dialog.querySelector("input") as HTMLInputElement, "review, memory");

    expect((buttonsNamed(dialog, "Save settings")[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the category draft visible while a failed save leaves detail unchanged", async () => {
    const v1 = makeVersion(1, "# Demo Skill");
    const detail = makeDetail(v1, {
      categories: ["engineering"],
      sharingScope: "company",
    });
    const onUpdateSettings = vi.fn();
    const node = await renderSkillDetail([v1], {
      activeTab: "overview",
      detail,
      onUpdateSettings,
    });

    await click(buttonsNamed(node, "Settings")[0] as HTMLButtonElement);
    const categoryInput = node.querySelector('[role="dialog"] input') as HTMLInputElement;

    await inputValue(categoryInput, "memory");
    await click(buttonsNamed(node.querySelector('[role="dialog"]') as HTMLElement, "Save settings")[0] as HTMLButtonElement);

    await act(async () => {
      root?.render(
        <SkillDetailPage
          detail={detail}
          loading={false}
          activeTab="overview"
          onTabChange={vi.fn()}
          selectedPath="SKILL.md"
          file={null}
          fileLoading={false}
          viewMode="preview"
          editMode={false}
          draft=""
          setViewMode={vi.fn()}
          setEditMode={vi.fn()}
          setDraft={vi.fn()}
          onSave={vi.fn()}
          savePending={false}
          versions={[v1]}
          versionsLoading={false}
          attachAgents={[]}
          onSubmitAttach={vi.fn()}
          attachPending={false}
          expandedDirs={new Set()}
          onToggleDir={vi.fn()}
          onSelectPath={vi.fn()}
          updateStatus={null}
          updateStatusLoading={false}
          onCheckUpdates={vi.fn()}
          checkUpdatesPending={false}
          onInstallUpdate={vi.fn()}
          installUpdatePending={false}
          onToggleStar={vi.fn()}
          starPending={false}
          onFork={vi.fn()}
          onUpdateSettings={onUpdateSettings}
          updateSettingsPending={false}
          onDelete={vi.fn()}
          deletePending={false}
        />,
      );
    });

    expect((node.querySelector('[role="dialog"] input') as HTMLInputElement).value).toBe("memory");
  });
});

describe("install-time agent enablement", () => {
  const agentOptions = [
    { id: "agent-ceo", name: "CEO", adapterType: "claude_local", supportsSkills: true, required: false, icon: null, paused: false },
    { id: "agent-designer", name: "Designer", adapterType: "claude_local", supportsSkills: true, required: false, icon: null, paused: true },
    { id: "agent-gateway", name: "Gateway", adapterType: "openclaw_gateway", supportsSkills: false, required: false, icon: null, paused: false },
    { id: "agent-builtin", name: "Summarizer", adapterType: "claude_local", supportsSkills: true, required: true, icon: null, paused: false },
  ];

  function makeCatalogSkill(): CatalogSkill {
    return {
      id: "catalog-1",
      key: "paperclipai/bundled/product/wireframe",
      kind: "bundled",
      category: "product",
      slug: "wireframe",
      name: "wireframe",
      description: "Draw wireframes.",
      path: "catalog/bundled/product/wireframe",
      entrypoint: "SKILL.md",
      trustLevel: "markdown_only",
      compatibility: "compatible",
      defaultInstall: false,
      recommendedForRoles: [],
      requires: [],
      tags: [],
      files: [{ path: "SKILL.md", kind: "skill", sizeBytes: 128, sha256: "abc" }],
      contentHash: "sha256:abc",
    };
  }

  it("defaults to every skills-capable, non-required agent", () => {
    expect(defaultInstallAgentSelection(agentOptions)).toEqual(new Set(["agent-ceo", "agent-designer"]));
  });

  it("passes the default agent selection through onConfirm for fresh installs", async () => {
    const onConfirm = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <InstallPreviewDialog
          open
          onOpenChange={vi.fn()}
          skill={makeCatalogSkill()}
          packageName={null}
          packageVersion={null}
          conflict={null}
          defaultSlug="wireframe"
          defaultForce={false}
          defaultAction="install"
          agents={agentOptions}
          isPending={false}
          error={null}
          onConfirm={onConfirm}
        />,
      );
    });

    const node = container as ParentNode;
    expect(node.textContent).toContain("Enable for agents");

    await click(buttonsNamed(node, "Install skill")[0] as HTMLButtonElement);

    expect(onConfirm).toHaveBeenCalledWith({
      slug: "wireframe",
      force: false,
      agentIds: expect.arrayContaining(["agent-ceo", "agent-designer"]),
    });
    expect(onConfirm.mock.calls[0][0].agentIds).toHaveLength(2);
  });

  it("keeps tracking the agent default when agents load after the dialog opens", async () => {
    const onConfirm = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    const renderDialog = (agents: typeof agentOptions) =>
      root?.render(
        <InstallPreviewDialog
          open
          onOpenChange={vi.fn()}
          skill={makeCatalogSkill()}
          packageName={null}
          packageVersion={null}
          conflict={null}
          defaultSlug="wireframe"
          defaultForce={false}
          defaultAction="install"
          agents={agents}
          isPending={false}
          error={null}
          onConfirm={onConfirm}
        />,
      );

    // Dialog opens before the agents query resolves: nothing to select yet.
    await act(async () => renderDialog([]));

    // The agents arrive later; the untouched selection must pick them up.
    await act(async () => renderDialog(agentOptions));

    await click(buttonsNamed(container as ParentNode, "Install skill")[0] as HTMLButtonElement);

    expect(onConfirm.mock.calls[0][0].agentIds).toHaveLength(2);
  });

  it("skips agent enablement for updates and replacements", async () => {
    const onConfirm = vi.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <InstallPreviewDialog
          open
          onOpenChange={vi.fn()}
          skill={makeCatalogSkill()}
          packageName={null}
          packageVersion={null}
          conflict={null}
          defaultSlug="wireframe"
          defaultForce={false}
          defaultAction="update"
          agents={agentOptions}
          isPending={false}
          error={null}
          onConfirm={onConfirm}
        />,
      );
    });

    const node = container as ParentNode;
    expect(node.textContent).not.toContain("Enable for agents");

    await click(buttonsNamed(node, "Install update")[0] as HTMLButtonElement);

    expect(onConfirm).toHaveBeenCalledWith({ slug: "wireframe", force: false, agentIds: [] });
  });
});
