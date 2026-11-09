import {
  AssigneePicker,
  FileTree,
  IssuesList as PluginIssuesList,
  ManagedRoutinesList as PluginManagedRoutinesList,
  MarkdownBlock,
  MarkdownEditor,
  ProjectPicker,
  usePluginAction,
  usePluginData,
  usePluginStream,
  usePluginToast,
  useHostLocation,
  useHostNavigation,
  type FileTreeNode,
  type ManagedRoutinesListItem,
  type PluginPageProps,
  type PluginRouteSidebarProps,
  type PluginSettingsPageProps,
  type PluginSidebarProps,
} from "@paperclipai/plugin-sdk/ui";
import { useCallback, useEffect, useMemo, useRef, useState, type AnchorHTMLAttributes, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { readIngestOperationIssueId, uploadIssueAttachmentFile } from "./issue-attachments.js";
import {
  formatWikiRelativeTime,
  formatWikiTimestamp,
  resolveWikiLocale,
  wikiMessage,
  type WikiLocale,
  type WikiMessageKey,
} from "./messages.js";

// ---------------------------------------------------------------------------
// Shared design tokens — copied from the UX wireframe shared.css so the plugin
// looks identical inside the host whether or not host theme tokens are
// available at runtime.
// ---------------------------------------------------------------------------

const tokens = {
  border: "var(--border, oklch(0.269 0 0))",
  card: "var(--card, oklch(0.205 0 0))",
  bg: "var(--background, oklch(0.145 0 0))",
  fg: "var(--foreground, oklch(0.985 0 0))",
  muted: "var(--muted-foreground, oklch(0.708 0 0))",
  accent: "var(--accent, oklch(0.269 0 0))",
  primary: "var(--primary, oklch(0.985 0 0))",
  primaryFg: "var(--primary-foreground, oklch(0.205 0 0))",
  destructive: "var(--destructive, oklch(0.637 0.237 25.331))",
  pluginBg: "oklch(0.3 0.06 70)",
  pluginFg: "oklch(0.92 0.08 80)",
  pluginBorder: "oklch(0.55 0.15 70)",
  hiddenOpBg: "oklch(0.27 0.04 280)",
  hiddenOpFg: "oklch(0.85 0.08 280)",
  hiddenOpBorder: "oklch(0.45 0.1 280)",
  callout: { bg: "oklch(0.2 0.04 250)", fg: "oklch(0.85 0.08 250)", border: "oklch(0.4 0.1 250)" },
  statusDone: "oklch(0.65 0.16 145)",
  statusRunning: "oklch(0.7 0.13 200)",
  statusBlocked: "oklch(0.6 0.21 25)",
  statusInProgress: "oklch(0.58 0.18 280)",
  statusTodo: "oklch(0.6 0.17 250)",
  statusPaused: "oklch(0.72 0.15 70)",
};

type Tone = "todo" | "in_progress" | "in_review" | "done" | "blocked" | "running" | "paused" | "failed" | "queued" | "default";

const toneStyles: Record<Tone, CSSProperties> = {
  default: { background: "var(--secondary, oklch(0.269 0 0))", color: tokens.fg, border: `1px solid ${tokens.border}` },
  todo: { background: "oklch(0.27 0.06 250)", color: "oklch(0.85 0.1 250)" },
  in_progress: { background: "oklch(0.27 0.06 280)", color: "oklch(0.85 0.1 280)" },
  in_review: { background: "oklch(0.27 0.07 305)", color: "oklch(0.85 0.1 305)" },
  done: { background: "oklch(0.27 0.06 145)", color: "oklch(0.85 0.1 145)" },
  blocked: { background: "oklch(0.27 0.08 25)", color: "oklch(0.82 0.13 25)" },
  running: { background: "oklch(0.27 0.06 200)", color: "oklch(0.83 0.11 200)" },
  paused: { background: "oklch(0.27 0.07 70)", color: "oklch(0.85 0.1 70)" },
  failed: { background: "oklch(0.27 0.08 25)", color: "oklch(0.82 0.13 25)" },
  queued: { background: "oklch(0.27 0.06 250)", color: "oklch(0.85 0.1 250)" },
};

const fontStack = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const mobileMediaQuery = "(max-width: 767px)";
const PLUGIN_ID = "paperclipai.plugin-llm-wiki";
const WIKI_SIDEBAR_NAV_STATE_KEY = "paperclipWikiSidebarTreePath";
const ROUTE_SIDEBAR_EXPANDED_STORAGE_PREFIX = `${PLUGIN_ID}:route-sidebar-expanded:v2`;
const WIKI_TOC_STICKY_TOP = 88;
const WIKI_SPACE_PREFETCH_LIMIT = 8;
const DEFAULT_ROUTE_SIDEBAR_EXPANDED_PATHS = [
  "wiki",
  "wiki/sources",
  "wiki/projects",
  "wiki/entities",
  "wiki/concepts",
  "wiki/synthesis",
] as const;

// ---------------------------------------------------------------------------
// Shared types coming back from the worker.
// ---------------------------------------------------------------------------

type FolderStatus = {
  configured: boolean;
  path: string | null;
  realPath: string | null;
  access: "read" | "readWrite";
  readable: boolean;
  writable: boolean;
  requiredDirectories: string[];
  requiredFiles: string[];
  missingDirectories: string[];
  missingFiles: string[];
  healthy: boolean;
  problems: { code: string; message: string; path?: string }[];
  checkedAt: string;
};

type ManagedAgent = {
  status: string;
  source?: "managed" | "selected";
  agentId?: string | null;
  resourceKey?: string | null;
  details?: { name?: string; status?: string; adapterType?: string | null; icon?: string | null; urlKey?: string | null } | null;
  defaultDrift?: { entryFile: string; changedFiles: string[] } | null;
};

type ManagedProject = {
  status: string;
  source?: "managed" | "selected";
  projectId?: string | null;
  resourceKey?: string | null;
  details?: { name?: string; status?: string; color?: string | null } | null;
};

type ManagedRoutine = {
  status: string;
  routineId?: string | null;
  pluginKey?: string | null;
  resourceKind?: string | null;
  resourceKey?: string | null;
  missingRefs?: Array<{ pluginKey?: string; resourceKind: string; resourceKey: string }>;
  defaultDrift?: {
    changedFields: string[];
    defaultTitle?: string | null;
    defaultDescription?: string | null;
  } | null;
  routine?: {
    id?: string;
    title?: string;
    status?: string;
    assigneeAgentId?: string | null;
    projectId?: string | null;
    lastTriggeredAt?: string | null;
    lastEnqueuedAt?: string | null;
    managedByPlugin?: {
      pluginDisplayName?: string;
      resourceKey?: string;
    } | null;
  } | null;
  details?: {
    title?: string;
    status?: string;
    cronExpression?: string | null;
    enabled?: boolean;
    nextRunAt?: string | null;
    lastRunAt?: string | null;
    assigneeAgentId?: string | null;
  } | null;
};

type ManagedRoutineDefaultDrift = NonNullable<ManagedRoutine["defaultDrift"]>;
type ManagedRoutinesListItemWithDrift = ManagedRoutinesListItem & {
  defaultDrift?: ManagedRoutineDefaultDrift | null;
};

type ManagedSkill = {
  status: string;
  skillId?: string | null;
  pluginKey?: string | null;
  resourceKind?: string | null;
  resourceKey?: string | null;
  defaultDrift?: { changedFiles: string[] } | null;
  skill?: {
    id?: string;
    name?: string;
    key?: string;
    description?: string | null;
  } | null;
  details?: {
    name?: string;
    key?: string;
    description?: string | null;
  } | null;
};

type OverviewData = {
  status: "ok";
  checkedAt: string;
  wikiId: string;
  folder: FolderStatus;
  managedAgent: ManagedAgent;
  managedProject: ManagedProject;
  managedSkills: ManagedSkill[];
  operationCount: number;
  eventIngestion: EventIngestionSettings;
  capabilities: string[];
  prompts: { query: string; lint: string };
};

type EventIngestionSettings = {
  enabled: boolean;
  sources: {
    issues: boolean;
    comments: boolean;
    documents: boolean;
  };
  wikiId: string;
  maxCharacters: number;
};

type WikiEventIngestionSource = "issues" | "comments" | "documents";

type PaperclipIngestionSourceScope =
  | { kind: "active_projects"; limit: number; statuses?: Array<"in_progress" | "todo" | "done"> }
  | { kind: "selected_projects"; projectIds: string[] }
  | { kind: "root_issues"; issueIds: string[] }
  | { kind: "company_all"; requiresBoardConfirmation: true };

type PaperclipIngestionProfile = {
  version: 1;
  enabled: boolean;
  sourceScopes: PaperclipIngestionSourceScope[];
  sourceKinds: {
    issues: boolean;
    comments: boolean;
    documents: boolean;
    attachments: "off" | "metadata_only";
    workProducts: "off" | "metadata_only";
  };
  cursor: {
    maxWindowCharacters: number;
    maxCharactersPerSource: number;
    minSourceAgeMinutes: number;
    maxWindowsPerRun: number;
    staleAfterHours: number;
  };
  backfill: {
    defaultStartAt?: string | null;
    defaultEndAt?: string | null;
    requireManualQueue: boolean;
  };
};

type PaperclipIngestionProfileData = {
  wikiId: string;
  space: Pick<WikiSpace, "id" | "slug" | "displayName" | "accessScope" | "status">;
  profile: PaperclipIngestionProfile;
  effectiveState: "enabled" | "disabled" | "policy_blocked" | "pending_approval" | "enabled_no_scopes";
  policyBlocks: string[];
  historicalPageCount: number;
  overlapCount: number;
};

type SettingsData = {
  folder: FolderStatus;
  managedAgent: ManagedAgent;
  managedProject: ManagedProject;
  managedRoutine?: ManagedRoutine;
  managedRoutines?: ManagedRoutine[];
  managedSkills?: ManagedSkill[];
  distillationPolicy?: {
    autoApplyAllowed: boolean;
    autoApplyRestriction: string | null;
    deploymentMode: "local_trusted" | "authenticated" | null;
    deploymentExposure: "private" | "public" | null;
  };
  eventIngestion: EventIngestionSettings;
  agentOptions: Array<{ id: string; name: string; status?: string | null; adapterType?: string | null; icon?: string | null; urlKey?: string | null }>;
  projectOptions: Array<{ id: string; name: string; status?: string | null; color?: string | null }>;
  capabilities: string[];
};

type WikiSpace = {
  id: string;
  companyId: string;
  wikiId: string;
  slug: string;
  displayName: string;
  spaceType: string;
  folderMode: string;
  rootFolderKey: string;
  pathPrefix: string | null;
  configuredRootPath: string | null;
  accessScope: string;
  ownerUserId: string | null;
  ownerAgentId: string | null;
  teamKey: string | null;
  settings: Record<string, unknown>;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type WikiSpacesData = {
  spaces: WikiSpace[];
};

type WikiSpaceWithFolderStatus = WikiSpace & {
  relativeRoot: string;
  folder: FolderStatus;
};

const DEFAULT_SPACE_SLUG = "default";

type WikiPageRow = {
  path: string;
  title: string | null;
  pageType: string | null;
  backlinkCount: number;
  sourceCount: number;
  contentHash: string | null;
  updatedAt: string;
};

type WikiSourceRow = {
  rawPath: string;
  title: string | null;
  sourceType: string;
  url: string | null;
  status: string;
  createdAt: string;
};

type PagesData = {
  pages: WikiPageRow[];
  sources: WikiSourceRow[];
};

type PageContentData = {
  wikiId: string;
  path: string;
  contents: string;
  title: string | null;
  pageType: string | null;
  backlinks: string[];
  sourceRefs: Array<Record<string, unknown> | string>;
  updatedAt: string | null;
  hash: string;
};

type WikiOperationRow = {
  id: string;
  operationType: string;
  status: string;
  hiddenIssueId: string | null;
  hiddenIssueIdentifier: string | null;
  hiddenIssueTitle: string | null;
  hiddenIssueStatus: string | null;
  projectId: string | null;
  runIds: unknown[];
  costCents: number;
  warnings: unknown[];
  affectedPages: unknown[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type OperationsData = {
  operations: WikiOperationRow[];
};

type TemplateData = {
  path: string;
  contents: string;
  hash: string | null;
  exists: boolean;
};

type WikiFrontmatterValue = string | string[];

type WikiFrontmatterProperty = {
  key: string;
  value: WikiFrontmatterValue;
};

type ParsedWikiMarkdown = {
  body: string;
  frontmatter: WikiFrontmatterProperty[];
};

type WikiTocHeading = {
  id: string;
  text: string;
  level: number;
};

// ---------------------------------------------------------------------------
// Small presentational primitives.
// ---------------------------------------------------------------------------

function Badge({ children, tone = "default", style }: { children: ReactNode; tone?: Tone; style?: CSSProperties }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 500,
      whiteSpace: "nowrap",
      ...toneStyles[tone],
      ...style,
    }}>{children}</span>
  );
}

function HiddenOpBadge({ locale }: { locale: WikiLocale }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 500,
      background: tokens.hiddenOpBg,
      color: tokens.hiddenOpFg,
      border: `1px solid ${tokens.hiddenOpBorder}`,
    }}>{wikiMessage(locale, "wikiTaskBadge")}</span>
  );
}

function StatusIcon({ status }: { status: string }) {
  const map: Record<string, { color: string; filled?: boolean; pulse?: boolean }> = {
    done: { color: tokens.statusDone, filled: true },
    in_progress: { color: tokens.statusInProgress },
    running: { color: tokens.statusRunning, pulse: true },
    queued: { color: tokens.statusTodo },
    todo: { color: tokens.statusTodo },
    blocked: { color: tokens.statusBlocked },
    failed: { color: tokens.statusBlocked },
    paused: { color: tokens.statusPaused },
  };
  const tone = map[status] ?? { color: tokens.muted };
  return (
    <span style={{
      width: 12,
      height: 12,
      flexShrink: 0,
      borderRadius: "50%",
      border: `2px solid ${tone.color}`,
      background: tone.filled ? tone.color : "transparent",
      animation: tone.pulse ? "pcWikiPulse 1.6s infinite" : undefined,
    }} aria-hidden />
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{
      background: tokens.card,
      border: `1px solid ${tokens.border}`,
      borderRadius: 8,
      overflow: "hidden",
      minWidth: 0,
      ...style,
    }}>{children}</section>
  );
}

function CardHeader({ title, right, badges }: { title: ReactNode; right?: ReactNode; badges?: ReactNode }) {
  return (
    <div style={{
      padding: "12px 16px",
      borderBottom: `1px solid ${tokens.border}`,
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
      minWidth: 0,
    }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h3>
      {badges}
      {right ? <div style={{ marginLeft: "auto", minWidth: 0, maxWidth: "100%" }}>{right}</div> : null}
    </div>
  );
}

function CardBody({ children, padding = 16 }: { children: ReactNode; padding?: number | string }) {
  return <div style={{ padding }}>{children}</div>;
}

const unfilledSurfaceStyle: CSSProperties = {
  background: "transparent",
};

function PropRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", padding: "4px 0", fontSize: 13, gap: 12, minWidth: 0 }}>
      <span style={{ color: tokens.muted, fontSize: 12, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: "1 1 160px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Tiny({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 11, color: tokens.muted, ...style }}>{children}</div>;
}

function Mono({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12, overflowWrap: "anywhere", wordBreak: "break-word", ...style }}>{children}</span>;
}

type ButtonVariant = "primary" | "default" | "ghost" | "destructive";
type ButtonSize = "sm" | "md";

function Button({
  variant = "default",
  size = "md",
  disabled,
  loading,
  onClick,
  children,
  type = "button",
  style,
  title,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: ReactNode;
  type?: "button" | "submit";
  style?: CSSProperties;
  title?: string;
}) {
  const palette: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: tokens.primary,
      color: tokens.primaryFg,
      border: `1px solid transparent`,
    },
    default: {
      background: tokens.card,
      color: tokens.fg,
      border: `1px solid ${tokens.border}`,
    },
    ghost: {
      background: "transparent",
      color: tokens.fg,
      border: `1px solid transparent`,
    },
    destructive: {
      background: "transparent",
      color: "oklch(0.7 0.2 25)",
      border: `1px solid oklch(0.5 0.18 25)`,
    },
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: size === "sm" ? "3px 8px" : "6px 12px",
        borderRadius: 6,
        fontSize: size === "sm" ? 11 : 13,
        fontWeight: 500,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.5 : 1,
        fontFamily: fontStack,
        minWidth: 0,
        whiteSpace: "nowrap",
        ...palette[variant],
        ...style,
      }}
  >{children}</button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        background: "oklch(0.2 0 0)",
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 13,
        color: tokens.fg,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        fontFamily: fontStack,
        ...props.style,
      }}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        background: "oklch(0.2 0 0)",
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 13,
        color: tokens.fg,
        width: "100%",
        boxSizing: "border-box",
        minWidth: 0,
        minHeight: 96,
        fontFamily: fontStack,
        resize: "vertical",
        ...props.style,
      }}
    />
  );
}

type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function AutosaveStatusLabel({ status, error, locale }: { status: AutosaveStatus; error: string | null; locale: WikiLocale }) {
  if (status === "saving") return <Tiny>{wikiMessage(locale, "autosaveSaving")}</Tiny>;
  if (status === "saved") return <Tiny>{wikiMessage(locale, "autosaveSaved")}</Tiny>;
  if (status === "dirty") return <Tiny>{wikiMessage(locale, "autosaveUnsavedChanges")}</Tiny>;
  if (status === "error") return <Tiny style={{ color: "oklch(0.7 0.2 25)" }}>{error ?? wikiMessage(locale, "autosaveFailed")}</Tiny>;
  return <Tiny>{wikiMessage(locale, "autosaveOn")}</Tiny>;
}

function AutosaveMarkdownEditor({
  value,
  placeholder,
  minHeight,
  resetKey,
  locale,
  onSave,
  onStatusChange,
}: {
  value: string;
  placeholder?: string;
  minHeight?: number;
  resetKey: string;
  locale: WikiLocale;
  onSave: (value: string) => Promise<void>;
  onStatusChange?: (status: AutosaveStatus) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [lastSaved, setLastSaved] = useState(value);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
    setLastSaved(value);
    setStatus("idle");
    setError(null);
    onStatusChange?.("idle");
  }, [onStatusChange, resetKey, value]);

  useEffect(() => {
    if (draft === lastSaved) return;
    setStatus("dirty");
    setError(null);
    onStatusChange?.("dirty");
    const timeout = window.setTimeout(async () => {
      setStatus("saving");
      onStatusChange?.("saving");
      try {
        await onSave(draft);
        setLastSaved(draft);
        setStatus("saved");
        onStatusChange?.("saved");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setStatus("error");
        onStatusChange?.("error");
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [draft, lastSaved, onSave, onStatusChange]);

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <MarkdownEditor
        value={draft}
        onChange={setDraft}
        placeholder={placeholder}
        bordered
        contentClassName="min-h-[260px]"
        className="pc-wiki-markdown-editor"
      />
      <style>{`
        .pc-wiki-markdown-editor .mdxeditor-root-contenteditable {
          min-height: ${minHeight ?? 260}px;
        }
      `}</style>
      <AutosaveStatusLabel status={status} error={error} locale={locale} />
    </div>
  );
}

function Callout({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "danger" }) {
  const palette = tone === "danger"
    ? { bg: "oklch(0.22 0.06 25)", fg: "oklch(0.85 0.12 25)", border: "oklch(0.45 0.12 25)" }
    : tone === "warn"
      ? { bg: "oklch(0.22 0.06 70)", fg: "oklch(0.85 0.1 70)", border: "oklch(0.45 0.12 70)" }
      : tokens.callout;
  return (
    <div style={{
      background: palette.bg,
      color: palette.fg,
      border: `1px solid ${palette.border}`,
      borderRadius: 8,
      padding: "12px 14px",
      fontSize: 13,
      lineHeight: 1.55,
    }}>{children}</div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: tokens.border, margin: "16px 0" }} />;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useMediaQuery(query: string): boolean {
  const getSnapshot = () => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(query).matches;
  };
  const [matches, setMatches] = useState(getSnapshot);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function useIsMobileLayout(): boolean {
  return useMediaQuery(mobileMediaQuery);
}

function useOverview(companyId: string | null) {
  const params = useMemo(() => companyId ? { companyId } : undefined, [companyId]);
  return usePluginData<OverviewData>("overview", params);
}

function useSettings(companyId: string | null) {
  const params = useMemo(() => companyId ? { companyId } : undefined, [companyId]);
  return usePluginData<SettingsData>("settings", params);
}

function usePages(companyId: string | null, opts: { includeRaw?: boolean; spaceSlug?: string | null } = {}) {
  const params = useMemo(() => {
    if (!companyId) return undefined;
    const next: Record<string, unknown> = { companyId, includeRaw: opts.includeRaw ?? true };
    if (opts.spaceSlug && opts.spaceSlug !== DEFAULT_SPACE_SLUG) next.spaceSlug = opts.spaceSlug;
    else if (opts.spaceSlug === DEFAULT_SPACE_SLUG) next.spaceSlug = DEFAULT_SPACE_SLUG;
    return next;
  }, [companyId, opts.includeRaw, opts.spaceSlug]);
  return usePluginData<PagesData>("pages", params);
}

function useSpaces(companyId: string | null) {
  const params = useMemo(() => companyId ? { companyId } : undefined, [companyId]);
  return usePluginData<WikiSpacesData>("spaces", params);
}

function useSpaceFolderStatus(companyId: string | null, spaceSlug: string | null) {
  const params = useMemo(() => {
    if (!companyId || !spaceSlug) return undefined;
    return { companyId, spaceSlug };
  }, [companyId, spaceSlug]);
  return usePluginData<WikiSpaceWithFolderStatus>("space", params);
}

function usePaperclipIngestionProfile(companyId: string | null, spaceSlug: string | null) {
  const params = useMemo(() => {
    if (!companyId || !spaceSlug) return undefined;
    return { companyId, spaceSlug };
  }, [companyId, spaceSlug]);
  return usePluginData<PaperclipIngestionProfileData>("paperclip-ingestion-profile", params);
}

function usePageContent(companyId: string | null, path: string | null, spaceSlug?: string | null) {
  const params = useMemo(() => {
    if (!companyId || !path) return undefined;
    const next: Record<string, unknown> = { companyId, path };
    if (spaceSlug) next.spaceSlug = spaceSlug;
    return next;
  }, [companyId, path, spaceSlug]);
  return usePluginData<PageContentData>("page-content", params);
}

function useOperations(companyId: string | null, filter: { operationType?: string | null; status?: string | null; spaceSlug?: string | null } = {}) {
  const params = useMemo(() => {
    if (!companyId) return undefined;
    return {
      companyId,
      operationType: filter.operationType ?? null,
      status: filter.status ?? null,
      spaceSlug: filter.spaceSlug ?? null,
    };
  }, [companyId, filter.operationType, filter.status, filter.spaceSlug]);
  return usePluginData<OperationsData>("operations", params);
}

function useTemplate(companyId: string | null, path: string) {
  const params = useMemo(() => {
    if (!companyId) return undefined;
    return { companyId, path };
  }, [companyId, path]);
  return usePluginData<TemplateData>("template", params);
}

type DistillationCursor = {
  id: string;
  sourceScope: string;
  scopeKey: string;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  rootIssueId: string | null;
  rootIssueIdentifier: string | null;
  rootIssueTitle: string | null;
  lastProcessedAt: string | null;
  lastObservedAt: string | null;
  pendingEventCount: number;
  lastSourceHash: string | null;
  lastSuccessfulRunId: string | null;
};

type DistillationRun = {
  id: string;
  cursorId: string | null;
  workItemId: string | null;
  projectId: string | null;
  projectName: string | null;
  rootIssueId: string | null;
  rootIssueIdentifier: string | null;
  sourceWindowStart: string | null;
  sourceWindowEnd: string | null;
  sourceHash: string | null;
  status: string;
  costCents: number;
  retryCount: number;
  warnings: string[];
  metadata: Record<string, unknown>;
  operationIssueId: string | null;
  operationIssueIdentifier: string | null;
  operationIssueTitle: string | null;
  affectedPagePaths: string[];
  createdAt: string;
  updatedAt: string;
};

type DistillationWorkItem = {
  id: string;
  workItemKind: string;
  status: string;
  priority: string;
  projectId: string | null;
  rootIssueId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type DistillationPageBinding = {
  id: string;
  pagePath: string;
  projectId: string | null;
  projectName: string | null;
  rootIssueId: string | null;
  lastAppliedSourceHash: string | null;
  lastDistillationRunId: string | null;
  lastRunStatus: string | null;
  lastRunCompletedAt: string | null;
  lastRunSourceWindowEnd: string | null;
  lastRunSourceHash: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

type DistillationOverviewData = {
  cursors: DistillationCursor[];
  runs: DistillationRun[];
  workItems: DistillationWorkItem[];
  pageBindings: DistillationPageBinding[];
  reviewWorkItems: DistillationWorkItem[];
  counts: {
    cursors: number;
    runningRuns: number;
    failedRuns24h: number;
    reviewRequired: number;
  };
};

function useDistillationOverview(companyId: string | null) {
  const params = useMemo(() => (companyId ? { companyId } : undefined), [companyId]);
  return usePluginData<DistillationOverviewData>("distillation-overview", params);
}

type DistillationProvenanceData = {
  binding: DistillationPageBinding | null;
  runs: DistillationRun[];
  snapshot: {
    id: string;
    distillationRunId: string;
    sourceHash: string;
    maxCharacters: number;
    clipped: boolean;
    sourceRefs: Array<Record<string, unknown> | string>;
    metadata: Record<string, unknown>;
    createdAt: string;
  } | null;
  cursor: DistillationCursor | null;
};

function useDistillationProvenance(companyId: string | null, pagePath: string | null) {
  const params = useMemo(() => {
    if (!companyId || !pagePath) return undefined;
    return { companyId, pagePath };
  }, [companyId, pagePath]);
  return usePluginData<DistillationProvenanceData>("distillation-page-provenance", params);
}

function stripYamlInlineComment(value: string): string {
  let quote: "'" | "\"" | null = null;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const previous = value[i - 1];
    if ((char === "'" || char === "\"") && previous !== "\\") {
      quote = quote === char ? null : quote ?? char;
    }
    if (char === "#" && quote === null && (i === 0 || /\s/.test(previous ?? ""))) {
      return value.slice(0, i).trimEnd();
    }
  }
  return value.trim();
}

function unquoteYamlScalar(value: string): string {
  const trimmed = stripYamlInlineComment(value).trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function parseYamlInlineArray(value: string): string[] | null {
  const trimmed = stripYamlInlineComment(value).trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const body = trimmed.slice(1, -1).trim();
  if (!body) return [];

  const items: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    const previous = body[i - 1];
    if ((char === "'" || char === "\"") && previous !== "\\") {
      quote = quote === char ? null : quote ?? char;
      current += char;
      continue;
    }
    if (char === "," && quote === null) {
      const item = unquoteYamlScalar(current);
      if (item) items.push(item);
      current = "";
      continue;
    }
    current += char;
  }

  const item = unquoteYamlScalar(current);
  if (item) items.push(item);
  return items;
}

function parseFrontmatterValue(rawValue: string, followingList: string[]): WikiFrontmatterValue {
  const inlineArray = parseYamlInlineArray(rawValue);
  if (inlineArray) return inlineArray;
  if (!rawValue.trim() && followingList.length > 0) return followingList;
  return unquoteYamlScalar(rawValue);
}

function parseWikiFrontmatterBlock(block: string): WikiFrontmatterProperty[] {
  const lines = block.replace(/\r\n/g, "\n").split("\n");
  const properties: WikiFrontmatterProperty[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s+-\s+/.test(line)) continue;

    const match = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) continue;

    const key = match[1];
    const rawValue = match[2] ?? "";
    const followingList: string[] = [];
    let cursor = i + 1;
    while (cursor < lines.length) {
      const listMatch = lines[cursor]?.match(/^\s+-\s+(.+)$/);
      if (!listMatch) break;
      followingList.push(unquoteYamlScalar(listMatch[1] ?? ""));
      cursor += 1;
    }
    if (!rawValue.trim() && followingList.length > 0) i = cursor - 1;

    const value = parseFrontmatterValue(rawValue, followingList);
    if (Array.isArray(value) ? value.length > 0 : value.length > 0) {
      properties.push({ key, value });
    }
  }

  return properties;
}

function parseWikiMarkdown(contents: string): ParsedWikiMarkdown {
  const normalized = contents.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { body: contents, frontmatter: [] };
  }

  const closingMatch = normalized.slice(4).match(/\n(?:---|\.\.\.)[ \t]*(?:\n|$)/);
  if (!closingMatch || closingMatch.index == null) {
    return { body: contents, frontmatter: [] };
  }

  const frontmatterBlock = normalized.slice(4, closingMatch.index + 4);
  const bodyStart = 4 + closingMatch.index + closingMatch[0].length;
  return {
    body: normalized.slice(bodyStart).replace(/^\n+/, ""),
    frontmatter: parseWikiFrontmatterBlock(frontmatterBlock),
  };
}

