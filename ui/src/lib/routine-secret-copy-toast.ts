import type { TFunction } from "i18next";

export function routineSecretCopySuccessTitle(t: TFunction, label: string): string {
  return t("routines.detail.triggers.copy.secretCopied", { label });
}

export function routineSecretCopyFailureToast(
  t: TFunction,
  label: string,
  error: unknown,
): { title: string; body: string } {
  return {
    title: t("routines.detail.triggers.copy.secretCopyFailed", { label }),
    body:
      error instanceof Error
        ? error.message
        : t("routines.detail.triggers.copy.clipboardDenied"),
  };
}
