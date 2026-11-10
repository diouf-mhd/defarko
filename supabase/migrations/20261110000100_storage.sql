-- Stockage des photos de profil (à exécuter après schema.sql)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Tout le monde peut voir les photos
create policy "photos_lecture_publique" on storage.objects
  for select using (bucket_id = 'photos');

-- Un utilisateur connecté envoie ses photos dans son propre dossier (photos/<son id>/...)
create policy "photos_envoi_dossier_perso" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos_maj_dossier_perso" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos_suppression_dossier_perso" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
