"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import Field from "@/components/Field";
import { ErrorBox, InfoBox, PrimaryButton } from "@/components/ui";
import { getSupabase } from "@/lib/supabase";
import { isValidPhone, toE164 } from "@/lib/contact";
import { safeNext } from "@/lib/nav";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const search = searchParams.toString();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    const sb = getSupabase();
    if (!sb) return setError("Service momentanément indisponible. Réessaie plus tard.");
    if (fullName.trim().length < 3) return setError("Entre ton nom complet.");
    if (!isValidPhone(phone)) return setError("Numéro de téléphone invalide (ex. 77 000 00 00).");
    if (password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");
    if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas.");

    setBusy(true);
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), phone: toE164(phone) } },
    });
    if (error) {
      setError(/registered|already/i.test(error.message) ? "Un compte existe déjà avec cet email." : "Impossible de créer le compte. Vérifie tes informations.");
      setBusy(false);
      return;
    }
    if (data.session) {
      router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    } else {
      setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.");
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Créer un compte" subtitle="Gratuit, en quelques secondes.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nom complet" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Moussa Diouf" />
        <Field label="Téléphone" type="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="77 000 00 00" />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemple@gmail.com" />
        <Field
          label="Mot de passe"
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
        <InfoBox message={info} />
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "Création…" : "Créer mon compte"}
        </PrimaryButton>
      </form>
      <p className="mt-5 text-center text-sm text-foreground/70">
        Déjà un compte ?{" "}
        <Link href={search ? `/login?${search}` : "/login"} className="font-semibold text-brand underline">
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
