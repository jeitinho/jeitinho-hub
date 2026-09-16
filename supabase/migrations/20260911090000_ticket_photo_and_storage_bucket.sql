-- Ticket offer photo: uploaded via the Hub, stored in a public Storage
-- bucket, referenced here by public URL. photo_ratio controls how the Hub
-- and the public site both crop/display it (object-fit: cover within that
-- ratio), so the same source image looks intentional on both card and
-- detail layouts instead of being stretched.
alter table public.ticket_offers
  add column if not exists photo_url text,
  add column if not exists photo_ratio text not null default '16/9';

alter table public.ticket_offers
  drop constraint if exists ticket_offers_photo_ratio_check,
  add constraint ticket_offers_photo_ratio_check
    check (photo_ratio in ('16/9', '4/3', '1/1'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-photos', 'catalog-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Public read (it's a public-site-facing bucket), managed write only —
-- mirrors the ticket_offers/ticket_offer_variants RLS convention.
drop policy if exists catalog_photos_read_public on storage.objects;
create policy catalog_photos_read_public on storage.objects
  for select to public using (bucket_id = 'catalog-photos');

drop policy if exists catalog_photos_write_managers on storage.objects;
create policy catalog_photos_write_managers on storage.objects
  for all to authenticated
  using (bucket_id = 'catalog-photos' and can_manage(auth.uid()))
  with check (bucket_id = 'catalog-photos' and can_manage(auth.uid()));
