// @vitest-environment jsdom

import { act as reactAct } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { i18n } from "../i18n";
import { DEFAULT_LOCALE } from "../i18n/locales";
import { ChoosePathButton } from "./PathInstructionsModal";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  await reactAct(async () => { await i18n.changeLanguage("en"); });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await reactAct(async () => { root.unmount(); });
  container.remove();
  document.body.innerHTML = "";
  await reactAct(async () => { await i18n.changeLanguage(DEFAULT_LOCALE); });
});

async function openInstructions() {
  await reactAct(async () => { root.render(<ChoosePathButton />); });
  const trigger = container.querySelector("button");
  expect(trigger).not.toBeNull();
  await reactAct(async () => {
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("PathInstructionsModal", () => {
  it("localizes macOS/Linux path guidance in Brazilian Portuguese and preserves technical examples", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    await openInstructions();

    expect(container.querySelector("button")?.textContent).toBe("Escolher");
    expect(document.body.textContent).toContain("Como obter um caminho completo");
    expect(document.body.textContent).toContain("Abra um terminal e navegue até o diretório usando cd.");
    expect(document.body.textContent).toContain("Execute pwd para exibir o caminho completo.");
    expect(document.body.textContent).toContain("/Users/you/project");
    expect(Array.from(document.body.querySelectorAll("button"))
      .some((button) => button.textContent?.includes("Fechar"))).toBe(true);
  });

  it("keeps the English guidance available", async () => {
    await openInstructions();

    expect(document.body.textContent).toContain("How to get a full path");
    expect(document.body.textContent).toContain("Open a terminal and navigate to the directory with cd.");
    expect(document.body.textContent).toContain("Run pwd to print the full path.");
    expect(Array.from(document.body.querySelectorAll("button"))
      .some((button) => button.textContent?.includes("Close"))).toBe(true);
  });
});
