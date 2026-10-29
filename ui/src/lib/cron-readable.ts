/**
 * Tiny best-effort cron → plain-English helper for the routine Triggers section.
 * Not a full cron parser: it covers the common shapes Paperclip schedule triggers
 * produce (every N minutes/hours, daily at HH:MM, weekday/weekend, day-of-week).
 * Falls back to the raw expression when it can't confidently describe it.
 */

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function describeTime(minute: string, hour: string): string | null {
  const m = Number(minute);
  const h = Number(hour);
  if (!Number.isInteger(m) || !Number.isInteger(h)) return null;
  if (m < 0 || m > 59 || h < 0 || h > 23) return null;
  return `${pad2(h)}:${pad2(m)}`;
}

function describeDayOfWeek(dow: string): string | null {
  if (dow === "*" || dow === "?") return "every day";
  if (dow === "1-5") return "every weekday";
  if (dow === "0,6" || dow === "6,0" || dow === "0,7") return "every weekend";
  const parts = dow.split(",").map((part) => part.trim());
  const names = parts.map((part) => {
    const n = Number(part);
    if (!Number.isInteger(n)) return null;
    return DOW_NAMES[n % 7];
  });
  if (names.some((name) => name === null)) return null;
  if (names.length === 1) return `every ${names[0]}`;
  return `every ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function describeCron(expression: string | null | undefined): string | null {
  if (!expression) return null;
  const trimmed = expression.trim();
  const fields = trimmed.split(/\s+/);
  // Standard 5-field cron: minute hour day-of-month month day-of-week
  if (fields.length !== 5) return null;
  const [minute, hour, dom, month, dow] = fields;

  // Every N minutes
  const everyMinutes = minute.match(/^\*\/(\d+)$/);
  if (everyMinutes && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return `Every ${everyMinutes[1]} minutes`;
  }

  // Every N hours, on the minute
  const everyHours = hour.match(/^\*\/(\d+)$/);
  if (everyHours && /^\d+$/.test(minute) && dom === "*" && month === "*" && dow === "*") {
    return `Every ${everyHours[1]} hours at :${pad2(Number(minute))}`;
  }

  // Hourly
  if (/^\d+$/.test(minute) && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return `Every hour at :${pad2(Number(minute))}`;
  }

  // Daily / weekly at a fixed time
  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && month === "*") {
    const time = describeTime(minute, hour);
    if (!time) return null;
    if (dom === "*" && (dow === "*" || dow === "?")) {
      return `Every day at ${time}`;
    }
    if (dom === "*") {
      const dowText = describeDayOfWeek(dow);
      if (dowText) return `${dowText[0].toUpperCase()}${dowText.slice(1)} at ${time}`;
    }
    if (/^\d+$/.test(dom) && (dow === "*" || dow === "?")) {
      return `Day ${dom} of every month at ${time}`;
    }
  }

  return null;
}

export type CronTranslator = (
  key: string,
  options?: Record<string, string | number>,
) => string;

/** Localized version for UI surfaces; omitting the translator preserves the
 * original English helper contract for callers and tests that need a fallback. */
export function describeCronLocalized(
  expression: string | null | undefined,
  translate: CronTranslator,
  locale: string,
): string | null {
  if (!expression) return null;
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const [minute, hour, dom, month, dow] = fields;

  const everyMinutes = minute.match(/^\*\/(\d+)$/);
  if (everyMinutes && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return translate("routines.detail.triggers.cron.everyMinutes", { count: Number(everyMinutes[1]) });
  }

  const everyHours = hour.match(/^\*\/(\d+)$/);
  if (everyHours && /^\d+$/.test(minute) && dom === "*" && month === "*" && dow === "*") {
    return translate("routines.detail.triggers.cron.everyHoursAtMinute", {
      count: Number(everyHours[1]),
      minute: pad2(Number(minute)),
    });
  }

  if (/^\d+$/.test(minute) && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return translate("routines.detail.triggers.cron.everyHourAtMinute", { minute: pad2(Number(minute)) });
  }

  if (/^\d+$/.test(minute) && /^\d+$/.test(hour) && month === "*") {
    const time = describeTime(minute, hour);
    if (!time) return null;
    if (dom === "*" && (dow === "*" || dow === "?")) {
      return translate("routines.detail.triggers.cron.everyDayAt", { time });
    }
    if (dom === "*") {
      if (dow === "1-5") return translate("routines.detail.triggers.cron.weekdaysAt", { time });
      if (["0,6", "6,0", "0,7"].includes(dow)) {
        return translate("routines.detail.triggers.cron.weekendsAt", { time });
      }
      const dayValues = dow.split(",").map((part) => part.trim());
      const dayNames = dayValues.map((part) => {
        const numeric = Number(part);
        if (!Number.isInteger(numeric)) return null;
        const index = numeric % 7;
        return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" })
          .format(new Date(Date.UTC(2020, 0, 5 + index)));
      });
      if (dayNames.some((name) => name === null)) return null;
      if (dayNames.length === 1) {
        return translate("routines.detail.triggers.cron.weekdayAt", { day: dayNames[0]!, time });
      }
      const days = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(dayNames as string[]);
      return translate("routines.detail.triggers.cron.selectedWeekdaysAt", { days, time });
    }
    if (/^\d+$/.test(dom) && (dow === "*" || dow === "?")) {
      return translate("routines.detail.triggers.cron.dayOfMonthAt", { day: Number(dom), time });
    }
  }

  return null;
}
