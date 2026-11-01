import type { PluginHostContext } from "@paperclipai/plugin-sdk/ui";

export type WorkspaceDiffLocale = NonNullable<PluginHostContext["locale"]>;

type WorkspaceDiffMessages = {
  emptyTitle: string;
  emptyDescription: string;
  loading: string;
  errorTitle: string;
  errorDescription: string;
  retry: string;
  retryAccessible: string;
  troubleshootingDetails: string;
  noErrorMessage: string;
  binaryFile: string;
  tooLargeToRender: string;
  patchTruncated: string;
  diffWarning: string;
  noTextPatch: string;
  noRenderablePatch: string;
  copyPath: string;
  collapseFile: string;
  expandFile: string;
  collapsePath: (path: string) => string;
  expandPath: (path: string) => string;
  copyPathFor: (path: string) => string;
  pathCopied: string;
  copyFailed: string;
  largeDiffFolded: string;
  diffFolded: string;
  showDiffFor: (path: string) => string;
  showFile: string;
  fromPath: (path: string) => string;
  truncated: string;
  warnings: (count: number) => string;
  diffLayout: string;
  split: string;
  unified: string;
  disableLineWrapping: string;
  enableLineWrapping: string;
  wrapOn: string;
  wrapLines: string;
  diffComparison: string;
  workingTree: string;
  againstRef: string;
  baseRef: string;
  showUntracked: string;
  untrackedShown: string;
  refreshChanges: string;
  files: string;
  resizeFileList: string;
  resizeFileListInstructions: string;
  pixels: (count: number) => string;
};

const MESSAGES: Record<WorkspaceDiffLocale, WorkspaceDiffMessages> = {
  en: {
    emptyTitle: "No workspace changes",
    emptyDescription: "The workspace matches its current comparison target.",
    loading: "Loading workspace changes…",
    errorTitle: "Unable to load workspace changes.",
    errorDescription: "Retry the request or open the details below for the technical error.",
    retry: "Retry",
    retryAccessible: "Retry loading workspace changes",
    troubleshootingDetails: "Troubleshooting details",
    noErrorMessage: "No error message was provided.",
    binaryFile: "Binary file",
    tooLargeToRender: "Too large to render",
    patchTruncated: "Patch truncated",
    diffWarning: "Diff warning",
    noTextPatch: "No text patch",
    noRenderablePatch: "No renderable patch is available for this file.",
    copyPath: "Copy path",
    collapseFile: "Collapse file",
    expandFile: "Expand file",
    collapsePath: (path) => `Collapse ${path}`,
    expandPath: (path) => `Expand ${path}`,
    copyPathFor: (path) => `Copy ${path}`,
    pathCopied: "Path copied",
    copyFailed: "Copy failed",
    largeDiffFolded: "Large diff folded",
    diffFolded: "Diff folded",
    showDiffFor: (path) => `Show diff for ${path}`,
    showFile: "Show file",
    fromPath: (path) => `from ${path}`,
    truncated: "Truncated",
    warnings: (count) => `${formatNumber(count, "en")} ${plural(count, "warning", "warnings")}`,
    diffLayout: "Diff layout",
    split: "Split",
    unified: "Unified",
    disableLineWrapping: "Disable line wrapping",
    enableLineWrapping: "Enable line wrapping",
    wrapOn: "Wrap on",
    wrapLines: "Wrap lines",
    diffComparison: "Diff comparison",
    workingTree: "Working tree",
    againstRef: "Against ref",
    baseRef: "Base ref",
    showUntracked: "Show untracked",
    untrackedShown: "Untracked shown",
    refreshChanges: "Refresh changes",
    files: "Files",
    resizeFileList: "Resize file list",
    resizeFileListInstructions: "Resize file list. Use the left and right arrow keys; Home and End set the minimum and maximum width.",
    pixels: (count) => `${formatNumber(count, "en")} pixels`,
  },
  "pt-BR": {
    emptyTitle: "Nenhuma alteração no espaço de trabalho",
    emptyDescription: "O espaço de trabalho corresponde ao alvo de comparação atual.",
    loading: "Carregando alterações do espaço de trabalho…",
    errorTitle: "Não foi possível carregar as alterações do espaço de trabalho.",
    errorDescription: "Tente novamente ou abra os detalhes abaixo para ver o erro técnico.",
    retry: "Tentar novamente",
    retryAccessible: "Tentar carregar as alterações do espaço de trabalho novamente",
    troubleshootingDetails: "Detalhes para solução de problemas",
    noErrorMessage: "Nenhuma mensagem de erro foi fornecida.",
    binaryFile: "Arquivo binário",
    tooLargeToRender: "Grande demais para exibir",
    patchTruncated: "Patch truncado",
    diffWarning: "Aviso de diff",
    noTextPatch: "Sem patch de texto",
    noRenderablePatch: "Não há um patch exibível para este arquivo.",
    copyPath: "Copiar caminho",
    collapseFile: "Recolher arquivo",
    expandFile: "Expandir arquivo",
    collapsePath: (path) => `Recolher ${path}`,
    expandPath: (path) => `Expandir ${path}`,
    copyPathFor: (path) => `Copiar ${path}`,
    pathCopied: "Caminho copiado",
    copyFailed: "Falha ao copiar",
    largeDiffFolded: "Diff grande recolhido",
    diffFolded: "Diff recolhido",
    showDiffFor: (path) => `Mostrar diff de ${path}`,
    showFile: "Mostrar arquivo",
    fromPath: (path) => `de ${path}`,
    truncated: "Truncado",
    warnings: (count) => `${formatNumber(count, "pt-BR")} ${plural(count, "aviso", "avisos")}`,
    diffLayout: "Layout do diff",
    split: "Lado a lado",
    unified: "Unificado",
    disableLineWrapping: "Desativar quebra de linha",
    enableLineWrapping: "Ativar quebra de linha",
    wrapOn: "Quebra de linha ativa",
    wrapLines: "Quebrar linhas",
    diffComparison: "Comparação do diff",
    workingTree: "Árvore de trabalho",
    againstRef: "Comparar com ref",
    baseRef: "Ref base",
    showUntracked: "Mostrar arquivos não rastreados",
    untrackedShown: "Arquivos não rastreados visíveis",
    refreshChanges: "Atualizar alterações",
    files: "Arquivos",
    resizeFileList: "Redimensionar lista de arquivos",
    resizeFileListInstructions: "Redimensionar lista de arquivos. Use as setas para a esquerda e para a direita; Home e End definem a largura mínima e máxima.",
    pixels: (count) => `${formatNumber(count, "pt-BR")} pixels`,
  },
};

