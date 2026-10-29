import type { TFunction } from "i18next";
import {
  AGENT_ROLE_LABELS,
  type Agent,
  type Environment,
  type EnvironmentCapabilities,
} from "@paperclipai/shared";
import { isPlatformManagedEnvironment } from "./managed-sandbox-environment";

export interface AgentEnvironmentDescriptor {
  label: string;
  detail: string;
  title: string;
}

function translated(t: TFunction, key: string, defaultValue: string): string {
  return t(key as never, { defaultValue });
}

export function agentRoleLabel(role: string, t: TFunction): string {
  return translated(t, `agentDirectory.roles.${role}`, AGENT_ROLE_LABELS[role as keyof typeof AGENT_ROLE_LABELS] ?? role);
}

export function agentStatusLabel(status: string, t: TFunction): string {
  const label = status === "active" ? "idle" : status.replace(/_/g, " ");
  const key = status === "active" ? "idle" : status;
  return translated(t, `agentDirectory.status.${key}`, label);
}

export function localAgentEnvironment(t: TFunction): AgentEnvironmentDescriptor {
  const label = t("agentDirectory.environment.local");
  const detail = t("agentDirectory.environment.paperclipHost");
  return { label, detail, title: t("agentDirectory.environment.localTitle") };
}

export function loadingAgentEnvironment(t: TFunction): AgentEnvironmentDescriptor {
  const label = "—";
  const detail = t("agentDirectory.environment.loading");
  return { label, detail, title: detail };
}

function sandboxProviderLabel(
  environment: Environment,
  capabilities: EnvironmentCapabilities | null | undefined,
  t: TFunction,
): string {
  const provider = typeof environment.config.provider === "string"
    ? environment.config.provider.trim()
    : "";
  if (!provider) return t("agentDirectory.environment.sandbox");
  return capabilities?.sandboxProviders?.[provider]?.displayName ?? provider;
}

function formatEnvironmentDriver(driver: Environment["driver"], t: TFunction): string {
  if (driver === "ssh") return "SSH";
  if (driver === "sandbox") return t("agentDirectory.environment.sandbox");
  return driver.charAt(0).toUpperCase() + driver.slice(1);
}

export function resolveAgentEnvironment(
  agent: Agent,
  environmentsById: Map<string, Environment>,
  instanceDefaultEnvironmentId: string | null,
  capabilities: EnvironmentCapabilities | null | undefined,
  t: TFunction,
): AgentEnvironmentDescriptor {
  const environmentId = agent.defaultEnvironmentId ?? instanceDefaultEnvironmentId;
  if (!environmentId) return localAgentEnvironment(t);
  const environment = environmentsById.get(environmentId);
  if (!environment) {
    const label = t("agentDirectory.environment.unknown");
    return { label, detail: environmentId.slice(0, 8), title: `${label} - ${environmentId}` };
  }

  const detail = isPlatformManagedEnvironment(environment)
    ? t("agentDirectory.environment.managedByPaperclip")
    : environment.driver === "sandbox"
      ? t("agentDirectory.environment.sandboxProvider", {
          provider: sandboxProviderLabel(environment, capabilities, t),
        })
      : environment.driver === "local"
        ? t("agentDirectory.environment.paperclipHost")
        : formatEnvironmentDriver(environment.driver, t);

  return {
    label: environment.name,
    detail,
    title: `${environment.name} - ${detail}`,
  };
}
