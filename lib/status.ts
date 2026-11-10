import type { PaymentKind, PaymentStatus, RequestStatus } from "./types";

export type Tone = "blue" | "orange" | "green" | "red" | "gray";

export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  nouvelle: { label: "Nouvelle demande", tone: "blue" },
  diagnostic_a_payer: { label: "Diagnostic à payer", tone: "orange" },
  diagnostic_paye: { label: "Diagnostic payé", tone: "blue" },
  devis_propose: { label: "Prix à valider", tone: "orange" },
  paiement_a_faire: { label: "Paiement à faire", tone: "orange" },
  en_cours: { label: "Travail en cours", tone: "blue" },
  complement_demande: { label: "Complément demandé", tone: "orange" },
  a_confirmer: { label: "À confirmer", tone: "orange" },
  termine: { label: "Terminé", tone: "green" },
  reverse: { label: "Terminé et réglé", tone: "green" },
  litige: { label: "Litige", tone: "red" },
  annule: { label: "Annulée", tone: "gray" },
};

export const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-brand/10 text-brand",
  orange: "bg-accent/25 text-[#8a5a00]",
  green: "bg-success/15 text-[#12742b]",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-200 text-gray-600",
};

export const FINISHED_STATUSES: RequestStatus[] = ["termine", "reverse", "annule"];

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  diagnostic: "Déplacement et diagnostic",
  devis: "Paiement du service",
  complement: "Complément",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  propose: "Proposé",
  en_attente: "À payer",
  declare: "En vérification",
  paye: "Payé",
  refuse: "Refusé",
};

/** Texte « prochaine étape » selon le rôle de la personne qui regarde la demande. */
export function nextStepText(viewer: "client" | "provider" | "admin", status: RequestStatus): string {
  const c = viewer === "client";
  switch (status) {
    case "nouvelle":
      return c ? "L'ouvrier va te proposer un prix. Tu peux le contacter pour en discuter." : "Discute avec le client puis propose ton prix final.";
    case "diagnostic_a_payer":
      return c
        ? "Paie les frais de déplacement et de diagnostic pour que l'ouvrier intervienne."
        : "En attente du paiement du diagnostic par le client.";
    case "diagnostic_paye":
      return c ? "Diagnostic payé. L'ouvrier va t'indiquer le prix final de la réparation." : "Diagnostic payé : fais le diagnostic puis propose le prix final.";
    case "devis_propose":
      return c ? "Vérifie le prix final proposé, puis accepte ou refuse." : "En attente de la réponse du client sur ton prix.";
    case "paiement_a_faire":
      return c ? "Effectue le paiement. L'argent est gardé par Defar ko jusqu'à la fin du travail." : "En attente du paiement du client.";
    case "en_cours":
      return c ? "Le travail est en cours. Confirme à la fin quand tout est bon." : "Fais le travail. Si un problème en plus apparaît, demande un complément.";
    case "complement_demande":
      return c ? "L'ouvrier demande un complément. Accepte ou refuse." : "En attente de la réponse du client sur le complément.";
    case "a_confirmer":
      return c ? "L'ouvrier dit avoir terminé. Confirme si tu es satisfait." : "En attente de la confirmation du client.";
    case "termine":
      return c ? "Merci ! Le paiement va être reversé à l'ouvrier. Laisse un avis." : "Le client a confirmé. Ton paiement est en cours de reversement.";
    case "reverse":
      return c ? "Service terminé et réglé. Laisse un avis sur l'ouvrier." : "Tu as été payé. Merci !";
    case "litige":
      return viewer === "admin" ? "À régler par l'équipe Defar ko." : "Un problème a été signalé. L'équipe Defar ko va examiner la situation.";
    case "annule":
      return "Cette demande est annulée.";
  }
}
