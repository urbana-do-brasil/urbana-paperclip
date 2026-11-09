import type { PluginDetailTabProps } from "@paperclipai/plugin-sdk/ui";
import { copyTextToClipboard, usePluginData, usePluginToast } from "@paperclipai/plugin-sdk/ui";
import { DIFFS_TAG_NAME, getSingularPatch } from "@pierre/diffs";
import type { PatchDiffProps } from "@pierre/diffs/react";
import { useFileDiffInstance } from "@pierre/diffs/react";
import {
  createElement,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  diffSummary,
  fileName,
  initialExpandedFileSet,
  nextExpandedFileSet,
  statusLabel,
  toFileViewModels,
  type DiffFileViewModel,
  type DiffPatchViewModel,
  type DiffRenderMode,
} from "../diff-model.js";
import { formatNumber, lineCountLabel, patchKindDisplayLabel, workspaceDiffMessages } from "./messages.js";
import type { WorkspaceDiffResponse } from "../contracts.js";

type WorkspaceDiffData = WorkspaceDiffResponse;
type WorkspacePatchDiffOptions = PatchDiffProps<undefined>["options"];
type DiffViewMode = "working-tree" | "head";

type LucideIconProps = { size?: number };

const DEFAULT_FILE_SIDEBAR_WIDTH = 280;
const MIN_FILE_SIDEBAR_WIDTH = 220;
const MAX_FILE_SIDEBAR_WIDTH = 520;
const FILE_SIDEBAR_WIDTH_STEP = 16;
const FILE_SIDEBAR_WIDTH_STORAGE_KEY = "paperclip.workspace-diff.files-sidebar-width";

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

// Plugin bundles cannot import host-only lucide-react; this mirrors lucide RefreshCw.
const RefreshCwIcon = makeLucideIcon(
  <>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </>,
);

function readInitialView(): DiffViewMode {
  if (typeof window === "undefined") return "working-tree";
  return new URLSearchParams(window.location.search).get("diffView") === "head" ? "head" : "working-tree";
}

function hasInitialViewParam() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("diffView");
}

function readInitialBaseRef() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("baseRef") ?? "";
}

function buttonClass(active = false) {
  return [
    "inline-flex h-8 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors",
    active
      ? "border-foreground/20 bg-foreground text-background"
      : "border-border bg-background text-muted-foreground hover:text-foreground",
  ].join(" ");
}

function iconButtonClass(active = false) {
  return [
    "inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors",
    active
      ? "border-foreground/20 bg-foreground text-background"
      : "border-border bg-background text-muted-foreground hover:text-foreground",
  ].join(" ");
}

function clampFileSidebarWidth(width: number) {
  return Math.min(MAX_FILE_SIDEBAR_WIDTH, Math.max(MIN_FILE_SIDEBAR_WIDTH, width));
}

function readStoredFileSidebarWidth() {
  if (typeof window === "undefined") return DEFAULT_FILE_SIDEBAR_WIDTH;

  try {
    const stored = window.localStorage.getItem(FILE_SIDEBAR_WIDTH_STORAGE_KEY);
    if (!stored) return DEFAULT_FILE_SIDEBAR_WIDTH;
    const parsed = Number.parseInt(stored, 10);
    return Number.isFinite(parsed) ? clampFileSidebarWidth(parsed) : DEFAULT_FILE_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_FILE_SIDEBAR_WIDTH;
  }
}

function writeStoredFileSidebarWidth(width: number) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(FILE_SIDEBAR_WIDTH_STORAGE_KEY, String(clampFileSidebarWidth(width)));
  } catch {
    // Storage can be unavailable; keep resize interactive even when persistence fails.
  }
}

function useIsDesktopDiffLayout() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function warningText(file: DiffFileViewModel, locale?: string) {
  const messages = workspaceDiffMessages(locale);
  if (file.binary) return messages.binaryFile;
  if (file.oversized) return messages.tooLargeToRender;
  if (file.truncated) return messages.patchTruncated;
  if (file.warnings.length > 0) return file.warnings[0]?.message ?? messages.diffWarning;
  if (file.patches.every((patch) => !patch.patch)) return messages.noTextPatch;
  return null;
}

