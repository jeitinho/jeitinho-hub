-- Lot 4 — Devis généré depuis le voyage

alter table public.quotes
  add column trip_id uuid references public.trips(id),
  add column version integer not null default 1,
  add column planning_synced_at timestamptz;
create index quotes_trip_id_idx on public.quotes(trip_id);
comment on column public.quotes.trip_id is 'Voyage source (un voyage peut avoir plusieurs versions de devis au fil du temps).';
comment on column public.quotes.version is 'Version du devis pour ce voyage (v1, v2… affiché en suffixe du numéro : « 2026-012 v2 »).';
comment on column public.quotes.planning_synced_at is 'Dernière génération/synchro des lignes depuis le planning du voyage.';

-- Acompte par défaut 50 % (remplace les 30 codés en dur, cf. Lot 0/4).
alter table public.quotes alter column deposit_pct set default 50;

alter table public.quote_lines
  add column trip_activity_id uuid references public.trip_activities(id),
  add column is_offered boolean not null default false,
  add column is_optional boolean not null default false;
create index quote_lines_trip_activity_id_idx on public.quote_lines(trip_activity_id);
comment on column public.quote_lines.is_offered is '« Offert » : affiché 0 €, exclu du total.';
comment on column public.quote_lines.is_optional is '« En option » : hors total principal, inclus dans le total « avec options ».';
