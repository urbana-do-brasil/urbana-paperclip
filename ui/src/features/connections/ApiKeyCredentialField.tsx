import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";

/** Providers supply only credentials the current user is authorized to use.
 * Values are opaque connection references, never secret values. */
export function ApiKeyCredentialField({ options, connectionId, onConnectionChange, value, onChange,
  disabled, loading, error, providerName, keysUrl, label = "API key" }: {
  options: { id: string; label: string; disabled?: boolean }[];
  connectionId: string | null;
  onConnectionChange(id: string): void;
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  providerName: string;
  keysUrl: string;
  label?: string;
}) {
  const { t } = useTranslation();
  const id = useId();
  const choices = connectionId && !options.some(option => option.id === connectionId)
    ? [{ id: connectionId, label: loading
      ? t("apps.chatEndpointSetup.agentmail.credentialField.checkingSavedKey")
      : t("apps.chatEndpointSetup.agentmail.credentialField.unavailableSavedKey"), disabled: true }, ...options] : options;
  return <div className="space-y-2">
    <Label htmlFor={id}>{label === "API key" ? t("apps.chatEndpointSetup.agentmail.credentialField.apiKey") : label}</Label>
    {choices.length > 0 && <select id={id} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={connectionId ?? ""} disabled={disabled} onChange={event => onConnectionChange(event.target.value)}>
      {choices.map(option => <option key={option.id} value={option.id} disabled={option.disabled}>{option.label}</option>)}
      <option value="">{t("apps.chatEndpointSetup.agentmail.credentialField.enterNewApiKey")}</option>
    </select>}
    {!connectionId && <Input id={choices.length ? `${id}-new` : id}
      type="password" autoComplete="off" value={value} disabled={disabled}
      aria-label={choices.length ? t("apps.chatEndpointSetup.agentmail.credentialField.newApiKey") : undefined}
      onChange={event => { onConnectionChange(""); onChange(event.target.value); }} placeholder={t("apps.chatEndpointSetup.agentmail.credentialField.pasteApiKey", { provider: providerName })} />}
    {loading && <p role="status" className="text-sm text-muted-foreground">{t("apps.chatEndpointSetup.agentmail.credentialField.checkingSavedKeys")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{t("apps.chatEndpointSetup.agentmail.credentialField.loadError")} {error}</p>}
    <a href={keysUrl} target="_blank" rel="noreferrer" className="text-sm underline">{t("apps.chatEndpointSetup.agentmail.credentialField.getApiKey", { provider: providerName })}</a>
  </div>;
}
