import { auditSectionHref, type AuditSection } from "./audit/audit-navigation";

export type AgentDetailView =
  | "overview"
  | "instructions"
  | "skills"
  | "runtime"
  | "secrets"
  | "tools"
  | "channels"
  | "permissions"
  | "api-keys"
  | "revisions"
  | "run-detail";

export type AgentLocalDetailView = Exclude<AgentDetailView, "run-detail">;

export const AGENT_DETAIL_NAVIGATION: ReadonlyArray<{
  label: string;
  translationKey: string;
  items: ReadonlyArray<{ value: AgentLocalDetailView; label: string; translationKey: string }>;
}> = [
  {
    label: "Agent",
    translationKey: "agentDetailNavigation.sections.agent",
    items: [
      { value: "overview", label: "Overview", translationKey: "agentDetailNavigation.items.overview" },
      { value: "instructions", label: "Instructions", translationKey: "agentDetailNavigation.items.instructions" },
      { value: "skills", label: "Skills", translationKey: "agentDetailNavigation.items.skills" },
    ],
  },
  {
    label: "Runtime",
    translationKey: "agentDetailNavigation.sections.runtime",
    items: [
      { value: "runtime", label: "Harness / Runtime", translationKey: "agentDetailNavigation.items.runtime" },
      { value: "secrets", label: "Secrets", translationKey: "agentDetailNavigation.items.secrets" },
      { value: "tools", label: "Tools", translationKey: "agentDetailNavigation.items.tools" },
      { value: "channels", label: "Channels", translationKey: "agentDetailNavigation.items.channels" },
    ],
  },
  {
    label: "Governance",
    translationKey: "agentDetailNavigation.sections.governance",
    items: [
      { value: "permissions", label: "Permissions / Trust", translationKey: "agentDetailNavigation.items.permissions" },
      { value: "api-keys", label: "API Keys", translationKey: "agentDetailNavigation.items.apiKeys" },
      { value: "revisions", label: "Revisions", translationKey: "agentDetailNavigation.items.revisions" },
    ],
  },
] as const;

export function parseAgentDetailView(value: string | null): AgentLocalDetailView {
  if (value === "instructions" || value === "prompts") return "instructions";
  if (value === "skills") return "skills";
  if (value === "runtime" || value === "configure" || value === "configuration") return "runtime";
  if (value === "secrets") return "secrets";
  if (value === "tools") return "tools";
  if (value === "channels") return "channels";
  if (value === "permissions" || value === "trust") return "permissions";
  if (value === "api-keys" || value === "keys") return "api-keys";
  if (value === "revisions" || value === "history") return "revisions";
  return "overview";
}

export function agentDetailHref(agentRef: string, view: AgentLocalDetailView = "overview") {
  return `/agents/${agentRef}/${view}`;
}

export function agentLegacyAuditSection(value: string | null): AuditSection | null {
  if (value === "runs") return "runs";
  if (value === "audit" || value === "activity") return "activity";
  if (value === "cost" || value === "costs") return "costs";
  if (value === "budget" || value === "budgets") return "budgets";
  return null;
}

export function agentScopedAuditHref(agentId: string, section: AuditSection) {
  return auditSectionHref(section, {
    mode: section === "activity" ? "agents" : undefined,
    agentId,
  });
}
