-- Formulaires du site : les dates de voyage n'étaient pas reprises dans le CRM.
-- « Trouver mon jeitinho » envoie les dates dans raw_payload.duree (« 2026-12-04 → 2026-12-10 »),
-- le panier (« mon voyage ») dans raw_payload.items[].date : travel_start / travel_end restaient vides.
-- 1) parse tolérant (jamais d'exception : une date mal formée ne doit pas faire perdre le lead) ;
-- 2) repli sur raw_payload dans capture_public_lead ;
-- 3) rattrapage des leads / demandes déjà reçus.

create or replace function public.safe_date(p text)
returns date language plpgsql immutable set search_path = public
as $$
declare m text[];
begin
  if p is null then return null; end if;
  m := regexp_match(p, '(\d{4})-(\d{2})-(\d{2})');
  if m is not null then
    begin return make_date(m[1]::int, m[2]::int, m[3]::int); exception when others then return null; end;
  end if;
  m := regexp_match(p, '(\d{1,2})/(\d{1,2})/(\d{4})');
  if m is not null then
    begin return make_date(m[3]::int, m[2]::int, m[1]::int); exception when others then return null; end;
  end if;
  return null;
end $$;

create or replace function public.lead_dates_from_payload(p_raw jsonb, out d_start date, out d_end date)
language plpgsql immutable set search_path = public
as $$
declare dates date[];
begin
  if p_raw is null then return; end if;
  d_start := coalesce(public.safe_date(p_raw->>'date_souhaitee'), public.safe_date(p_raw->>'date_depart'),
                      public.safe_date(p_raw->>'arrivee'), public.safe_date(p_raw->>'date_arrivee'));
  d_end := coalesce(public.safe_date(p_raw->>'date_retour'), public.safe_date(p_raw->>'depart'));
  if p_raw ? 'duree' then
    select array_agg(public.safe_date(x[1]) order by ord) into dates
      from regexp_matches(coalesce(p_raw->>'duree',''), '(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})', 'g') with ordinality as r(x, ord);
    if dates is not null then
      d_start := coalesce(d_start, dates[1]);
      if array_length(dates,1) >= 2 then d_end := coalesce(d_end, dates[2]); end if;
    end if;
  end if;
  if jsonb_typeof(p_raw->'items') = 'array' then
    select coalesce(d_start, min(public.safe_date(i->>'date'))), coalesce(d_end, nullif(max(public.safe_date(i->>'date')), min(public.safe_date(i->>'date'))))
      into d_start, d_end
      from jsonb_array_elements(p_raw->'items') i;
  end if;
  if d_start is not null and d_end is not null and d_end < d_start then d_end := null; end if;
end $$;

do $$
declare def text;
begin
  select pg_get_functiondef('public.capture_public_lead'::regproc) into def;
  def := replace(def,
    $r$lead_travel_start := CASE WHEN NULLIF(p_payload->>'travel_start','') IS NULL THEN NULL ELSE (p_payload->>'travel_start')::date END;$r$,
    $r$lead_travel_start := COALESCE(public.safe_date(p_payload->>'travel_start'), (public.lead_dates_from_payload(p_payload->'raw_payload')).d_start);$r$);
  def := replace(def,
    $r$lead_travel_end := CASE WHEN NULLIF(p_payload->>'travel_end','') IS NULL THEN NULL ELSE (p_payload->>'travel_end')::date END;$r$,
    $r$lead_travel_end := COALESCE(public.safe_date(p_payload->>'travel_end'), (public.lead_dates_from_payload(p_payload->'raw_payload')).d_end);$r$);
  if def not like '%lead_dates_from_payload%' then
    raise exception 'capture_public_lead : motif introuvable, rien modifié';
  end if;
  execute def;
end $$;

-- Rattrapage
with d as (
  select l.id, l.prospect_id, (public.lead_dates_from_payload(l.raw_payload)).*
    from public.leads l
   where l.travel_start is null or l.travel_end is null
)
update public.leads l set travel_start = coalesce(l.travel_start, d.d_start), travel_end = coalesce(l.travel_end, d.d_end)
  from d where d.id = l.id and (d.d_start is not null or d.d_end is not null);

update public.prospects p set travel_start = coalesce(p.travel_start, l.travel_start), travel_end = coalesce(p.travel_end, l.travel_end), updated_at = now()
  from public.leads l
 where l.prospect_id = p.id and (p.travel_start is null and l.travel_start is not null or p.travel_end is null and l.travel_end is not null);

-- Voyages brouillons créés automatiquement sans dates
update public.trips t set start_date = coalesce(t.start_date, p.travel_start), end_date = coalesce(t.end_date, p.travel_end), updated_at = now()
  from public.prospects p
 where t.source_prospect_id = p.id and t.status = 'draft' and (t.start_date is null or t.end_date is null)
   and (p.travel_start is not null or p.travel_end is not null);
