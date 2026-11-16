-- Classement des 5 fiches laissées à null dans la migration précédente
-- (non nommées dans les 6 listes du plan de refonte). Rafael a confirmé
-- ce classement explicitement.
update public.experiences set theme = 'Nature & randos'
where slug in ('cascades-recreio','piscine-naturelle-secreto','pedra-bonita');

update public.experiences set theme = 'Sensations'
where slug in ('buggy-arraial-buzios','quad-arraial-buzios');
