-- Corriger l'heure (et au besoin la date) d'une sortie depuis le dispatch :
-- GetYourGuide envoie parfois la date sans heure (« Heure ? »).
create or replace function public.dispatch_set_time(p_source text, p_id uuid, p_index int, p_day date, p_time text)
returns void language plpgsql security definer set search_path = public as $$
declare ts timestamptz;
begin
  if not public.can_operate(auth.uid()) then raise exception 'forbidden'; end if;
  if p_time !~ '^\d{1,2}:\d{2}$' then raise exception 'heure invalide (HH:MM)'; end if;
  ts := (p_day::text || ' ' || p_time)::timestamp at time zone 'America/Sao_Paulo';
  if p_source = 'voyage' then
    update trip_activities
       set day = p_day, scheduled_start = ts, display_time = replace(lpad(p_time, 5, '0'), ':', 'h'), updated_at = now()
     where id = p_id;
  elsif p_source = 'site' then
    update bookings
       set items = jsonb_set(jsonb_set(items, array[p_index::text, 'time'], to_jsonb(lpad(p_time, 5, '0'))),
                             array[p_index::text, 'date'], to_jsonb(p_day::text)),
           updated_at = now()
     where id = p_id and jsonb_typeof(items) = 'array' and jsonb_array_length(items) > p_index;
  else
    update ota_bookings set start_at = ts where id = p_id;
  end if;
end $$;
revoke all on function public.dispatch_set_time(text, uuid, int, date, text) from public, anon;
grant execute on function public.dispatch_set_time(text, uuid, int, date, text) to authenticated;
