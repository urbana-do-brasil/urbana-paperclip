import { useId } from "react";
import { LOCALE_LABELS, SUPPORTED_LOCALES, isSupportedLocale } from "@paperclipai/shared/localization";
import { useLocale } from "../context/LocaleContext";
import { useTranslation } from "../i18n";
import { NativeSelect } from "./ui/select";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

export function LanguageSelector() {
  const context = useLocale();
  const { t } = useTranslation();
  const id = useId();
  if (!context) return null;
  return <div className="space-y-2">
    <Label htmlFor={id}>{t("locale.label")}</Label>
    <NativeSelect id={id} value={context.locale} disabled={!context.ready || context.saving} aria-describedby={`${id}-status`} onChange={(event) => {
      if (isSupportedLocale(event.target.value)) void context.save(event.target.value);
    }}>
      {SUPPORTED_LOCALES.map((locale) => <option key={locale} value={locale} lang={locale}>{LOCALE_LABELS[locale]}</option>)}
    </NativeSelect>
    <p id={`${id}-status`} className="text-xs text-muted-foreground" role={context.readError || context.saveError ? "alert" : "status"}>
      {context.saveError ? t("locale.saveError") : context.readError ? t("locale.readError") : context.saving ? t("locale.saving") : context.loading ? t("locale.loading") : t("locale.description")}
    </p>
    {context.readError ? <Button type="button" variant="outline" onClick={context.retry} disabled={context.saving}>{t("locale.retry")}</Button> : null}
  </div>;
}
