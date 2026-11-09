// @vitest-environment jsdom

import { act as reactAct } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import type { FolderListResult } from "@paperclipai/shared";
import { MoveToFolderDialog, SkillFolderRail } from "./SkillFolderTree";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function pointerEvent(type: string, clientX: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX });
  Object.defineProperty(event, "pointerId", { value: 1 });
  return event;
}

const result: FolderListResult = {
  kind: "skill",
  allCount: 12,
  unfiledCount: 2,
  folders: [
    {
      id: "my-root",
      companyId: "company-1",
      kind: "skill",
      parentId: null,
      name: "My Skills",
      slug: "my",
      systemKey: "my",
      path: "my",
      depth: 1,
      color: null,
      position: 0,
      itemCount: 4,
      createdAt: new Date("2026-07-16T00:00:00.000Z"),
      updatedAt: new Date("2026-07-16T00:00:00.000Z"),
    },
    {
      id: "personal-root",
      companyId: "company-1",
      kind: "skill",
      parentId: "my-root",
      name: "Ada",
      slug: "ada",
      systemKey: "my:user-1",
      path: "my/ada",
      depth: 2,
      color: null,
      position: 0,
      itemCount: 4,
      createdAt: new Date("2026-07-16T00:00:00.000Z"),
      updatedAt: new Date("2026-07-16T00:00:00.000Z"),
    },
  ],
};

describe("SkillFolderRail", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onSelect = vi.fn<(selection: string) => void>();

  beforeEach(async () => {
    await i18n.changeLanguage("en");
    window.localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    onSelect.mockClear();
    flushSync(() => {
      root.render(
        <SkillFolderRail
          result={result}
          selection="all"
          tags={[]}
          activeTag={null}
          onSelect={onSelect}
          onSelectTag={vi.fn()}
          onCreateFolder={vi.fn()}
          onRenameFolder={vi.fn()}
          onEditFolder={vi.fn()}
          onMoveFolder={vi.fn()}
          onDeleteFolder={vi.fn()}
        />,
      );
    });
  });

  afterEach(async () => {
    flushSync(() => root.unmount());
    container.remove();
    window.localStorage.clear();
    await i18n.changeLanguage(DEFAULT_LOCALE);
  });

  it("uses the wider default and persists drag resizing", () => {
    const rail = container.firstElementChild as HTMLDivElement;
    const separator = container.querySelector('[role="separator"]') as HTMLDivElement;
    expect(rail.style.width).toBe("288px");
    separator.setPointerCapture = vi.fn();

    flushSync(() => {
      separator.dispatchEvent(pointerEvent("pointerdown", 288));
      separator.dispatchEvent(pointerEvent("pointermove", 320));
      separator.dispatchEvent(pointerEvent("pointerup", 320));
    });

    expect(rail.style.width).toBe("320px");
    expect(window.localStorage.getItem("paperclip.skills.folderRail.width")).toBe("320");
  });

  it("localizes the skill folder rail and keeps user folder names unchanged", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });

    expect(container.querySelector('[aria-label="Pastas de skills"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Redimensionar pastas de skills"]')).not.toBeNull();
    expect(container.textContent).toContain("Todas as skills");
    expect(container.textContent).toContain("Minhas skills");
    expect(container.textContent).toContain("Ainda não há pastas da organização.");
    expect(container.textContent).toContain("Sem pasta");
    const mySkills = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Minhas skills"),
    );
    await reactAct(async () => { flushSync(() => mySkills?.click()); });
    expect(container.textContent).toContain("Ada");
  });

  it("localizes the destination picker while preserving folder paths", async () => {
    await reactAct(async () => { await i18n.changeLanguage("pt-BR"); });
    flushSync(() => {
      root.render(
        <MoveToFolderDialog
          open
          onOpenChange={vi.fn()}
          result={result}
          title='Mover "Code review"'
          subtitle="Escolha uma pasta de destino."
          currentFolderId="personal-root"
          onMove={vi.fn()}
          onCreateFolder={vi.fn(async () => null)}
        />,
      );
    });

    expect(document.body.textContent).toContain('Mover "Code review"');
    expect(document.body.querySelector('input[placeholder="Buscar pastas"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Minhas skills");
    expect(document.body.textContent).toContain("Ada");
    expect(document.body.textContent).toContain("Sem pasta");
    expect(document.body.textContent).toContain("Escolha uma pasta de destino.");
    expect(document.body.textContent).toContain("Mover para cá");
  });

  it("keeps virtual and folder counts on the same grid column", () => {
    const allRow = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("All skills"));
    const myLabel = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("My Skills"));
    const myRow = myLabel?.parentElement;

    expect(allRow?.className).toContain("grid-cols-(--gtc-folder-row-actions)");
    expect(myRow?.className).toContain("grid-cols-(--gtc-folder-row-actions)");
    expect(allRow?.querySelector(".tabular-nums")?.textContent).toBe("12");
    expect(myRow?.querySelector(".tabular-nums")?.textContent).toBe("4");
  });

  it("selects and toggles a folder when its row label is clicked", () => {
    const myLabel = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("My Skills"));

    expect(container.textContent).not.toContain("Ada");
    flushSync(() => myLabel?.click());

    expect(onSelect).toHaveBeenCalledWith("my-root");
    expect(container.textContent).toContain("Ada");
    expect(container.querySelector('[aria-label="Collapse folder"]')).not.toBeNull();
  });
});
