-- ============================================================
-- Defar ko : schéma Supabase (base vide, aucune donnée de démo)
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- ---------- Métiers ----------
create table if not exists public.defarko_categories (
  slug text primary key,
  name text not null,
  sort_order int not null default 0,
  commission_pct numeric(4,1) not null default 10 check (commission_pct >= 0 and commission_pct <= 50)
);

insert into public.defarko_categories (slug, name, sort_order, commission_pct) values
  ('electricien',    'Électricien',           1, 5),
  ('soudeur',        'Soudeur métallique',    2, 5),
  ('menuisier-bois', 'Menuisier bois',        3, 5),
  ('menuisier-alu',  'Menuisier aluminium',   4, 5),
  ('froid-clim',     'Froid & climatisation', 5, 5),
  ('mecanicien',     'Mécanicien',            6, 5),
  ('carreleur',      'Carreleur',             7, 5),
  ('macon',          'Maçon',                 8, 5),
  ('plombier',       'Plombier',              9, 5),
  ('peintre',        'Peintre',              10, 5),
  ('platrier',       'Plâtrier / staffeur',  11, 5),
  ('ferrailleur',    'Ferrailleur',          12, 5),
  ('tolier',         'Tôlier auto',          13, 5),
  ('telephone',      'Réparateur téléphone', 14, 5),
  ('electromenager', 'Électroménager',       15, 5),
  ('enseignant',     'Enseignant',           16, 10)
on conflict (slug) do nothing;

-- ---------- Profils (un par compte) ----------
create table if not exists public.defarko_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'client' check (role in ('client', 'prestataire', 'admin')),
  created_at timestamptz not null default now()
);

-- Le rôle est toujours « client » à l'inscription (jamais lu depuis le formulaire)
create or replace function public.defarko_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.defarko_profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone');
  return new;
end;
$$;

drop trigger if exists on_defarko_user_created on auth.users;
create trigger on_defarko_user_created
  after insert on auth.users
  for each row execute function public.defarko_handle_new_user();

-- ---------- Fonctions utilitaires ----------
create or replace function public.defarko_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.defarko_profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Ouvriers / prestataires ----------
create table if not exists public.defarko_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  category_slug text not null references public.defarko_categories(slug),
  bio text,
  years_experience int not null default 0 check (years_experience >= 0),
  quartier text not null,
  ville text not null default 'Dakar',
  service_modes text[] not null default '{domicile}',
  diagnostic_fee int not null default 0 check (diagnostic_fee >= 0),   -- déplacement + diagnostic (FCFA)
  pricing_type text not null default 'devis' check (pricing_type in ('fixe', 'devis')),
  price int check (price is null or price > 0),
  price_unit text,
  phone text not null check (phone ~ '^\+?[0-9 ]{9,16}$'),            -- numéro WhatsApp (sert aussi pour l'appel)
  rating numeric(2,1) not null default 0,
  reviews_count int not null default 0,
  status text not null default 'en_attente' check (status in ('en_attente', 'verifie', 'suspendu')),
  availability text not null default 'disponible' check (availability in ('disponible', 'occupe', 'hors_service')),
  photo_url text,
  created_at timestamptz not null default now(),
  check (pricing_type = 'devis' or price is not null)
);

create index if not exists defarko_providers_category_idx on public.defarko_providers (category_slug, status);

create or replace function public.defarko_my_provider_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.defarko_providers where user_id = auth.uid() limit 1;
$$;

-- Un ouvrier qui change de métier repasse en attente de vérification
create or replace function public.defarko_providers_guard()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.defarko_is_admin() and new.category_slug is distinct from old.category_slug and old.status = 'verifie' then
    new.status := 'en_attente';
  end if;
  return new;
end;
$$;

drop trigger if exists defarko_providers_guard_trg on public.defarko_providers;
create trigger defarko_providers_guard_trg
  before update on public.defarko_providers
  for each row execute function public.defarko_providers_guard();

