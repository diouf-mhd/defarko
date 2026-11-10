"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Field from "@/components/Field";
import { ErrorBox, InfoBox, PrimaryButton } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");
    if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas.");

    const sb = getSupabase();
    if (!sb) return setError("Service momentanément indisponible. Réessaie plus tard.");

    setBusy(true);
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      setError("Le lien est invalide ou expiré. Demande un nouveau lien de réinitialisation.");
      setBusy(false);
      return;
    }

    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      setError("Impossible de modifier le mot de passe. Demande un nouveau lien et réessaie.");
      setBusy(false);
      return;
    }

    await sb.auth.signOut();
    setComplete(true);
    setBusy(false);
  }

  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisis un mot de passe d'au moins 6 caractères.">
      {complete ? (
        <>
          <InfoBox message="Ton mot de passe a été modifié. Tu peux maintenant te connecter." />
          <Link href="/login" className="mt-4 block text-center font-semibold text-brand underline">
            Se connecter
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Au moins 6 caractères"
          />
          <Field
            label="Confirmer le mot de passe"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Répète ton mot de passe"
          />
          <ErrorBox message={error} />
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? "Modification…" : "Enregistrer le mot de passe"}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}