function patchWarningText(patch: DiffPatchViewModel, locale?: string) {
  const messages = workspaceDiffMessages(locale);
  if (patch.binary) return messages.binaryFile;
  if (patch.oversized) return messages.tooLargeToRender;
  if (patch.truncated) return messages.patchTruncated;
  if (patch.warnings.length > 0) return patch.warnings[0]?.message ?? messages.diffWarning;
  if (!patch.patch) return messages.noTextPatch;
  return null;
}

function FileRow({
  file,
  active,
  expanded,
  onSelect,
  onToggle,
  onCopy,
  locale,
}: {
  file: DiffFileViewModel;
  active: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onCopy: () => void;
  locale: string | undefined;
}) {
  const messages = workspaceDiffMessages(locale);
  const warning = warningText(file, locale);
  const expandLabel = expanded ? messages.collapseFile : messages.expandFile;
  const fileAriaLabel = expanded ? messages.collapsePath(file.path) : messages.expandPath(file.path);

  return (
    <div
      className={[
        "group border-b border-border/70 px-3 py-2 last:border-b-0",
        active ? "bg-accent/60" : "bg-background hover:bg-muted/45",
      ].join(" ")}
    >
      <div key="main" className="flex min-w-0 items-start gap-2">
        <button
          key="toggle"
          type="button"
          className="mt-0.5 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
          title={expandLabel}
          aria-label={fileAriaLabel}
        >
          {expanded ? "−" : "+"}
        </button>
        <button
          key="select"
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onSelect}
          aria-current={active ? "true" : undefined}
        >
          <div key="name" className="truncate text-sm font-medium text-foreground">{fileName(file.path)}</div>
          <div key="path" className="truncate font-mono text-[11px] text-muted-foreground">{file.path}</div>
        </button>
        <button
          key="copy"
          type="button"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          onClick={onCopy}
          title={messages.copyPath}
          aria-label={messages.copyPathFor(file.path)}
        >
          ⧉
        </button>
      </div>
      <div key="meta" className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-5 text-[11px] text-muted-foreground">
        <span key="status">{statusLabel(file.status, locale)}</span>
        <span key="additions" className="font-mono text-emerald-700 dark:text-emerald-300">{`+${formatNumber(file.additions, locale)}`}</span>
        <span key="deletions" className="font-mono text-red-700 dark:text-red-300">{`-${formatNumber(file.deletions, locale)}`}</span>
        {warning ? <span key="warning" className="text-amber-700 dark:text-amber-300">{warning}</span> : null}
      </div>
    </div>
  );
}

// The upstream React wrapper emits React 19 key warnings for its internal slot array.
// This mounts the same Diffs custom element through the exported imperative hook.
function WorkspacePatchDiff({
  patch,
  options,
}: {
  patch: string;
  options: WorkspacePatchDiffOptions;
}) {
  const fileDiff = useMemo(() => getSingularPatch(patch), [patch]);
  const { ref } = useFileDiffInstance({
    fileDiff,
    options,
    // This tab only shows a diff; it does not open an edit session.
    edit: false,
    editorOptions: undefined,
    metrics: undefined,
    lineAnnotations: undefined,
    selectedLines: undefined,
    prerenderedHTML: undefined,
    hasGutterRenderUtility: false,
    hasCustomHeader: false,
    disableWorkerPool: false,
  });

  return createElement(DIFFS_TAG_NAME, { ref });
}

function EmptyState({ locale }: { locale?: string }) {
  const messages = workspaceDiffMessages(locale);
  return (
    <div className="border border-dashed border-border bg-background px-4 py-8 text-center" role="status">
      <div className="text-sm font-medium text-foreground">{messages.emptyTitle}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        {messages.emptyDescription}
      </div>
    </div>
  );
}

function LoadingState({ locale }: { locale?: string }) {
  const messages = workspaceDiffMessages(locale);
  return (
    <div className="border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground" role="status" aria-live="polite">
      {messages.loading}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  locale,
}: {
  message: string;
  onRetry: () => void;
  locale?: string;
}) {
  const messages = workspaceDiffMessages(locale);
  return (
    <div className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm" role="alert">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{messages.errorTitle}</div>
          <div className="mt-1 text-muted-foreground">
            {messages.errorDescription}
          </div>
        </div>
        <button
          type="button"
          className={buttonClass(false)}
          onClick={onRetry}
          aria-label={messages.retryAccessible}
        >
          {messages.retry}
        </button>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
          {messages.troubleshootingDetails}
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words border border-border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
          {message || messages.noErrorMessage}
        </pre>
      </details>
    </div>
  );
}

