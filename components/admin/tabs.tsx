"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Phone } from "lucide-react";
import ConfirmButton from "@/components/ConfirmButton";
import CategoryIcon from "@/components/CategoryIcon";
import ProviderAvatar from "@/components/ProviderAvatar";
import ProviderForm, { type ProviderFormValues } from "@/components/ProviderForm";
import StatusBadge from "@/components/StatusBadge";
import { Badge, Card, ErrorBox, Skeleton } from "@/components/ui";
import { getAllProviders, getAllRequests, getCommissionRates, getPaymentsToCheck, rpc, toError } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import { formatDateTime, formatFcfa, formatPhone, telLink } from "@/lib/contact";
import { PAYMENT_KIND_LABEL } from "@/lib/status";
import { getSupabase } from "@/lib/supabase";
import { clearQueryCache, useQuery } from "@/lib/useQuery";
import type { Provider, ProviderStatus } from "@/lib/types";

export const KEY_PROVIDERS = "admin:providers";
export const KEY_PAYMENTS = "admin:payments";
export const KEY_REQUESTS = "admin:requests";

const PROVIDER_TONE: Record<ProviderStatus, "orange" | "green" | "red"> = { en_attente: "orange", verifie: "green", suspendu: "red" };
const PROVIDER_LABEL: Record<ProviderStatus, string> = { en_attente: "En attente", verifie: "Vérifié", suspendu: "Suspendu" };

