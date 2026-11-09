import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
import { buildDotSetupPrompt } from "../lib/dot-setup-prompt";
import { AgentSetupPrompt } from "./AgentSetupPrompt";
import { useTranslation } from "@/i18n";

interface Connection {
  enabled: boolean;
  resourceUrl: string | null;
  binding: { id: string; status: string; connected: boolean; subscriptionVerified: boolean; hasPendingChallenge: boolean;
    assignment?: { status: string; attentionRequired: boolean } | null } | null;
}

/** Pairing codes stay in component memory and expire; never save them in config. */
export function DotRunnerConnection({ companyId, agentId, bindingId, onBinding }: {
  companyId?: string; agentId?: string; bindingId?: string; onBinding: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [pairing, setPairing] = useState<{ pairingCode: string; expiresAt: string } | null>(null);
  const path = `/companies/${companyId}/agents/${agentId}/dot-binding`;
  const key = ["dot-binding", companyId, agentId];
  const state = useQuery({ queryKey: key, enabled: !!companyId && !!agentId,
    queryFn: () => api.get<Connection>(path),
    refetchInterval: query => query.state.data?.binding?.status === "pairing" ||
      (query.state.data?.binding?.connected && !query.state.data.binding.subscriptionVerified) ||
      query.state.data?.binding?.hasPendingChallenge || query.state.data?.binding?.assignment ? 5000 : false });
  const pair = useMutation({ mutationFn: () => api.post<{ bindingId: string; pairingCode: string; expiresAt: string }>(path, {}),
    onSuccess: result => { setPairing(result); onBinding(result.bindingId); void client.invalidateQueries({ queryKey: key }); } });
  const test = useMutation({ mutationFn: () => api.post(path + "/event-test", {}),
    onSuccess: () => { void client.invalidateQueries({ queryKey: key }); } });
  const revoke = useMutation({ mutationFn: () => api.delete(path),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData<Connection>(key, previous => previous ? { ...previous, binding: null } : previous);
      setPairing(null); onBinding("");
      await client.invalidateQueries({ queryKey: key });
    } });
  useEffect(() => {
    if (!pairing) return;
    const timer = window.setTimeout(() => setPairing(null), Math.max(0, Date.parse(pairing.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pairing]);
  const existingBindingId = state.data?.binding?.id;
  useEffect(() => {
    if (existingBindingId && existingBindingId !== bindingId && !revoke.isPending) onBinding(existingBindingId);
  }, [existingBindingId, bindingId, onBinding, revoke.isPending]);
  if (!agentId) return <p className="text-sm text-muted-foreground">{t("agentConfiguration.runner.dot.saveAgentToPair")}</p>;
  const error = state.error ?? pair.error ?? test.error ?? revoke.error;
  const b = state.data?.binding;
  const bindingStatusLabels: Record<string, string> = {
    pairing: t("agentConfiguration.runner.dot.bindingStatuses.pairing"),
    connected: t("agentConfiguration.runner.dot.bindingStatuses.connected"),
    ready: t("agentConfiguration.runner.dot.bindingStatuses.ready"),
    revoked: t("agentConfiguration.runner.dot.bindingStatuses.revoked"),
  };
  const bindingStatus = b ? bindingStatusLabels[b.status] ?? b.status : "";
  const setupPrompt = pairing && state.data?.resourceUrl && companyId && agentId
    ? buildDotSetupPrompt({ companyId, agentId, resourceUrl: state.data.resourceUrl, ...pairing,
      pairingCodeLabel: t("agentConfiguration.runner.dot.pairingCodeLabel"),
      connectButtonLabel: t("agentConfiguration.runner.dot.connectWithPairingCode") })
    : "";
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{t("agentConfiguration.runner.dot.overview")}</p>
    {state.data && !state.data.enabled && <p className="text-sm text-muted-foreground">{t("agentConfiguration.runner.dot.enableConnectionSettings")}</p>}
    {state.data?.resourceUrl && <p className="text-sm break-all">{t("agentConfiguration.runner.dot.privatePluginMcpUrl")} <code>{state.data.resourceUrl}</code></p>}
    {b && <p className="text-sm">{t("agentConfiguration.runner.dot.connectionStatus", { status: bindingStatus })} {t("agentConfiguration.runner.dot.eventSubscriptionStatus", { status: t(b.subscriptionVerified ? "agentConfiguration.runner.dot.eventSubscriptionVerified" : "agentConfiguration.runner.dot.eventSubscriptionRequired") })}</p>}
    {b?.assignment && <p className="text-sm">{t("agentConfiguration.runner.dot.assignmentStatus", { status: t(b.assignment.status === "offered" ? "agentConfiguration.runner.dot.waitingForDotAcceptance" : "agentConfiguration.runner.dot.acceptedByDot") })}</p>}
    {b?.assignment?.attentionRequired && <p className="text-sm text-destructive" role="alert">{t("agentConfiguration.runner.dot.attentionRequired")}</p>}
    {pairing && setupPrompt && b?.status === "pairing" && <div className="space-y-2">
      <AgentSetupPrompt
        prompt={setupPrompt}
        label={t("agentConfiguration.runner.dot.setUpWithDot")}
        agent={{ name: "Dot", src: "/brands/adapters/openai-dot.svg" }}
        title={t("agentConfiguration.runner.dot.connectTitle")}
        description={t("agentConfiguration.runner.dot.connectDescription")}
        side="bottom"
      />
      <p className="text-xs text-muted-foreground">{t("agentConfiguration.runner.dot.setupPromptExpires", { time: new Date(pairing.expiresAt).toLocaleTimeString(i18n.resolvedLanguage) })}</p>
    </div>}
    {!pairing && b?.status === "pairing" && <p className="text-sm text-muted-foreground">{t("agentConfiguration.runner.dot.revokePendingAndPairAgain")}</p>}
    <div className="flex flex-wrap items-center gap-2">
      {!b && <Button type="button" variant="outline" disabled={!state.data?.enabled || !state.data?.resourceUrl || pair.isPending} onClick={() => pair.mutate()}>{t("agentConfiguration.runner.dot.pairDot")}</Button>}
      {b?.subscriptionVerified && <Button type="button" variant="outline" disabled={test.isPending || b.hasPendingChallenge} onClick={() => test.mutate()}>{t("agentConfiguration.runner.dot.testEventDelivery")}</Button>}
      <Button type="button" variant="outline" onClick={() => { void state.refetch(); }}>{t("agentConfiguration.runner.dot.refreshConnection")}</Button>
      {b && <Button type="button" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate()}>{t("agentConfiguration.runner.dot.revokeConnection")}</Button>}
    </div>
    {b?.hasPendingChallenge && <p className="text-sm text-muted-foreground">{t("agentConfiguration.runner.dot.waitingForMailboxChallenge")}</p>}
    {error && <p className="text-sm text-destructive" role="alert">{error instanceof Error ? error.message : t("agentConfiguration.runner.dot.connectionFailed")}</p>}
  </div>;
}
