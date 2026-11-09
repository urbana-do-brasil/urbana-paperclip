// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { AgentSetupPrompt } from "../AgentSetupPrompt";
import { Dialog } from "../ui/dialog";
import {
  DotConnectionChecks,
  ExternalAgentInviteContent,
} from "./ExternalAgentInviteContent";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

beforeEach(async () => {
  await i18n.changeLanguage("pt-BR");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  await i18n.changeLanguage("en");
});

describe("external agent invitation localization", () => {
  it("localizes invitation choices while preserving provider names", async () => {
    await act(async () => {
      root.render(
        <Dialog open>
          <ExternalAgentInviteContent
            preset={null}
            prompt=""
            companyName="Urbana"
            connection={{ phase: "waiting" }}
            onSelect={vi.fn()}
            onBack={vi.fn()}
            onClose={vi.fn()}
            onCopied={vi.fn()}
            onRetry={vi.fn()}
            onNewPrompt={vi.fn()}
          />
        </Dialog>,
      );
    });
    expect(host.textContent).toContain("Convidar um agente externo");
    expect(host.textContent).toContain("Adicione à organização Urbana um agente que você já usa.");
    expect(host.textContent).toContain("Dot");
    expect(host.textContent).toContain("Hermes");
    expect(host.textContent).toContain("Outro");
    expect(host.textContent).toContain("Seu Dot no ChatGPT");
  });

  it("localizes Dot connection evidence and status copy", async () => {
    await act(async () => {
      root.render(<DotConnectionChecks state={{ phase: "ready" }} />);
    });
    expect(host.querySelector('[aria-label="Verificações de conexão do Dot"]')).not.toBeNull();
    expect(host.textContent).toContain("Conectado ao Paperclip");
    expect(host.textContent).toContain("Evento de teste confirmado");
    expect(host.textContent).toContain("Seu Dot está pronto para receber tarefas.");
  });

  it("localizes prompt controls without changing the technical prompt payload", async () => {
    const prompt = "agent login --connection-id cn_123 --token value_456";
    await act(async () => {
      root.render(
        <AgentSetupPrompt
          prompt={prompt}
          label="Copiar mensagem de configuração"
          title="Conecte seu Dot"
          description="Envie esta mensagem completa ao seu Dot no ChatGPT."
          agent={{ name: "Dot", src: "/brands/adapters/openai-dot.svg" }}
        />,
      );
    });
    const trigger = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Copiar mensagem de configuração"]',
    );
    expect(trigger).not.toBeNull();
    await act(async () => trigger!.click());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(document.body.querySelector('button[aria-label="Fechar configuração do agente"]')).not.toBeNull();
    expect(document.body.querySelector('[aria-label="Mensagem de configuração"]')?.textContent).toContain(prompt);
    expect(document.body.textContent).toContain("Copiar mensagem");
  });
});
