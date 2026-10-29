import type { AttentionSourceKind } from "@paperclipai/shared";
import type { TFunction } from "i18next";
import { sourceMeta, type AttentionGroup } from "./attention";

export function attentionSourceLabel(kind: AttentionSourceKind, t: TFunction): string {
  return t(`attentionQueue.sourceKinds.${kind}`, { defaultValue: sourceMeta(kind).label });
}

/** Translate only known, app-owned group labels; project names stay as data. */
export function localizeAttentionGroupLabel(group: AttentionGroup, t: TFunction): string | null {
  if (!group.label) return null;
  if (group.key.startsWith("desk:")) {
    return localizeDeskShelfLabel(group, t);
  }
  if (group.key.startsWith("date:")) {
    const bucket = group.key.slice("date:".length);
    return t(`attentionQueue.groups.${bucket}`, { defaultValue: group.label });
  }
  if (group.key.startsWith("severity:")) {
    const severity = group.key.slice("severity:".length);
    return t(`attentionQueue.severity.${severity}`, { defaultValue: group.label });
  }
  if (group.key.startsWith("type:")) {
    const kind = group.key.slice("type:".length) as AttentionSourceKind;
    return attentionSourceLabel(kind, t);
  }
  if (group.key === "project:__none__") {
    return t("attentionQueue.groups.noProject", { defaultValue: group.label });
  }
  return group.label;
}

export function localizeDeskShelfLabel(shelf: Pick<AttentionGroup, "key" | "label">, t: TFunction): string {
  if (!shelf.label) return "";
  const shelfKey = shelf.key.replace("desk:", "").replaceAll("-", "");
  const keyByShelf: Record<string, string> = {
    decidenow: "decideNow",
    newtoday: "newToday",
    earlier: "earlier",
  };
  const key = keyByShelf[shelfKey];
  return key
    ? t(`attentionQueue.deskShelves.${key}`, { defaultValue: shelf.label })
    : shelf.label;
}
