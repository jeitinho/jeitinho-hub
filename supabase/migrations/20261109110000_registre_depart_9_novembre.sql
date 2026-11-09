-- Registre des parts : uniquement des faits (09/11/2026).
--  * Les comptes de l'association partent du 09/11/2026 : rien avant cette date.
--  * Une vente n'est comptée dans le partage que quand l'argent est REÇU, au montant réellement reçu
--    (en BRL, sur le compte). Une réservation GetYourGuide arrive « À venir » : GYG verse plus tard,
--    commission déduite ; le montant client n'est qu'un montant attendu.
--  * Plus de conversion EUR→BRL ni de taux d'impôt supposés : montant reçu saisi, impôts à renseigner
--    quand le contador aura donné le taux (0 % tant que non renseigné, signalé dans l'écran).

alter table public.partner_settings add column if not exists start_date date not null default date '2026-11-09';
alter table public.partner_settings add column if not exists tax_confirmed boolean not null default false;
update public.partner_settings set start_date = date '2026-11-09', tax_pct = 0, tax_confirmed = false where id = 1;

alter table public.partner_ledger_entries add column if not exists cash_status text not null default 'a_recevoir'
  check (cash_status in ('a_recevoir','recu'));
alter table public.partner_ledger_entries add column if not exists expected_amount numeric(12,2);
alter table public.partner_ledger_entries add column if not exists expected_currency text;
alter table public.partner_ledger_entries add column if not exists expected_on date;
alter table public.partner_ledger_entries add column if not exists received_on date;

-- Lignes déjà présentes : rien n'a été confirmé comme reçu → « À venir », montant attendu conservé.
update public.partner_ledger_entries
   set expected_amount = coalesce(expected_amount, original_amount, revenue),
       expected_currency = coalesce(expected_currency, original_currency, 'BRL'),
       revenue = 0, cash_status = 'a_recevoir'
 where cash_status = 'a_recevoir' and received_on is null;

create or replace function public.partner_ledger_start() returns date
language sql stable security definer set search_path = public as $$
  select coalesce((select start_date from partner_settings where id = 1), date '2026-11-09') $$;

-- Garde-fou : rien avant la date de départ ; « reçu » exige un montant et une date de réception.
create or replace function public.partner_ledger_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.occurred_on < public.partner_ledger_start() then
    if new.source_type = 'manual' then
      raise exception 'Le registre commence le % : date antérieure refusée.', to_char(public.partner_ledger_start(), 'DD/MM/YYYY');
    end if;
    return null; -- vente antérieure importée automatiquement : ignorée
  end if;
  if new.cash_status = 'recu' and (new.received_on is null or coalesce(new.revenue,0) <= 0) then
    raise exception 'Pour marquer « reçu », indique le montant réellement reçu et la date.';
  end if;
  if new.cash_status = 'a_recevoir' then
    new.revenue := 0;
    new.received_on := null;
  end if;
  return new;
end $$;
drop trigger if exists partner_ledger_guard on public.partner_ledger_entries;
create trigger partner_ledger_guard before insert or update on public.partner_ledger_entries
  for each row execute function public.partner_ledger_guard();

-- Réservations plateformes : entrent « À venir » avec le prix client comme montant attendu.
create or replace function public.partner_ledger_from_ota() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from partner_ledger_entries where source_type = 'ota_booking' and source_id = old.id and cash_status = 'a_recevoir';
    return old;
  end if;
  if coalesce(new.status,'') in ('annulee','cancelled','canceled') or coalesce(new.price,0) <= 0 then
    delete from partner_ledger_entries where source_type = 'ota_booking' and source_id = new.id and cash_status = 'a_recevoir';
    return new;
  end if;
  insert into partner_ledger_entries (occurred_on, label, source_type, source_id, cash_status, revenue, direct_cost,
                                      guided_internally, guide_id, expected_amount, expected_currency, notes)
  values (coalesce((new.start_at at time zone 'America/Sao_Paulo')::date, current_date),
          coalesce(new.activity_title, 'Réservation plateforme') || ' — ' || coalesce(new.lead_name, new.booking_ref, ''),
          'ota_booking', new.id, 'a_recevoir', 0, 0, true, new.guide_id,
          new.price, upper(coalesce(new.currency,'BRL')),
          initcap(new.platform) || ' ' || coalesce(new.booking_ref,'') || ' · prix client, versement plateforme à venir')
  on conflict (source_type, source_id) where source_id is not null do update set
    occurred_on = excluded.occurred_on,
    expected_amount = excluded.expected_amount,
    expected_currency = excluded.expected_currency,
    guide_id = coalesce(excluded.guide_id, partner_ledger_entries.guide_id);
  return new;
end $$;

-- Paiements clients enregistrés dans le hub : montant connu, mais à confirmer en BRL reçu sur le compte.
create or replace function public.partner_ledger_from_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if tg_op = 'DELETE' then
    delete from partner_ledger_entries where source_type = 'payment' and source_id = old.id and cash_status = 'a_recevoir';
    return old;
  end if;
  if new.event_id is not null or (new.quote_id is null and new.trip_id is null) or coalesce(new.amount,0) <= 0 then
    delete from partner_ledger_entries where source_type = 'payment' and source_id = new.id and cash_status = 'a_recevoir';
    return new;
  end if;
  select full_name into who from clients where id = new.client_id;
  insert into partner_ledger_entries (occurred_on, label, source_type, source_id, cash_status, revenue, direct_cost,
                                      expected_amount, expected_currency, expected_on, notes)
  values (coalesce(new.paid_at, current_date),
          'Paiement client' || coalesce(' — ' || who, '') || coalesce(' (' || new.kind || ')', ''),
          'payment', new.id, 'a_recevoir', 0, 0,
          new.amount, upper(coalesce(new.currency,'EUR')), new.paid_at,
          coalesce(new.method || ' · ', '') || coalesce(new.reference, '') || ' · confirmer le montant reçu sur le compte')
  on conflict (source_type, source_id) where source_id is not null do update set
    occurred_on = excluded.occurred_on,
    expected_amount = excluded.expected_amount,
    expected_currency = excluded.expected_currency;
  return new;
end $$;

-- Import manuel du mois : même logique (À venir), ne touche jamais une ligne déjà reçue.
create or replace function public.partner_ledger_import_month(p_month date)
returns integer language plpgsql security definer set search_path = public
as $$
declare m_start date := greatest(date_trunc('month', p_month)::date, public.partner_ledger_start());
        m_end date := (date_trunc('month', p_month) + interval '1 month')::date;
        n1 integer; n2 integer;
begin
  if not public.can_operate(auth.uid()) then raise exception 'unauthorized'; end if;
  insert into public.partner_ledger_entries (occurred_on, label, source_type, source_id, cash_status, revenue, direct_cost,
                                             guided_internally, guide_id, expected_amount, expected_currency, notes)
  select (o.start_at at time zone 'America/Sao_Paulo')::date,
         coalesce(o.activity_title, 'Réservation plateforme') || ' — ' || coalesce(o.lead_name, o.booking_ref, ''),
         'ota_booking', o.id, 'a_recevoir', 0, 0, true, o.guide_id, o.price, upper(coalesce(o.currency,'BRL')),
         initcap(o.platform) || ' ' || coalesce(o.booking_ref,'') || ' · prix client, versement plateforme à venir'
    from public.ota_bookings o
   where o.start_at >= m_start and o.start_at < m_end
     and coalesce(o.status,'') not in ('annulee','cancelled','canceled') and coalesce(o.price,0) > 0
  on conflict (source_type, source_id) where source_id is not null do nothing;
  get diagnostics n1 = row_count;
  insert into public.partner_ledger_entries (occurred_on, label, source_type, source_id, cash_status, revenue, direct_cost,
                                             expected_amount, expected_currency, expected_on, notes)
  select p.paid_at, 'Paiement client' || coalesce(' — ' || c.full_name, '') || coalesce(' (' || p.kind || ')', ''),
         'payment', p.id, 'a_recevoir', 0, 0, p.amount, upper(coalesce(p.currency,'EUR')), p.paid_at,
         coalesce(p.method || ' · ', '') || coalesce(p.reference, '') || ' · confirmer le montant reçu sur le compte'
    from public.payments p left join public.clients c on c.id = p.client_id
   where p.paid_at >= m_start and p.paid_at < m_end and p.event_id is null
     and (p.quote_id is not null or p.trip_id is not null) and coalesce(p.amount,0) > 0
  on conflict (source_type, source_id) where source_id is not null do nothing;
  get diagnostics n2 = row_count;
  return n1 + n2;
end $$;
revoke execute on function public.partner_ledger_import_month(date) from public, anon;
grant execute on function public.partner_ledger_import_month(date) to authenticated;

-- Les lignes antérieures au départ sortent du registre (elles restent visibles dans GetYourGuide / paiements).
delete from public.partner_ledger_entries
 where occurred_on < (select start_date from public.partner_settings where id = 1);
