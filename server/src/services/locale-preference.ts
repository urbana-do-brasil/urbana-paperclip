import { eq, ne } from "drizzle-orm";
import { authUsers, userLocalePreferenceEvents, userLocalePreferences, type Db } from "@paperclipai/db";
import { DEFAULT_USER_LOCALE, type SupportedLocale } from "@paperclipai/shared/localization";
import type { LocalePreference } from "@paperclipai/shared/locale-preference";
import { HttpError } from "../errors.js";

export function localePreferenceService(db: Db) {
  return {
    async get(userId: string): Promise<LocalePreference> {
      const user = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.id, userId));
      if (!user.length) throw new HttpError(401, "Signed-in user not found", undefined, { key: "locale_user_not_found" });
      const [row] = await db.select({ locale: userLocalePreferences.locale }).from(userLocalePreferences)
        .where(eq(userLocalePreferences.userId, userId));
      return row ? { locale: row.locale, source: "user" } : { locale: DEFAULT_USER_LOCALE, source: "default" };
    },
    async save(userId: string, locale: SupportedLocale): Promise<LocalePreference> {
      return db.transaction(async (tx) => {
        // Serialize saves per real account, including its very first preference.
        // This also handles a concurrently deleted account before the FK write.
        const user = await tx.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.id, userId)).for("update");
        if (!user.length) throw new HttpError(401, "Signed-in user not found", undefined, { key: "locale_user_not_found" });
        const changed = await tx.insert(userLocalePreferences).values({ userId, locale })
          .onConflictDoUpdate({ target: userLocalePreferences.userId, set: { locale, updatedAt: new Date() }, setWhere: ne(userLocalePreferences.locale, locale) })
          .returning({ userId: userLocalePreferences.userId });
        if (changed.length) await tx.insert(userLocalePreferenceEvents).values({ userId, locale });
        return { locale, source: "user" };
      });
    },
  };
}
