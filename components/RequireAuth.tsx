"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { Spinner } from "./ui";

type Auth = ReturnType<typeof useAuth>;

/** Exige une connexion (et éventuellement un rôle). Redirige vers /login puis revient sur la page demandée. */
export default function RequireAuth({
  role,
  children,
}: {
  role?: Role;
  children: (auth: Auth) => React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      const next = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [auth.loading, auth.user, router]);

  if (auth.loading || !auth.user) return <Spinner className="min-h-[60vh]" />;

  if (role && auth.profile?.role !== role) {
    return (
      <main className="p-8 text-center">
        <p className="mt-20 text-4xl">🔒</p>
        <p className="mt-3 text-lg font-semibold">Accès réservé</p>
        <p className="mt-1 text-sm text-foreground/60">Tu n&apos;as pas les droits pour voir cette page.</p>
        <Link href="/dashboard" className="mt-5 inline-block font-semibold text-brand underline">
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }
  return <>{children(auth)}</>;
}
