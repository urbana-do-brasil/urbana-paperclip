import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestHandler } from "express";
import { isSupportedLocale, type SupportedLocale } from "@paperclipai/shared/localization";
import { badRequest } from "../errors.js";

const requestLocales = new AsyncLocalStorage<{ actorId: string; localLocale: SupportedLocale | null; explicitLocale: SupportedLocale | null }>();

/** Browser-local presentation state is used only in local_trusted mode. It is
 * neither an identity nor authorization, and request context cannot override
 * a real account's persisted preference. No prompt/content is logged. */
export const captureLocalCommunicationLocale: RequestHandler = (req, _res, next) => {
  if (req.actor.type !== "board" || !req.actor.userId) { next(); return; }
  const explicit = req.get("X-Paperclip-Communication-Locale-Override");
  const local = req.actor.source === "local_implicit" ? req.get("X-Paperclip-Communication-Locale") : undefined;
  if (explicit !== undefined && !isSupportedLocale(explicit)) throw badRequest("Unsupported communication locale");
  if (local !== undefined && !isSupportedLocale(local)) throw badRequest("Unsupported communication locale");
  if (!explicit && !local) { next(); return; }
  requestLocales.run({ actorId: req.actor.userId, localLocale: isSupportedLocale(local) ? local : null,
    explicitLocale: isSupportedLocale(explicit) ? explicit : null }, next);
};

export function getLocalCommunicationLocale(actorId: string | null | undefined): SupportedLocale | null {
  const current = requestLocales.getStore();
  return actorId && current?.actorId === actorId ? current.localLocale : null;
}

export function getExplicitCommunicationLocale(actorId: string | null | undefined): SupportedLocale | null {
  const current = requestLocales.getStore();
  return actorId && current?.actorId === actorId ? current.explicitLocale : null;
}