function FileDiffPanel({
  file,
  mode,
  lineWrap,
  locale,
}: {
  file: DiffFileViewModel;
  mode: DiffRenderMode;
  lineWrap: boolean;
  locale: string | undefined;
}) {
  const messages = workspaceDiffMessages(locale);
  const warning = warningText(file, locale);
  if (warning) {
    return (
      <div className="border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground">
        {warning ?? messages.noRenderablePatch}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {file.patches.map((patch, index) => {
        const patchWarning = patchWarningText(patch, locale);
        return (
          <div key={`${patch.kind}:${index}`} className="overflow-hidden border border-border bg-background">
            {file.patches.length > 1 ? (
              <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{patchKindDisplayLabel(patch.kind, locale)}</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-300">{`+${formatNumber(patch.additions, locale)}`}</span>
                <span className="font-mono text-red-700 dark:text-red-300">{`-${formatNumber(patch.deletions, locale)}`}</span>
              </div>
            ) : null}
            {patchWarning || !patch.patch ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                {patchWarning ?? messages.noRenderablePatch}
              </div>
            ) : (
              <WorkspacePatchDiff
                patch={patch.patch}
                options={{
                  diffStyle: mode,
                  overflow: lineWrap ? "wrap" : "scroll",
                  disableLineNumbers: false,
                  themeType: "system",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CollapsedFilePanel({
  file,
  onExpand,
  locale,
}: {
  file: DiffFileViewModel;
  onExpand: () => void;
  locale: string | undefined;
}) {
  const messages = workspaceDiffMessages(locale);
  const title = file.longDiff ? messages.largeDiffFolded : messages.diffFolded;
  const details = file.lineCount > 0
    ? lineCountLabel(file.lineCount, locale)
    : statusLabel(file.status, locale);

  return (
    <div className="border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="font-medium text-foreground">{title}</div>
          <div className="mt-1 font-mono text-xs">{details}</div>
        </div>
        <button
          type="button"
          className={buttonClass(false)}
          onClick={onExpand}
          aria-label={messages.showDiffFor(file.path)}
        >
          {messages.showFile}
        </button>
      </div>
    </div>
  );
}

export function ChangesTab({ context }: PluginDetailTabProps) {
  const toast = usePluginToast();
  const locale = context.locale;
  const messages = workspaceDiffMessages(locale);
  const [mode, setMode] = useState<DiffRenderMode>("split");
  const [lineWrap, setLineWrap] = useState(false);
  const [view, setView] = useState<DiffViewMode>(() => readInitialView());
  const [baseRef, setBaseRef] = useState(() => readInitialBaseRef());
  const baseRefTouchedRef = useRef(Boolean(baseRef.trim()));
  const viewTouchedRef = useRef(hasInitialViewParam());
  const [includeUntracked, setIncludeUntracked] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(() => new Set());
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileSidebarWidth, setFileSidebarWidth] = useState(() => readStoredFileSidebarWidth());
  const [fileSidebarResizing, setFileSidebarResizing] = useState(false);
  const fileSidebarWidthRef = useRef(fileSidebarWidth);
  const fileSidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const fileSectionRefs = useRef(new Map<string, HTMLElement>());
  const diffScrollRef = useRef<HTMLElement | null>(null);
  const scrollSyncFrameRef = useRef<number | null>(null);
  const usesDesktopDiffLayout = useIsDesktopDiffLayout();
  const requestedBaseRef = baseRef.trim();
  const effectiveView = view === "head" && !requestedBaseRef ? "working-tree" : view;
  const fileSidebarStyle = useMemo(
    () => usesDesktopDiffLayout ? { width: `${fileSidebarWidth}px` } : undefined,
    [fileSidebarWidth, usesDesktopDiffLayout],
  );

  const params = useMemo(() => ({
    workspaceId: context.entityId,
    companyId: context.companyId ?? "",
    projectId: context.projectId ?? "",
    entityType: context.entityType,
    view: effectiveView,
    baseRef: requestedBaseRef || null,
    includeUntracked,
  }), [context.companyId, context.entityId, context.entityType, context.projectId, effectiveView, includeUntracked, requestedBaseRef]);

  const { data, loading, error, refresh } = usePluginData<WorkspaceDiffData>("workspace-diff", params);
  const files = useMemo(() => toFileViewModels(data), [data]);
  const summary = useMemo(() => diffSummary(data, locale), [data, locale]);
  const selectedFile = files.find((file) => file.path === selectedPath) ?? files[0] ?? null;
  const compareLabel = `${data?.baseRef ? `${messages.baseRef} ${data.baseRef}` : messages.workingTree}${data?.headSha ? ` · ${data.headSha.slice(0, 12)}` : ""}`;

  const setFileSectionRef = useCallback((filePath: string) => (node: HTMLElement | null) => {
    if (node) fileSectionRefs.current.set(filePath, node);
    else fileSectionRefs.current.delete(filePath);
  }, []);

  const selectFile = useCallback((filePath: string) => {
    setSelectedPath(filePath);
    window.requestAnimationFrame(() => {
      fileSectionRefs.current.get(filePath)?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, []);

  const syncSelectedPathFromScroll = useCallback(() => {
    const container = diffScrollRef.current;
    if (!container || files.length === 0) return;

    const containerTop = container.getBoundingClientRect().top;
    let nextPath = files[0]?.path ?? null;
    for (const file of files) {
      const section = fileSectionRefs.current.get(file.path);
      if (!section) continue;
      const offsetFromScrollTop = section.getBoundingClientRect().top - containerTop;
      if (offsetFromScrollTop <= 48) {
        nextPath = file.path;
      } else {
        break;
      }
    }

    if (nextPath) {
      setSelectedPath((current) => current === nextPath ? current : nextPath);
    }
  }, [files]);

  const handleDiffScroll = useCallback(() => {
    if (scrollSyncFrameRef.current !== null) return;
    scrollSyncFrameRef.current = window.requestAnimationFrame(() => {
      scrollSyncFrameRef.current = null;
      syncSelectedPathFromScroll();
    });
  }, [syncSelectedPathFromScroll]);

  const commitFileSidebarWidth = useCallback((nextWidth: number) => {
    const clamped = clampFileSidebarWidth(nextWidth);
    fileSidebarWidthRef.current = clamped;
    setFileSidebarWidth(clamped);
    writeStoredFileSidebarWidth(clamped);
  }, []);

  const handleFileSidebarPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!usesDesktopDiffLayout) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    fileSidebarDragRef.current = {
      startX: event.clientX,
      startWidth: fileSidebarWidthRef.current,
    };
    setFileSidebarResizing(true);
  }, [usesDesktopDiffLayout]);

  const handleFileSidebarPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = fileSidebarDragRef.current;
    if (!drag) return;

    const nextWidth = clampFileSidebarWidth(drag.startWidth + event.clientX - drag.startX);
    fileSidebarWidthRef.current = nextWidth;
    setFileSidebarWidth(nextWidth);
  }, []);

  const endFileSidebarResize = useCallback(() => {
    if (!fileSidebarDragRef.current) return;

    fileSidebarDragRef.current = null;
    setFileSidebarResizing(false);
    writeStoredFileSidebarWidth(fileSidebarWidthRef.current);
  }, []);

  const handleFileSidebarKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!usesDesktopDiffLayout) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      commitFileSidebarWidth(fileSidebarWidth - FILE_SIDEBAR_WIDTH_STEP);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      commitFileSidebarWidth(fileSidebarWidth + FILE_SIDEBAR_WIDTH_STEP);
    } else if (event.key === "Home") {
      event.preventDefault();
      commitFileSidebarWidth(MIN_FILE_SIDEBAR_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      commitFileSidebarWidth(MAX_FILE_SIDEBAR_WIDTH);
    }
  }, [commitFileSidebarWidth, fileSidebarWidth, usesDesktopDiffLayout]);

  useEffect(() => {
    const defaultBaseRef = data?.defaultBaseRef?.trim();
    if (!defaultBaseRef) return;
    if (!baseRef.trim() && !baseRefTouchedRef.current) {
      setBaseRef(defaultBaseRef);
    }
    if (view === "working-tree" && !viewTouchedRef.current) {
      setView("head");
    }
  }, [baseRef, data?.defaultBaseRef, view]);

  useEffect(() => {
    if (files.length === 0) {
      setExpandedFiles(new Set());
      setSelectedPath(null);
      return;
    }
    setExpandedFiles(initialExpandedFileSet(files));
    setSelectedPath((current) => files.some((file) => file.path === current) ? current : files[0]?.path ?? null);
  }, [files]);

  useEffect(() => {
    return () => {
      if (scrollSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollSyncFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!fileSidebarResizing || typeof document === "undefined") return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [fileSidebarResizing]);

  const copyPath = async (filePath: string) => {
    try {
      await copyTextToClipboard(filePath);
      toast({ title: messages.pathCopied, body: filePath });
    } catch {
      toast({ title: messages.copyFailed, body: filePath, tone: "error" });
    }
  };

  return (
    <div className="space-y-3">
      <div key="toolbar" className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div key="summary" className="min-w-0">
          <div key="summary-line" className="flex flex-wrap items-center gap-2 text-sm">
            <span key="changed" className="font-medium text-foreground">{summary.changedLabel}</span>
            <span key="lines" className="font-mono text-xs text-muted-foreground">{summary.lineLabel}</span>
            {summary.truncated ? (
              <span key="truncated" className="text-xs text-amber-700 dark:text-amber-300">{messages.truncated}</span>
            ) : null}
            {summary.warningCount > 0 ? (
              <span key="warnings" className="text-xs text-muted-foreground">{messages.warnings(summary.warningCount)}</span>
            ) : null}
          </div>
          <div key="compare" className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {compareLabel}
          </div>
        </div>

        <div key="actions" className="flex flex-wrap items-center gap-2">
          <div key="layout" className="inline-flex gap-1" role="group" aria-label={messages.diffLayout}>
            <button key="split" type="button" className={buttonClass(mode === "split")} onClick={() => setMode("split")} aria-pressed={mode === "split"}>
              {messages.split}
            </button>
            <button key="unified" type="button" className={buttonClass(mode === "unified")} onClick={() => setMode("unified")} aria-pressed={mode === "unified"}>
              {messages.unified}
            </button>
          </div>
          <button
            key="line-wrap"
            type="button"
            className={buttonClass(lineWrap)}
            onClick={() => setLineWrap((value) => !value)}
            title={lineWrap ? messages.disableLineWrapping : messages.enableLineWrapping}
            aria-pressed={lineWrap}
          >
            {lineWrap ? messages.wrapOn : messages.wrapLines}
          </button>
          <div key="view" className="inline-flex gap-1" role="group" aria-label={messages.diffComparison}>
            <button
              key="working-tree"
              type="button"
              className={buttonClass(effectiveView === "working-tree")}
              aria-pressed={effectiveView === "working-tree"}
              onClick={() => {
                viewTouchedRef.current = true;
                setView("working-tree");
              }}
            >
              {messages.workingTree}
            </button>
            <button
              key="head"
              type="button"
              className={buttonClass(effectiveView === "head")}
              aria-pressed={effectiveView === "head"}
              onClick={() => {
                viewTouchedRef.current = true;
                setView("head");
              }}
            >
              {messages.againstRef}
            </button>
          </div>
          {view === "head" ? (
            <input
              key="base-ref"
              className="h-8 w-40 rounded-md border border-border bg-background px-2.5 font-mono text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40"
              value={baseRef}
              onChange={(event) => {
                baseRefTouchedRef.current = true;
                setBaseRef(event.target.value);
              }}
              placeholder="origin/master"
              aria-label={messages.baseRef}
            />
          ) : null}
          {view === "working-tree" ? (
            <button
              key="untracked"
              type="button"
              className={buttonClass(includeUntracked)}
              onClick={() => setIncludeUntracked((value) => !value)}
              aria-pressed={includeUntracked}
            >
              {includeUntracked ? messages.untrackedShown : messages.showUntracked}
            </button>
          ) : null}
          <button
            key="refresh"
            type="button"
            className={iconButtonClass(false)}
            onClick={() => refresh()}
            title={messages.refreshChanges}
            aria-label={messages.refreshChanges}
          >
            <RefreshCwIcon />
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState locale={locale} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refresh} locale={locale} />
      ) : files.length === 0 ? (
        <EmptyState locale={locale} />
      ) : (
        <div key="content" className="flex flex-col gap-3 lg:h-[70vh] lg:min-h-[560px] lg:max-h-[820px] lg:flex-row">
          <aside
            key="files"
            className="relative flex min-w-0 flex-col border border-border bg-background lg:h-full lg:shrink-0 lg:overflow-hidden"
            style={fileSidebarStyle}
            aria-label={messages.files}
          >
            <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {messages.files}
            </div>
            <div key="list" className="max-h-[70vh] overflow-auto lg:max-h-none lg:flex-1">
              {files.map((file, index) => (
                <FileRow
                  key={`${file.path}:${index}`}
                  file={file}
                  active={file.path === selectedFile?.path}
                  expanded={expandedFiles.has(file.path)}
                  onSelect={() => selectFile(file.path)}
                  onToggle={() => setExpandedFiles((current) => nextExpandedFileSet(current, file.path))}
                  onCopy={() => void copyPath(file.path)}
                  locale={locale}
                />
              ))}
            </div>
            <div
              role="separator"
              aria-label={messages.resizeFileList}
              aria-description={messages.resizeFileListInstructions}
              aria-valuetext={messages.pixels(fileSidebarWidth)}
              title={messages.resizeFileListInstructions}
              aria-orientation="vertical"
              aria-valuemin={MIN_FILE_SIDEBAR_WIDTH}
              aria-valuemax={MAX_FILE_SIDEBAR_WIDTH}
              aria-valuenow={fileSidebarWidth}
              tabIndex={0}
              className={[
                "absolute inset-y-0 right-0 z-20 hidden w-3 cursor-col-resize touch-none outline-none lg:block",
                "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-transparent before:transition-colors",
                "hover:before:bg-border focus-visible:before:bg-ring",
                fileSidebarResizing ? "before:bg-ring" : "",
              ].join(" ")}
              onPointerDown={handleFileSidebarPointerDown}
              onPointerMove={handleFileSidebarPointerMove}
              onPointerUp={endFileSidebarResize}
              onPointerCancel={endFileSidebarResize}
              onLostPointerCapture={endFileSidebarResize}
              onKeyDown={handleFileSidebarKeyDown}
            />
          </aside>

          <main
            key="diffs"
            ref={diffScrollRef}
            className="max-h-[70vh] min-w-0 flex-1 space-y-3 overflow-auto lg:h-full lg:max-h-none lg:pr-1"
            onScroll={handleDiffScroll}
          >
            {files
              .map((file, index) => (
                <section
                  key={`${file.path}:${index}`}
                  ref={setFileSectionRef(file.path)}
                  className={file.path === selectedFile?.path ? "scroll-mt-2" : undefined}
                >
                  <div
                    key="header"
                    className="sticky top-0 z-30 flex min-w-0 items-center justify-between gap-3 border border-b-0 border-border bg-background px-3 py-2 shadow-sm"
                  >
                    <div key="left" className="flex min-w-0 items-start gap-2">
                      <button
                        key="collapse"
                        type="button"
                        className="mt-0.5 text-muted-foreground hover:text-foreground"
                        title={expandedFiles.has(file.path) ? messages.collapseFile : messages.expandFile}
                        aria-label={expandedFiles.has(file.path) ? messages.collapsePath(file.path) : messages.expandPath(file.path)}
                        aria-expanded={expandedFiles.has(file.path)}
                        onClick={() => setExpandedFiles((current) => nextExpandedFileSet(current, file.path))}
                      >
                        {expandedFiles.has(file.path) ? "−" : "+"}
                      </button>
                      <button
                        key="select"
                        type="button"
                        className="min-w-0 text-left"
                        onClick={() => selectFile(file.path)}
                      >
                        <div key="path" className="truncate text-sm font-medium">{file.path}</div>
                        {file.oldPath ? (
                          <div key="old-path" className="truncate font-mono text-[11px] text-muted-foreground">
                            {messages.fromPath(file.oldPath)}
                          </div>
                        ) : null}
                      </button>
                    </div>
                    <div key="actions" className="flex shrink-0 items-center gap-1">
                      <button
                        key="copy"
                        type="button"
                        className={iconButtonClass(false)}
                        title={messages.copyPath}
                        aria-label={messages.copyPathFor(file.path)}
                        onClick={() => void copyPath(file.path)}
                      >
                        ⧉
                      </button>
                    </div>
                  </div>
                  {expandedFiles.has(file.path) ? (
                    <FileDiffPanel key="diff" file={file} mode={mode} lineWrap={lineWrap} locale={locale} />
                  ) : (
                    <CollapsedFilePanel
                      key="collapsed"
                      file={file}
                      locale={locale}
                      onExpand={() => setExpandedFiles((current) => nextExpandedFileSet(current, file.path))}
                    />
                  )}
                </section>
              ))}
          </main>
        </div>
      )}
    </div>
  );
}
