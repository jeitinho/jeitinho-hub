-- Délai de réponse aux demandes (premier facteur de conversion en vente de voyages).
-- 1. Quand une demande quitte « nouvelle », on note la date du premier contact si elle manque.
-- 2. Une demande encore « nouvelle » 2 h après son arrivée déclenche une notification
--    aux associés (une seule fois), entre 8h et 22h à Rio.

create or replace function public.prospect_first_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'new' and new.status is distinct from 'new' and new.status <> 'lost'
     and new.last_contact_at is null then
    new.last_contact_at := now();
  end if;
  return new;
end $$;
revoke all on function public.prospect_first_contact() from public, anon, authenticated;
drop trigger if exists trg_prospect_first_contact on public.prospects;
create trigger trg_prospect_first_contact before update of status on public.prospects
  for each row execute function public.prospect_first_contact();

create or replace function public.push_unanswered_leads() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; h int := extract(hour from now() at time zone 'America/Sao_Paulo');
begin
  if h < 8 or h >= 22 then return 0; end if;
  for r in
    select p.id, p.name, p.party_size, p.travel_start, p.created_at
      from prospects p
     where p.status = 'new' and p.last_contact_at is null
       and p.created_at < now() - interval '2 hours'
       and p.created_at > now() - interval '3 days'
       and not exists (select 1 from push_outbox o where o.tag = 'unanswered-' || p.id)
  loop
    insert into push_outbox (user_id, title, body, url, tag)
    select u, 'Demande sans réponse · ' || coalesce(r.name, 'client'),
           concat_ws(' · ', 'arrivée il y a ' || floor(extract(epoch from now() - r.created_at) / 3600)::int || ' h',
                     r.party_size || ' pers.', 'voyage le ' || to_char(r.travel_start, 'DD/MM')),
           '/crm', 'unanswered-' || r.id
      from unnest(public.push_operators()) u
     where exists (select 1 from push_subscriptions s where s.user_id = u);
    n := n + 1;
  end loop;
  if n > 0 then perform public.push_wake(); end if;
  return n;
end $$;
revoke all on function public.push_unanswered_leads() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'push-unanswered-leads';
select cron.schedule('push-unanswered-leads', '17 * * * *', $$select public.push_unanswered_leads()$$);
