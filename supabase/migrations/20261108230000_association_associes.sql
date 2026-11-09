-- Association JEITINHO (Rafael · Luan · Patricia), nov. 2026.
-- Rôle « associe » : accès complet au périmètre conciergerie (CRM, clients,
-- devis, factures, paiements, voyages, catalogue, billetterie, plateformes),
-- jamais à AFRO LOVE / événements / agents / audience.
-- Les politiques existantes ne sont pas modifiées : on AJOUTE une politique
-- par table, pour ne rien casser.
-- Prérequis (migration séparée, ALTER TYPE ne peut pas être dans la même transaction) :
--   ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'associe';

create or replace function public.is_associe(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(_user_id, 'associe'::public.app_role); $$;

create or replace function public.can_operate(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.can_manage(_user_id) or public.is_associe(_user_id); $$;

revoke execute on function public.is_associe(uuid) from anon;
revoke execute on function public.can_operate(uuid) from anon;

-- Politiques additionnelles « associés » sur le périmètre conciergerie
do $$
declare t text;
begin
  foreach t in array array[
    'clients','prospects','leads','crm_tasks',
    'quotes','quote_lines','invoices','invoice_lines','invoice_number_sequences','payments',
    'trips','trip_activities','trip_accommodations','trip_logistics','trip_transfers','trip_travelers',
    'trip_number_sequences','trip_settings',
    'partners','services','ticket_offers','ticket_offer_variants',
    'ota_bookings','ota_listings','calendar_events'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_associes', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_associe(auth.uid())) with check (public.is_associe(auth.uid()))',
      t || '_associes', t);
  end loop;
  -- lecture seule
  foreach t in array array['bookings','ticket_sales'] loop
    execute format('drop policy if exists %I on public.%I', t || '_associes_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_associe(auth.uid()))',
      t || '_associes_read', t);
  end loop;
end $$;

-- Les RPC métier de la conciergerie acceptent aussi les associés
do $$
declare fn text; def text;
begin
  foreach fn in array array[
    'convert_prospect_to_client','next_invoice_number','next_trip_reference',
    'convert_quote_to_invoice','convert_accepted_quote_to_trip'
  ] loop
    select pg_get_functiondef(p.oid) into def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = fn limit 1;
    if def is not null and def like '%can_manage(auth.uid())%' then
      execute replace(def, 'can_manage(auth.uid())', 'can_operate(auth.uid())');
    end if;
  end loop;
end $$;

-- Catalogue des rôles (écran de validation des comptes)
insert into public.roles (code, label, description, is_active, sort_order)
values ('associe', 'Associé', 'Associé JEITINHO : conciergerie, devis, voyages, catalogue, Manuel et registre des parts (pas AFRO LOVE)', true, 15)
on conflict (code) do update set label = excluded.label, description = excluded.description, is_active = true;

-- =====================================================================
-- Registre des parts (modèle de partage validé le 08/11/2026)
-- =====================================================================

create table if not exists public.partner_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.partner_settings (
  id integer primary key default 1 check (id = 1),
  currency text not null default 'BRL',
  eur_brl numeric(8,4) not null default 5.5,
  pro_labore numeric(12,2) not null default 3000,
  tax_pct numeric(5,2) not null default 6,
  guide_pct numeric(5,2) not null default 30,
  apporteur_pct numeric(5,2) not null default 10,
  reserve_pct numeric(5,2) not null default 20,
  vehicle_fee numeric(12,2) not null default 40,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.partner_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.partner_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null default current_date,
  label text not null,
  source_type text not null default 'manual' check (source_type in ('manual','ota_booking','payment','trip_activity')),
  source_id uuid,
  revenue numeric(12,2) not null default 0,      -- encaissé, en devise du registre (BRL)
  direct_cost numeric(12,2) not null default 0,  -- prestataires, entrées, commission plateforme
  guided_internally boolean not null default false, -- tour guidé par un associé → prime de guide
  guide_id uuid references auth.users(id) on delete set null,
  apporteur_id uuid references auth.users(id) on delete set null,
  vehicle_used boolean not null default false,   -- véhicule de Luan → forfait
  original_amount numeric(12,2),
  original_currency text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists partner_ledger_source_uniq
  on public.partner_ledger_entries (source_type, source_id) where source_id is not null;
create index if not exists partner_ledger_month_idx on public.partner_ledger_entries (occurred_on);

create or replace function public.partner_ledger_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists partner_ledger_touch on public.partner_ledger_entries;
create trigger partner_ledger_touch before update on public.partner_ledger_entries
  for each row execute function public.partner_ledger_touch();

alter table public.partner_members enable row level security;
alter table public.partner_settings enable row level security;
alter table public.partner_ledger_entries enable row level security;

create policy partner_members_read on public.partner_members for select to authenticated using (public.can_operate(auth.uid()));
create policy partner_members_write on public.partner_members for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy partner_settings_read on public.partner_settings for select to authenticated using (public.can_operate(auth.uid()));
create policy partner_settings_write on public.partner_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy partner_ledger_rw on public.partner_ledger_entries for all to authenticated
  using (public.can_operate(auth.uid())) with check (public.can_operate(auth.uid()));

-- Import idempotent des ventes plateformes (GYG…) et des paiements clients d'un mois
create or replace function public.partner_ledger_import_month(p_month date)
returns integer language plpgsql security definer set search_path = public
as $$
declare m_start date := date_trunc('month', p_month)::date;
        m_end date := (date_trunc('month', p_month) + interval '1 month')::date;
        rate numeric; n1 integer; n2 integer;
begin
  if not public.can_operate(auth.uid()) then raise exception 'unauthorized'; end if;
  select eur_brl into rate from public.partner_settings where id = 1;
  rate := coalesce(rate, 5.5);

  insert into public.partner_ledger_entries (occurred_on, label, source_type, source_id, revenue, direct_cost,
                                             guided_internally, original_amount, original_currency, notes)
  select (o.start_at at time zone 'America/Sao_Paulo')::date,
         coalesce(o.activity_title, 'Réservation plateforme') || ' — ' || coalesce(o.lead_name, o.booking_ref, ''),
         'ota_booking', o.id,
         round(case when upper(coalesce(o.currency,'BRL')) = 'EUR' then o.price * rate else o.price end, 2),
         0, true, o.price, upper(coalesce(o.currency,'BRL')),
         initcap(o.platform) || ' ' || coalesce(o.booking_ref,'')
    from public.ota_bookings o
   where o.start_at >= m_start and o.start_at < m_end
     and coalesce(o.status,'') not in ('annulee','cancelled','canceled')
     and coalesce(o.price,0) > 0
  on conflict (source_type, source_id) where source_id is not null do nothing;
  get diagnostics n1 = row_count;

  insert into public.partner_ledger_entries (occurred_on, label, source_type, source_id, revenue, direct_cost,
                                             original_amount, original_currency, notes)
  select p.paid_at,
         'Paiement client' || coalesce(' — ' || c.full_name, '') || coalesce(' (' || p.kind || ')', ''),
         'payment', p.id,
         round(case when upper(coalesce(p.currency,'EUR')) = 'EUR' then p.amount * rate else p.amount end, 2),
         0, p.amount, upper(coalesce(p.currency,'EUR')), p.reference
    from public.payments p
    left join public.clients c on c.id = p.client_id
   where p.paid_at >= m_start and p.paid_at < m_end
     and p.event_id is null
     and (p.quote_id is not null or p.trip_id is not null)
     and coalesce(p.amount,0) > 0
  on conflict (source_type, source_id) where source_id is not null do nothing;
  get diagnostics n2 = row_count;

  return n1 + n2;
end $$;
revoke execute on function public.partner_ledger_import_month(date) from anon;

-- =====================================================================
-- Voyage : remplir depuis un devis existant
-- =====================================================================
create or replace function public.import_quote_into_trip(p_trip_id uuid, p_quote_id uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare q record; t record; n integer;
begin
  if not public.can_operate(auth.uid()) then raise exception 'unauthorized'; end if;
  select * into q from public.quotes where id = p_quote_id;
  if not found then raise exception 'Devis introuvable'; end if;
  select * into t from public.trips where id = p_trip_id;
  if not found then raise exception 'Voyage introuvable'; end if;

  -- En-tête : on complète sans écraser ce qui est déjà saisi
  update public.trips set
    title = case when coalesce(btrim(title),'') in ('','Séjour à Rio','Voyage JEITINHO') then coalesce(q.title, title) else title end,
    client_id = coalesce(client_id, q.client_id),
    source_prospect_id = coalesce(source_prospect_id, q.prospect_id),
    start_date = coalesce(start_date, q.period_start),
    end_date = coalesce(end_date, q.period_end),
    party_size = coalesce(party_size, q.party_size),
    currency = coalesce(currency, q.currency, 'EUR'),
    quoted_amount = case when coalesce(quoted_amount,0) = 0 then coalesce(q.total_amount,0) else quoted_amount end,
    quote_id = coalesce(quote_id, q.id),
    updated_at = now()
  where id = p_trip_id;

  update public.quotes set trip_id = p_trip_id where id = p_quote_id and trip_id is null;

  insert into public.trip_activities (trip_id, quote_line_id, experience_id, service_id, ticket_offer_id, title,
                                      activity_type, status, quantity, sale_price, currency, is_offered, kind,
                                      category, created_by)
  select p_trip_id, l.id, l.experience_id, l.service_id, l.ticket_offer_id, l.label,
         case when l.experience_id is not null then 'experience' when l.service_id is not null then 'service'
              when l.ticket_offer_id is not null then 'ticket' else 'autre' end,
         'to_plan', l.quantity,
         case when coalesce(l.is_offered,false) then 0 else coalesce(l.amount, l.quantity * l.unit_price) end,
         coalesce(l.currency, q.currency, 'EUR'), coalesce(l.is_offered,false), 'activity',
         case when l.service_id is not null then 'deplacement' else 'activite' end,
         auth.uid()
    from public.quote_lines l
   where l.quote_id = p_quote_id
     and coalesce(l.is_optional,false) = false
     and not exists (select 1 from public.trip_activities a where a.trip_id = p_trip_id and a.quote_line_id = l.id)
   order by l.position;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.import_quote_into_trip(uuid, uuid) from anon;