function stripMarkdownHeadingSyntax(text: string): string {
  return text
    .replace(/\\([\\`*_{}\[\]()#+\-.!|>])/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]+/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function slugifyWikiHeading(text: string): string {
  const slug = stripMarkdownHeadingSyntax(text)
    .toLowerCase()
    .replace(/&[a-z0-9#]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || "section";
}

function extractWikiTocHeadings(markdownBody: string): WikiTocHeading[] {
  const lines = markdownBody.replace(/\r\n/g, "\n").split("\n");
  const headings: WikiTocHeading[] = [];
  const usedIds = new Map<string, number>();
  let fenced = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;

    const match = line.match(/^\s{0,3}(#{2,4})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const text = stripMarkdownHeadingSyntax(match[2] ?? "");
    if (!text) continue;

    const baseId = slugifyWikiHeading(text);
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);
    headings.push({
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      text,
      level: match[1]?.length ?? 2,
    });
  }

  return headings;
}

// ---------------------------------------------------------------------------
// Sidebar entry and settings page.
// ---------------------------------------------------------------------------

// Stroke-2, 16×16 lucide-react icons inlined here because plugin bundles
// cannot import `lucide-react` directly (host-only dep). Path data tracks the
// upstream lucide source 1:1 — keep them in sync if upstream changes.

type LucideIconProps = { size?: number };

function makeLucideIcon(paths: ReactNode) {
  return function LucideIcon({ size = 16 }: LucideIconProps) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size, display: "block" }}
      >
        {paths}
      </svg>
    );
  };
}

const BookOpenIcon = makeLucideIcon(
  <>
    <path d="M12 7v14" />
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
  </>,
);

const DownloadCloudIcon = makeLucideIcon(
  <>
    <path d="M12 13v8l-4-4" />
    <path d="m12 21 4-4" />
    <path d="M4.393 15.269A7 7 0 1 1 15.71 8.071" />
  </>,
);

const MessageSquareTextIcon = makeLucideIcon(
  <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M13 8H7" />
    <path d="M17 12H7" />
  </>,
);

const ListChecksIcon = makeLucideIcon(
  <>
    <path d="m3 17 2 2 4-4" />
    <path d="m3 7 2 2 4-4" />
    <path d="M13 6h8" />
    <path d="M13 12h8" />
    <path d="M13 18h8" />
  </>,
);

const HistoryIcon = makeLucideIcon(
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </>,
);

const SlidersHorizontalIcon = makeLucideIcon(
  <>
    <line x1="21" x2="14" y1="4" y2="4" />
    <line x1="10" x2="3" y1="4" y2="4" />
    <line x1="21" x2="12" y1="12" y2="12" />
    <line x1="8" x2="3" y1="12" y2="12" />
    <line x1="21" x2="16" y1="20" y2="20" />
    <line x1="12" x2="3" y1="20" y2="20" />
    <line x1="14" x2="14" y1="2" y2="6" />
    <line x1="8" x2="8" y1="10" y2="14" />
    <line x1="16" x2="16" y1="18" y2="22" />
  </>,
);

const FolderOpenIcon = makeLucideIcon(
  <>
    <path d="M6 14h.01" />
    <path d="M3 6h5l2 2h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </>,
);

const ActivityIcon = makeLucideIcon(
  <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.24 3.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4 13H2" />,
);

const InfoIcon = makeLucideIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </>,
);

const SparklesIcon = makeLucideIcon(
  <>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </>,
);

const RefreshIcon = makeLucideIcon(
  <>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </>,
);

const ExternalLinkIcon = makeLucideIcon(
  <>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </>,
);

const ClockIcon = makeLucideIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
);

const AlertTriangleIcon = makeLucideIcon(
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
);

const XIcon = makeLucideIcon(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);

const ChevronLeftIcon = makeLucideIcon(<path d="m15 18-6-6 6-6" />);

const ChevronRightIcon = makeLucideIcon(<path d="m9 6 6 6-6 6" />);

const ChevronDownIcon = makeLucideIcon(<path d="m6 9 6 6 6-6" />);

const PlusIcon = makeLucideIcon(
  <>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </>,
);

const PlusCircleIcon = makeLucideIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </>,
);

const FolderIcon = makeLucideIcon(<path d="M3 7h6l2 2h10v10H3z" />);

const MoreHorizontalIcon = makeLucideIcon(
  <>
    <circle cx="6" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18" cy="12" r="1" />
  </>,
);

const ArchiveIcon = makeLucideIcon(
  <>
    <path d="M3 6h18v4H3z" />
    <path d="M5 10v10h14V10" />
    <path d="M10 14h4" />
  </>,
);

const PencilIcon = makeLucideIcon(
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
  </>,
);

export function SidebarLink({ context }: PluginSidebarProps) {
  const hostNavigation = useHostNavigation();
  const locale = resolveWikiLocale(context.locale);
  return (
    <a
      {...hostNavigation.linkProps("/wiki")}
      className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-foreground/80 transition-colors hover:bg-accent/50 hover:text-foreground"
      style={{ textDecoration: "none" }}
    >
      <span aria-hidden="true" className="shrink-0">
        <BookOpenIcon />
      </span>
      <span className="flex-1 truncate">{wikiMessage(locale, "navWiki")}</span>
    </a>
  );
}

export function SettingsPage({ context }: PluginSettingsPageProps) {
  const isMobile = useIsMobileLayout();
  const locale = resolveWikiLocale(context.locale);
  return (
    <main style={{ padding: isMobile ? 16 : 24, maxWidth: isMobile ? "none" : 1040, minWidth: 0, fontFamily: fontStack, color: tokens.fg }}>
      <SettingsBody context={context} locale={locale} />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Main wiki page: section shell for Pages / Ask / Ingest / Lint / History /
// Settings. Wiki navigation uses path segments so pages can be deep-linked as
// `/:companyPrefix/wiki/page/path/to/file`. Legacy query-param links are still
// accepted as a compatibility fallback.
// ---------------------------------------------------------------------------

type SectionKey = "browse" | "ingest" | "query" | "lint" | "history" | "settings";

const SECTIONS: ReadonlyArray<{
  key: SectionKey;
  Icon: (props: LucideIconProps) => ReactElement;
}> = [
  { key: "browse", Icon: BookOpenIcon },
  { key: "query", Icon: MessageSquareTextIcon },
  { key: "ingest", Icon: PlusCircleIcon },
  { key: "lint", Icon: ListChecksIcon },
  { key: "history", Icon: HistoryIcon },
  { key: "settings", Icon: SlidersHorizontalIcon },
];

const SECTION_MESSAGE_KEYS: Readonly<Record<SectionKey, WikiMessageKey>> = {
  browse: "navWiki",
  query: "navAsk",
  ingest: "navAddContent",
  lint: "navLint",
  history: "navHistory",
  settings: "navSettings",
};

const TOP_TOOL_KEYS: ReadonlySet<SectionKey> = new Set<SectionKey>(["query", "ingest"]);
const BOTTOM_TOOL_KEYS: ReadonlySet<SectionKey> = new Set<SectionKey>(["history", "settings"]);
const TOP_TOOL_SECTIONS = SECTIONS.filter((section) => TOP_TOOL_KEYS.has(section.key));
const BOTTOM_TOOL_SECTIONS = SECTIONS.filter((section) => BOTTOM_TOOL_KEYS.has(section.key));
const SECTION_KEYS: ReadonlySet<SectionKey> = new Set(SECTIONS.map((s) => s.key));
const LEGACY_SECTION_ALIASES: Readonly<Partial<Record<string, SectionKey>>> = {
  operations: "history",
};

function isSectionKey(value: string | null | undefined): value is SectionKey {
  return typeof value === "string" && SECTION_KEYS.has(value as SectionKey);
}

function normalizeSectionKey(value: string | null | undefined): SectionKey | null {
  if (typeof value !== "string") return null;
  return LEGACY_SECTION_ALIASES[value] ?? (isSectionKey(value) ? value : null);
}

function readSectionFromSearch(search: string): SectionKey {
  const params = new URLSearchParams(search);
  const raw = params.get("section");
  return normalizeSectionKey(raw) ?? "browse";
}

function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function readWikiRouteSegments(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  const wikiIndex = segments.findIndex((segment) => decodeRouteSegment(segment).toLowerCase() === "wiki");
  if (wikiIndex === -1) return [];
  return segments.slice(wikiIndex + 1).map(decodeRouteSegment);
}

// Strip an optional `spaces/<slug>` prefix from the wiki route segments.
// Returns the active space slug (defaults to "default") and the remaining segments
// after that prefix so existing section/page parsing keeps working unchanged.
function readWikiSpaceContext(pathname: string): { spaceSlug: string; rest: string[] } {
  const segments = readWikiRouteSegments(pathname);
  if (segments[0] === "spaces" && typeof segments[1] === "string" && segments[1].length > 0) {
    return { spaceSlug: segments[1], rest: segments.slice(2) };
  }
  return { spaceSlug: DEFAULT_SPACE_SLUG, rest: segments };
}

function readActiveSpaceSlugFromLocation(pathname: string): string {
  return readWikiSpaceContext(pathname).spaceSlug;
}

function readSectionFromLocation(pathname: string, search: string): SectionKey {
  const [firstSegment] = readWikiSpaceContext(pathname).rest;
  if (firstSegment === "page") return "browse";
  return normalizeSectionKey(firstSegment) ?? readSectionFromSearch(search);
}

function readSettingsSectionFromLocation(pathname: string): SettingsSectionKey {
  const [firstSegment, secondSegment] = readWikiSpaceContext(pathname).rest;
  if (firstSegment !== "settings") return "root";
  if (secondSegment === "maintainer" || secondSegment === "project") return "root";
  return SETTINGS_SECTIONS.some((section) => section.key === secondSegment)
    ? secondSegment as SettingsSectionKey
    : "root";
}

function readSettingsSpaceSlugFromLocation(pathname: string): string | null {
  const segs = readWikiSpaceContext(pathname).rest;
  if (segs[0] !== "settings" || segs[1] !== "spaces") return null;
  const slug = segs[2];
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}

function buildSpacePrefix(spaceSlug: string): string {
  return spaceSlug && spaceSlug !== DEFAULT_SPACE_SLUG
    ? `/wiki/spaces/${encodeURIComponent(spaceSlug)}`
    : `/wiki`;
}

function buildSectionHref(section: SectionKey, spaceSlug: string = DEFAULT_SPACE_SLUG): string {
  const prefix = buildSpacePrefix(spaceSlug);
  return section === "browse" ? prefix : `${prefix}/${section}`;
}

function buildSettingsSectionHref(settingsSection: SettingsSectionKey | "spaces", spaceSlug: string = DEFAULT_SPACE_SLUG, slug?: string): string {
  const prefix = buildSpacePrefix(spaceSlug);
  if (settingsSection === "spaces" && slug) {
    return `${prefix}/settings/spaces/${encodeURIComponent(slug)}`;
  }
  if (settingsSection === "root") return `${prefix}/settings`;
  return `${prefix}/settings/${settingsSection}`;
}

function readSelectedTreePathFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get("page")?.trim();
  return raw || null;
}

function readSelectedTreePathFromLocation(pathname: string, search: string): string | null {
  const [firstSegment, ...rest] = readWikiSpaceContext(pathname).rest;
  if (firstSegment === "page") {
    return treePathFromRouteSegments(rest);
  }
  return readSelectedTreePathFromSearch(search);
}

function buildPageHref(treePath: string, spaceSlug: string = DEFAULT_SPACE_SLUG): string {
  const prefix = buildSpacePrefix(spaceSlug);
  const encodedPath = routeSegmentsFromTreePath(treePath).map((segment) => encodeURIComponent(segment)).join("/");
  return encodedPath ? `${prefix}/page/${encodedPath}` : prefix;
}

function wikiSidebarNavigationState(treePath: string): Record<typeof WIKI_SIDEBAR_NAV_STATE_KEY, string> {
  return { [WIKI_SIDEBAR_NAV_STATE_KEY]: treePath };
}

function readSidebarSelectedPathFromNavigationState(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as Record<string, unknown>)[WIKI_SIDEBAR_NAV_STATE_KEY];
  return typeof value === "string" && value.trim() ? value : null;
}

function routeSidebarExpandedStorageKey(companyId: string | null | undefined): string {
  return `${ROUTE_SIDEBAR_EXPANDED_STORAGE_PREFIX}:${companyId ?? "global"}`;
}

function readRouteSidebarExpandedPaths(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set(DEFAULT_ROUTE_SIDEBAR_EXPANDED_PATHS);

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return new Set(DEFAULT_ROUTE_SIDEBAR_EXPANDED_PATHS);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(DEFAULT_ROUTE_SIDEBAR_EXPANDED_PATHS);
    return new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0));
  } catch {
    return new Set(DEFAULT_ROUTE_SIDEBAR_EXPANDED_PATHS);
  }
}

function writeRouteSidebarExpandedPaths(storageKey: string, paths: ReadonlySet<string>): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...paths].sort()));
  } catch {
    // Ignore storage failures; the tree still works for the current render.
  }
}

const ROOT_WIKI_LINK_PAGES = new Set(["WIKI.md", "AGENTS.md", "IDEA.md", "index.md", "log.md"]);

function splitWikiLinkTarget(target: string): { path: string; fragment: string | null } | null {
  const trimmed = target.trim();
  if (!trimmed || /^[a-z][a-z\d+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) return null;

  const hashIndex = trimmed.indexOf("#");
  const rawPath = (hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed)
    .trim()
    .replace(/^\/+/, "");
  if (
    !rawPath ||
    rawPath.includes("\\") ||
    rawPath.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return null;
  }

  const fragment = hashIndex >= 0 ? trimmed.slice(hashIndex + 1).trim() || null : null;
  return { path: rawPath, fragment };
}

function withMarkdownExtension(path: string): string {
  return path.toLowerCase().endsWith(".md") ? path : `${path}.md`;
}

function normalizeWikiLinkPagePath(target: string): { path: string; fragment: string | null } | null {
  const parsed = splitWikiLinkTarget(target);
  if (!parsed) return null;

  let path = withMarkdownExtension(parsed.path);
  if (!path.startsWith("wiki/") && !path.startsWith("raw/") && !ROOT_WIKI_LINK_PAGES.has(path)) {
    path = `wiki/${path}`;
  }

  return { path, fragment: parsed.fragment };
}

function buildWikiLinkHref(target: string, resolveHref: (to: string) => string): string | null {
  const normalized = normalizeWikiLinkPagePath(target);
  if (!normalized) return null;

  const href = resolveHref(buildPageHref(normalized.path));
  return normalized.fragment ? `${href}#${encodeURIComponent(normalized.fragment)}` : href;
}

function routeSegmentsFromTreePath(treePath: string): string[] {
  return treePath.split("/").filter(Boolean);
}

function treePathFromRouteSegments(segments: string[]): string | null {
  if (segments.length === 0) return null;
  const [firstSegment, ...rest] = segments;
  if (firstSegment === "templates") {
    const templatePath = rest.join("/").trim();
    return templatePath || null;
  }
  const routePath = segments.join("/").trim();
  return routePath || null;
}

function firstSelectableTreePath(data: PagesData | null | undefined): string | null {
  const firstPage = data?.pages.find((p) => p.path !== "wiki/index.md" && p.path !== "index.md") ?? data?.pages[0] ?? null;
  if (firstPage) return firstPage.path;
  const firstSource = data?.sources[0] ?? null;
  if (firstSource) return firstSource.rawPath;
  return TEMPLATE_PATHS[0] ?? null;
}

function contentPathFromTreePath(treePath: string | null): string | null {
  return treePath;
}

function isEditableWikiPagePath(path: string): boolean {
  return path === "WIKI.md"
    || path === "AGENTS.md"
    || path === "IDEA.md"
    || path === "index.md"
    || path === "log.md"
    || path.startsWith("wiki/");
}

export function WikiPage({ context }: PluginPageProps) {
  const locale = resolveWikiLocale(context.locale);
  const { pathname, search } = useHostLocation();
  const isMobile = useIsMobileLayout();
  const section = useMemo(() => readSectionFromLocation(pathname, search), [pathname, search]);
  const settingsSection = useMemo(() => readSettingsSectionFromLocation(pathname), [pathname]);
  const activeSpaceSlug = useMemo(() => readActiveSpaceSlugFromLocation(pathname), [pathname]);
  const settingsSpaceSlug = useMemo(() => readSettingsSpaceSlugFromLocation(pathname), [pathname]);
  const overview = useOverview(context.companyId);
  const [isDragActive, setIsDragActive] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedIngestFile[]>([]);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);

  const resetDragState = useCallback(() => {
    setIsDragActive(false);
  }, []);

  const stageFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const now = Date.now();
    setStagedFiles((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${now}-${index}-${file.name}-${file.size}-${file.lastModified}`,
        file,
      })),
    ]);
    setIsIngestModalOpen(true);
  }, []);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
    resetDragState();
  }, [resetDragState]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    resetDragState();
    stageFiles(Array.from(event.dataTransfer.files ?? []));
  }, [resetDragState, stageFiles]);

  useEffect(() => {
    if (!isDragActive) return;
    const handleWindowDragLeave = (event: DragEvent) => {
      const leftViewport =
        event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight;
      if (leftViewport) resetDragState();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") resetDragState();
    };
    window.addEventListener("dragend", resetDragState);
    window.addEventListener("drop", resetDragState);
    window.addEventListener("blur", resetDragState);
    window.addEventListener("dragleave", handleWindowDragLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("dragend", resetDragState);
      window.removeEventListener("drop", resetDragState);
      window.removeEventListener("blur", resetDragState);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDragActive, resetDragState]);

  if (!context.companyId) {
    return <main style={{ ...shellStyle, height: isMobile ? "auto" : "100%", minHeight: isMobile ? "auto" : 600 }}>{wikiMessage(locale, "chooseCompany")}</main>;
  }

  return (
    <main
      style={{ ...shellStyle, position: "relative", height: isMobile ? "auto" : "100%", minHeight: isMobile ? "auto" : 600 }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <style>{`@keyframes pcWikiPulse { 0%,100% { opacity:1 } 50% { opacity:0.45 } }`}</style>
      <section style={{ flex: 1, minHeight: isMobile ? "auto" : 0, overflow: isMobile ? "visible" : "hidden", display: "flex" }}>
        {overview.error ? (
          <div style={{ padding: 24, flex: 1 }}>
            <Callout tone="danger">{wikiMessage(locale, "bridgeError", { message: overview.error.message })}</Callout>
          </div>
        ) : !overview.data ? (
          <div style={{ padding: 24, flex: 1, color: tokens.muted, fontSize: 13 }}>{wikiMessage(locale, "loadingWiki")}</div>
        ) : !overview.data.folder.healthy ? (
          <UnconfiguredFolder context={context} folder={overview.data.folder} locale={locale} refresh={overview.refresh} />
        ) : section === "browse" ? (
          <BrowseTab context={context} locale={locale} />
        ) : section === "ingest" ? (
          <IngestTab context={context} locale={locale} refreshOverview={overview.refresh} />
        ) : section === "query" ? (
          <QueryTab context={context} locale={locale} overview={overview.data} />
        ) : section === "lint" ? (
          <SettingsTab context={context} locale={locale} initialSection="lint" />
        ) : section === "history" ? (
          <HistoryTab context={context} locale={locale} overview={overview.data} />
        ) : (
          <SettingsTab context={context} locale={locale} initialSection={settingsSection} />
        )}
      </section>
      {isDragActive ? <WikiPageDropOverlay locale={locale} onClose={resetDragState} /> : null}
      {isIngestModalOpen ? (
        <IngestFilesModal
          companyId={context.companyId}
          locale={locale}
          files={stagedFiles}
          initialSpaceSlug={activeSpaceSlug}
          onAddFiles={stageFiles}
          onRemoveFile={(id) => setStagedFiles((current) => current.filter((item) => item.id !== id))}
          onClose={() => {
            setIsIngestModalOpen(false);
            setStagedFiles([]);
          }}
          onIngested={() => {
            overview.refresh();
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("pc-wiki-ingest-queued"));
            }
          }}
        />
      ) : null}
    </main>
  );
}

type StagedIngestFile = {
  id: string;
  file: File;
};

function isFileDrag(event: React.DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function WikiPageDropOverlay({ locale, onClose }: { locale: WikiLocale; onClose: () => void }) {
  return (
    <div
      data-testid="llm-wiki-page-drop-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        pointerEvents: "auto",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "color-mix(in oklab, var(--background, oklch(0.145 0 0)) 72%, transparent)",
        backdropFilter: "blur(3px)",
      }}
    >
      <button
        type="button"
        aria-label={wikiMessage(locale, "closeIngestDropOverlay")}
        title={wikiMessage(locale, "close")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 34,
          height: 34,
          borderRadius: 8,
          border: `1px solid ${tokens.border}`,
          background: "color-mix(in oklab, var(--card, oklch(0.205 0 0)) 90%, transparent)",
          color: tokens.fg,
          display: "inline-grid",
          placeItems: "center",
          cursor: "pointer",
          boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
        }}
      >
        <XIcon size={16} />
      </button>
      <div style={{
        width: "min(520px, 100%)",
        borderRadius: 8,
        border: `1.5px dashed ${tokens.pluginBorder}`,
        background: "color-mix(in oklab, var(--card, oklch(0.205 0 0)) 92%, transparent)",
        color: tokens.fg,
        padding: "28px 24px",
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
      }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 8, background: tokens.pluginBg, color: tokens.pluginFg, marginBottom: 12 }}>
          <DownloadCloudIcon size={24} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 650, marginBottom: 6 }}>{wikiMessage(locale, "dropToIngestTitle")}</div>
        <Tiny>{wikiMessage(locale, "dropToIngestDescription")}</Tiny>
      </div>
    </div>
  );
}

function IngestFilesModal({
  companyId,
  locale,
  files,
  onAddFiles,
  onRemoveFile,
  onClose,
  onIngested,
  initialSpaceSlug,
}: {
  companyId: string;
  locale: WikiLocale;
  files: StagedIngestFile[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onClose: () => void;
  onIngested: () => void;
  initialSpaceSlug: string;
}) {
  const ingest = usePluginAction("ingest-source");
  const toast = usePluginToast();
  const spacesQuery = useSpaces(companyId);
  const spaces = useMemo(() => {
    const list = spacesQuery.data?.spaces ?? [];
    return [...list].sort(compareSpaces);
  }, [spacesQuery.data]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetSpaceSlug, setTargetSpaceSlug] = useState(initialSpaceSlug || DEFAULT_SPACE_SLUG);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const targetSpace = useMemo(() => spaces.find((s) => s.slug === targetSpaceSlug) ?? null, [spaces, targetSpaceSlug]);

  const requestClose = useCallback(() => {
    if (!busy) onClose();
  }, [busy, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  async function confirm() {
    if (busy || files.length === 0) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      for (const item of files) {
        const contents = await item.file.text();
        const result = await ingest({
          companyId,
          spaceSlug: targetSpaceSlug,
          sourceType: "file",
          title: item.file.name,
          url: null,
          contents,
          metadata: {
            fileName: item.file.name,
            fileSize: item.file.size,
            fileType: item.file.type || null,
            lastModified: item.file.lastModified,
          },
        });
        await uploadIssueAttachmentFile({
          companyId,
          issueId: readIngestOperationIssueId(result),
          file: item.file,
        });
      }
      const count = files.length;
      const spaceLabel = targetSpace?.displayName ?? targetSpaceSlug;
      toast({
        tone: "success",
        title: wikiMessage(locale, count === 1 ? "oneFileQueuedForIngest" : "manyFilesQueuedForIngest", { space: spaceLabel }),
        body: wikiMessage(locale, count === 1 ? "oneFileCaptured" : "manyFilesCaptured", {
          count: new Intl.NumberFormat(locale).format(count),
        }),
      });
      onIngested();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      toast({ tone: "error", title: wikiMessage(locale, "fileIngestFailed"), body: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="llm-wiki-ingest-modal-title"
      data-testid="llm-wiki-ingest-modal"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) requestClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1010,
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "rgba(0,0,0,0.52)",
      }}
    >
      <div style={{
        width: "min(680px, 100%)",
        maxHeight: "min(720px, calc(100vh - 36px))",
        overflow: "auto",
        background: tokens.card,
        color: tokens.fg,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
      }}>
        <div style={{ padding: "16px 18px", borderBottom: `1px solid ${tokens.border}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: tokens.pluginBg, color: tokens.pluginFg, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <DownloadCloudIcon size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="llm-wiki-ingest-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>{wikiMessage(locale, "ingestFilesTitle", { space: targetSpace?.displayName ?? targetSpaceSlug })}</h2>
            <Tiny style={{ marginTop: 4 }}>{wikiMessage(locale, "ingestFilesDescription")}</Tiny>
          </div>
          <Button size="sm" variant="ghost" onClick={requestClose} disabled={busy} title={wikiMessage(locale, "closeIngestModal")}>{wikiMessage(locale, "close")}</Button>
        </div>
        <div style={{ padding: 18, display: "grid", gap: 14 }}>
          <SpacePicker
            spaces={spaces}
            locale={locale}
            activeSpaceSlug={targetSpaceSlug}
            loading={spacesQuery.loading}
            error={spacesQuery.error?.message ?? null}
            isOpen={pickerOpen}
            onToggle={() => setPickerOpen((v) => !v)}
            onClose={() => setPickerOpen(false)}
            onSelect={(slug) => {
              setPickerOpen(false);
              setTargetSpaceSlug(slug);
            }}
            onCreate={() => {
              setPickerOpen(false);
              setCreateOpen(true);
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Badge tone="running">{wikiMessage(locale, files.length === 1 ? "oneStagedFile" : "manyStagedFiles", {
              count: new Intl.NumberFormat(locale).format(files.length),
            })}</Badge>
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>{wikiMessage(locale, "addFiles")}</Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(event) => {
                onAddFiles(Array.from(event.currentTarget.files ?? []));
                event.currentTarget.value = "";
              }}
            />
          </div>
          <div style={{ border: `1px solid ${tokens.border}`, borderRadius: 8, overflow: "hidden" }}>
            {files.length === 0 ? (
              <div style={{ padding: 16 }}><Tiny>{wikiMessage(locale, "noFilesStaged")}</Tiny></div>
            ) : files.map((item) => (
              <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${tokens.border}`, minWidth: 0 }}>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 13, overflowWrap: "anywhere" }}>{item.file.name}</strong>
                  <Tiny>{formatFileSize(item.file.size, locale)}{item.file.type ? ` · ${item.file.type}` : ""}</Tiny>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onRemoveFile(item.id)} disabled={busy}>{wikiMessage(locale, "removeFile")}</Button>
              </div>
            ))}
          </div>
          {errorMsg ? <Callout tone="danger">{errorMsg}</Callout> : null}
          <Callout>
            {wikiMessage(locale, "confirmFilesDescription", { path: `${targetSpaceSlug}/raw/` })}
          </Callout>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button variant="ghost" onClick={requestClose} disabled={busy}>{wikiMessage(locale, "cancel")}</Button>
            <Button variant="primary" onClick={confirm} disabled={files.length === 0} loading={busy}>{wikiMessage(locale, "captureIngestInto", { space: targetSpace?.displayName ?? targetSpaceSlug })}</Button>
          </div>
        </div>
      </div>
      {createOpen ? (
        <CreateSpaceModal
          companyId={companyId}
          locale={locale}
          existingSlugs={new Set(spaces.map((s) => s.slug))}
          onClose={() => setCreateOpen(false)}
          onCreated={(space) => {
            setCreateOpen(false);
            spacesQuery.refresh();
            setTargetSpaceSlug(space.slug);
          }}
        />
      ) : null}
    </div>
  );
}

function formatFileSize(bytes: number, locale: WikiLocale): string {
  const number = (value: number, maximumFractionDigits: number) => new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
  if (!Number.isFinite(bytes) || bytes < 0) return wikiMessage(locale, "unknownFileSize");
  if (bytes < 1024) return `${number(bytes, 0)} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${number(kib, kib >= 10 ? 0 : 1)} KB`;
  const mib = kib / 1024;
  return `${number(mib, mib >= 10 ? 0 : 1)} MB`;
}

// ---------------------------------------------------------------------------
// Wiki route sidebar — replaces the company sidebar while the user is on a
// `/wiki` route. Mirrors the shell of the host's CompanySettingsSidebar so
// users see a familiar takeover.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Create-space modal — opened from the sidebar `+` icon and also reachable
// from the edit-space settings sub-nav. Disables the "Cloud" type and the
// "Existing absolute path" folder source per the PAP-3640 security review.
// ---------------------------------------------------------------------------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

function CreateSpaceModal({
  companyId,
  locale,
  existingSlugs,
  onClose,
  onCreated,
}: {
  companyId: string;
  locale: WikiLocale;
  existingSlugs: ReadonlySet<string>;
  onClose: () => void;
  onCreated: (space: WikiSpace) => void;
}) {
  const create = usePluginAction("create-space");
  const toast = usePluginToast();
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [folderMode, setFolderMode] = useState<"managed_subfolder" | "existing_local_folder">("managed_subfolder");
  const [accessScope, setAccessScope] = useState<"shared" | "personal" | "team">("shared");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isMobile = useIsMobileLayout();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [busy, onClose]);

  const effectiveSlug = slug.trim() || (slugDirty ? "" : slugify(displayName));

  const slugError = (() => {
    if (!effectiveSlug) return null;
    if (effectiveSlug === DEFAULT_SPACE_SLUG) return wikiMessage(locale, "slugDefaultReserved");
    if (!SLUG_PATTERN.test(effectiveSlug)) return wikiMessage(locale, "slugValidationHelp");
    if (existingSlugs.has(effectiveSlug)) return wikiMessage(locale, "slugAlreadyExists");
    return null;
  })();

  const canSubmit = displayName.trim().length > 0 && effectiveSlug.length > 0 && !slugError && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const result = await create({
        companyId,
        slug: effectiveSlug,
        displayName: displayName.trim(),
        folderMode,
        accessScope,
      }) as { status: "created"; space: WikiSpace };
      toast({ tone: "success", title: wikiMessage(locale, "spaceCreated"), body: wikiMessage(locale, "spaceCreatedBody", { name: result.space.displayName }) });
      onCreated(result.space);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      toast({ tone: "error", title: wikiMessage(locale, "spaceCreateFailed"), body: msg });
    } finally {
      setBusy(false);
    }
  }

  const previewName = displayName.trim() || "your-space";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-space-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "grid",
        placeItems: isMobile ? "end" : "center",
        padding: isMobile ? 0 : 18,
        background: "rgba(0,0,0,0.52)",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        style={{
          width: isMobile ? "100%" : "min(560px, 100%)",
          maxHeight: isMobile ? "92vh" : "min(760px, calc(100vh - 36px))",
          overflow: "auto",
          background: tokens.card,
          color: tokens.fg,
          border: `1px solid ${tokens.border}`,
          borderRadius: isMobile ? "12px 12px 0 0" : 8,
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          fontFamily: fontStack,
        }}
      >
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${tokens.border}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: tokens.pluginBg, color: tokens.pluginFg, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <FolderIcon size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="create-space-modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 650 }}>{wikiMessage(locale, "createSharedSpaceTitle")}</h2>
            <Tiny style={{ marginTop: 4 }}>
              {wikiMessage(locale, "createSpaceDescription")}
            </Tiny>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy} title={wikiMessage(locale, "closeDialog")}>{wikiMessage(locale, "closeDialog")}</Button>
        </div>
        <div style={{ padding: 20, display: "grid", gap: 16 }}>
          <FormField label={wikiMessage(locale, "displayNameLabel")}>
            <TextInput
              value={displayName}
              autoFocus
              onChange={(event) => {
                setDisplayName(event.target.value);
                if (!slugDirty) setSlug("");
              }}
              placeholder={wikiMessage(locale, "spaceNamePlaceholder")}
              maxLength={120}
            />
          </FormField>
          <FormField
            label={wikiMessage(locale, "slugLabel")}
            help={slugError ?? wikiMessage(locale, "storedAsFolderSlugHelp", { slug: slugify(displayName) || wikiMessage(locale, "autoDerivedFromDisplayName") })}
            tone={slugError ? "danger" : "muted"}
          >
            <TextInput
              value={slug || (slugDirty ? "" : slugify(displayName))}
              onChange={(event) => {
                setSlugDirty(true);
                setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="team-research"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            />
          </FormField>
          <FormField label={wikiMessage(locale, "typeLabel")}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <SegmentedOption selected label={wikiMessage(locale, "folderType")} onClick={() => undefined} />
              <SegmentedOption disabled label={wikiMessage(locale, "cloudType")} suffix={wikiMessage(locale, "comingSoon")} onClick={() => undefined} />
            </div>
          </FormField>
          <FormField label={wikiMessage(locale, "folderSourceLabel")} help={wikiMessage(locale, "folderSourceHelp")}>
            <div style={{ display: "grid", gap: 8 }}>
              <FolderModeRow
                checked={folderMode === "managed_subfolder"}
                onSelect={() => setFolderMode("managed_subfolder")}
                label={wikiMessage(locale, "newManagedFolder")}
                help={wikiMessage(locale, "newManagedFolderHelp", { folder: `spaces/${previewName.replace(/\s+/g, "-").toLowerCase()}/` })}
              />
              <FolderModeRow
                checked={folderMode === "existing_local_folder"}
                onSelect={() => setFolderMode("existing_local_folder")}
                label={wikiMessage(locale, "existingFolderUnderWikiRoot")}
                help={wikiMessage(locale, "existingFolderHelp")}
              />
              <FolderModeRow
                disabled
                checked={false}
                onSelect={() => undefined}
                label={wikiMessage(locale, "existingAbsolutePath")}
                help={wikiMessage(locale, "absolutePathPendingReview")}
                suffix={wikiMessage(locale, "disabled")}
              />
            </div>
          </FormField>
          <FormField label={wikiMessage(locale, "accessScopeLabel")} help={wikiMessage(locale, "accessScopeDescription")}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8 }}>
              <ScopeTile
                selected={accessScope === "shared"}
                onSelect={() => setAccessScope("shared")}
                label={wikiMessage(locale, "sharedScope")}
                help={wikiMessage(locale, "sharedScopeHelp")}
              />
              <ScopeTile
                selected={accessScope === "personal"}
                onSelect={() => setAccessScope("personal")}
                label={wikiMessage(locale, "personalScope")}
                help={wikiMessage(locale, "futureScopeStoredOnly")}
                tag={wikiMessage(locale, "future")}
              />
              <ScopeTile
                selected={accessScope === "team"}
                onSelect={() => setAccessScope("team")}
                label={wikiMessage(locale, "teamScope")}
                help={wikiMessage(locale, "futureScopeStoredOnly")}
                tag={wikiMessage(locale, "future")}
              />
            </div>
          </FormField>
          {errorMsg ? <Callout tone="danger">{errorMsg}</Callout> : null}
        </div>
        <div style={{
          padding: "12px 20px",
          borderTop: `1px solid ${tokens.border}`,
          display: "flex",
          gap: 8,
          justifyContent: isMobile ? "stretch" : "flex-end",
          flexWrap: "wrap",
          position: isMobile ? "sticky" : "static",
          bottom: 0,
          background: tokens.card,
        }}>
          <Button variant="ghost" onClick={onClose} disabled={busy} style={{ flex: isMobile ? 1 : undefined }}>{wikiMessage(locale, "cancel")}</Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={busy} style={{ flex: isMobile ? 1 : undefined }}>{wikiMessage(locale, "createSpaceAction")}</Button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, help, tone = "muted", children }: { label: ReactNode; help?: ReactNode; tone?: "muted" | "danger"; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: tokens.fg }}>{label}</label>
      {children}
      {help ? (
        <span style={{ fontSize: 11, color: tone === "danger" ? "oklch(0.78 0.18 25)" : tokens.muted, lineHeight: 1.4 }}>{help}</span>
      ) : null}
    </div>
  );
}

function SegmentedOption({ label, selected, disabled, suffix, onClick }: { label: string; selected?: boolean; disabled?: boolean; suffix?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-disabled={disabled}
      style={{
        padding: "8px 14px",
        borderRadius: 6,
        border: `1px solid ${selected ? tokens.border : tokens.border}`,
        background: selected ? tokens.accent : "transparent",
        color: disabled ? tokens.muted : tokens.fg,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: fontStack,
      }}
    >
      <span>{label}</span>
      {suffix ? (
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          padding: "1px 6px",
          borderRadius: 3,
          border: `1px dashed ${tokens.border}`,
          color: tokens.muted,
        }}>{suffix}</span>
      ) : null}
    </button>
  );
}

function FolderModeRow({ checked, onSelect, label, help, disabled, suffix }: { checked: boolean; onSelect: () => void; label: string; help: string; disabled?: boolean; suffix?: string }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${checked ? tokens.fg : tokens.border}`,
        background: "transparent",
        color: tokens.fg,
        textAlign: "left",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        fontFamily: fontStack,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          border: `2px solid ${checked ? tokens.fg : tokens.muted}`,
          flexShrink: 0,
          marginTop: 2,
          background: checked ? tokens.fg : "transparent",
        }}
      />
      <div style={{ display: "grid", gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
          {suffix ? <Badge tone="default" style={{ fontSize: 10 }}>{suffix}</Badge> : null}
        </div>
        <span style={{ fontSize: 11, color: tokens.muted, lineHeight: 1.4 }}>{help}</span>
      </div>
    </button>
  );
}

function ScopeTile({ selected, onSelect, label, help, tag }: { selected: boolean; onSelect: () => void; label: string; help: string; tag?: string }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${selected ? tokens.fg : tokens.border}`,
        background: selected ? tokens.accent : "transparent",
        color: tokens.fg,
        textAlign: "left",
        display: "grid",
        gap: 4,
        cursor: "pointer",
        fontFamily: fontStack,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {tag ? <Badge tone="default" style={{ fontSize: 10 }}>{tag}</Badge> : null}
      </div>
      <span style={{ fontSize: 11, color: tokens.muted, lineHeight: 1.4 }}>{help}</span>
    </button>
  );
}

function compareSpaces(a: WikiSpace, b: WikiSpace): number {
  if (a.slug === DEFAULT_SPACE_SLUG && b.slug !== DEFAULT_SPACE_SLUG) return -1;
  if (b.slug === DEFAULT_SPACE_SLUG && a.slug !== DEFAULT_SPACE_SLUG) return 1;
  return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
}

function activeWikiSpaces(spaces: WikiSpace[]): WikiSpace[] {
  return spaces.filter((space) => space.status !== "archived");
}

function spaceTreeKey(spaceSlug: string, path: string): string {
  return `${spaceSlug}::${path}`;
}

function SpacePageContentWarmup({ companyId, path, spaceSlug }: { companyId: string | null; path: string; spaceSlug: string }) {
  usePageContent(companyId, path, spaceSlug);
  return null;
}

function SpacePagesWarmup({ companyId, spaceSlug }: { companyId: string | null; spaceSlug: string }) {
  const pages = usePages(companyId, { includeRaw: true, spaceSlug });
  const selectedTreePath = firstSelectableTreePath(pages.data);
  const selected = contentPathFromTreePath(selectedTreePath);
  return selected ? <SpacePageContentWarmup companyId={companyId} path={selected} spaceSlug={spaceSlug} /> : null;
}

export function WikiRouteSidebar({ context }: PluginRouteSidebarProps) {
  const locale = resolveWikiLocale(context.locale);
  const hostNavigation = useHostNavigation();
  const { pathname, search, state } = useHostLocation();
  const activeSection = useMemo(() => readSectionFromLocation(pathname, search), [pathname, search]);
  const activeSpaceSlug = useMemo(() => readActiveSpaceSlugFromLocation(pathname), [pathname]);
  const companyName = context.companyPrefix ?? wikiMessage(locale, "companyFallback");
  const spacesQuery = useSpaces(context.companyId);
  const spaces = useMemo(() => {
    const list = spacesQuery.data?.spaces ?? [];
    if (list.length === 0) return list;
    return activeWikiSpaces(list).sort(compareSpaces);
  }, [spacesQuery.data]);
  const pages = usePages(context.companyId, { includeRaw: true, spaceSlug: activeSpaceSlug });
  const activeSpaceNodes = useMemo(
    () => buildBrowseTree(pages.data?.pages ?? [], pages.data?.sources ?? []),
    [pages.data],
  );
  const warmupSpaces = useMemo(() => {
    const active = spaces.find((space) => space.slug === activeSpaceSlug);
    const rest = spaces.filter((space) => space.slug !== activeSpaceSlug);
    return (active ? [active, ...rest] : rest).slice(0, WIKI_SPACE_PREFETCH_LIMIT);
  }, [spaces, activeSpaceSlug]);
  const storageKey = useMemo(() => routeSidebarExpandedStorageKey(context.companyId), [context.companyId]);
  const [expandedRaw, setExpandedRaw] = useState<Set<string>>(() => readRouteSidebarExpandedPaths(storageKey));
  const [selectedTreePath, setSelectedTreePath] = useState<string | null>(null);
  const [spaceCollapse, setSpaceCollapse] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  useEffect(() => {
    if (activeSection !== "browse") return;
    const sidebarSelectedPath = readSidebarSelectedPathFromNavigationState(state);
    if (sidebarSelectedPath === null) return;
    setSelectedTreePath(sidebarSelectedPath);
  }, [activeSection, state]);

  useEffect(() => {
    setExpandedRaw(readRouteSidebarExpandedPaths(storageKey));
  }, [storageKey]);

  useEffect(() => {
    writeRouteSidebarExpandedPaths(storageKey, expandedRaw);
  }, [expandedRaw, storageKey]);

  useEffect(() => {
    const ancestors = expandedAncestors(selectedTreePath);
    if (ancestors.length === 0) return;
    const slug = activeSpaceSlug;
    setExpandedRaw((current) => {
      const next = new Set(current);
      let changed = false;
      for (const ancestor of ancestors) {
        const key = spaceTreeKey(slug, ancestor);
        if (next.has(key)) continue;
        next.add(key);
        changed = true;
      }
      return changed ? next : current;
    });
  }, [selectedTreePath, activeSpaceSlug]);

  // Project the per-space-prefixed expanded paths down to the active space's
  // bare paths so FileTree (which is space-agnostic) can read them directly.
  // Legacy entries written before this change have no `slug::` prefix and are
  // treated as belonging to the default space.
  const expandedForActiveSpace = useMemo(() => {
    const next = new Set<string>();
    const prefix = `${activeSpaceSlug}::`;
    for (const entry of expandedRaw) {
      if (entry.startsWith(prefix)) {
        next.add(entry.slice(prefix.length));
      } else if (!entry.includes("::") && activeSpaceSlug === DEFAULT_SPACE_SLUG) {
        next.add(entry);
      }
    }
    return next;
  }, [expandedRaw, activeSpaceSlug]);

  const handleToggleDir = (dirPath: string) => {
    const key = spaceTreeKey(activeSpaceSlug, dirPath);
    setExpandedRaw((current) => {
      const next = new Set(current);
      // For the default space, legacy un-prefixed entries also need to be
      // removed so that the projection (which falls through legacy keys to
      // default) does not leave a "ghost" expansion after a collapse click.
      if (next.has(key)) {
        next.delete(key);
        if (activeSpaceSlug === DEFAULT_SPACE_SLUG) next.delete(dirPath);
      } else if (activeSpaceSlug === DEFAULT_SPACE_SLUG && next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSpaceCollapse = (slug: string) => {
    setSpaceCollapse((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const renderToolLink = ({ key, Icon }: (typeof SECTIONS)[number]) => {
    const isLegacyLintSettingsActive = key === "settings" && activeSection === "lint";
    const isActive = key === activeSection || isLegacyLintSettingsActive;
    return (
      <a
        key={key}
        {...hostNavigation.linkProps(buildSectionHref(key, activeSpaceSlug))}
        aria-current={isActive ? "page" : undefined}
        className={[
          "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
          isActive && !isLegacyLintSettingsActive
            ? "bg-accent text-foreground"
            : isActive
              ? "text-foreground"
            : "text-foreground/80 hover:bg-accent/50 hover:text-foreground",
        ].join(" ")}
        style={{ textDecoration: "none" }}
      >
        <span aria-hidden="true" className="shrink-0">
          <Icon />
        </span>
        <span className="flex-1 truncate">{wikiMessage(locale, SECTION_MESSAGE_KEYS[key])}</span>
      </a>
    );
  };

  return (
    <aside className="w-full h-full min-h-0 border-r border-border bg-background flex flex-col">
      {warmupSpaces.map((space) => (
        <SpacePagesWarmup key={space.slug} companyId={context.companyId} spaceSlug={space.slug} />
      ))}
      <div className="flex flex-col gap-1 px-3 py-3 shrink-0">
        <a
          {...hostNavigation.linkProps("/dashboard")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          style={{ textDecoration: "none" }}
        >
          <span aria-hidden="true" className="shrink-0">
            <ChevronLeftIcon size={14} />
          </span>
          <span className="truncate">{companyName}</span>
        </a>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto border-t border-border px-3 py-3">
        <nav aria-label={wikiMessage(locale, "navPrimary")} className="mb-3">
          <div className="flex flex-col gap-0.5">
            {TOP_TOOL_SECTIONS.map(renderToolLink)}
          </div>
        </nav>
        <div className="mb-1 flex items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground" style={{ height: 24 }}>
          <span
            className="flex-1 truncate"
            title={wikiMessage(locale, "sharedSpacesDescription")}
          >
            {wikiMessage(locale, "sharedSpaces")}
          </span>
          <button
            type="button"
            aria-label={wikiMessage(locale, "createSpace")}
            title={wikiMessage(locale, "createSpace")}
            onClick={() => setCreateOpen(true)}
            style={{
              width: 22,
              height: 22,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              color: tokens.muted,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            <PlusIcon size={14} />
          </button>
        </div>
        {spacesQuery.error ? (
          <div style={{ padding: "6px 8px", fontSize: 11, color: tokens.statusBlocked }}>
            {wikiMessage(locale, "failedToLoadSpaces", { message: spacesQuery.error.message })}
          </div>
        ) : null}
        {spaces.length === 0 && spacesQuery.loading ? (
          <Tiny style={{ padding: "6px 8px" }}>{wikiMessage(locale, "loadingSpaces")}</Tiny>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {spaces.map((space) => {
            const isActiveSpace = space.slug === activeSpaceSlug;
            const collapsed = spaceCollapse.has(space.slug);
            const showTree = isActiveSpace && !collapsed;
            return (
              <div key={space.slug} style={{ position: "relative" }}>
                <SpaceRow
                  space={space}
                  active={isActiveSpace}
                  expanded={showTree}
                  hostNavigation={hostNavigation}
                  onToggleCollapse={() => {
                    if (!isActiveSpace) {
                      setSpaceCollapse((current) => {
                        if (!current.has(space.slug)) return current;
                        const next = new Set(current);
                        next.delete(space.slug);
                        return next;
                      });
                      hostNavigation.navigate(buildSectionHref("browse", space.slug));
                    } else {
                      toggleSpaceCollapse(space.slug);
                    }
                  }}
                  onMenuToggle={() => setOpenMenuFor((curr) => curr === space.slug ? null : space.slug)}
                  menuOpen={openMenuFor === space.slug}
                  onMenuClose={() => setOpenMenuFor(null)}
                  onArchived={(slug) => {
                    spacesQuery.refresh();
                    setOpenMenuFor(null);
                    setSpaceCollapse((current) => {
                      if (!current.has(slug)) return current;
                      const next = new Set(current);
                      next.delete(slug);
                      return next;
                    });
                    if (activeSpaceSlug === slug) {
                      hostNavigation.navigate(buildSectionHref("browse", DEFAULT_SPACE_SLUG));
                    }
                  }}
                  activeSpaceSlug={activeSpaceSlug}
                  companyId={context.companyId}
                  locale={locale}
                />
                {showTree ? (
                  <div style={{ paddingLeft: 18, marginTop: 2, marginBottom: 6 }}>
                    <FileTree
                      nodes={activeSpaceNodes}
                      selectedFile={selectedTreePath}
                      expandedPaths={expandedForActiveSpace}
                      onSelectFile={(path) => {
                        setSelectedTreePath(path);
                        hostNavigation.navigate(buildPageHref(path, space.slug), { state: wikiSidebarNavigationState(path) });
                      }}
                      onToggleDir={handleToggleDir}
                      wrapLabels={false}
                      loading={pages.loading}
                      error={pages.error ? { message: pages.error.message } : null}
                      empty={{
                        title: wikiMessage(locale, "noPages"),
                        description: wikiMessage(locale, "addPagesToSpace"),
                      }}
                      ariaLabel={wikiMessage(locale, "pagesInSpace", { space: space.displayName })}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <nav
        aria-label={wikiMessage(locale, "navSecondary")}
        className="shrink-0 border-t border-border px-3 py-3"
      >
        <div className="flex flex-col gap-0.5">
          {BOTTOM_TOOL_SECTIONS.map(renderToolLink)}
        </div>
      </nav>
      {createOpen && context.companyId ? (
        <CreateSpaceModal
          companyId={context.companyId}
          locale={locale}
          existingSlugs={new Set(spaces.map((s) => s.slug))}
          onClose={() => setCreateOpen(false)}
          onCreated={(space) => {
            setCreateOpen(false);
            spacesQuery.refresh();
            hostNavigation.navigate(buildSectionHref("browse", space.slug));
          }}
        />
      ) : null}
    </aside>
  );
}

function SpaceRow({
  space,
  active,
  expanded,
  hostNavigation,
  onToggleCollapse,
  onMenuToggle,
  menuOpen,
  onMenuClose,
  onArchived,
  activeSpaceSlug,
  companyId,
  locale,
}: {
  space: WikiSpace;
  active: boolean;
  expanded: boolean;
  hostNavigation: ReturnType<typeof useHostNavigation>;
  onToggleCollapse: () => void;
  onMenuToggle: () => void;
  menuOpen: boolean;
  onMenuClose: () => void;
  onArchived: (slug: string) => void;
  activeSpaceSlug: string;
  companyId: string | null;
  locale: WikiLocale;
}) {
  const [hover, setHover] = useState(false);
  const isDefault = space.slug === DEFAULT_SPACE_SLUG;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={wikiMessage(locale, expanded ? "collapseSpace" : active ? "expandSpace" : "openSpace", { space: space.displayName })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px",
        borderRadius: 6,
        cursor: "pointer",
        background: active ? tokens.accent : "transparent",
        position: "relative",
      }}
      onClick={onToggleCollapse}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onToggleCollapse();
      }}
    >
      <span aria-hidden="true" style={{ color: tokens.muted, display: "flex", flexShrink: 0, transform: expanded ? "rotate(0)" : "rotate(0)" }}>
        {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
      </span>
      <span aria-hidden="true" style={{ color: tokens.muted, display: "flex", flexShrink: 0 }}>
        <FolderIcon size={16} />
      </span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: tokens.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {space.displayName}
      </span>
      {space.accessScope === "personal" ? (
        <Badge tone="default" style={{ height: 18, padding: "0 6px", fontSize: 10 }}>{wikiMessage(locale, "personal")}</Badge>
      ) : space.accessScope === "team" ? (
        <Badge tone="default" style={{ height: 18, padding: "0 6px", fontSize: 10 }}>{wikiMessage(locale, "team")}</Badge>
      ) : null}
      <button
        type="button"
        aria-label={wikiMessage(locale, "spaceMenu", { space: space.displayName })}
        title={wikiMessage(locale, "spaceMenuTitle")}
        onClick={(event) => {
          event.stopPropagation();
          onMenuToggle();
        }}
        style={{
          opacity: hover || menuOpen ? 1 : 0,
          transition: "opacity 80ms ease",
          width: 22,
          height: 22,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "transparent",
          color: tokens.fg,
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        <MoreHorizontalIcon size={14} />
      </button>
      {menuOpen ? (
        <SpaceRowMenu
          space={space}
          isDefault={isDefault}
          hostNavigation={hostNavigation}
          activeSpaceSlug={activeSpaceSlug}
          companyId={companyId}
          onClose={onMenuClose}
          onArchived={onArchived}
          locale={locale}
        />
      ) : null}
    </div>
  );
}

function SpaceRowMenu({
  space,
  isDefault,
  hostNavigation,
  activeSpaceSlug,
  companyId,
  onClose,
  onArchived,
  locale,
}: {
  space: WikiSpace;
  isDefault: boolean;
  hostNavigation: ReturnType<typeof useHostNavigation>;
  activeSpaceSlug: string;
  companyId: string | null;
  onClose: () => void;
  onArchived: (slug: string) => void;
  locale: WikiLocale;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const archive = usePluginAction("archive-space");
  const bootstrap = usePluginAction("bootstrap-space");
  const toast = usePluginToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!ref.current) return;
      if (event.target instanceof Node && ref.current.contains(event.target)) return;
      onClose();
    };
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  const handleArchive = async () => {
    if (!companyId || isDefault || busy) return;
    if (typeof window !== "undefined" && !window.confirm(wikiMessage(locale, "confirmArchiveSpace", { space: space.displayName }))) {
      return;
    }
    setBusy(true);
    try {
      await archive({ companyId, spaceSlug: space.slug });
      toast({ tone: "success", title: wikiMessage(locale, "spaceArchived"), body: wikiMessage(locale, "spaceHiddenFromSidebar", { space: space.displayName }) });
      onArchived(space.slug);
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "archiveFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    if (!companyId || busy) return;
    setBusy(true);
    try {
      await bootstrap({ companyId, spaceSlug: space.slug });
      toast({ tone: "success", title: wikiMessage(locale, "spaceRefreshed"), body: wikiMessage(locale, "spaceIndexRebuilt", { space: space.displayName }) });
      onClose();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "refreshFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        right: 0,
        zIndex: 30,
        minWidth: 220,
        background: tokens.card,
        border: `1px solid ${tokens.border}`,
        borderRadius: 8,
        boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
        padding: 4,
      }}
    >
      <SpaceMenuItem
        label={wikiMessage(locale, "editSpace")}
        Icon={PencilIcon}
        onClick={() => {
          onClose();
          hostNavigation.navigate(buildSettingsSectionHref("spaces", activeSpaceSlug, space.slug));
        }}
      />
      <SpaceMenuItem
        label={wikiMessage(locale, "refreshIndex")}
        Icon={RefreshIcon}
        onClick={handleRefresh}
        disabled={busy}
      />
      <SpaceMenuItem
        label={wikiMessage(locale, "openIngest")}
        Icon={PlusCircleIcon}
        onClick={() => {
          onClose();
          hostNavigation.navigate(buildSectionHref("ingest", space.slug));
        }}
      />
      <SpaceMenuDivider />
      <SpaceMenuItem
        label={wikiMessage(locale, isDefault ? "archiveDefaultSpace" : "archiveSpace")}
        Icon={ArchiveIcon}
        onClick={handleArchive}
        disabled={isDefault || busy}
        destructive
      />
    </div>
  );
}

function SpaceMenuItem({
  label,
  Icon,
  onClick,
  disabled,
  destructive,
}: {
  label: string;
  Icon: (props: LucideIconProps) => ReactElement;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        background: "transparent",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        color: destructive ? "oklch(0.7 0.2 25)" : tokens.fg,
        opacity: disabled ? 0.5 : 1,
        fontSize: 13,
        textAlign: "left",
        borderRadius: 4,
        fontFamily: fontStack,
      }}
      onMouseEnter={(event) => {
        if (disabled) return;
        event.currentTarget.style.background = tokens.accent;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "transparent";
      }}
    >
      <span aria-hidden="true" style={{ display: "flex", color: destructive ? "oklch(0.7 0.2 25)" : tokens.muted }}>
        <Icon size={14} />
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

function SpaceMenuDivider() {
  return <div style={{ height: 1, background: tokens.border, margin: "4px 0" }} />;
}

const shellStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  minHeight: 600,
  background: tokens.bg,
  color: tokens.fg,
  fontFamily: fontStack,
  fontSize: 14,
};

// ---------------------------------------------------------------------------
// Pre-flight: prompt for folder before any tab can be useful.
// ---------------------------------------------------------------------------

function UnconfiguredFolder({ context, folder, locale, refresh }: { context: { companyId: string | null }; folder?: FolderStatus; locale: WikiLocale; refresh: () => void }) {
  const bootstrap = usePluginAction("bootstrap-root");
  const toast = usePluginToast();
  const isMobile = useIsMobileLayout();
  const [path, setPath] = useState(folder?.path ?? "");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const configuredButUnhealthy = Boolean(folder?.configured);

  useEffect(() => {
    setPath(folder?.path ?? "");
  }, [folder?.path]);

  async function submit() {
    if (!context.companyId || !path.trim()) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const result = await bootstrap({ companyId: context.companyId, path: path.trim() });
      const written = (result as { writtenFiles?: string[] }).writtenFiles ?? [];
      toast({
        tone: "success",
        title: wikiMessage(locale, "wikiRootConfiguredTitle"),
        body: written.length
          ? wikiMessage(locale, "bootstrapCreatedFiles", { count: written.length })
          : wikiMessage(locale, "existingFilesPreserved"),
      });
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      toast({ tone: "error", title: wikiMessage(locale, "wikiRootConfigureFailedTitle"), body: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ flex: 1, padding: isMobile ? 16 : 28, display: "grid", placeItems: "start", overflow: isMobile ? "visible" : "auto", minWidth: 0 }}>
      <Card style={{ maxWidth: 720, width: "100%" }}>
        <CardHeader title={wikiMessage(locale, configuredButUnhealthy ? "repairWikiRootFolder" : "chooseWikiRootFolder")} />
        <CardBody>
          <Tiny style={{ marginBottom: 12 }}>
            {configuredButUnhealthy
              ? wikiMessage(locale, "wikiRootNotReady")
              : `${wikiMessage(locale, "wikiRootChoosePath")} `}
            {!configuredButUnhealthy ? <><Mono>raw/</Mono>, <Mono>wiki/</Mono>, <Mono>AGENTS.md</Mono>, <Mono>IDEA.md</Mono>, <Mono>wiki/index.md</Mono>, <Mono>wiki/log.md</Mono> {wikiMessage(locale, "wikiRootFilesExist")}</> : null}
          </Tiny>
          {folder?.problems?.length ? (
            <Callout tone="danger">
              <div style={{ display: "grid", gap: 6 }}>
                {folder.problems.map((problem, index) => (
                  <div key={`${problem.code}:${problem.path ?? index}`}>
                    {problem.message}{problem.path ? <> <Mono>{problem.path}</Mono></> : null}
                  </div>
                ))}
              </div>
            </Callout>
          ) : null}
          <div style={{ display: "grid", gap: 12 }}>
            {folder ? <FolderHealthChecklist folder={folder} locale={locale} /> : null}
            <FolderPathPicker
              locale={locale}
              value={path}
              onChange={setPath}
              onApply={submit}
              applyLabel={wikiMessage(locale, configuredButUnhealthy ? "repairAndBootstrap" : "configureAndBootstrap")}
              busy={busy}
              disabled={!path.trim()}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="ghost" onClick={() => refresh()}>{wikiMessage(locale, "alreadyConfigured")}</Button>
            </div>
            {errorMsg ? <Callout tone="danger">{errorMsg}</Callout> : null}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Browse tab: selected page detail. The route sidebar owns the file tree.
// ---------------------------------------------------------------------------

const TEMPLATE_PATHS = ["AGENTS.md", "IDEA.md"] as const;
const BASELINE_DIRECTORIES = ["raw", "wiki", "wiki/sources", "wiki/projects", "wiki/entities", "wiki/concepts", "wiki/synthesis"] as const;
const BASELINE_FILES = [...TEMPLATE_PATHS, "wiki/index.md", "wiki/log.md"] as const;
const BASELINE_TREE_ORDER = new Map<string, number>([
  ["AGENTS.md", 0],
  ["IDEA.md", 1],
  ["raw", 2],
  ["wiki", 3],
  ["wiki/index.md", 0],
  ["wiki/log.md", 1],
  ["wiki/sources", 2],
  ["wiki/projects", 3],
  ["wiki/entities", 4],
  ["wiki/concepts", 5],
  ["wiki/synthesis", 6],
]);

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function dirname(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function ensureDir(roots: FileTreeNode[], dirPath: string): FileTreeNode {
  const segments = dirPath.split("/").filter(Boolean);
  let parentChildren = roots;
  let currentPath = "";
  let currentNode: FileTreeNode | null = null;
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    let next = parentChildren.find((c) => c.kind === "dir" && c.path === currentPath);
    if (!next) {
      next = { name: segment, path: currentPath, kind: "dir", children: [] };
      parentChildren.push(next);
    }
    parentChildren = next.children;
    currentNode = next;
  }
  if (!currentNode) {
    throw new Error(`ensureDir called with empty path`);
  }
  return currentNode;
}

function pageDisplayName(path: string, title: string | null): string {
  const trimmed = title?.trim();
  return trimmed ? trimmed : basename(path);
}

function treeDisplayName(path: string, title: string | null): string {
  return (BASELINE_FILES as readonly string[]).includes(path) ? basename(path) : pageDisplayName(path, title);
}

function buildBrowseTree(
  pages: WikiPageRow[],
  sources: WikiSourceRow[],
): FileTreeNode[] {
  const roots: FileTreeNode[] = [];
  const seenPaths = new Set<string>();

  for (const dirPath of BASELINE_DIRECTORIES) {
    ensureDir(roots, dirPath);
  }

  if (sources.length > 0) {
    const rawDir = ensureDir(roots, "raw");
    for (const source of sources) {
      seenPaths.add(source.rawPath);
      const node: FileTreeNode = {
        name: pageDisplayName(source.rawPath, source.title),
        path: source.rawPath,
        kind: "file",
        children: [],
      };
      rawDir.children.push(node);
    }
  }

  for (const page of pages) {
    seenPaths.add(page.path);
    const parentDir = dirname(page.path);
    const file: FileTreeNode = {
      name: treeDisplayName(page.path, page.title),
      path: page.path,
      kind: "file",
      children: [],
    };
    if (parentDir) {
      ensureDir(roots, parentDir).children.push(file);
    } else {
      roots.push(file);
    }
  }

  // Add the baseline files using their real wiki-root paths so the browser
  // mirrors the on-disk default layout even before metadata has been indexed.
  for (const path of BASELINE_FILES) {
    if (seenPaths.has(path)) continue;
    const parentDir = dirname(path);
    const node = {
      name: basename(path),
      path,
      kind: "file" as const,
      children: [],
      action: path,
    };
    seenPaths.add(path);
    if (parentDir) {
      ensureDir(roots, parentDir).children.push(node);
      continue;
    }
    roots.push({
      ...node,
      name: path,
    });
  }

  function sortNodes(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => {
      const orderA = BASELINE_TREE_ORDER.get(a.path);
      const orderB = BASELINE_TREE_ORDER.get(b.path);
      if (orderA != null || orderB != null) return (orderA ?? Number.MAX_SAFE_INTEGER) - (orderB ?? Number.MAX_SAFE_INTEGER);
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.kind === "dir") sortNodes(node.children);
    }
  }
  sortNodes(roots);

  return roots;
}

function expandedAncestors(path: string | null): string[] {
  if (!path) return [];
  const out: string[] = [];
  const segments = path.split("/").filter(Boolean);
  let current = "";
  for (let i = 0; i < segments.length - 1; i++) {
    current = current ? `${current}/${segments[i]}` : segments[i];
    out.push(current);
  }
  return out;
}

function BrowseTab({ context, locale }: { context: { companyId: string | null }; locale: WikiLocale }) {
  const { pathname, search } = useHostLocation();
  const activeSpaceSlug = useMemo(() => readActiveSpaceSlugFromLocation(pathname), [pathname]);
  const pages = usePages(context.companyId, { includeRaw: true, spaceSlug: activeSpaceSlug });
  const isMobile = useIsMobileLayout();
  const selectedTreePath = readSelectedTreePathFromLocation(pathname, search) ?? firstSelectableTreePath(pages.data);
  const selected = contentPathFromTreePath(selectedTreePath);

  return (
    <div style={{ flex: 1, minWidth: 0, overflow: isMobile ? "visible" : "auto" }}>
      {pages.loading && !selected ? (
        <div style={{ padding: isMobile ? 16 : 28, color: tokens.muted, fontSize: 13 }}>{wikiMessage(locale, "loadingPages")}</div>
      ) : pages.error && !selected ? (
        <div style={{ padding: isMobile ? 16 : 28 }}><Callout tone="danger">{wikiMessage(locale, "failedToLoadPages", { message: pages.error.message })}</Callout></div>
      ) : (
        <PageDetail context={context} path={selected} spaceSlug={activeSpaceSlug} locale={locale} />
      )}
    </div>
  );
}

function PageDetail({ context, path, spaceSlug, locale }: { context: { companyId: string | null }; path: string | null; spaceSlug?: string; locale: WikiLocale }) {
  const content = usePageContent(context.companyId, path, spaceSlug ?? null);
  const writePage = usePluginAction("write-page");
  const toast = usePluginToast();
  const hostNavigation = useHostNavigation();
  const isMobile = useIsMobileLayout();
  const markdownBodyRef = useRef<HTMLDivElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [savedHash, setSavedHash] = useState<string | null>(null);
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const parsedMarkdown = useMemo(() => parseWikiMarkdown(content.data?.contents ?? ""), [content.data?.contents]);
  const tocHeadings = useMemo(() => extractWikiTocHeadings(parsedMarkdown.body), [parsedMarkdown.body]);

  useEffect(() => {
    setEditing(false);
    setSavedHash(null);
    setTocOpen(true);
    setActiveTocId(null);
  }, [path]);

  useEffect(() => {
    if (!content.data || editing) return;
    const root = markdownBodyRef.current;
    if (!root) return;
    const renderedHeadings = Array.from(root.querySelectorAll("h2, h3, h4"));
    tocHeadings.forEach((heading, index) => {
      const element = renderedHeadings[index];
      if (element instanceof HTMLElement) {
        element.id = heading.id;
      }
    });
  }, [content.data, editing, tocHeadings]);

  useEffect(() => {
    if (!content.data || editing || tocHeadings.length === 0) return;
    const root = markdownBodyRef.current;
    if (!root) return;

    const scrollParent = findScrollableAncestor(root);
    const updateActiveHeading = () => {
      const containerTop = scrollParent instanceof HTMLElement ? scrollParent.getBoundingClientRect().top : 0;
      const activationY = containerTop + 96;
      let activeId = tocHeadings[0]?.id ?? null;

      for (const heading of tocHeadings) {
        const element = root.ownerDocument.getElementById(heading.id);
        if (!(element instanceof HTMLElement)) continue;
        if (!root.contains(element)) continue;
        if (element.getBoundingClientRect().top <= activationY) {
          activeId = heading.id;
        } else {
          break;
        }
      }

      setActiveTocId(activeId);
    };

    updateActiveHeading();
    scrollParent.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);
    return () => {
      scrollParent.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [content.data, editing, tocHeadings]);

  const editable = path ? isEditableWikiPagePath(path) : false;
  const resolveWikiLinkHref = useCallback(
    (target: string) => buildWikiLinkHref(target, hostNavigation.resolveHref),
    [hostNavigation.resolveHref],
  );
  const handleTocClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const root = markdownBodyRef.current;
    const target = root?.ownerDocument.getElementById(id);
    if (!(target instanceof HTMLElement)) return;
    if (root && !root.contains(target)) return;
    event.preventDefault();
    setActiveTocId(id);
    target.scrollIntoView({ block: "start", behavior: "smooth" });
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${id}`);
    }
  }, []);
  const savePageContents = useCallback(async (nextContents: string) => {
    if (!context.companyId || !content.data || !editable || !path) return;
    const result = await writePage({
        companyId: context.companyId,
        wikiId: content.data.wikiId,
        spaceSlug: spaceSlug ?? null,
        path,
        contents: nextContents,
        expectedHash: savedHash ?? content.data.hash,
        summary: `Edited ${path} from the LLM Wiki page`,
    }) as { hash?: string };
    if (typeof result.hash === "string") setSavedHash(result.hash);
  }, [context.companyId, content.data, editable, path, savedHash, writePage, spaceSlug]);

  if (!path) return <div style={{ padding: isMobile ? 16 : 28, color: tokens.muted, fontSize: 13 }}>{wikiMessage(locale, "pickPage")}</div>;
  if (content.loading) return <div style={{ padding: isMobile ? 16 : 28, color: tokens.muted, fontSize: 13 }}>{wikiMessage(locale, "loadingPage", { path })}</div>;
  if (content.error && path.startsWith("raw/")) {
    return (
      <div style={{ padding: isMobile ? 16 : 28, display: "grid", gap: 12 }}>
        <Callout tone="warn">
          {wikiMessage(locale, "capturedSourcePrefix")} <Mono>{path}</Mono> {wikiMessage(locale, "capturedSourceSuffix")}
        </Callout>
        <Tiny>{content.error.message}</Tiny>
      </div>
    );
  }
  if (content.error) return <div style={{ padding: isMobile ? 16 : 28 }}><Callout tone="danger">{wikiMessage(locale, "failedToReadPage", { path, message: content.error.message })}</Callout></div>;
  if (!content.data) return <div style={{ padding: isMobile ? 16 : 28, color: tokens.muted, fontSize: 13 }}>{wikiMessage(locale, "noContentForPage", { path })}</div>;
  const { contents, title, sourceRefs, updatedAt, hash } = content.data;
  const visibleFrontmatter = parsedMarkdown.frontmatter.filter((property) => property.key.toLowerCase() !== "title");
  const displayTitle = (BASELINE_FILES as readonly string[]).includes(path) ? basename(path) : title ?? basename(path);
  const folderPath = dirname(path);

  const isDistilledProjectPage = path.startsWith("wiki/projects/");
  const showToc = !editing && tocHeadings.length > 0;
  const displaySourceRefs = sourceRefs
    .map((ref, index) => ({
      id: sourceRefIdentity(ref, index),
      label: formatSourceRef(ref, index),
      hasDisplayText: typeof ref === "string" || readSourceRefField(ref, "title") !== null,
    }))
    .filter((ref) => ref.hasDisplayText);

  return (
    <article style={{ padding: isMobile ? "16px" : "24px 28px", display: "grid", gap: isMobile ? 12 : 14, minWidth: 0 }}>
      <header style={{ display: "grid", gap: 8, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
          <div style={{ flex: "1 1 260px", minWidth: 0 }}>
            {folderPath ? <Tiny style={{ display: "block", marginBottom: 6 }}><Mono>{folderPath}</Mono></Tiny> : null}
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 22, overflowWrap: "anywhere" }}>{displayTitle}</h1>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {isDistilledProjectPage ? (
              <Button size="sm" variant="ghost" onClick={() => setProvenanceOpen(true)} title={wikiMessage(locale, "showProvenance")}>
                <InfoIcon size={12} /> {wikiMessage(locale, "provenance")}
              </Button>
            ) : null}
            {editable && !editing ? (
              <Button size="sm" onClick={() => { setSavedHash(hash); setEditing(true); }}>{wikiMessage(locale, "editPage")}</Button>
            ) : editable ? (
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); content.refresh(); }}>{wikiMessage(locale, "done")}</Button>
            ) : (
              <Badge>{wikiMessage(locale, "readOnlySource")}</Badge>
            )}
          </div>
        </div>
        <Tiny>{wikiMessage(locale, "updated", { time: formatWikiRelativeTime(updatedAt, locale) })}</Tiny>
      </header>
      {isDistilledProjectPage && path ? (
        <FreshnessChip companyId={context.companyId} pagePath={path} companyPrefix={(context as { companyPrefix?: string | null }).companyPrefix ?? null} locale={locale} />
      ) : null}
      {editing ? (
        <>
          <AutosaveMarkdownEditor
            key={`${path}:${hash}`}
            resetKey={`${path}:${hash}`}
            value={contents}
            locale={locale}
            placeholder={wikiMessage(locale, "editPagePlaceholder", { path })}
            minHeight={isMobile ? 260 : 420}
            onSave={async (nextContents) => {
              await savePageContents(nextContents);
              toast({ tone: "success", title: wikiMessage(locale, "savedPage", { path }) });
            }}
          />
        </>
      ) : (
        <div
          data-testid="llm-wiki-page-content-layout"
          style={{
            display: "grid",
            gridTemplateColumns: showToc && !isMobile ? `minmax(0, 1fr) ${tocOpen ? "minmax(180px, 240px)" : "36px"}` : "minmax(0, 1fr)",
            gap: showToc && !isMobile ? (tocOpen ? 24 : 10) : 0,
            alignItems: "start",
            minWidth: 0,
          }}
        >
          <div style={{ display: "grid", gap: isMobile ? 12 : 14, minWidth: 0 }}>
            <div ref={markdownBodyRef} style={{ minWidth: 0, fontSize: 13, lineHeight: 1.65 }}>
              <FrontmatterProperties properties={visibleFrontmatter} locale={locale} />
              <MarkdownBlock
                content={parsedMarkdown.body}
                enableWikiLinks
                resolveWikiLinkHref={resolveWikiLinkHref}
              />
              {displaySourceRefs.length > 0 ? (
                <section aria-label={wikiMessage(locale, "paperclipSourceRefs")} style={{ marginTop: 16, display: "grid", gap: 6 }}>
                  <Tiny style={{ fontWeight: 650 }}>{wikiMessage(locale, "paperclipSourceRefs")}</Tiny>
                  <ul style={{ margin: 0, paddingLeft: 18, color: tokens.muted, fontSize: 12, lineHeight: 1.5 }}>
                    {displaySourceRefs.map((ref) => (
                      <li key={ref.id}>{ref.label}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </div>
          {showToc ? (
            <OnThisPagePane
              headings={tocHeadings}
              activeHeadingId={activeTocId}
              open={tocOpen}
              onToggle={() => setTocOpen((current) => !current)}
              onHeadingClick={handleTocClick}
              mobile={isMobile}
              locale={locale}
            />
          ) : null}
        </div>
      )}
      {provenanceOpen && path ? (
        <ProvenanceDrawer
          companyId={context.companyId}
          pagePath={path}
          onClose={() => setProvenanceOpen(false)}
          locale={locale}
        />
      ) : null}
    </article>
  );
}

function findScrollableAncestor(element: HTMLElement): HTMLElement | Window {
  let current: HTMLElement | null = element.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return window;
}

function OnThisPagePane({
  headings,
  activeHeadingId,
  open,
  onToggle,
  onHeadingClick,
  mobile,
  locale,
}: {
  headings: WikiTocHeading[];
  activeHeadingId: string | null;
  open: boolean;
  onToggle: () => void;
  onHeadingClick: (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
  mobile: boolean;
  locale: WikiLocale;
}) {
  const contentId = "llm-wiki-on-this-page";
  const currentHeadingId = activeHeadingId ?? headings[0]?.id ?? null;
  const shellRef = useRef<HTMLElement | null>(null);
  const [fixedFrame, setFixedFrame] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (mobile) {
      setFixedFrame(null);
      return;
    }
    const shell = shellRef.current;
    if (!shell) return;

    let animationFrame = 0;
    const updateFrame = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const rect = shell.getBoundingClientRect();
        const top = Math.max(WIKI_TOC_STICKY_TOP, rect.top);
        setFixedFrame((current) => {
          if (
            current &&
            Math.abs(current.left - rect.left) < 0.5 &&
            Math.abs(current.top - top) < 0.5 &&
            Math.abs(current.width - rect.width) < 0.5
          ) {
            return current;
          }
          return { left: rect.left, top, width: rect.width };
        });
      });
    };

    updateFrame();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateFrame);
    resizeObserver?.observe(shell);
    window.addEventListener("resize", updateFrame);
    window.addEventListener("scroll", updateFrame, true);
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateFrame);
      window.removeEventListener("scroll", updateFrame, true);
    };
  }, [mobile, open]);

  const paneStyle: CSSProperties = mobile ? {} : fixedFrame ? {
    position: "fixed",
    top: fixedFrame.top,
    left: fixedFrame.left,
    width: fixedFrame.width,
    maxHeight: `calc(100vh - ${fixedFrame.top + 16}px)`,
    overflowY: "auto",
    zIndex: 2,
  } : {
    position: "sticky",
    top: WIKI_TOC_STICKY_TOP,
  };

  return (
    <aside
      ref={shellRef}
      aria-label={wikiMessage(locale, "onThisPage")}
      style={{
        order: mobile ? -1 : 0,
        minWidth: 0,
        minHeight: mobile ? undefined : open ? 120 : 24,
        alignSelf: "start",
      }}
    >
      <div style={{
        ...paneStyle,
        borderLeft: open ? `1px solid ${tokens.border}` : 0,
        paddingLeft: open ? 10 : 0,
      }}>
        <button
          type="button"
          aria-label={wikiMessage(locale, open ? "collapseOnThisPage" : "expandOnThisPage")}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "space-between" : "center",
            gap: 10,
            width: "100%",
            border: 0,
            background: "transparent",
            color: tokens.fg,
            padding: open ? "0 0 8px" : "0",
            fontFamily: fontStack,
            fontSize: 12,
            fontWeight: 650,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {open ? <span>{wikiMessage(locale, "onThisPage")}</span> : null}
          <span aria-hidden="true" style={{ color: tokens.muted, transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 120ms ease" }}>
            <ChevronLeftIcon size={13} />
          </span>
        </button>
        {open ? (
          <nav id={contentId} style={{ display: "grid", gap: 2 }}>
            {headings.map((heading) => {
              const active = heading.id === currentHeadingId;
              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  aria-current={active ? "location" : undefined}
                  onClick={(event) => onHeadingClick(event, heading.id)}
                  style={{
                    display: "block",
                    padding: `3px 0 3px ${Math.max(0, heading.level - 2) * 12}px`,
                    color: active ? tokens.fg : tokens.muted,
                    fontSize: 12,
                    fontWeight: active ? 700 : 450,
                    lineHeight: 1.35,
                    textDecoration: "none",
                    overflowWrap: "anywhere",
                  }}
                >
                  {heading.text}
                </a>
              );
            })}
          </nav>
        ) : null}
      </div>
    </aside>
  );
}

