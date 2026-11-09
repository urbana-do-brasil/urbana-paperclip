import * as p from "@clack/prompts";
import { isLoopbackHost, type BindMode } from "@paperclipai/shared";
import type { AuthConfig, ServerConfig } from "../config/schema.js";
import { parseHostnameCsv } from "../config/hostnames.js";
import { buildCustomServerConfig, buildPresetServerConfig, inferConfiguredBind } from "../config/server-bind.js";
import { setupMessage } from "../localization/setup.js";

function localizeHostnameError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Hostname is required") return setupMessage("hostnameRequired");
  const invalidHostname = message.match(/^Invalid hostname: (.*)$/);
  if (invalidHostname) return setupMessage("hostnameInvalid", { hostname: invalidHostname[1] ?? "" });
  return message;
}

function cancelled(): never {
  p.cancel(setupMessage("setupCancelled"));
  process.exit(0);
}

export async function promptServer(opts?: {
  currentServer?: Partial<ServerConfig>;
  currentAuth?: Partial<AuthConfig>;
}): Promise<{ server: ServerConfig; auth: AuthConfig }> {
  const currentServer = opts?.currentServer;
  const currentAuth = opts?.currentAuth;
  const currentBind = inferConfiguredBind(currentServer);

  const bindSelection = await p.select({
    message: setupMessage("serverReachabilityMessage"),
    options: [
      {
        value: "loopback" as const,
        label: setupMessage("serverTrustedLocalLabel"),
        hint: setupMessage("serverTrustedLocalHint"),
      },
      {
        value: "lan" as const,
        label: setupMessage("serverPrivateNetworkLabel"),
        hint: setupMessage("serverPrivateNetworkHint"),
      },
      {
        value: "tailnet" as const,
        label: setupMessage("serverTailnetLabel"),
        hint: setupMessage("serverTailnetHint"),
      },
      {
        value: "custom" as const,
        label: setupMessage("serverCustomLabel"),
        hint: setupMessage("serverCustomHint"),
      },
    ],
    initialValue: currentBind,
  });

  if (p.isCancel(bindSelection)) cancelled();
  const bind = bindSelection as BindMode;

  const portDefault = String(currentServer?.port ?? 3100);
  const portStr = await p.text({
    message: setupMessage("serverPortMessage"),
    defaultValue: portDefault,
    placeholder: "3100",
    validate: (val) => {
      // Clack validates the raw input before applying defaultValue, so an
      // Enter press hands the validator an empty string. Validate the value
      // that will actually be submitted — the typed input, or the default.
      const n = Number(val || portDefault);
      if (isNaN(n) || n < 1 || n > 65535 || !Number.isInteger(n)) {
        return setupMessage("serverPortInvalid");
      }
    },
  });

  if (p.isCancel(portStr)) cancelled();
  const port = Number(portStr) || 3100;
  const serveUi = currentServer?.serveUi ?? true;

  if (bind === "loopback") {
    return buildPresetServerConfig("loopback", {
      port,
      allowedHostnames: [],
      serveUi,
    });
  }

  if (bind === "lan" || bind === "tailnet") {
    const allowedHostnamesInput = await p.text({
      message: setupMessage("serverAllowedHostsMessage"),
      defaultValue: (currentServer?.allowedHostnames ?? []).join(", "),
      placeholder:
        bind === "tailnet"
          ? "your-machine.tailnet.ts.net"
          : "dotta-macbook-pro, host.docker.internal",
      validate: (val) => {
        try {
          parseHostnameCsv(val ?? "");
          return;
        } catch (err) {
          return localizeHostnameError(err);
        }
      },
    });

    if (p.isCancel(allowedHostnamesInput)) cancelled();

    const preset = buildPresetServerConfig(bind, {
      port,
      allowedHostnames: parseHostnameCsv(allowedHostnamesInput),
      serveUi,
    });
    if (bind === "tailnet" && isLoopbackHost(preset.server.host)) {
      p.log.warn(setupMessage("serverTailnetWarning"));
    }
    return preset;
  }

  const deploymentModeSelection = await p.select({
    message: setupMessage("serverAuthModeMessage"),
    options: [
      {
        value: "local_trusted",
        label: setupMessage("serverLocalTrustedLabel"),
        hint: setupMessage("serverLocalTrustedHint"),
      },
      {
        value: "authenticated",
        label: setupMessage("serverAuthenticatedLabel"),
        hint: setupMessage("serverAuthenticatedHint"),
      },
    ],
    initialValue: currentServer?.deploymentMode ?? "authenticated",
  });

  if (p.isCancel(deploymentModeSelection)) cancelled();
  const deploymentMode = deploymentModeSelection as ServerConfig["deploymentMode"];

  let exposure: ServerConfig["exposure"] = "private";
  if (deploymentMode === "authenticated") {
    const exposureSelection = await p.select({
      message: setupMessage("serverExposureMessage"),
      options: [
        {
          value: "private",
          label: setupMessage("serverPrivateExposureLabel"),
          hint: setupMessage("serverPrivateExposureHint"),
        },
        {
          value: "public",
          label: setupMessage("serverPublicExposureLabel"),
          hint: setupMessage("serverPublicExposureHint"),
        },
      ],
      initialValue: currentServer?.exposure ?? "private",
    });
    if (p.isCancel(exposureSelection)) cancelled();
    exposure = exposureSelection as ServerConfig["exposure"];
  }

  const defaultHost =
    currentServer?.customBindHost ??
    currentServer?.host ??
    (deploymentMode === "local_trusted" ? "127.0.0.1" : "0.0.0.0");
  const host = await p.text({
    message: setupMessage("serverBindHostMessage"),
    defaultValue: defaultHost,
    placeholder: defaultHost,
    validate: (val) => {
      const candidate = (val || defaultHost).trim();
      if (!candidate) return setupMessage("serverHostRequired");
      if (deploymentMode === "local_trusted" && !isLoopbackHost(candidate)) {
        return setupMessage("serverLoopbackRequired");
      }
    },
  });

  if (p.isCancel(host)) cancelled();

  let allowedHostnames: string[] = [];
  if (deploymentMode === "authenticated" && exposure === "private") {
    const allowedHostnamesInput = await p.text({
      message: setupMessage("serverAllowedHostsMessage"),
      defaultValue: (currentServer?.allowedHostnames ?? []).join(", "),
      placeholder: "dotta-macbook-pro, your-host.tailnet.ts.net",
      validate: (val) => {
        try {
          parseHostnameCsv(val ?? "");
          return;
        } catch (err) {
          return localizeHostnameError(err);
        }
      },
    });

    if (p.isCancel(allowedHostnamesInput)) cancelled();
    allowedHostnames = parseHostnameCsv(allowedHostnamesInput);
  }

  let publicBaseUrl: string | undefined;
  if (deploymentMode === "authenticated" && exposure === "public") {
    const publicBaseUrlDefault = currentAuth?.publicBaseUrl ?? "";
    const urlInput = await p.text({
      message: setupMessage("serverPublicUrlMessage"),
      defaultValue: publicBaseUrlDefault,
      placeholder: "https://paperclip.example.com",
      validate: (val) => {
        const candidate = (val || publicBaseUrlDefault).trim();
        if (!candidate) return setupMessage("serverPublicUrlRequired");
        try {
          const url = new URL(candidate);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            return setupMessage("serverPublicUrlScheme");
          }
          return;
        } catch {
          return setupMessage("serverPublicUrlInvalid");
        }
      },
    });
    if (p.isCancel(urlInput)) cancelled();
    publicBaseUrl = urlInput.trim().replace(/\/+$/, "");
  }

  return buildCustomServerConfig({
    deploymentMode,
    exposure,
    host: host.trim(),
    port,
    allowedHostnames,
    serveUi,
    publicBaseUrl,
  });
}
