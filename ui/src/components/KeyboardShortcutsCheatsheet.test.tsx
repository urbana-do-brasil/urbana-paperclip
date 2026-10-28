// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { KeyboardShortcutsCheatsheetContent } from "./KeyboardShortcutsCheatsheet";
import { i18n } from "../i18n";

describe("KeyboardShortcutsCheatsheet", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = "";
  });

  it("does not advertise the retired sidebar collapse shortcut", () => {
    const root = createRoot(container);
    flushSync(() => {
      root.render(<KeyboardShortcutsCheatsheetContent />);
    });

    const row = [...container.querySelectorAll("span")].find(
      (node) => node.textContent?.trim() === "Collapse or expand sidebar",
    )?.parentElement;
    expect(row).toBeUndefined();

    flushSync(() => {
      root.unmount();
    });
  });

  it("localizes shortcut sections, labels, and keyboard guidance in PT-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    const root = createRoot(container);
    flushSync(() => {
      root.render(<KeyboardShortcutsCheatsheetContent />);
    });

    expect(container.textContent).toContain("Caixa de entrada");
    expect(container.textContent).toContain("Mover para baixo");
    expect(container.textContent).toContain("Pressione Esc para fechar");
    expect(container.textContent).toContain("Os atalhos ficam desativados em campos de texto");

    flushSync(() => {
      root.unmount();
    });
  });
});
