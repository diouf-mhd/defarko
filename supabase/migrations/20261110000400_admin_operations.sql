create table public.defarko_admin_activity (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  title text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index defarko_admin_activity_created_idx on public.defarko_admin_activity (created_at desc);
create index defarko_admin_activity_entity_idx on public.defarko_admin_activity (entity_type, entity_id, created_at desc);

create table public.defarko_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.defarko_admin_activity(id) on delete cascade,
  recipient_id uuid not null references public.defarko_profiles(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (activity_id, recipient_id)
);

create index defarko_admin_notifications_inbox_idx on public.defarko_admin_notifications (recipient_id, read_at, created_at desc);

create table public.defarko_call_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.defarko_profiles(id) on delete cascade,
  provider_id uuid not null references public.defarko_providers(id) on delete cascade,
  request_id uuid references public.defarko_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

create index defarko_call_events_created_idx on public.defarko_call_events (created_at desc);
create index defarko_call_events_client_idx on public.defarko_call_events (client_id, created_at desc);
create index defarko_call_events_provider_idx on public.defarko_call_events (provider_id, created_at desc);

alter table public.defarko_admin_activity enable row level security;
alter table public.defarko_admin_notifications enable row level security;
alter table public.defarko_call_events enable row level security;

create policy defarko_admin_activity_read on public.defarko_admin_activity
  for select to authenticated using (public.defarko_is_admin());
create policy defarko_admin_notifications_read on public.defarko_admin_notifications
  for select to authenticated using (recipient_id = auth.uid() and public.defarko_is_admin());
create policy defarko_admin_notifications_mark_read on public.defarko_admin_notifications
  for update to authenticated
  using (recipient_id = auth.uid() and public.defarko_is_admin())
  with check (recipient_id = auth.uid() and public.defarko_is_admin());
create policy defarko_call_events_read on public.defarko_call_events
  for select to authenticated using (public.defarko_is_admin());

revoke all on public.defarko_admin_activity from anon, authenticated;
revoke all on public.defarko_admin_notifications from anon, authenticated;
revoke all on public.defarko_call_events from anon, authenticated;
grant select on public.defarko_admin_activity to authenticated;
grant select on public.defarko_admin_notifications to authenticated;
grant update (read_at) on public.defarko_admin_notifications to authenticated;
grant select on public.defarko_call_events to authenticated;

create or replace function public.defarko_emit_admin_event(
  p_actor uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_title text,
  p_message text,
  p_details jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_activity_id uuid;
  v_admin_id uuid;
begin
  insert into public.defarko_admin_activity (actor_id, event_type, entity_type, entity_id, title, message, details)
  values (p_actor, p_event_type, p_entity_type, p_entity_id, p_title, p_message, coalesce(p_details, '{}'::jsonb))
  returning id into v_activity_id;

  for v_admin_id in select id from public.defarko_profiles where role = 'admin' loop
    insert into public.defarko_admin_notifications (activity_id, recipient_id)
    values (v_activity_id, v_admin_id)
    on conflict (activity_id, recipient_id) do nothing;
  end loop;

  return v_activity_id;
end;
$$;

create or replace function public.defarko_profile_admin_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.role = 'client' then
    perform public.defarko_emit_admin_event(
      new.id, 'client.created', 'profile', new.id, 'Nouveau client',
      coalesce(new.full_name, 'Un nouveau client') || ' a créé un compte.',
      jsonb_build_object('profile_id', new.id, 'phone', new.phone)
    );
  elsif tg_op = 'UPDATE' and old.role is distinct from new.role and new.role = 'prestataire' then
    perform public.defarko_emit_admin_event(
      new.id, 'provider.account_created', 'profile', new.id, 'Nouveau compte prestataire',
      coalesce(new.full_name, 'Un prestataire') || ' a commencé son inscription.',
      jsonb_build_object('profile_id', new.id, 'phone', new.phone)
    );
  end if;
  return new;
end;
$$;

create trigger defarko_profile_admin_event_trg
  after insert or update of role on public.defarko_profiles
  for each row execute function public.defarko_profile_admin_event();

create or replace function public.defarko_provider_admin_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.defarko_emit_admin_event(
      new.user_id, 'provider.created', 'provider', new.id, 'Nouveau profil prestataire',
      new.full_name || ' s’est inscrit comme prestataire.',
      jsonb_build_object('provider_id', new.id, 'category_slug', new.category_slug, 'phone', new.phone, 'status', new.status)
    );
  else
    if old.status is distinct from new.status then
      perform public.defarko_emit_admin_event(
        auth.uid(), 'provider.status_changed', 'provider', new.id, 'Statut prestataire modifié',
        new.full_name || ' : ' || old.status || ' → ' || new.status || '.',
        jsonb_build_object('provider_id', new.id, 'old_status', old.status, 'new_status', new.status)
      );
    end if;
    if old.availability is distinct from new.availability then
      perform public.defarko_emit_admin_event(
        new.user_id, 'provider.availability_changed', 'provider', new.id, 'Disponibilité modifiée',
        new.full_name || ' est maintenant ' || new.availability || '.',
        jsonb_build_object('provider_id', new.id, 'availability', new.availability)
      );
    end if;
    if old.diagnostic_fee is distinct from new.diagnostic_fee then
      perform public.defarko_emit_admin_event(
        new.user_id, 'provider.travel_fee_changed', 'provider', new.id, 'Frais de déplacement modifiés',
        new.full_name || ' a modifié ses frais de déplacement.',
        jsonb_build_object('provider_id', new.id, 'old_fee', old.diagnostic_fee, 'new_fee', new.diagnostic_fee)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger defarko_provider_admin_event_trg
  after insert or update on public.defarko_providers
  for each row execute function public.defarko_provider_admin_event();

create or replace function public.defarko_request_admin_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_client_name text;
  v_provider_name text;
begin
  select full_name into v_client_name from public.defarko_profiles where id = new.client_id;
  select full_name into v_provider_name from public.defarko_providers where id = new.provider_id;

  if tg_op = 'INSERT' then
    perform public.defarko_emit_admin_event(
      new.client_id, 'request.created', 'request', new.id, 'Nouvelle demande de service',
      coalesce(v_client_name, 'Un client') || ' demande un service à ' || coalesce(v_provider_name, 'un prestataire') || '.',
      jsonb_build_object('request_id', new.id, 'client_id', new.client_id, 'provider_id', new.provider_id,
        'description', new.description, 'quartier', new.quartier, 'preferred_date', new.preferred_date,
        'diagnostic_fee', new.diagnostic_fee, 'status', new.status)
    );
  elsif old.status is distinct from new.status then
    perform public.defarko_emit_admin_event(
      auth.uid(), 'request.status_changed', 'request', new.id, 'Demande mise à jour',
      'Demande ' || left(new.id::text, 8) || ' : ' || old.status || ' → ' || new.status || '.',
      jsonb_build_object('request_id', new.id, 'client_id', new.client_id, 'provider_id', new.provider_id,
        'old_status', old.status, 'new_status', new.status)
    );
  elsif old.description is distinct from new.description or old.quartier is distinct from new.quartier or old.preferred_date is distinct from new.preferred_date then
    perform public.defarko_emit_admin_event(
      auth.uid(), 'request.updated', 'request', new.id, 'Demande modifiée',
      'Les détails de la demande ' || left(new.id::text, 8) || ' ont été modifiés.',
      jsonb_build_object('request_id', new.id, 'client_id', new.client_id, 'provider_id', new.provider_id,
        'quartier', new.quartier, 'preferred_date', new.preferred_date)
    );
  end if;
  return new;
end;
$$;

create trigger defarko_request_admin_event_trg
  after insert or update on public.defarko_requests
  for each row execute function public.defarko_request_admin_event();

create or replace function public.defarko_payment_admin_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_request public.defarko_requests;
  v_event_type text;
  v_title text;
  v_message text;
begin
  select * into v_request from public.defarko_requests where id = new.request_id;
  if tg_op = 'INSERT' then
    v_event_type := 'payment.initiated';
    v_title := 'Paiement initié';
  elsif old.status is distinct from new.status then
    v_event_type := case when new.status = 'paye' then 'payment.confirmed' when new.status = 'refuse' then 'payment.rejected' else 'payment.status_changed' end;
    v_title := case when new.status = 'paye' then 'Paiement confirmé' when new.status = 'refuse' then 'Paiement refusé' else 'Paiement mis à jour' end;
  elsif old.amount is distinct from new.amount or old.reference is distinct from new.reference then
    v_event_type := 'payment.updated';
    v_title := 'Paiement modifié';
  else
    return new;
  end if;

  v_message := new.kind || ' : ' || new.amount || ' FCFA (statut ' || new.status || ').';

  perform public.defarko_emit_admin_event(
    auth.uid(), v_event_type, 'payment', new.id, v_title,
    v_message,
    jsonb_build_object('payment_id', new.id, 'request_id', new.request_id, 'client_id', v_request.client_id,
      'provider_id', v_request.provider_id, 'kind', new.kind, 'amount', new.amount, 'status', new.status,
      'reference', new.reference)
  );
  return new;
end;
$$;

create trigger defarko_payment_admin_event_trg
  after insert or update on public.defarko_payments
  for each row execute function public.defarko_payment_admin_event();

create or replace function public.defarko_review_admin_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.defarko_emit_admin_event(
    new.client_id, 'review.created', 'review', new.id, 'Nouvel avis client',
    'Un client a laissé un avis de ' || new.rating || '/5.',
    jsonb_build_object('review_id', new.id, 'request_id', new.request_id, 'provider_id', new.provider_id,
      'client_id', new.client_id, 'rating', new.rating)
  );
  return new;
end;
$$;

create trigger defarko_review_admin_event_trg
  after insert on public.defarko_reviews
  for each row execute function public.defarko_review_admin_event();

create or replace function public.defarko_log_call(p_provider uuid, p_request uuid default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_client uuid := auth.uid();
  v_call_id uuid;
  v_request public.defarko_requests;
  v_provider public.defarko_providers;
begin
  if v_client is null then raise exception 'Connecte-toi pour enregistrer cet appel.'; end if;
  select * into v_provider from public.defarko_providers where id = p_provider and status = 'verifie';
  if not found then raise exception 'Ce prestataire n’est pas disponible.'; end if;
  if p_request is not null then
    select * into v_request from public.defarko_requests where id = p_request and client_id = v_client and provider_id = p_provider;
    if not found then raise exception 'Demande introuvable.'; end if;
  end if;

  select id into v_call_id from public.defarko_call_events
   where client_id = v_client and provider_id = p_provider and request_id is not distinct from p_request
     and created_at >= now() - interval '30 seconds'
   order by created_at desc limit 1;
  if v_call_id is not null then return v_call_id; end if;

  insert into public.defarko_call_events (client_id, provider_id, request_id)
  values (v_client, p_provider, p_request)
  returning id into v_call_id;

  perform public.defarko_emit_admin_event(
    v_client, 'call.initiated', 'call', v_call_id, 'Appel initié depuis Defar ko',
    coalesce((select full_name from public.defarko_profiles where id = v_client), 'Un client') || ' a appelé ' || v_provider.full_name || '.',
    jsonb_build_object('call_id', v_call_id, 'client_id', v_client, 'provider_id', p_provider,
      'request_id', p_request, 'phone', v_provider.phone)
  );
  return v_call_id;
end;
$$;

create or replace function public.defarko_admin_mark_notification_read(p_notification uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.defarko_is_admin() then raise exception 'Accès réservé aux administrateurs.'; end if;
  update public.defarko_admin_notifications
     set read_at = coalesce(read_at, now())
   where id = p_notification and recipient_id = auth.uid();
end;
$$;

create or replace function public.defarko_admin_dashboard_stats()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.defarko_is_admin() then raise exception 'Accès réservé aux administrateurs.'; end if;
  return jsonb_build_object(
    'clients_total', (select count(*) from public.defarko_profiles where role = 'client'),
    'providers_total', (select count(*) from public.defarko_providers),
    'providers_pending', (select count(*) from public.defarko_providers where status = 'en_attente'),
    'requests_total', (select count(*) from public.defarko_requests),
    'requests_active', (select count(*) from public.defarko_requests where status in ('nouvelle', 'diagnostic_a_payer', 'diagnostic_paye', 'devis_propose', 'paiement_a_faire', 'en_cours', 'complement_demande', 'a_confirmer')),
    'requests_completed', (select count(*) from public.defarko_requests where status in ('termine', 'reverse')),
    'requests_cancelled', (select count(*) from public.defarko_requests where status = 'annule'),
    'payments_total', (select count(*) from public.defarko_payments),
    'payments_confirmed', (select count(*) from public.defarko_payments where status = 'paye'),
    'payments_pending', (select count(*) from public.defarko_payments where status in ('en_attente', 'declare')),
    'payments_failed', (select count(*) from public.defarko_payments where status = 'refuse'),
    'payments_confirmed_amount', (select coalesce(sum(amount), 0) from public.defarko_payments where status = 'paye'),
    'commissions_paid', (select coalesce(sum(commission_amount), 0) from public.defarko_requests where status = 'reverse'),
    'payouts_pending', (select count(*) from public.defarko_requests where status = 'termine'),
    'payouts_completed', (select count(*) from public.defarko_requests where status = 'reverse'),
    'calls_total', (select count(*) from public.defarko_call_events),
    'notifications_unread', (select count(*) from public.defarko_admin_notifications where recipient_id = auth.uid() and read_at is null),
    'requests_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'count', request_count) order by day), '[]'::jsonb)
      from (
        select series.day::date as day, count(r.id)::int as request_count
        from generate_series(current_date - interval '6 days', current_date, interval '1 day') as series(day)
        left join public.defarko_requests r on r.created_at::date = series.day::date
        group by series.day::date
      ) daily_requests
    ),
    'requests_by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('name', category_name, 'count', request_count) order by request_count desc), '[]'::jsonb)
      from (
        select c.name as category_name, count(r.id)::int as request_count
        from public.defarko_requests r
        join public.defarko_providers p on p.id = r.provider_id
        join public.defarko_categories c on c.slug = p.category_slug
        group by c.name
        order by request_count desc
        limit 6
      ) category_requests
    )
  );
end;
$$;

revoke execute on function public.defarko_emit_admin_event(uuid, text, text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.defarko_profile_admin_event() from public, anon, authenticated;
revoke execute on function public.defarko_provider_admin_event() from public, anon, authenticated;
revoke execute on function public.defarko_request_admin_event() from public, anon, authenticated;
revoke execute on function public.defarko_payment_admin_event() from public, anon, authenticated;
revoke execute on function public.defarko_review_admin_event() from public, anon, authenticated;
revoke execute on function public.defarko_log_call(uuid, uuid) from public, anon;
grant execute on function public.defarko_log_call(uuid, uuid) to authenticated;
revoke execute on function public.defarko_admin_mark_notification_read(uuid) from public, anon;
grant execute on function public.defarko_admin_mark_notification_read(uuid) to authenticated;
revoke execute on function public.defarko_admin_dashboard_stats() from public, anon;
grant execute on function public.defarko_admin_dashboard_stats() to authenticated;