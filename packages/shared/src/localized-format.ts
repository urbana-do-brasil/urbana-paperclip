import { intlLocale, type SupportedLocale } from "./localization.js";

/** Presentation only. Callers retain the original amount, currency and instant. */
export function createLocaleFormatters(locale: SupportedLocale) {
  const language = intlLocale(locale);
  const number = (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(language, options).format(value);
  const date = (value: Date | string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(language, options).format(new Date(value));
  return {
    number,
    date,
    cents(value: number, currency = "USD", maximumFractionDigits = 2) {
      const options = { minimumFractionDigits: 2, maximumFractionDigits };
      // Preserve legacy, non-ISO codes instead of converting or dropping them.
      return /^[a-z]{3}$/i.test(currency)
        ? number(value / 100, { ...options, style: "currency", currency })
        : `${currency} ${number(value / 100, options)}`;
    },
    relative(value: number, unit: Intl.RelativeTimeFormatUnit) {
      return new Intl.RelativeTimeFormat(language, { numeric: "auto", style: "short" }).format(value, unit);
    },
    tokens(value: number) {
      return number(value, { notation: "compact", maximumFractionDigits: 1 });
    },
    duration(milliseconds: number) {
      if (!Number.isFinite(milliseconds) || milliseconds <= 0) milliseconds = 0;
      const seconds = Math.round(milliseconds / 1000);
      const parts: Array<[number, "day" | "hour" | "minute" | "second"]> = seconds < 60
        ? [[seconds, "second"]]
        : seconds < 3600
          ? [[Math.floor(seconds / 60), "minute"], [seconds % 60, "second"]]
          : seconds < 86400
            ? [[Math.floor(seconds / 3600), "hour"], [Math.floor(seconds / 60) % 60, "minute"]]
            : [[Math.floor(seconds / 86400), "day"], [Math.floor(seconds / 3600) % 24, "hour"]];
      return parts.filter(([value], index) => index === 0 || value !== 0)
        .map(([value, unit]) => number(value, { style: "unit", unit, unitDisplay: "short" })).join(" ");
    },
  };
}
