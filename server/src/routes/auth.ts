import { Router } from "express";
import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { authUsers } from "@paperclipai/db";
import {
  authSessionSchema,
  currentUserProfileSchema,
  updateCurrentUserProfileSchema,
} from "@paperclipai/shared";
import { HttpError, unauthorized } from "../errors.js";
import { updateLocalePreferenceSchema } from "@paperclipai/shared/locale-preference";
import { localePreferenceService } from "../services/locale-preference.js";
import { boardMutationGuard } from "../middleware/board-mutation-guard.js";
import { validate } from "../middleware/validate.js";
import { resolveSentryDsns } from "../sentry-dsn.js";

async function loadCurrentUserProfile(db: Db, userId: string) {
  const user = await db
    .select({
      id: authUsers.id,
      email: authUsers.email,
      name: authUsers.name,
      image: authUsers.image,
    })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .then((rows) => rows[0] ?? null);

  if (!user) {
    throw unauthorized("Signed-in user not found");
  }

  return currentUserProfileSchema.parse({
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    image: user.image ?? null,
  });
}

export function authRoutes(db: Db): Router {
  const router = Router();
  const localePreferences = localePreferenceService(db);

  router.use("/locale-preference", (req, res, next) => {
    if (req.actor.type === "none") throw new HttpError(401, "Board authentication required", undefined, { key: "locale_auth_required" });
    if (req.actor.type !== "board" || !req.actor.userId || req.actor.source === "local_implicit") {
      throw new HttpError(403, "Authenticated user context required", undefined, { key: "locale_user_required" });
    }
    if (Object.keys(req.query).length) throw new HttpError(400, "Locale preference does not accept query parameters", undefined, { key: "locale_invalid_query" });
    res.setHeader("Cache-Control", "private, no-store");
    next();
  }, boardMutationGuard());

  router.get("/locale-preference", async (req, res) => {
    res.json(await localePreferences.get(req.actor.userId!));
  });

  router.put("/locale-preference", validate(updateLocalePreferenceSchema), async (req, res) => {
    const { locale } = updateLocalePreferenceSchema.parse(req.body);
    res.json(await localePreferences.save(req.actor.userId!, locale));
  });

  router.get("/get-session", async (req, res) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      throw unauthorized("Board authentication required");
    }

    const user = await loadCurrentUserProfile(db, req.actor.userId);
    res.json(authSessionSchema.parse({
      session: {
        id: `paperclip:${req.actor.source ?? "none"}:${req.actor.userId}`,
        userId: req.actor.userId,
      },
      user,
      // The browser reads this value to open its own Sentry gate — see
      // `ui/src/lib/sentry.ts`. `req.actor.type` already gates this whole
      // handler, so no second authorization check runs here. This field
      // carries the front-end DSN only; it never carries the backend DSN.
      sentryDsn: resolveSentryDsns().frontend,
      // Match the server SDK's runtime environment, including in reused images.
      sentryEnvironment: process.env.SENTRY_ENVIRONMENT || null,
    }));
  });

  router.get("/profile", async (req, res) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      throw unauthorized("Board authentication required");
    }

    res.json(await loadCurrentUserProfile(db, req.actor.userId));
  });

  router.patch("/profile", validate(updateCurrentUserProfileSchema), async (req, res) => {
    if (req.actor.type !== "board" || !req.actor.userId) {
      throw unauthorized("Board authentication required");
    }

    const patch = updateCurrentUserProfileSchema.parse(req.body);
    const now = new Date();

    const updated = await db
      .update(authUsers)
      .set({
        name: patch.name,
        ...(patch.image !== undefined ? { image: patch.image } : {}),
        updatedAt: now,
      })
      .where(eq(authUsers.id, req.actor.userId))
      .returning({
        id: authUsers.id,
        email: authUsers.email,
        name: authUsers.name,
        image: authUsers.image,
      })
      .then((rows) => rows[0] ?? null);

    if (!updated) {
      throw unauthorized("Signed-in user not found");
    }

    res.json(currentUserProfileSchema.parse({
      id: updated.id,
      email: updated.email ?? null,
      name: updated.name ?? null,
      image: updated.image ?? null,
    }));
  });

  return router;
}
