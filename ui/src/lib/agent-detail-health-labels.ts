import type { TFunction } from "i18next";
import type { AgentOrgChainHealth } from "@paperclipai/shared";
import { agentStatusLabel } from "./agent-directory-labels";

function chainStatusLabel(status: string, t: TFunction): string {
  if (status === "missing") return t("agentDetailHeader.chainStatus.missing");
  if (status === "cycle") return t("agentDetailHeader.chainStatus.cycle");
  return agentStatusLabel(status, t);
}

export function formatOrgChainHealthPath(
  health: AgentOrgChainHealth | null | undefined,
  agentName: string,
  t: TFunction,
): string {
  return health?.fullChain
    .map((entry) => `${entry.name}${entry.status !== "active" && entry.status !== "idle" ? ` (${chainStatusLabel(entry.status, t)})` : ""}`)
    .join(" → ") ?? agentName;
}

export function pausedEscalationWarning(
  health: AgentOrgChainHealth | null | undefined,
  agentName: string,
  t: TFunction,
): string | null {
  const manager = health?.pausedAncestors?.[0];
  if (manager) return t("agentDetailHeader.pausedEscalation", { agentName, managerName: manager.name });
  return health?.escalationWarning ?? null;
}

export function orgChainRepairGuidance(
  health: AgentOrgChainHealth | null | undefined,
  agentName: string,
  t: TFunction,
): string {
  const ancestor = health?.firstInvalidAncestor;
  if (!ancestor) return health?.repairGuidance ?? t("agentDetailHeader.defaultRepairGuidance");
  const key = ancestor.status === "missing"
    ? "agentDetailHeader.repairMissingManager"
    : ancestor.status === "cycle"
      ? "agentDetailHeader.repairCycle"
      : "agentDetailHeader.repairTerminatedAncestor";
  return t(key, { agentName, ancestorName: ancestor.name, ancestorId: ancestor.id });
}
