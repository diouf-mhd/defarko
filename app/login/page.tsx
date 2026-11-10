"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import Field from "@/components/Field";
import { ErrorBox, PrimaryButton } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { safeNext } from "@/lib/nav";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => setSearch(window.location.search), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const sb = getSupabase();
    if (!sb) {
      setError("Service momentanément indisponible. Réessaie plus tard.");
      return;
    }
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(/confirm/i.test(error.message) ? "Confirme d'abord ton email (vérifie ta boîte mail)." : "Email ou mot de passe incorrect.");
      setBusy(false);
      return;
    }
    // replace : le bouton retour ne ramène pas sur la page de connexion
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
  }

  return (
    <AuthShell title="Connexion" subtitle="Content de te revoir ! Connecte-toi pour suivre tes demandes.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemple@gmail.com" />
        <Field
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ton mot de passe"
        />
        <ErrorBox message={error} />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </PrimaryButton>
      </form>
      <p className="mt-5 text-center text-sm text-foreground/70">
        Pas encore de compte ?{" "}
        <Link href={`/register${search}`} className="font-semibold text-brand underline">
          Créer un compte
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-foreground/50">
        <Link href="/dashboard" className="underline">
          Continuer sans compte
        </Link>{" "}
        pour consulter les ouvriers
      </p>
    </AuthShell>
  );
}
