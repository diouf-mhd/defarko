export type Role = "client" | "prestataire" | "admin";
export type ProviderStatus = "en_attente" | "verifie" | "suspendu";
export type Availability = "disponible" | "occupe" | "hors_service";
export type PricingType = "fixe" | "devis";

export type Provider = {
  id: string;
  user_id: string | null;
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
  rating: number;
  reviews_count: number;
  status: ProviderStatus;
  availability: Availability;
  photo_url: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
};

export type RequestStatus =
  | "nouvelle"
  | "diagnostic_a_payer"
  | "diagnostic_paye"
  | "devis_propose"
  | "paiement_a_faire"
  | "en_cours"
  | "complement_demande"
  | "a_confirmer"
  | "termine"
  | "reverse"
  | "litige"
  | "annule";

export type PaymentKind = "diagnostic" | "devis" | "complement";
export type PaymentStatus = "propose" | "en_attente" | "declare" | "paye" | "refuse";

export type Payment = {
  id: string;
  request_id: string;
  kind: PaymentKind;
  amount: number;
  status: PaymentStatus;
  reference: string | null;
  note: string | null;
  created_at: string;
  validated_at: string | null;
};

export type RequestRow = {
  id: string;
  client_id: string;
  provider_id: string;
  description: string;
  mode: string | null;
  quartier: string | null;
  units: number;
  diagnostic_fee: number;
  quote_amount: number | null;
  quote_note: string | null;
  status: RequestStatus;
  commission_amount: number | null;
  payout_amount: number | null;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
  provider?: Pick<Provider, "id" | "full_name" | "phone" | "category_slug" | "photo_url" | "diagnostic_fee"> | null;
  client?: { full_name: string | null; phone: string | null } | null;
  payments?: Payment[];
};

export type Review = {
  id: string;
  request_id: string;
  provider_id: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};