function FreshnessChip({ companyId, pagePath, companyPrefix, locale }: { companyId: string | null; pagePath: string; companyPrefix: string | null; locale: WikiLocale }) {
  const provenance = useDistillationProvenance(companyId, pagePath);
  const binding = provenance.data?.binding ?? null;
  const cursor = provenance.data?.cursor ?? null;

  if (provenance.loading && !provenance.data) {
    return <FreshnessChipShell tone="info" icon={<ClockIcon size={14} />}>{wikiMessage(locale, "checkingDistillationCursor")}</FreshnessChipShell>;
  }
  if (!binding) return null;

  const lastEnd = binding.lastRunSourceWindowEnd ?? binding.lastRunCompletedAt;
  const status = binding.lastRunStatus ?? "unknown";
  const sourceCount = (() => {
    const meta = binding.metadata as Record<string, unknown>;
    const refs = Array.isArray(meta.sourceRefs) ? meta.sourceRefs.length : null;
    return refs;
  })();
  const isStale = (() => {
    if (status === "failed" || status === "refused_cost_cap") return true;
    if (!lastEnd) return true;
    const diff = Date.now() - Date.parse(lastEnd);
    return Number.isFinite(diff) ? diff > 72 * 60 * 60 * 1000 : true;
  })();
  const isFailed = status === "failed" || status === "refused_cost_cap";
  const isRunning = status === "running";

  const tone: "info" | "warn" | "danger" | "running" = isFailed ? "danger" : isStale ? "warn" : isRunning ? "running" : "info";
  const projectLink = cursor && cursor.projectId && companyPrefix ? `/${companyPrefix}/projects/${cursor.projectId}` : null;

  return (
    <FreshnessChipShell
      tone={tone}
      icon={isFailed ? <AlertTriangleIcon size={14} /> : isRunning ? <ActivityIcon size={14} /> : <ClockIcon size={14} />}
    >
      <span><strong>{wikiMessage(locale, "currentAsOf", { time: formatWikiTimestamp(lastEnd, locale) })}</strong>
        {sourceCount ? ` ${wikiMessage(locale, sourceCount === 1 ? "oneSourceInWindow" : "manySourcesInWindow", { count: new Intl.NumberFormat(locale).format(sourceCount) })} ` : " "}
        {wikiMessage(locale, "cursorAt")} <Mono>{lastEnd ?? "—"}</Mono>.
      </span>
      {projectLink ? (
        <a href={projectLink} style={{ marginLeft: 8, color: "inherit", textDecoration: "underline" }}>
          {wikiMessage(locale, "openPaperclipLiveState")}
        </a>
      ) : null}
    </FreshnessChipShell>
  );
}

