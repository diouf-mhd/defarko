import { getSupabase } from "./supabase";
import type { Payment, Provider, RequestRow, Review } from "./types";

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error("Service momentanément indisponible. Réessaie plus tard.");
  return sb;
}

function cleanError(msg: string): string {
  if (/permission denied|row-level security|JWT|violates/i.test(msg)) return "Action non autorisée.";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "Problème de connexion. Vérifie ton réseau et réessaie.";
  return msg;
}

/** Appelle une fonction du parcours (RPC) et renvoie un message d'erreur lisible en français. */
export async function rpc<T = unknown>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await client().rpc(`defarko_${name}`, args);
  if (error) throw new Error(cleanError(error.message));
  return data as T;
}

export function toError(e: unknown): string {
  return e instanceof Error ? cleanError(e.message) : "Une erreur est survenue.";
}

// ---------- Lecture publique ----------
export async function getProviderCounts(): Promise<Record<string, number>> {
  const sb = getSupabase();
  if (!sb) return {};
  const { data } = await sb.from("defarko_providers").select("category_slug").eq("status", "verifie");
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = (row as { category_slug: string }).category_slug;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

export async function getProvidersByCategory(slug: string): Promise<Provider[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("defarko_providers")
    .select("*")
    .eq("category_slug", slug)
    .eq("status", "verifie")
    .order("rating", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(cleanError(error.message));
  return (data ?? []) as Provider[];
}

export async function getProvider(id: string): Promise<Provider | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("defarko_providers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(cleanError(error.message));
  return (data as Provider | null) ?? null;
}

export async function getReviews(providerId: string): Promise<Review[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("defarko_reviews")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as Review[];
}

// ---------- Demandes ----------
export const REQUEST_SELECT =
  "*, provider:defarko_providers(id, full_name, phone, category_slug, photo_url, diagnostic_fee), client:defarko_profiles(full_name, phone), defarko_payments(*)";

export async function getRequest(id: string): Promise<RequestRow | null> {
  const { data, error } = await client()
    .from("defarko_requests")
    .select(REQUEST_SELECT)
    .eq("id", id)
    .order("created_at", { referencedTable: "defarko_payments", ascending: true })
    .maybeSingle();
  if (error) throw new Error(cleanError(error.message));
  return (data as unknown as RequestRow | null) ?? null;
}

export async function getMyRequests(userId: string, providerId: string | null): Promise<{ asClient: RequestRow[]; asProvider: RequestRow[] }> {
  const sb = client();
  const asClientQ = sb.from("defarko_requests").select(REQUEST_SELECT).eq("client_id", userId).order("updated_at", { ascending: false });
  const asProviderQ = providerId
    ? sb.from("defarko_requests").select(REQUEST_SELECT).eq("provider_id", providerId).order("updated_at", { ascending: false })
    : null;
  const [a, b] = await Promise.all([asClientQ, asProviderQ ?? Promise.resolve({ data: [], error: null })]);
  if (a.error) throw new Error(cleanError(a.error.message));
  return {
    asClient: (a.data ?? []) as unknown as RequestRow[],
    asProvider: ((b.data ?? []) as unknown) as RequestRow[],
  };
}

export async function hasReviewed(requestId: string): Promise<boolean> {
  const { data } = await client().from("defarko_reviews").select("id").eq("request_id", requestId).maybeSingle();
  return Boolean(data);
}

/** Demande terminée du client avec cet ouvrier, pas encore notée (pour laisser un avis depuis la fiche). */
export async function getReviewableRequest(providerId: string, userId: string): Promise<string | null> {
  const sb = client();
  const { data: reqs } = await sb
    .from("defarko_requests")
    .select("id")
    .eq("provider_id", providerId)
    .eq("client_id", userId)
    .in("status", ["termine", "reverse"]);
  const ids = (reqs ?? []).map((r) => (r as { id: string }).id);
  if (!ids.length) return null;
  const { data: done } = await sb.from("defarko_reviews").select("request_id").in("request_id", ids);
  const doneIds = new Set((done ?? []).map((r) => (r as { request_id: string }).request_id));
  return ids.find((id) => !doneIds.has(id)) ?? null;
}

// ---------- Administration ----------
export async function getAllProviders(): Promise<Provider[]> {
  const { data, error } = await client().from("defarko_providers").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(cleanError(error.message));
  return (data ?? []) as Provider[];
}

export type AdminPayment = Payment & {
  request?: {
    id: string;
    status: string;
    description: string;
    client?: { full_name: string | null; phone: string | null } | null;
    provider?: { full_name: string; phone: string } | null;
  } | null;
};

export async function getPaymentsToCheck(): Promise<AdminPayment[]> {
  const { data, error } = await client()
    .from("defarko_payments")
    .select("*, request:defarko_requests(id, status, description, client:defarko_profiles(full_name, phone), provider:defarko_providers(full_name, phone))")
    .in("status", ["declare", "en_attente"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(cleanError(error.message));
  return (data ?? []) as unknown as AdminPayment[];
}

export async function getAllRequests(): Promise<RequestRow[]> {
  const { data, error } = await client()
    .from("defarko_requests")
    .select(REQUEST_SELECT)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(cleanError(error.message));
  return (data ?? []) as unknown as RequestRow[];
}

export async function getCommissionRates(): Promise<Record<string, number>> {
  const { data } = await client().from("defarko_categories").select("slug, commission_pct");
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[(r as { slug: string }).slug] = Number((r as { commission_pct: number }).commission_pct);
  return out;
}
