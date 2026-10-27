import { z } from "zod";
import { SUPPORTED_LOCALES } from "./localization.js";

export const updateLocalePreferenceSchema = z.object({ locale: z.enum(SUPPORTED_LOCALES) }).strict();
export const localePreferenceSchema = updateLocalePreferenceSchema.extend({ source: z.enum(["user", "default"]) });
export type LocalePreference = z.infer<typeof localePreferenceSchema>;
