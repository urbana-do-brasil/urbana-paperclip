import { Navigate, useActiveCompanyPrefix, useParams } from "@/lib/router";

/** Preserve old status-card URLs while carrying the active company prefix and card ID forward. */
export function StatusCardsLegacyRedirect() {
  const { cardId } = useParams<{ cardId?: string }>();
  const prefix = useActiveCompanyPrefix();
  const base = prefix ? `/${prefix}` : "";
  return <Navigate to={`${base}/status${cardId ? `/${cardId}` : ""}`} replace />;
}
