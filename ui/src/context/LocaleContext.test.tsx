// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localePreferenceApi } from "../api/locale-preference";
import { LanguageSelector } from "../components/LanguageSelector";
import { LocaleStateProvider, localeStorageKey, useLocale, type LocaleIdentity } from "./LocaleContext";
import { i18n, useTranslation } from "../i18n";
import { formatCents } from "../lib/utils";
import type { LocalePreference } from "@paperclipai/shared/locale-preference";

vi.mock("../api/locale-preference", () => ({ localePreferenceApi: { get: vi.fn(), save: vi.fn() } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function settle() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); }

describe("identity-scoped locale and accessible selection", () => {
  let host: HTMLDivElement;
  let root: Root;
  function Probe() {
    const { t } = useTranslation();
    const locale = useLocale();
    return <><LanguageSelector /><input aria-label="Draft fixture" defaultValue="unsaved original text" /><output data-testid="message">{t("app.noCompanies.title")}</output><output data-testid="money">{formatCents(123456)}</output><output data-testid="locale">{locale?.locale}</output></>;
  }
  async function render(identity: LocaleIdentity, identityError = false) {
    await act(async () => root.render(<LocaleStateProvider identity={identity} identityError={identityError}><Probe /></LocaleStateProvider>));
    await settle();
  }
  async function select(value: string) {
    await act(async () => {
      const select = host.querySelector("select")!;
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settle();
  }
  const message = () => host.querySelector('[data-testid="message"]')!.textContent;
  const current = () => host.querySelector("select")!.value;

  beforeEach(async () => {
    vi.clearAllMocks(); localStorage.clear();
    await i18n.changeLanguage("pt-BR");
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    vi.mocked(localePreferenceApi.get).mockResolvedValue({ locale: "pt-BR", source: "default" });
    vi.mocked(localePreferenceApi.save).mockImplementation(async (locale) => ({ locale, source: "user" }));
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

  it("defaults to Portuguese despite an English browser, exposes both native labels, and persists local choice", async () => {
    vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
    await render("local");
    expect(current()).toBe("pt-BR");
    expect(message()).toBe("Crie sua primeira organização");
    const selectNode = host.querySelector("select")!;
    expect(host.querySelector(`label[for="${CSS.escape(selectNode.id)}"]`)?.textContent).toBe("Idioma");
    expect(Array.from(selectNode.options).map((option) => option.text)).toEqual(["Português (Brasil)", "English"]);
    await select("en");
    expect(document.documentElement.lang).toBe("en");
    expect(message()).toBe("Create your first organization");
    expect(localStorage.getItem(localeStorageKey("local"))).toBe("en");
    expect(localePreferenceApi.save).not.toHaveBeenCalled();
    await act(async () => root.unmount()); root = createRoot(host);
    await render("local"); expect(current()).toBe("en");
  });

  it("waits for remote confirmation, updates presentation without reload, and preserves the form node/draft", async () => {
    const pending = deferred<LocalePreference>();
    vi.mocked(localePreferenceApi.save).mockReturnValueOnce(pending.promise);
    await render("user:alice");
    const input = host.querySelector("input")!; input.value = "draft in original language";
    await select("en");
    expect(current()).toBe("pt-BR"); expect(host.querySelector("select")!.disabled).toBe(true);
    await act(async () => pending.resolve({ locale: "en", source: "user" }));
    expect(current()).toBe("en"); expect(message()).toBe("Create your first organization");
    expect(host.querySelector("input")).toBe(input); expect(input.value).toBe("draft in original language");
    expect(host.querySelector('[data-testid="money"]')!.textContent).toBe("$1,234.56");
    expect(localStorage.getItem(localeStorageKey("user:alice"))).toBe("en");
    expect(localStorage.getItem(localeStorageKey("local"))).toBeNull();
  });

  it("keeps the confirmed locale on save failure and allows a retry", async () => {
    vi.mocked(localePreferenceApi.save).mockRejectedValueOnce(new Error("fixture network error"));
    await render("user:alice"); await select("en");
    expect(current()).toBe("pt-BR"); expect(host.querySelector('[role="alert"]')!.textContent).toContain("Não foi possível salvar");
    await select("en"); expect(current()).toBe("en"); expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it("uses only the same account's cache on failed reads and never writes the fallback remotely", async () => {
    localStorage.setItem(localeStorageKey("local"), "en");
    localStorage.setItem(localeStorageKey("user:alice"), "en");
    vi.mocked(localePreferenceApi.get).mockRejectedValue(new Error("offline"));
    await render("user:alice"); expect(current()).toBe("en");
    await render("user:bob"); expect(current()).toBe("pt-BR");
    expect(host.querySelector('[role="alert"]')!.textContent).toContain("Não foi possível carregar");
    expect(localePreferenceApi.save).not.toHaveBeenCalled();
    vi.mocked(localePreferenceApi.get).mockResolvedValue({ locale: "en", source: "user" });
    await act(async () => host.querySelector("button")!.click()); await settle();
    expect(current()).toBe("en");
  });

  it("does not import anonymous choices and restores them only after logout", async () => {
    localStorage.setItem(localeStorageKey("local"), "en");
    await render("local"); expect(current()).toBe("en");
    await render("user:alice"); expect(current()).toBe("pt-BR");
    await select("en"); await render("user:bob"); expect(current()).toBe("pt-BR");
    await render("local"); expect(current()).toBe("en");
    expect(localePreferenceApi.save).toHaveBeenCalledTimes(1);
  });

  it("discards obsolete reads and saves across identity changes", async () => {
    const readingAlice = deferred<LocalePreference>();
    vi.mocked(localePreferenceApi.get).mockReturnValueOnce(readingAlice.promise);
    await render("user:alice"); await render("user:bob");
    await act(async () => readingAlice.resolve({ locale: "en", source: "user" }));
    expect(current()).toBe("pt-BR");
    expect(localStorage.getItem(localeStorageKey("user:alice"))).toBeNull();
    const savingBob = deferred<LocalePreference>();
    vi.mocked(localePreferenceApi.save).mockReturnValueOnce(savingBob.promise);
    await select("en"); await render("user:carol");
    await select("en"); expect(current()).toBe("en");
    await act(async () => savingBob.resolve({ locale: "pt-BR", source: "user" }));
    expect(current()).toBe("en");
    expect(localStorage.getItem(localeStorageKey("user:bob"))).toBe("pt-BR");
  });

  it("synchronizes only the active identity across tabs and retains pending-save confirmation", async () => {
    await render("user:alice");
    await act(async () => window.dispatchEvent(new StorageEvent("storage", { key: localeStorageKey("user:bob"), newValue: "en" })));
    expect(current()).toBe("pt-BR");
    await act(async () => window.dispatchEvent(new StorageEvent("storage", { key: localeStorageKey("user:alice"), newValue: "en" })));
    expect(current()).toBe("en");
    const pending = deferred<LocalePreference>(); vi.mocked(localePreferenceApi.save).mockReturnValueOnce(pending.promise);
    await select("pt-BR");
    await act(async () => window.dispatchEvent(new StorageEvent("storage", { key: localeStorageKey("user:alice"), newValue: "en" })));
    await act(async () => pending.resolve({ locale: "pt-BR", source: "user" }));
    expect(current()).toBe("pt-BR"); expect(host.querySelector("select")!.disabled).toBe(false);
  });

  it("keeps unknown identity separate from local state and handles unavailable local persistence", async () => {
    localStorage.setItem(localeStorageKey("local"), "en");
    await render(null, true); expect(current()).toBe("pt-BR"); expect(host.querySelector("select")!.disabled).toBe(true);
    expect(localePreferenceApi.get).not.toHaveBeenCalled();
    await render("local");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("fixture quota"); });
    await select("pt-BR"); expect(current()).toBe("en"); expect(host.querySelector('[role="alert"]')!.textContent).toContain("Could not save");
  });
});
