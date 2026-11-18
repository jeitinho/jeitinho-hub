-- =====================================================================
-- 1. Création de compte espace client (e-mail/mot de passe, prénom +
--    téléphone obligatoires à l'inscription). link_my_client_account()
--    ne couvre que le cas d'une fiche client déjà existante ; celle-ci
--    couvre aussi le nouveau client sans réservation préalable.
-- =====================================================================
create or replace function public.upsert_my_client_account(p_first_name text, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_email text; v_client_id uuid;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'Aucun utilisateur authentifié';
  end if;

  -- Fiche existante (créée manuellement ou par une réservation antérieure),
  -- pas encore reliée : on la relie et on ne complète que ce qui manque,
  -- sans écraser un nom/téléphone déjà saisi par l'équipe.
  update public.clients
     set auth_user_id = auth.uid(),
         full_name = case when full_name is null or btrim(full_name) = '' then p_first_name else full_name end,
         phone = case when phone is null or btrim(phone) = '' then p_phone else phone end
   where auth_user_id is null and lower(email) = lower(v_email)
  returning id into v_client_id;
  if v_client_id is not null then return v_client_id; end if;

  -- Déjà relié (ré-appel de la fonction) : on renvoie la fiche existante,
  -- sans rien modifier.
  select id into v_client_id from public.clients where auth_user_id = auth.uid();
  if v_client_id is not null then return v_client_id; end if;

  -- Aucune fiche : nouveau client sans réservation préalable.
  insert into public.clients (full_name, email, phone, auth_user_id, source)
  values (p_first_name, v_email, p_phone, auth.uid(), 'jeitinho.fr/mon-voyage')
  returning id into v_client_id;
  return v_client_id;
end $$;
revoke all on function public.upsert_my_client_account(text, text) from public, anon;
grant execute on function public.upsert_my_client_account(text, text) to authenticated;

-- =====================================================================
-- 2. Infos de voyage transmises par le client (vols, logement, demandes
--    particulières) : simple formulaire client, jamais la grille de
--    planning elle-même (qui reste un objet staff dans trip_logistics /
--    trip_accommodations / trip_transfers, lus par cette table-ci,
--    jamais modifiés par elle). Nom délibérément différent de
--    trip_logistics (table staff déjà existante) pour ne jamais confondre
--    les deux : l'équipe transcrit manuellement ce qui est utile.
-- =====================================================================
create table if not exists public.trip_client_logistics (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references public.trips(id) on delete cascade,
  arrival_flight_number text,
  arrival_at timestamptz,
  departure_flight_number text,
  departure_at timestamptz,
  accommodation_name text,
  accommodation_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.trip_client_logistics is 'Saisie par le client dans son espace (jamais par l''équipe) : infos de vol/logement/demandes transmises pour que l''équipe bâtisse le planning. Le client ne modifie jamais trip_logistics/trip_accommodations/trip_transfers (tables staff).';
alter table public.trip_client_logistics enable row level security;

create policy trip_client_logistics_associes on public.trip_client_logistics
  for all using (is_associe((select auth.uid())));
create policy trip_client_logistics_rw_managers on public.trip_client_logistics
  for all using (can_manage((select auth.uid())));

create policy trip_client_logistics_read_self_client on public.trip_client_logistics
  for select to authenticated using (
    exists (select 1 from public.trips t where t.id = trip_client_logistics.trip_id and t.client_id = public.current_client_id())
  );
create policy trip_client_logistics_insert_self_client on public.trip_client_logistics
  for insert to authenticated with check (
    exists (select 1 from public.trips t where t.id = trip_client_logistics.trip_id and t.client_id = public.current_client_id())
  );
create policy trip_client_logistics_update_self_client on public.trip_client_logistics
  for update to authenticated using (
    exists (select 1 from public.trips t where t.id = trip_client_logistics.trip_id and t.client_id = public.current_client_id())
  ) with check (
    exists (select 1 from public.trips t where t.id = trip_client_logistics.trip_id and t.client_id = public.current_client_id())
  );
