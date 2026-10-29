import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus2 } from "lucide-react";
import type { InviteJoinType, JoinRequestStatus, JoinRequestType } from "@paperclipai/shared";
import { accessApi } from "@/api/access";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { queryKeys } from "@/lib/queryKeys";

export function JoinRequestQueue() {
  const { t, i18n } = useTranslation();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"pending_approval" | "approved" | "rejected">("pending_approval");
  const [requestType, setRequestType] = useState<"all" | "human" | "agent">("all");

  useEffect(() => {
    setBreadcrumbs([
      { label: selectedCompany?.name ?? t("navigation.organization"), href: "/dashboard" },
      { label: t("navigation.inbox"), href: "/inbox" },
      { label: t("joinRequestQueue.breadcrumb") },
    ]);
  }, [selectedCompany?.name, setBreadcrumbs, t]);

  const requestsQuery = useQuery({
    queryKey: queryKeys.access.joinRequests(selectedCompanyId ?? "", `${status}:${requestType}`),
    queryFn: () =>
      accessApi.listJoinRequests(
        selectedCompanyId!,
        status,
        requestType === "all" ? undefined : requestType,
      ),
    enabled: !!selectedCompanyId,
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.approveJoinRequest(selectedCompanyId!, requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.joinRequests(selectedCompanyId!, `${status}:${requestType}`) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.companyMembers(selectedCompanyId!) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.companyUserDirectory(selectedCompanyId!) });
      pushToast({ title: t("joinRequestQueue.toasts.approved"), tone: "success" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.rejectJoinRequest(selectedCompanyId!, requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.joinRequests(selectedCompanyId!, `${status}:${requestType}`) });
      pushToast({ title: t("joinRequestQueue.toasts.rejected"), tone: "success" });
    },
  });

  if (!selectedCompanyId) {
    return <div className="text-sm text-muted-foreground">{t("joinRequestQueue.selectOrganization")}</div>;
  }

  if (requestsQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">{t("joinRequestQueue.loading")}</div>;
  }

  if (requestsQuery.error) {
    const message =
      requestsQuery.error instanceof ApiError && requestsQuery.error.status === 403
        ? t("joinRequestQueue.noPermission")
        : requestsQuery.error instanceof Error
          ? requestsQuery.error.message
          : t("joinRequestQueue.loadFailed");
    return <div className="text-sm text-destructive">{message}</div>;
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">{t("joinRequestQueue.title")}</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("joinRequestQueue.description")}
        </p>
      </div>

      <Card className="flex-row flex-wrap gap-3 p-4">
        <label className="space-y-2 text-sm">
          <span className="font-medium">{t("joinRequestQueue.status")}</span>
          <select
            className="rounded-md border border-border bg-background px-3 py-2"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "pending_approval" | "approved" | "rejected")
            }
          >
            <option value="pending_approval">{t("joinRequestQueue.statusOptions.pending")}</option>
            <option value="approved">{t("joinRequestQueue.statusOptions.approved")}</option>
            <option value="rejected">{t("joinRequestQueue.statusOptions.rejected")}</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">{t("joinRequestQueue.requestType")}</span>
          <select
            className="rounded-md border border-border bg-background px-3 py-2"
            value={requestType}
            onChange={(event) =>
              setRequestType(event.target.value as "all" | "human" | "agent")
            }
          >
            <option value="all">{t("joinRequestQueue.requestTypeOptions.all")}</option>
            <option value="human">{t("joinRequestQueue.requestTypeOptions.human")}</option>
            <option value="agent">{t("joinRequestQueue.requestTypeOptions.agent")}</option>
          </select>
        </label>
      </Card>

      <div className="space-y-4">
        {(requestsQuery.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
            {t("joinRequestQueue.empty")}
          </div>
        ) : (
          requestsQuery.data!.map((request) => (
            <Card key={request.id} className="block p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={request.status === "pending_approval" ? "secondary" : request.status === "approved" ? "outline" : "destructive"}>
                      {joinRequestStatusLabel(request.status, t)}
                    </Badge>
                    <Badge variant="outline">{joinRequestTypeLabel(request.requestType, t)}</Badge>
                    {request.adapterType ? <Badge variant="outline">{request.adapterType}</Badge> : null}
                  </div>
                  <div>
                    <div className="text-base font-medium">
                      {request.requestType === "human"
                        ? request.requesterUser?.name || request.requestEmailSnapshot || request.requestingUserId || t("joinRequestQueue.unknownRequester.human")
                        : request.agentName || t("joinRequestQueue.unknownRequester.agent")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {request.requestType === "human"
                        ? request.requesterUser?.email || request.requestEmailSnapshot || request.requestingUserId || t("joinRequestQueue.emailUnavailable")
                        : request.capabilities || request.requestIp}
                    </div>
                  </div>
                </div>

                {request.status === "pending_approval" ? (
                  <div className="flex gap-2">
                      <Button
                      variant="outline"
                      onClick={() => rejectMutation.mutate(request.id)}
                      disabled={rejectMutation.isPending}
                    >
                      {t("joinRequestQueue.reject")}
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate(request.id)}
                      disabled={approveMutation.isPending}
                    >
                      {t("joinRequestQueue.approve")}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <div className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="text-xs font-medium uppercase tracking-wide">{t("joinRequestQueue.inviteContext")}</div>
                  <div className="mt-2">
                    {request.invite
                      ? <>
                          {t("joinRequestQueue.inviteAllowedTypes", {
                            types: joinInviteTypesLabel(request.invite.allowedJoinTypes, t),
                          })}
                          {request.invite.humanRole && (
                            <> • {t("joinRequestQueue.defaultRole", { role: t(`invite.roles.${request.invite.humanRole}`, { defaultValue: request.invite.humanRole }) })}</>
                          )}
                        </>
                      : t("joinRequestQueue.inviteMetadataUnavailable")}
                  </div>
                  {request.invite?.inviteMessage ? (
                    <div className="mt-2 text-foreground">{request.invite.inviteMessage}</div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="text-xs font-medium uppercase tracking-wide">{t("joinRequestQueue.requestDetails")}</div>
                  <div className="mt-2">
                    {t("joinRequestQueue.submitted", { time: new Date(request.createdAt).toLocaleString(i18n.resolvedLanguage) })}
                  </div>
                  <div>{t("joinRequestQueue.sourceIp", { ip: request.requestIp })}</div>
                  {request.requestType === "agent" && request.capabilities ? <div>{request.capabilities}</div> : null}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function joinRequestStatusLabel(status: JoinRequestStatus, t: ReturnType<typeof useTranslation>["t"]): string {
  const key: Record<JoinRequestStatus, string> = {
    pending_approval: "pending",
    approved: "approved",
    rejected: "rejected",
  };
  return t(`joinRequestQueue.statusOptions.${key[status]}`, { defaultValue: status.replaceAll("_", " ") });
}

function joinRequestTypeLabel(type: JoinRequestType, t: ReturnType<typeof useTranslation>["t"]): string {
  return t(`joinRequestQueue.requestTypeOptions.${type}`, { defaultValue: type });
}

function joinInviteTypesLabel(type: InviteJoinType, t: ReturnType<typeof useTranslation>["t"]): string {
  return t(`joinRequestQueue.allowedJoinTypes.${type}`, { defaultValue: type });
}
