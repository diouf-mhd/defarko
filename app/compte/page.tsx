"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ClipboardList, Hammer, LogOut, ShieldCheck, Store } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { isValidPhone, toE164 } from "@/lib/contact";
import { toError } from "@/lib/api";
import Field from "@/components/Field";
import Logo from "@/components/Logo";
import { Card, ErrorBox, InfoBox, PrimaryButton, Spinner } from "@/components/ui";

const ROLE_LABEL = { client: "Client", prestataire: "Prestataire", admin: "Administrateur" } as const;

function MenuLink({ href, Icon, label, hint }: { href: string; Icon: typeof Hammer; label: string; hint?: string }) {
  return (
    <Link href={href} className="press flex items-center gap-3 rounded-2xl bg-[#f3f6fd] p-3.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon size={20} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-foreground/55">{hint}</span>}
      </span>
      <ChevronRight size={18} className="text-foreground/30" />
    </Link>
  );
}

export default function ComptePage() {
  const router = useRouter();
  const { user, profile, providerId, providerStatus, loading, signOut, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  if (loading) return <Spinner className="min-h-[60vh]" />;

  if (!user) {
    return (
      <main className="px-5 pt-16 text-center">
        <Logo size={88} className="mx-auto" />
        <h1 className="mt-4 text-2xl font-bold">Ton compte Defar ko</h1>
        <p className="mt-1 text-sm text-foreground/60">Connecte-toi pour suivre tes demandes et payer en sécurité.</p>
        <div className="mx-auto mt-6 max-w-xs space-y-2">
          <Link href="/login" className="press block rounded-2xl bg-brand py-3.5 font-semibold text-white">
            Se connecter
          </Link>
          <Link href="/register" className="press block rounded-2xl bg-white py-3.5 font-semibold text-brand card-shadow">
            Créer un compte
          </Link>
        </div>
      </main>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (fullName.trim().length < 3) return setError("Entre ton nom complet.");
    if (phone && !isValidPhone(phone)) return setError("Numéro de téléphone invalide.");
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error } = await sb
      .from("defarko_profiles")
      .update({ full_name: fullName.trim(), phone: phone ? toE164(phone) : null })
      .eq("id", user!.id);
    setBusy(false);
    if (error) return setError(toError(error));
    await refresh();
    setInfo("Informations enregistrées.");
  }

  return (
    <main className="pb-6">
      <header className="rounded-b-[2.5rem] bg-brand px-6 pb-14 pt-10 text-white">
        <p className="text-sm text-white/75">Mon compte</p>
        <h1 className="text-2xl font-bold">{profile?.full_name || user.email}</h1>
        <p className="mt-1 text-sm text-white/75">
          {user.email} · {profile ? ROLE_LABEL[profile.role] : ""}
        </p>
      </header>

      <section className="relative z-10 -mt-8 space-y-4 px-5">
        <Card className="fade-up space-y-2">
          <MenuLink href="/demandes" Icon={ClipboardList} label="Mes demandes" hint="Suivi, paiements et avis" />
          {providerId ? (
            <MenuLink
              href="/espace-prestataire"
              Icon={Store}
              label="Mon espace prestataire"
              hint={providerStatus === "verifie" ? "Profil vérifié" : providerStatus === "suspendu" ? "Profil suspendu" : "En attente de vérification"}
            />
          ) : (
            <MenuLink href="/devenir-prestataire" Icon={Hammer} label="Devenir prestataire" hint="Inscris-toi gratuitement comme ouvrier" />
          )}
          {profile?.role === "admin" && <MenuLink href="/admin" Icon={ShieldCheck} label="Administration" hint="Ouvriers, paiements, litiges" />}
        </Card>

        <Card className="fade-up">
          <h2 className="mb-3 font-bold">Mes informations</h2>
          <form onSubmit={save} className="space-y-3">
            <Field label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Field label="Téléphone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 000 00 00" />
            <ErrorBox message={error} />
            <InfoBox message={info} />
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </PrimaryButton>
          </form>
        </Card>

        <button
          onClick={async () => {
            await signOut();
            router.replace("/dashboard");
          }}
          className="press flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-semibold text-red-600 card-shadow"
        >
          <LogOut size={18} /> Se déconnecter
        </button>
      </section>
    </main>
  );
}
