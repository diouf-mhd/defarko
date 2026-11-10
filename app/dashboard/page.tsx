"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, MessageCircle, Wallet, Hammer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { CATEGORIES, normalizeText } from "@/lib/categories";
import { getProviderCounts } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import CategoryIcon from "@/components/CategoryIcon";
import { Skeleton } from "@/components/ui";
import Logo from "@/components/Logo";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [query, setQuery] = useState("");
  const { data: counts, loading } = useQuery("counts", getProviderCounts);

  const q = normalizeText(query.trim());
  const filtered = CATEGORIES.filter((c) => normalizeText(c.name).includes(q));
  const firstName = (profile?.full_name ?? "").split(" ")[0];

  return (
    <main className="pb-6">
      <header className="relative overflow-hidden rounded-b-[2.5rem] bg-brand px-6 pb-20 pt-10 text-white">
        <div className="absolute -right-10 -top-12 h-52 w-52 rotate-12 rounded-3xl bg-brand-dark/60" />
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <div>
              <p className="text-sm text-white/75">{user ? "Bonjour," : "Bienvenue sur"}</p>
              <h1 className="text-2xl font-bold leading-tight">{user ? `${firstName || "toi"} 👋` : "Defar ko"}</h1>
            </div>
          </div>
          {!user && (
            <Link href="/login" className="press rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              Se connecter
            </Link>
          )}
        </div>
        <p className="relative mt-5 text-lg font-semibold leading-snug">De quel service as-tu besoin ?</p>
      </header>

      <section className="relative z-10 -mt-12 px-5">
        <div className="card-shadow rounded-[2rem] bg-white p-4">
          <div className="relative mb-4">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un métier…"
              aria-label="Rechercher un métier"
              className="w-full rounded-2xl border border-brand/15 bg-[#f3f6fd] py-3 pl-11 pr-4 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground/60">Aucun métier ne correspond à ta recherche.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((c, i) => {
                const n = counts?.[c.slug] ?? 0;
                return (
                  <Link
                    key={c.slug}
                    href={`/categorie/${c.slug}`}
                    style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                    className="fade-up press lift card-shadow flex h-36 flex-col items-center justify-center rounded-2xl bg-white p-3 text-center"
                  >
                    <CategoryIcon slug={c.slug} size={64} className="icon-float" />
                    <span className="mt-2 text-sm font-semibold leading-tight">{c.name}</span>
                    {loading && !counts ? (
                      <Skeleton className="mt-1 h-3 w-16 !rounded-full" />
                    ) : (
                      <span className="mt-0.5 text-xs text-foreground/55">
                        {n > 0 ? `${n} ouvrier${n > 1 ? "s" : ""}` : "Bientôt disponible"}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-bold">Comment ça marche</h2>
        <ol className="grid grid-cols-3 gap-2 text-center text-xs">
          {[
            { Icon: Search, t: "Choisis un métier", d: "et trouve un ouvrier près de toi" },
            { Icon: MessageCircle, t: "Contacte-le", d: "sur WhatsApp ou par appel" },
            { Icon: Wallet, t: "Paie en sécurité", d: "avec Wave, garanti par Defar ko" },
          ].map(({ Icon, t, d }, i) => (
            <li key={t} style={{ animationDelay: `${i * 80}ms` }} className="fade-up card-shadow rounded-2xl bg-white p-3">
              <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon size={18} />
              </span>
              <p className="font-semibold">{t}</p>
              <p className="mt-0.5 text-foreground/55">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 px-5">
        <Link
          href="/devenir-prestataire"
          className="press lift card-shadow flex items-center gap-4 rounded-3xl bg-gradient-to-br from-brand to-[#3a3fd0] p-5 text-white"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Hammer size={24} />
          </span>
          <span>
            <span className="block font-bold">Tu es un ouvrier ?</span>
            <span className="block text-sm text-white/80">Rejoins Defar ko gratuitement et trouve de nouveaux clients.</span>
          </span>
        </Link>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-foreground/55">
          <ShieldCheck size={14} /> Ouvriers vérifiés par l&apos;équipe Defar ko
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/45 underline decoration-foreground/25 underline-offset-4"
        >
          <ShieldCheck size={14} /> Accès administration
        </Link>
      </section>
    </main>
  );
}
