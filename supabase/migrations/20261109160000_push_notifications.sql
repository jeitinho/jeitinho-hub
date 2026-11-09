-- Notifications push du hub installé sur téléphone (PWA).
-- Principe : les déclencheurs déposent un message dans push_outbox puis réveillent
-- la fonction Edge « push-send » (appel sans contenu). La fonction lit la file
-- avec la clé serveur et envoie. Un réveil non sollicité ne peut donc rien
-- envoyer d'autre que ce qui est déjà dans la file.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.push_outbox (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  url text,
  tag text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);
alter table public.push_outbox enable row level security; -- aucune policy : serveur uniquement

-- Clés VAPID générées par la fonction Edge à son premier appel. Serveur uniquement.
create table if not exists public.push_vapid (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
alter table public.push_vapid enable row level security;

create or replace function public.push_public_key()
returns text language sql stable security definer set search_path = public as $$
  select public_key from push_vapid where id = 1;
$$;
revoke all on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;

create or replace function public.push_wake()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://sxzdabtarlgozixcbzus.supabase.co/functions/v1/push-send',
    body := '{}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
exception when others then null; -- une notification ne doit jamais bloquer l'action métier
end $$;
revoke all on function public.push_wake() from public, anon, authenticated;

create or replace function public.notify_push(p_users uuid[], p_title text, p_body text, p_url text, p_tag text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into push_outbox (user_id, title, body, url, tag)
  select distinct u, p_title, p_body, p_url, p_tag from unnest(p_users) u
   where u is not null
     and exists (select 1 from push_subscriptions s where s.user_id = u);
  if found then perform public.push_wake(); end if;
end $$;
revoke all on function public.notify_push(uuid[], text, text, text, text) from public, anon, authenticated;

-- Destinataires « pilotage » : admins et associés.
create or replace function public.push_operators()
returns uuid[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct user_id), '{}') from user_roles where role::text in ('admin','associe');
$$;
revoke all on function public.push_operators() from public, anon, authenticated;

-- 1. Nouvelle demande client
create or replace function public.push_on_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_push(public.push_operators(),
    'Nouvelle demande · ' || coalesce(new.name, 'client'),
    concat_ws(' · ', nullif(new.party_size::text || ' pers.', ' pers.'),
              to_char(new.travel_start, 'DD/MM') || coalesce(' → ' || to_char(new.travel_end, 'DD/MM'), ''),
              replace(coalesce(new.source, ''), 'jeitinho.fr/', 'site ')),
    '/crm', 'lead-' || new.id);
  return new;
exception when others then
  return new; -- une notification ne doit jamais bloquer l'enregistrement
end $$;
drop trigger if exists trg_push_on_lead on public.leads;
create trigger trg_push_on_lead after insert on public.leads
  for each row execute function public.push_on_lead();

-- 2. Nouvelle réservation plateforme (GetYourGuide…)
create or replace function public.push_on_ota_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmee' then
    perform public.notify_push(public.push_operators(),
      'Réservation ' || initcap(coalesce(new.platform, '')) || ' · ' || coalesce(new.participants::text || ' pers.', ''),
      coalesce(new.activity_title, '') || coalesce(' — ' || to_char(new.start_at at time zone 'America/Sao_Paulo', 'DD/MM HH24"h"MI'), ''),
      '/dispatch', 'ota-' || new.id);
  end if;
  return new;
exception when others then
  return new; -- une notification ne doit jamais bloquer l'enregistrement
end $$;
drop trigger if exists trg_push_on_ota_booking on public.ota_bookings;
create trigger trg_push_on_ota_booking after insert on public.ota_bookings
  for each row execute function public.push_on_ota_booking();

-- 3. Panier payé sur le site
create or replace function public.push_on_site_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform public.notify_push(public.push_operators(),
      'Réservation payée sur le site · ' || coalesce(new.prenom, ''),
      coalesce(new.nb_travelers::text || ' pers. · ', '') || coalesce(new.amount_due::text, '') || ' — ' || coalesce(new.reference, ''),
      '/dispatch', 'site-' || new.id);
  end if;
  return new;
exception when others then
  return new; -- une notification ne doit jamais bloquer l'enregistrement
end $$;
drop trigger if exists trg_push_on_site_booking on public.bookings;
create trigger trg_push_on_site_booking after insert or update of status on public.bookings
  for each row execute function public.push_on_site_booking();

-- 4. Sortie assignée à quelqu'un (les trois sources)
create or replace function public.push_on_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare who uuid; title text; at_txt text; tag text;
begin
  if tg_table_name = 'ota_bookings' then
    who := new.guide_id;
    if who is null or who is not distinct from old.guide_id then return new; end if;
    title := coalesce(new.activity_title, 'Sortie');
    at_txt := to_char(new.start_at at time zone 'America/Sao_Paulo', 'DD/MM HH24"h"MI');
    tag := 'assign-' || new.id;
  elsif tg_table_name = 'trip_activities' then
    who := new.assignee_id;
    if who is null or who is not distinct from old.assignee_id then return new; end if;
    title := new.title;
    at_txt := to_char(new.day, 'DD/MM') || coalesce(' ' || new.display_time, '');
    tag := 'assign-' || new.id;
  else
    who := new.assignee_id;
    if who is null or (tg_op = 'UPDATE' and who is not distinct from old.assignee_id) then return new; end if;
    select coalesce(it.v->>'title', 'Sortie'), to_char(public.safe_date(it.v->>'date'), 'DD/MM') || coalesce(' ' || (it.v->>'time'), '')
      into title, at_txt
      from bookings b, jsonb_array_elements(b.items) with ordinality it(v, ord)
     where b.id = new.booking_id and it.ord - 1 = new.item_index;
    tag := 'assign-' || new.booking_id || '-' || new.item_index;
  end if;
  if who = auth.uid() then return new; end if; -- inutile de se notifier soi-même
  perform public.notify_push(array[who], 'Nouvelle sortie pour toi', coalesce(at_txt || ' — ', '') || coalesce(title, ''),
                             '/dispatch', tag);
  return new;
exception when others then
  return new; -- une notification ne doit jamais bloquer l'enregistrement
end $$;

drop trigger if exists trg_push_assign_ota on public.ota_bookings;
create trigger trg_push_assign_ota after update of guide_id on public.ota_bookings
  for each row execute function public.push_on_assignment();
drop trigger if exists trg_push_assign_activity on public.trip_activities;
create trigger trg_push_assign_activity after update of assignee_id on public.trip_activities
  for each row execute function public.push_on_assignment();
drop trigger if exists trg_push_assign_site on public.site_booking_assignments;
create trigger trg_push_assign_site after insert or update of assignee_id on public.site_booking_assignments
  for each row execute function public.push_on_assignment();