function useAction(onDone: () => Promise<unknown> | void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      clearQueryCache("admin:");
      clearQueryCache("requests:");
      clearQueryCache("request:");
      clearQueryCache("cat:");
      clearQueryCache("counts");
      await onDone();
    } catch (e) {
      setError(toError(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

function Empty({ text }: { text: string }) {
  return (
    <div className="card-shadow fade-up rounded-3xl bg-white p-8 text-center">
      <CheckCircle2 size={36} className="mx-auto text-success" />
      <p className="mt-2 text-sm font-semibold text-foreground/70">{text}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Ouvriers
export function ProvidersTab({ pendingOnly }: { pendingOnly: boolean }) {
  const { data, loading, error, reload } = useQuery(KEY_PROVIDERS, getAllProviders);
  const act = useAction(reload);

  const list = (data ?? []).filter((p) => (pendingOnly ? p.status === "en_attente" : true));

  if (loading && !data) return <ListSkeleton />;
  return (
    <div className="space-y-3">
      <ErrorBox message={error || act.error} />
      {list.length === 0 && <Empty text={pendingOnly ? "Aucun ouvrier à valider." : "Aucun ouvrier pour le moment."} />}
      {list.map((p: Provider) => (
        <Card key={p.id} className="fade-up p-4!">
          <div className="flex items-center gap-3">
            <ProviderAvatar name={p.full_name} url={p.photo_url} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.full_name}</p>
              <p className="flex items-center gap-1 text-xs text-foreground/55">
                <CategoryIcon slug={p.category_slug} size={16} /> {getCategory(p.category_slug)?.name} · {p.quartier}
              </p>
            </div>
            <Badge tone={PROVIDER_TONE[p.status]}>{PROVIDER_LABEL[p.status]}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <a href={telLink(p.phone)} className="press inline-flex items-center gap-1.5 rounded-full bg-[#f3f6fd] px-3 py-1.5 font-medium">
              <Phone size={14} /> {formatPhone(p.phone)}
            </a>
            <span className="text-xs text-foreground/50">{p.user_id ? "Compte lié" : "Ajouté par l'admin"}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {p.status !== "verifie" ? (
              <ConfirmButton tone="success" label="Valider" confirmLabel="Confirmer" disabled={act.busy} onConfirm={() => act.run(() => rpc("admin_set_provider_status", { p_provider: p.id, p_status: "verifie" }))} className="py-2.5! text-sm!" />
            ) : (
              <ConfirmButton tone="ghost" label="Suspendre" confirmLabel="Confirmer" disabled={act.busy} onConfirm={() => act.run(() => rpc("admin_set_provider_status", { p_provider: p.id, p_status: "suspendu" }))} className="py-2.5! text-sm!" />
            )}
            <Link href={`/admin/prestataire/${p.id}`} className="press flex items-center justify-center gap-1.5 rounded-2xl bg-[#f3f6fd] py-2.5 text-sm font-semibold text-brand">
              <ExternalLink size={14} /> Modifier
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Paiements
export function PaymentsTab() {
  const { data, loading, error, reload } = useQuery(KEY_PAYMENTS, getPaymentsToCheck, { refreshMs: 20000 });
  const act = useAction(reload);
  const declared = (data ?? []).filter((p) => p.status === "declare");
  const waiting = (data ?? []).filter((p) => p.status === "en_attente");

  if (loading && !data) return <ListSkeleton />;
  return (
    <div className="space-y-4">
      <ErrorBox message={error || act.error} />
      <p className="rounded-2xl bg-sky/15 px-4 py-3 text-xs text-brand">
        Avant de valider, ouvre <b>Wave Business</b> et vérifie le <b>montant exact</b>, le numéro du client et l&apos;heure. Ne valide jamais sur une simple capture d&apos;écran.
      </p>

      <h2 className="font-bold">À vérifier ({declared.length})</h2>
      {declared.length === 0 && <Empty text="Aucun paiement à vérifier." />}
      {declared.map((p) => (
        <Card key={p.id} className="fade-up p-4!">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-extrabold">{formatFcfa(p.amount)}</p>
              <p className="text-xs text-foreground/55">
                {PAYMENT_KIND_LABEL[p.kind]} · {formatDateTime(p.created_at)}
              </p>
            </div>
            <Badge tone="orange">À vérifier</Badge>
          </div>
          <div className="mt-2 space-y-0.5 text-sm">
            <p>
              Client : <b>{p.request?.client?.full_name ?? "—"}</b>
              {p.request?.client?.phone && (
                <a href={telLink(p.request.client.phone)} className="ml-2 text-brand underline">
                  {formatPhone(p.request.client.phone)}
                </a>
              )}
            </p>
            <p>
              Ouvrier : <b>{p.request?.provider?.full_name ?? "—"}</b>
            </p>
            {p.reference && <p>Référence : <b>{p.reference}</b></p>}
            <p className="truncate text-foreground/55">« {p.request?.description} »</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ConfirmButton tone="success" label="Paiement reçu" confirmLabel="Confirmer" disabled={act.busy} onConfirm={() => act.run(() => rpc("admin_validate_payment", { p_payment: p.id }))} className="py-2.5! text-sm!" />
            <ConfirmButton tone="ghost" label="Pas reçu" confirmLabel="Confirmer" disabled={act.busy} onConfirm={() => act.run(() => rpc("admin_reject_payment", { p_payment: p.id }))} className="py-2.5! text-sm!" />
          </div>
        </Card>
      ))}

      <h2 className="pt-2 font-bold">En attente du client ({waiting.length})</h2>
      {waiting.length === 0 ? (
        <p className="text-sm text-foreground/50">Rien en attente.</p>
      ) : (
        waiting.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm card-shadow">
            <span>
              <b>{p.request?.client?.full_name ?? "Client"}</b>
              <span className="block text-xs text-foreground/50">{PAYMENT_KIND_LABEL[p.kind]}</span>
            </span>
            <span className="flex items-center gap-2">
              <b>{formatFcfa(p.amount)}</b>
              <ConfirmButton tone="brand" label="Marquer payé" confirmLabel="Confirmer" disabled={act.busy} onConfirm={() => act.run(() => rpc("admin_validate_payment", { p_payment: p.id }))} className="w-auto! px-3! py-1.5! text-xs!" />
            </span>
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Demandes / commissions
export function RequestsTab() {
  const { data, loading, error, reload } = useQuery(KEY_REQUESTS, getAllRequests);
  const { data: rates } = useQuery("admin:rates", getCommissionRates);
  const act = useAction(reload);
  const [filter, setFilter] = useState<"payout" | "litige" | "all">("payout");

  const all = data ?? [];
  const list = all.filter((r) => (filter === "payout" ? r.status === "termine" : filter === "litige" ? r.status === "litige" : true));
  const earned = all.filter((r) => r.status === "reverse").reduce((s, r) => s + (r.commission_amount ?? 0), 0);
  const counts = { payout: all.filter((r) => r.status === "termine").length, litige: all.filter((r) => r.status === "litige").length };

  if (loading && !data) return <ListSkeleton />;
  return (
    <div className="space-y-3">
      <ErrorBox message={error || act.error} />
      <Card className="fade-up p-4!">
        <p className="text-xs text-foreground/55">Commissions gagnées</p>
        <p className="text-3xl font-extrabold text-success">{formatFcfa(earned)}</p>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["payout", `À reverser (${counts.payout})`],
            ["litige", `Litiges (${counts.litige})`],
            ["all", "Toutes"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`press shrink-0 rounded-full px-4 py-2 text-sm font-medium ${filter === k ? "bg-brand text-white" : "bg-white text-foreground/70"}`}>
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 && <Empty text="Rien à traiter ici." />}
      {list.map((r) => {
        const total = (r.payments ?? []).filter((p) => p.status === "paye").reduce((s, p) => s + p.amount, 0);
        const pct = rates?.[r.provider?.category_slug ?? ""] ?? 10;
        const commission = Math.round((total * pct) / 100);
        return (
          <Card key={r.id} className="fade-up p-4!">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold">
                {r.client?.full_name ?? "Client"} → {r.provider?.full_name ?? "Ouvrier"}
              </p>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-1 truncate text-sm text-foreground/65">{r.description}</p>
            <p className="text-xs text-foreground/45">{formatDateTime(r.updated_at)}</p>

            {r.status === "litige" && r.dispute_reason && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{r.dispute_reason}</p>}

            {r.status === "termine" && (
              <div className="mt-3 rounded-2xl bg-[#f3f6fd] p-3 text-sm">
                <p>Total payé : <b>{formatFcfa(total)}</b></p>
                <p>Commission ({pct} %) : <b className="text-success">{formatFcfa(commission)}</b></p>
                <p>À reverser à l&apos;ouvrier : <b>{formatFcfa(total - commission)}</b></p>
                {r.provider?.phone && (
                  <p className="mt-1 text-xs text-foreground/55">
                    Envoie sur Wave au <a href={telLink(r.provider.phone)} className="underline">{formatPhone(r.provider.phone)}</a>, puis marque comme reversé.
                  </p>
                )}
              </div>
            )}
            {r.status === "reverse" && (
              <p className="mt-2 text-sm">
                Commission <b className="text-success">{formatFcfa(r.commission_amount ?? 0)}</b> · Ouvrier payé <b>{formatFcfa(r.payout_amount ?? 0)}</b>
              </p>
            )}

            <div className="mt-3 space-y-2">
              {r.status === "termine" && (
                <ConfirmButton tone="success" label="J'ai reversé l'ouvrier" confirmLabel="Confirmer le reversement" disabled={act.busy} onConfirm={() => act.run(() => rpc("admin_payout", { p_request: r.id }))} className="py-2.5! text-sm!" />
              )}
              {r.status === "litige" && (
                <div className="grid grid-cols-2 gap-2">
                  <ConfirmButton tone="success" label="Payer l'ouvrier" confirmLabel="Confirmer" disabled={act.busy} onConfirm={() => act.run(() => rpc("admin_resolve_dispute", { p_request: r.id, p_outcome: "reverser" }))} className="py-2.5! text-sm!" />
                  <ConfirmButton tone="ghost" label="Rembourser client" confirmLabel="Confirmer" disabled={act.busy} onConfirm={() => act.run(() => rpc("admin_resolve_dispute", { p_request: r.id, p_outcome: "rembourser" }))} className="py-2.5! text-sm!" />
                </div>
              )}
              <Link href={`/demande/${r.id}`} className="press flex items-center justify-center gap-1.5 rounded-2xl bg-[#f3f6fd] py-2.5 text-sm font-semibold text-brand">
                <ExternalLink size={14} /> Voir le détail
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- Ajouter un ouvrier
export function AddProviderTab({ adminId, onAdded }: { adminId: string; onAdded: () => void }) {
  async function submit(v: ProviderFormValues) {
    const sb = getSupabase();
    if (!sb) throw new Error("Service momentanément indisponible. Réessaie plus tard.");
    const { error } = await sb.from("defarko_providers").insert(v);
    if (error) throw new Error("Impossible d'ajouter l'ouvrier. Vérifie les informations.");
    clearQueryCache("admin:");
    clearQueryCache("cat:");
    clearQueryCache("counts");
    onAdded();
  }
  return (
    <Card className="fade-up">
      <h2 className="font-bold">Ajouter un ouvrier</h2>
      <p className="mb-4 mt-1 text-xs text-foreground/55">
        Pour un ouvrier que tu as contacté. Son numéro WhatsApp sert pour les messages et les appels des clients.
      </p>
      <ProviderForm submitLabel="Ajouter l'ouvrier" uploadFolder={adminId} showStatus onSubmit={submit} />
    </Card>
  );
}
