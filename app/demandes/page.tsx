"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import CategoryIcon from "@/components/CategoryIcon";
import StatusBadge from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui";
import { getMyRequests } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { formatDate, formatFcfa } from "@/lib/contact";
import { FINISHED_STATUSES } from "@/lib/status";
import type { RequestRow } from "@/lib/types";

function RequestCard({ r, as, index }: { r: RequestRow; as: "client" | "provider"; index: number }) {
  const who = as === "client" ? r.provider?.full_name : r.client?.full_name;
  const paid = (r.payments ?? []).filter((p) => p.status === "paye").reduce((s, p) => s + p.amount, 0);
  return (
    <li style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }} className="fade-up">
      <Link href={`/demande/${r.id}`} className="press lift card-shadow flex items-center gap-3 rounded-2xl bg-white p-4">
        <CategoryIcon slug={r.provider?.category_slug ?? ""} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold">{who || (as === "client" ? "Ouvrier" : "Client")}</p>
            <StatusBadge status={r.status} />
          </div>
          <p className="mt-0.5 truncate text-sm text-foreground/65">{r.description}</p>
          <p className="mt-1 text-xs text-foreground/45">
            {r.preferred_date ? `Intervention souhaitée le ${formatDate(r.preferred_date)}` : formatDate(r.created_at)}
            {paid > 0 && ` · ${formatFcfa(paid)} payés`}
          </p>
        </div>
      </Link>
    </li>
  );
}

function DemandesInner({ userId, providerId }: { userId: string; providerId: string | null }) {
  const { data, loading, error } = useQuery(`requests:${userId}:${providerId ?? ""}`, () => getMyRequests(userId, providerId), {
    refreshMs: 30000,
  });
  const [side, setSide] = useState<"client" | "provider">("client");
  const [tab, setTab] = useState<"ongoing" | "done">("ongoing");

  const all = side === "client" ? data?.asClient : data?.asProvider;
  const list = (all ?? []).filter((r) => (tab === "done" ? FINISHED_STATUSES.includes(r.status) : !FINISHED_STATUSES.includes(r.status)));

  return (
    <main className="pb-6">
      <header className="rounded-b-[2.5rem] bg-brand px-6 pb-10 pt-10 text-white">
        <h1 className="text-2xl font-bold">Mes demandes</h1>
        <p className="mt-1 text-sm text-white/75">Suis chaque intervention, du diagnostic à la confirmation.</p>
      </header>

      <section className="px-5 pt-4">
        {providerId && (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 card-shadow">
            {(["client", "provider"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`press rounded-xl py-2 text-sm font-semibold transition-colors ${side === s ? "bg-brand text-white" : "text-foreground/60"}`}
              >
                {s === "client" ? "Mes demandes" : `Reçues${data?.asProvider.length ? ` (${data.asProvider.length})` : ""}`}
              </button>
            ))}
          </div>
        )}

        <div className="mb-4 flex gap-2">
          {(["ongoing", "done"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`press rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === t ? "bg-brand text-white" : "bg-white text-foreground/70"}`}
            >
              {t === "ongoing" ? "En cours" : "Terminées"}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {loading && !data ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="card-shadow fade-up rounded-3xl bg-white p-8 text-center">
            <Inbox size={40} className="mx-auto text-brand/40" />
            <p className="mt-3 font-semibold">Aucune demande {tab === "ongoing" ? "en cours" : "terminée"}</p>
            {side === "client" && tab === "ongoing" && (
              <Link href="/dashboard" className="mt-3 inline-block text-sm font-semibold text-brand underline">
                Trouver un ouvrier
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((r, i) => (
              <RequestCard key={r.id} r={r} as={side} index={i} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function DemandesPage() {
  return <RequireAuth>{(auth) => <DemandesInner userId={auth.user!.id} providerId={auth.providerId} />}</RequireAuth>;
}
