import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import {
  chatEndpointsApi,
  type ChatEndpoint,
  type ChatEndpointSetupAction,
} from "@/api/chatEndpoints";
import { sanitizedSetupErrorMessage } from "./chat-setup-error";

export function PhotonConnectStep({
  endpoint,
  agentName,
  repairing,
  pending,
  onAction,
}: {
  endpoint: ChatEndpoint;
  agentName: string;
  repairing: boolean;
  pending: boolean;
  onAction(
    action: ChatEndpointSetupAction,
    values?: Record<string, string>,
  ): void;
}) {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState(endpoint.providerAccountId ?? "");
  const [projectSecret, setProjectSecret] = useState("");
  const [lineId, setLineId] = useState("");
  const inspection = useMutation({
    mutationFn: () =>
      chatEndpointsApi.inspectPhoton(endpoint.id, {
        projectId: projectId.trim(),
        projectSecret,
      }),
    onSuccess: (result) => {
      const eligible = result.lines.filter((line) => line.eligible);
      setLineId(eligible.length === 1 ? eligible[0].lineId : "");
    },
  });
  const resetInspection = () => {
    inspection.reset();
    setLineId("");
  };
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-xl font-bold">{t("apps.chatEndpointSetup.photon.heading")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("apps.chatEndpointSetup.photon.description", { agent: agentName })}
        </p>
        <p className="text-sm">
          <a
            className="underline"
            href="https://app.photon.codes/"
            target="_blank"
            rel="noreferrer"
          >
            {t("apps.chatEndpointSetup.photon.dashboard")}
          </a>
          {" · "}
          <a
            className="underline"
            href="https://photon.codes/docs/spectrum-ts/providers/imessage/connection-and-routing"
            target="_blank"
            rel="noreferrer"
          >
            {t("apps.chatEndpointSetup.photon.lineSetup")}
          </a>
        </p>
      </div>
      {repairing && (
        <p className="text-sm text-muted-foreground">
          {t("apps.chatEndpointSetup.photon.reconnectDescription", {
            target: endpoint.photonAllocation === "shared"
              ? t("apps.chatEndpointSetup.photon.sharedDmAllocation")
              : endpoint.botExternalId ?? t("apps.chatEndpointSetup.photon.dedicatedNumber"),
          })}
        </p>
      )}
      <label className="grid gap-2 text-sm font-medium">
        {t("apps.chatEndpointSetup.photon.projectId")}
        <Input
          value={projectId}
          autoComplete="off"
          disabled={pending || inspection.isPending || !!endpoint.botExternalId}
          onChange={(event) => {
            setProjectId(event.target.value);
            resetInspection();
          }}
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        {t("apps.chatEndpointSetup.photon.projectSecret")}
        <Input
          type="password"
          value={projectSecret}
          autoComplete="new-password"
          disabled={pending || inspection.isPending}
          onChange={(event) => {
            setProjectSecret(event.target.value);
            resetInspection();
          }}
        />
      </label>
      <Button
        variant="outline"
        disabled={
          pending || inspection.isPending || !projectId.trim() || !projectSecret
        }
        onClick={() => inspection.mutate()}
      >
        {inspection.isPending
          ? t("apps.chatEndpointSetup.photon.inspecting")
          : t("apps.chatEndpointSetup.photon.inspect")}
      </Button>
      {inspection.isError && (
        <p role="alert" className="text-sm text-destructive">
          {sanitizedSetupErrorMessage(inspection.error, { projectSecret })}
        </p>
      )}
      {inspection.data && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            {inspection.data.allocation === "shared"
              ? t("apps.chatEndpointSetup.photon.sharedDms")
              : t("apps.chatEndpointSetup.photon.dedicatedNumbers")} in {inspection.data.projectName}
          </legend>
          {!inspection.data.eligible && (
            <p role="alert" className="text-sm text-destructive">
              {inspection.data.allocation === "shared"
                ? t("apps.chatEndpointSetup.photon.sharedProjectUnavailable")
                : t("apps.chatEndpointSetup.photon.dedicatedNumberUnavailable")}
            </p>
          )}
          {inspection.data.allocation === "shared" && inspection.data.eligible && (
            <p className="text-sm text-muted-foreground">
              {t("apps.chatEndpointSetup.photon.sharedProjectGuidance")}
            </p>
          )}
          {inspection.data.lines.map((line) => (
            <label
              key={line.lineId}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name="photon-line"
                value={line.lineId}
                checked={lineId === line.lineId}
                disabled={
                  !line.eligible ||
                  pending ||
                  (!!endpoint.botExternalId &&
                    endpoint.botExternalId !== line.phoneNumber)
                }
                onChange={() => setLineId(line.lineId)}
              />
              <span>
                {line.phoneNumber}
                {line.unavailableReason ? ` — ${line.unavailableReason}` : ""}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <div>
        <Button
          disabled={
            pending ||
            inspection.isPending ||
            (!(inspection.data?.eligible && (inspection.data.allocation === "shared" || lineId)) && !(repairing && !projectSecret))
          }
          onClick={() =>
            onAction(
              repairing ? "reconnect" : "configure",
              inspection.data?.eligible && inspection.data.allocation === "shared"
                ? { projectId: projectId.trim(), projectSecret, allocation: "shared" }
                : lineId
                ? { projectId: projectId.trim(), projectSecret, lineId, allocation: "dedicated" }
                : undefined,
            )
          }
        >
          {pending
            ? t("apps.chatEndpointSetup.photon.connecting")
            : repairing
              ? t("apps.chatEndpointSetup.photon.reconnect")
              : inspection.data?.allocation === "shared"
                ? t("apps.chatEndpointSetup.photon.connectSharedDms")
                : t("apps.chatEndpointSetup.photon.connectSelectedNumber")}
        </Button>
      </div>
    </div>
  );
}
