-- =====================================================================
-- LOT 2 — Catalogue : les 6 catégories du site, formule « En groupe »/
-- « En privé », filtres. Additif uniquement. Aucun contenu inventé : le
-- classement ci-dessous reprend mot pour mot les listes nommées du plan
-- de refonte (validé par Rafael) ; ce qui n'y est pas explicitement cité
-- reste à null pour qu'il le classe lui-même (5 fiches : Buggy, Quad,
-- Cascades du Recreio, Pedra Bonita, Piscine naturelle du Secreto).
-- =====================================================================
alter table public.experiences
  add column if not exists theme text check (theme in (
    'Incontournables','Favelas & culture','Nature & randos','Mer & îles','Sensations','Fêtes & soirées'
  )),
  add column if not exists variant_of uuid references public.experiences(id),
  add column if not exists privatisable boolean not null default false,
  add column if not exists moment text check (moment in ('jour','soir')),
  add column if not exists with_who text[];
comment on column public.experiences.theme is 'Une des 6 catégories du site (plan refonte nov. 2026). Laisser null si non classé explicitement par Rafael — ne jamais déduire.';
comment on column public.experiences.variant_of is 'Relie une fiche « privée » à sa fiche « en groupe » (même destination, formule différente). Permet une seule carte publique avec bascule Groupe/Privé.';
comment on column public.experiences.moment is 'jour / soir — classement manuel, laissé à null si non renseigné.';
comment on column public.experiences.with_who is 'couple / amis / famille / solo — classement manuel, laissé à null si non renseigné.';

-- Lien groupe <-> privé (4 destinations, mécanique par slug, aucun contenu inventé).
update public.experiences AS priv
set variant_of = grp.id
from public.experiences grp
where priv.slug = grp.slug || '-privee';

update public.experiences set privatisable = true
where slug in ('arraial-do-cabo','buzios','ilha-grande','paraty',
               'arraial-do-cabo-privee','buzios-privee','ilha-grande-privee','paraty-privee');

-- Thème : reprise exacte des listes nommées du plan (48 fiches reclassées sur 53 ;
-- les 5 restantes — Buggy, Quad, Cascades du Recreio, Pedra Bonita, Piscine du Secreto —
-- ne sont nommées dans aucune des 6 listes du plan et restent donc à null).
update public.experiences set theme = 'Incontournables'
where slug in ('city-tour','christ-redempteur','pain-de-sucre','centre-historique','maracana','cidade-do-samba');

update public.experiences set theme = 'Favelas & culture'
where slug in ('rocinha','ppg','vidigal','santa-marta','cidade-de-deus','tavares-bastos',
               'cours-samba','cours-funk','cours-capoeira','cours-cuisine-bresilienne','cours-portugais');

update public.experiences set theme = 'Nature & randos'
where slug in ('dois-irmaos','pedra-da-gavea','morro-da-urca','pedra-do-telegrafo','horto',
               'circuit-foret-cascades','parque-lage','ilha-da-gigoia');

update public.experiences set theme = 'Mer & îles'
where slug in ('ilha-grande','arraial-do-cabo','paraty','buzios',
               'ilha-grande-privee','arraial-do-cabo-privee','paraty-privee','buzios-privee',
               'ilhas-cagarras','paddle-aube','parasail','kitesurf','plongee','jet-ski','cours-surf');

update public.experiences set theme = 'Sensations'
where slug in ('tour-helicoptere','parapente','deltaplane','parachute','escalade-rappel','motocross',
               'stand-de-tir','cours-jiu-jitsu-bresilien');

-- =====================================================================
-- LOT 2 — Boîte de réception unique (vue, pas de fusion de tables).
-- security_invoker : respecte le RLS de chacun qui l'interroge, ne
-- contourne rien (évite l'ERREUR « security_definer_view » déjà relevée
-- sur 4 vues existantes du projet). Pas encore d'écran admin dessus —
-- voir le rapport.
-- =====================================================================
create or replace view public.demandes_unifiees
  with (security_invoker = true)
as
  select 'lead'::text as source, id, name as nom, email, phone as telephone,
         received_at, status::text as statut, message, '/crm'::text as lien
    from public.leads
  union all
  select 'trouver_jeitinho', id, prenom, email, telephone,
         created_at, statut, programme_genere, '/trouver-un-jeitinho'
    from public.trouver_jeitinho
  union all
  select 'reservation_site', id, concat_ws(' ', prenom, nom), email, telephone,
         created_at, statut, message, '/crm'
    from public.reservations
  union all
  select 'ota_' || platform, id, lead_name, lead_email, lead_phone,
         created_at, status, activity_title, '/dispatch'
    from public.ota_bookings
  union all
  select 'devis_nordeste', id, concat_ws(' ', prenom, nom), email, telephone,
         created_at, statut, message, '/crm'
    from public.devis_nordeste;
comment on view public.demandes_unifiees is 'Lecture seule, toutes sources confondues (site, Trouver un Jeitinho, réservations, GetYourGuide/OTA, devis Nordeste). Ne remplace aucune table ni n''en fusionne aucune — security_invoker : chacun ne voit que ce que son propre RLS autorise déjà.';

-- =====================================================================
-- LOT 4 — Espace client (lecture), étape 1/2 : la colonne de liaison.
-- L'étape 2 (RPC current_client_id()/link_my_client_account() + policies
-- RLS self-read sur quotes/quote_lines/trips/trip_activities/payments)
-- est rédigée et prête mais pas encore appliquée — voir le rapport
-- (confirmation interactive Supabase non disponible dans cette session).
-- =====================================================================
alter table public.clients
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
comment on column public.clients.auth_user_id is 'Compte Supabase Auth du site (connexion e-mail/Google de l''espace client), relié par e-mail via link_my_client_account(). Jamais rempli à la main.';
