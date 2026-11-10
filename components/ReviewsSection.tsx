"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getReviewableRequest, getReviews, rpc, toError } from "@/lib/api";
import { clearQueryCache, useQuery } from "@/lib/useQuery";
import { formatDate } from "@/lib/contact";
import { Card, ErrorBox, PrimaryButton, Skeleton, StarInput, Stars } from "./ui";

export function ReviewForm({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return setError("Choisis une note de 1 à 5 étoiles.");
    setBusy(true);
    setError("");
    try {
      await rpc("add_review", { p_request: requestId, p_rating: rating, p_comment: comment });
      clearQueryCache("reviews:");
      clearQueryCache("prov:");
      clearQueryCache("cat:");
      onDone();
    } catch (err) {
      setError(toError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-[#f3f6fd] p-4">
      <p className="text-sm font-semibold">Ton avis sur ce service</p>
      <StarInput value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 500))}
        rows={3}
        placeholder="Ponctualité, qualité du travail, prix… (facultatif)"
        className="w-full rounded-2xl border border-brand/15 bg-white px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <p className="text-right text-[11px] text-foreground/40">{comment.length}/500</p>
      <ErrorBox message={error} />
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? "Envoi…" : "Publier mon avis"}
      </PrimaryButton>
    </form>
  );
}

export default function ReviewsSection({ providerId, rating, count }: { providerId: string; rating: number; count: number }) {
  const { user } = useAuth();
  const { data: reviews, loading, reload } = useQuery(`reviews:${providerId}`, () => getReviews(providerId));
  const { data: reviewable, reload: reloadReviewable } = useQuery(user ? `reviewable:${providerId}:${user.id}` : null, () =>
    getReviewableRequest(providerId, user!.id)
  );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <MessageSquareText size={18} className="text-brand" /> Avis des clients
        </h2>
        {count > 0 && (
          <span className="flex items-center gap-2 text-sm">
            <Stars value={rating} />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-foreground/50">({count})</span>
          </span>
        )}
      </div>

      {reviewable && (
        <div className="mb-4">
          <ReviewForm
            requestId={reviewable}
            onDone={() => {
              reload();
              reloadReviewable();
            }}
          />
        </div>
      )}

      {loading && !reviews ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : !reviews || reviews.length === 0 ? (
        <p className="rounded-2xl bg-[#f3f6fd] px-4 py-5 text-center text-sm text-foreground/60">
          Pas encore d&apos;avis. Les avis sont publiés uniquement par des clients ayant réellement fait appel à cet ouvrier.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="fade-up rounded-2xl bg-[#f3f6fd] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{r.author_name}</span>
                <span className="text-[11px] text-foreground/45">{formatDate(r.created_at)}</span>
              </div>
              <Stars value={r.rating} size={13} />
              {r.comment && <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
