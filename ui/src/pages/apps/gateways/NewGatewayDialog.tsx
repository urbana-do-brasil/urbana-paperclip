import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ToolMcpGatewayContextScopeType, ToolProfileWithDetails } from "@paperclipai/shared";
import { toolsApi } from "@/api/tools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "@/i18n";
import { queryKeys } from "@/lib/queryKeys";
import { allowedToolsLabel } from "./gateway-helpers";

export const gatewaysQueryKey = (companyId: string) => ["tools", "gateways", companyId] as const;

/**
 * "New gateway" dialog. A gateway is one safe MCP endpoint that exposes only
 * the tools in its access profile. Matches the prosumer create flow from the
 * PAP-11178 design of record.
 */
export function NewGatewayDialog({
  companyId,
  open,
  onOpenChange,
  onCreated,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (gatewayId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [profileId, setProfileId] = useState("");

  const profilesQuery = useQuery({
    queryKey: queryKeys.tools.profiles(companyId),
    queryFn: () => toolsApi.listProfiles(companyId),
    enabled: open,
  });
  const activeProfiles = (profilesQuery.data?.profiles ?? []).filter(
    (profile: ToolProfileWithDetails) => profile.status !== "archived",
  );

  useEffect(() => {
    if (open && !profileId && activeProfiles[0]) setProfileId(activeProfiles[0].id);
  }, [open, profileId, activeProfiles]);

  const createMutation = useMutation({
    mutationFn: () =>
      toolsApi.createGateway(companyId, {
        name: name.trim(),
        description: description.trim() || null,
        profileId,
        defaultProfileMode: "gateway_only",
        contextScopeType: "company" satisfies ToolMcpGatewayContextScopeType,
      }),
    onSuccess: async (gateway) => {
      pushToast({ title: t("apps.gateways.dialog.created"), body: gateway.name, tone: "success" });
      await queryClient.invalidateQueries({ queryKey: gatewaysQueryKey(companyId) });
      setName("");
      setDescription("");
      onOpenChange(false);
      onCreated?.(gateway.id);
    },
    onError: (error) => {
      pushToast({
        title: t("apps.gateways.dialog.createFailed"),
        body: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !profileId) return;
    createMutation.mutate();
  }

  const profilesLoading = profilesQuery.isLoading;
  const noProfiles = !profilesLoading && activeProfiles.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("apps.gateways.dialog.newTitle")}</DialogTitle>
          <DialogDescription>
            {t("apps.gateways.dialog.newDescription")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("toolsAdmin.gateways.name")}</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("toolsAdmin.gateways.namePlaceholder")}
              required
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("toolsAdmin.gateways.profile")}</span>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              required
              disabled={noProfiles}
            >
              <option value="" disabled>
                {profilesLoading ? t("toolsAdmin.gateways.loadingProfiles") : t("toolsAdmin.gateways.chooseProfile")}
              </option>
              {activeProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} — {allowedToolsLabel(profile, t)}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {t("apps.gateways.dialog.profileHint")}
            </span>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("apps.gateways.dialog.descriptionOptional")}</span>
            <textarea
              className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("apps.gateways.dialog.newDescriptionPlaceholder")}
            />
          </label>
          {noProfiles ? (
            <p className="text-xs text-destructive">
              {t("apps.gateways.dialog.noProfiles")}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("apps.gateways.dialog.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || noProfiles || !name.trim() || !profileId}
            >
              {createMutation.isPending ? t("apps.gateways.dialog.creating") : t("apps.gateways.dialog.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
