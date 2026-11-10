alter table public.defarko_requests
  add column if not exists preferred_date date;

create or replace function public.defarko_create_request_with_date(
  p_provider uuid,
  p_description text,
  p_mode text,
  p_quartier text,
  p_units int,
  p_preferred_date date
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if length(trim(coalesce(p_quartier, ''))) < 2 then
    raise exception 'Indique le quartier ou le lieu de l''intervention.';
  end if;
  if p_preferred_date is not null and p_preferred_date < current_date then
    raise exception 'La date souhaitée ne peut pas être dans le passé.';
  end if;

  v_id := public.defarko_create_request(p_provider, p_description, p_mode, p_quartier, p_units);
  update public.defarko_requests
     set preferred_date = p_preferred_date
   where id = v_id and client_id = auth.uid();
  if not found then raise exception 'Impossible d''enregistrer la demande.'; end if;
  return v_id;
end;
$$;

revoke execute on function public.defarko_create_request_with_date(uuid, text, text, text, int, date) from public, anon;
grant execute on function public.defarko_create_request_with_date(uuid, text, text, text, int, date) to authenticated;