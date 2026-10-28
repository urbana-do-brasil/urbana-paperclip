// @vitest-environment jsdom
import { flushSync } from "react-dom";
import type { ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import type { AuthSession } from "@paperclipai/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../i18n";
import { BOOTSTRAP_FALLBACK_COMMAND } from "../bootstrapSetup";
import { BootstrapPendingPage } from "./BootstrapPendingPage";

vi.mock("@/context/CompanyContext", () => ({ useCompany: () => ({ selectedCompany: null }) }));
const session = { user: { id: "id", email: "person@example.test", name: "Person" } } as unknown as AuthSession;
describe("BootstrapPendingPage", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(async () => { await i18n.changeLanguage("en"); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
  afterEach(() => { flushSync(() => root.unmount()); container.remove(); });
  function render(props: Partial<ComponentProps<typeof BootstrapPendingPage>> = {}) {
    flushSync(() => root.render(<MemoryRouter><BootstrapPendingPage claimAvailable session={null} claimState="idle" onClaim={() => {}} {...props} /></MemoryRouter>));
  }
  it.each([["pt-BR", "Conclua a configuração deste Paperclip", "Este Paperclip aguarda seu primeiro administrador"], ["en", "Finish setting up this Paperclip", "This Paperclip is waiting on its first admin"]])(
    "preserves the fallback command and sign-in URL in %s", async (locale, privateTitle, publicTitle) => {
      await i18n.changeLanguage(locale);
      render();
      expect(container.querySelector("h1")?.textContent).toBe(privateTitle);
      expect(container.querySelector("pre")?.textContent).toContain(BOOTSTRAP_FALLBACK_COMMAND);
      expect(container.querySelector("a")?.getAttribute("href")).toBe("/auth?next=/");
      render({ claimAvailable: false, hasActiveInvite: true });
      expect(container.querySelector("h1")?.textContent).toBe(publicTitle);
      expect(container.querySelector("pre")?.textContent).toContain(BOOTSTRAP_FALLBACK_COMMAND);
      expect(container.querySelector("button")).toBeNull();
    },
  );
  it.each([["pt-BR", "Reivindicar esta instância", "Outra pessoa já reivindicou esta instância.", "Você é a pessoa administradora da instância"], ["en", "Claim this instance", "Someone else has already claimed this instance.", "You're the instance admin"]])(
    "retains identity and claim behavior in %s", async (locale, buttonLabel, errorText, success) => {
      await i18n.changeLanguage(locale);
      const onClaim = vi.fn();
      render({ session, onClaim, claimError: { status: 409, message: "private backend detail" } });
      expect(container.textContent).toContain("person@example.test");
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(errorText);
      expect(container.textContent).not.toContain("private backend detail");
      const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === buttonLabel)!;
      button.click(); expect(onClaim).toHaveBeenCalledTimes(1);
      render({ session, claimState: "claiming" });
      expect(container.querySelector("button")?.disabled).toBe(true);
      render({ session, claimState: "success" });
      expect(container.querySelector("h1")?.textContent).toBe(success);
      expect(container.querySelector("a")?.getAttribute("href")).toBe("/");
    },
  );
});
