// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HelpPage } from "./HelpPage";
import * as content from "./content";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => { await cleanup?.(); cleanup = undefined; vi.restoreAllMocks(); localStorage.clear(); });

async function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(<HelpPage />); await new Promise((resolve) => setTimeout(resolve, 10)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  cleanup = async () => { await act(async () => root.unmount()); host.remove(); };
  return host;
}

describe("standalone public help", () => {
  it("obeys the URL without touching an existing account/browser preference", async () => {
    localStorage.setItem("paperclip.locale.local", "pt-BR");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const host = await renderAt("/help/en/guides/board-operator/language");
    expect(host.querySelector("h1")?.textContent).toBe("Choose your language");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("paperclip.locale.local")).toBe("pt-BR");
    expect(host.querySelector('a[lang="pt-BR"]')?.getAttribute("href")).toBe("/help/pt-BR/guides/board-operator/language");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("labels an untranslated Portuguese guide and links to the same English topic", async () => {
    const english = await content.loadHelpTopic(content.findHelpTopic("api/costs")!, "en");
    vi.spyOn(content, "loadHelpTopic").mockResolvedValue({ ...english, fallback: true });
    const host = await renderAt("/help/pt-BR/api/costs");
    expect(host.querySelector('article[lang="en"]')).not.toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toContain("ainda não foi traduzido");
    expect(host.querySelector('a[lang="en"]')?.getAttribute("href")).toBe("/help/en/api/costs");
  });

  it("does not execute or render arbitrary HTML/scripts and preserves escaped examples", async () => {
    vi.spyOn(content, "loadHelpTopic").mockResolvedValue({
      content: '---\ntitle: Teste seguro\n---\n\n<script>window.__helpAttack = true</script>\n<img src=x onerror="window.__helpAttack=true">\n\n[unsafe](javascript:alert)\n\n```html\n<script>alert(1)</script>\n```',
      english: '---\ntitle: Safe test\n---\n', language: "pt-BR", fallback: false,
    });
    const host = await renderAt("/help/pt-BR/start/quickstart");
    expect(host.querySelector("script")).toBeNull();
    expect(host.querySelector("img[onerror]")).toBeNull();
    expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(host.querySelector("pre")?.textContent).toContain("<script>alert(1)</script>");
    expect((window as unknown as { __helpAttack?: boolean }).__helpAttack).toBeUndefined();
  });
});
