import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import type { PluginHostContext } from "@paperclipai/plugin-sdk/ui";
import { buildFilePatches } from "../src/diff-model.js";
import { ChangesTab } from "../src/ui/index.js";
import {
  fileCountLabel,
  lineCountLabel,
  resolveWorkspaceDiffLocale,
  workspaceDiffMessages,
} from "../src/ui/messages.js";
import { changedFile, diffResponse } from "./fixtures.js";

type PluginBridgeGlobal = typeof globalThis & {
  __paperclipPluginBridge__?: {
    sdkUi?: Record<string, unknown>;
  };
};

const pluginGlobal = globalThis as PluginBridgeGlobal;

afterEach(() => {
  delete pluginGlobal.__paperclipPluginBridge__;
});

function renderWorkspaceDiff(locale: PluginHostContext["locale"], dataResult: Record<string, unknown>) {
  pluginGlobal.__paperclipPluginBridge__ = {
    sdkUi: {
      usePluginData: () => dataResult,
      usePluginToast: () => () => null,
    },
  };

  const context: PluginHostContext & { entityId: string; entityType: string } = {
    locale,
    companyId: "company-1",
    companyPrefix: "acme",
    projectId: "project-1",
    entityId: "workspace-1",
    entityType: "execution_workspace",
    userId: null,
  };

  return renderToStaticMarkup(createElement(ChangesTab, { context }));
}

describe("workspace diff locale presentation", () => {
  it.each([
    ["en", "No workspace changes"],
    ["pt-BR", "Nenhuma alteração no espaço de trabalho"],
  ] as const)("renders the empty state in the host locale %s", (locale, label) => {
    const html = renderWorkspaceDiff(locale, {
      data: diffResponse({ files: [] }),
      loading: false,
      error: null,
      refresh: () => undefined,
    });

    expect(html).toContain('role="status"');
    expect(html).toContain(label);
  });

  it.each([
    ["en", "Loading workspace changes…"],
    ["pt-BR", "Carregando alterações do espaço de trabalho…"],
  ] as const)("renders an accessible loading state in %s", (locale, label) => {
    const html = renderWorkspaceDiff(locale, {
      data: null,
      loading: true,
      error: null,
      refresh: () => undefined,
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(label);
  });

  it.each([
    ["en", "Unable to load workspace changes.", "Troubleshooting details", "Retry"],
    ["pt-BR", "Não foi possível carregar as alterações do espaço de trabalho.", "Detalhes para solução de problemas", "Tentar novamente"],
  ] as const)("localizes the error presentation in %s and preserves worker diagnostics", (locale, headline, details, retry) => {
    const rawDiagnostic = "Execution workspace not found: /workspace/src/app.ts";
    const html = renderWorkspaceDiff(locale, {
      data: null,
      loading: false,
      error: { code: "WORKER_ERROR", message: rawDiagnostic },
      refresh: () => undefined,
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain(headline);
    expect(html).toContain(details);
    expect(html).toContain(retry);
    expect(html.indexOf(rawDiagnostic)).toBeGreaterThan(html.indexOf(details));
  });

  it.each([
    ["en", "2 files", "+1,234 / -234", "2 warnings", "405 lines", "Against ref", "Copy src/arquivo.ts"],
    ["pt-BR", "2 arquivos", "+1.234 / -234", "2 avisos", "405 linhas", "Comparar com ref", "Copiar src/arquivo.ts"],
  ] as const)("localizes the loaded diff in %s while preserving paths, refs, and diagnostic text", (locale, fileCount, lineCount, warningCount, foldedLineCount, comparison, copyLabel) => {
    const rawPatch = Array.from({ length: 405 }, (_, index) => `+raw patch line ${index}`).join("\n");
    const firstWarning = {
      code: "patch_truncated" as const,
      message: "Worker diagnostic for src/original.ts",
      path: "src/original.ts",
    };
    const data = diffResponse({
      files: [
        changedFile({
          path: "src/arquivo.ts",
          oldPath: "src/original.ts",
          additions: 1234,
          deletions: 234,
          patches: [{
            kind: "unstaged",
            patch: rawPatch,
            additions: 1234,
            deletions: 234,
            binary: false,
            oversized: false,
            truncated: false,
            warnings: [],
          }],
          warnings: [firstWarning],
        }),
        changedFile({ path: "src/second.ts", additions: 0, deletions: 0 }),
      ],
      baseRef: "origin/release",
      headSha: "abcdef1234567890",
      warnings: [firstWarning, { ...firstWarning, code: "base_ref_missing", path: null }],
    });

    const html = renderWorkspaceDiff(locale, {
      data,
      loading: false,
      error: null,
      refresh: () => undefined,
    });

    expect(html).toContain(fileCount);
    expect(html).toContain(lineCount);
    expect(html).toContain(warningCount);
    expect(html).toContain(foldedLineCount);
    expect(html).toContain(comparison);
    expect(html).toContain("origin/release");
    expect(html).toContain("abcdef123456");
    expect(html).toContain("src/arquivo.ts");
    expect(html).toContain("src/original.ts");
    expect(html).toContain(copyLabel);
    expect(html).toContain("Worker diagnostic for src/original.ts");
    expect(buildFilePatches(data.files[0]!)[0]?.patch).toBe(rawPatch);
    expect(html).toContain(locale === "pt-BR" ? 'role="group" aria-label="Layout do diff"' : 'role="group" aria-label="Diff layout"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain(locale === "pt-BR" ? 'aria-label="Redimensionar lista de arquivos"' : 'aria-label="Resize file list"');
  });

  it("uses locale-aware singular and plural forms and falls back to English for older hosts", () => {
    expect(fileCountLabel(1, "en")).toBe("1 file");
    expect(fileCountLabel(0, "pt-BR")).toBe("0 arquivos");
    expect(lineCountLabel(1, "pt-BR")).toBe("1 linha");
    expect(lineCountLabel(2, "pt-BR")).toBe("2 linhas");
    expect(workspaceDiffMessages("pt-BR").warnings(1)).toBe("1 aviso");
    expect(workspaceDiffMessages("en").warnings(2)).toBe("2 warnings");
    expect(resolveWorkspaceDiffLocale(undefined)).toBe("en");
    expect(workspaceDiffMessages(undefined).loading).toBe("Loading workspace changes…");
  });
});
