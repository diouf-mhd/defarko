"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Field from "@/components/Field";
import { ErrorBox, InfoBox, PrimaryButton } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    const sb = getSupabase();
    if (!sb) return setError("Service momentanément indisponible. Réessaie plus tard.");

    setBusy(true);
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError("Impossible d'envoyer le lien. Réessaie plus tard.");
    } else {
      setInfo("Si un compte existe pour cette adresse, un e-mail de réinitialisation a été envoyé. Vérifie aussi tes courriers indésirables.");
    }
    setBusy(false);
  }

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Reçois un lien pour choisir un nouveau mot de passe.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Email du compte"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemple@gmail.com"
        />
        <ErrorBox message={error} />
        <InfoBox message={info} />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Envoi…" : "Envoyer le lien"}
        </PrimaryButton>
      </form>
      <p className="mt-5 text-center text-sm text-foreground/70">
        <Link href="/login" className="font-semibold text-brand underline">
          Retour à la connexion
        </Link>
      </p>
    </AuthShell>
  );
}