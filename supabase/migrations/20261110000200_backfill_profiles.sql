-- Existing Auth users also need an isolated Defar ko profile to create requests.
insert into public.defarko_profiles (id, full_name, phone)
select
  u.id,
  nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'phone'), '')
from auth.users u
on conflict (id) do nothing;