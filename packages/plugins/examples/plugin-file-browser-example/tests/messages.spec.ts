import { describe, expect, it } from "vitest";
import { messagesFor, workspaceLabel } from "../src/ui/messages.js";

describe("File Browser labels", () => {
  it("provides distinct interface copy for Brazilian Portuguese and English", () => {
    const portuguese = messagesFor("pt-BR");
    const english = messagesFor("en");

    expect(portuguese.files).toBe("Arquivos");
    expect(portuguese.save).toBe("Salvar");
    expect(english.files).toBe("Files");
    expect(english.save).toBe("Save");
    expect(Object.keys(portuguese).sort()).toEqual(Object.keys(english).sort());
  });

  it("defaults to English when an older host does not provide a locale", () => {
    expect(messagesFor(undefined).noFiles).toBe("No files");
  });

  it("keeps paths and workspace names intact while localizing the primary marker", () => {
    const portuguese = messagesFor("pt-BR");
    const english = messagesFor("en");
    const path = "/workspaces/Projeto-ação/áudio";
    const workspace = {
      id: "workspace-id",
      name: "Workspace 日本語",
      path,
      isPrimary: true,
    };

    expect(workspaceLabel(workspace, portuguese)).toBe(`${path} (principal)`);
    expect(workspaceLabel(workspace, english)).toBe(`${path} (primary)`);
    expect(
      workspaceLabel({ ...workspace, path: "", isPrimary: false }, portuguese),
    ).toBe("Workspace 日本語");
  });

  it("keeps path tokens unchanged when adding localized accessible titles", () => {
    const path = "src/áudio/Plan Ω.ts";

    expect(messagesFor("pt-BR").openPathInBrowser(path)).toBe(
      `Abrir ${path} no navegador de arquivos`,
    );
    expect(messagesFor("en").openPathInBrowser(path)).toBe(
      `Open ${path} in file browser`,
    );
  });
});
