"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { isValidPhone, MODE_LABELS, toE164 } from "@/lib/contact";
import { toError } from "@/lib/api";
import { uploadPhoto } from "@/lib/photos";
import type { PricingType, Provider, ProviderStatus } from "@/lib/types";
import Field from "./Field";
import ProviderAvatar from "./ProviderAvatar";
import { ErrorBox, PrimaryButton } from "./ui";

export type ProviderFormValues = {
  full_name: string;
  category_slug: string;
  bio: string | null;
  years_experience: number;
  quartier: string;
  ville: string;
  service_modes: string[];
  diagnostic_fee: number;
  pricing_type: PricingType;
  price: number | null;
  price_unit: string | null;
  phone: string;
  photo_url: string | null;
  status?: ProviderStatus;
};

const FEES = [0, 2000, 3000, 5000];
const UNITS = ["heure", "séance", "jour", "service"];
const inputCls =
  "w-full rounded-2xl border border-brand/15 bg-[#f3f6fd] px-4 py-3 text-base outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export default function ProviderForm({
  initial,
  submitLabel,
  uploadFolder,
  showStatus = false,
  onSubmit,
}: {
  initial?: Partial<Provider>;
  submitLabel: string;
  uploadFolder: string;
  showStatus?: boolean;
  onSubmit: (v: ProviderFormValues) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? "");
  const [category, setCategory] = useState(initial?.category_slug ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [years, setYears] = useState(String(initial?.years_experience ?? ""));
  const [quartier, setQuartier] = useState(initial?.quartier ?? "");
  const [ville, setVille] = useState(initial?.ville ?? "Dakar");
  const [modes, setModes] = useState<string[]>(initial?.service_modes ?? ["domicile"]);
  const [fee, setFee] = useState(String(initial?.diagnostic_fee ?? 3000));
  const [pricing, setPricing] = useState<PricingType>(initial?.pricing_type ?? "devis");
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : "");
  const [unit, setUnit] = useState(initial?.price_unit ?? "heure");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [photo, setPhoto] = useState<string | null>(initial?.photo_url ?? null);
  const [status, setStatus] = useState<ProviderStatus>(initial?.status ?? "verifie");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setPhoto(await uploadPhoto(file, uploadFolder));
    } catch (err) {
      setError(toError(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (fullName.trim().length < 3) return setError("Entre le nom complet.");
    if (!category) return setError("Choisis le métier.");
    if (!quartier.trim()) return setError("Indique le quartier.");
    if (!isValidPhone(phone)) return setError("Numéro WhatsApp invalide (ex. 77 000 00 00).");
    if (modes.length === 0) return setError("Choisis au moins un mode de service.");
    if (pricing === "fixe" && !(Number(price) > 0)) return setError("Indique le prix fixe.");

    setBusy(true);
    try {
      await onSubmit({
        full_name: fullName.trim(),
        category_slug: category,
        bio: bio.trim() || null,
        years_experience: Math.max(0, Math.round(Number(years) || 0)),
        quartier: quartier.trim(),
        ville: ville.trim() || "Dakar",
        service_modes: modes,
        diagnostic_fee: pricing === "devis" ? Math.max(0, Math.round(Number(fee) || 0)) : 0,
        pricing_type: pricing,
        price: pricing === "fixe" ? Math.round(Number(price)) : null,
        price_unit: pricing === "fixe" ? unit : null,
        phone: toE164(phone),
        photo_url: photo,
        ...(showStatus ? { status } : {}),
      });
    } catch (err) {
      setError(toError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="press relative" aria-label="Choisir une photo">
          <ProviderAvatar name={fullName || "?"} url={photo} size={76} />
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow">
            <Camera size={14} />
          </span>
        </button>
        <div className="text-sm">
          <p className="font-semibold">Photo de profil</p>
          <p className="text-xs text-foreground/55">{uploading ? "Envoi de la photo…" : "Une vraie photo inspire confiance aux clients."}</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      </div>

      <Field label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Moussa Ndiaye" required />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground/80">Métier</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} required>
          <option value="">Choisis ton métier…</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <Field
        label="Numéro WhatsApp"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="77 000 00 00"
        required
      />
      <p className="-mt-2 text-xs text-foreground/55">Les clients pourront t&apos;écrire sur WhatsApp ou t&apos;appeler directement sur ce numéro.</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quartier" value={quartier} onChange={(e) => setQuartier(e.target.value)} placeholder="Diamniadio" required />
        <Field label="Ville" value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Dakar" />
      </div>

      <Field label="Années d'expérience" type="number" inputMode="numeric" min={0} value={years} onChange={(e) => setYears(e.target.value)} placeholder="5" />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-foreground/80">Présentation</span>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tes spécialités, ta manière de travailler…" className={inputCls} />
      </label>

      <div>
        <span className="mb-1 block text-sm font-medium text-foreground/80">Où interviens-tu ?</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MODE_LABELS).map(([k, label]) => {
            const on = modes.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => setModes((m) => (on ? m.filter((x) => x !== k) : [...m, k]))}
                className={`press rounded-full px-4 py-2 text-sm font-medium transition-colors ${on ? "bg-brand text-white" : "bg-[#f3f6fd] text-foreground/70"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-foreground/80">Tarif</span>
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#f3f6fd] p-1">
          {(
            [
              ["devis", "Sur devis"],
              ["fixe", "Prix fixe"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setPricing(k)}
              className={`press rounded-xl py-2 text-sm font-semibold transition-colors ${pricing === k ? "bg-brand text-white" : "text-foreground/60"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {pricing === "devis" ? (
          <div className="mt-3">
            <p className="mb-2 text-xs text-foreground/55">Frais de déplacement et de diagnostic (payés avant ton intervention, déduits du prix final) :</p>
            <div className="flex flex-wrap gap-2">
              {FEES.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFee(String(f))}
                  className={`press rounded-full px-4 py-2 text-sm font-medium transition-colors ${Number(fee) === f ? "bg-brand text-white" : "bg-[#f3f6fd] text-foreground/70"}`}
                >
                  {f === 0 ? "Gratuit" : `${f.toLocaleString("fr-FR").replace(/[  ]/g, " ")} F`}
                </button>
              ))}
            </div>
            <input type="number" inputMode="numeric" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className={`${inputCls} mt-2`} aria-label="Autre montant" placeholder="Autre montant (FCFA)" />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Prix (FCFA)" type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3000" />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-foreground/80">Par</span>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {showStatus && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground/80">Statut</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProviderStatus)} className={inputCls}>
            <option value="verifie">Vérifié (visible)</option>
            <option value="en_attente">En attente</option>
            <option value="suspendu">Suspendu</option>
          </select>
        </label>
      )}

      <ErrorBox message={error} />
      <PrimaryButton type="submit" disabled={busy || uploading}>
        {busy ? "Enregistrement…" : submitLabel}
      </PrimaryButton>
    </form>
  );
}
