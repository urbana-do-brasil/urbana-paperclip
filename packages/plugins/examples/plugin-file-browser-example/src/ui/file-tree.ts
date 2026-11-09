import type { FileTreeNode } from "@paperclipai/plugin-sdk/ui";

export type FileEntry = { name: string; path: string; isDirectory: boolean };

export function entryToFileTreeNode(entry: FileEntry): FileTreeNode {
  return {
    name: entry.name,
    path: entry.path,
    kind: entry.isDirectory ? "dir" : "file",
    children: [],
  };
}

export function entriesToFileTreeNodes(entries: FileEntry[]): FileTreeNode[] {
  return entries.map(entryToFileTreeNode);
}
