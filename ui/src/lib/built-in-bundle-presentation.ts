import type { TFunction } from "i18next";

import type { BuiltInAgentDefinition } from "@/api/builtInAgents";

export interface BuiltInBundlePresentation {
  agentDisplayName?: string;
  skillDisplayName?: string;
  routineTitle?: string;
}

interface OwnedBundlePresentation {
  sourceAgentDisplayName: string;
  agentTranslationKey: string;
  skill: {
    skillKey: string;
    canonicalKey: string;
    sourceDisplayName: string;
    translationKey: string;
  };
  routine: {
    routineKey: string;
    sourceTitle: string;
    translationKey: string;
  };
}

/**
 * Host translations for managed resource metadata shipped with built-in agent
 * bundles. A registry key alone is not sufficient: match the stable skill and
 * routine identities and their source text before translating. If a resource
 * was customized or a new bundle is added, its original metadata passes
 * through unchanged until this table is deliberately updated.
 */
const OWN_BUNDLE_PRESENTATION: Record<string, OwnedBundlePresentation> = {
  "reflection-coach": {
    sourceAgentDisplayName: "Reflection Coach",
    agentTranslationKey: "reflectionCoachAgent",
    skill: {
      skillKey: "reflection-coach",
      canonicalKey: "paperclipai/bundled/paperclip-operations/reflection-coach",
      sourceDisplayName: "Reflection Coach",
      translationKey: "reflectionCoachSkill",
    },
    routine: {
      routineKey: "recent-agent-reflection",
      sourceTitle: "Review recent agent trajectories for coaching proposals",
      translationKey: "reflectionCoachRoutine",
    },
  },
  summarizer: {
    sourceAgentDisplayName: "Summarizer",
    agentTranslationKey: "summarizerAgent",
    skill: {
      skillKey: "summarize-status",
      canonicalKey: "paperclipai/bundled/paperclip-operations/summarize-status",
      sourceDisplayName: "Summarize status",
      translationKey: "summarizerSkill",
    },
    routine: {
      routineKey: "refresh-stale-summaries",
      sourceTitle: "Refresh stale summary slots",
      translationKey: "summarizerRoutine",
    },
  },
};

function translate(t: TFunction, key: string, defaultValue: string): string {
  return t(key as never, { defaultValue });
}

export function localizeBuiltInBundlePresentation(
  definition: BuiltInAgentDefinition,
  t: TFunction,
): BuiltInBundlePresentation {
  const owned = OWN_BUNDLE_PRESENTATION[definition.key];
  const bundle = definition.bundle;
  if (!owned || !bundle) return {};

  const presentation: BuiltInBundlePresentation = {};
  if (definition.displayName === owned.sourceAgentDisplayName) {
    presentation.agentDisplayName = translate(
      t,
      `builtInBundle.resources.${owned.agentTranslationKey}`,
      definition.displayName,
    );
  }
  if (
    bundle.skill.skillKey === owned.skill.skillKey
    && bundle.skill.canonicalKey === owned.skill.canonicalKey
    && bundle.skill.displayName === owned.skill.sourceDisplayName
  ) {
    presentation.skillDisplayName = translate(
      t,
      `builtInBundle.resources.${owned.skill.translationKey}`,
      bundle.skill.displayName,
    );
  }
  if (
    bundle.routine.routineKey === owned.routine.routineKey
    && bundle.routine.title === owned.routine.sourceTitle
  ) {
    presentation.routineTitle = translate(
      t,
      `builtInBundle.resources.${owned.routine.translationKey}`,
      bundle.routine.title,
    );
  }
  return presentation;
}
