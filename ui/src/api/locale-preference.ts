import { localePreferenceSchema, updateLocalePreferenceSchema } from "@paperclipai/shared/locale-preference";
import type { SupportedLocale } from "@paperclipai/shared/localization";
import { requestResponse } from "./client";

// No path-only GET coalescing: two identities must never share an in-flight
// preference request. The provider owns cancellation and identity-scoped state.
export const localePreferenceApi = {
  async get(signal?: AbortSignal) {
    const response = await requestResponse("/auth/locale-preference", { signal, cache: "no-store" });
    return localePreferenceSchema.parse(await response.json());
  },
  async save(locale: SupportedLocale, signal?: AbortSignal) {
    const response = await requestResponse("/auth/locale-preference", {
      method: "PUT", signal, cache: "no-store", body: JSON.stringify(updateLocalePreferenceSchema.parse({ locale })),
    });
    return localePreferenceSchema.parse(await response.json());
  },
};
