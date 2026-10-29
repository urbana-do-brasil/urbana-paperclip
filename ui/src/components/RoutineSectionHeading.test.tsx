// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { RoutineSectionHeading } from "./RoutineSectionHeading";

const copyTextToClipboard = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("@/lib/clipboard", () => ({
  copyTextToClipboard,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function act(callback: () => void | Promise<void>) {
  let result: void | Promise<void> = undefined;
  flushSync(() => {
    result = callback();
  });
  await result;
}

describe("RoutineSectionHeading", () => {
  let container: HTMLDivElement;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(async () => {
    container?.remove();
    copyTextToClipboard.mockClear();
    await i18n.changeLanguage("en");
  });

  it("copies the description markdown from the button next to the heading", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const description = "```text\n- keep this line\n```";

    await act(async () => {
      root.render(<RoutineSectionHeading title="Overview" copyText={description} />);
    });

    const button = container.querySelector('button[aria-label="Copy description"]');
    expect(button).not.toBeNull();
    expect(container.querySelector("#routine-section-title")?.textContent).toBe("Overview");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(copyTextToClipboard).toHaveBeenCalledWith(description);

    await act(async () => {
      root.unmount();
    });
  });

  it("omits the copy button on sections that are not the overview", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RoutineSectionHeading title="Triggers" />);
    });

    expect(container.querySelector('button[aria-label="Copy description"]')).toBeNull();
    expect(container.querySelector("#routine-section-title")?.textContent).toBe("Triggers");

    await act(async () => {
      root.unmount();
    });
  });

  it("localizes the copy-description action in PT-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<RoutineSectionHeading title="Resumo" copyText="Descrição" />);
    });

    const button = container.querySelector<HTMLButtonElement>('button[aria-label="Copiar descrição"]');
    expect(button?.title).toBe("Copiar descrição");
    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(copyTextToClipboard).toHaveBeenCalledWith("Descrição");
    expect(document.body.textContent).toContain("Descrição copiada");

    await act(async () => root.unmount());
  });
});
