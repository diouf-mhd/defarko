"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import BackButton from "@/components/BackButton";
import ProviderForm, { type ProviderFormValues } from "@/components/ProviderForm";
import RequireAuth from "@/components/RequireAuth";
import { Card } from "@/components/ui";
import { rpc } from "@/lib/api";
import { clearQueryCache } from "@/lib/useQuery";
import type { useAuth } from "@/lib/auth";

type Auth = ReturnType<typeof useAuth>;

function Inner({ auth }: { auth: Auth }) {
  const router = useRouter();

  useEffect(() => {
    if (auth.providerId) router.replace("/espace-prestataire");
  }, [auth.providerId, router]);

  const cat = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("cat") : null;

  async function submit(v: ProviderFormValues) {
    await rpc("become_provider", {
      p_full_name: v.full_name,
      p_category: v.category_slug,
      p_bio: v.bio,
      p_years: v.years_experience,
      p_quartier: v.quartier,
      p_ville: v.ville,
      p_modes: v.service_modes,
      p_diag_fee: v.diagnostic_fee,
      p_pricing: v.pricing_type,
      p_price: v.price,
      p_unit: v.price_unit,
      p_phone: v.phone,
      p_photo: v.photo_url,
    });
    clearQueryCache();
    await auth.refresh();
    router.replace("/espace-prestataire");
  }

  return (
    <main className="pb-6">
      <header className="rounded-b-[2.5rem] bg-brand px-6 pb-14 pt-8 text-white">
        <div className="flex items-center gap-3">
          <BackButton fallback="/compte" />
          <h1 className="text-xl font-bold">Devenir prestataire</h1>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-white/85">
          {["Inscription gratuite, sans abonnement", "Les clients t'écrivent ou t'appellent directement", "Tu es payé en sécurité après chaque service"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check size={16} className="text-accent" /> {t}
            </li>
          ))}
        </ul>
      </header>
      <section className="relative z-10 -mt-8 px-5">
        <Card className="fade-up">
          <ProviderForm
            initial={{ full_name: auth.profile?.full_name ?? "", phone: auth.profile?.phone ?? "", category_slug: cat ?? "" }}
            submitLabel="Envoyer mon inscription"
            uploadFolder={auth.user!.id}
            onSubmit={submit}
          />
          <p className="mt-4 text-center text-xs text-foreground/55">Ton profil sera visible après vérification par l&apos;équipe Defar ko.</p>
        </Card>
      </section>
    </main>
  );
}

export default function BecomeProviderPage() {
  return <RequireAuth>{(auth) => <Inner auth={auth} />}</RequireAuth>;
}
