import * as React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CommentFileLinks,
  CommentOpenFiles,
  FilesLink,
  FilesTab,
} from "../src/ui/index.js";
import { entriesToFileTreeNodes } from "../src/ui/file-tree.js";
import type { PluginHostContext } from "@paperclipai/plugin-sdk/ui";

type FileTreeNode = {
  name: string;
  path: string;
  children: FileTreeNode[];
};

type HostDataResult = {
  data?: unknown;
  loading?: boolean;
  error?: { message: string } | null;
  refresh?: () => void;
};

type PluginBridge = {
  react: { createElement: typeof React.createElement };
  sdkUi: Record<string, unknown>;
};

const hostData = new Map<string, HostDataResult>();
const dataRequests: string[] = [];

function renderHostFileTree(props: Record<string, unknown>) {
  const nodes = props.nodes as FileTreeNode[];
  return React.createElement(
    "div",
    { role: "tree", "aria-label": props.ariaLabel },
    React.createElement(
      "ul",
      null,
      ...nodes.map((node) => React.createElement(
        "li",
        { key: node.path, "data-path": node.path },
        node.name,
      )),
    ),
  );
}

function installPluginBridge() {
  const bridge: PluginBridge = {
    react: { createElement: React.createElement },
    sdkUi: {
      FileTree: renderHostFileTree,
      usePluginData: (key: string) => {
        const result = hostData.get(key) ?? { data: undefined, loading: false, error: null };
        dataRequests.push(`${key}:${JSON.stringify(result)}`);
        return result;
      },
      usePluginAction: () => async () => undefined,
    },
  };
  (globalThis as typeof globalThis & { __paperclipPluginBridge__?: PluginBridge })
    .__paperclipPluginBridge__ = bridge;
}

const baseContext: PluginHostContext & { entityId: string; entityType: string } = {
  locale: "en",
  companyId: "company-id",
  companyPrefix: "acme",
  projectId: "project-id",
  entityId: "project-id",
  entityType: "project",
  userId: null,
};

function html(element: React.ReactElement) {
  return renderToStaticMarkup(element);
}

describe("File Browser plugin UI", () => {
  beforeEach(() => {
    hostData.clear();
    dataRequests.length = 0;
    installPluginBridge();
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { __paperclipPluginBridge__?: PluginBridge })
      .__paperclipPluginBridge__;
  });

  it.each([
    ["pt-BR", "Árvore de arquivos", "Espaço de trabalho", "Voltar aos arquivos"],
    ["en", "File Tree", "Workspace", "Back to files"],
  ] as const)("localizes the project browser surface for %s", (locale, fileTreeLabel, workspaceLabel, backLabel) => {
    const workspacePath = "/workspaces/Projeto-ação/áudio";
    const filePath = "src/áudio/Primeira edição.ts";
    hostData.set("workspaces", {
      data: [{
        id: "workspace-id",
        projectId: "project-id",
        name: "workspace-name",
        path: workspacePath,
        isPrimary: true,
      }],
      loading: false,
    });
    hostData.set("fileList", {
      data: { entries: [{ name: "Primeira edição.ts", path: filePath, isDirectory: false }] },
      loading: false,
    });

    const markup = html(React.createElement(FilesTab, {
      context: { ...baseContext, locale },
    }));

    expect(markup).toContain(fileTreeLabel);
    expect(markup).toContain(workspaceLabel);
    expect(markup).toContain(backLabel);
    expect(markup).toContain(`${workspacePath} (${locale === "pt-BR" ? "principal" : "primary"})`);
    expect(dataRequests.some((request) => request.startsWith("fileList:"))).toBe(true);
    expect(entriesToFileTreeNodes([{ name: "Primeira edição.ts", path: filePath, isDirectory: false }])).toEqual([{
      name: "Primeira edição.ts",
      path: filePath,
      kind: "file",
      children: [],
    }]);
  });

  it("localizes the sidebar item while keeping its project destination", () => {
    hostData.set("plugin-config", { data: { showFilesInSidebar: true }, loading: false });

    const markup = html(React.createElement(FilesLink, {
      context: { ...baseContext, locale: "pt-BR", entityType: "project" },
    }));

    expect(markup).toContain(">Arquivos</a>");
    expect(markup).toContain("/acme/projects/project-id?tab=");
  });

  it("localizes comment links and leaves each referenced path unchanged", () => {
    const path = "src/áudio/Plano Ω.ts";
    hostData.set("plugin-config", { data: { commentAnnotationMode: "both" }, loading: false });
    hostData.set("comment-file-links", { data: { links: [path] }, loading: false });
    const context = {
      ...baseContext,
      locale: "pt-BR",
      entityId: "comment-id",
      entityType: "comment" as const,
      parentEntityId: "issue-id",
    };

    const annotation = html(React.createElement(CommentFileLinks, { context }));
    const menuItem = html(React.createElement(CommentOpenFiles, { context }));

    expect(annotation).toContain(`${path} no navegador de arquivos`);
    expect(annotation).toContain(`>${path}</a>`);
    expect(menuItem).toContain(`${path} no navegador de arquivos`);
    expect(menuItem).toContain("Plano Ω.ts");
    expect(menuItem).toContain(`file=${encodeURIComponent(path)}`);
  });

  it("shows a localized explanation and preserves the original worker error", () => {
    const externalDetail = "Permission denied: /workspace/private/Segredo.md";
    hostData.set("workspaces", {
      data: [{
        id: "workspace-id",
        projectId: "project-id",
        name: "workspace-name",
        path: "/workspace",
        isPrimary: false,
      }],
      loading: false,
    });
    hostData.set("fileList", {
      data: { entries: [] },
      loading: false,
      error: { message: externalDetail },
    });

    const markup = html(React.createElement(FilesTab, {
      context: { ...baseContext, locale: "pt-BR" },
    }));

    expect(markup).toContain("Não foi possível carregar os arquivos:");
    expect(markup).toContain(externalDetail);
  });
});