-- ---------- Demandes ----------
create table if not exists public.defarko_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.defarko_profiles(id) on delete cascade,
  provider_id uuid not null references public.defarko_providers(id),
  description text not null,
  mode text,
  quartier text,
  units int not null default 1 check (units >= 1),
  diagnostic_fee int not null default 0,
  quote_amount int,
  quote_note text,
  status text not null default 'nouvelle' check (status in (
    'nouvelle',            -- en attente du devis (pas de frais de diagnostic)
    'diagnostic_a_payer',  -- frais de déplacement/diagnostic à payer
    'diagnostic_paye',     -- diagnostic payé, l'ouvrier peut intervenir et proposer le prix final
    'devis_propose',       -- l'ouvrier a proposé un prix final, le client doit répondre
    'paiement_a_faire',    -- prix accepté, paiement à effectuer
    'en_cours',            -- payé, travail en cours
    'complement_demande',  -- l'ouvrier demande un supplément, le client doit répondre
    'a_confirmer',         -- l'ouvrier dit avoir terminé, le client doit confirmer
    'termine',             -- confirmé par le client, reversement à faire
    'reverse',             -- part de l'ouvrier reversée
    'litige',
    'annule'
  )),
  commission_amount int,
  payout_amount int,
  dispute_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists defarko_requests_client_idx on public.defarko_requests (client_id, created_at desc);
create index if not exists defarko_requests_provider_idx on public.defarko_requests (provider_id, created_at desc);

-- ---------- Paiements ----------
create table if not exists public.defarko_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.defarko_requests(id) on delete cascade,
  kind text not null check (kind in ('diagnostic', 'devis', 'complement')),
  amount int not null check (amount > 0),
  status text not null default 'en_attente' check (status in (
    'propose',     -- complément proposé, en attente de l'accord du client
    'en_attente',  -- à payer par le client
    'declare',     -- le client dit avoir payé, à vérifier dans Wave
    'paye',        -- vérifié par l'admin
    'refuse'
  )),
  reference text,
  note text,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create index if not exists defarko_payments_request_idx on public.defarko_payments (request_id);

