"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import ConfirmButton from "@/components/ConfirmButton";
import ProviderForm, { type ProviderFormValues } from "@/components/ProviderForm";
import RequireAuth from "@/components/RequireAuth";
import { Card, ErrorBox, InfoBox, Skeleton } from "@/components/ui";
import { getProvider, rpc, toError } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { clearQueryCache, useQuery } from "@/lib/useQuery";
import type { useAuth } from "@/lib/auth";

type Auth = ReturnType<typeof useAuth>;

function Inner({ id, auth }: { id: string; auth: Auth }) {
  const router = useRouter();
  const { data: provider, loading, reload } = useQuery(`prov:${id}`, () => getProvider(id));
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  async function save(v: ProviderFormValues) {
    const sb = getSupabase();
    if (!sb || !provider) throw new Error("Connexion Supabase indisponible.");
    const { status, ...rest } = v;
    const { error } = await sb.from("providers").update(rest).eq("id", id);
    if (error) throw new Error("Impossible d'enregistrer. Vérifie les informations.");
    if (status && status !== provider.status) await rpc("admin_set_provider_status", { p_provider: id, p_status: status });
    clearQueryCache("admin:");
    clearQueryCache("cat:");
    clearQueryCache("counts");
    await reload();
    setInfo("Modifications enregistrées.");
  }

  async function remove() {
    const sb = getSupabase();
    if (!sb) return;
    setError("");
    const { error } = await sb.from("providers").delete().eq("id", id);
    if (error) {
      setError("Suppression impossible : des demandes existent pour cet ouvrier. Suspends-le plutôt.");
      return;
    }
    clearQueryCache("admin:");
    clearQueryCache("cat:");
    clearQueryCache("counts");
    router.replace("/admin?tab=ouvriers");
  }

  return (
    <main className="pb-6">
      <header className="rounded-b-[2rem] bg-brand px-5 pb-10 pt-8 text-white">
        <div className="flex items-center gap-3">
          <BackButton fallback="/admin?tab=ouvriers" />
          <h1 className="text-xl font-bold">Modifier l&apos;ouvrier</h1>
        </div>
      </header>
      <section className="relative z-10 -mt-6 space-y-4 px-5">
        {loading && !provider ? (
          <Skeleton className="h-64" />
        ) : !provider ? (
          <p className="text-center text-sm">Ouvrier introuvable.</p>
        ) : (
          <>
            <Card className="fade-up">
              <InfoBox message={info} />
              <div className={info ? "mt-3" : ""}>
                <ProviderForm key={provider.id + provider.status} initial={provider} submitLabel="Enregistrer" uploadFolder={auth.user!.id} showStatus onSubmit={save} />
              </div>
            </Card>
            <Card className="fade-up space-y-2">
              <ErrorBox message={error} />
              <ConfirmButton tone="ghost" label="Supprimer cet ouvrier" confirmLabel="Appuie encore pour supprimer" onConfirm={remove} />
              <p className="text-center text-xs text-foreground/50">Pour garder l&apos;historique, préfère « Suspendu ».</p>
            </Card>
          </>
        )}
      </section>
    </main>
  );
}

function Route() {
  const params = useParams<{ id: string }>();
  return <RequireAuth role="admin">{(auth) => <Inner id={params.id} auth={auth} />}</RequireAuth>;
}

export default function AdminProviderPage() {
  return (
    <Suspense fallback={null}>
      <Route />
    </Suspense>
  );
}
