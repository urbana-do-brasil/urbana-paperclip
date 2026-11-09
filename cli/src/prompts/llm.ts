import * as p from "@clack/prompts";
import type { LlmConfig } from "../config/schema.js";
import { setupMessage } from "../localization/setup.js";

export async function promptLlm(): Promise<LlmConfig | undefined> {
  const configureLlm = await p.confirm({
    message: setupMessage("llmConfigureMessage"),
    initialValue: false,
  });

  if (p.isCancel(configureLlm)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  if (!configureLlm) return undefined;

  const provider = await p.select({
    message: setupMessage("llmProviderMessage"),
    options: [
      { value: "claude" as const, label: "Claude (Anthropic)" },
      { value: "openai" as const, label: "OpenAI" },
    ],
  });

  if (p.isCancel(provider)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  const apiKey = await p.password({
    message: setupMessage("llmApiKeyMessage", { provider: provider === "claude" ? "Anthropic" : "OpenAI" }),
    validate: (val) => {
      if (!val) return setupMessage("llmApiKeyRequired");
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  return { provider, apiKey };
}
