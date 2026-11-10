"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Eye, Hourglass, ShieldCheck, ShieldOff } from "lucide-react";
import BackButton from "@/components/BackButton";
import ProviderForm, { type ProviderFormValues } from "@/components/ProviderForm";
import RequireAuth from "@/components/RequireAuth";
import { AVAILABILITY_LABELS, Card, InfoBox, Skeleton } from "@/components/ui";
import { getProvider } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { clearQueryCache, useQuery } from "@/lib/useQuery";
import type { useAuth } from "@/lib/auth";
import type { Availability, Provider } from "@/lib/types";

type Auth = ReturnType<typeof useAuth>;

const STATUS_BANNER = {
  en_attente: { Icon: Hourglass, cls: "bg-accent/25 text-[#8a5a00]", text: "Ton profil est en attente de vérification. Il sera visible des clients dès qu'il sera validé." },
  verifie: { Icon: ShieldCheck, cls: "bg-success/15 text-[#12742b]", text: "Ton profil est vérifié et visible des clients." },
  suspendu: { Icon: ShieldOff, cls: "bg-red-100 text-red-700", text: "Ton profil est suspendu. Contacte l'équipe Defar ko." },
} as const;

function Inner({ auth }: { auth: Auth }) {
  const providerId = auth.providerId;
  const { data: provider, loading, mutate, reload } = useQuery<Provider | null>(providerId ? `prov:${providerId}` : null, () => getProvider(providerId!));
  const [info, setInfo] = useState("");
  const [availError, setAvailError] = useState("");

  if (!providerId) {
    return (
      <main className="p-8 text-center">
        <p className="mt-16 text-lg font-semibold">Tu n&apos;as pas encore de profil prestataire.</p>
        <Link href="/devenir-prestataire" className="mt-4 inline-block font-semibold text-brand underline">
          Devenir prestataire
        </Link>
      </main>
    );
  }

  async function setAvailability(a: Availability) {
    const sb = getSupabase();
    if (!sb || !provider) return;
    const previous = provider;
    mutate({ ...provider, availability: a }); // affichage immédiat
    setAvailError("");
    const { error } = await sb.from("providers").update({ availability: a }).eq("id", provider.id);
    if (error) {
      mutate(previous);
      setAvailError("Impossible de changer ta disponibilité.");
    } else {
      clearQueryCache("cat:");
    }
  }

  async function save(v: ProviderFormValues) {
    const sb = getSupabase();
    if (!sb) throw new Error("L'application n'est pas encore connectée à Supabase.");
    const { error } = await sb.from("providers").update(v).eq("id", providerId!);
    if (error) throw new Error("Impossible d'enregistrer. Vérifie les informations.");
    clearQueryCache("cat:");
    await reload();
    await auth.refresh();
    setInfo("Profil mis à jour.");
  }

  return (
    <main className="pb-6">
      <header className="rounded-b-[2.5rem] bg-brand px-6 pb-8 pt-8 text-white">
        <div className="flex items-center gap-3">
          <BackButton fallback="/compte" />
          <h1 className="text-xl font-bold">Mon espace prestataire</h1>
        </div>
      </header>

      <section className="relative z-10 mt-4 space-y-4 px-5">
        {loading && !provider ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
          </>
        ) : provider ? (
          <>
            {(() => {
              const b = STATUS_BANNER[provider.status];
              return (
                <p className={`fade-up flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${b.cls}`}>
                  <b.Icon size={18} className="mt-0.5 shrink-0" /> {b.text}
                </p>
              );
            })()}

            <Card className="fade-up">
              <h2 className="font-bold">Ma disponibilité</h2>
              <p className="mb-3 text-xs text-foreground/55">Les clients voient ton statut en temps réel.</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvailability(a)}
                    className={`press rounded-2xl py-3 text-sm font-semibold transition-colors ${
                      provider.availability === a
                        ? a === "disponible"
                          ? "bg-success text-white"
                          : a === "occupe"
                            ? "bg-accent text-white"
                            : "bg-gray-500 text-white"
                        : "bg-[#f3f6fd] text-foreground/60"
                    }`}
                  >
                    {AVAILABILITY_LABELS[a]}
                  </button>
                ))}
              </div>
              {availError && <p className="mt-2 text-sm text-red-600">{availError}</p>}
            </Card>

            <div className="fade-up grid grid-cols-2 gap-3">
              <Link href="/demandes" className="press card-shadow flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-semibold">
                <ClipboardList size={20} className="text-brand" /> Demandes reçues
              </Link>
              <Link href={`/prestataire/${provider.id}`} className="press card-shadow flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-semibold">
                <Eye size={20} className="text-brand" /> Voir ma fiche
              </Link>
            </div>

            <Card className="fade-up">
              <h2 className="mb-4 font-bold">Mon profil</h2>
              <InfoBox message={info} />
              <div className={info ? "mt-3" : ""}>
                <ProviderForm key={provider.id} initial={provider} submitLabel="Enregistrer" uploadFolder={auth.user!.id} onSubmit={save} />
              </div>
              <p className="mt-3 text-xs text-foreground/50">Si tu changes de métier, ton profil repasse en vérification.</p>
            </Card>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function ProviderSpacePage() {
  return <RequireAuth>{(auth) => <Inner auth={auth} />}</RequireAuth>;
}
