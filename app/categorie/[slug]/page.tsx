"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import BackButton from "@/components/BackButton";
import CategoryIcon from "@/components/CategoryIcon";
import ProviderAvatar from "@/components/ProviderAvatar";
import { AvailabilityBadge, Skeleton } from "@/components/ui";
import { getCategory } from "@/lib/categories";
import { getProvidersByCategory } from "@/lib/api";
import { useQuery } from "@/lib/useQuery";
import { formatFcfa, MODE_LABELS } from "@/lib/contact";
import type { Provider } from "@/lib/types";

const AVAIL_ORDER = { disponible: 0, occupe: 1, hors_service: 2 } as const;

function CategoryView({ slug }: { slug: string }) {
  const category = getCategory(slug);
  const { data, loading, error } = useQuery<Provider[]>(`cat:${slug}`, () => getProvidersByCategory(slug));
  const [quartier, setQuartier] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [query, setQuery] = useState("");

  const providers = useMemo(() => data ?? [], [data]);
  const quartiers = useMemo(() => Array.from(new Set(providers.map((p) => p.quartier))).sort(), [providers]);

  const list = useMemo(
    () =>
      providers
        .filter(
          (p) =>
            (!quartier || p.quartier === quartier) &&
            (!onlyAvailable || p.availability === "disponible") &&
            (!query.trim() || p.full_name.toLowerCase().includes(query.trim().toLowerCase()))
        )
        .sort((a, b) => AVAIL_ORDER[a.availability] - AVAIL_ORDER[b.availability] || b.rating - a.rating),
    [providers, quartier, onlyAvailable, query]
  );

  if (!category) {
    return (
      <main className="p-8 text-center">
        <p className="mt-20 text-lg font-semibold">Métier introuvable</p>
        <Link href="/dashboard" className="mt-4 inline-block font-semibold text-brand underline">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  return (
    <main className="pb-6">
      <header className="rounded-b-4xl bg-brand px-5 pb-6 pt-8 text-white">
        <div className="flex items-center gap-3">
          <BackButton />
          <CategoryIcon slug={slug} size={40} />
          <h1 className="text-xl font-bold">{category.name}</h1>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un nom…"
          aria-label="Rechercher un nom"
          className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-base text-foreground outline-none"
        />
      </header>

      <section className="px-5 pt-4">
        <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
          <button
            onClick={() => setOnlyAvailable((v) => !v)}
            className={`press shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              onlyAvailable ? "bg-success text-white" : "bg-white text-foreground/70"
            }`}
          >
            ● Disponible maintenant
          </button>
          {quartiers.length > 1 &&
            ["", ...quartiers].map((q) => (
              <button
                key={q || "tous"}
                onClick={() => setQuartier(q)}
                className={`press shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  quartier === q ? "bg-brand text-white" : "bg-white text-foreground/70"
                }`}
              >
                {q || "Tous les quartiers"}
              </button>
            ))}
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="card-shadow fade-up rounded-3xl bg-white p-8 text-center">
            <CategoryIcon slug={slug} size={72} className="mx-auto" />
            <p className="mt-3 font-semibold">
              {providers.length === 0 ? "Bientôt disponible" : "Aucun résultat"}
            </p>
            <p className="mt-1 text-sm text-foreground/60">
              {providers.length === 0
                ? `Les ${category.name.toLowerCase()}s rejoignent la plateforme très bientôt.`
                : "Essaie un autre quartier ou retire un filtre."}
            </p>
            {providers.length === 0 && (
              <Link href={`/devenir-prestataire?cat=${slug}`} className="mt-4 inline-block text-sm font-semibold text-brand underline">
                Tu es {category.name.toLowerCase()} ? Rejoins-nous
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((p, i) => (
              <li key={p.id} style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }} className="fade-up">
                <Link href={`/prestataire/${p.id}`} className="press lift card-shadow flex items-center gap-3 rounded-2xl bg-white p-4">
                  <ProviderAvatar name={p.full_name} url={p.photo_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold">{p.full_name}</p>
                      <BadgeCheck size={16} className="shrink-0 text-sky" aria-label="Vérifié" />
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/60">
                      <MapPin size={12} /> {p.quartier} · {p.service_modes.map((m) => MODE_LABELS[m] ?? m).join(", ")}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <AvailabilityBadge value={p.availability} />
                      <span className="flex items-center gap-1 text-xs text-foreground/60">
                        <Star size={12} className="fill-accent text-accent" />
                        {p.reviews_count > 0 ? `${p.rating.toFixed(1)} (${p.reviews_count})` : "Nouveau"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    {p.pricing_type === "fixe" && p.price ? (
                      <>
                        <p className="font-bold text-success">{formatFcfa(p.price)}</p>
                        <p className="text-xs text-foreground/50">/{p.price_unit}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-accent">Sur devis</p>
                        {p.diagnostic_fee > 0 && <p className="text-[11px] text-foreground/50">dès {formatFcfa(p.diagnostic_fee)}</p>}
                      </>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function CategoryRoute() {
  const params = useParams<{ slug: string }>();
  return <CategoryView slug={params.slug} />;
}

export default function CategoryPage() {
  return (
    <Suspense fallback={null}>
      <CategoryRoute />
    </Suspense>
  );
}
