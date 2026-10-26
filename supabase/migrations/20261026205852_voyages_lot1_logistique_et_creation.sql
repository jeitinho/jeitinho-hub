-- Lot 1 — Voyage : création depuis une demande + onglet Logistique

-- Réglage unique : mode manuel ou automatique pour la création des voyages depuis une demande.
create table public.trip_settings (
  id integer primary key default 1,
  trip_creation_mode text not null default 'manual' check (trip_creation_mode in ('manual','automatic')),
  updated_at timestamptz not null default now(),
  constraint trip_settings_single_row check (id = 1)
);
insert into public.trip_settings (id) values (1);
alter table public.trip_settings enable row level security;
create policy trip_settings_rw_managers on public.trip_settings
  for all using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()));

-- Logistique du voyage : arrivée, départ, carte SIM (une ligne par voyage).
create table public.trip_logistics (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  arrival_date date,
  arrival_time time,
  arrival_flight text,
  arrival_airport text,
  departure_date date,
  departure_time time,
  departure_flight text,
  departure_airport text,
  sim_operator text,
  sim_plan text,
  sim_discount boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.trip_logistics enable row level security;
create policy trip_logistics_rw_managers on public.trip_logistics
  for all using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()));

-- Transferts (plusieurs par voyage).
create table public.trip_transfers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  transfer_date date,
  route text not null,
  included boolean not null default false,
  provider text,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trip_transfers_trip_id_idx on public.trip_transfers(trip_id);
alter table public.trip_transfers enable row level security;
create policy trip_transfers_rw_managers on public.trip_transfers
  for all using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()));

-- Logements (plusieurs par voyage, ex. Rio + Ilha Grande).
create table public.trip_accommodations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  address text,
  neighborhood text,
  start_date date,
  end_date date,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trip_accommodations_trip_id_idx on public.trip_accommodations(trip_id);
alter table public.trip_accommodations enable row level security;
create policy trip_accommodations_rw_managers on public.trip_accommodations
  for all using (public.can_manage(auth.uid())) with check (public.can_manage(auth.uid()));

-- Création automatique d'un voyage brouillon à l'arrivée d'un prospect, si le réglage est actif.
-- SECURITY DEFINER : doit fonctionner même si l'insertion du prospect vient d'un chemin sans session
-- manager (RPC publique du site jeitinho.fr) — la légitimité vient du déclencheur, pas de la session.
create or replace function public.auto_create_trip_from_prospect()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  mode text;
  first_name text;
  trip_title text;
  ref text;
  next_n integer;
  yr integer := extract(year from now())::integer;
begin
  select trip_creation_mode into mode from public.trip_settings where id = 1;
  if mode is distinct from 'automatic' then
    return new;
  end if;
  if exists (select 1 from public.trips where source_prospect_id = new.id) then
    return new;
  end if;

  first_name := split_part(trim(coalesce(new.name, '')), ' ', 1);
  if first_name = '' then
    first_name := 'Client';
  end if;
  trip_title := first_name;
  if new.travel_start is not null and new.travel_end is not null then
    trip_title := trip_title || ' - Du ' || to_char(new.travel_start, 'DD/MM') || ' au ' || to_char(new.travel_end, 'DD/MM');
  elsif new.travel_start is not null then
    trip_title := trip_title || ' - Du ' || to_char(new.travel_start, 'DD/MM');
  elsif new.travel_end is not null then
    trip_title := trip_title || ' - Jusqu''au ' || to_char(new.travel_end, 'DD/MM');
  end if;

  insert into public.trip_number_sequences (year, next_number)
  values (yr, 2)
  on conflict (year) do update set next_number = trip_number_sequences.next_number + 1, updated_at = now()
  returning next_number - 1 into next_n;
  ref := 'TRIP-' || yr::text || '-' || lpad(next_n::text, 4, '0');

  insert into public.trips (
    reference, title, client_id, status, start_date, end_date, party_size,
    source, source_prospect_id, created_by
  ) values (
    ref, trip_title, new.client_id, 'draft', new.travel_start, new.travel_end, new.party_size,
    'automatic', new.id, new.created_by
  );
  return new;
end;
$$;

create trigger trg_auto_create_trip_from_prospect
  after insert on public.prospects
  for each row execute function public.auto_create_trip_from_prospect();
