-- Sorties du jour = liste unifiée du dispatch (GetYourGuide, site, voyages, manuel)
-- + pointage présent / absent pour toutes les sources, par l'équipe ou la personne assignée.

drop function if exists public.dispatch_list(date, date);
drop function if exists public._dispatch_items(date, date);

create or replace function public._dispatch_items(p_from date, p_to date)
returns table (
  source text, source_id uuid, item_index int, day date, time_label text, sort_at timestamptz,
  title text, pax int, client_name text, client_phone text, language text, meeting_point text,
  assignee_id uuid, partner_id uuid, confirmed boolean, done boolean, ref text, trip_id uuid,
  checkin text, notes text
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
         o.booking_ref, null::uuid,
         o.checkin_status, nullif(concat_ws(' · ', o.participants_detail, o.notes), '')
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
         b.reference, null::uuid,
         sa.checkin_status,
         nullif(concat_ws(' · ', case when (it.v->>'frenchGuide')::boolean then 'Guide francophone demandé' end,
                                 case when jsonb_typeof(b.travelers) = 'array' and jsonb_array_length(b.travelers) > 0
                                      then (select string_agg(concat_ws(' ', t->>'firstName', t->>'lastName')
                                                   || coalesce(' (' || nullif(t->>'age','') || ' ans)', ''), ', ')
                                              from jsonb_array_elements(b.travelers) t) end), '')
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
         t.reference, t.id,
         case when a.status in ('completed','done') then 'present' end, a.notes
    from trip_activities a
    join trips t on t.id = a.trip_id
    left join clients c on c.id = t.client_id
   where a.day between p_from and p_to
     and t.status <> 'cancelled'
     and coalesce(a.status,'') not in ('cancelled','replaced')
     and coalesce(a.kind,'activity') = 'activity';
$$;
revoke all on function public._dispatch_items(date, date) from public, anon, authenticated;

create or replace function public.dispatch_list(p_from date, p_to date)
returns table (
  source text, source_id uuid, item_index int, day date, time_label text, sort_at timestamptz,
  title text, pax int, client_name text, client_phone text, language text, meeting_point text,
  assignee_id uuid, partner_id uuid, confirmed boolean, done boolean, ref text, trip_id uuid,
  checkin text, notes text
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

-- Pointage : l'équipe, ou la personne assignée à la sortie.
create or replace function public.dispatch_checkin(p_source text, p_id uuid, p_index int, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if p_status is not null and p_status not in ('present','no_show') then raise exception 'statut invalide'; end if;
  if p_source = 'voyage' then
    select coalesce(a.assignee_id, t.guide_id) into who from trip_activities a join trips t on t.id = a.trip_id where a.id = p_id;
  elsif p_source = 'site' then
    select assignee_id into who from site_booking_assignments where booking_id = p_id and item_index = p_index;
  else
    select guide_id into who from ota_bookings where id = p_id;
  end if;
  if not (public.can_operate(auth.uid()) or who = auth.uid()) then raise exception 'forbidden'; end if;

  if p_source = 'voyage' then
    update trip_activities set
      status = case when p_status = 'present' then 'completed' when status in ('completed','done') then 'confirmed' else status end,
      completed_at = case when p_status = 'present' then now() end,
      updated_at = now()
     where id = p_id;
  elsif p_source = 'site' then
    insert into site_booking_assignments (booking_id, item_index, checkin_status, updated_by)
    values (p_id, p_index, p_status, auth.uid())
    on conflict (booking_id, item_index) do update set checkin_status = excluded.checkin_status, updated_at = now(), updated_by = auth.uid();
  else
    update ota_bookings set checkin_status = p_status,
      checked_in_at = case when p_status is null then null else now() end,
      checked_in_by = case when p_status is null then null else auth.uid() end
     where id = p_id;
  end if;
end $$;
revoke all on function public.dispatch_checkin(text, uuid, int, text) from public, anon;
grant execute on function public.dispatch_checkin(text, uuid, int, text) to authenticated;