function FreshnessChipShell({ tone, icon, children }: { tone: "info" | "warn" | "danger" | "running"; icon: ReactNode; children: ReactNode }) {
  const palette = tone === "danger"
    ? { bg: "oklch(0.22 0.06 25)", fg: "oklch(0.85 0.12 25)", border: "oklch(0.45 0.12 25)" }
    : tone === "warn"
      ? { bg: "oklch(0.22 0.06 70)", fg: "oklch(0.85 0.1 70)", border: "oklch(0.45 0.12 70)" }
      : tone === "running"
        ? { bg: "oklch(0.22 0.06 200)", fg: "oklch(0.85 0.11 200)", border: "oklch(0.45 0.12 200)" }
        : tokens.callout;
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 999,
      background: palette.bg,
      color: palette.fg,
      border: `1px solid ${palette.border}`,
      fontSize: 12.5,
      lineHeight: 1.5,
      flexWrap: "wrap",
    }}>
      {icon}
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

function readSourceRefField(ref: Record<string, unknown>, field: string): string | null {
  const value = ref[field];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function sourceRefIdentity(ref: Record<string, unknown> | string, fallbackIndex: number): string {
  if (typeof ref === "string") return ref;
  const issueIdentifier = readSourceRefField(ref, "issueIdentifier");
  const issueId = readSourceRefField(ref, "issueId");
  const commentId = readSourceRefField(ref, "commentId");
  const documentKey = readSourceRefField(ref, "documentKey");
  const documentId = readSourceRefField(ref, "documentId");
  const kind = readSourceRefField(ref, "kind");
  const parts = [kind, issueIdentifier ?? issueId, commentId, documentKey ?? documentId].filter(Boolean);
  return parts.length > 0 ? parts.join(":") : `source-ref-${fallbackIndex}`;
}

function formatSourceRef(ref: Record<string, unknown> | string, fallbackIndex: number): string {
  if (typeof ref === "string") return ref;

  const kind = readSourceRefField(ref, "kind");
  const issue = readSourceRefField(ref, "issueIdentifier") ?? readSourceRefField(ref, "issueId");
  const title = readSourceRefField(ref, "title");
  const commentId = readSourceRefField(ref, "commentId");
  const documentKey = readSourceRefField(ref, "documentKey");
  const documentId = readSourceRefField(ref, "documentId");

  const primary = issue ?? sourceRefIdentity(ref, fallbackIndex);
  const suffix = kind === "comment" && commentId
    ? ` comment ${commentId.slice(0, 8)}`
    : kind === "document" && (documentKey || documentId)
      ? ` document ${documentKey ?? documentId?.slice(0, 8)}`
      : kind ? ` ${kind}` : "";
  return title ? `${primary}${suffix} - ${title}` : `${primary}${suffix}`;
}

function ProvenanceDrawer({ companyId, pagePath, onClose, locale }: { companyId: string | null; pagePath: string; onClose: () => void; locale: WikiLocale }) {
  const isMobile = useIsMobileLayout();
  const provenance = useDistillationProvenance(companyId, pagePath);
  const data = provenance.data;
  const binding = data?.binding ?? null;
  const cursor = data?.cursor ?? null;
  const snapshot = data?.snapshot ?? null;
  const runs = data?.runs ?? [];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "oklch(0 0 0 / 0.55)",
        zIndex: 50,
        display: "flex",
        justifyContent: isMobile ? "stretch" : "flex-end",
        alignItems: isMobile ? "flex-end" : "stretch",
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: tokens.bg,
          borderLeft: isMobile ? undefined : `1px solid ${tokens.border}`,
          borderTop: isMobile ? `1px solid ${tokens.border}` : undefined,
          width: isMobile ? "100%" : 420,
          maxWidth: "100%",
          maxHeight: isMobile ? "85vh" : "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <InfoIcon size={16} />
          <strong style={{ fontSize: 14, flex: 1 }}>{wikiMessage(locale, "provenance")}</strong>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={wikiMessage(locale, "close")}>
            <XIcon size={14} />
          </Button>
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {provenance.loading && !data ? <Tiny>{wikiMessage(locale, "loadingProvenance")}</Tiny> : null}
          {!binding && !provenance.loading ? <Callout>{wikiMessage(locale, "notBoundToCursor")}</Callout> : null}
          {binding ? (
            <Card>
              <CardBody padding={14}>
                <PropRow label={wikiMessage(locale, "pagePath")} value={<Mono>{binding.pagePath}</Mono>} />
                <PropRow label={wikiMessage(locale, "sourceHash")} value={<Mono>{binding.lastRunSourceHash?.slice(0, 16) ?? "—"}…</Mono>} />
                <PropRow label={wikiMessage(locale, "cursorEnd")} value={<Mono>{binding.lastRunSourceWindowEnd ? formatWikiTimestamp(binding.lastRunSourceWindowEnd, locale) : "—"}</Mono>} />
                <PropRow label={wikiMessage(locale, "lastRunStatus")} value={<Badge tone={runStatusTone(binding.lastRunStatus ?? "")}>{wikiRunStatusLabel(locale, binding.lastRunStatus ?? "—")}</Badge>} />
                <PropRow label={wikiMessage(locale, "project")} value={binding.projectName ?? "—"} />
                <PropRow label={wikiMessage(locale, "updatedLabel")} value={formatWikiTimestamp(binding.updatedAt, locale)} />
              </CardBody>
            </Card>
          ) : null}
          {cursor ? (
            <Card>
              <CardHeader title={wikiMessage(locale, "cursor")} />
              <CardBody padding={14}>
                <PropRow label={wikiMessage(locale, "scope")} value={cursor.sourceScope} />
                <PropRow label={wikiMessage(locale, "pendingEvents")} value={String(cursor.pendingEventCount)} />
                <PropRow label={wikiMessage(locale, "lastObserved")} value={formatWikiTimestamp(cursor.lastObservedAt, locale)} />
                <PropRow label={wikiMessage(locale, "lastProcessed")} value={formatWikiTimestamp(cursor.lastProcessedAt, locale)} />
              </CardBody>
            </Card>
          ) : null}
          {snapshot ? (
            <Card>
              <CardHeader title={wikiMessage(locale, "sourcesInWindow")} />
              <CardBody padding={14}>
                <Tiny style={{ marginBottom: 8 }}>
                  {wikiMessage(locale, snapshot.sourceRefs.length === 1 ? "oneSourceRef" : "manySourceRefs", { count: new Intl.NumberFormat(locale).format(snapshot.sourceRefs.length) })}
                  {snapshot.clipped ? ` · ${wikiMessage(locale, "clipped")}` : ""}
                </Tiny>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: tokens.muted, lineHeight: 1.5 }}>
                  {snapshot.sourceRefs.slice(0, 8).map((ref, index) => {
                    const obj = typeof ref === "object" && ref ? ref as Record<string, unknown> : null;
                    const id = obj && typeof obj.id === "string" ? obj.id : typeof ref === "string" ? ref : `ref-${index}`;
                    const kind = obj && typeof obj.kind === "string" ? obj.kind : null;
                    const title = obj && typeof obj.title === "string" ? obj.title : null;
                    return (
                      <li key={`${id}-${index}`} style={{ marginBottom: 4 }}>
                        <Mono>{id}</Mono>
                        {kind ? ` · ${kind}` : ""}
                        {title ? ` · ${title}` : ""}
                      </li>
                    );
                  })}
                </ul>
                {snapshot.sourceRefs.length > 8 ? <Tiny style={{ marginTop: 6 }}>{wikiMessage(locale, "moreSources", { count: new Intl.NumberFormat(locale).format(snapshot.sourceRefs.length - 8) })}</Tiny> : null}
              </CardBody>
            </Card>
          ) : null}
          {runs.length > 0 ? (
            <Card>
              <CardHeader title={wikiMessage(locale, "operationsAffectingPage")} />
              <CardBody padding={0}>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {runs.slice(0, 8).map((run) => (
                    <li key={run.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${tokens.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Mono style={{ fontSize: 12 }}>{run.operationIssueIdentifier ?? `op-${run.id.slice(0, 6)}`}</Mono>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <Tiny>{formatWikiTimestamp(run.updatedAt, locale)}</Tiny>
                        <Mono style={{ fontSize: 11 }}>{formatCostCents(run.costCents)}</Mono>
                        <Badge tone={runStatusTone(run.status)}>{wikiRunStatusLabel(locale, run.status)}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FrontmatterProperties({ properties, locale }: { properties: WikiFrontmatterProperty[]; locale: WikiLocale }) {
  if (properties.length === 0) return null;

  return (
    <details
      open
      style={{
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: `1px solid ${tokens.border}`,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          color: tokens.fg,
          fontSize: 13,
          fontWeight: 650,
          listStylePosition: "outside",
          marginBottom: 10,
        }}
      >
        {wikiMessage(locale, "properties")}
      </summary>
      <dl style={{ display: "grid", gap: 8, margin: 0, maxWidth: 720 }}>
        {properties.map((property) => (
          <div
            key={property.key}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(96px, 0.32fr) minmax(0, 1fr)",
              gap: 12,
              alignItems: "baseline",
              minWidth: 0,
            }}
          >
            <dt style={{ color: tokens.muted, fontSize: 12, minWidth: 0, overflowWrap: "anywhere" }}>{property.key}</dt>
            <dd style={{ margin: 0, minWidth: 0 }}>
              <FrontmatterValue value={property.value} />
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function FrontmatterValue({ value }: { value: WikiFrontmatterValue }) {
  if (Array.isArray(value)) {
    return (
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
        {value.map((item) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              minWidth: 0,
              maxWidth: "100%",
              padding: "1px 7px",
              borderRadius: 999,
              background: "var(--secondary, oklch(0.269 0 0))",
              color: tokens.fg,
              fontSize: 12,
              lineHeight: 1.5,
              overflowWrap: "anywhere",
            }}
          >
            {item}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span style={{ color: tokens.fg, fontSize: 13, overflowWrap: "anywhere" }}>
      {value}
    </span>
  );
}

function Row({ primary, secondary, right }: { primary: ReactNode; secondary?: ReactNode; right?: ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
      padding: "8px 12px",
      borderBottom: `1px solid ${tokens.border}`,
      fontSize: 13,
      minWidth: 0,
    }}>
      <div style={{ flex: "1 1 220px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", overflowWrap: "anywhere" }}>{primary}</div>
      {secondary ? <div style={{ flex: "0 1 auto", minWidth: 0, color: tokens.muted, fontSize: 12, overflowWrap: "anywhere" }}>{secondary}</div> : null}
      {right ? <div style={{ marginLeft: "auto", minWidth: 0, display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>{right}</div> : null}
    </div>
  );
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Ingest tab.
// ---------------------------------------------------------------------------

function IngestTab({ context, locale, refreshOverview }: { context: { companyId: string | null }; locale: WikiLocale; refreshOverview: () => void }) {
  const { pathname } = useHostLocation();
  const activeSpaceSlug = useMemo(() => readActiveSpaceSlugFromLocation(pathname), [pathname]);
  const spacesQuery = useSpaces(context.companyId);
  const spaces = useMemo(() => {
    const list = spacesQuery.data?.spaces ?? [];
    return activeWikiSpaces(list).sort(compareSpaces);
  }, [spacesQuery.data]);
  const ingest = usePluginAction("ingest-source");
  const toast = usePluginToast();
  const hostNavigation = useHostNavigation();
  const isMobile = useIsMobileLayout();
  const [url, setUrl] = useState("");
  const [pasted, setPasted] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const activeSpace = useMemo(() => {
    return spaces.find((space) => space.slug === activeSpaceSlug)
      ?? spaces.find((space) => space.slug === DEFAULT_SPACE_SLUG)
      ?? null;
  }, [spaces, activeSpaceSlug]);

  const canSubmit = !!context.companyId && (pasted.trim().length > 0 || url.trim().length > 0) && !busy;

  useEffect(() => {
    const refresh = () => refreshOverview();
    window.addEventListener("pc-wiki-ingest-queued", refresh);
    return () => window.removeEventListener("pc-wiki-ingest-queued", refresh);
  }, [refreshOverview]);

  async function submit() {
    if (!context.companyId) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      let contents = pasted.trim();
      let sourceType: "url" | "text" = "text";
      let resolvedTitle = title.trim();
      if (url.trim()) {
        sourceType = "url";
        contents = pasted.trim() || `Captured URL: ${url.trim()}\n\n_Plugin needs to fetch the URL — placeholder body for the alpha._`;
        resolvedTitle = resolvedTitle || url.trim();
      } else {
        resolvedTitle = resolvedTitle || pasted.split("\n", 1)[0]?.slice(0, 80) || "Pasted source";
      }
      await ingest({
        companyId: context.companyId,
        spaceSlug: activeSpaceSlug,
        sourceType,
        url: url.trim() || null,
        title: resolvedTitle,
        contents,
      });
      const spaceLabel = activeSpace?.displayName ?? activeSpaceSlug;
      toast({
        tone: "success",
        title: wikiMessage(locale, "sourceCapturedInto", { space: spaceLabel }),
        body: wikiMessage(locale, "operationCreatedHistory"),
      });
      setUrl("");
      setPasted("");
      setTitle("");
      refreshOverview();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      toast({ tone: "error", title: wikiMessage(locale, "ingestFailed"), body: message });
    } finally {
      setBusy(false);
    }
  }

  const spaceLabel = activeSpace?.displayName ?? activeSpaceSlug;

  return (
    <div style={{ flex: 1, minHeight: isMobile ? "auto" : 0, minWidth: 0, overflow: isMobile ? "visible" : "auto" }}>
      <div style={{
        padding: isMobile ? "16px" : "24px 28px",
        maxWidth: 920,
        minWidth: 0,
      }}>
        <div style={{ marginBottom: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: tokens.muted }}>{wikiMessage(locale, "ingestTitle")}</div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 650 }}>{wikiMessage(locale, "captureInto", { space: spaceLabel })}</h2>
        <Tiny style={{ marginBottom: 18 }}>
          {wikiMessage(locale, "ingestDescription", { spaceSlug: activeSpaceSlug, rawPath: "raw/" })}
        </Tiny>
        <div style={{ display: "grid", gap: 14, marginBottom: 18 }}>
          <SpacePicker
            spaces={spaces}
            locale={locale}
            activeSpaceSlug={activeSpaceSlug}
            loading={spacesQuery.loading}
            error={spacesQuery.error?.message ?? null}
            isOpen={spaceMenuOpen}
            onToggle={() => setSpaceMenuOpen((v) => !v)}
            onClose={() => setSpaceMenuOpen(false)}
            onSelect={(slug) => {
              setSpaceMenuOpen(false);
              hostNavigation.navigate(buildSectionHref("ingest", slug));
            }}
            onCreate={() => {
              setSpaceMenuOpen(false);
              setCreateOpen(true);
            }}
          />
          <div>
            <label style={{ fontSize: 11, color: tokens.muted, display: "block", marginBottom: 6 }}>{wikiMessage(locale, "dropFilesLabel")}</label>
            <div style={{
              minHeight: isMobile ? 180 : 230,
              border: `1.5px dashed ${tokens.pluginBorder}`,
              borderRadius: 8,
              padding: isMobile ? 20 : 30,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              textAlign: "center",
              color: tokens.muted,
              background: tokens.pluginBg,
            }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, borderRadius: 8, background: tokens.card, color: tokens.pluginFg, border: `1px solid ${tokens.pluginBorder}` }}>
                <DownloadCloudIcon size={24} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 650, color: tokens.fg }}>{wikiMessage(locale, "dropFilesLabel")}</div>
              <Tiny>{wikiMessage(locale, "reviewStagedFiles")}</Tiny>
            </div>
          </div>
          <div data-testid="llm-wiki-ingest-manual-separator" aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 12, color: tokens.muted, fontSize: 11, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span style={{ height: 1, flex: 1, background: tokens.border }} />
            <span>{wikiMessage(locale, "or")}</span>
            <span style={{ height: 1, flex: 1, background: tokens.border }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: tokens.muted, display: "block", marginBottom: 4 }}>{wikiMessage(locale, "sourceTitle")}</label>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={wikiMessage(locale, "sourceTitlePlaceholder")} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: tokens.muted, display: "block", marginBottom: 4 }}>{wikiMessage(locale, "sourceUrl")}</label>
            <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/article" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: tokens.muted, display: "block", marginBottom: 4 }}>{wikiMessage(locale, "sourceContent")}</label>
            <TextArea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={wikiMessage(locale, "sourceContentPlaceholder")} rows={8} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="primary" onClick={submit} disabled={!canSubmit} loading={busy}>{wikiMessage(locale, "captureAndIngest")}</Button>
        </div>
        {errorMsg ? <div style={{ marginTop: 14 }}><Callout tone="danger">{errorMsg}</Callout></div> : null}
      </div>
      {createOpen && context.companyId ? (
        <CreateSpaceModal
          companyId={context.companyId}
          locale={locale}
          existingSlugs={new Set(spaces.map((s) => s.slug))}
          onClose={() => setCreateOpen(false)}
          onCreated={(space) => {
            setCreateOpen(false);
            spacesQuery.refresh();
            hostNavigation.navigate(buildSectionHref("ingest", space.slug));
          }}
        />
      ) : null}
    </div>
  );
}

function SpacePicker({
  spaces,
  locale,
  activeSpaceSlug,
  loading,
  error,
  isOpen,
  onToggle,
  onClose,
  onSelect,
  onCreate,
}: {
  spaces: WikiSpace[];
  locale: WikiLocale;
  activeSpaceSlug: string;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (slug: string) => void;
  onCreate: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const active = spaces.find((s) => s.slug === activeSpaceSlug);
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: MouseEvent) => {
      if (!ref.current) return;
      if (event.target instanceof Node && ref.current.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ fontSize: 11, color: tokens.muted, display: "block", marginBottom: 4 }}>{wikiMessage(locale, "spaceLabel")}</label>
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "oklch(0.2 0 0)",
          border: `1px solid ${tokens.border}`,
          borderRadius: 6,
          padding: "8px 10px",
          color: tokens.fg,
          fontFamily: fontStack,
          fontSize: 13,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <FolderIcon size={14} />
        <span style={{ flex: 1, fontWeight: 600 }}>{active?.displayName ?? activeSpaceSlug}</span>
        {active ? (
          <Badge tone="default" style={{ fontSize: 10, padding: "0 6px" }}>{active.accessScope}</Badge>
        ) : null}
        <ChevronDownIcon size={14} />
      </button>
      <div style={{ marginTop: 6, fontSize: 11, color: tokens.muted, lineHeight: 1.4 }}>
        {wikiMessage(locale, "spacePickerHelp")}
      </div>
      {isOpen ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 25,
            background: tokens.card,
            border: `1px solid ${tokens.border}`,
            borderRadius: 8,
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
            padding: 4,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {error ? <div style={{ padding: 10, fontSize: 12, color: tokens.statusBlocked }}>{error}</div> : null}
          {loading ? <div style={{ padding: 10 }}><Tiny>{wikiMessage(locale, "loadingSpaces")}</Tiny></div> : null}
          {spaces.map((space) => (
            <button
              key={space.slug}
              type="button"
              role="option"
              aria-selected={space.slug === activeSpaceSlug}
              onClick={() => onSelect(space.slug)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: space.slug === activeSpaceSlug ? tokens.accent : "transparent",
                border: "none",
                borderRadius: 6,
                color: tokens.fg,
                fontSize: 13,
                fontFamily: fontStack,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <FolderIcon size={14} />
              <span style={{ flex: 1, fontWeight: 600 }}>{space.displayName}</span>
              <span style={{ fontSize: 10, color: tokens.muted, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{space.slug}</span>
            </button>
          ))}
          <SpaceMenuDivider />
          <button
            type="button"
            onClick={onCreate}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              color: "oklch(0.78 0.13 250)",
              fontSize: 13,
              fontFamily: fontStack,
              cursor: "pointer",
              textAlign: "left",
              fontWeight: 600,
            }}
          >
            <PlusIcon size={14} />
            <span>{wikiMessage(locale, "newSharedSpace")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function OperationCard({ op }: { op: WikiOperationRow }) {
  return (
    <Card>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
          <StatusIcon status={op.status} />
          <strong style={{ flex: "1 1 180px", minWidth: 0, fontSize: 13, overflowWrap: "anywhere" }}>{op.hiddenIssueTitle ?? `LLM Wiki ${op.operationType}`}</strong>
          <Badge tone={statusTone(op.status)} style={{ marginLeft: "auto" }}>{op.status}</Badge>
        </div>
        <Tiny style={{ marginTop: 4 }}>
          {op.operationType.toUpperCase()} · started {formatTime(op.createdAt)} · op-{op.id.slice(0, 6)}
          {op.hiddenIssueIdentifier ? <> · <Mono>{op.hiddenIssueIdentifier}</Mono></> : null}
        </Tiny>
        {Array.isArray(op.warnings) && op.warnings.length > 0 ? (
          <Tiny style={{ marginTop: 4, color: tokens.statusBlocked }}>
            {op.warnings.length} warning{op.warnings.length === 1 ? "" : "s"}
          </Tiny>
        ) : null}
      </div>
    </Card>
  );
}

function statusTone(status: string): Tone {
  if (status === "done") return "done";
  if (status === "running" || status === "in_progress") return "running";
  if (status === "blocked" || status === "failed") return "failed";
  if (status === "queued" || status === "todo") return "todo";
  if (status === "paused") return "paused";
  return "default";
}

// ---------------------------------------------------------------------------
// Ask tab.
// ---------------------------------------------------------------------------

type QueryThreadEntry = {
  id: string;
  prompt: string;
  operationId: string | null;
  querySessionId: string | null;
  hiddenIssueIdentifier: string | null;
  channel: string | null;
  status: "queued" | "running" | "done" | "error";
  createdAt: string;
  answer: string;
  errorMessage?: string;
};

type QueryStreamEvent = {
  type: string;
  operationId?: string;
  querySessionId?: string;
  message?: string | null;
  payload?: Record<string, unknown> | null;
  eventType?: string;
  stream?: string | null;
  answer?: string;
};

function queryStatusLabel(locale: WikiLocale, status: QueryThreadEntry["status"]): string {
  switch (status) {
    case "queued": return wikiMessage(locale, "queryQueued");
    case "running": return wikiMessage(locale, "queryRunning");
    case "done": return wikiMessage(locale, "queryDone");
    case "error": return wikiMessage(locale, "queryError");
  }
}

function QueryTab({ context, locale, overview }: { context: { companyId: string | null }; locale: WikiLocale; overview: OverviewData }) {
  const startQuery = usePluginAction("start-query");
  const fileAsPage = usePluginAction("file-as-page");
  const toast = usePluginToast();
  const { pathname } = useHostLocation();
  const activeSpaceSlug = useMemo(() => readActiveSpaceSlugFromLocation(pathname), [pathname]);
  const isMobile = useIsMobileLayout();
  const [thread, setThread] = useState<QueryThreadEntry[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [filePath, setFilePath] = useState("wiki/concepts/new-page.md");
  const [fileBody, setFileBody] = useState("");
  const [filing, setFiling] = useState<string | null>(null);
  const fileSource = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i -= 1) {
      const entry = thread[i];
      if (entry.answer.trim()) return entry;
    }
    return null;
  }, [thread]);

  const activeEntry = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i -= 1) {
      const entry = thread[i];
      if (entry.status === "running" || entry.status === "queued") return entry;
    }
    return null;
  }, [thread]);

  const stream = usePluginStream<QueryStreamEvent>(activeEntry?.channel ?? "llm-wiki:idle", {
    companyId: context.companyId ?? undefined,
  });

  useEffect(() => {
    if (!activeEntry || !stream.lastEvent) return;
    const event = stream.lastEvent;
    setThread((prev) => prev.map((entry) => {
      if (entry.id !== activeEntry.id) return entry;
      if (event.type === "agent.event" && event.eventType === "chunk" && event.message && event.stream !== "stderr") {
        return { ...entry, answer: entry.answer + event.message, status: "running" };
      }
      if (event.type === "query.done") {
        return { ...entry, status: "done", answer: event.answer ?? entry.answer };
      }
      if (event.type === "query.error") {
        return { ...entry, status: "error", errorMessage: event.message ?? wikiMessage(locale, "querySessionError") };
      }
      return entry;
    }));
    if (event.type === "query.done" && event.answer && !fileBody.trim()) {
      setFileBody(event.answer);
    }
  }, [fileBody, stream.lastEvent, activeEntry?.id]);

  async function send() {
    if (!context.companyId || !prompt.trim()) return;
    setBusy(true);
    const entryId = `q-${Date.now()}`;
    setThread((prev) => [...prev, {
      id: entryId,
      prompt: prompt.trim(),
      operationId: null,
      querySessionId: null,
      hiddenIssueIdentifier: null,
      channel: null,
      status: "queued",
      createdAt: new Date().toISOString(),
      answer: "",
    }]);
    try {
      const res = await startQuery({ companyId: context.companyId, spaceSlug: activeSpaceSlug, question: prompt.trim() });
      const result = res as {
        operationId: string;
        querySessionId?: string;
        channel?: string;
        issue?: { identifier?: string | null };
      };
      setThread((prev) => prev.map((entry) =>
        entry.id === entryId ? {
          ...entry,
          operationId: result.operationId,
          querySessionId: result.querySessionId ?? result.operationId,
          hiddenIssueIdentifier: result.issue?.identifier ?? null,
          channel: result.channel ?? `llm-wiki:query:${result.operationId}`,
          status: "running",
        } : entry,
      ));
      setPrompt("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setThread((prev) => prev.map((entry) =>
        entry.id === entryId ? { ...entry, status: "error", errorMessage: message } : entry,
      ));
      toast({ tone: "error", title: wikiMessage(locale, "askFailed"), body: message });
    } finally {
      setBusy(false);
    }
  }

  async function fileAnswer(entry?: QueryThreadEntry) {
    const source = entry ?? fileSource;
    const answer = fileBody.trim() || source?.answer.trim() || "";
    if (!context.companyId || !filePath.trim() || !answer) return;
    setFiling(source?.id ?? "manual");
    try {
      await fileAsPage({
        companyId: context.companyId,
        wikiId: overview.wikiId,
        spaceSlug: activeSpaceSlug,
        path: filePath.trim(),
        question: source?.prompt,
        answer,
        querySessionId: source?.querySessionId,
      });
      toast({
        tone: "success",
        title: wikiMessage(locale, "answerFiled"),
        body: wikiMessage(locale, "answerFiledBody", { path: filePath.trim() }),
      });
      setFileBody("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ tone: "error", title: wikiMessage(locale, "couldNotFileAnswer"), body: message });
    } finally {
      setFiling(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", flex: 1, minHeight: isMobile ? "auto" : 0, minWidth: 0 }}>
      <div style={{ flex: 1, padding: isMobile ? "16px" : "24px 28px", overflow: isMobile ? "visible" : "auto", minWidth: 0 }}>
        {thread.length === 0 ? (
          <Callout>{wikiMessage(locale, "queryEmpty")}</Callout>
        ) : null}
        <div style={{ display: "grid", gap: 22, marginTop: 18 }}>
          {thread.map((entry) => (
            <div key={entry.id}>
              <Tiny style={{ marginBottom: 4 }}>{wikiMessage(locale, "queryUserTime", { time: formatWikiRelativeTime(entry.createdAt, locale) })}</Tiny>
              <div style={{ background: tokens.card, border: `1px solid ${tokens.border}`, padding: "10px 12px", borderRadius: 8, fontSize: 13 }}>{entry.prompt}</div>
              <Tiny style={{ marginTop: 8 }}>
                {wikiMessage(locale, "queryMaintainerStatus", { status: queryStatusLabel(locale, entry.status) })}
                {entry.hiddenIssueIdentifier ? <> · <Mono>{entry.hiddenIssueIdentifier}</Mono></> : null}
              </Tiny>
              {entry.status === "error" ? (
                <div style={{ marginTop: 6 }}><Callout tone="danger">{entry.errorMessage}</Callout></div>
              ) : (
                <pre style={{
                  margin: "8px 0 0",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "ui-sans-serif, system-ui, sans-serif",
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: tokens.fg,
                }}>{entry.answer || (entry.status === "running" ? wikiMessage(locale, "queryStreaming") : "")}</pre>
              )}
              {entry.answer.trim() && entry.status === "done" ? (
                <div style={{ marginTop: 10, border: `1px dashed ${tokens.border}`, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 13 }}>📑 {wikiMessage(locale, "fileAnswerPrompt")}</strong>
                    <Tiny style={{ marginLeft: isMobile ? 0 : "auto", width: isMobile ? "100%" : undefined }}>{wikiMessage(locale, "queryFilePath", { path: filePath })}</Tiny>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <TextInput value={filePath} onChange={(e) => setFilePath(e.target.value)} style={{ maxWidth: isMobile ? "none" : 360 }} />
                    <Button size="sm" variant="primary" onClick={() => fileAnswer(entry)} disabled={!filePath.trim()} loading={filing === entry.id}>{wikiMessage(locale, "acceptAndFile")}</Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: 14, marginTop: 22 }}>
          <TextArea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={wikiMessage(locale, "askWikiPlaceholder")} rows={3} />
          <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Button variant="primary" size="sm" onClick={send} disabled={!prompt.trim()} loading={busy}>{wikiMessage(locale, "sendShortcut")}</Button>
            <Badge>{wikiMessage(locale, "citeWikiAndRaw")}</Badge>
            <Badge>{wikiMessage(locale, "maxSteps", { count: 6 })}</Badge>
            <Tiny style={{ marginLeft: "auto" }}>{wikiMessage(locale, "streamedViaMaintainer")}</Tiny>
          </div>
        </div>
      </div>
      <aside style={{
        width: isMobile ? "auto" : 320,
        borderLeft: isMobile ? "none" : `1px solid ${tokens.border}`,
        borderTop: isMobile ? `1px solid ${tokens.border}` : "none",
        padding: isMobile ? "16px" : "18px 20px",
        overflow: isMobile ? "visible" : "auto",
        minWidth: 0,
      }}>
        <Tiny style={{ marginBottom: 8 }}>{wikiMessage(locale, "session").toLocaleUpperCase(locale)}</Tiny>
        <PropRow label={wikiMessage(locale, "navWiki")} value={overview.wikiId} />
        <PropRow label={wikiMessage(locale, "projectLabel")} value={overview.managedProject.details?.name ?? overview.managedProject.status} />
        <PropRow label={wikiMessage(locale, "agentLabel")} value={overview.managedAgent.details?.name ?? overview.managedAgent.status} />
        <PropRow label={wikiMessage(locale, "operationsLabel")} value={overview.operationCount} />
        <PropRow label={wikiMessage(locale, "streamLabel")} value={stream.connected ? wikiMessage(locale, "streamLive") : stream.connecting ? wikiMessage(locale, "streamConnecting") : wikiMessage(locale, "streamIdle")} />
        <Divider />
        <Tiny style={{ marginBottom: 8 }}>{wikiMessage(locale, "askPrompt").toLocaleUpperCase(locale)}</Tiny>
        <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", fontSize: 12, color: tokens.muted }}>{overview.prompts.query}</pre>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lint tab.
// ---------------------------------------------------------------------------

function LintTab({ context, overview, refreshOverview, locale }: { context: { companyId: string | null }; overview: OverviewData; refreshOverview: () => void; locale: WikiLocale }) {
  const isMobile = useIsMobileLayout();
  return (
    <div style={{ flex: 1, minHeight: isMobile ? "auto" : 0, overflow: isMobile ? "visible" : "auto", padding: isMobile ? "16px" : "24px 28px", display: "grid", gap: isMobile ? 14 : 18, minWidth: 0 }}>
      <LintPanelContent context={context} overview={overview} refreshOverview={refreshOverview} locale={locale} />
    </div>
  );
}

function SettingsLintPanel({ context, locale }: { context: { companyId: string | null }; locale: WikiLocale }) {
  const overview = useOverview(context.companyId);

  if (overview.error) {
    return <SettingsPanel title={wikiMessage(locale, "settingsLint")} badge={<HiddenOpBadge locale={locale} />} description={wikiMessage(locale, "lintPanelDescription")}>
      <Callout tone="danger">{wikiMessage(locale, "bridgeError", { message: overview.error.message })}</Callout>
    </SettingsPanel>;
  }

  if (!overview.data) {
    return <SettingsPanel title={wikiMessage(locale, "settingsLint")} badge={<HiddenOpBadge locale={locale} />} description={wikiMessage(locale, "lintPanelDescription")}>
      <Tiny>{wikiMessage(locale, "lintLoading")}</Tiny>
    </SettingsPanel>;
  }

  return (
    <SettingsPanel
      title={wikiMessage(locale, "settingsLint")}
      badge={<HiddenOpBadge locale={locale} />}
      description={wikiMessage(locale, "lintPanelDescription")}
    >
      <LintPanelContent context={context} overview={overview.data} refreshOverview={overview.refresh} locale={locale} showHeading={false} />
    </SettingsPanel>
  );
}

function LintPanelContent({
  context,
  overview,
  refreshOverview,
  locale,
  showHeading = true,
}: {
  context: { companyId: string | null };
  overview: OverviewData;
  refreshOverview: () => void;
  locale: WikiLocale;
  showHeading?: boolean;
}) {
  const create = usePluginAction("create-operation");
  const { pathname } = useHostLocation();
  const activeSpaceSlug = useMemo(() => readActiveSpaceSlugFromLocation(pathname), [pathname]);
  const operations = useOperations(context.companyId, { operationType: "lint", spaceSlug: activeSpaceSlug });
  const toast = usePluginToast();
  const isMobile = useIsMobileLayout();
  const [busy, setBusy] = useState(false);

  async function runLint() {
    if (!context.companyId) return;
    setBusy(true);
    try {
      await create({
        companyId: context.companyId,
        spaceSlug: activeSpaceSlug,
        operationType: "lint",
        title: `Run LLM Wiki lint · ${activeSpaceSlug}`,
        prompt: overview.prompts.lint,
      });
      toast({ tone: "success", title: wikiMessage(locale, "lintQueued"), body: wikiMessage(locale, "lintQueuedBody") });
      operations.refresh();
      refreshOverview();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "lintCouldNotRun"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  const recent = operations.data?.operations ?? [];
  const latestDone = recent.find((op) => op.status === "done");
  const findings = Array.isArray(latestDone?.warnings) ? (latestDone!.warnings as Record<string, unknown>[]) : [];
  const counts = aggregateLintFindings(findings);

  return (
    <div style={{ display: "grid", gap: isMobile ? 14 : 18, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {showHeading ? <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{wikiMessage(locale, "settingsLint")}</h2> : null}
        <Badge style={unfilledSurfaceStyle}>{wikiMessage(locale, recent.length === 1 ? "lintRunCountOne" : "lintRunCountMany", { count: new Intl.NumberFormat(locale).format(recent.length) })}</Badge>
        <Button variant="primary" size="sm" onClick={runLint} loading={busy} style={{ marginLeft: isMobile ? 0 : "auto" }}>{wikiMessage(locale, "lintRunNow")}</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <StatCard label={wikiMessage(locale, "lintFindings")} value={new Intl.NumberFormat(locale).format(counts.total)} hint={latestDone ? wikiMessage(locale, "lintLastRun", { time: formatWikiRelativeTime(latestDone.createdAt, locale) }) : wikiMessage(locale, "lintNoRunsYet")} />
        <StatCard label={wikiMessage(locale, "lintCritical")} value={new Intl.NumberFormat(locale).format(counts.critical)} hint={wikiMessage(locale, "lintContradictionsConflict")} tone={counts.critical > 0 ? "danger" : undefined} />
        <StatCard label={wikiMessage(locale, "lintOrphans")} value={new Intl.NumberFormat(locale).format(counts.orphan)} hint={wikiMessage(locale, "lintNoInboundBacklinks")} />
        <StatCard label={wikiMessage(locale, "lintStale")} value={new Intl.NumberFormat(locale).format(counts.stale)} hint={wikiMessage(locale, "lintProvenanceOver30Days")} />
        <StatCard label={wikiMessage(locale, "lintIndexDrift")} value={new Intl.NumberFormat(locale).format(counts.index)} hint={wikiMessage(locale, "lintIndexPaths")} />
      </div>
      <Card style={unfilledSurfaceStyle}>
        <CardHeader title={wikiMessage(locale, "lintFindings")} badges={<HiddenOpBadge locale={locale} />} right={<Tiny>{wikiMessage(locale, "lintTaskDescription")}</Tiny>} />
        <CardBody padding={0}>
          {findings.length === 0 ? (
            <div style={{ padding: 16, color: tokens.muted, fontSize: 13 }}>
              {latestDone ? wikiMessage(locale, "lintLatestNoFindings") : wikiMessage(locale, "lintNoCompletedRuns")}
            </div>
          ) : findings.map((f, idx) => {
            const severityTone: Tone = f.severity === "critical" ? "failed" : f.severity === "orphan" ? "paused" : "default";
            return (
              <Row
                key={idx}
                primary={
                  <span>
                    <Badge tone={severityTone} style={severityTone === "default" ? unfilledSurfaceStyle : undefined}>
                      {lintSeverityLabel(locale, String(f.severity ?? "info"))}
                    </Badge>
                    <span style={{ marginLeft: 8 }}>{String(f.message ?? f.title ?? "(no description)")}</span>
                  </span>
                }
                secondary={f.path ? <Mono>{String(f.path)}</Mono> : null}
              />
            );
          })}
        </CardBody>
      </Card>
      <Card style={unfilledSurfaceStyle}>
        <CardHeader title={wikiMessage(locale, "lintRecentRuns")} />
        <CardBody padding={0}>
          {recent.length === 0 ? <div style={{ padding: 12, color: tokens.muted, fontSize: 13 }}>{wikiMessage(locale, "lintNoRuns")}</div> : recent.map((op) => (
            <Row
              key={op.id}
              primary={<><Mono>op-{op.id.slice(0, 6)}</Mono> {op.hiddenIssueTitle ?? wikiMessage(locale, "lintOperationFallback")}</>}
              secondary={formatWikiRelativeTime(op.createdAt, locale)}
              right={<Badge tone={statusTone(op.status)}>{lintOperationStatusLabel(locale, op.status)}</Badge>}
            />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

function lintSeverityLabel(locale: WikiLocale, severity: string): string {
  const messageKey: Partial<Record<string, WikiMessageKey>> = {
    critical: "lintSeverityCritical",
    orphan: "lintSeverityOrphan",
    stale: "lintSeverityStale",
    info: "lintSeverityInfo",
  };
  const key = messageKey[severity];
  return key ? wikiMessage(locale, key) : severity;
}

function lintOperationStatusLabel(locale: WikiLocale, status: string): string {
  const messageKey: Partial<Record<string, WikiMessageKey>> = {
    todo: "lintStatusTodo",
    queued: "lintStatusQueued",
    in_progress: "lintStatusInProgress",
    running: "lintStatusRunning",
    blocked: "lintStatusBlocked",
    failed: "lintStatusFailed",
    paused: "lintStatusPaused",
    done: "lintStatusDone",
  };
  const key = messageKey[status];
  return key ? wikiMessage(locale, key) : status;
}

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" | "warn" }) {
  const palette = tone === "danger" ? { color: "oklch(0.7 0.2 25)" } : tone === "warn" ? { color: "oklch(0.85 0.1 70)" } : { color: tokens.fg };
  return (
    <Card style={{ ...unfilledSurfaceStyle, padding: 14 }}>
      <Tiny>{label.toUpperCase()}</Tiny>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, ...palette }}>{value}</div>
      {hint ? <Tiny style={{ marginTop: 2 }}>{hint}</Tiny> : null}
    </Card>
  );
}

function aggregateLintFindings(findings: Record<string, unknown>[]): { total: number; critical: number; orphan: number; stale: number; index: number } {
  const counts = { total: findings.length, critical: 0, orphan: 0, stale: 0, index: 0 };
  for (const f of findings) {
    const sev = String(f.severity ?? "");
    if (sev === "critical") counts.critical += 1;
    else if (sev === "orphan") counts.orphan += 1;
    else if (sev === "stale") counts.stale += 1;
    else if (sev === "index") counts.index += 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// History tab: native Paperclip issue table for recent LLM Wiki operation
// issues. Each plugin run is represented by an issue, so the standard issue
// history view is the right surface here.
// ---------------------------------------------------------------------------

function formatCostCents(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "—";
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function runStatusTone(status: string): Tone {
  if (status === "running") return "running";
  if (status === "succeeded" || status === "completed" || status === "done") return "done";
  if (status === "failed" || status === "refused_cost_cap") return "failed";
  if (status === "review_required") return "in_review";
  if (status === "paused") return "paused";
  if (status === "source_ready" || status === "queued") return "queued";
  return "default";
}

function runStatusLabel(locale: WikiLocale, status: string): string {
  switch (status) {
    case "review_required":
      return wikiMessage(locale, "reviewRequired");
    case "refused_cost_cap":
      return wikiMessage(locale, "costCapped");
    case "source_ready":
      return wikiMessage(locale, "sourceReady");
    case "running":
      return wikiMessage(locale, "runStatusRunning");
    case "succeeded":
    case "completed":
    case "done":
      return wikiMessage(locale, "runStatusSucceeded");
    case "failed":
    case "error":
      return wikiMessage(locale, "runStatusFailed");
    case "queued":
      return wikiMessage(locale, "runStatusQueued");
    case "paused":
      return wikiMessage(locale, "runStatusPaused");
    case "blocked":
      return wikiMessage(locale, "runStatusBlocked");
    case "todo":
      return wikiMessage(locale, "runStatusTodo");
    default:
      return status.replace(/_/g, " ");
  }
}

function wikiRunStatusLabel(locale: WikiLocale, status: string): string {
  return runStatusLabel(locale, status);
}

function HistoryTab({ context, locale, overview }: { context: { companyId: string | null; companyPrefix?: string | null }; locale: WikiLocale; overview: OverviewData }) {
  const isMobile = useIsMobileLayout();
  const projectId = overview.managedProject.projectId;
  const originKindPrefix = `plugin:${PLUGIN_ID}:operation`;

  if (!context.companyId) {
    return <div style={{ padding: isMobile ? 16 : 24, flex: 1 }}><Callout>{wikiMessage(locale, "chooseCompanyForHistory")}</Callout></div>;
  }

  if (!projectId) {
    return (
      <div style={{ padding: isMobile ? 16 : 24, flex: 1 }}>
        <Callout tone="warn">{wikiMessage(locale, "historyProjectUnresolved")}</Callout>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: isMobile ? "auto" : 0, overflow: isMobile ? "visible" : "auto", padding: isMobile ? 12 : 0, minWidth: 0 }}>
      <PluginIssuesList
        companyId={context.companyId}
        projectId={projectId}
        filters={{ originKindPrefix }}
        viewStateKey="paperclip:llm-wiki-history-issues-view"
        searchWithinLoadedIssues
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings (tab) and the standalone host SettingsPage share this body.
// ---------------------------------------------------------------------------

function SettingsTab({ context, locale, initialSection = "root" }: { context: { companyId: string | null; companyPrefix?: string | null }; locale: WikiLocale; initialSection?: SettingsSectionKey }) {
  const isMobile = useIsMobileLayout();
  return (
    <div style={{ flex: 1, minHeight: isMobile ? "auto" : 0, overflow: isMobile ? "visible" : "auto", padding: isMobile ? "16px" : "24px 28px", minWidth: 0 }}>
      <SettingsBody context={context} locale={locale} initialSection={initialSection} />
    </div>
  );
}

const ROUTINE_FALLBACKS: Record<string, { sourceTitle: string; titleKey: WikiMessageKey; cron: string }> = {
  "cursor-window-processing": { sourceTitle: "Process LLM Wiki updates", titleKey: "setupRoutineCursorWindowTitle", cron: "0 */6 * * *" },
  "nightly-wiki-lint": { sourceTitle: "Run LLM Wiki lint", titleKey: "setupRoutineNightlyLintTitle", cron: "0 3 * * *" },
  "index-refresh": { sourceTitle: "Refresh LLM Wiki index", titleKey: "setupRoutineIndexRefreshTitle", cron: "0 * * * *" },
};

const MANAGED_SKILL_LABELS: Record<string, { sourceName: string; messageKey: WikiMessageKey }> = {
  "wiki-maintainer": { sourceName: "LLM Wiki Maintainer", messageKey: "setupSkillWikiMaintainerName" },
  "wiki-ingest": { sourceName: "Wiki Ingest", messageKey: "setupSkillIngestName" },
  "wiki-query": { sourceName: "Wiki Query", messageKey: "setupSkillQueryName" },
  "wiki-lint": { sourceName: "Wiki Lint", messageKey: "setupSkillLintName" },
  "paperclip-distill": { sourceName: "Paperclip Distill", messageKey: "setupSkillPaperclipDistillName" },
  "index-refresh": { sourceName: "Index Refresh", messageKey: "setupSkillIndexRefreshName" },
};

function routineFallbackFor(routine: ManagedRoutine, locale: WikiLocale) {
  const key = routineResourceKey(routine);
  const fallback = key ? ROUTINE_FALLBACKS[key] : undefined;
  return key && fallback
    ? { title: routineDisplayTitle(routine, key, locale), cron: fallback.cron }
    : { title: routine.routine?.title ?? routine.details?.title ?? routine.resourceKey ?? wikiMessage(locale, "setupManagedRoutineLabel"), cron: "—" };
}

function managedRoutineStatus(routine: ManagedRoutine) {
  return routine.routine?.status ?? routine.details?.status ?? (routine.routineId ? "paused" : "missing");
}

type RoutineHealthItem = {
  label: string;
  ok: boolean;
  detail: string;
};

function routineResourceKey(routine: ManagedRoutine) {
  if (routine.pluginKey !== PLUGIN_ID || routine.resourceKind !== "routine") return null;
  const resourceKey = routine.resourceKey ?? "";
  const ownedKey = Object.keys(ROUTINE_FALLBACKS).find((key) =>
    resourceKey === key
    || resourceKey === `plugin:${PLUGIN_ID}:${key}`
    || resourceKey === `${PLUGIN_ID}:routine:${key}`,
  );
  return ownedKey ?? null;
}

function routineDisplayTitle(routine: ManagedRoutine | undefined, key: string, locale: WikiLocale) {
  const fallback = ROUTINE_FALLBACKS[key];
  if (!fallback) return routine?.routine?.title ?? routine?.details?.title ?? routine?.resourceKey ?? wikiMessage(locale, "setupManagedRoutineLabel");
  const currentTitle = routine?.routine?.title ?? routine?.details?.title;
  const isOwnedResource = !routine || routineResourceKey(routine) === key;
  if (!isOwnedResource) return currentTitle ?? routine?.resourceKey ?? wikiMessage(locale, "setupManagedRoutineLabel");
  return currentTitle && currentTitle !== fallback.sourceTitle
    ? currentTitle
    : wikiMessage(locale, fallback.titleKey);
}

function managedAgentIsReady(resource: ManagedAgent) {
  return resource.source === "managed" && Boolean(resource.agentId);
}

function managedProjectIsReady(resource: ManagedProject) {
  return resource.source === "managed" && Boolean(resource.projectId);
}

function managedSkillIsReady(resource: ManagedSkill) {
  return resource.status !== "missing" && Boolean(resource.skillId);
}

function skillLabel(resource: ManagedSkill, locale: WikiLocale) {
  const currentName = resource.details?.name ?? resource.skill?.name;
  const declaredLabel = MANAGED_SKILL_LABELS[resource.resourceKey ?? ""];
  const isOwnedSkill = resource.pluginKey === PLUGIN_ID && resource.resourceKind === "skill";
  if (isOwnedSkill && declaredLabel && (!currentName || currentName === declaredLabel.sourceName)) {
    return wikiMessage(locale, declaredLabel.messageKey);
  }
  return currentName ?? wikiMessage(locale, "setupManagedSkillLabel");
}

function buildAgentHealthItems(managedAgent: ManagedAgent, locale: WikiLocale): RoutineHealthItem[] {
  const sourceName = "Wiki Maintainer";
  const currentName = managedAgent.details?.name;
  const isOwnedMaintainer = managedAgent.source === "managed"
    && managedAgent.resourceKey === `${PLUGIN_ID}:agent:wiki-maintainer`;
  const agentName = isOwnedMaintainer && (!currentName || currentName === sourceName)
    ? wikiMessage(locale, "setupWikiMaintainerName")
    : currentName ?? wikiMessage(locale, "setupManagedAgentLabel");
  return [{
    label: agentName,
    ok: managedAgentIsReady(managedAgent) && !managedAgent.defaultDrift?.changedFiles.length,
    detail: managedAgent.source === "managed"
      ? managedAgent.defaultDrift?.changedFiles.length
        ? wikiMessage(locale, "setupAgentManagedDrift", { files: managedAgent.defaultDrift.changedFiles.join(", ") })
        : wikiMessage(locale, "setupAgentManagedCurrent")
      : wikiMessage(locale, "setupAgentSelected"),
  }];
}

function buildProjectHealthItems(managedProject: ManagedProject, locale: WikiLocale): RoutineHealthItem[] {
  const sourceName = "LLM Wiki";
  const currentName = managedProject.details?.name;
  const isOwnedProject = managedProject.source === "managed"
    && managedProject.resourceKey === `${PLUGIN_ID}:project:llm-wiki`;
  const projectName = isOwnedProject && (!currentName || currentName === sourceName)
    ? wikiMessage(locale, "setupLLMWikiProjectName")
    : currentName ?? wikiMessage(locale, "setupManagedProjectLabel");
  return [{
    label: projectName,
    ok: managedProjectIsReady(managedProject),
    detail: managedProject.source === "managed"
      ? wikiMessage(locale, "setupProjectManaged")
      : wikiMessage(locale, "setupProjectSelected"),
  }];
}

function buildSkillHealthItems(skills: ManagedSkill[], locale: WikiLocale): RoutineHealthItem[] {
  if (skills.length === 0) {
    return [{
      label: wikiMessage(locale, "setupManagedSkillLabel"),
      ok: false,
      detail: wikiMessage(locale, "setupNoManagedSkills"),
    }];
  }
  return skills.map((skill) => ({
    label: skillLabel(skill, locale),
    ok: managedSkillIsReady(skill) && !skill.defaultDrift?.changedFiles.length,
    detail: managedSkillIsReady(skill)
      ? skill.defaultDrift?.changedFiles.length
        ? wikiMessage(locale, "setupSkillDrift", { name: skillLabel(skill, locale), files: skill.defaultDrift.changedFiles.join(", ") })
        : wikiMessage(locale, "setupSkillInstalled", { name: skillLabel(skill, locale) })
      : wikiMessage(locale, "setupSkillMissing", { name: skillLabel(skill, locale) }),
  }));
}

function buildRoutineHealthItems(
  routines: ManagedRoutine[],
  managedAgent: ManagedAgent,
  managedProject: ManagedProject,
  locale: WikiLocale,
): RoutineHealthItem[] {
  const routineByKey = new Map<string, ManagedRoutine>();
  for (const routine of routines) {
    const key = routineResourceKey(routine);
    if (key) routineByKey.set(key, routine);
  }
  const expectedAgentId = managedAgent.source === "managed" ? managedAgent.agentId ?? null : null;
  const expectedProjectId = managedProject.source === "managed" ? managedProject.projectId ?? null : null;
  const items: RoutineHealthItem[] = [];

  for (const [key, fallback] of Object.entries(ROUTINE_FALLBACKS)) {
    const routine = routineByKey.get(key);
    const fallbackTitle = routineDisplayTitle(routine, key, locale);
    const routineAgentId = routine?.routine?.assigneeAgentId ?? null;
    const routineProjectId = routine?.routine?.projectId ?? null;
    const missingRefs = routine?.missingRefs ?? [];
    const missing = !routine?.routineId || !routine.routine;
    const wrongAgent = Boolean(expectedAgentId && routineAgentId && routineAgentId !== expectedAgentId);
    const wrongProject = Boolean(expectedProjectId && routineProjectId && routineProjectId !== expectedProjectId);
    const missingAgent = Boolean(expectedAgentId && !routineAgentId);
    const missingProject = Boolean(expectedProjectId && !routineProjectId);
    const blockedByManagedResources = !expectedAgentId || !expectedProjectId;
    const ok = Boolean(routine && !missing && missingRefs.length === 0 && !wrongAgent && !wrongProject && !missingAgent && !missingProject && !blockedByManagedResources);
    let detail = wikiMessage(locale, "setupRoutineHealthy", { routine: fallbackTitle });
    if (missing) {
      detail = wikiMessage(locale, "setupRoutineMissing", { routine: fallbackTitle });
    } else if (missingRefs.length > 0) {
      detail = wikiMessage(locale, "setupRoutineUnresolved", {
        routine: fallbackTitle,
        refs: missingRefs.map((ref) => `${ref.resourceKind}:${ref.resourceKey}`).join(", "),
      });
    } else if (blockedByManagedResources) {
      detail = wikiMessage(locale, "setupRoutineBlocked", { routine: fallbackTitle });
    } else if (wrongAgent || missingAgent) {
      detail = wikiMessage(locale, "setupRoutineWrongAgent", { routine: fallbackTitle });
    } else if (wrongProject || missingProject) {
      detail = wikiMessage(locale, "setupRoutineWrongProject", { routine: fallbackTitle });
    }
    items.push({ label: fallbackTitle, ok, detail });
  }

  return items;
}

function RoutineHealthChecklist({ items, locale }: { items: RoutineHealthItem[]; locale: WikiLocale }) {
  return (
    <ManagedResourceHealthChecklist
      items={items}
      ariaLabel={wikiMessage(locale, "setupRoutineHealthChecklist")}
      heading={wikiMessage(locale, "setupRoutineHealthHeading")}
    />
  );
}

function ManagedResourceHealthChecklist({
  items,
  ariaLabel,
  heading,
}: {
  items: RoutineHealthItem[];
  ariaLabel: string;
  heading: string;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }} aria-label={ariaLabel}>
      <div style={{ fontSize: 12, fontWeight: 650, color: tokens.muted }}>{heading}</div>
      <div role="list" style={{ position: "relative", display: "grid", gap: 0, padding: "2px 0" }}>
        {items.length > 1 ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 8,
              top: 12,
              bottom: 12,
              width: 1,
              background: "oklch(0.38 0.09 145)",
            }}
          />
        ) : null}
        {items.map((item) => (
          <div
            key={item.label}
            role="listitem"
            title={item.detail}
            style={{
              display: "grid",
              gridTemplateColumns: "18px minmax(0, 1fr)",
              alignItems: "center",
              gap: 10,
              padding: "7px 0",
              minWidth: 0,
            }}
          >
            <span style={{ display: "inline-flex", justifyContent: "center", position: "relative", zIndex: 1, background: tokens.bg }}>
              <StatusIcon status={item.ok ? "done" : "blocked"} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: item.ok ? tokens.fg : "oklch(0.85 0.1 70)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillHealthChecklist({ items, locale }: { items: RoutineHealthItem[]; locale: WikiLocale }) {
  return (
    <ManagedResourceHealthChecklist
      items={items}
      ariaLabel={wikiMessage(locale, "setupSkillHealthChecklist")}
      heading={wikiMessage(locale, "setupSkillHealthHeading")}
    />
  );
}

type SettingsSectionKey = "root" | "spaces" | "distillation" | "routines" | "lint" | "events";

const SETTINGS_SECTIONS: ReadonlyArray<{
  key: SettingsSectionKey;
  label: string;
  description: string;
}> = [
  { key: "root", label: "Setup", description: "" },
  { key: "spaces", label: "Spaces", description: "Destination spaces - folders, slugs, and folder health. Per-space Paperclip indexing is not configurable yet." },
  { key: "distillation", label: "Distillation", description: "Paperclip -> default space. Cursors, caps, and routines for the company-wide distillation pipeline." },
  { key: "routines", label: "Managed Routines", description: "Scheduled wiki maintenance." },
  { key: "lint", label: "Lint", description: "Run checks and review wiki health findings." },
  { key: "events", label: "Ingestion Settings", description: "Paperclip event capture into the default space (issues, comments, documents)." },
];

function settingsSectionLabel(locale: WikiLocale, key: SettingsSectionKey): string {
  const messageKey: Record<SettingsSectionKey, WikiMessageKey> = {
    root: "settingsSetup",
    spaces: "settingsSpaces",
    distillation: "settingsDistillation",
    routines: "settingsRoutines",
    lint: "settingsLint",
    events: "settingsEvents",
  };
  return wikiMessage(locale, messageKey[key]);
}

function settingsSectionDescription(locale: WikiLocale, key: SettingsSectionKey): string {
  const messageKey: Partial<Record<SettingsSectionKey, WikiMessageKey>> = {
    spaces: "settingsSpacesDescription",
    distillation: "settingsDistillationDescription",
    routines: "settingsRoutinesDescription",
    lint: "settingsLintDescription",
    events: "settingsEventsDescription",
  };
  const selectedKey = messageKey[key];
  return selectedKey ? wikiMessage(locale, selectedKey) : "";
}

function SettingsSectionButton({
  section,
  locale,
  active,
  onSelect,
}: {
  section: (typeof SETTINGS_SECTIONS)[number];
  locale: WikiLocale;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onSelect}
      style={{
        width: "100%",
        border: `1px solid ${active ? tokens.border : "transparent"}`,
        borderRadius: 6,
        background: "transparent",
        color: active ? tokens.fg : tokens.muted,
        cursor: "pointer",
        display: "grid",
        gap: 2,
        padding: "8px 10px",
        textAlign: "left",
        fontFamily: fontStack,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{settingsSectionLabel(locale, section.key)}</span>
      {section.description ? (
        <span style={{ fontSize: 11, lineHeight: 1.35, overflowWrap: "anywhere" }}>{settingsSectionDescription(locale, section.key)}</span>
      ) : null}
    </button>
  );
}

function SettingsPanel({
  title,
  badge,
  description,
  children,
}: {
  title: ReactNode;
  badge?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ display: "grid", gap: 14, minWidth: 0 }}>
      <header style={{ display: "grid", gap: 6, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 650, overflowWrap: "anywhere" }}>{title}</h2>
          {badge}
        </div>
        {description ? <Tiny>{description}</Tiny> : null}
      </header>
      <div style={{ minWidth: 0 }}>{children}</div>
    </section>
  );
}

function SetupSection({ title, children, separated = false }: { title: ReactNode; children: ReactNode; separated?: boolean }) {
  return (
    <section style={{ display: "grid", gap: 12, minWidth: 0, paddingTop: separated ? 22 : 0, borderTop: separated ? `1px solid ${tokens.border}` : "none" }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>{title}</h2>
      <div style={{ minWidth: 0 }}>{children}</div>
    </section>
  );
}

type PathPlatform = "mac" | "windows" | "linux";

const PATH_PLATFORM_LABELS: Record<PathPlatform, string> = {
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
};

const PATH_PLATFORM_STEP_KEYS: Record<PathPlatform, readonly WikiMessageKey[]> = {
  mac: ["pathStepMac1", "pathStepMac2", "pathStepMac3"],
  windows: ["pathStepWindows1", "pathStepWindows2", "pathStepWindows3"],
  linux: ["pathStepLinux1", "pathStepLinux2", "pathStepLinux3"],
};

function detectPathPlatform(): PathPlatform {
  if (typeof navigator === "undefined") return "mac";
  const agent = navigator.userAgent.toLowerCase();
  if (agent.includes("win")) return "windows";
  if (agent.includes("linux")) return "linux";
  return "mac";
}

function PathInstructionsDialog({ open, onClose, locale }: { open: boolean; onClose: () => void; locale: WikiLocale }) {
  const [platform, setPlatform] = useState<PathPlatform>(detectPathPlatform);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0, 0, 0, 0.48)",
        display: "grid",
        placeItems: "center",
        padding: 18,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wiki-path-help-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(460px, 100%)",
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          background: tokens.card,
          color: tokens.fg,
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.45)",
          padding: 18,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 4 }}>
            <h3 id="wiki-path-help-title" style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>{wikiMessage(locale, "pathHelpTitle")}</h3>
            <Tiny>{wikiMessage(locale, "pathHelpDescription", { path: "/Users/you/company-wiki" })}</Tiny>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} title={wikiMessage(locale, "pathHelpClose")}>{wikiMessage(locale, "closeDialog")}</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, border: `1px solid ${tokens.border}`, borderRadius: 7, padding: 3 }}>
          {(Object.keys(PATH_PLATFORM_LABELS) as PathPlatform[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlatform(key)}
              style={{
                border: 0,
                borderRadius: 5,
                background: key === platform ? tokens.accent : "transparent",
                color: key === platform ? tokens.fg : tokens.muted,
                padding: "6px 8px",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: fontStack,
              }}
            >
              {PATH_PLATFORM_LABELS[key]}
            </button>
          ))}
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, fontSize: 13, lineHeight: 1.45 }}>
          {PATH_PLATFORM_STEP_KEYS[platform].map((key) => <li key={key}>{wikiMessage(locale, key)}</li>)}
        </ol>
      </div>
    </div>
  );
}

function FolderPathPicker({
  locale,
  value,
  onChange,
  onApply,
  applyLabel,
  busy,
  disabled,
  onRefresh,
}: {
  locale: WikiLocale;
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  applyLabel: string;
  busy?: boolean;
  disabled?: boolean;
  onRefresh?: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div style={{
      border: `1px solid ${tokens.border}`,
      borderRadius: 8,
      background: "oklch(0.18 0 0)",
      overflow: "hidden",
      minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${tokens.border}` }}>
        <span aria-hidden style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: tokens.accent,
          color: tokens.pluginFg,
          flexShrink: 0,
        }}>
          <FolderOpenIcon />
        </span>
        <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 650 }}>{wikiMessage(locale, "localWikiFolder")}</span>
          <Tiny>{wikiMessage(locale, "absolutePathOnMachine")}</Tiny>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: 12, alignItems: "center", flexWrap: "wrap" }}>
        <TextInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/absolute/path/to/wiki-root"
          style={{ flex: "1 1 320px", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}
        />
        <Button size="sm" onClick={() => setHelpOpen(true)}><FolderOpenIcon size={13} /> {wikiMessage(locale, "chooseFolder")}</Button>
        <Button variant="primary" size="sm" onClick={onApply} loading={busy} disabled={disabled || !value.trim()}>{applyLabel}</Button>
        {onRefresh ? <Button size="sm" variant="ghost" onClick={onRefresh}>{wikiMessage(locale, "runHealthCheck")}</Button> : null}
      </div>
      <PathInstructionsDialog open={helpOpen} onClose={() => setHelpOpen(false)} locale={locale} />
    </div>
  );
}

type FolderHealthItem = {
  label: string;
  ok: boolean;
};

function folderHealthItems(folder: FolderStatus, locale: WikiLocale): FolderHealthItem[] {
  return [
    { label: wikiMessage(locale, "folderPathConfigured"), ok: folder.configured },
    { label: wikiMessage(locale, "folderReadable"), ok: folder.readable },
    { label: wikiMessage(locale, folder.access === "readWrite" ? "folderWritable" : "folderReadOnly"), ok: folder.access === "read" || folder.writable },
    { label: wikiMessage(locale, "folderBaselineFiles"), ok: folder.missingFiles.length === 0 },
    { label: wikiMessage(locale, "wikiFolders"), ok: folder.missingDirectories.length === 0 },
  ];
}

function FolderHealthChecklist({ folder, locale }: { folder: FolderStatus; locale: WikiLocale }) {
  const items = folderHealthItems(folder, locale);
  return (
    <div style={{ display: "grid", gap: 8 }} aria-label={wikiMessage(locale, "wikiRootHealthChecklist")}>
      <div style={{ fontSize: 12, fontWeight: 650, color: tokens.muted }}>{wikiMessage(locale, "folderHealthCheck")}</div>
      <div role="list" style={{ position: "relative", display: "grid", gap: 0, padding: "2px 0" }}>
        {items.length > 1 ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 8,
              top: 12,
              bottom: 12,
              width: 1,
              background: "oklch(0.38 0.09 145)",
            }}
          />
        ) : null}
        {items.map((item) => (
          <div
            key={item.label}
            role="listitem"
            style={{
              display: "grid",
              gridTemplateColumns: "18px minmax(0, 1fr)",
              alignItems: "center",
              gap: 10,
              padding: "7px 0",
              minWidth: 0,
            }}
          >
            <span style={{ display: "inline-flex", justifyContent: "center", position: "relative", zIndex: 1, background: tokens.bg }}>
              <StatusIcon status={item.ok ? "done" : "blocked"} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: item.ok ? tokens.fg : "oklch(0.85 0.1 70)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type MaintainerAgentOption = SettingsData["agentOptions"][number];
type ProjectOption = SettingsData["projectOptions"][number];

function managedStatusLabel(locale: WikiLocale, status?: string | null) {
  if (!status) return wikiMessage(locale, "setupStatusUnknown");
  const messageKey: Partial<Record<string, WikiMessageKey>> = {
    unknown: "setupStatusUnknown",
    idle: "setupStatusIdle",
    active: "setupStatusActive",
    paused: "setupStatusPaused",
    pending_approval: "setupStatusPendingApproval",
    running: "setupStatusRunning",
    in_progress: "setupStatusInProgress",
    blocked: "setupStatusBlocked",
    done: "setupStatusDone",
    completed: "setupStatusDone",
    failed: "setupStatusFailed",
    error: "setupStatusError",
    created: "setupStatusCreated",
    resolved: "setupStatusResolved",
    missing: "setupStatusMissing",
    missing_refs: "setupStatusMissingRefs",
    archived: "setupStatusArchived",
  };
  const key = messageKey[status];
  return key ? wikiMessage(locale, key) : status.replace(/_/g, " ");
}

function agentStatusLabel(locale: WikiLocale, status?: string | null) {
  return managedStatusLabel(locale, status);
}

function projectStatusLabel(locale: WikiLocale, status?: string | null) {
  return managedStatusLabel(locale, status);
}

function adapterTypeLabel(adapterType: string | null | undefined, locale: WikiLocale) {
  if (!adapterType) return wikiMessage(locale, "setupUnknownAdapter");
  return adapterType.replace(/_/g, " ");
}

function agentAvatarGlyph(icon?: string | null, name?: string | null) {
  if (icon === "book-open") return "📖";
  return (name?.trim().charAt(0) || "A").toUpperCase();
}

function AgentAvatar({ agent, size = 30 }: { agent: Pick<MaintainerAgentOption, "name" | "icon">; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: `1px solid ${tokens.border}`,
        background: tokens.accent,
        color: tokens.fg,
        fontSize: size > 28 ? 14 : 12,
        fontWeight: 700,
      }}
    >
      {agentAvatarGlyph(agent.icon, agent.name)}
    </span>
  );
}

function AgentOptionLabel({ agent, locale, muted = false }: { agent: MaintainerAgentOption; locale: WikiLocale; muted?: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <AgentAvatar agent={agent} />
      <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: muted ? tokens.muted : tokens.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {agent.name}
        </span>
        <span style={{ fontSize: 11, color: tokens.muted, textTransform: "capitalize" }}>
          {agentStatusLabel(locale, agent.status)} · {adapterTypeLabel(agent.adapterType, locale)}
        </span>
      </span>
    </span>
  );
}

function MaintainerAgentLink({
  agent,
  locale,
  hrefProps,
}: {
  agent: MaintainerAgentOption;
  locale: WikiLocale;
  hrefProps?: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "style">;
}) {
  return (
    <a
      {...hrefProps}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        maxWidth: "100%",
        color: tokens.fg,
        textDecoration: "none",
      }}
    >
      <AgentAvatar agent={agent} />
      <span style={{ display: "grid", gap: 1, minWidth: 0, textAlign: "left" }}>
        <span style={{ fontSize: 13, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {wikiMessage(locale, "setupResolveAgentLabel")}
        </span>
        <span style={{ fontSize: 11, color: tokens.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {agent.name} · {agentStatusLabel(locale, agent.status)} · {adapterTypeLabel(agent.adapterType, locale)}
        </span>
      </span>
    </a>
  );
}

function formatDistillationCount(count: number, locale: WikiLocale): string {
  return new Intl.NumberFormat(locale).format(count);
}

// ---------------------------------------------------------------------------
// Distillation settings panel (configured + unconfigured states).
// Source filters / cursor windows / model lanes / auto-apply / backfill.
// Most controls render the current state; persistence is wired through
// existing managed-routine and plugin-action endpoints.
// ---------------------------------------------------------------------------

function DistillationSettingsPanel({ context, settings, locale }: { context: { companyId: string | null }; settings: SettingsData; locale: WikiLocale }) {
  const overview = useDistillationOverview(context.companyId);
  const distillNow = usePluginAction("distill-paperclip-now");
  const enableActiveProjects = usePluginAction("enable-paperclip-distillation-active-projects");
  const queueBackfill = usePluginAction("backfill-paperclip-distillation");
  const toast = usePluginToast();
  const isMobile = useIsMobileLayout();
  const [busy, setBusy] = useState<string | null>(null);
  const data = overview.data;
  const cursors = data?.cursors ?? [];
  const counts = data?.counts ?? { cursors: 0, runningRuns: 0, failedRuns24h: 0, reviewRequired: 0 };
  const isConfigured = cursors.length > 0;
  const autoApplyRestriction = settings.distillationPolicy?.autoApplyRestriction ?? null;
  const publicDeploymentRestriction = autoApplyRestriction === wikiMessage("en", "distillationPublicDeploymentRestriction")
    && settings.distillationPolicy?.autoApplyAllowed === false
    && settings.distillationPolicy.deploymentMode === "authenticated"
    && settings.distillationPolicy.deploymentExposure === "public";

  const projectsCovered = useMemo(() => {
    const set = new Set<string>();
    for (const cursor of cursors) {
      if (cursor.projectId) set.add(cursor.projectId);
    }
    return set.size;
  }, [cursors]);

  async function runDistillNow() {
    if (!context.companyId) return;
    if (cursors.length === 0) {
      toast({ tone: "warn", title: wikiMessage(locale, "distillationNeedsCursor") });
      return;
    }
    setBusy("distill-now");
    try {
      await distillNow({
        companyId: context.companyId,
        idempotencyKey: `manual:company:${Date.now()}`,
      });
      toast({
        tone: "success",
        title: wikiMessage(locale, "distillationNowQueued"),
        body: wikiMessage(locale, "distillationNowQueuedBody"),
      });
      overview.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "distillationNowFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function enableForActiveProjects() {
    if (!context.companyId) return;
    setBusy("enable-active-projects");
    try {
      const result = await enableActiveProjects({ companyId: context.companyId, limit: 3 }) as {
        selectedProjects?: Array<{ name?: string | null }>;
      };
      const count = result.selectedProjects?.length ?? 0;
      toast({
        tone: count > 0 ? "success" : "warn",
        title: count > 0 ? wikiMessage(locale, "distillationEnabled") : wikiMessage(locale, "distillationNoActiveProjects"),
        body: count > 0
          ? wikiMessage(locale, count === 1 ? "distillationProjectsAdded" : "distillationProjectsAddedMany", { count: formatDistillationCount(count, locale) })
          : wikiMessage(locale, "distillationEnableProjectsHelp"),
      });
      overview.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "distillationEnableFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  async function runBackfill() {
    if (!context.companyId || cursors.length === 0) return;
    const target = cursors.find((cursor) => cursor.projectId) ?? cursors[0];
    if (!target.projectId && !target.rootIssueId) {
      toast({ tone: "warn", title: wikiMessage(locale, "distillationBackfillNeedsScope") });
      return;
    }
    setBusy("backfill");
    try {
      await queueBackfill({
        companyId: context.companyId,
        projectId: target.projectId ?? undefined,
        rootIssueId: target.rootIssueId ?? undefined,
      });
      toast({ tone: "success", title: wikiMessage(locale, "distillationBackfillQueued"), body: target.projectName ?? target.rootIssueIdentifier ?? wikiMessage(locale, "distillationSelectedScope") });
      overview.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "distillationBackfillFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  }

  if (overview.loading && !data) {
    return <Tiny>{wikiMessage(locale, "distillationOverviewLoading")}</Tiny>;
  }

  if (overview.error) {
    return (
      <div style={{ display: "grid", justifyItems: "start", gap: 8 }}>
        <Callout tone="danger">
          {wikiMessage(locale, "distillationOverviewFailed")} {overview.error.message}
        </Callout>
        <Button variant="ghost" size="sm" onClick={() => overview.refresh()}>
          <RefreshIcon size={12} /> {wikiMessage(locale, "distillationRefresh")}
        </Button>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
        <Card>
          <CardBody padding={isMobile ? 18 : 26}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
              <SparklesIcon size={36} />
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 650 }}>{wikiMessage(locale, "distillationOff")}</h3>
                <Tiny style={{ marginTop: 6, fontSize: 13, color: tokens.fg, lineHeight: 1.55, maxWidth: 540 }}>
                  {wikiMessage(locale, "distillationOffDescriptionPrefix")} <Mono>wiki/projects/&lt;slug&gt;/standup.md</Mono> {wikiMessage(locale, "distillationOffDescriptionJoin")} <Mono>wiki/projects/&lt;slug&gt;/index.md</Mono> {wikiMessage(locale, "distillationOffDescriptionMiddle")} <strong>{wikiMessage(locale, "distillationOffDescriptionDefault")}</strong>. {wikiMessage(locale, "distillationOffDescriptionSuffix")}
                </Tiny>
                <Tiny style={{ marginTop: 6, fontSize: 13, color: tokens.fg, lineHeight: 1.55, maxWidth: 540 }}>
                  {wikiMessage(locale, "distillationOtherSpacesWarning")}
                </Tiny>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="primary" size="md" onClick={enableForActiveProjects} loading={busy === "enable-active-projects"}>
                  <SparklesIcon size={14} /> {wikiMessage(locale, "distillationEnableActiveProjects")}
                </Button>
                <Button variant="default" size="md" onClick={() => overview.refresh()}>{wikiMessage(locale, "distillationConfigureManually")}</Button>
              </div>
              <Tiny>{wikiMessage(locale, "distillationSuggestedDefaults")}</Tiny>
            </div>
          </CardBody>
        </Card>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
          <Card>
            <CardHeader title={wikiMessage(locale, "distillationWhatGetsCreated")} />
            <CardBody padding={14}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: tokens.muted, lineHeight: 1.5 }}>
                <li>{wikiMessage(locale, "distillationProjectOverviews")} <Mono>wiki/projects/&lt;slug&gt;/index.md</Mono></li>
                <li>{wikiMessage(locale, "distillationExecutiveStandups")} <Mono>wiki/projects/&lt;slug&gt;/standup.md</Mono></li>
                <li>{wikiMessage(locale, "distillationDecisionsHistory")} <Mono>wiki/projects/&lt;slug&gt;/</Mono></li>
                <li>{wikiMessage(locale, "distillationSourceBundlesCached")} <Mono>raw/distill/</Mono></li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={wikiMessage(locale, "distillationWhatNeverHappens")} />
            <CardBody padding={14}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: tokens.muted, lineHeight: 1.5 }}>
                <li>{wikiMessage(locale, "distillationNeverCrossCompanies")}</li>
                <li>{wikiMessage(locale, "distillationNeverReadOwnOperations")}</li>
                <li>{wikiMessage(locale, "distillationNeverApplyDriftedPatches")}</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
      {autoApplyRestriction ? (
        <Callout tone="warn">
          {publicDeploymentRestriction ? wikiMessage(locale, "distillationPublicDeploymentRestriction") : autoApplyRestriction} {wikiMessage(locale, "distillationAutoApplyRestrictionSuffix")}
        </Callout>
      ) : null}
      <Callout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <InfoIcon size={16} />
            <strong style={{ fontSize: 13 }}>{wikiMessage(locale, "distillationActiveSummary", {
              projects: wikiMessage(locale, projectsCovered === 1 ? "distillationProjectOne" : "distillationProjectMany", { count: formatDistillationCount(projectsCovered, locale) }),
              cursors: wikiMessage(locale, counts.cursors === 1 ? "distillationCursorOne" : "distillationCursorMany", { count: formatDistillationCount(counts.cursors, locale) }),
            })}</strong>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => overview.refresh()}><RefreshIcon size={12} /> {wikiMessage(locale, "distillationRefresh")}</Button>
            <Button variant="primary" size="sm" onClick={runDistillNow} loading={busy === "distill-now"}><SparklesIcon size={12} /> {wikiMessage(locale, "distillationNow")}</Button>
          </div>
        </div>
        <Tiny style={{ marginTop: 6 }}>
          {wikiMessage(locale, "distillationAgentWritesDefault")}
        </Tiny>
      </Callout>

      <Card>
        <CardHeader title={wikiMessage(locale, "distillationSourceFilters")} />
        <CardBody padding={14}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 6 }}>
              <legend style={{ fontSize: 12, color: tokens.muted, marginBottom: 4 }}>{wikiMessage(locale, "distillationIssueScope")}</legend>
              <CheckboxRow label={wikiMessage(locale, "distillationActiveProjects")} defaultChecked help={wikiMessage(locale, "distillationActiveProjectsHelp")} />
              <CheckboxRow label={wikiMessage(locale, "distillationRootIssues")} defaultChecked />
              <CheckboxRow label={wikiMessage(locale, "distillationAllCompanyIssues")} help={wikiMessage(locale, "distillationLargeWindowsWarning")} />
              <Tiny>
                {wikiMessage(locale, "distillationScopeDescription")}
              </Tiny>
              <Tiny>{wikiMessage(locale, "distillationPluginIssuesExcluded")}</Tiny>
            </fieldset>
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 6 }}>
              <legend style={{ fontSize: 12, color: tokens.muted, marginBottom: 4 }}>{wikiMessage(locale, "distillationSourceKinds")}</legend>
              <CheckboxRow label={wikiMessage(locale, "distillationIssueTitleDescription")} defaultChecked locked />
              <CheckboxRow label={wikiMessage(locale, "distillationRankedComments")} defaultChecked />
              <CheckboxRow label={wikiMessage(locale, "distillationDocuments")} defaultChecked />
              <CheckboxRow label={wikiMessage(locale, "distillationWorkProductsAttachments")} suffix={wikiMessage(locale, "distillationComingSoon")} />
              <Tiny>{wikiMessage(locale, "distillationExcludedSourceKinds")}</Tiny>
            </fieldset>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={wikiMessage(locale, "distillationCursorWindows")} />
        <CardBody padding={14}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <SettingField label={wikiMessage(locale, "distillationMaxSourceCharacters")} hint={wikiMessage(locale, "distillationMaxSourceCharactersHelp")}>
              <TextInput defaultValue="48000" />
            </SettingField>
            <SettingField label={wikiMessage(locale, "distillationMinSourceAge")} hint={wikiMessage(locale, "distillationMinSourceAgeHelp")}>
              <SelectInput defaultValue="15" options={[["5", wikiMessage(locale, "distillationMinuteMany", { count: 5 })], ["15", wikiMessage(locale, "distillationMinuteMany", { count: 15 })], ["30", wikiMessage(locale, "distillationMinuteMany", { count: 30 })], ["60", wikiMessage(locale, "distillationHourOne", { count: 1 })]]} />
            </SettingField>
            <SettingField label={wikiMessage(locale, "distillationMaxWindowsPerRoutine")} hint={wikiMessage(locale, "distillationMaxWindowsPerRoutineHelp")}>
              <TextInput defaultValue="6" />
            </SettingField>
            <SettingField label={wikiMessage(locale, "distillationStaleWindowThreshold")} hint={wikiMessage(locale, "distillationStaleWindowHelp")}>
              <SelectInput defaultValue="72" options={[["24", wikiMessage(locale, "distillationHourMany", { count: 24 })], ["48", wikiMessage(locale, "distillationHourMany", { count: 48 })], ["72", wikiMessage(locale, "distillationHourMany", { count: 72 })], ["168", wikiMessage(locale, "distillationDayMany", { count: 7 })]]} />
            </SettingField>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={wikiMessage(locale, "distillationAgentExecution")} />
        <CardBody padding={14}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
            <SettingField label={wikiMessage(locale, "distillationAssignedMaintainer")} hint={wikiMessage(locale, "distillationAssignedMaintainerHelp")}>
              <div style={{ minHeight: 34, display: "flex", alignItems: "center", border: `1px solid ${tokens.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
                {settings.managedAgent.details
                  ? `${settings.managedAgent.details.name} · ${adapterTypeLabel(settings.managedAgent.details.adapterType, locale)}`
                  : wikiMessage(locale, "distillationNoMaintainer")}
              </div>
            </SettingField>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={wikiMessage(locale, "distillationAutoApplyPolicy")} />
        <CardBody padding={14}>
          <div style={{ display: "grid", gap: 8 }}>
            <RadioRow name="autoapply" value="never" label={wikiMessage(locale, "distillationAutoApplyNever")} />
            <RadioRow name="autoapply" value="status" label={wikiMessage(locale, "distillationAutoApplyStatus")} />
            <RadioRow name="autoapply" value="all" label={wikiMessage(locale, "distillationAutoApplyAll")} defaultChecked />
            <Tiny>{wikiMessage(locale, "distillationStaleHashWarning")}</Tiny>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={wikiMessage(locale, "distillationBackfill")}
          right={<Button variant="default" size="sm" onClick={runBackfill} loading={busy === "backfill"}>{wikiMessage(locale, "distillationQueueBackfill")}</Button>}
        />
        <CardBody padding={14}>
          <Tiny style={{ marginBottom: 6 }}>{wikiMessage(locale, "distillationBackfillDescription")}</Tiny>
          <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
            <PropRow label={wikiMessage(locale, "distillationDefaultScope")} value={cursors.find((c) => c.projectName)?.projectName ?? cursors[0]?.scopeKey ?? "—"} />
            <PropRow label={wikiMessage(locale, "distillationCursorsActive")} value={formatDistillationCount(counts.cursors, locale)} />
            <PropRow label={wikiMessage(locale, "distillationRunsInFlight")} value={formatDistillationCount(counts.runningRuns, locale)} />
            <PropRow label={wikiMessage(locale, "distillationFailed24Hours")} value={formatDistillationCount(counts.failedRuns24h, locale)} />
            <PropRow label={wikiMessage(locale, "distillationReviewQueue")} value={formatDistillationCount(counts.reviewRequired, locale)} />
          </div>
        </CardBody>
      </Card>

      <Tiny>
        {wikiMessage(locale, "distillationActiveCursors")}&nbsp;
        {cursors.slice(0, 6).map((cursor, idx) => (
          <span key={cursor.id}>
            {idx > 0 ? " · " : ""}
            {cursor.projectName ?? cursor.rootIssueIdentifier ?? cursor.scopeKey}
          </span>
        ))}
        {cursors.length > 6 ? <span>{` ${wikiMessage(locale, "distillationMoreCursors", { count: formatDistillationCount(cursors.length - 6, locale) })}`}</span> : null}
      </Tiny>
    </div>
  );
}

function SettingField({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
      <label style={{ fontSize: 12, color: tokens.muted }}>{label}</label>
      {children}
      {hint ? <Tiny>{hint}</Tiny> : null}
    </div>
  );
}

function CheckboxRow({
  label,
  help,
  defaultChecked,
  checked,
  onChange,
  locked,
  suffix,
}: {
  label: string;
  help?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  locked?: boolean;
  suffix?: string;
}) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
      <input
        type="checkbox"
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        checked={checked}
        disabled={locked}
        onChange={(event) => onChange?.(event.currentTarget.checked)}
      />
      <span>
        {label}
        {suffix ? <span style={{ marginLeft: 6, fontSize: 11, color: tokens.muted }}>({suffix})</span> : null}
        {help ? <Tiny style={{ display: "block", marginTop: 2 }}>{help}</Tiny> : null}
      </span>
    </label>
  );
}

function RadioRow({ name, value, label, defaultChecked }: { name: string; value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}

function SelectInput({ defaultValue, options }: { defaultValue: string; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <select
      defaultValue={defaultValue}
      style={{
        background: "oklch(0.2 0 0)",
        color: tokens.fg,
        border: `1px solid ${tokens.border}`,
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 13,
      }}
    >
      {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
  );
}

function SettingsBody({ context, locale, initialSection = "root" }: { context: { companyId: string | null; companyPrefix?: string | null }; locale: WikiLocale; initialSection?: SettingsSectionKey }) {
  const settings = useSettings(context.companyId);
  const hostNavigation = useHostNavigation();
  const { pathname } = useHostLocation();
  const isMobile = useIsMobileLayout();
  const bootstrap = usePluginAction("bootstrap-root");
  const updateEventIngestion = usePluginAction("update-event-ingestion-settings");
  const resetAgent = usePluginAction("reset-managed-agent");
  const resetProject = usePluginAction("reset-managed-project");
  const resetRoutine = usePluginAction("reset-managed-routine");
  const reconcileAgent = usePluginAction("reconcile-managed-agent");
  const reconcileProject = usePluginAction("reconcile-managed-project");
  const selectAgent = usePluginAction("select-managed-agent");
  const selectProject = usePluginAction("select-managed-project");
  const resetSkills = usePluginAction("reset-managed-skills");
  const reconcileRoutines = usePluginAction("reconcile-managed-routines");
  const updateRoutineStatus = usePluginAction("update-managed-routine-status");
  const runManagedRoutine = usePluginAction("run-managed-routine");
  const toast = usePluginToast();

  const [folderPath, setFolderPath] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [projectBusy, setProjectBusy] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [routineBusyKey, setRoutineBusyKey] = useState<string | null>(null);
  const [routineRepairBusy, setRoutineRepairBusy] = useState(false);
  const [skillBusy, setSkillBusy] = useState(false);
  const [allRepairBusy, setAllRepairBusy] = useState(false);
  const [eventPolicy, setEventPolicy] = useState<EventIngestionSettings | null>(null);
  const [eventPolicyBusy, setEventPolicyBusy] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionKey>(initialSection);

  useEffect(() => {
    if (settings.data?.folder.path && !folderPath) setFolderPath(settings.data.folder.path);
  }, [settings.data?.folder.path, folderPath]);
  useEffect(() => { if (settings.data?.managedAgent.agentId) setSelectedAgentId(settings.data.managedAgent.agentId); }, [settings.data?.managedAgent.agentId]);
  useEffect(() => { if (settings.data?.managedProject.projectId) setSelectedProjectId(settings.data.managedProject.projectId); }, [settings.data?.managedProject.projectId]);
  useEffect(() => {
    if (settings.data?.eventIngestion && eventPolicy === null) setEventPolicy(settings.data.eventIngestion);
  }, [settings.data?.eventIngestion, eventPolicy]);
  useEffect(() => {
    setActiveSettingsSection(initialSection);
  }, [initialSection]);

  if (!context.companyId) return <Callout>{wikiMessage(locale, "settingsChooseCompany")}</Callout>;
  if (settings.loading) return <Tiny>{wikiMessage(locale, "settingsLoading")}</Tiny>;
  if (settings.error) return <Callout tone="danger">{settings.error.message}</Callout>;
  if (!settings.data) return <Tiny>{wikiMessage(locale, "settingsUnavailable")}</Tiny>;

  const data = settings.data;
  const maintainerFallbackAgent: MaintainerAgentOption | null = data.managedAgent.agentId
    ? {
        id: data.managedAgent.agentId,
        name: data.managedAgent.details?.name ?? "Wiki Maintainer",
        status: data.managedAgent.details?.status ?? data.managedAgent.status,
        adapterType: data.managedAgent.details?.adapterType ?? null,
        icon: data.managedAgent.details?.icon ?? "book-open",
        urlKey: data.managedAgent.details?.urlKey ?? null,
      }
    : null;
  const maintainerAgentOptions = maintainerFallbackAgent && !data.agentOptions.some((agent) => agent.id === maintainerFallbackAgent.id)
    ? [maintainerFallbackAgent, ...data.agentOptions]
    : data.agentOptions;
  const effectiveSelectedAgentId = selectedAgentId || data.managedAgent.agentId || "";
  const currentMaintainerAgent = maintainerAgentOptions.find((agent) => agent.id === effectiveSelectedAgentId) ?? maintainerFallbackAgent;
  const savedCustomMaintainer = data.managedAgent.source === "selected";
  const selectingDifferentMaintainer = Boolean(
    data.managedAgent.source === "managed" &&
    data.managedAgent.agentId &&
    effectiveSelectedAgentId &&
    effectiveSelectedAgentId !== data.managedAgent.agentId,
  );
  const showMaintainerWarning = savedCustomMaintainer || selectingDifferentMaintainer;
  const maintainerPendingApproval = currentMaintainerAgent?.status === "pending_approval" || data.managedAgent.details?.status === "pending_approval";
  const agentLink = currentMaintainerAgent?.id
    ? `/agents/${currentMaintainerAgent.id}`
    : null;
  const projectLink = data.managedProject.projectId
    ? `/projects/${data.managedProject.projectId}`
    : null;
  const managedRoutines = data.managedRoutines ?? (data.managedRoutine ? [data.managedRoutine] : []);
  const agentHealthItems = buildAgentHealthItems(data.managedAgent, locale);
  const agentHealthWarnings = agentHealthItems.filter((item) => !item.ok);
  const routineHealthItems = buildRoutineHealthItems(managedRoutines, data.managedAgent, data.managedProject, locale);
  const routineHealthWarnings = routineHealthItems.filter((item) => !item.ok);
  const projectHealthItems = buildProjectHealthItems(data.managedProject, locale);
  const projectHealthWarnings = projectHealthItems.filter((item) => !item.ok);
  const managedSkills = data.managedSkills ?? [];
  const skillHealthItems = buildSkillHealthItems(managedSkills, locale);
  const skillHealthWarnings = skillHealthItems.filter((item) => !item.ok);
  const configurationErrors = [
    ...(!data.folder.healthy ? ["settingsWikiRootFolder" as const] : []),
    ...(agentHealthWarnings.length > 0 ? ["settingsManagedAgents" as const] : []),
    ...(skillHealthWarnings.length > 0 ? ["settingsManagedSkills" as const] : []),
    ...(projectHealthWarnings.length > 0 ? ["settingsManagedProjects" as const] : []),
    ...(routineHealthWarnings.length > 0 ? ["settingsManagedRoutines" as const] : []),
  ];
  const hasConfigurationErrors = configurationErrors.length > 0;
  const projectFallbackOption: ProjectOption | null = data.managedProject.projectId
    ? {
        id: data.managedProject.projectId,
        name: data.managedProject.details?.name ?? wikiMessage(locale, "setupCurrentProject"),
        status: data.managedProject.details?.status ?? data.managedProject.status,
        color: data.managedProject.details?.color ?? null,
      }
    : null;
  const projectOptions = projectFallbackOption && !data.projectOptions.some((project) => project.id === projectFallbackOption.id)
    ? [projectFallbackOption, ...data.projectOptions]
    : data.projectOptions;
  const effectiveSelectedProjectId = selectedProjectId || data.managedProject.projectId || "";
  const currentProjectOption = projectOptions.find((project) => project.id === effectiveSelectedProjectId) ?? projectFallbackOption;
  const currentEventPolicy = eventPolicy ?? data.eventIngestion;
  const managedRoutineItems: ManagedRoutinesListItemWithDrift[] = managedRoutines.map((routine) => {
    const fallback = routineFallbackFor(routine, locale);
    const ownedRoutineKey = routineResourceKey(routine);
    const key = routine.resourceKey ?? routine.routineId ?? fallback.title;
    const status = managedRoutineStatus(routine);
    const assigneeAgentId = routine.routine?.assigneeAgentId ?? routine.details?.assigneeAgentId ?? null;

    return {
      key,
      title: ownedRoutineKey
        ? routineDisplayTitle(routine, ownedRoutineKey, locale)
        : routine.routine?.title ?? routine.details?.title ?? fallback.title,
      status: status === "missing" || status === "missing_refs" ? "paused" : status,
      routineId: routine.routineId ?? routine.routine?.id ?? null,
      href: routine.routineId ? `/routines/${routine.routineId}` : null,
      resourceKey: routine.resourceKey ?? null,
      projectId: routine.routine?.projectId ?? null,
      assigneeAgentId,
      cronExpression: routine.details?.cronExpression ?? fallback.cron,
      lastRunAt: routine.routine?.lastTriggeredAt ?? routine.details?.lastRunAt ?? null,
      managedByPluginDisplayName: routine.routine?.managedByPlugin?.pluginDisplayName ?? "LLM Wiki",
      missingRefs: routine.missingRefs?.map((ref) => ({
        resourceKind: ref.resourceKind,
        resourceKey: ref.resourceKey,
      })),
      defaultDrift: routine.defaultDrift
        ? {
            changedFields: routine.defaultDrift.changedFields,
            defaultTitle: routine.defaultDrift.defaultTitle ?? null,
            defaultDescription: routine.defaultDrift.defaultDescription ?? null,
          }
        : null,
    };
  });
  const routineDefaultDriftItems = managedRoutineItems.filter((routine) => routine.defaultDrift?.changedFields.length);
  const agentDefaultDrift = data.managedAgent.defaultDrift;
  const activeSpaceSlug = readActiveSpaceSlugFromLocation(pathname);

  function routineBusyKeyFor(prefix: string) {
    const marker = `${prefix}:`;
    return routineBusyKey?.startsWith(marker) ? routineBusyKey.slice(marker.length) : null;
  }

  async function changeFolder() {
    if (!context.companyId || !folderPath.trim()) return;
    setFolderBusy(true);
    try {
      await bootstrap({ companyId: context.companyId, path: folderPath.trim() });
      toast({ tone: "success", title: wikiMessage(locale, "folderUpdated") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "folderUpdateFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setFolderBusy(false);
    }
  }

  async function chooseAgent() {
    const agentId = selectedAgentId || data.managedAgent.agentId;
    if (!context.companyId || !agentId) return;
    setAgentBusy(true);
    try {
      await selectAgent({ companyId: context.companyId, agentId });
      toast({ tone: "success", title: wikiMessage(locale, "setupAgentSelectedToast") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "setupAgentSelectFailedToast"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setAgentBusy(false);
    }
  }

  async function chooseProject() {
    const projectId = effectiveSelectedProjectId;
    if (!context.companyId || !projectId) return;
    setProjectBusy(true);
    try {
      await selectProject({ companyId: context.companyId, projectId });
      toast({ tone: "success", title: wikiMessage(locale, "setupProjectSelectedToast") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "setupProjectSelectFailedToast"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setProjectBusy(false);
    }
  }

  async function saveEventPolicy() {
    if (!context.companyId || !eventPolicy) return;
    setEventPolicyBusy(true);
    try {
      const next = await updateEventIngestion({ companyId: context.companyId, ...eventPolicy }) as EventIngestionSettings;
      setEventPolicy(next);
      toast({ tone: "success", title: wikiMessage(locale, "eventIngestionSaved") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "eventIngestionSaveFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setEventPolicyBusy(false);
    }
  }

  async function repairManagedRoutines() {
    if (!context.companyId) return;
    setRoutineRepairBusy(true);
    try {
      await reconcileRoutines({ companyId: context.companyId });
      toast({ tone: "success", title: wikiMessage(locale, "setupRoutinesFixedToast") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "setupRoutineRepairFailedToast"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setRoutineRepairBusy(false);
    }
  }

  async function resyncManagedSkills() {
    if (!context.companyId) return;
    setSkillBusy(true);
    try {
      await resetSkills({ companyId: context.companyId });
      toast({ tone: "success", title: wikiMessage(locale, "setupSkillsSyncedToast") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "setupSkillsSyncFailedToast"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setSkillBusy(false);
    }
  }

  async function fixAllConfigurationErrors() {
    if (!context.companyId || !hasConfigurationErrors) return;
    const confirmed = typeof window === "undefined" || window.confirm(
      wikiMessage(locale, "confirmFixAllConfigurationErrors"),
    );
    if (!confirmed) return;

    setAllRepairBusy(true);
    try {
      if (!data.folder.healthy) {
        const path = folderPath.trim() || data.folder.path?.trim() || "";
        if (!path && !data.folder.configured) {
          throw new Error(wikiMessage(locale, "chooseFolderBeforeFix"));
        }
        await bootstrap(path ? { companyId: context.companyId, path } : { companyId: context.companyId });
      }

      if (skillHealthWarnings.length > 0) {
        await resetSkills({ companyId: context.companyId });
      }

      const shouldResetAgent =
        data.managedAgent.source !== "managed" ||
        !managedAgentIsReady(data.managedAgent) ||
        Boolean(data.managedAgent.defaultDrift?.changedFiles.length);
      const shouldResetProject =
        data.managedProject.source !== "managed" ||
        !managedProjectIsReady(data.managedProject);

      if (shouldResetAgent) {
        await resetAgent({ companyId: context.companyId });
      } else if (routineHealthWarnings.length > 0) {
        await reconcileAgent({ companyId: context.companyId });
      }

      if (shouldResetProject) {
        await resetProject({ companyId: context.companyId });
      } else if (routineHealthWarnings.length > 0) {
        await reconcileProject({ companyId: context.companyId });
      }

      if (routineHealthWarnings.length > 0) {
        await reconcileRoutines({ companyId: context.companyId });
      }

      toast({ tone: "success", title: wikiMessage(locale, "configurationErrorsFixed") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "fixAllFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setAllRepairBusy(false);
    }
  }

  async function toggleManagedRoutine(routine: ManagedRoutinesListItem, enabled: boolean) {
    if (!context.companyId || !routine.resourceKey) return;
    if (!enabled && !routine.assigneeAgentId) {
      toast({
        tone: "warn",
        title: wikiMessage(locale, "setupRoutineDefaultAgentRequired"),
        body: wikiMessage(locale, "setupRoutineAssignDefaultAgent"),
      });
      return;
    }
    setRoutineBusyKey(`status:${routine.key}`);
    try {
      await updateRoutineStatus({ companyId: context.companyId, routineKey: routine.resourceKey, status: enabled ? "paused" : "active" });
      toast({ tone: "success", title: wikiMessage(locale, enabled ? "setupRoutinePausedToast" : "setupRoutineEnabledToast") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "setupRoutineUpdateFailedToast"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setRoutineBusyKey(null);
    }
  }

  async function runManagedRoutineNow(routine: ManagedRoutinesListItem) {
    if (!context.companyId || !routine.resourceKey) return;
    const assigneeAgentId = routine.assigneeAgentId ?? data.managedAgent.agentId ?? null;
    const projectId = routine.projectId ?? data.managedProject.projectId ?? null;
    if (!assigneeAgentId) {
      toast({
        tone: "warn",
        title: wikiMessage(locale, "setupRoutineDefaultAgentRequired"),
        body: wikiMessage(locale, "setupRoutineRunDefaultAgent"),
      });
      return;
    }

    setRoutineBusyKey(`run:${routine.key}`);
    try {
      await runManagedRoutine({
        companyId: context.companyId,
        routineKey: routine.resourceKey,
        assigneeAgentId,
        projectId,
      });
      toast({ tone: "success", title: wikiMessage(locale, "setupRoutineRunStartedToast") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "setupRoutineRunFailedToast"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setRoutineBusyKey(null);
    }
  }

  async function resetManagedRoutineToDefaults(routine: ManagedRoutinesListItem) {
    if (!context.companyId || !routine.resourceKey) return;
    const changedFields = (routine as ManagedRoutinesListItemWithDrift).defaultDrift?.changedFields ?? [];
    const fieldList = changedFields.length > 0 ? changedFields.join(", ") : wikiMessage(locale, "setupRoutineResetFallback");
    const confirmed = typeof window === "undefined" || window.confirm(
      wikiMessage(locale, "setupConfirmRoutineReset", { title: routine.title, fields: fieldList }),
    );
    if (!confirmed) return;

    const assigneeAgentId = routine.assigneeAgentId ?? data.managedAgent.agentId ?? null;
    const projectId = routine.projectId ?? data.managedProject.projectId ?? null;
    setRoutineBusyKey(`reset:${routine.key}`);
    try {
      await resetRoutine({
        companyId: context.companyId,
        routineKey: routine.resourceKey,
        assigneeAgentId,
        projectId,
      });
      toast({ tone: "success", title: wikiMessage(locale, "setupRoutineDefaultsUpdatedToast") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "setupRoutineResetFailedToast"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setRoutineBusyKey(null);
    }
  }

  async function resetManagedAgentToDefaults() {
    if (!context.companyId) return;
    const changedFiles = agentDefaultDrift?.changedFiles ?? [];
    const fileList = changedFiles.length > 0 ? changedFiles.join(", ") : wikiMessage(locale, "setupAgentResetFallback");
    const confirmed = typeof window === "undefined" || window.confirm(
      wikiMessage(locale, "setupConfirmAgentReset", { files: fileList }),
    );
    if (!confirmed) return;

    setAgentBusy(true);
    try {
      await resetAgent({ companyId: context.companyId });
      toast({ tone: "success", title: wikiMessage(locale, "setupAgentResetToast") });
      settings.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "setupAgentResetFailedToast"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setAgentBusy(false);
    }
  }

  const activeSettingsConfig =
    SETTINGS_SECTIONS.find((section) => section.key === activeSettingsSection) ?? SETTINGS_SECTIONS[0];

  return (
    <div style={{
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? 16 : 24,
      maxWidth: isMobile ? "none" : 1040,
      minWidth: 0,
    }}>
      <aside style={{
        width: isMobile ? "auto" : 230,
        flexShrink: 0,
        borderRight: isMobile ? "none" : `1px solid ${tokens.border}`,
        borderBottom: isMobile ? `1px solid ${tokens.border}` : "none",
        paddingRight: isMobile ? 0 : 16,
        paddingBottom: isMobile ? 12 : 0,
      }}>
        <nav aria-label={wikiMessage(locale, "settingsSectionsAria")} style={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          gap: 4,
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 2 : 0,
        }}>
          {SETTINGS_SECTIONS.map((section) => (
            <div key={section.key} style={{ minWidth: isMobile ? 190 : 0 }}>
              <SettingsSectionButton
                section={section}
                locale={locale}
                active={activeSettingsSection === section.key}
                onSelect={() => {
                  setActiveSettingsSection(section.key);
                  hostNavigation.navigate(buildSettingsSectionHref(section.key, activeSpaceSlug));
                }}
              />
            </div>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        {hasConfigurationErrors ? (
          <div style={{ marginBottom: 18 }}>
            <Callout tone="warn">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                  <strong>{wikiMessage(locale, "configurationErrorsDetected")}</strong>
                  <Tiny>
                    {wikiMessage(locale, configurationErrors.length === 1 ? "configurationErrorsNeedAttentionOne" : "configurationErrorsNeedAttentionMany", {
                      items: configurationErrors.map((key) => wikiMessage(locale, key)).join(", "),
                    })}
                  </Tiny>
                </div>
                <Button size="sm" variant="primary" onClick={fixAllConfigurationErrors} loading={allRepairBusy}>
                  {wikiMessage(locale, "fixAllConfigurationErrors")}
                </Button>
              </div>
            </Callout>
          </div>
        ) : null}
        {activeSettingsSection === "root" ? (
          <section style={{ display: "grid", gap: 22, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 22, fontWeight: 700 }}>{settingsSectionLabel(locale, "root")}</h1>
            <SetupSection title={wikiMessage(locale, "settingsBaseFolder")}>
              <div style={{ display: "grid", gap: 12 }}>
                <FolderPathPicker
                  locale={locale}
                  value={folderPath}
                  onChange={setFolderPath}
                  onApply={changeFolder}
                  applyLabel={wikiMessage(locale, "settingsApplyPath")}
                  busy={folderBusy}
                  disabled={!folderPath.trim()}
                  onRefresh={() => settings.refresh()}
                />
                <FolderHealthChecklist folder={data.folder} locale={locale} />
                {data.folder.problems.length > 0 ? (
                  <Callout tone="warn">{wikiMessage(locale, data.folder.problems.length === 1 ? "folderIssuesOne" : "folderIssuesMany", { count: data.folder.problems.length })} {data.folder.problems.map((p) => p.message).join("; ")}</Callout>
                ) : null}
              </div>
            </SetupSection>
            <SetupSection title={wikiMessage(locale, "setupManagedAgentsSection")} separated>
              <div style={{ display: "grid", gap: 14, maxWidth: isMobile ? "none" : 620, minWidth: 0 }}>
                <ManagedResourceHealthChecklist
                  items={agentHealthItems}
                  ariaLabel={wikiMessage(locale, "setupAgentHealthChecklist")}
                  heading={wikiMessage(locale, "setupAgentHealthHeading")}
                />
                {agentHealthWarnings.length > 0 ? (
                  <Callout tone="warn">
                    <div style={{ display: "grid", gap: 8 }}>
                      <div>{wikiMessage(locale, agentHealthWarnings.length === 1 ? "setupAgentIssuesOne" : "setupAgentIssuesMany", { count: agentHealthWarnings.length })}</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {agentHealthWarnings.map((item) => <li key={item.label}>{item.detail}</li>)}
                      </ul>
                    </div>
                  </Callout>
                ) : null}
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12, color: tokens.muted }}>{wikiMessage(locale, "setupMaintainerField")}</label>
                  <fieldset
                    disabled={agentBusy}
                    style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}
                  >
                    <AssigneePicker
                      companyId={context.companyId}
                      value={effectiveSelectedAgentId ? `agent:${effectiveSelectedAgentId}` : ""}
                      includeUsers={false}
                      placeholder={wikiMessage(locale, "setupSelectMaintainer")}
                      noneLabel={wikiMessage(locale, "setupNoMaintainer")}
                      searchPlaceholder={wikiMessage(locale, "setupSearchAgents")}
                      emptyMessage={wikiMessage(locale, "setupNoAgentsFound")}
                      onChange={(_value, selection) => {
                        setSelectedAgentId(selection.assigneeAgentId ?? "");
                      }}
                    />
                  </fieldset>
                  <Tiny>
                    {wikiMessage(locale, "setupAdapterPrefix")} {adapterTypeLabel(currentMaintainerAgent?.adapterType ?? data.managedAgent.details?.adapterType ?? null, locale)}
                  </Tiny>
                  {maintainerPendingApproval ? (
                    <Callout tone="warn">
                      {wikiMessage(locale, "setupPendingApproval")}
                    </Callout>
                  ) : null}
                  {showMaintainerWarning ? (
                    <Callout tone="warn">
                      {wikiMessage(locale, "setupNonDefaultMaintainer")}
                    </Callout>
                  ) : null}
                  {agentDefaultDrift?.changedFiles.length ? (
                    <Callout tone="warn">
                      {wikiMessage(locale, "setupAgentInstructionDrift", { files: agentDefaultDrift.changedFiles.join(", ") })}
                    </Callout>
                  ) : null}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={chooseAgent}
                      loading={agentBusy}
                      disabled={!effectiveSelectedAgentId || effectiveSelectedAgentId === data.managedAgent.agentId}
                    >
                      {wikiMessage(locale, "setupSaveMaintainer")}
                    </Button>
                    {agentLink ? <Button size="sm" onClick={() => hostNavigation.navigate(agentLink)}>{wikiMessage(locale, "setupOpenAgent")}</Button> : null}
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!context.companyId) return;
                      setAgentBusy(true);
                      try {
                        await reconcileAgent({ companyId: context.companyId });
                        toast({ tone: "success", title: wikiMessage(locale, "setupAgentReconciledToast") });
                        settings.refresh();
                      } catch (err) {
                        toast({ tone: "error", title: wikiMessage(locale, "setupAgentRepairFailedToast"), body: err instanceof Error ? err.message : String(err) });
                      } finally {
                        setAgentBusy(false);
                      }
                    }} loading={agentBusy}>{wikiMessage(locale, "setupRepair")}</Button>
                    <Button size="sm" variant="ghost" onClick={resetManagedAgentToDefaults} loading={agentBusy}>{wikiMessage(locale, "setupResetToDefaults")}</Button>
                  </div>
                </div>
              </div>
            </SetupSection>
            <SetupSection title={wikiMessage(locale, "setupManagedSkillsSection")} separated>
              <div style={{ display: "grid", gap: 12, maxWidth: isMobile ? "none" : 620, minWidth: 0 }}>
                <SkillHealthChecklist items={skillHealthItems} locale={locale} />
                {skillHealthWarnings.length > 0 ? (
                  <Callout tone="warn">
                    <div style={{ display: "grid", gap: 8 }}>
                      <div>{wikiMessage(locale, skillHealthWarnings.length === 1 ? "setupSkillIssuesOne" : "setupSkillIssuesMany", { count: skillHealthWarnings.length })}</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {skillHealthWarnings.map((item) => <li key={item.label}>{item.detail}</li>)}
                      </ul>
                      <div>
                        <Button size="sm" variant="primary" onClick={resyncManagedSkills} loading={skillBusy}>{wikiMessage(locale, "setupResyncSkills")}</Button>
                      </div>
                    </div>
                  </Callout>
                ) : (
                  <Callout>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <span>{wikiMessage(locale, "setupSkillsInstalled")}</span>
                      <Button size="sm" variant="ghost" onClick={resyncManagedSkills} loading={skillBusy}>{wikiMessage(locale, "setupResyncSkills")}</Button>
                    </div>
                  </Callout>
                )}
              </div>
            </SetupSection>
            <SetupSection title={wikiMessage(locale, "setupManagedProjectsSection")} separated>
              <div style={{ display: "grid", gap: 10, maxWidth: isMobile ? "none" : 620, minWidth: 0 }}>
                <ManagedResourceHealthChecklist
                  items={projectHealthItems}
                  ariaLabel={wikiMessage(locale, "setupProjectHealthChecklist")}
                  heading={wikiMessage(locale, "setupProjectHealthHeading")}
                />
                {projectHealthWarnings.length > 0 ? (
                  <Callout tone="warn">
                    <div style={{ display: "grid", gap: 8 }}>
                      <div>{wikiMessage(locale, projectHealthWarnings.length === 1 ? "setupProjectIssuesOne" : "setupProjectIssuesMany", { count: projectHealthWarnings.length })}</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {projectHealthWarnings.map((item) => <li key={item.label}>{item.detail}</li>)}
                      </ul>
                    </div>
                  </Callout>
                ) : null}
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12, color: tokens.muted }}>{wikiMessage(locale, "setupUseExistingProject")}</label>
                  <fieldset
                    disabled={projectBusy}
                    style={{ border: 0, margin: 0, minWidth: 0, padding: 0 }}
                  >
                    <ProjectPicker
                      companyId={context.companyId}
                      value={effectiveSelectedProjectId}
                      includeArchived
                      placeholder={wikiMessage(locale, "setupProjectPlaceholder")}
                      noneLabel={wikiMessage(locale, "setupNoProject")}
                      searchPlaceholder={wikiMessage(locale, "setupSearchProjects")}
                      emptyMessage={wikiMessage(locale, "setupNoProjectsFound")}
                      onChange={setSelectedProjectId}
                    />
                  </fieldset>
                  <Tiny>
                    {wikiMessage(locale, "setupStatusPrefix")} {projectStatusLabel(locale, currentProjectOption?.status ?? data.managedProject.details?.status ?? data.managedProject.status)}
                  </Tiny>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button size="sm" variant="primary" onClick={chooseProject} loading={projectBusy} disabled={!effectiveSelectedProjectId}>{wikiMessage(locale, "setupSaveProject")}</Button>
                    {projectLink ? <Button size="sm" onClick={() => hostNavigation.navigate(projectLink)}>{wikiMessage(locale, "setupOpenProject")}</Button> : null}
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!context.companyId) return;
                      setProjectBusy(true);
                      try {
                        await reconcileProject({ companyId: context.companyId });
                        toast({ tone: "success", title: wikiMessage(locale, "setupProjectReconciledToast") });
                        settings.refresh();
                      } catch (err) {
                        toast({ tone: "error", title: wikiMessage(locale, "setupProjectRepairFailedToast"), body: err instanceof Error ? err.message : String(err) });
                      } finally {
                        setProjectBusy(false);
                      }
                    }} loading={projectBusy}>{wikiMessage(locale, "setupRepairReconcileProject")}</Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!context.companyId) return;
                      setProjectBusy(true);
                      try {
                        await resetProject({ companyId: context.companyId });
                        toast({ tone: "success", title: wikiMessage(locale, "setupProjectResetToast") });
                        settings.refresh();
                      } catch (err) {
                        toast({ tone: "error", title: wikiMessage(locale, "setupProjectResetFailedToast"), body: err instanceof Error ? err.message : String(err) });
                      } finally {
                        setProjectBusy(false);
                      }
                    }} loading={projectBusy}>{wikiMessage(locale, "setupResetProject")}</Button>
                  </div>
                </div>
              </div>
            </SetupSection>
            <SetupSection title={wikiMessage(locale, "setupManagedRoutinesSection")} separated>
              <div style={{ display: "grid", gap: 12, maxWidth: isMobile ? "none" : 620, minWidth: 0 }}>
                <RoutineHealthChecklist items={routineHealthItems} locale={locale} />
                {routineHealthWarnings.length > 0 ? (
                  <Callout tone="warn">
                    <div style={{ display: "grid", gap: 8 }}>
                      <div>{wikiMessage(locale, routineHealthWarnings.length === 1 ? "setupRoutineIssuesOne" : "setupRoutineIssuesMany", { count: routineHealthWarnings.length })}</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {routineHealthWarnings.map((item) => <li key={item.label}>{item.detail}</li>)}
                      </ul>
                      <div>
                        <Button size="sm" variant="primary" onClick={repairManagedRoutines} loading={routineRepairBusy}>{wikiMessage(locale, "setupFixRoutines")}</Button>
                      </div>
                    </div>
                  </Callout>
                ) : routineDefaultDriftItems.length > 0 ? (
                  <Callout tone="warn">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <span>{wikiMessage(locale, routineDefaultDriftItems.length === 1 ? "setupRoutineDriftOne" : "setupRoutineDriftMany", { count: routineDefaultDriftItems.length })}</span>
                      <Button size="sm" variant="primary" onClick={() => {
                        setActiveSettingsSection("routines");
                        hostNavigation.navigate(buildSettingsSectionHref("routines", activeSpaceSlug));
                      }}>{wikiMessage(locale, "setupReviewDefaults")}</Button>
                    </div>
                  </Callout>
                ) : (
                  <Tiny>{wikiMessage(locale, "setupUseManagedRoutineInfo")}</Tiny>
                )}
              </div>
            </SetupSection>
          </section>
        ) : activeSettingsSection === "distillation" ? (
          <SettingsPanel
            title={wikiMessage(locale, "distillationPanelTitle")}
            badge={<Badge tone="default">{wikiMessage(locale, "distillationDefaultSpaceOnly")}</Badge>}
            description={wikiMessage(locale, "distillationPanelDescription")}
          >
            <DistillationSettingsPanel context={context} settings={data} locale={locale} />
          </SettingsPanel>
        ) : activeSettingsSection === "routines" ? (
          <SettingsPanel title={settingsSectionLabel(locale, "routines")} description={settingsSectionDescription(locale, activeSettingsConfig.key)}>
          <div style={{ display: "grid", gap: 12 }}>
            {routineDefaultDriftItems.length > 0 ? (
              <Callout tone="warn">
                <div style={{ display: "grid", gap: 6 }}>
                  <strong>{wikiMessage(locale, "setupRoutineDefaultsChanged")}</strong>
                  <span>{wikiMessage(locale, "setupReviewRoutineDefaultsHelp")}</span>
                </div>
              </Callout>
            ) : null}
            {routineHealthWarnings.length > 0 ? (
              <Callout tone="warn">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <strong>{wikiMessage(locale, "setupRoutineNeedsRepair")}</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {routineHealthWarnings.map((item) => <li key={item.label}>{item.detail}</li>)}
                    </ul>
                  </div>
                  <Button size="sm" variant="primary" onClick={repairManagedRoutines} loading={routineRepairBusy}>{wikiMessage(locale, "setupFixRoutines")}</Button>
                </div>
              </Callout>
            ) : (
              <Callout>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <span>{wikiMessage(locale, "setupRoutineHealthyCallout")}</span>
                  <Button size="sm" disabled>{wikiMessage(locale, "setupRoutinesValid")}</Button>
                </div>
              </Callout>
            )}
            <PluginManagedRoutinesList
              routines={managedRoutineItems}
              agents={maintainerAgentOptions}
              projects={projectOptions}
              pluginDisplayName="LLM Wiki"
              emptyMessage={wikiMessage(locale, "setupRoutineListEmpty")}
              labels={{
                configure: wikiMessage(locale, "setupRoutineConfigure"),
                managedBy: wikiMessage(locale, "setupRoutineManagedBy", { name: "{name}" }),
                schedule: wikiMessage(locale, "setupRoutineSchedule"),
                missingRefs: wikiMessage(locale, "setupRoutineMissingPrefix"),
                defaultsCanBeRepaired: wikiMessage(locale, "setupRoutineDefaultsRepairable"),
                reconciling: wikiMessage(locale, "setupRoutineReconciling"),
                reconcile: wikiMessage(locale, "setupRoutineReconcile"),
                resetting: wikiMessage(locale, "setupRoutineResetting"),
                reset: wikiMessage(locale, "setupRoutineReset"),
              }}
              runningRoutineKey={routineBusyKeyFor("run")}
              statusMutationRoutineKey={routineBusyKeyFor("status")}
              resettingRoutineKey={routineBusyKeyFor("reset")}
              onRunNow={runManagedRoutineNow}
              onToggleEnabled={toggleManagedRoutine}
              onReset={resetManagedRoutineToDefaults}
            />
          </div>
          </SettingsPanel>
        ) : activeSettingsSection === "lint" ? (
          <SettingsLintPanel context={context} locale={locale} />
        ) : activeSettingsSection === "spaces" ? (
          <SpacesSettingsPanel context={context} locale={locale} description={settingsSectionDescription(locale, "spaces")} />
        ) : activeSettingsSection === "events" ? (
          <SettingsPanel
            title={wikiMessage(locale, "eventIngestionTitle")}
            badge={<Badge tone={currentEventPolicy.enabled ? "running" : "default"}>{wikiMessage(locale, currentEventPolicy.enabled ? "eventIngestionEnabled" : "eventIngestionOffByDefault")}</Badge>}
            description={settingsSectionDescription(locale, activeSettingsConfig.key)}
          >
          <Tiny style={{ marginBottom: 10 }}>
            {wikiMessage(locale, "eventIngestionDescription")}
          </Tiny>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={currentEventPolicy.enabled}
                onChange={(event) => setEventPolicy({ ...currentEventPolicy, enabled: event.currentTarget.checked })}
              />
              {wikiMessage(locale, "eventIngestionEnableForCompany")}
            </label>
            <div style={{ display: "grid", gap: 8, paddingLeft: isMobile ? 0 : 22 }}>
              {([
                ["issues", "eventIngestionIssues", "eventIngestionIssuesHelp"],
                ["comments", "eventIngestionComments", "eventIngestionCommentsHelp"],
                ["documents", "eventIngestionDocuments", "eventIngestionDocumentsHelp"],
              ] as const).map(([key, label, help]) => (
                <label key={key} style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 8, rowGap: 2, alignItems: "start", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={currentEventPolicy.sources[key]}
                    onChange={(event) => setEventPolicy({
                      ...currentEventPolicy,
                      sources: { ...currentEventPolicy.sources, [key]: event.currentTarget.checked },
                    })}
                  />
                  <span>
                    {wikiMessage(locale, label)}
                    <Tiny style={{ display: "block" }}>{wikiMessage(locale, help)}</Tiny>
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "grid", gap: 6, maxWidth: isMobile ? "none" : 220 }}>
              <label style={{ fontSize: 12, color: tokens.muted }}>{wikiMessage(locale, "eventIngestionMaxCharacters")}</label>
              <TextInput
                value={String(currentEventPolicy.maxCharacters)}
                onChange={(event) => {
                  const parsed = Number(event.currentTarget.value);
                  setEventPolicy({ ...currentEventPolicy, maxCharacters: Number.isFinite(parsed) ? parsed : currentEventPolicy.maxCharacters });
                }}
              />
            </div>
            <Callout tone="warn">
              {wikiMessage(locale, "eventIngestionPolicyWarning")}
            </Callout>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button size="sm" variant="primary" onClick={saveEventPolicy} loading={eventPolicyBusy}>{wikiMessage(locale, "eventIngestionSave")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setEventPolicy(data.eventIngestion)}>{wikiMessage(locale, "eventIngestionRevert")}</Button>
            </div>
          </div>
          </SettingsPanel>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spaces settings — list of spaces with sub-nav and a per-space edit panel.
// Reachable via /wiki/settings/spaces or /wiki/settings/spaces/<slug>.
// ---------------------------------------------------------------------------

function SpacesSettingsPanel({ context, locale, description }: { context: { companyId: string | null; companyPrefix?: string | null }; locale: WikiLocale; description: string }) {
  const { pathname } = useHostLocation();
  const hostNavigation = useHostNavigation();
  const activeSpaceSlug = useMemo(() => readActiveSpaceSlugFromLocation(pathname), [pathname]);
  const editingSlug = useMemo(() => readSettingsSpaceSlugFromLocation(pathname), [pathname]);
  const isMobile = useIsMobileLayout();
  const spacesQuery = useSpaces(context.companyId);
  const spaces = useMemo(() => {
    const list = spacesQuery.data?.spaces ?? [];
    return activeWikiSpaces(list).sort(compareSpaces);
  }, [spacesQuery.data]);
  const [createOpen, setCreateOpen] = useState(false);

  const focusedSpace = useMemo(() => {
    if (editingSlug) return spaces.find((s) => s.slug === editingSlug) ?? null;
    return spaces.find((s) => s.slug === activeSpaceSlug) ?? spaces.find((s) => s.slug === DEFAULT_SPACE_SLUG) ?? spaces[0] ?? null;
  }, [editingSlug, spaces, activeSpaceSlug]);

  return (
    <SettingsPanel title={wikiMessage(locale, "sharedSpaces")} description={description}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr", gap: 18, alignItems: "flex-start" }}>
        <aside style={{ display: "grid", gap: 4, minWidth: 0 }}>
          {spaces.map((space) => {
            const active = focusedSpace?.slug === space.slug;
            return (
              <button
                key={space.slug}
                type="button"
                onClick={() => hostNavigation.navigate(buildSettingsSectionHref("spaces", activeSpaceSlug, space.slug))}
                style={{
                  textAlign: "left",
                  background: active ? tokens.accent : "transparent",
                  border: `1px solid ${active ? tokens.border : "transparent"}`,
                  borderRadius: 6,
                  padding: "8px 10px",
                  color: tokens.fg,
                  cursor: "pointer",
                  fontFamily: fontStack,
                  display: "grid",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{space.displayName}</span>
                <span style={{ fontSize: 11, color: tokens.muted, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{space.slug}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            style={{
              textAlign: "left",
              background: "transparent",
              border: `1px dashed ${tokens.border}`,
              borderRadius: 6,
              padding: "8px 10px",
              color: "oklch(0.78 0.13 250)",
              cursor: "pointer",
              fontFamily: fontStack,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            <PlusIcon size={14} />
            {wikiMessage(locale, "addSpace")}
          </button>
        </aside>
        <div style={{ minWidth: 0, display: "grid", gap: 14 }}>
          {spacesQuery.loading && spaces.length === 0 ? <Tiny>{wikiMessage(locale, "loadingSpaces")}</Tiny> : null}
          {spacesQuery.error ? <Callout tone="danger">{wikiMessage(locale, "failedToLoadSpaces", { message: spacesQuery.error.message })}</Callout> : null}
          {focusedSpace ? (
            <SpaceEditCard
              space={focusedSpace}
              locale={locale}
              companyId={context.companyId}
              isOnlySpace={spaces.length === 1}
              refresh={spacesQuery.refresh}
              onArchived={() => {
                hostNavigation.navigate(buildSettingsSectionHref("spaces", activeSpaceSlug));
              }}
            />
          ) : (
            <Callout>{wikiMessage(locale, "noSpaceSelected")}</Callout>
          )}
        </div>
      </div>
      {createOpen && context.companyId ? (
        <CreateSpaceModal
          locale={locale}
          companyId={context.companyId}
          existingSlugs={new Set(spaces.map((s) => s.slug))}
          onClose={() => setCreateOpen(false)}
          onCreated={(space) => {
            setCreateOpen(false);
            spacesQuery.refresh();
            hostNavigation.navigate(buildSettingsSectionHref("spaces", activeSpaceSlug, space.slug));
          }}
        />
      ) : null}
    </SettingsPanel>
  );
}

function spaceStatusLabel(locale: WikiLocale, status: string): string {
  if (status === "active") return wikiMessage(locale, "activeSpaceStatus");
  if (status === "archived") return wikiMessage(locale, "archivedSpaceStatus");
  return status;
}

function spaceTypeLabel(locale: WikiLocale, spaceType: string): string {
  if (spaceType === "managed") return wikiMessage(locale, "managedSpaceType");
  return spaceType;
}

function spaceAccessScopeLabel(locale: WikiLocale, accessScope: string): string {
  if (accessScope === "shared") return wikiMessage(locale, "sharedAccessScope");
  if (accessScope === "team") return wikiMessage(locale, "teamAccessScope");
  if (accessScope === "personal") return wikiMessage(locale, "personalAccessScope");
  return accessScope;
}

function SpaceEditCard({
  space,
  locale,
  companyId,
  isOnlySpace,
  refresh,
  onArchived,
}: {
  space: WikiSpace;
  locale: WikiLocale;
  companyId: string | null;
  isOnlySpace: boolean;
  refresh: () => void;
  onArchived: () => void;
}) {
  const updateSpace = usePluginAction("update-space");
  const archiveSpace = usePluginAction("archive-space");
  const bootstrapSpace = usePluginAction("bootstrap-space");
  const folderStatusQuery = useSpaceFolderStatus(companyId, space.slug);
  const toast = usePluginToast();
  const isDefault = space.slug === DEFAULT_SPACE_SLUG;
  const [displayName, setDisplayName] = useState(space.displayName);
  const [busy, setBusy] = useState(false);
  const [folderBusy, setFolderBusy] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);

  useEffect(() => {
    setDisplayName(space.displayName);
  }, [space.slug, space.displayName]);

  const folder = folderStatusQuery.data?.folder ?? null;
  const relativeRoot = folderStatusQuery.data?.relativeRoot ?? "";
  const settingsRecord = (space.settings ?? {}) as Record<string, unknown>;
  const folderModeLabel = space.folderMode === "managed_subfolder"
    ? wikiMessage(locale, "newManagedFolder")
    : space.folderMode === "existing_local_folder"
      ? wikiMessage(locale, "existingFolderUnderWikiRoot")
      : space.folderMode;

  async function saveName() {
    if (!companyId || displayName.trim().length === 0 || displayName.trim() === space.displayName) return;
    setBusy(true);
    try {
      await updateSpace({ companyId, spaceSlug: space.slug, displayName: displayName.trim() });
      toast({ tone: "success", title: wikiMessage(locale, "spaceNameUpdated") });
      refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "spaceUpdateFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function recreateBaseline() {
    if (!companyId || folderBusy) return;
    setFolderBusy(true);
    try {
      await bootstrapSpace({ companyId, spaceSlug: space.slug });
      toast({ tone: "success", title: wikiMessage(locale, "baselineRestored"), body: wikiMessage(locale, "baselineRestoredBody", { name: space.displayName }) });
      folderStatusQuery.refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "bootstrapFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setFolderBusy(false);
    }
  }

  async function archive() {
    if (!companyId || isDefault || isOnlySpace || archiveBusy) return;
    if (typeof window !== "undefined" && !window.confirm(wikiMessage(locale, "archiveConfirmation", { space: space.displayName }))) {
      return;
    }
    setArchiveBusy(true);
    try {
      await archiveSpace({ companyId, spaceSlug: space.slug });
      toast({ tone: "success", title: wikiMessage(locale, "spaceArchived"), body: wikiMessage(locale, "archiveSuccessBody", { space: space.displayName }) });
      refresh();
      onArchived();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "archiveFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setArchiveBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card>
        <CardHeader
          title={
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FolderIcon size={16} />
              <span>{space.displayName}</span>
              <Badge tone="default" style={{ fontSize: 10 }}>{space.slug}</Badge>
              <Badge tone={space.status === "active" ? "running" : "default"} style={{ fontSize: 10 }}>{spaceStatusLabel(locale, space.status)}</Badge>
            </span>
          }
          right={
            <span style={{ fontSize: 11, color: tokens.muted }}>
              {spaceTypeLabel(locale, space.spaceType)} · {spaceAccessScopeLabel(locale, space.accessScope)}
            </span>
          }
        />
        <CardBody>
          <Tiny>
            {wikiMessage(locale, "spaceStoredUnder", { path: relativeRoot || (isDefault ? wikiMessage(locale, "wikiRootPath") : `spaces/${space.slug}/`) })}
          </Tiny>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={wikiMessage(locale, "identity")} />
        <CardBody>
          <div style={{ display: "grid", gap: 12 }}>
            <FormField label={wikiMessage(locale, "displayNameLabel")}>
              <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} />
            </FormField>
            <FormField label={wikiMessage(locale, "slugLabel")} help={wikiMessage(locale, "spaceSlugLockedHelp")}>
              <TextInput value={space.slug} disabled style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", opacity: 0.7 }} />
            </FormField>
            <FormField label={wikiMessage(locale, "typeLabel")} help={`(${wikiMessage(locale, "cloudConnectorsComingSoon")})`}>
              <TextInput value={spaceTypeLabel(locale, space.spaceType)} disabled style={{ opacity: 0.7 }} />
            </FormField>
            <div>
              <Button variant="primary" size="sm" onClick={saveName} disabled={busy || displayName.trim() === space.displayName} loading={busy}>{wikiMessage(locale, "saveName")}</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={wikiMessage(locale, "folderSourceHealth")} />
        <CardBody>
          <div style={{ display: "grid", gap: 12 }}>
            <FormField label={wikiMessage(locale, "modeLabel")}>
              <TextInput value={folderModeLabel} disabled style={{ opacity: 0.7 }} />
            </FormField>
            <FormField label={wikiMessage(locale, "pathLabel")}>
              <TextInput value={folder?.path ?? folder?.realPath ?? relativeRoot ?? wikiMessage(locale, "unconfiguredPath")} disabled style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", opacity: 0.7 }} />
            </FormField>
            {folderStatusQuery.loading ? <Tiny>{wikiMessage(locale, "loadingFolderStatus")}</Tiny> : null}
            {folderStatusQuery.error ? <Callout tone="danger">{folderStatusQuery.error.message}</Callout> : null}
            {folder ? <SpaceFolderHealthChecklist folder={folder} locale={locale} /> : null}
            <div>
              <Button size="sm" onClick={recreateBaseline} loading={folderBusy}>{wikiMessage(locale, "recreateBaseline")}</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <PaperclipIngestionSpaceCard companyId={companyId} space={space} locale={locale} refresh={refresh} />

      <Card style={{ opacity: 0.56 }}>
        <CardHeader title={wikiMessage(locale, "accessLabel")} />
        <CardBody>
          <div aria-disabled="true" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Badge tone="default" style={{ fontSize: 10 }}>{spaceAccessScopeLabel(locale, space.accessScope)}</Badge>
              <Badge tone="default" style={{ fontSize: 10 }}>{wikiMessage(locale, "comingSoon")}</Badge>
            </div>
            <Tiny>
              {wikiMessage(locale, "accessScopeMetadataOnly")}
            </Tiny>
            <FormField label={wikiMessage(locale, "ownerUserId")}>
              <TextInput value={(settingsRecord.ownerUserHint as string | undefined) ?? space.ownerUserId ?? ""} disabled style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
            </FormField>
            <FormField label={wikiMessage(locale, "ownerTeamKey")}>
              <TextInput value={space.teamKey ?? ""} disabled style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} />
            </FormField>
          </div>
        </CardBody>
      </Card>

      <Card style={{ borderColor: "oklch(0.5 0.18 25)" }}>
        <CardHeader
          title={<span style={{ color: "oklch(0.78 0.18 25)" }}>{wikiMessage(locale, "dangerZone")}</span>}
        />
        <CardBody>
          <div style={{ display: "grid", gap: 8 }}>
            <Tiny>
              {isDefault
                ? wikiMessage(locale, "defaultSpaceArchiveReason")
                : isOnlySpace
                  ? wikiMessage(locale, "onlySpaceArchiveReason")
                  : wikiMessage(locale, "archiveSpaceReason")}
            </Tiny>
            <div>
              <Button
                variant="destructive"
                size="sm"
                onClick={archive}
                disabled={isDefault || isOnlySpace || archiveBusy}
                loading={archiveBusy}
                title={isDefault ? wikiMessage(locale, "defaultSpaceCannotArchive") : isOnlySpace ? wikiMessage(locale, "oneSpaceMustRemain") : undefined}
              >
                {wikiMessage(locale, "archiveThisSpace")}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function paperclipIngestionStateBadge(data: PaperclipIngestionProfileData | null, locale: WikiLocale): { tone: Tone; label: string } {
  if (!data) return { tone: "default", label: wikiMessage(locale, "profileLoadingState") };
  if (data.effectiveState === "policy_blocked") return { tone: "blocked", label: wikiMessage(locale, "profileLockedState") };
  if (data.effectiveState === "pending_approval") return { tone: "queued", label: wikiMessage(locale, "profilePendingApproval") };
  if (data.effectiveState === "enabled_no_scopes") return { tone: "failed", label: wikiMessage(locale, "profileMisconfigured") };
  if (data.effectiveState === "enabled") {
    const sourceCount = data.profile.sourceScopes.length;
    const sourceLabel = wikiMessage(locale, sourceCount === 1 ? "sourcesOne" : "sourcesMany", { count: sourceCount });
    return { tone: "running", label: wikiMessage(locale, "profileOn", { sources: sourceLabel }) };
  }
  return { tone: "default", label: wikiMessage(locale, "profileOff") };
}

function PaperclipIngestionSpaceCard({ companyId, space, locale, refresh }: { companyId: string | null; space: WikiSpace; locale: WikiLocale; refresh: () => void }) {
  const profileQuery = usePaperclipIngestionProfile(companyId, space.slug);
  const updateProfile = usePluginAction("update-paperclip-ingestion-profile");
  const toast = usePluginToast();
  const data = profileQuery.data ?? null;
  const [draft, setDraft] = useState<PaperclipIngestionProfile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(data?.profile ?? null);
  }, [data?.space.slug, data?.profile]);

  const badge = paperclipIngestionStateBadge(data, locale);
  const locked = data?.effectiveState === "policy_blocked";
  const sourceScope = draft?.sourceScopes[0];
  const activeProjectLimit = sourceScope?.kind === "active_projects" ? sourceScope.limit : 3;
  const canSave = Boolean(companyId && draft && !busy && !locked);
  const emptyScopes = Boolean(draft?.enabled && draft.sourceScopes.length === 0);

  function patchDraft(patch: Partial<PaperclipIngestionProfile>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  function setSourceKind(key: WikiEventIngestionSource, value: boolean) {
    setDraft((current) => current
      ? { ...current, sourceKinds: { ...current.sourceKinds, [key]: value } }
      : current);
  }

  function setActiveProjectsLimit(value: number) {
    setDraft((current) => current
      ? {
          ...current,
          sourceScopes: [{ kind: "active_projects", limit: Math.max(1, Math.floor(value || 1)) }],
        }
      : current);
  }

  async function save() {
    if (!companyId || !draft || locked) return;
    setBusy(true);
    try {
      await updateProfile({ companyId, spaceSlug: space.slug, profile: draft });
      toast({ tone: "success", title: wikiMessage(locale, "profileSaved"), body: wikiMessage(locale, "profileSavedBody", { space: space.displayName }) });
      profileQuery.refresh();
      refresh();
    } catch (err) {
      toast({ tone: "error", title: wikiMessage(locale, "profileSaveFailed"), body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={<span>Paperclip → {space.displayName}</span>}
        right={<Badge tone={badge.tone} style={{ fontSize: 10 }}>{badge.label}</Badge>}
      />
      <CardBody>
        <div style={{ display: "grid", gap: 12 }}>
          {profileQuery.loading && !data ? <Tiny>{wikiMessage(locale, "profileLoading")}</Tiny> : null}
          {profileQuery.error ? <Callout tone="danger">{profileQuery.error.message}</Callout> : null}
          {locked ? (
            <Callout tone="warn">
              {wikiMessage(locale, "profileLockedMessage")}
            </Callout>
          ) : null}
          {data && data.historicalPageCount > 0 && data.effectiveState === "disabled" ? (
            <Callout>{wikiMessage(locale, "profileOffHistoricalPages", {
              pages: wikiMessage(locale, data.historicalPageCount === 1 ? "historicalPagesOne" : "historicalPagesMany", { count: data.historicalPageCount }),
            })}</Callout>
          ) : null}
          {data && data.overlapCount > 0 ? (
            <Callout>{wikiMessage(locale, "profileSourceOverlap", {
              overlaps: wikiMessage(locale, data.overlapCount === 1 ? "overlapOne" : "overlapMany", { count: data.overlapCount }),
            })}</Callout>
          ) : null}
          {emptyScopes ? <Callout tone="warn">{wikiMessage(locale, "pickSourceScope")}</Callout> : null}
          {draft ? (
            <>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  disabled={locked || busy}
                  onChange={(event) => patchDraft({
                    enabled: event.currentTarget.checked,
                    sourceScopes: event.currentTarget.checked && draft.sourceScopes.length === 0
                      ? [{ kind: "active_projects", limit: activeProjectLimit }]
                      : draft.sourceScopes,
                  })}
                />
                <span>
                  {wikiMessage(locale, "enablePaperclipIngestion")}
                  <Tiny style={{ display: "block" }}>{wikiMessage(locale, "enablePaperclipIngestionHelp", { space: space.displayName })}</Tiny>
                </span>
              </label>
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{wikiMessage(locale, "sourceScope")}</strong>
                <label style={{ display: "grid", gap: 6, maxWidth: 260 }}>
                  <Tiny>{wikiMessage(locale, "recentlyActiveProjectsAuto")}</Tiny>
                  <TextInput
                    value={String(activeProjectLimit)}
                    disabled={locked || busy}
                    onChange={(event) => setActiveProjectsLimit(Number(event.currentTarget.value))}
                  />
                </label>
                <Tiny>{wikiMessage(locale, "sourceScopeEditorHelp")}</Tiny>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{wikiMessage(locale, "sourceKinds")}</strong>
                {([
                  ["issues", "issues"],
                  ["comments", "comments"],
                  ["documents", "documents"],
                ] as const).map(([key, label]) => (
                  <label key={key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={draft.sourceKinds[key]}
                      disabled={locked || busy}
                      onChange={(event) => setSourceKind(key, event.currentTarget.checked)}
                    />
                    {wikiMessage(locale, label)}
                  </label>
                ))}
                <Tiny>{wikiMessage(locale, "attachmentsLocked")}</Tiny>
                <Tiny>{wikiMessage(locale, "workProductsLocked")}</Tiny>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{wikiMessage(locale, "caps")}</strong>
                <Tiny>
                  {wikiMessage(locale, "profileCapsDefault", {
                    window: draft.cursor.maxWindowCharacters.toLocaleString(locale),
                    source: draft.cursor.maxCharactersPerSource.toLocaleString(locale),
                  })}
                </Tiny>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button size="sm" variant="primary" onClick={save} loading={busy} disabled={!canSave || emptyScopes}>{wikiMessage(locale, "savePaperclipProfile")}</Button>
                <Button size="sm" variant="ghost" onClick={() => setDraft(data?.profile ?? null)} disabled={busy}>{wikiMessage(locale, "revertChanges")}</Button>
              </div>
            </>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

function SpaceFolderHealthChecklist({ folder, locale }: { folder: FolderStatus; locale: WikiLocale }) {
  const items = [
    { key: "readable", label: wikiMessage(locale, "spaceFolderReadable"), ok: folder.readable },
    { key: "writable", label: wikiMessage(locale, "spaceFolderWritable"), ok: folder.writable },
    ...folder.requiredDirectories.map((dir) => ({
      key: `dir-${dir}`,
      label: wikiMessage(locale, "folderPresent", { name: `${dir}/` }),
      ok: !folder.missingDirectories.includes(dir),
    })),
    ...folder.requiredFiles.map((file) => ({
      key: `file-${file}`,
      label: wikiMessage(locale, "folderPresent", { name: file }),
      ok: !folder.missingFiles.includes(file),
    })),
  ];

  return (
    <div role="list" aria-label={wikiMessage(locale, "spaceFolderHealthChecklist")} style={{ position: "relative", display: "grid", gap: 0, padding: "2px 0" }}>
      {items.length > 1 ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 8,
            top: 12,
            bottom: 12,
            width: 1,
            background: "oklch(0.38 0.09 145)",
          }}
        />
      ) : null}
      {items.map((item) => (
        <div
          key={item.key}
          role="listitem"
          style={{
            display: "grid",
            gridTemplateColumns: "18px minmax(0, 1fr)",
            alignItems: "center",
            gap: 10,
            padding: "7px 0",
            minWidth: 0,
          }}
        >
          <span style={{ display: "inline-flex", justifyContent: "center", position: "relative", zIndex: 1, background: tokens.bg }}>
            <StatusIcon status={item.ok ? "done" : "blocked"} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: item.ok ? tokens.fg : "oklch(0.85 0.1 70)" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
