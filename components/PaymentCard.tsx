"use client";

import { useState } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { formatFcfa, waveLink } from "@/lib/contact";
import { PAYMENT_KIND_LABEL } from "@/lib/status";
import type { Payment } from "@/lib/types";
import { PrimaryButton } from "./ui";

/** Carte de paiement Wave : le client paie, puis déclare son paiement. L'équipe vérifie dans Wave Business. */
export default function PaymentCard({
  payment,
  busy,
  onDeclare,
}: {
  payment: Payment;
  busy: boolean;
  onDeclare: (reference: string) => void;
}) {
  const [reference, setReference] = useState("");
  const link = waveLink(payment.amount);

  if (payment.status === "declare") {
    return (
      <div className="fade-up flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/15 p-4">
        <Clock size={20} className="mt-0.5 shrink-0 text-[#8a5a00]" />
        <div className="text-sm">
          <p className="font-semibold">Paiement en cours de vérification</p>
          <p className="mt-0.5 text-foreground/70">
            {PAYMENT_KIND_LABEL[payment.kind]} : {formatFcfa(payment.amount)}. L&apos;équipe Defar ko vérifie ton paiement Wave (quelques minutes).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up rounded-2xl border border-sky/40 bg-sky/10 p-4">
      <p className="text-sm font-semibold">{PAYMENT_KIND_LABEL[payment.kind]}</p>
      <p className="text-3xl font-extrabold tracking-tight">{formatFcfa(payment.amount)}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground/75">
        <li>
          Clique sur <b>Payer avec Wave</b> et paie exactement <b>{formatFcfa(payment.amount)}</b>.
        </li>
        <li>
          Reviens ici et clique sur <b>J&apos;ai payé</b>.
        </li>
      </ol>

      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky py-3.5 font-semibold text-white"
        >
          Payer avec Wave
        </a>
      ) : (
        <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs text-foreground/60">
          Lien de paiement non configuré (<code>NEXT_PUBLIC_WAVE_BASE_URL</code>).
        </p>
      )}

      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Référence de la transaction Wave (facultatif)"
        className="mt-3 w-full rounded-2xl border border-brand/15 bg-white px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <PrimaryButton type="button" disabled={busy} onClick={() => onDeclare(reference)} className="mt-2">
        J&apos;ai payé
      </PrimaryButton>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-foreground/55">
        <ShieldCheck size={13} /> Ton argent est gardé par Defar ko jusqu&apos;à la fin du travail.
      </p>
    </div>
  );
}
