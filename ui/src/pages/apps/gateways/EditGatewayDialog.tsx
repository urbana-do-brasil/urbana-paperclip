import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ToolMcpGatewayWithTokens, ToolProfileWithDetails } from "@paperclipai/shared";
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
import { allowedToolsLabel } from "./gateway-helpers";
import { gatewaysQueryKey } from "./NewGatewayDialog";

export function EditGatewayDialog({
  companyId,
  gateway,
  profiles,
  open,
  onOpenChange,
}: {
  companyId: string;
  gateway: ToolMcpGatewayWithTokens;
  profiles: ToolProfileWithDetails[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { t } = useTranslation();
  const [name, setName] = useState(gateway.name);
  const [description, setDescription] = useState(gateway.description ?? "");
  const [profileId, setProfileId] = useState(gateway.profileId);

  useEffect(() => {
    if (!open) return;
    setName(gateway.name);
    setDescription(gateway.description ?? "");
    setProfileId(gateway.profileId);
  }, [gateway, open]);

  const activeProfiles = profiles.filter((profile) => profile.status !== "archived");
  const updateMutation = useMutation({
    mutationFn: () =>
      toolsApi.updateGateway(companyId, gateway.id, {
        name: name.trim(),
        description: description.trim() || null,
        profileId,
      }),
    onSuccess: async (updated) => {
      pushToast({ title: t("apps.gateways.dialog.updated"), body: updated.name, tone: "success" });
      await queryClient.invalidateQueries({ queryKey: gatewaysQueryKey(companyId) });
      onOpenChange(false);
    },
    onError: (error) => {
      pushToast({
        title: t("apps.gateways.dialog.updateFailed"),
        body: error instanceof Error ? error.message : String(error),
        tone: "error",
      });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !profileId) return;
    updateMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("apps.gateways.dialog.editTitle")}</DialogTitle>
          <DialogDescription>
            {t("apps.gateways.dialog.editDescription")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("toolsAdmin.gateways.name")}</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("toolsAdmin.gateways.profile")}</span>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={profileId}
              onChange={(event) => setProfileId(event.target.value)}
              required
            >
              {activeProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                {profile.name} — {allowedToolsLabel(profile, t)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{t("apps.gateways.dialog.descriptionOptional")}</span>
            <textarea
              className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("apps.gateways.dialog.editDescriptionPlaceholder")}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("apps.gateways.dialog.cancel")}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !name.trim() || !profileId}>
              {updateMutation.isPending ? t("apps.gateways.dialog.saving") : t("apps.gateways.dialog.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
