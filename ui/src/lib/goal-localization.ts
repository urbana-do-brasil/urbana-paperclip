import type { Goal } from "@paperclipai/shared";

const GOAL_STATUS_KEYS: Record<Goal["status"], string> = {
  planned: "goalManagement.status.planned",
  active: "goalManagement.status.active",
  achieved: "goalManagement.status.achieved",
  cancelled: "goalManagement.status.cancelled",
};

const GOAL_LEVEL_KEYS: Record<Goal["level"], string> = {
  company: "goalManagement.level.company",
  team: "goalManagement.level.team",
  agent: "goalManagement.level.agent",
  task: "goalManagement.level.task",
};

function fallbackLabel(value: string): string {
  const words = value.replace(/[_-]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function goalStatusLabel(status: string, translate: (key: string) => string): string {
  const key = GOAL_STATUS_KEYS[status as Goal["status"]];
  return key ? translate(key) : fallbackLabel(status);
}

export function goalLevelLabel(level: string, translate: (key: string) => string): string {
  const key = GOAL_LEVEL_KEYS[level as Goal["level"]];
  return key ? translate(key) : fallbackLabel(level);
}
