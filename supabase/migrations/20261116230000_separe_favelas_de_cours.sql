-- Même correction que la séparation Excursions / Mer & activités nautiques :
-- Rafael ne veut pas mélanger les favelas et les cours culturels (samba,
-- funk, capoeira, cuisine, portugais) dans une même catégorie « Favelas &
-- culture ». Catalogue interne aligné sur le site public.
--  - Favelas (6 lignes) : Rocinha, PPG, Vidigal, Santa Marta, Cidade de
--    Deus, Tavares Bastos.
--  - Cours (5 lignes, nouvelle) : samba, funk, capoeira, cuisine
--    brésilienne, portugais.
-- Incontournables, Nature & randos, Mer & activités nautiques, Excursions,
-- Sensations : non concernés, non touchés.
alter table public.experiences drop constraint experiences_theme_check;

update public.experiences set theme = 'Favelas'
where slug in ('rocinha','ppg','vidigal','santa-marta','cidade-de-deus','tavares-bastos');

update public.experiences set theme = 'Cours'
where slug in ('cours-samba','cours-funk','cours-capoeira','cours-cuisine-bresilienne','cours-portugais');

alter table public.experiences add constraint experiences_theme_check check (theme in (
  'Incontournables','Favelas','Cours','Nature & randos','Mer & activités nautiques','Excursions','Sensations','Fêtes & soirées'
));
