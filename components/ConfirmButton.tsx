"use client";

import { useEffect, useState } from "react";

/** Bouton en deux temps : un premier appui demande confirmation, un second exécute l'action. */
export default function ConfirmButton({
  label,
  confirmLabel = "Appuie encore pour confirmer",
  onConfirm,
  disabled,
  tone = "brand",
  className = "",
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  tone?: "brand" | "success" | "danger" | "ghost";
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const base = {
    brand: "bg-brand text-white",
    success: "bg-success text-white",
    danger: "bg-red-600 text-white",
    ghost: "bg-white text-red-600 border border-red-200",
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={`press w-full rounded-2xl py-3.5 text-base font-semibold transition-all disabled:opacity-60 ${base} ${armed ? "ring-4 ring-accent/50" : ""} ${className}`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
