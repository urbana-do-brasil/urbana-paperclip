import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { authUsers } from "./auth.js";

// Personal, instance-wide presentation state. Organization membership is not
// required; local/signed-out browser preferences never write these tables.
export const userLocalePreferences = pgTable("user_locale_preferences", {
  userId: text("user_id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  locale: text("locale").$type<SupportedLocale>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("user_locale_preferences_locale_check", sql`${table.locale} in ('pt-BR', 'en')`)]);

// Private audit, committed atomically with an actual preference change. Never
// published to an organization's activity feed or the plugin event bus.
export const userLocalePreferenceEvents = pgTable("user_locale_preference_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  locale: text("locale").$type<SupportedLocale>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("user_locale_preference_events_locale_check", sql`${table.locale} in ('pt-BR', 'en')`),
  index("user_locale_preference_events_user_created_idx").on(table.userId, table.createdAt),
]);
