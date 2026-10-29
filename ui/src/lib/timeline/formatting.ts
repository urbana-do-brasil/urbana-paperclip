import { t } from "@/i18n";

/** Formats timeline durations using the active UI locale; milliseconds stay unchanged. */
export function formatTimelineDuration(startMs: number, endMs: number): string {
  const minutes = Math.max(0, Math.round((endMs - startMs) / 60_000));
  if (minutes >= 1_440) {
    return t("workTimeline.duration.daysHours", {
      days: Math.floor(minutes / 1_440),
      hours: Math.floor((minutes % 1_440) / 60),
    });
  }
  if (minutes >= 60) {
    return t("workTimeline.duration.hoursMinutes", {
      hours: Math.floor(minutes / 60),
      minutes: minutes % 60,
    });
  }
  return t("workTimeline.duration.minutes", { count: minutes });
}