-- ---------- Avis des clients (uniquement après un service terminé) ----------
create table if not exists public.defarko_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.defarko_requests(id) on delete cascade,
  provider_id uuid not null references public.defarko_providers(id) on delete cascade,
  client_id uuid not null references public.defarko_profiles(id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists defarko_reviews_provider_idx on public.defarko_reviews (provider_id, created_at desc);

-- Met à jour la note moyenne et le nombre d'avis de l'ouvrier
create or replace function public.defarko_refresh_provider_rating()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.defarko_providers p
     set rating = coalesce((select round(avg(rating)::numeric, 1) from public.defarko_reviews where provider_id = new.provider_id), 0),
         reviews_count = (select count(*) from public.defarko_reviews where provider_id = new.provider_id)
   where p.id = new.provider_id;
  return new;
end;
$$;

drop trigger if exists defarko_reviews_rating_trg on public.defarko_reviews;
create trigger defarko_reviews_rating_trg
  after insert on public.defarko_reviews
  for each row execute function public.defarko_refresh_provider_rating();

-- ============================================================
-- Sécurité (Row Level Security)
-- ============================================================
alter table public.defarko_categories enable row level security;
alter table public.defarko_profiles enable row level security;
alter table public.defarko_providers enable row level security;
alter table public.defarko_requests enable row level security;
alter table public.defarko_payments enable row level security;
alter table public.defarko_reviews enable row level security;

-- Métiers : lisibles par tous
create policy "defarko_categories_select" on public.defarko_categories for select to anon, authenticated using (true);

-- Profils : chacun voit le sien ; l'ouvrier voit ses clients ; l'admin voit tout
create policy "defarko_profiles_select" on public.defarko_profiles for select to authenticated
  using (
    id = auth.uid()
    or public.defarko_is_admin()
    or exists (select 1 from public.defarko_requests r where r.client_id = defarko_profiles.id and r.provider_id = public.defarko_my_provider_id())
  );
create policy "defarko_profiles_update_own" on public.defarko_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Ouvriers : le public ne voit que les ouvriers vérifiés
create policy "defarko_providers_select" on public.defarko_providers for select to anon, authenticated
  using (status = 'verifie' or user_id = auth.uid() or public.defarko_is_admin());
create policy "defarko_providers_insert_admin" on public.defarko_providers for insert to authenticated
  with check (public.defarko_is_admin());
create policy "defarko_providers_update" on public.defarko_providers for update to authenticated
  using (user_id = auth.uid() or public.defarko_is_admin())
  with check (user_id = auth.uid() or public.defarko_is_admin());
create policy "defarko_providers_delete_admin" on public.defarko_providers for delete to authenticated
  using (public.defarko_is_admin());

-- Demandes et paiements : lecture seule pour les participants ; toute écriture passe par les fonctions ci-dessous
create policy "defarko_requests_select" on public.defarko_requests for select to authenticated
  using (client_id = auth.uid() or provider_id = public.defarko_my_provider_id() or public.defarko_is_admin());
create policy "defarko_payments_select" on public.defarko_payments for select to authenticated
  using (exists (select 1 from public.defarko_requests r where r.id = defarko_payments.request_id));

-- Avis : lisibles par tous, créés uniquement via add_review()
create policy "defarko_reviews_select" on public.defarko_reviews for select to anon, authenticated using (true);

-- Droits sur les colonnes : personne ne peut modifier le rôle, le statut ou la note directement
revoke all on public.defarko_profiles from anon, authenticated;
grant select on public.defarko_profiles to authenticated;
grant update (full_name, phone) on public.defarko_profiles to authenticated;

revoke all on public.defarko_providers from anon, authenticated;
grant select on public.defarko_providers to anon, authenticated;
grant insert on public.defarko_providers to authenticated;   -- limité aux admins par la règle providers_insert_admin
grant delete on public.defarko_providers to authenticated;   -- limité aux admins
grant update (full_name, category_slug, bio, years_experience, quartier, ville, service_modes,
              diagnostic_fee, pricing_type, price, price_unit, phone, availability, photo_url)
  on public.defarko_providers to authenticated;

revoke all on public.defarko_requests from anon, authenticated;
grant select on public.defarko_requests to authenticated;
revoke all on public.defarko_payments from anon, authenticated;
grant select on public.defarko_payments to authenticated;
revoke all on public.defarko_reviews from anon, authenticated;
grant select on public.defarko_reviews to anon, authenticated;

-- ============================================================
-- Fonctions du parcours (seul moyen d'écrire dans demandes/paiements)
-- ============================================================

-- Le client crée une demande d'intervention
create or replace function public.defarko_create_request(
  p_provider uuid, p_description text, p_mode text, p_quartier text, p_units int default 1
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_prov public.defarko_providers;
  v_id uuid;
  v_units int := greatest(coalesce(p_units, 1), 1);
  v_quote int;
begin
  if v_uid is null then raise exception 'Connecte-toi pour faire une demande.'; end if;
  if length(trim(coalesce(p_description, ''))) < 3 then raise exception 'Décris ton besoin en quelques mots.'; end if;

  select * into v_prov from public.defarko_providers where id = p_provider and status = 'verifie';
  if not found then raise exception 'Ce prestataire n''est pas disponible.'; end if;
  if v_prov.user_id = v_uid then raise exception 'Tu ne peux pas faire une demande à ton propre profil.'; end if;
  if v_prov.availability = 'hors_service' then raise exception 'Ce prestataire est actuellement hors service.'; end if;

  if v_prov.pricing_type = 'fixe' then
    v_quote := v_prov.price * v_units;
    insert into public.defarko_requests (client_id, provider_id, description, mode, quartier, units, quote_amount, status)
    values (v_uid, p_provider, trim(p_description), p_mode, p_quartier, v_units, v_quote, 'paiement_a_faire')
    returning id into v_id;
    insert into public.defarko_payments (request_id, kind, amount) values (v_id, 'devis', v_quote);
  elsif v_prov.diagnostic_fee > 0 then
    insert into public.defarko_requests (client_id, provider_id, description, mode, quartier, diagnostic_fee, status)
    values (v_uid, p_provider, trim(p_description), p_mode, p_quartier, v_prov.diagnostic_fee, 'diagnostic_a_payer')
    returning id into v_id;
    insert into public.defarko_payments (request_id, kind, amount) values (v_id, 'diagnostic', v_prov.diagnostic_fee);
  else
    insert into public.defarko_requests (client_id, provider_id, description, mode, quartier, status)
    values (v_uid, p_provider, trim(p_description), p_mode, p_quartier, 'nouvelle')
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Le client annonce avoir payé (l'équipe vérifie ensuite dans Wave)
create or replace function public.defarko_declare_payment(p_payment uuid, p_reference text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_pay public.defarko_payments;
begin
  select p.* into v_pay from public.defarko_payments p
    join public.defarko_requests r on r.id = p.request_id
    where p.id = p_payment and r.client_id = auth.uid();
  if not found then raise exception 'Paiement introuvable.'; end if;
  if v_pay.status <> 'en_attente' then raise exception 'Ce paiement ne peut plus être déclaré.'; end if;
  update public.defarko_payments set status = 'declare', reference = nullif(trim(coalesce(p_reference, '')), '') where id = p_payment;
end;
$$;

-- L'admin valide un paiement après l'avoir vérifié dans Wave Business
create or replace function public.defarko_admin_validate_payment(p_payment uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_pay public.defarko_payments;
begin
  if not public.defarko_is_admin() then raise exception 'Accès réservé aux administrateurs.'; end if;
  select * into v_pay from public.defarko_payments where id = p_payment;
  if not found then raise exception 'Paiement introuvable.'; end if;
  if v_pay.status not in ('en_attente', 'declare') then raise exception 'Ce paiement ne peut pas être validé.'; end if;

  update public.defarko_payments set status = 'paye', validated_at = now() where id = p_payment;
  update public.defarko_requests
     set status = case when v_pay.kind = 'diagnostic' then 'diagnostic_paye' else 'en_cours' end,
         updated_at = now()
   where id = v_pay.request_id
     and status in ('diagnostic_a_payer', 'paiement_a_faire', 'nouvelle');
end;
$$;

create or replace function public.defarko_admin_reject_payment(p_payment uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.defarko_is_admin() then raise exception 'Accès réservé aux administrateurs.'; end if;
  update public.defarko_payments set status = 'en_attente', reference = null
   where id = p_payment and status = 'declare';
end;
$$;

-- L'ouvrier propose le prix final (après diagnostic)
create or replace function public.defarko_provider_quote(p_request uuid, p_amount int, p_note text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_req public.defarko_requests;
begin
  select * into v_req from public.defarko_requests where id = p_request and provider_id = public.defarko_my_provider_id();
  if not found then raise exception 'Demande introuvable.'; end if;
  if v_req.status not in ('nouvelle', 'diagnostic_paye', 'devis_propose') then
    raise exception 'Le prix final ne peut pas être proposé à cette étape (diagnostic non payé ?).';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Indique un montant valide.'; end if;
  update public.defarko_requests
     set quote_amount = p_amount, quote_note = nullif(trim(coalesce(p_note, '')), ''),
         status = 'devis_propose', updated_at = now()
   where id = p_request;
end;
$$;

-- Le client accepte ou refuse le prix final
create or replace function public.defarko_client_answer_quote(p_request uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.defarko_requests;
  v_paid int;
  v_remaining int;
begin
  select * into v_req from public.defarko_requests where id = p_request and client_id = auth.uid();
  if not found then raise exception 'Demande introuvable.'; end if;
  if v_req.status <> 'devis_propose' then raise exception 'Aucun prix à valider pour cette demande.'; end if;

  if not p_accept then
    update public.defarko_requests set status = 'annule', updated_at = now() where id = p_request;
    return;
  end if;

  select coalesce(sum(amount), 0) into v_paid from public.defarko_payments
   where request_id = p_request and kind = 'diagnostic' and status = 'paye';
  v_remaining := v_req.quote_amount - v_paid;

  if v_remaining > 0 then
    insert into public.defarko_payments (request_id, kind, amount) values (p_request, 'devis', v_remaining);
    update public.defarko_requests set status = 'paiement_a_faire', updated_at = now() where id = p_request;
  else
    update public.defarko_requests set status = 'en_cours', updated_at = now() where id = p_request;
  end if;
end;
$$;

-- L'ouvrier demande un complément (problème supplémentaire découvert)
create or replace function public.defarko_provider_request_extra(p_request uuid, p_amount int, p_note text)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_req public.defarko_requests;
begin
  select * into v_req from public.defarko_requests where id = p_request and provider_id = public.defarko_my_provider_id();
  if not found then raise exception 'Demande introuvable.'; end if;
  if v_req.status <> 'en_cours' then raise exception 'Un complément ne peut être demandé que pendant le travail.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Indique un montant valide.'; end if;
  if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'Explique la raison du complément.'; end if;
  insert into public.defarko_payments (request_id, kind, amount, status, note)
  values (p_request, 'complement', p_amount, 'propose', trim(p_note));
  update public.defarko_requests set status = 'complement_demande', updated_at = now() where id = p_request;
end;
$$;

-- Le client accepte ou refuse le complément
create or replace function public.defarko_client_answer_extra(p_payment uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_pay public.defarko_payments;
begin
  select p.* into v_pay from public.defarko_payments p
    join public.defarko_requests r on r.id = p.request_id
    where p.id = p_payment and r.client_id = auth.uid();
  if not found then raise exception 'Complément introuvable.'; end if;
  if v_pay.status <> 'propose' or v_pay.kind <> 'complement' then raise exception 'Ce complément ne peut plus être modifié.'; end if;

  if p_accept then
    update public.defarko_payments set status = 'en_attente' where id = p_payment;
    update public.defarko_requests set status = 'paiement_a_faire', updated_at = now() where id = v_pay.request_id;
  else
    update public.defarko_payments set status = 'refuse' where id = p_payment;
    update public.defarko_requests set status = 'en_cours', updated_at = now() where id = v_pay.request_id;
  end if;
end;
$$;

-- L'ouvrier annonce avoir terminé
create or replace function public.defarko_provider_mark_done(p_request uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.defarko_requests set status = 'a_confirmer', updated_at = now()
   where id = p_request and provider_id = public.defarko_my_provider_id() and status = 'en_cours';
  if not found then raise exception 'Cette demande ne peut pas être marquée comme terminée.'; end if;
end;
$$;

-- Le client confirme que le travail est fait
create or replace function public.defarko_client_confirm_done(p_request uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.defarko_requests set status = 'termine', updated_at = now()
   where id = p_request and client_id = auth.uid() and status in ('en_cours', 'a_confirmer');
  if not found then raise exception 'Cette demande ne peut pas être confirmée.'; end if;
end;
$$;

-- Le client annule avant tout paiement du service
create or replace function public.defarko_cancel_request(p_request uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_req public.defarko_requests;
begin
  select * into v_req from public.defarko_requests where id = p_request and client_id = auth.uid();
  if not found then raise exception 'Demande introuvable.'; end if;
  if v_req.status not in ('nouvelle', 'diagnostic_a_payer', 'devis_propose', 'paiement_a_faire')
     or exists (select 1 from public.defarko_payments where request_id = p_request and status = 'paye') then
    raise exception 'Cette demande ne peut plus être annulée. Signale un problème si besoin.';
  end if;
  update public.defarko_payments set status = 'refuse' where request_id = p_request and status in ('en_attente', 'declare', 'propose');
  update public.defarko_requests set status = 'annule', updated_at = now() where id = p_request;
end;
$$;

-- Client ou ouvrier signale un problème
create or replace function public.defarko_open_dispute(p_request uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'Explique le problème en quelques mots.'; end if;
  update public.defarko_requests set status = 'litige', dispute_reason = trim(p_reason), updated_at = now()
   where id = p_request
     and (client_id = auth.uid() or provider_id = public.defarko_my_provider_id())
     and status in ('en_cours', 'complement_demande', 'a_confirmer', 'termine');
  if not found then raise exception 'Impossible de signaler un problème sur cette demande.'; end if;
end;
$$;

-- L'admin règle un litige : 'reverser' (l'ouvrier est payé) ou 'rembourser' (le client est remboursé)
create or replace function public.defarko_admin_resolve_dispute(p_request uuid, p_outcome text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.defarko_is_admin() then raise exception 'Accès réservé aux administrateurs.'; end if;
  if p_outcome not in ('reverser', 'rembourser') then raise exception 'Choix invalide.'; end if;
  update public.defarko_requests
     set status = case when p_outcome = 'reverser' then 'termine' else 'annule' end, updated_at = now()
   where id = p_request and status = 'litige';
  if not found then raise exception 'Aucun litige à régler.'; end if;
end;
$$;

-- L'admin enregistre le reversement : calcule la commission sur le montant réellement payé
create or replace function public.defarko_admin_payout(p_request uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.defarko_requests;
  v_total int;
  v_pct numeric;
  v_commission int;
begin
  if not public.defarko_is_admin() then raise exception 'Accès réservé aux administrateurs.'; end if;
  select * into v_req from public.defarko_requests where id = p_request;
  if not found or v_req.status <> 'termine' then raise exception 'Cette demande n''est pas prête pour le reversement.'; end if;

  select coalesce(sum(amount), 0) into v_total from public.defarko_payments where request_id = p_request and status = 'paye';
  select c.commission_pct into v_pct from public.defarko_providers p join public.defarko_categories c on c.slug = p.category_slug where p.id = v_req.provider_id;

  v_commission := round(v_total * coalesce(v_pct, 10) / 100.0);
  update public.defarko_requests
     set commission_amount = v_commission, payout_amount = v_total - v_commission,
         status = 'reverse', updated_at = now()
   where id = p_request;
end;
$$;

-- ============================================================
-- Comptes ouvriers
-- ============================================================

-- Le client laisse un avis après un service terminé (un seul avis par demande)
create or replace function public.defarko_add_review(p_request uuid, p_rating int, p_comment text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_req public.defarko_requests;
  v_name text;
  v_parts text[];
begin
  select * into v_req from public.defarko_requests where id = p_request and client_id = auth.uid();
  if not found then raise exception 'Demande introuvable.'; end if;
  if v_req.status not in ('termine', 'reverse') then raise exception 'Tu pourras donner ton avis quand le service sera terminé.'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Choisis une note entre 1 et 5.'; end if;
  if exists (select 1 from public.defarko_reviews where request_id = p_request) then raise exception 'Tu as déjà donné ton avis pour ce service.'; end if;

  -- Nom affiché : prénom + initiale du nom (ex. « Awa D. »)
  select full_name into v_name from public.defarko_profiles where id = auth.uid();
  v_parts := regexp_split_to_array(trim(coalesce(v_name, '')), '\s+');
  v_name := case
    when coalesce(v_parts[1], '') = '' then 'Client'
    when array_length(v_parts, 1) > 1 then v_parts[1] || ' ' || upper(left(v_parts[array_length(v_parts, 1)], 1)) || '.'
    else v_parts[1]
  end;

  insert into public.defarko_reviews (request_id, provider_id, client_id, author_name, rating, comment)
  values (p_request, v_req.provider_id, auth.uid(), v_name, p_rating, nullif(trim(coalesce(p_comment, '')), ''));
end;
$$;

-- Un utilisateur connecté s'inscrit comme ouvrier (en attente de vérification)
create or replace function public.defarko_become_provider(
  p_full_name text, p_category text, p_bio text, p_years int, p_quartier text, p_ville text,
  p_modes text[], p_diag_fee int, p_pricing text, p_price int, p_unit text, p_phone text, p_photo text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Connecte-toi pour t''inscrire comme prestataire.'; end if;
  if exists (select 1 from public.defarko_providers where user_id = v_uid) then raise exception 'Tu as déjà un profil prestataire.'; end if;

  insert into public.defarko_providers
    (user_id, full_name, category_slug, bio, years_experience, quartier, ville, service_modes,
     diagnostic_fee, pricing_type, price, price_unit, phone, photo_url, status)
  values
    (v_uid, trim(p_full_name), p_category, nullif(trim(coalesce(p_bio, '')), ''), greatest(coalesce(p_years, 0), 0),
     trim(p_quartier), coalesce(nullif(trim(coalesce(p_ville, '')), ''), 'Dakar'),
     coalesce(p_modes, '{domicile}'), greatest(coalesce(p_diag_fee, 0), 0),
     coalesce(p_pricing, 'devis'), p_price, p_unit, trim(p_phone), p_photo, 'en_attente')
  returning id into v_id;

  update public.defarko_profiles set role = 'prestataire' where id = v_uid and role = 'client';
  return v_id;
end;
$$;

create or replace function public.defarko_admin_set_provider_status(p_provider uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.defarko_is_admin() then raise exception 'Accès réservé aux administrateurs.'; end if;
  if p_status not in ('en_attente', 'verifie', 'suspendu') then raise exception 'Statut invalide.'; end if;
  update public.defarko_providers set status = p_status where id = p_provider;
end;
$$;

create or replace function public.defarko_admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.defarko_is_admin() then raise exception 'Accès réservé aux administrateurs.'; end if;
  if p_role not in ('client', 'prestataire', 'admin') then raise exception 'Rôle invalide.'; end if;
  update public.defarko_profiles set role = p_role where id = p_user;
end;
$$;

-- Droits d'exécution : réservés aux utilisateurs connectés
do $defarko_function_privileges$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'defarko!_%' escape '!'
  loop
    execute format('revoke execute on function %s from public, anon', fn.signature);
  end loop;
end;
$defarko_function_privileges$;

grant execute on function public.defarko_create_request(uuid, text, text, text, int) to authenticated;
grant execute on function public.defarko_declare_payment(uuid, text) to authenticated;
grant execute on function public.defarko_admin_validate_payment(uuid) to authenticated;
grant execute on function public.defarko_admin_reject_payment(uuid) to authenticated;
grant execute on function public.defarko_provider_quote(uuid, int, text) to authenticated;
grant execute on function public.defarko_client_answer_quote(uuid, boolean) to authenticated;
grant execute on function public.defarko_provider_request_extra(uuid, int, text) to authenticated;
grant execute on function public.defarko_client_answer_extra(uuid, boolean) to authenticated;
grant execute on function public.defarko_provider_mark_done(uuid) to authenticated;
grant execute on function public.defarko_client_confirm_done(uuid) to authenticated;
grant execute on function public.defarko_cancel_request(uuid) to authenticated;
grant execute on function public.defarko_open_dispute(uuid, text) to authenticated;
grant execute on function public.defarko_admin_resolve_dispute(uuid, text) to authenticated;
grant execute on function public.defarko_admin_payout(uuid) to authenticated;
grant execute on function public.defarko_become_provider(text, text, text, int, text, text, text[], int, text, int, text, text, text) to authenticated;
grant execute on function public.defarko_admin_set_provider_status(uuid, text) to authenticated;
grant execute on function public.defarko_admin_set_role(uuid, text) to authenticated;
grant execute on function public.defarko_add_review(uuid, int, text) to authenticated;
grant execute on function public.defarko_is_admin() to anon, authenticated;
grant execute on function public.defarko_my_provider_id() to anon, authenticated;

-- ============================================================
-- Premier administrateur (à lancer une seule fois, avec ton email) :
--   update public.defarko_profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'ton-email@exemple.com');
-- ============================================================
