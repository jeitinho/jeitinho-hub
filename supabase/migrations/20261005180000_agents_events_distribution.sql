-- Modules « À valider », « Agents », « Événements », « Distribution », « Groupe WhatsApp », « Manuel »
-- Additive only: new tables + manager-only RLS policies on tables that had RLS enabled but no policy.

-- 1. Journal des agents IA (tâches planifiées Cowork)
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  status text not null default 'ok' check (status in ('ok', 'partiel', 'erreur')),
  summary text,
  report text,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists agent_runs_agent_started_idx on public.agent_runs (agent, started_at desc);
alter table public.agent_runs enable row level security;
drop policy if exists agent_runs_managers on public.agent_runs;
create policy agent_runs_managers on public.agent_runs for all
  using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()));

-- 2. Événements (AFRO LOVE et suivants)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  edition text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  neighborhood text,
  capacity integer,
  presale_target integer,
  door_price numeric,
  currency text not null default 'BRL',
  partner_ticket_commission numeric not null default 5,
  partner_vip_commission_pct numeric not null default 10,
  venue_share_pct numeric not null default 50,
  cofounder_share_pct numeric not null default 50,
  status text not null default 'planifie' check (status in ('planifie', 'en_vente', 'termine', 'annule')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Relevés cumulés de billetterie, par canal (le dernier relevé de chaque canal fait foi)
create table if not exists public.event_ticket_counts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  channel text not null check (channel in ('sympla', 'shotgun', 'porte', 'invitation', 'autre')),
  tickets integer not null default 0 check (tickets >= 0),
  revenue numeric,
  vip_tables integer not null default 0 check (vip_tables >= 0),
  vip_revenue numeric,
  source text not null default 'manuel',
  note text,
  recorded_at timestamptz not null default now()
);
create index if not exists event_ticket_counts_event_idx on public.event_ticket_counts (event_id, channel, recorded_at desc);

-- Ventes par relais (guides, hostels, agences) et commissions
create table if not exists public.event_partner_sales (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete set null,
  partner_name text not null,
  tickets integer not null default 0 check (tickets >= 0),
  vip_revenue numeric not null default 0,
  paid boolean not null default false,
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists event_partner_sales_unique on public.event_partner_sales (event_id, partner_name);

-- Caisse de fin de soirée (base du partage)
create table if not exists public.event_settlements (
  event_id uuid primary key references public.events(id) on delete cascade,
  ticket_revenue numeric not null default 0,
  vip_revenue numeric not null default 0,
  bar_revenue numeric not null default 0,
  drinks_cost numeric not null default 0,
  house_costs numeric not null default 0,
  other_costs numeric not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

-- 3. Distribution (GetYourGuide et autres plateformes)
create table if not exists public.ota_listings (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'getyourguide',
  experience_id uuid references public.experiences(id) on delete set null,
  external_id text,
  title text not null,
  status text not null default 'brouillon' check (status in ('brouillon', 'en_examen', 'a_corriger', 'en_ligne', 'refuse', 'archive')),
  issue text,
  url text,
  bookings_count integer not null default 0,
  reviews_count integer not null default 0,
  rating numeric,
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers
drop trigger if exists events_touch on public.events;
create trigger events_touch before update on public.events for each row execute function public.update_updated_at_column();
drop trigger if exists event_partner_sales_touch on public.event_partner_sales;
create trigger event_partner_sales_touch before update on public.event_partner_sales for each row execute function public.update_updated_at_column();
drop trigger if exists event_settlements_touch on public.event_settlements;
create trigger event_settlements_touch before update on public.event_settlements for each row execute function public.update_updated_at_column();
drop trigger if exists ota_listings_touch on public.ota_listings;
create trigger ota_listings_touch before update on public.ota_listings for each row execute function public.update_updated_at_column();

-- RLS: admin / manager only
do $$
declare t text;
begin
  foreach t in array array['events', 'event_ticket_counts', 'event_partner_sales', 'event_settlements', 'ota_listings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_managers', t);
    execute format('create policy %I on public.%I for all using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()))', t || '_managers', t);
  end loop;
end $$;

-- 4. Tables existantes sans policy (RLS activée, donc invisibles dans le manager)
drop policy if exists whatsapp_posts_managers on public.whatsapp_posts;
create policy whatsapp_posts_managers on public.whatsapp_posts for all
  using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()));
drop policy if exists whatsapp_weeks_managers on public.whatsapp_weeks;
create policy whatsapp_weeks_managers on public.whatsapp_weeks for all
  using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()));
drop policy if exists sales_read_managers on public.sales;
create policy sales_read_managers on public.sales for select using (public.can_manage(auth.uid()));
drop policy if exists sales_channels_managers on public.sales_channels;
create policy sales_channels_managers on public.sales_channels for all
  using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()));
