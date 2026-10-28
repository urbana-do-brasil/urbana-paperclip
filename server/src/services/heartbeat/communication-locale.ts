import { and, eq } from "drizzle-orm";
import { heartbeatRuns, userLocalePreferences, type Db } from "@paperclipai/db";
import { isUuidLike } from "@paperclipai/shared";
import { DEFAULT_USER_LOCALE, isSupportedLocale, type SupportedLocale } from "@paperclipai/shared/localization";
import { badRequest } from "../../errors.js";

export type CommunicationLocaleSource = "explicit" | "user" | "origin" | "default";
export type CommunicationLocaleSnapshot = {
  communicationLocale: SupportedLocale;
  communicationLocaleSource: CommunicationLocaleSource;
};

/** Accept only a complete, server-owned snapshot, never partial metadata. */
export function readCommunicationLocaleSnapshot(value: unknown): CommunicationLocaleSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const context = value as Record<string, unknown>;
  const locale = context.communicationLocale;
  const source = context.communicationLocaleSource;
  if (!isSupportedLocale(locale) || typeof source !== "string" || !["explicit", "user", "origin", "default"].includes(source)) return null;
  return { communicationLocale: locale, communicationLocaleSource: source as CommunicationLocaleSource };
}

/** Execution language is presentation metadata and never grants authority.
 * Callers pass a requester and origin only after existing authorization checks. */
export async function resolveCommunicationLocaleSnapshot(db: Db, input: {
  companyId: string;
  agentId: string;
  requesterType?: "user" | "agent" | "system" | null;
  requesterId?: string | null;
  explicitLocale?: unknown;
  localLocale?: SupportedLocale | null;
  originRunId?: string | null;
  retryRunId?: string | null;
  /** Only the exact server-owned deferred receipt can supply this snapshot. */
  deferredSnapshot?: unknown;
}): Promise<CommunicationLocaleSnapshot> {
  if (input.explicitLocale !== undefined && !isSupportedLocale(input.explicitLocale)) {
    throw badRequest("Unsupported communication locale");
  }
  const deferred = readCommunicationLocaleSnapshot(input.deferredSnapshot);
  if (deferred) return deferred;

  const loadRunSnapshot = async (runId: string, retry: boolean) => {
    if (!isUuidLike(runId)) return null;
    const [run] = await db.select({ contextSnapshot: heartbeatRuns.contextSnapshot }).from(heartbeatRuns).where(and(
      eq(heartbeatRuns.companyId, input.companyId), eq(heartbeatRuns.id, runId),
      retry ? eq(heartbeatRuns.agentId, input.agentId) : undefined,
    ));
    return run ? readCommunicationLocaleSnapshot(run.contextSnapshot) : null;
  };

  // An exact retry is the same interaction, even if the requester subsequently
  // changed their preference. Old runs without metadata use the default.
  if (input.retryRunId) {
    return await loadRunSnapshot(input.retryRunId, true)
      ?? { communicationLocale: DEFAULT_USER_LOCALE, communicationLocaleSource: "default" };
  }
  if (isSupportedLocale(input.explicitLocale)) {
    return { communicationLocale: input.explicitLocale, communicationLocaleSource: "explicit" };
  }
  if (input.requesterType === "user" && input.requesterId) {
    if (input.requesterId === "local-board" && input.localLocale) {
      return { communicationLocale: input.localLocale, communicationLocaleSource: "user" };
    }
    const [preference] = await db.select({ locale: userLocalePreferences.locale }).from(userLocalePreferences)
      .where(eq(userLocalePreferences.userId, input.requesterId));
    if (preference) return { communicationLocale: preference.locale, communicationLocaleSource: "user" };
    // An identified person's effective preference is the default when no row
    // exists. A new interaction must not inherit someone else's old language.
    return { communicationLocale: DEFAULT_USER_LOCALE, communicationLocaleSource: "default" };
  }
  if (input.originRunId) {
    const origin = await loadRunSnapshot(input.originRunId, false);
    if (origin) return { communicationLocale: origin.communicationLocale, communicationLocaleSource: "origin" };
  }
  return { communicationLocale: DEFAULT_USER_LOCALE, communicationLocaleSource: "default" };
}
