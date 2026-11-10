"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, MessageCircle, Phone } from "lucide-react";
import BackButton from "@/components/BackButton";
import CategoryIcon from "@/components/CategoryIcon";
import ConfirmButton from "@/components/ConfirmButton";
import PaymentCard from "@/components/PaymentCard";
import ProviderAvatar from "@/components/ProviderAvatar";
import RequireAuth from "@/components/RequireAuth";
import { ReviewForm } from "@/components/ReviewsSection";
import StatusBadge from "@/components/StatusBadge";
import { Card, ErrorBox, PrimaryButton, Skeleton } from "@/components/ui";
import Field from "@/components/Field";
import { getRequest, hasReviewed, rpc, toError } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import { formatDateTime, formatFcfa, formatPhone, MODE_LABELS, telLink, whatsappLink } from "@/lib/contact";
import { nextStepText, PAYMENT_KIND_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/status";
import { clearQueryCache, useQuery } from "@/lib/useQuery";
import type { useAuth } from "@/lib/auth";

type Auth = ReturnType<typeof useAuth>;

const CANCELABLE = ["nouvelle", "diagnostic_a_payer", "devis_propose", "paiement_a_faire"];
const DISPUTABLE = ["en_cours", "complement_demande", "a_confirmer", "termine"];

function RequestInner({ id, auth }: { id: string; auth: Auth }) {
  const { data: req, loading, error, reload } = useQuery(`request:${id}`, () => getRequest(id), { refreshMs: 15000 });
  const { data: reviewed, reload: reloadReviewed } = useQuery(`reviewed:${id}`, () => hasReviewed(id));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Formulaires de l'ouvrier
  const [quote, setQuote] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [extra, setExtra] = useState("");
  const [extraNote, setExtraNote] = useState("");
  // Litige
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      clearQueryCache("requests:");
      clearQueryCache("request:");
      await reload();
    } catch (e) {
      setErr(toError(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !req) {
    return (
      <main className="pb-6">
        <header className="h-28 rounded-b-[2rem] bg-brand" />
        <div className="relative z-10 -mt-8 space-y-4 px-5">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </main>
    );
  }

  if (!req) {
    return (
      <main className="p-8 text-center">
        <p className="mt-20 text-lg font-semibold">{error || "Demande introuvable"}</p>
        <Link href="/demandes" className="mt-4 inline-block font-semibold text-brand underline">
          Mes demandes
        </Link>
      </main>
    );
  }

  const isClient = req.client_id === auth.user!.id;
  const isProvider = !!auth.providerId && auth.providerId === req.provider_id;
  const viewer: "client" | "provider" | "admin" = isClient ? "client" : isProvider ? "provider" : "admin";
  const payments = req.payments ?? [];
  const paidTotal = payments.filter((p) => p.status === "paye").reduce((s, p) => s + p.amount, 0);
  const paidDiag = payments.filter((p) => p.kind === "diagnostic" && p.status === "paye").reduce((s, p) => s + p.amount, 0);
  const toPay = payments.filter((p) => p.status === "en_attente" || p.status === "declare");
  const proposedExtra = payments.find((p) => p.kind === "complement" && p.status === "propose");
  const category = getCategory(req.provider?.category_slug ?? "");

  const other =
    viewer === "client"
      ? { name: req.provider?.full_name, phone: req.provider?.phone }
      : { name: req.client?.full_name, phone: req.client?.phone };
  const contactMsg = `Bonjour, je vous contacte au sujet de la demande Defar ko : « ${req.description} »`;

  const canQuote = viewer === "provider" && ["nouvelle", "diagnostic_paye", "devis_propose"].includes(req.status);

  return (
    <main className="pb-6">
      <header className="rounded-b-[2rem] bg-brand px-5 pb-12 pt-8 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BackButton fallback="/demandes" />
            <h1 className="text-xl font-bold">Demande</h1>
          </div>
          <span className="rounded-full bg-white p-0.5">
            <StatusBadge status={req.status} />
          </span>
        </div>
      </header>

      <section className="relative z-10 -mt-8 space-y-4 px-5">
        {/* Résumé */}
        <Card className="fade-up">
          <div className="flex items-center gap-3">
            {viewer === "client" && req.provider ? (
              <Link href={`/prestataire/${req.provider.id}`} className="shrink-0">
                <ProviderAvatar name={req.provider.full_name} url={req.provider.photo_url} size={52} />
              </Link>
            ) : (
              <CategoryIcon slug={req.provider?.category_slug ?? ""} size={48} />
            )}
            <div className="min-w-0">
              <p className="truncate font-bold">{other.name || (viewer === "client" ? "Ouvrier" : "Client")}</p>
              <p className="text-xs text-foreground/55">
                {category?.name}
                {viewer === "admin" && req.provider ? ` · ${req.provider.full_name}` : ""}
              </p>
            </div>
          </div>

          <p className="mt-4 rounded-2xl bg-[#f3f6fd] p-3 text-sm leading-relaxed">{req.description}</p>
          <p className="mt-2 text-xs text-foreground/55">
            {[req.mode && MODE_LABELS[req.mode], req.quartier, formatDateTime(req.created_at)].filter(Boolean).join(" · ")}
          </p>

          <dl className="mt-4 space-y-1.5 text-sm">
            {req.diagnostic_fee > 0 && (
              <div className="flex justify-between">
                <dt className="text-foreground/60">Déplacement et diagnostic</dt>
                <dd className="font-semibold">{formatFcfa(req.diagnostic_fee)}</dd>
              </div>
            )}
            {req.quote_amount != null && (
              <div className="flex justify-between">
                <dt className="text-foreground/60">Prix final{req.units > 1 ? ` (${req.units} unités)` : ""}</dt>
                <dd className="font-semibold">{formatFcfa(req.quote_amount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-brand/10 pt-1.5">
              <dt className="text-foreground/60">Déjà payé</dt>
              <dd className="font-bold text-success">{formatFcfa(paidTotal)}</dd>
            </div>
          </dl>
        </Card>

        <p className="fade-up rounded-2xl bg-sky/15 px-4 py-3 text-sm font-medium text-brand">{nextStepText(viewer, req.status)}</p>
        <ErrorBox message={err} />

        {/* Contact de l'autre personne : numéro WhatsApp / appel direct */}
        {viewer !== "admin" && other.phone && !["annule"].includes(req.status) && (
          <div className="fade-up grid grid-cols-2 gap-2">
            <a
              href={whatsappLink(other.phone, contactMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="press flex items-center justify-center gap-2 rounded-2xl bg-success py-3 text-sm font-semibold text-white"
            >
              <MessageCircle size={18} /> WhatsApp
            </a>
            <a href={telLink(other.phone)} className="press flex items-center justify-center gap-2 rounded-2xl bg-brand py-3 text-sm font-semibold text-white">
              <Phone size={18} /> {formatPhone(other.phone)}
            </a>
          </div>
        )}

        {/* ---------- Actions du client ---------- */}
        {viewer === "client" && (
          <>
            {toPay.map((p) => (
              <PaymentCard
                key={p.id}
                payment={p}
                busy={busy}
                onDeclare={(reference) => run(() => rpc("declare_payment", { p_payment: p.id, p_reference: reference }))}
              />
            ))}

            {req.status === "devis_propose" && req.quote_amount != null && (
              <Card className="fade-up">
                <h2 className="font-bold">Prix final proposé</h2>
                <p className="mt-1 text-3xl font-extrabold">{formatFcfa(req.quote_amount)}</p>
                {req.quote_note && <p className="mt-2 rounded-2xl bg-[#f3f6fd] p-3 text-sm">{req.quote_note}</p>}
                {paidDiag > 0 && (
                  <p className="mt-2 text-sm text-foreground/65">
                    Diagnostic déjà payé : {formatFcfa(paidDiag)}. Il te restera <b>{formatFcfa(Math.max(req.quote_amount - paidDiag, 0))}</b> à payer.
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  <PrimaryButton disabled={busy} onClick={() => run(() => rpc("client_answer_quote", { p_request: req.id, p_accept: true }))}>
                    Accepter ce prix
                  </PrimaryButton>
                  <ConfirmButton tone="ghost" label="Refuser" disabled={busy} onConfirm={() => run(() => rpc("client_answer_quote", { p_request: req.id, p_accept: false }))} />
                </div>
              </Card>
            )}

            {req.status === "complement_demande" && proposedExtra && (
              <Card className="fade-up border-2 border-accent/50">
                <h2 className="font-bold">Complément demandé</h2>
                <p className="mt-1 text-3xl font-extrabold">{formatFcfa(proposedExtra.amount)}</p>
                {proposedExtra.note && <p className="mt-2 rounded-2xl bg-[#f3f6fd] p-3 text-sm">{proposedExtra.note}</p>}
                <p className="mt-2 text-xs text-foreground/55">L&apos;ouvrier ne peut rien ajouter au prix sans ton accord.</p>
                <div className="mt-4 space-y-2">
                  <PrimaryButton disabled={busy} onClick={() => run(() => rpc("client_answer_extra", { p_payment: proposedExtra.id, p_accept: true }))}>
                    Accepter le complément
                  </PrimaryButton>
                  <ConfirmButton tone="ghost" label="Refuser" disabled={busy} onConfirm={() => run(() => rpc("client_answer_extra", { p_payment: proposedExtra.id, p_accept: false }))} />
                </div>
              </Card>
            )}

            {["en_cours", "a_confirmer"].includes(req.status) && (
              <Card className="fade-up">
                <h2 className="font-bold">Le travail est-il terminé ?</h2>
                <p className="mb-3 mt-1 text-sm text-foreground/65">En confirmant, le paiement est reversé à l&apos;ouvrier. Vérifie que tout est bon.</p>
                <ConfirmButton tone="success" label="Oui, confirmer la fin du travail" disabled={busy} onConfirm={() => run(() => rpc("client_confirm_done", { p_request: req.id }))} />
              </Card>
            )}

            {["termine", "reverse"].includes(req.status) && reviewed === false && (
              <Card className="fade-up">
                <ReviewForm requestId={req.id} onDone={() => reloadReviewed()} />
              </Card>
            )}

            {CANCELABLE.includes(req.status) && paidTotal === 0 && (
              <ConfirmButton tone="ghost" label="Annuler la demande" disabled={busy} onConfirm={() => run(() => rpc("cancel_request", { p_request: req.id }))} />
            )}
          </>
        )}

        {/* ---------- Actions de l'ouvrier ---------- */}
        {viewer === "provider" && (
          <>
            {req.status === "diagnostic_a_payer" && (
              <p className="fade-up flex items-start gap-2 rounded-2xl bg-accent/20 px-4 py-3 text-sm text-[#8a5a00]">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" /> Ne te déplace pas avant que le diagnostic soit payé.
              </p>
            )}

            {canQuote && (
              <Card className="fade-up">
                <h2 className="font-bold">{req.status === "devis_propose" ? "Modifier mon prix final" : "Proposer le prix final"}</h2>
                <p className="mb-3 mt-1 text-xs text-foreground/55">Le client doit l&apos;accepter avant de payer. Le diagnostic payé sera déduit.</p>
                <div className="space-y-3">
                  <Field label="Prix final (FCFA)" type="number" inputMode="numeric" min={1} value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="15000" />
                  <Field label="Détail (facultatif)" value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} placeholder="Ex. main d'œuvre + disjoncteur" />
                  <PrimaryButton
                    disabled={busy || !Number(quote)}
                    onClick={() => run(() => rpc("provider_quote", { p_request: req.id, p_amount: Math.round(Number(quote)), p_note: quoteNote }))}
                  >
                    Envoyer le prix au client
                  </PrimaryButton>
                </div>
              </Card>
            )}

            {req.status === "en_cours" && (
              <>
                <Card className="fade-up">
                  <h2 className="font-bold">Un problème en plus ?</h2>
                  <p className="mb-3 mt-1 text-xs text-foreground/55">Demande un complément : le client accepte ou refuse avant tout paiement.</p>
                  <div className="space-y-3">
                    <Field label="Complément (FCFA)" type="number" inputMode="numeric" min={1} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="5000" />
                    <Field label="Raison" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} placeholder="Ex. câble principal à remplacer" />
                    <PrimaryButton
                      disabled={busy || !Number(extra) || extraNote.trim().length < 3}
                      onClick={() => run(() => rpc("provider_request_extra", { p_request: req.id, p_amount: Math.round(Number(extra)), p_note: extraNote }))}
                    >
                      Demander le complément
                    </PrimaryButton>
                  </div>
                </Card>
                <ConfirmButton tone="success" label="J'ai terminé le travail" disabled={busy} onConfirm={() => run(() => rpc("provider_mark_done", { p_request: req.id }))} />
              </>
            )}
          </>
        )}

        {/* ---------- Historique des paiements ---------- */}
        {payments.length > 0 && (
          <Card className="fade-up">
            <h2 className="mb-3 font-bold">Paiements</h2>
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-2xl bg-[#f3f6fd] px-3.5 py-2.5">
                  <span>
                    <span className="block font-medium">{PAYMENT_KIND_LABEL[p.kind]}</span>
                    <span className="block text-xs text-foreground/50">{PAYMENT_STATUS_LABEL[p.status]}</span>
                  </span>
                  <span className="font-bold">{formatFcfa(p.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {req.status === "litige" && req.dispute_reason && (
          <Card className="fade-up border-2 border-red-200">
            <h2 className="font-bold text-red-700">Problème signalé</h2>
            <p className="mt-1 text-sm">{req.dispute_reason}</p>
          </Card>
        )}

        {(viewer === "client" || viewer === "provider") && DISPUTABLE.includes(req.status) && (
          <div className="fade-up">
            {!disputeOpen ? (
              <button onClick={() => setDisputeOpen(true)} className="press w-full text-center text-sm font-semibold text-red-600 underline">
                Signaler un problème
              </button>
            ) : (
              <Card className="space-y-3">
                <h2 className="font-bold">Signaler un problème</h2>
                <textarea
                  value={disputeText}
                  onChange={(e) => setDisputeText(e.target.value)}
                  rows={3}
                  placeholder="Explique ce qui ne va pas…"
                  className="w-full rounded-2xl border border-brand/15 bg-[#f3f6fd] px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <ConfirmButton
                  tone="danger"
                  label="Envoyer à l'équipe Defar ko"
                  disabled={busy || disputeText.trim().length < 5}
                  onConfirm={() => run(async () => { await rpc("open_dispute", { p_request: req.id, p_reason: disputeText }); setDisputeOpen(false); })}
                />
              </Card>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function RequestRoute() {
  const params = useParams<{ id: string }>();
  return <RequireAuth>{(auth) => <RequestInner id={params.id} auth={auth} />}</RequireAuth>;
}

export default function RequestPage() {
  return (
    <Suspense fallback={null}>
      <RequestRoute />
    </Suspense>
  );
}
