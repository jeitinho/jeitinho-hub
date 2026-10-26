# SPEC — Voyages (planning) & Devis v3

Statut : validée par Rafael le 26/10/2026. À implémenter dans l'ordre des lots.
Références : `ARCHITECTURE.md`, `docs/CRM_TRIPS_FACTORY_V2.md`, `AGENTS.md`.
Modèle métier de référence : le Google Sheets « Anna - Du 15/11 au 28/11 » (onglets Programme + Synthèse)
et le PDF « Ketur_Asim_Jeitinho_Planning ».

## Principes

- Le **voyage est indépendant du devis**. Il peut exister sans devis (brouillon), et le devis est généré depuis lui.
- **Aucune donnée dupliquée** : une activité du planning référence le catalogue (`experiences` / `services` / `ticket_offers`).
  Le prix vendu négocié reste sur `trip_activities` (jamais réécrit dans le catalogue).
- Un devis **envoyé est figé** : modifier le planning ne change jamais un devis envoyé tout seul.
- Un seul utilisateur remplit le planning pour l'instant : Rafael (rôle admin). Pas de collaboration temps réel.
- Mobile-first : Rafael travaille surtout depuis son téléphone.

---

## Lot 0 — Catalogue (fait le 26/10 en base, reste du code)

Fait directement en base :
- `inclusions` / `exclusions` / `conditions` remplis pour : Tour d'Hélicoptère, City Tour, Christ Rédempteur, Rocinha,
  Cidade de Deus, Ilha da Gigoia, Dois Irmãos, Ilha Grande (+ privée), Arraial do Cabo (+ privée).
- `price_model` corrigé en `per_person` pour ces expériences (était `fixed` par défaut).

À coder :
1. **Bug prix** : `catalog-line-picker.tsx` pose toujours `unit: "Forfait"` et quantité 1. Une activité à 50 €/pers
   pour 4 pax sort donc à 50 € au lieu de 200 €. Lire `price_model` :
   - `per_person` → unité « Pers. », quantité = nombre de pax du devis/voyage.
   - `fixed` → unité « Forfait », quantité 1.
2. `experience-form.tsx` / `catalog-form.tsx` : remplacer l'input texte `price_model` par un Select
   (`per_person` = « Par personne », `fixed` = « Forfait groupe »).
3. Variantes publique / privée : garder deux expériences distinctes (déjà le cas : « Ilha Grande » / « Ilha Grande privée »),
   ajouter `experiences.variant_of uuid null references experiences(id)` pour les relier et proposer la bascule
   « Public ↔ Privé » dans le planning et le devis.
4. Audit : lister les 51 expériences encore en `fixed` avec `inclusions = []` sur une page « Catalogue à compléter ».

## Lot 1 — Voyage : création + logistique

1. **Création depuis une demande** (`/demandes`) : deux modes, au choix dans un réglage (`app_settings` ou équivalent) :
   - manuel : bouton « Créer le voyage » sur la carte/fiche demande ;
   - automatique : création d'un voyage `draft` à l'arrivée du formulaire.
   Idempotent : une demande (prospect) → au plus un voyage `draft` lié (`trips.source_prospect_id`, existe déjà).
   Préremplir : titre « {Prénom} - Du {jj/mm} au {jj/mm} », dates, pax, client/prospect, activités demandées (matchées catalogue,
   réutiliser `matchCatalogActivities`) posées en « à placer » (sans créneau).
2. **Fiche voyage — onglet Infos** : n° client (afficher le n° séquentiel du client), pax, dates, accompagnateur (`guide_id`),
   voyageurs (`trip_travelers`, existe).
3. **Onglet Logistique** (nouveau, colonnes ou table `trip_logistics`) :
   - Arrivée : date, heure, n° de vol, aéroport (GIG / SDU / autre).
   - Départ : idem.
   - Transferts : liste (date, trajet « Aéroport → Airbnb », inclus oui/non, prestataire).
   - Logement : nom/adresse, quartier, dates (plusieurs logements possibles : Rio + Ilha Grande).
   - Carte SIM : opérateur/forfait (ex. « TIM 16G »), remise oui/non.

## Lot 2 — Planning (cœur)

Grille **jour × créneau**, identique au Sheets :

| Créneau | Plage |
|---|---|
| `matin` | < 11h00 |
| `midi` | 11h / 14h |
| `apres_midi` | 14h / 19h |
| `soir` | 19h / 23h |
| `nuit` | > 23h |

Modèle (migration) :
- `trip_activities` ajoute : `day date`, `slot text check in (matin, midi, apres_midi, soir, nuit)`,
  `slot_span int default 1` (fusion de créneaux consécutifs, ex. Circuit Forêt matin+midi = 2),
  `display_time text null` (« 10H », affichage seulement), `category text` (`activite`, `visite`, `deplacement`, `soiree`),
  `is_offered boolean default false`, `kind text default 'activity'` (`activity` | `free` | `note`).
  `scheduled_start` reste la source pour l'heure réelle quand elle est connue.
