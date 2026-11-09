import { getCliLocale, isCliJsonRequested } from "./index.js";
import type { SupportedLocale } from "@paperclipai/shared/localization";

export const skillOperationMessageCatalog = {
  en: {
    imported: "Imported {count} skill(s); warnings={warnings}",
    created: "Created skill {name} ({key})",
    scanned: "Scanned projects={projects} workspaces={workspaces} discovered={discovered} imported={imported} updated={updated} skipped={skipped} conflicts={conflicts} warnings={warnings}",
    useSkillOrAll: "Use either a skill reference or --all, not both.",
    emptyDesiredSkills: "At least one --skill value is required for skills agent sync.",
    catalogInstallNoResult: "Catalog install returned no result.",
    catalogInstallDone: "Catalog skill {action}: {name} ({key}) in company skill library.",
    catalogInstallHint: "This does not attach the skill to an agent. Use `paperclipai skills agent sync <agent> --skill <skill>` when you want an agent to use it.",
    resetPrompt: "Reset catalog skill \"{name}\" ({key}) to its pinned origin?",
    resetDone: "Reset skill {name} ({key}) to pinned origin.",
    removePrompt: "Remove company skill \"{name}\" ({key})?",
    removeDone: "Removed skill {name} ({key})",
    agentClearPrompt: "Clear desired company skills for \"{name}\" ({id})?",
    agentSyncDone: "Desired company skills updated with {mode} mode for {name} ({id}); runtime sync returned {count} skill(s).",
    agentClearDone: "Desired company skills cleared for {name} ({id}).",
    agentSnapshotMissing: "Agent {name} ({id}) returned no skill snapshot.",
    agentSnapshot: "Agent {name} ({id}) adapter={adapter} supported={supported} mode={mode} desiredCompanySkills={count}",
    skillReferenceRequired: "Skill reference is required.",
    skillReferenceRequiredUnlessAll: "Skill reference is required unless --all is used.",
    catalogReferenceRequired: "Catalog skill reference is required.",
    catalogSkillNotFound: "Catalog skill not found: {reference}",
    ambiguousSkill: "Ambiguous skill slug \"{reference}\". Use a skill ID or key instead.",
    skillNotFound: "Skill not found: {reference}",
    updateStatusMissing: "No update status returned for skill {key}.",
    auditResultMissing: "No audit result returned for skill {key}.",
    agentNotFound: "Agent not found: {reference}",
    confirmNeedsYes: "This command requires --yes when not running in an interactive terminal.",
    aborted: "Aborted.",
  },
  "pt-BR": {
    imported: "{count} skill(s) importadas; avisos={warnings}",
    created: "Skill {name} ({key}) criada",
    scanned: "Projetos verificados={projects} espaços de trabalho={workspaces} descobertas={discovered} importadas={imported} atualizadas={updated} ignoradas={skipped} conflitos={conflicts} avisos={warnings}",
    useSkillOrAll: "Use uma referência de skill ou --all, não os dois.",
    emptyDesiredSkills: "Informe ao menos um valor para --skill no comando skills agent sync.",
    catalogInstallNoResult: "A instalação do catálogo não retornou um resultado.",
    catalogInstallDone: "Skill do catálogo {action}: {name} ({key}) na biblioteca de skills da organização.",
    catalogInstallHint: "Isso não associa a skill a um agente. Use `paperclipai skills agent sync <agent> --skill <skill>` para disponibilizá-la a um agente.",
    resetPrompt: "Redefinir a skill de catálogo \"{name}\" ({key}) para a origem fixada?",
    resetDone: "Skill {name} ({key}) redefinida para a origem fixada.",
    removePrompt: "Remover a skill \"{name}\" ({key}) da organização?",
    removeDone: "Skill {name} ({key}) removida",
    agentClearPrompt: "Limpar as skills desejadas do agente \"{name}\" ({id})?",
    agentSyncDone: "Skills desejadas da organização atualizadas no modo {mode} para {name} ({id}); sincronização do runtime retornou {count} skill(s).",
    agentClearDone: "Skills desejadas da organização removidas de {name} ({id}).",
    agentSnapshotMissing: "O agente {name} ({id}) não retornou um snapshot de skills.",
    agentSnapshot: "Agente {name} ({id}) adapter={adapter} supported={supported} mode={mode} desiredCompanySkills={count}",
    skillReferenceRequired: "Informe a referência da skill.",
    skillReferenceRequiredUnlessAll: "Informe a referência da skill, a menos que use --all.",
    catalogReferenceRequired: "Informe a referência da skill do catálogo.",
    catalogSkillNotFound: "Skill do catálogo não encontrada: {reference}",
    ambiguousSkill: "O slug \"{reference}\" corresponde a mais de uma skill. Use o ID ou a chave da skill.",
    skillNotFound: "Skill não encontrada: {reference}",
    updateStatusMissing: "Nenhum status de atualização foi retornado para a skill {key}.",
    auditResultMissing: "Nenhum resultado de auditoria foi retornado para a skill {key}.",
    agentNotFound: "Agente não encontrado: {reference}",
    confirmNeedsYes: "Este comando exige --yes quando executado sem um terminal interativo.",
    aborted: "Operação cancelada.",
  },
} as const;

export type SkillOperationMessageId = keyof typeof skillOperationMessageCatalog.en;

export function skillOperationMessage(
  id: SkillOperationMessageId,
  values: Record<string, string | number | boolean> = {},
  locale: SupportedLocale = getCliLocale(),
): string {
  const template: string = skillOperationMessageCatalog[locale][id];
  return template.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_match, key: string) => String(values[key] ?? `{${key}}`));
}

/** Structured-mode failures keep the CLI's established English stderr text. */
export function skillOperationErrorMessage(
  id: SkillOperationMessageId,
  values: Record<string, string | number | boolean> = {},
): string {
  return skillOperationMessage(id, values, isCliJsonRequested() ? "en" : getCliLocale());
}
