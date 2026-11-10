"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Retour en arrière : utilise l'historique du navigateur, donc le bouton « retour » du téléphone
 * (Android / geste iOS) fait exactement la même chose. S'il n'y a pas d'historique, va à `fallback`.
 */
export default function BackButton({ fallback = "/dashboard", className = "" }: { fallback?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Retour"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={`press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ${className}`}
    >
      <ArrowLeft size={20} />
    </button>
  );
}
