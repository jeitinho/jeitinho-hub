-- services.famille : les 4 familles de services « à la carte » du plan de
-- refonte, dérivées mécaniquement du group_slug existant — aucun contenu
-- inventé. Null pour les 11 services qui quittent la page Services selon
-- le plan : hébergements (5, -> future page Logements, bloquée sur des
-- partenariats non signés) et événements privés / tournages (6, -> future
-- page professionnelle à part, non construite).
alter table public.services
  add column if not exists famille text check (famille in ('Se déplacer','Se connecter','Sortir','Sur mesure'));
comment on column public.services.famille is 'Une des 4 familles du plan de refonte (services « à la carte » restants dans le menu). Null = service qui quitte la page Services selon le plan : hébergements (-> futur Logements, bloqué sur partenariats signés) et événements privés/tournages (-> future page professionnelle à part, non construite).';

update public.services set famille = 'Se déplacer'
where group_slug in ('transferts','chauffeur','location-bateau','location-vehicule');

update public.services set famille = 'Se connecter'
where group_slug = 'arrivee-connectivite';

update public.services set famille = 'Sortir'
where group_slug in ('vie-nocturne','restaurants');

update public.services set famille = 'Sur mesure'
where group_slug in ('guide','barber','tatoueur','shopping');
