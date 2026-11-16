-- 1. Corrige la description de la loge premium « Nuit des Champions » : elle
--    parlait encore d'un bord de plage alors que le lieu est le Sambódromo
--    (même défaut de formulation que la loge premium sœur du 5 février).
update public.ticket_offers
set description = 'Loge premium au Sambódromo pour la Nuit des Champions : open bar, buffet gastronomique et transferts inclus.'
where id = '4be1a618-8ea0-4d59-979c-5d3c13039707';

-- 2. Dépublication automatique des offres de billetterie dont la date est
--    passée (ex. l'offre « NFL » du 27/09/2026, encore publiée). Comparaison
--    sur la date de Rio, pas UTC.
create or replace function public.unpublish_past_ticket_offers()
returns void
language sql
security definer
set search_path = public
as $$
  update public.ticket_offers
  set is_published = false
  where is_published = true
    and event_date is not null
    and event_date < (now() at time zone 'America/Sao_Paulo')::date;
$$;
revoke all on function public.unpublish_past_ticket_offers() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'ticket-offers-unpublish-past';
select cron.schedule('ticket-offers-unpublish-past', '10 4 * * *', $$select public.unpublish_past_ticket_offers()$$); -- 01h10 Rio

-- Correction immédiate (ne pas attendre la prochaine exécution planifiée).
select public.unpublish_past_ticket_offers();

-- 3. Prestation JEITINHO (accompagnement), distincte du prix du billet.
--    Le prix du billet (public_price sur le secteur) reste au tarif
--    fournisseur ; cette colonne porte la prestation facturée à part, pour
--    respecter la structure « billet à son prix + prestation » validée par
--    Rafael pour le foot (deux lignes sur facture, jamais fusionnées).
alter table public.ticket_offer_variants
  add column if not exists prestation_fee numeric;
comment on column public.ticket_offer_variants.prestation_fee is
  'Prestation JEITINHO (accompagnement), distincte du prix du billet (public_price). Ne jamais fusionner les deux sur une facture.';

-- 4. Stock serveur pour la soirée du 31 (page /reveillon) : 30 places,
--    vente jusqu'au 31 décembre 2026 20h (heure de Rio). Table dédiée plutôt
--    qu'une réutilisation de la billetterie événementielle existante
--    (events/event_ticket_lots/ticket_sales, bâtie pour les soirées
--    JEITINHO synchronisées avec Sympla/Shotgun) : la soirée du 31 est une
--    vente directe simple à un seul prix, sans canal partenaire.
create table if not exists public.reveillon_night_seats (
  id int primary key default 1 check (id = 1),
  capacity int not null default 30,
  sold int not null default 0 check (sold >= 0),
  sales_cutoff timestamptz not null default '2026-12-31 20:00:00-03',
  updated_at timestamptz not null default now()
);
insert into public.reveillon_night_seats (id, capacity, sold, sales_cutoff)
  values (1, 30, 0, '2026-12-31 20:00:00-03')
  on conflict (id) do nothing;
alter table public.reveillon_night_seats enable row level security;
-- Aucune policy : lecture/écriture uniquement via les fonctions SECURITY DEFINER ci-dessous.

create or replace function public.reveillon_seats_status()
returns table (capacity int, sold int, remaining int, sales_open boolean, sales_cutoff timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select capacity, sold, greatest(capacity - sold, 0) as remaining,
         (now() < sales_cutoff and sold < capacity) as sales_open,
         sales_cutoff
  from public.reveillon_night_seats where id = 1;
$$;
grant execute on function public.reveillon_seats_status() to anon, authenticated;

-- Réserve p_qty places si le stock et la date le permettent. Verrouille la
-- ligne (FOR UPDATE implicite via l'update) pour rester correct avec deux
-- achats simultanés. Retourne false sans rien modifier si refusé : l'appelant
-- (site) ne doit alors pas proposer le paiement Stripe pour cette offre.
create or replace function public.reserve_reveillon_seats(p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare ok boolean;
begin
  if p_qty is null or p_qty <= 0 then return false; end if;
  update public.reveillon_night_seats
  set sold = sold + p_qty, updated_at = now()
  where id = 1
    and now() < sales_cutoff
    and sold + p_qty <= capacity
  returning true into ok;
  return coalesce(ok, false);
end;
$$;
revoke all on function public.reserve_reveillon_seats(int) from public;
grant execute on function public.reserve_reveillon_seats(int) to anon, authenticated;

-- À appeler si un paiement Stripe commencé via reserve_reveillon_seats
-- échoue ou est annulé, pour rendre les places réservées.
create or replace function public.release_reveillon_seats(p_qty int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reveillon_night_seats
  set sold = greatest(sold - p_qty, 0), updated_at = now()
  where id = 1;
$$;
revoke all on function public.release_reveillon_seats(int) from public;
grant execute on function public.release_reveillon_seats(int) to anon, authenticated;
