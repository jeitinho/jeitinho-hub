-- Rafael (retour sur le site en direct) : les 4 destinations d'excursion
-- ne doivent pas être mélangées aux activités nautiques dans une même
-- catégorie. Le site sépare les deux ; même correction ici pour que le
-- catalogue interne (devis/voyages) garde le même langage de catégories
-- que le site public.
--  - Excursions (nouvelle) : Ilha Grande, Arraial do Cabo, Paraty, Búzios,
--    formules groupe ET privée (8 lignes, liées par variant_of).
--  - Mer & activités nautiques (remplace « Mer & îles ») : Ilhas Cagarras,
--    paddle, parasail, kitesurf, plongée, jet ski, surf (7 lignes).
-- Favelas & culture, Nature & randos, Incontournables, Sensations : non
-- concernés, non touchés.
alter table public.experiences drop constraint experiences_theme_check;

update public.experiences set theme = 'Excursions'
where slug in ('ilha-grande','arraial-do-cabo','paraty','buzios',
               'ilha-grande-privee','arraial-do-cabo-privee','paraty-privee','buzios-privee');

update public.experiences set theme = 'Mer & activités nautiques'
where slug in ('ilhas-cagarras','paddle-aube','parasail','kitesurf','plongee','jet-ski','cours-surf');

alter table public.experiences add constraint experiences_theme_check check (theme in (
  'Incontournables','Favelas & culture','Nature & randos','Mer & activités nautiques','Excursions','Sensations','Fêtes & soirées'
));
