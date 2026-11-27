-- Storage buckets (names mirror constants/storage.ts, limits mirror constants/limits.ts).
-- Customer-owned objects live under `<organization_id>/...`.
-- Proofs, invoices and production files have no customer policies: the server issues short-lived signed URLs
-- after checking access, and production files are never signed for customers (D-003).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('uploads', 'uploads', false, 26214400,
    array['application/pdf', 'application/postscript', 'application/illustrator', 'image/svg+xml', 'image/png']),
  ('design-assets', 'design-assets', false, 5242880,
    array['image/png', 'image/jpeg', 'image/svg+xml']),
  ('csv-datasets', 'csv-datasets', false, 2097152,
    array['text/csv', 'application/vnd.ms-excel', 'text/plain']),
  ('proofs', 'proofs', false, 26214400, array['application/pdf', 'image/png']),
  ('production', 'production', false, 524288000, array['application/pdf', 'image/png', 'application/zip']),
  ('invoices', 'invoices', false, 5242880, array['application/pdf']),
  ('gallery', 'gallery', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "org members read own files" on storage.objects
  for select to authenticated using (
    bucket_id in ('uploads', 'design-assets', 'csv-datasets')
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "org members upload own files" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('uploads', 'design-assets', 'csv-datasets')
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "org members delete own files" on storage.objects
  for delete to authenticated using (
    bucket_id in ('uploads', 'design-assets', 'csv-datasets')
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "public gallery read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'gallery');

create policy "admin full storage access" on storage.objects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
