"use client";

import { Star } from "lucide-react";
import { TONE_CLASSES, type Tone } from "@/lib/status";
import type { Availability } from "@/lib/types";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-10 ${className}`} role="status" aria-label="Chargement">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} />;
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="fade-up rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
      {message}
    </p>
  );
}

export function InfoBox({ message, tone = "green" }: { message: string; tone?: "green" | "blue" | "orange" }) {
  if (!message) return null;
  const cls = { green: "bg-green-50 text-green-700", blue: "bg-brand/10 text-brand", orange: "bg-accent/20 text-[#8a5a00]" }[tone];
  return <p className={`fade-up rounded-xl px-3 py-2 text-sm ${cls}`}>{message}</p>;
}

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>{children}</span>;
}

const AVAIL: Record<Availability, { label: string; dot: string; text: string }> = {
  disponible: { label: "Disponible", dot: "bg-success", text: "text-[#12742b]" },
  occupe: { label: "Occupé", dot: "bg-accent", text: "text-[#8a5a00]" },
  hors_service: { label: "Hors service", dot: "bg-gray-400", text: "text-gray-500" },
};

export function AvailabilityBadge({ value }: { value: Availability }) {
  const a = AVAIL[value];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${a.text}`}>
      <span className={`h-2 w-2 rounded-full ${a.dot} ${value === "disponible" ? "animate-pulse" : ""}`} />
      {a.label}
    </span>
  );
}

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  disponible: "Disponible",
  occupe: "Occupé",
  hors_service: "Hors service",
};

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-accent text-accent" : "text-gray-300"} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
          onClick={() => onChange(i)}
          className="press p-1"
        >
          <Star size={30} className={`transition-colors ${i <= value ? "fill-accent text-accent" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card-shadow rounded-3xl bg-white p-5 ${className}`}>{children}</div>;
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`press flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-base font-semibold text-white disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
