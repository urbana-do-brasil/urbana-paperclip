// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { TaskViewsMenu } from "./TaskViewsMenu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("TaskViewsMenu localization", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  async function render(onChange: (view: string) => void) {
    await act(async () => {
      root.render(<TaskViewsMenu value="mine" onChange={onChange} badgeCount={3} />);
    });
    const trigger = container.querySelector<HTMLButtonElement>("button");
    await act(async () => {
      trigger?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      await Promise.resolve();
    });
    return trigger;
  }

  it("translates the view selector and preserves the selected route in English", async () => {
    const onChange = vi.fn();
    const trigger = await render(onChange);

    expect(trigger?.getAttribute("aria-label")).toBe("Change view — currently Mine");
    const menu = document.body.querySelector('[data-slot="dropdown-menu-content"]');
    expect(menu?.textContent).toContain("My work");
    expect(menu?.textContent).toContain("Assigned to you or waiting on you");
    expect(menu?.textContent).toContain("Organization");
    await act(async () => {
      [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')]
        .find((item) => item.textContent?.includes("Unread"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("unread");
  });

  it("translates the view selector and preserves the selected route in PT-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    const onChange = vi.fn();
    const trigger = await render(onChange);

    expect(trigger?.getAttribute("aria-label")).toBe("Alterar visualização — atualmente Minhas tarefas");
    const menu = document.body.querySelector('[data-slot="dropdown-menu-content"]');
    expect(menu?.textContent).toContain("Meu trabalho");
    expect(menu?.textContent).toContain("Atribuídas a você ou aguardando sua ação");
    expect(menu?.textContent).toContain("Organização");
    await act(async () => {
      [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')]
        .find((item) => item.textContent?.includes("Não lidas"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("unread");
  });
});
