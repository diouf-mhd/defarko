"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Petit cache « stale-while-revalidate » : les pages déjà vues s'affichent instantanément
// (retour arrière fluide), puis se rafraîchissent en arrière-plan.
const cache = new Map<string, unknown>();

export function clearQueryCache(prefix = "") {
  for (const k of Array.from(cache.keys())) if (k.startsWith(prefix)) cache.delete(k);
}

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, opts?: { refreshMs?: number }) {
  const [data, setData] = useState<T | undefined>(() => (key ? (cache.get(key) as T | undefined) : undefined));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(() => (key ? !cache.has(key) : false));
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(async () => {
    if (!key) return;
    try {
      const d = await fetcherRef.current();
      cache.set(key, d);
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    if (!key) {
      setLoading(false);
      return;
    }
    if (cache.has(key)) {
      setData(cache.get(key) as T);
      setLoading(false);
    } else {
      setData(undefined);
      setLoading(true);
    }
    reload();
  }, [key, reload]);

  const refreshMs = opts?.refreshMs;
  useEffect(() => {
    if (!refreshMs || !key) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, refreshMs);
    return () => clearInterval(id);
  }, [key, reload, refreshMs]);

  const mutate = useCallback(
    (d: T) => {
      if (key) cache.set(key, d);
      setData(d);
    },
    [key]
  );

  return { data, error, loading, reload, mutate };
}