- « Libre » = ligne `kind = 'free'` (pas de prix, n'entre ni dans la synthèse ni dans le devis).
- Case vide = aucune ligne.
- `category` : déduite du catalogue par défaut (champ `category` de l'expérience), modifiable.

UI (`voyages.$id.tsx`, nouvel onglet « Planning ») :
- Mobile : un jour = une carte (comme le PDF) ; desktop : tableau jours en lignes, créneaux en colonnes.
- Tap sur une case → sheet : chercher dans le catalogue / texte libre / « Libre » / vider ; heure optionnelle ;
  « Offert » ; étendre au créneau suivant.
- Colonne/zone « À placer » : activités demandées pas encore positionnées.
- **Échanger deux jours** (météo) : action « Échanger avec… » sur l'en-tête d'un jour → swap des `day` de toutes les lignes.
- Couleurs = code couleur du Sheets / DA Ketur : activité & visite `#efc99c`, déplacement `#d9b892`, soirée `#a8603e` (texte blanc),
  libre `#dcd6cc`, vide blanc.

## Lot 3 — Synthèse + PDF planning

1. **Onglet Synthèse** (= onglet Synthèse du Sheets), calculé depuis le planning :
   activité, date, accompagnateur, statut, prix/pers, prix total, acompte. Totaux : total, total par personne, acompte (50 %), reçu.
   Moyens de paiement depuis le bloc paiements existant.
2. **Bouton « PDF planning »** : rendu `@react-pdf/renderer` (même stack que `quote-pdf.tsx`, polices Fraunces + Inter).
   Référence visuelle : `Ketur_Asim_Jeitinho_Planning.pdf` / `Anna_Jeitinho_Planning.pdf`.
   - En-tête : JEITINHO, « PROGRAMME PRIVÉ · RIO DE JANEIRO », nom client à droite, période.
   - Titre « Une semaine à Rio » / « Votre séjour à Rio » (selon durée, modifiable).
   - Encadré obligatoire : « **Pré-planning adaptable à tout moment.** Les activités peuvent être modifiées ou inversées
     selon la météo. »
   - Légende couleurs, grille 2 colonnes de cartes jour, bandeau « Nuit · Sorties » en bas (lignes `category = soiree`).
   - Option : plage de dates à imprimer (ex. 17→27 alors que le séjour est 15→28).
   - Aucun prix sur le PDF planning.
   - Attention glyphe « → » absent du subset Inter : utiliser une police qui l'a ou écrire « au ».

## Lot 4 — Devis généré depuis le voyage

1. Bouton **« Générer le devis »** sur le voyage :
   - crée un devis `draft` lié (`quotes.trip_id` à ajouter, ou réutiliser `trips.quote_id`),
   - une ligne par activité facturable du planning (`kind = 'activity'`), `quote_lines.trip_activity_id` à ajouter,
   - quantité/unité selon `price_model` (cf. Lot 0), prix = prix vendu de l'activité,
   - lignes `is_offered` → affichées « Offert », 0 €,
   - inclus/exclus du PDF = union des `inclusions` / `exclusions` du catalogue des activités (dédoublonnée), éditable.
2. **Figé après envoi** : quand le devis passe `sent`, plus de synchro. Si le planning change ensuite, bandeau
   « Le planning a changé depuis l'envoi » + bouton **« Mettre à jour le devis »** → crée une nouvelle version
   (`2026-012 v2`), l'ancienne reste consultable.
3. **Prix** : le PDF affiche prix/pers **et** total, par ligne et en pied (total, total/pers, acompte).
4. **Acompte par défaut : 50 %** (remplacer le 30 codé en dur dans `quote-form.tsx`, et en base le default de `deposit_pct`).
5. **Packs** : ligne pack (ex. « Le Réveillon avec Jeitinho », 1 500 €/pers) + extras ; les activités incluses dans le pack
   apparaissent dans le planning mais sont marquées « Inclus dans le pack » (pas de prix ligne).
6. **Lignes optionnelles** (à la place de devis A/B) : une ligne peut être `is_optional` → affichée « En option »,
   hors total, avec total « avec options » en dessous. Cas d'usage : version privée vs publique, hélico, vidéo drone.
7. Remplacer les trois textareas JSON (« Matériel », « Inclus / exclus », « Itinéraire ») par des listes éditables.
   L'itinéraire du devis n'est plus saisi : le planning est un document séparé (le PDF planning).

## Hors périmètre (plus tard)

- Accès client / Travel OS, partage du planning par lien.
- Rôles Perrine / guides sur le planning.
- Notifications prestataires.

## Critères d'acceptation

- Créer un voyage depuis une demande, remplir le planning d'Anna (17→27/11) sur téléphone en < 10 min.
- PDF planning visuellement équivalent à `Anna_Jeitinho_Planning.pdf`.
- « Générer le devis » sur ce voyage : 4 pax, City Tour 80 €/pers → ligne 4 × 80 = 320 €, acompte 50 %.
- Modifier le planning après envoi ne modifie pas le devis envoyé ; « Mettre à jour » crée une v2.
- `typecheck` + `build` verts ; migrations via Supabase, `types.ts` régénéré (jamais édité à la main).
