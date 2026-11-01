import type { PluginHostContext } from "@paperclipai/plugin-sdk/ui";

export interface FileBrowserMessages {
  files: string;
  openPathInBrowser: (path: string) => string;
  noWorkspacePath: string;
  primaryWorkspace: string;
  workspace: string;
  fileTree: string;
  noFiles: string;
  noFilesDescription: string;
  workspaceFiles: string;
  selectWorkspace: string;
  backToFiles: string;
  editor: string;
  noFileSelected: string;
  saving: string;
  save: string;
  saved: string;
  unsavedChanges: string;
  loadFilesError: string;
  loadFileError: string;
  saveFileError: string;
}

export function messagesFor(locale: PluginHostContext["locale"]): FileBrowserMessages {
  if (locale === "pt-BR") {
    return {
      files: "Arquivos",
      openPathInBrowser: (path) => `Abrir ${path} no navegador de arquivos`,
      noWorkspacePath: "(sem caminho de espaço de trabalho)",
      primaryWorkspace: "principal",
      workspace: "Espaço de trabalho",
      fileTree: "Árvore de arquivos",
      noFiles: "Nenhum arquivo",
      noFilesDescription: "Nenhum arquivo encontrado neste espaço de trabalho.",
      workspaceFiles: "Arquivos do espaço de trabalho",
      selectWorkspace: "Selecione um espaço de trabalho para navegar pelos arquivos.",
      backToFiles: "Voltar aos arquivos",
      editor: "Editor",
      noFileSelected: "Nenhum arquivo selecionado",
      saving: "Salvando...",
      save: "Salvar",
      saved: "Salvo",
      unsavedChanges: "Alterações não salvas",
      loadFilesError: "Não foi possível carregar os arquivos:",
      loadFileError: "Não foi possível carregar o arquivo:",
      saveFileError: "Não foi possível salvar o arquivo:",
    };
  }

  return {
    files: "Files",
    openPathInBrowser: (path) => `Open ${path} in file browser`,
    noWorkspacePath: "(no workspace path)",
    primaryWorkspace: "primary",
    workspace: "Workspace",
    fileTree: "File Tree",
    noFiles: "No files",
    noFilesDescription: "No files found in this workspace.",
    workspaceFiles: "Workspace files",
    selectWorkspace: "Select a workspace to browse files.",
    backToFiles: "Back to files",
    editor: "Editor",
    noFileSelected: "No file selected",
    saving: "Saving...",
    save: "Save",
    saved: "Saved",
    unsavedChanges: "Unsaved changes",
    loadFilesError: "Could not load files:",
    loadFileError: "Could not load file:",
    saveFileError: "Could not save file:",
  };
}

export interface WorkspaceLabelSource {
  id: string;
  name: string;
  path: string;
  isPrimary: boolean;
}

const PathLikePattern = /[\\/]/;
const WindowsDrivePathPattern = /^[A-Za-z]:[\\/]/;
const UuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLikelyPath(pathValue: string): boolean {
  const trimmed = pathValue.trim();
  return PathLikePattern.test(trimmed) || WindowsDrivePathPattern.test(trimmed);
}

export function workspaceLabel(workspace: WorkspaceLabelSource, messages: FileBrowserMessages): string {
  const pathLabel = workspace.path.trim();
  const nameLabel = workspace.name.trim();
  const hasPathLabel = isLikelyPath(pathLabel) && !UuidPattern.test(pathLabel);
  const hasNameLabel = nameLabel.length > 0 && !UuidPattern.test(nameLabel);
  const baseLabel = hasPathLabel ? pathLabel : hasNameLabel ? nameLabel : "";
  if (!baseLabel) {
    return workspace.isPrimary
      ? `${messages.noWorkspacePath} (${messages.primaryWorkspace})`
      : messages.noWorkspacePath;
  }

  return workspace.isPrimary ? `${baseLabel} (${messages.primaryWorkspace})` : baseLabel;
}