export function resolveWorkspaceDiffLocale(locale?: string): WorkspaceDiffLocale {
  return locale === "pt-BR" ? "pt-BR" : "en";
}

export function workspaceDiffMessages(locale?: string): WorkspaceDiffMessages {
  return MESSAGES[resolveWorkspaceDiffLocale(locale)];
}

export function formatNumber(count: number, locale?: string) {
  return new Intl.NumberFormat(resolveWorkspaceDiffLocale(locale)).format(count);
}

export function plural(count: number, one: string, other: string) {
  // For the integer counts rendered here, Portuguese uses the plural noun for
  // zero while English does too; only exactly one takes the singular form.
  return count === 1 ? one : other;
}

export function fileCountLabel(count: number, locale?: string) {
  const resolvedLocale = resolveWorkspaceDiffLocale(locale);
  const noun = resolvedLocale === "pt-BR"
    ? plural(count, "arquivo", "arquivos")
    : plural(count, "file", "files");
  return `${formatNumber(count, resolvedLocale)} ${noun}`;
}

export function lineCountLabel(count: number, locale?: string) {
  const resolvedLocale = resolveWorkspaceDiffLocale(locale);
  const noun = resolvedLocale === "pt-BR"
    ? plural(count, "linha", "linhas")
    : plural(count, "line", "lines");
  return `${formatNumber(count, resolvedLocale)} ${noun}`;
}

export function fileStatusLabel(status: string, locale?: string) {
  const resolvedLocale = resolveWorkspaceDiffLocale(locale);
  const labels: Record<string, string> = resolvedLocale === "pt-BR"
    ? {
        added: "Adicionado",
        modified: "Modificado",
        deleted: "Removido",
        renamed: "Renomeado",
        copied: "Copiado",
        type_changed: "Tipo alterado",
        untracked: "Não rastreado",
        unknown: "Alterado",
      }
    : {
        added: "Added",
        modified: "Modified",
        deleted: "Deleted",
        renamed: "Renamed",
        copied: "Copied",
        type_changed: "Type changed",
        untracked: "Untracked",
        unknown: "Changed",
      };
  return labels[status] ?? labels.unknown;
}

export function patchKindDisplayLabel(kind: string, locale?: string) {
  const resolvedLocale = resolveWorkspaceDiffLocale(locale);
  const labels: Record<string, string> = resolvedLocale === "pt-BR"
    ? {
        staged: "Em stage",
        unstaged: "Fora do stage",
        head: "HEAD",
        untracked: "Não rastreado",
      }
    : {
        staged: "Staged",
        unstaged: "Unstaged",
        head: "HEAD",
        untracked: "Untracked",
      };
  return labels[kind] ?? "Patch";
}
