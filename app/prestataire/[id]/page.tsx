"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BadgeCheck, MapPin, Phone, ShieldCheck, MessageCircle, Briefcase, Star, Wallet } from "lucide-react";
import BackButton from "@/components/BackButton";
import CategoryIcon from "@/components/CategoryIcon";
import ProviderAvatar from "@/components/ProviderAvatar";
import ReviewsSection from "@/components/ReviewsSection";
import { AvailabilityBadge, Card, ErrorBox, PrimaryButton, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getProvider, rpc, toError } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import { clearQueryCache, useQuery } from "@/lib/useQuery";
import { formatFcfa, formatPhone, MODE_LABELS, telLink, whatsappLink } from "@/lib/contact";
import type { Provider } from "@/lib/types";

function ProviderView({ id }: { id: string }) {
  const router = useRouter();
  const { user, profile, providerId } = useAuth();
  const { data: provider, loading, error } = useQuery<Provider | null>(`prov:${id}`, () => getProvider(id));

  const [problem, setProblem] = useState("");
  const [quartier, setQuartier] = useState("");
  const [mode, setMode] = useState("");
  const [units, setUnits] = useState(1);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  if (loading && provider === undefined) {
    return (
      <main className="pb-6">
        <header className="h-40 rounded-b-[2rem] bg-brand" />
        <div className="relative z-10 -mt-14 space-y-4 px-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-72" />
        </div>
      </main>
    );
  }

  if (!provider) {
    return (
      <main className="p-8 text-center">
        <p className="mt-20 text-lg font-semibold">{error || "Prestataire introuvable"}</p>
        <Link href="/dashboard" className="mt-4 inline-block font-semibold text-brand underline">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  const category = getCategory(provider.category_slug);
  const isFixed = provider.pricing_type === "fixe" && provider.price;
  const isOwner = providerId === provider.id;
  const selectedMode = mode || provider.service_modes[0] || "";
  const total = isFixed ? provider.price! * units : 0;

  const message = [
    `Bonjour ${provider.full_name}, je vous contacte via l'application Defar ko.`,
    quartier && `Mon quartier : ${quartier}`,
    selectedMode && `Service souhaité : ${MODE_LABELS[selectedMode] ?? selectedMode}`,
    `Mon besoin : ${problem.trim() || "à préciser"}`,
    isFixed ? `Tarif affiché : ${formatFcfa(provider.price!)}/${provider.price_unit}` : "Pouvez-vous me donner une idée du prix ?",
  ]
    .filter(Boolean)
    .join("\n");

  async function requestIntervention() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/prestataire/${id}`)}`);
      return;
    }
    if (problem.trim().length < 3) {
      setFormError("Décris ton besoin en quelques mots.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const reqId = await rpc<string>("create_request", {
        p_provider: provider!.id,
        p_description: problem,
        p_mode: selectedMode,
        p_quartier: quartier || null,
        p_units: isFixed ? units : 1,
      });
      clearQueryCache("requests:");
      router.push(`/demande/${reqId}`);
    } catch (e) {
      setFormError(toError(e));
      setBusy(false);
    }
  }

  const unavailable = provider.availability === "hors_service";

  return (
    <main className="pb-6">
      <header className="flex items-center gap-3 rounded-b-[2rem] bg-brand px-5 pb-28 pt-8 text-white">
        <BackButton fallback={`/categorie/${provider.category_slug}`} />
        {category && (
          <span className="flex items-center gap-2 text-sm font-medium text-white/85">
            <CategoryIcon slug={provider.category_slug} size={24} /> {category.name}
          </span>
        )}
      </header>

      <section className="relative z-10 -mt-12 space-y-4 px-5">
        {provider.status !== "verifie" && (
          <p className="fade-up rounded-2xl bg-accent/25 px-4 py-3 text-sm font-medium text-[#8a5a00]">
            {provider.status === "en_attente"
              ? "Ce profil est en attente de vérification : il n'est pas encore visible du public."
              : "Ce profil est suspendu."}
          </p>
        )}

        <Card className="fade-up text-center">
          <div className="-mt-14 flex justify-center">
            <div className="pop rounded-full border-4 border-white bg-white">
              <ProviderAvatar name={provider.full_name} url={provider.photo_url} size={84} />
            </div>
          </div>
          <h1 className="mt-2 flex items-center justify-center gap-1.5 text-xl font-bold">
            {provider.full_name}
            {provider.status === "verifie" && <BadgeCheck size={20} className="text-sky" aria-label="Vérifié" />}
          </h1>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-sm text-foreground/60">
            <MapPin size={14} /> {provider.quartier}, {provider.ville}
          </p>
          <div className="mt-2">
            <AvailabilityBadge value={provider.availability} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-[#f3f6fd] py-2.5">
              <p className="flex items-center justify-center gap-1 font-bold">
                <Star size={14} className="fill-accent text-accent" />
                {provider.reviews_count > 0 ? provider.rating.toFixed(1) : "Nouveau"}
              </p>
              <p className="text-xs text-foreground/55">{provider.reviews_count} avis</p>
            </div>
            <div className="rounded-2xl bg-[#f3f6fd] py-2.5">
              <p className="flex items-center justify-center gap-1 font-bold">
                <Briefcase size={14} /> {provider.years_experience} ans
              </p>
              <p className="text-xs text-foreground/55">d&apos;expérience</p>
            </div>
            <div className="rounded-2xl bg-[#f3f6fd] py-2.5">
              {isFixed ? (
                <>
                  <p className="text-sm font-bold text-success">{formatFcfa(provider.price!)}</p>
                  <p className="text-xs text-foreground/55">/{provider.price_unit}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-accent">Sur devis</p>
                  <p className="text-xs text-foreground/55">prix négocié</p>
                </>
              )}
            </div>
          </div>

          {provider.bio && <p className="mt-4 text-left text-sm leading-relaxed text-foreground/80">{provider.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {provider.service_modes.map((m) => (
              <span key={m} className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                {MODE_LABELS[m] ?? m}
              </span>
            ))}
          </div>
          {!isFixed && provider.diagnostic_fee > 0 && (
            <p className="mt-3 rounded-2xl bg-[#f3f6fd] px-3 py-2 text-left text-xs text-foreground/70">
              Déplacement et diagnostic : <b>{formatFcfa(provider.diagnostic_fee)}</b>. Le prix final est fixé après le diagnostic, et ce montant est
              déduit du total.
            </p>
          )}
        </Card>

        {isOwner ? (
          <Card className="fade-up text-center text-sm">
            <p className="font-semibold">C&apos;est ton profil.</p>
            <Link href="/espace-prestataire" className="mt-2 inline-block font-semibold text-brand underline">
              Modifier mon profil
            </Link>
          </Card>
        ) : (
          <Card className="fade-up">
            <h2 className="font-bold">Décris ton besoin</h2>
            <p className="mb-3 text-xs text-foreground/55">Le message WhatsApp sera prérempli avec ces informations.</p>
            <div className="space-y-3">
              <input
                value={quartier}
                onChange={(e) => setQuartier(e.target.value)}
                placeholder="Ton quartier"
                className="w-full rounded-2xl border border-brand/15 bg-[#f3f6fd] px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {provider.service_modes.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {provider.service_modes.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMode(m)}
                      className={`press rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        selectedMode === m ? "bg-brand text-white" : "bg-[#f3f6fd] text-foreground/70"
                      }`}
                    >
                      {MODE_LABELS[m] ?? m}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Explique ton problème en quelques mots…"
                rows={3}
                className="w-full rounded-2xl border border-brand/15 bg-[#f3f6fd] px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {isFixed && (
                <div className="flex items-center justify-between rounded-2xl bg-[#f3f6fd] px-4 py-2.5">
                  <span className="text-sm">Nombre de {provider.price_unit}s</span>
                  <div className="flex items-center gap-3">
                    <button type="button" aria-label="Moins" onClick={() => setUnits((u) => Math.max(1, u - 1))} className="press h-8 w-8 rounded-full bg-white text-lg font-bold shadow">
                      −
                    </button>
                    <span className="w-6 text-center font-bold">{units}</span>
                    <button type="button" aria-label="Plus" onClick={() => setUnits((u) => Math.min(20, u + 1))} className="press h-8 w-8 rounded-full bg-white text-lg font-bold shadow">
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <a
                href={whatsappLink(provider.phone, message)}
                target="_blank"
                rel="noopener noreferrer"
                className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-3.5 font-semibold text-white"
              >
                <MessageCircle size={20} /> Écrire sur WhatsApp
              </a>
              <a href={telLink(provider.phone)} className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-semibold text-white">
                <Phone size={20} /> Appeler · {formatPhone(provider.phone)}
              </a>
            </div>

            <div className="mt-5 rounded-2xl border border-sky/40 bg-sky/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={18} className="text-brand" /> Paiement sécurisé et garanti
              </p>
              <p className="mt-1 text-xs text-foreground/65">
                Passe par une demande Defar ko : ton paiement est gardé jusqu&apos;à la fin du travail, et tu es remboursé si l&apos;ouvrier ne vient
                pas.
              </p>
              <ErrorBox message={formError} />
              <PrimaryButton type="button" onClick={requestIntervention} disabled={busy || unavailable} className="mt-3">
                <Wallet size={18} />
                {busy
                  ? "Création…"
                  : unavailable
                    ? "Actuellement hors service"
                    : isFixed
                      ? `Réserver · ${formatFcfa(total)}`
                      : "Demander une intervention"}
              </PrimaryButton>
              {!user && <p className="mt-2 text-center text-xs text-foreground/55">Un compte gratuit est demandé pour payer en sécurité.</p>}
              {profile?.role === "admin" && <p className="mt-2 text-center text-xs text-foreground/55">Vue administrateur</p>}
            </div>
          </Card>
        )}

        <ReviewsSection providerId={provider.id} rating={provider.rating} count={provider.reviews_count} />
      </section>
    </main>
  );
}

function ProviderRoute() {
  const params = useParams<{ id: string }>();
  return <ProviderView id={params.id} />;
}

export default function ProviderPage() {
  return (
    <Suspense fallback={null}>
      <ProviderRoute />
    </Suspense>
  );
}
