// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { defaultTriggerDraft, RoutineTriggerWizard, webhookAgentInstructions } from "./TriggerWizard";

const { setBreadcrumbs } = vi.hoisted(() => ({ setBreadcrumbs: vi.fn() }));
vi.mock("@/context/BreadcrumbContext", () => ({ useBreadcrumbs: () => ({ setBreadcrumbs }) }));
vi.mock("@/context/SidebarContext", () => ({ useSidebar: () => ({ isMobile: false, setSidebarOpen: () => {} }) }));
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => { await i18n.changeLanguage("pt-BR"); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

it("offers the shared app flow without a Fireflies-specific sender", async () => {
  await act(async () => root.render(<RoutineTriggerWizard initialDraft={{ ...defaultTriggerDraft, kind: "webhook" }} routineTitle="Process meetings" routineId="routine-1" onSaveExit={() => {}} onFinish={() => {}} />));
  expect(container.textContent).toContain("Outro app ou script");
  expect(container.textContent).not.toContain("Fireflies");
  expect(container.textContent).toContain("Serviços públicos precisam de uma URL HTTPS de webhook acessível pela internet.");
});

it("resumes generic setup with a signing secret and preserves the draft", async () => {
  const onSaveExit = vi.fn();
  await act(async () => root.render(<RoutineTriggerWizard initialDraft={{ ...defaultTriggerDraft, kind: "webhook", created: true, step: 1, availableStep: 1 }} routineTitle="Process meetings" routineId="routine-1" webhookUrl="https://paperclip.example/api/routine-triggers/public/test/fire" webhookSecret="test-signing-secret" onSaveExit={onSaveExit} onFinish={() => {}} />));
  expect(container.textContent).toContain("Chave secreta");
  expect(container.textContent).toContain("campo de segredo de assinatura");
  expect(container.textContent).not.toContain("Fireflies");
  const save = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Salvar e sair"))!;
  await act(async () => save.click());
  expect(onSaveExit).toHaveBeenCalledWith(expect.objectContaining({ sender: "custom", step: 1, created: true }));
});

it("explains both supported app authentication methods", () => {
  const instructions = webhookAgentInstructions("custom", "Meetings", "https://paperclip.example/webhook", "signing-secret");
  expect(instructions).toContain("Chave secreta: signing-secret");
  expect(instructions).toContain("X-Hub-Signature");
  expect(instructions).toContain("Authorization: Bearer signing-secret");
  expect(instructions).toContain("Elas não iniciam a rotina nem criam uma tarefa.");
  expect(instructions).not.toContain("Fireflies");
});

it("keeps legacy bearer setup instructions accurate", () => {
  const instructions = webhookAgentInstructions("custom", "Meetings", "https://paperclip.example/webhook", "secret", true, "bearer");
  expect(instructions).toContain("Authorization: Bearer secret");
  expect(instructions).not.toContain("HMAC-SHA256");
});

it("localizes URL warnings while keeping the HTTPS guidance link", async () => {
  await act(async () => root.render(<RoutineTriggerWizard initialDraft={{ ...defaultTriggerDraft, kind: "webhook", created: true, step: 1, availableStep: 1 }} routineTitle="Process meetings" routineId="routine-1" webhookUrl="http://paperclip.example/api/routine-triggers/public/test/fire" webhookSecret="test-signing-secret" onSaveExit={() => {}} onFinish={() => {}} />));
  expect(container.textContent).toContain("Use HTTPS para webhooks enviados por outros apps");
  expect(container.textContent).toContain("Esta URL usa HTTP.");
  const docsLink = container.querySelector<HTMLAnchorElement>('a[href="https://docs.paperclip.ing/reference/deploy/https/"]');
  expect(docsLink?.textContent).toBe("Saiba como configurar HTTPS e acesso público");
});

it("keeps the trigger wizard and technical webhook values available in English", async () => {
  await act(async () => { await i18n.changeLanguage("en"); });
  await act(async () => root.render(<RoutineTriggerWizard initialDraft={{ ...defaultTriggerDraft, kind: "webhook" }} routineTitle="Process meetings" routineId="routine-1" onSaveExit={() => {}} onFinish={() => {}} />));
  expect(container.textContent).toContain("When should this routine run?");
  expect(container.textContent).toContain("Another app or script");
  const instructions = webhookAgentInstructions("custom", "Meetings", "https://paperclip.example/webhook", "signing-secret");
  expect(instructions).toContain("Content-Type: application/json");
  expect(instructions).toContain("X-Hub-Signature or X-Hub-Signature-256");
  expect(instructions).toContain("Idempotency-Key");
});
