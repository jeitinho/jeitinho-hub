-- Manifeste du jour (inspiré de FareHarbor / Bókun) : pointage des participants des réservations plateformes.
alter table public.ota_bookings add column if not exists checkin_status text
  check (checkin_status in ('present','no_show'));
alter table public.ota_bookings add column if not exists checked_in_at timestamptz;
alter table public.ota_bookings add column if not exists checked_in_by uuid references auth.users(id) on delete set null;

-- Les guides (rôle guide) voient et pointent les réservations qui leur sont assignées.
drop policy if exists ota_bookings_guide_read on public.ota_bookings;
create policy ota_bookings_guide_read on public.ota_bookings for select to authenticated
  using (guide_id = auth.uid());
drop policy if exists ota_bookings_guide_checkin on public.ota_bookings;
create policy ota_bookings_guide_checkin on public.ota_bookings for update to authenticated
  using (guide_id = auth.uid()) with check (guide_id = auth.uid());
