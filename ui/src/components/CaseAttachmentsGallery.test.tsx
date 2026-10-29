// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CaseAttachmentRef } from "@/api/cases";
import { i18n } from "@/i18n";
import { CaseAttachmentsGallery } from "./CaseAttachmentsGallery";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function attachment(overrides: Partial<CaseAttachmentRef["asset"]> = {}): CaseAttachmentRef {
  return {
    id: "attachment-1",
    asset: { id: "asset-1", contentType: "image/png", byteSize: 1_572_864, originalFilename: "USER PHOTO.png", ...overrides },
    createdAt: "2026-10-29T12:00:00Z",
    updatedAt: "2026-10-29T12:00:00Z",
  };
}

describe("CaseAttachmentsGallery", () => {
  let container: HTMLDivElement;
  let root: Root;
  let previousLanguage = "pt-BR";

  beforeAll(() => { previousLanguage = i18n.language; });
  afterAll(async () => { await i18n.changeLanguage(previousLanguage); });
  beforeEach(async () => {
    await i18n.changeLanguage("pt-BR");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
  });

  it("localizes the empty state", () => {
    flushSync(() => root.render(<CaseAttachmentsGallery attachments={[]} />));
    expect(container.textContent).toContain("Não há anexos.");
  });

  it("formats sizes by locale and preserves filenames and asset paths", async () => {
    const image = attachment();
    const file = { ...attachment({ id: "asset-2", contentType: "application/pdf", originalFilename: null }), id: "attachment-2" };
    flushSync(() => root.render(<CaseAttachmentsGallery attachments={[image, file]} />));
    expect(container.textContent).toContain("1,5 MB");
    expect(container.textContent).toContain("anexo");
    expect(container.querySelector('img[alt="USER PHOTO.png"]')?.getAttribute("src")).toBe("/api/assets/asset-1/content");
    expect(container.querySelector('button[title="anexo"]')?.hasAttribute("disabled")).toBe(true);
    const imageButton = container.querySelector<HTMLButtonElement>('button[title="USER PHOTO.png"]');
    flushSync(() => imageButton!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.querySelector('a[aria-label="Baixar USER PHOTO.png"]')?.getAttribute("href")).toBe("/api/assets/asset-1/content?download=1");
    await i18n.changeLanguage("en");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.textContent).toContain("1.5 MB");
    expect(container.textContent).toContain("attachment");
    expect(document.body.querySelector('a[aria-label="Download USER PHOTO.png"]')).toBeTruthy();
  });
});
