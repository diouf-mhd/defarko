"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "./supabase";
import { clearQueryCache } from "./useQuery";
import type { Profile, ProviderStatus } from "./types";

export type SessionUser = { id: string; email: string };

type AuthState = {
  user: SessionUser | null;
  profile: Profile | null;
  providerId: string | null;
  providerStatus: ProviderStatus | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const EMPTY: AuthState = { user: null, profile: null, providerId: null, providerStatus: null, loading: false };

const AuthContext = createContext<AuthContextValue>({
  ...EMPTY,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...EMPTY, loading: true });

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setState(EMPTY);
      return;
    }
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    if (!u) {
      setState(EMPTY);
      return;
    }
    const [p, prov] = await Promise.all([
      sb.from("profiles").select("id, full_name, phone, role").eq("id", u.id).maybeSingle(),
      sb.from("providers").select("id, status").eq("user_id", u.id).maybeSingle(),
    ]);
    setState({
      user: { id: u.id, email: u.email ?? "" },
      profile: (p.data as Profile | null) ?? null,
      providerId: (prov.data as { id: string } | null)?.id ?? null,
      providerStatus: ((prov.data as { status: ProviderStatus } | null)?.status as ProviderStatus) ?? null,
      loading: false,
    });
  }, []);

  useEffect(() => {
    load();
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange(() => {
      // Ne pas appeler Supabase directement dans ce callback (risque de blocage)
      setTimeout(load, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    clearQueryCache();
    setState(EMPTY);
  }, []);

  const value = useMemo(() => ({ ...state, refresh: load, signOut }), [state, load, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
