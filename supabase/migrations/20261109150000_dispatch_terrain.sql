-- Dispatch terrain : toutes les sorties (GetYourGuide/OTA, réservations du site,
-- prestations des voyages, saisies manuelles) dans une seule liste, avec une
-- personne de l'équipe et/ou un prestataire externe assignés.

alter table public.trip_activities
  add column if not exists assignee_id uuid references auth.users(id) on delete set null;
alter table public.ota_bookings
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

-- Réservations payées sur jeitinho.fr : un panier peut contenir plusieurs sorties.
create table if not exists public.site_booking_assignments (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  item_index int not null,
  assignee_id uuid references auth.users(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,
  checkin_status text check (checkin_status in ('present','no_show')),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (booking_id, item_index)
);
alter table public.site_booking_assignments enable row level security;
create policy site_booking_assignments_operate on public.site_booking_assignments
  for all to authenticated
  using (public.can_operate(auth.uid())) with check (public.can_operate(auth.uid()));
create policy site_booking_assignments_self_read on public.site_booking_assignments
  for select to authenticated using (assignee_id = auth.uid());

-- Liste unifiée, sans contrôle (usage interne : planning du soir, notifications).
create or replace function public._dispatch_items(p_from date, p_to date)
returns table (
  source text, source_id uuid, item_index int, day date, time_label text, sort_at timestamptz,
  title text, pax int, client_name text, client_phone text, language text, meeting_point text,
  assignee_id uuid, partner_id uuid, confirmed boolean, done boolean, ref text, trip_id uuid
)
language sql stable security definer set search_path = public as $$
  -- Plateformes (GetYourGuide…) et saisies manuelles
  select case when o.platform in ('getyourguide','gyg') then 'gyg'
              when o.platform in ('manuel','direct','manual') then 'manuel'
              else coalesce(o.platform,'ota') end,
         o.id, 0,
         (o.start_at at time zone 'America/Sao_Paulo')::date,
         to_char(o.start_at at time zone 'America/Sao_Paulo','HH24"h"MI'),
         o.start_at,
         coalesce(o.activity_title,'Sortie'), o.participants, o.lead_name, o.lead_phone,
         o.lead_language, l.meeting_point, o.guide_id, o.partner_id,
         o.status in ('confirmee','modifiee'), o.status = 'realisee' or o.checkin_status is not null,
         o.booking_ref, null::uuid
    from ota_bookings o left join ota_listings l on l.id = o.listing_id
   where o.start_at is not null
     and (o.start_at at time zone 'America/Sao_Paulo')::date between p_from and p_to
     and coalesce(o.status,'') not in ('annulee','no_show')
  union all
  -- Réservations payées sur le site (une ligne par sortie datée du panier)
  select 'site', b.id, (it.ord - 1)::int,
         public.safe_date(it.v->>'date'),
         coalesce(nullif(replace(it.v->>'time', ':', 'h'),''), '—'),
         (public.safe_date(it.v->>'date')::text || ' ' ||
           case when coalesce(it.v->>'time','') ~ '^\d{1,2}:\d{2}$' then it.v->>'time' else '09:00' end
         )::timestamp at time zone 'America/Sao_Paulo',
         coalesce(it.v->>'title','Sortie'),
         coalesce((it.v->>'travelers')::int, b.nb_travelers),
         trim(coalesce(b.prenom,'') || ' ' || coalesce(b.nom,'')), b.telephone,
         it.v->>'language', nullif(coalesce(it.v->>'pickupOther', it.v->>'pickup'),''),
         sa.assignee_id, sa.partner_id, true, sa.checkin_status is not null,
         b.reference, null::uuid
    from bookings b
    cross join lateral jsonb_array_elements(coalesce(b.items,'[]'::jsonb)) with ordinality as it(v, ord)
    left join site_booking_assignments sa on sa.booking_id = b.id and sa.item_index = it.ord - 1
   where b.status = 'paid'
     and public.safe_date(it.v->>'date') between p_from and p_to
  union all
  -- Prestations des voyages sur mesure
  select 'voyage', a.id, 0, a.day,
         coalesce(a.display_time, to_char(a.scheduled_start at time zone 'America/Sao_Paulo','HH24"h"MI'),
                  case a.slot when 'matin' then 'Matin' when 'midi' then 'Midi' when 'apres_midi' then 'Après-midi'
                              when 'soir' then 'Soir' when 'nuit' then 'Nuit' end, '—'),
         coalesce(a.scheduled_start, (a.day::text || ' ' || case a.slot when 'midi' then '12:00' when 'apres_midi' then '14:00'
                  when 'soir' then '19:00' when 'nuit' then '22:00' else '08:00' end)::timestamp at time zone 'America/Sao_Paulo'),
         a.title, t.party_size, c.full_name, c.phone, null, null,
         coalesce(a.assignee_id, t.guide_id), a.partner_id,
         t.status in ('confirmed','in_progress') or a.status in ('confirmed','client_informed','completed','done'),
         a.status in ('completed','done'),
         t.reference, t.id
    from trip_activities a
    join trips t on t.id = a.trip_id
    left join clients c on c.id = t.client_id
   where a.day between p_from and p_to
     and t.status <> 'cancelled'
     and coalesce(a.status,'') not in ('cancelled','replaced')
     and coalesce(a.kind,'activity') = 'activity';
$$;
revoke all on function public._dispatch_items(date, date) from public, anon, authenticated;

-- Version appelée par l'interface : l'équipe voit tout, un guide voit ses sorties.
create or replace function public.dispatch_list(p_from date, p_to date)
returns table (
  source text, source_id uuid, item_index int, day date, time_label text, sort_at timestamptz,
  title text, pax int, client_name text, client_phone text, language text, meeting_point text,
  assignee_id uuid, partner_id uuid, confirmed boolean, done boolean, ref text, trip_id uuid
)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_to - p_from > 92 then raise exception 'période trop longue'; end if;
  return query
    select d.* from public._dispatch_items(p_from, p_to) d
     where public.can_operate(auth.uid()) or d.assignee_id = auth.uid()
     order by d.sort_at;
end $$;
revoke all on function public.dispatch_list(date, date) from public, anon;
grant execute on function public.dispatch_list(date, date) to authenticated;

-- Personnes assignables : comptes guide / prestataire / associé.
create or replace function public.dispatch_team()
returns table (user_id uuid, name text, roles text[], whatsapp text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_operate(auth.uid()) then raise exception 'forbidden'; end if;
  return query
    select p.id, coalesce(pm.display_name, nullif(trim(p.full_name),''), p.email)::text,
           array_agg(distinct r.role::text), pm.whatsapp
      from user_roles r
      join profiles p on p.id = r.user_id
      left join partner_members pm on pm.user_id = p.id
     where r.role::text in ('guide','prestataire','associe')
     group by p.id, pm.display_name, p.full_name, p.email, pm.whatsapp
     order by 2;
end $$;
revoke all on function public.dispatch_team() from public, anon;
grant execute on function public.dispatch_team() to authenticated;

-- Assigner (personne et/ou prestataire). p_clear_* permet de retirer l'un sans toucher l'autre.
create or replace function public.dispatch_assign(
  p_source text, p_id uuid, p_index int,
  p_assignee uuid, p_partner uuid, p_set_assignee boolean default true, p_set_partner boolean default false
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_operate(auth.uid()) then raise exception 'forbidden'; end if;
  if p_source = 'voyage' then
    update trip_activities set
      assignee_id = case when p_set_assignee then p_assignee else assignee_id end,
      partner_id  = case when p_set_partner then p_partner else partner_id end,
      updated_at = now()
     where id = p_id;
  elsif p_source = 'site' then
    insert into site_booking_assignments (booking_id, item_index, assignee_id, partner_id, updated_by)
    values (p_id, p_index, case when p_set_assignee then p_assignee end, case when p_set_partner then p_partner end, auth.uid())
    on conflict (booking_id, item_index) do update set
      assignee_id = case when p_set_assignee then excluded.assignee_id else site_booking_assignments.assignee_id end,
      partner_id  = case when p_set_partner then excluded.partner_id else site_booking_assignments.partner_id end,
      updated_at = now(), updated_by = auth.uid();
  else
    update ota_bookings set
      guide_id   = case when p_set_assignee then p_assignee else guide_id end,
      partner_id = case when p_set_partner then p_partner else partner_id end
     where id = p_id;
  end if;
end $$;
revoke all on function public.dispatch_assign(text, uuid, int, uuid, uuid, boolean, boolean) from public, anon;
grant execute on function public.dispatch_assign(text, uuid, int, uuid, uuid, boolean, boolean) to authenticated;

-- Planning WhatsApp du soir : s'appuie désormais sur la liste unifiée
-- (inclut les réservations du site et les prestations assignées individuellement).
create or replace function public.guide_planning_text(_user_id uuid, _day date)
returns text language plpgsql stable security definer set search_path = public as $$
declare r record; txt text := null; is_admin boolean := public.has_role(_user_id, 'admin');
begin
  for r in
    select d.* from public._dispatch_items(_day, _day) d
     where d.confirmed and (d.assignee_id = _user_id or (d.assignee_id is null and is_admin))
     order by d.sort_at
  loop
    txt := coalesce(txt || E'\n', '') || '• ' || coalesce(nullif(r.time_label,''),'—') || ' — ' || r.title
           || coalesce(' · ' || r.pax || ' pers.', '')
           || coalesce(' · ' || nullif(r.client_name,''), '')
           || coalesce(' (' || r.language || ')', '')
           || coalesce(E'\n   📍 ' || r.meeting_point, '')
           || coalesce(' · ' || r.client_phone, '')
           || case when r.assignee_id is null then ' ⚠️ sans guide' else '' end;
  end loop;
  if txt is null then return null; end if;
  return 'JEITINHO — tes tours de demain (' || to_char(_day,'DD/MM') || E') :\n' || txt
         || E'\n\nDétails : manager.jeitinho.fr/manifest';
end $$;
revoke all on function public.guide_planning_text(uuid, date) from public, anon, authenticated;
