/** Numéro au format international (+221…). Accepte « 77 000 00 00 », « 221770000000 », « +221 77… ». */
export function toE164(raw: string): string {
  const t = raw.trim();
  const digits = t.replace(/\D/g, "");
  if (t.startsWith("+")) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("221") && digits.length >= 12) return `+${digits}`;
  return `+221${digits}`;
}

export function isValidPhone(raw: string): boolean {
  const e = toE164(raw);
  if (!/^\+\d{9,15}$/.test(e)) return false;
  if (e.startsWith("+221")) return /^\+221\d{9}$/.test(e);
  return true;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${toE164(phone).slice(1)}?text=${encodeURIComponent(message)}`;
}

export function telLink(phone: string): string {
  return `tel:${toE164(phone)}`;
}

/** Affichage lisible : +221 77 000 00 00 */
export function formatPhone(phone: string): string {
  const e = toE164(phone);
  const m = e.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e;
}

/**
 * Lien de paiement Wave Business avec montant prérempli.
 * Vérifie dans ton compte Wave Business que le paramètre `amount` est accepté.
 */
export function waveLink(amount: number): string | null {
  const base =
    process.env.NEXT_PUBLIC_WAVE_BASE_URL?.trim() || "https://pay.wave.com/m/M_sn_Mes0alYav5Hz/c/sn/";
  try {
    const url = new URL(base);
    url.searchParams.set("amount", String(amount));
    return url.toString();
  } catch {
    return null;
  }
}

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR").replace(/[  ]/g, " ")} FCFA`;
}

export const MODE_LABELS: Record<string, string> = {
  domicile: "À domicile",
  atelier: "À l'atelier",
  livraison: "À livrer",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
