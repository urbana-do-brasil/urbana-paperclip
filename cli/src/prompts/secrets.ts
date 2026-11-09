import * as p from "@clack/prompts";
import type { SecretProvider } from "@paperclipai/shared";
import type { SecretsConfig } from "../config/schema.js";
import { resolveDefaultSecretsKeyFilePath, resolvePaperclipInstanceId } from "../config/home.js";
import { setupMessage } from "../localization/setup.js";

function defaultKeyFilePath(): string {
  return resolveDefaultSecretsKeyFilePath(resolvePaperclipInstanceId());
}

export function defaultSecretsConfig(): SecretsConfig {
  const keyFilePath = defaultKeyFilePath();
  return {
    provider: "local_encrypted",
    strictMode: false,
    localEncrypted: {
      keyFilePath,
    },
  };
}

export async function promptSecrets(current?: SecretsConfig): Promise<SecretsConfig> {
  const base = current ?? defaultSecretsConfig();

  const provider = await p.select({
    message: setupMessage("secretsProviderMessage"),
    options: [
      {
        value: "local_encrypted" as const,
        label: setupMessage("secretsLocalOption"),
        hint: setupMessage("secretsLocalHint"),
      },
      {
        value: "aws_secrets_manager" as const,
        label: "AWS Secrets Manager",
        hint: setupMessage("secretsAwsHint"),
      },
      {
        value: "gcp_secret_manager" as const,
        label: "GCP Secret Manager",
        hint: setupMessage("secretsGcpHint"),
      },
      {
        value: "vault" as const,
        label: "HashiCorp Vault",
        hint: setupMessage("secretsVaultHint"),
      },
    ],
    initialValue: base.provider,
  });

  if (p.isCancel(provider)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  const strictMode = await p.confirm({
    message: setupMessage("secretsStrictMessage"),
    initialValue: base.strictMode,
  });

  if (p.isCancel(strictMode)) {
    p.cancel(setupMessage("setupCancelled"));
    process.exit(0);
  }

  const fallbackDefault = defaultKeyFilePath();
  let keyFilePath = base.localEncrypted.keyFilePath || fallbackDefault;
  if (provider === "local_encrypted") {
    const keyPath = await p.text({
      message: setupMessage("secretsKeyFileMessage"),
      defaultValue: keyFilePath,
      placeholder: fallbackDefault,
      validate: (value) => {
        // Clack validates the raw input before applying defaultValue —
        // validate the value that will actually be submitted.
        if ((value || keyFilePath).trim().length === 0) return setupMessage("secretsKeyFileRequired");
      },
    });

    if (p.isCancel(keyPath)) {
      p.cancel(setupMessage("setupCancelled"));
      process.exit(0);
    }
    keyFilePath = keyPath.trim();
  }

  if (provider !== "local_encrypted") {
    p.note(
      provider === "aws_secrets_manager"
        ? setupMessage("secretsAwsWarning")
        : setupMessage("secretsProviderWarning", { provider }),
      setupMessage("secretsAwsWarningTitle"),
    );
  }

  return {
    provider: provider as SecretProvider,
    strictMode,
    localEncrypted: {
      keyFilePath,
    },
  };
}
