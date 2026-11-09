import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_USER_LOCALE, isSupportedLocale, type SupportedLocale } from "@paperclipai/shared/localization";
import { localePreferenceApi } from "../api/locale-preference";
import { useAccountIdentity } from "../api/companies-query";
import { healthApi } from "../api/health";
import { queryKeys } from "../lib/queryKeys";
import { i18n } from "../i18n";

export type LocaleIdentity = `user:${string}` | "local" | null;
type State = { identity: LocaleIdentity; locale: SupportedLocale; loading: boolean; saving: boolean; readError: boolean; saveError: boolean };
type LocaleContextValue = Omit<State, "identity"> & { ready: boolean; save: (locale: SupportedLocale) => Promise<void>; retry: () => void };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function localeStorageKey(identity: Exclude<LocaleIdentity, null>) {
  return identity === "local" ? "paperclip.locale.local" : `paperclip.locale.user.${encodeURIComponent(identity.slice(5))}`;
}
function cachedLocale(identity: LocaleIdentity): SupportedLocale {
  if (!identity) return DEFAULT_USER_LOCALE;
  try {
    const value = localStorage.getItem(localeStorageKey(identity));
    return isSupportedLocale(value) ? value : DEFAULT_USER_LOCALE;
  } catch { return DEFAULT_USER_LOCALE; }
}
function initialState(identity: LocaleIdentity): State {
  return { identity, locale: cachedLocale(identity), loading: identity !== "local", saving: false, readError: false, saveError: false };
}

/** Kept mounted across identities: switching language must not remount forms. */
export function LocaleStateProvider({ identity, identityError = false, onIdentityRetry, children }: { identity: LocaleIdentity; identityError?: boolean; onIdentityRetry?: () => void; children: ReactNode }) {
  const [state, setState] = useState<State>(() => initialState(identity));
  const [revision, setRevision] = useState(0);
  const activeIdentity = useRef(identity);
  activeIdentity.current = identity;
  const generation = useRef(0);
  const readRequest = useRef<AbortController | null>(null);
  const saveRequest = useRef<AbortController | null>(null);
  // Never expose the prior account's state while the new effect is pending.
  const current = state.identity === identity ? state : initialState(identity);
  const locale = current.locale;

  useLayoutEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const token = ++generation.current;
    const controller = new AbortController();
    readRequest.current = controller;
    setState((previous) => ({ ...(previous.identity === identity ? previous : initialState(identity)), loading: identity !== "local", readError: false, saving: false, saveError: false }));
    if (identity?.startsWith("user:")) {
      void localePreferenceApi.get(controller.signal).then((preference) => {
        if (controller.signal.aborted || generation.current !== token || activeIdentity.current !== identity) return;
        try { localStorage.setItem(localeStorageKey(identity), preference.locale); } catch { /* Remote confirmation remains authoritative. */ }
        setState({ identity, locale: preference.locale, loading: false, saving: false, readError: false, saveError: false });
      }).catch(() => {
        if (controller.signal.aborted || generation.current !== token || activeIdentity.current !== identity) return;
        setState((previous) => ({ ...previous, loading: false, readError: true }));
      });
    }
    return () => {
      controller.abort();
      saveRequest.current?.abort();
      saveRequest.current = null;
    };
  }, [identity, revision]);

  useEffect(() => {
    if (!identity) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== localeStorageKey(identity) || !isSupportedLocale(event.newValue)) return;
      // A write in this tab still waits for its own server confirmation.
      if (saveRequest.current) return;
      ++generation.current;
      readRequest.current?.abort();
      setState({ identity, locale: event.newValue, loading: false, saving: false, readError: false, saveError: false });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [identity]);

  const save = useCallback(async (next: SupportedLocale) => {
    if (!identity || activeIdentity.current !== identity || saveRequest.current || !isSupportedLocale(next)) return;
    const token = ++generation.current;
    readRequest.current?.abort();
    const controller = new AbortController();
    saveRequest.current = controller;
    setState((previous) => ({ ...previous, loading: false, saving: true, saveError: false }));
    try {
      const confirmed = identity === "local" ? next : (await localePreferenceApi.save(next, controller.signal)).locale;
      if (controller.signal.aborted || generation.current !== token || activeIdentity.current !== identity) return;
      if (identity === "local") localStorage.setItem(localeStorageKey(identity), confirmed);
      else { try { localStorage.setItem(localeStorageKey(identity), confirmed); } catch { /* Optional local cache. */ } }
      setState({ identity, locale: confirmed, loading: false, saving: false, readError: false, saveError: false });
    } catch {
      if (!controller.signal.aborted && generation.current === token && activeIdentity.current === identity) {
        setState((previous) => ({ ...previous, saving: false, saveError: true }));
      }
    } finally {
      if (saveRequest.current === controller) saveRequest.current = null;
    }
  }, [identity]);
  const retry = useCallback(() => {
    if (!identity) { onIdentityRetry?.(); return; }
    if (!saveRequest.current) setRevision((value) => value + 1);
  }, [identity, onIdentityRetry]);

  return <LocaleContext.Provider value={{ ...current, locale, readError: current.readError || identityError, ready: identity !== null && !current.loading, save, retry }}>{children}</LocaleContext.Provider>;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const account = useAccountIdentity();
  const health = useQuery({ queryKey: queryKeys.health, queryFn: healthApi.get, retry: false });
  const identity: LocaleIdentity = health.data?.deploymentMode === "local_trusted"
    ? "local"
    : account.settled ? account.userId ? `user:${account.userId}` : "local" : null;
  return <LocaleStateProvider identity={identity} identityError={identity === null && account.failed} onIdentityRetry={() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    void health.refetch();
  }}>{children}</LocaleStateProvider>;
}

export function useLocale() { return useContext(LocaleContext); }
