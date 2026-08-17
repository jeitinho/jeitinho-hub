# Saison 1 — Brique 1 : Lead Intelligence + CRM priorisé

Objectif : chaque lead entrant devient une opportunité qualifiée, scorée et priorisée, et chaque devis a une prochaine action avec relances J+1/J+3/J+7/J+14 préparées pour validation humaine. Aucun envoi automatique, aucune donnée existante modifiée sans validation.

## 1. Données (migrations additives uniquement)

Aucune table existante n'est supprimée ni renommée. `leads`, `prospects`, `clients`, `quotes`, `quote_lines` restent en place.

Colonnes ajoutées à `public.leads` (toutes nullables ou avec défaut) :
- `campaign` text, `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` / `utm_term` text
- `request_type` text (enum applicatif : sejour, roadtrip, experience, groupe, autre, inconnu)
- `score` int (0-100, défaut 0), `priority` text (HOT / WARM / COLD, défaut COLD)
- `estimated_value` numeric, `pipeline_stage` text (défaut `nouveau`)
- `next_action` text, `next_action_at` timestamptz, `last_contact_at` timestamptz
- `assigned_to` uuid (FK auth.users)
- `score_breakdown` jsonb (défaut '{}') pour tracer le calcul

Mêmes champs de pilotage ajoutés à `public.prospects` (`score`, `priority`, `estimated_value`, `next_action`, `next_action_at`, `last_contact_at`, `pipeline_stage`) pour ne pas perdre l'intelligence lors de la qualification lead → prospect.

Colonnes ajoutées à `public.quotes` :
- `next_action` text, `next_action_at` timestamptz, `last_contact_at` timestamptz
- `followup_paused` boolean défaut false, `followup_stage` int défaut 0 (0 = aucune relance envoyée, 1..4 = J+1/J+3/J+7/J+14)
- `followup_anchor_at` timestamptz (point de départ des relances = date d'envoi)

Nouvelle table `public.crm_tasks` (relances et actions préparées, jamais envoyées automatiquement) :
- `id`, `kind` (`relance_devis`, `rappel_lead`, `action_manuelle`), `channel` (`whatsapp`, `email`, `appel`)
- `lead_id`, `prospect_id`, `quote_id`, `client_id` (FK nullables)
- `status` (`a_valider`, `valide`, `envoye`, `annule`), `due_at`, `title`, `message_draft` text
- `created_by`, `handled_by`, `handled_at`, `created_at`, `updated_at`
- index sur `(status, due_at)`, trigger `updated_at`
- GRANT SELECT/INSERT/UPDATE/DELETE à `authenticated`, ALL à `service_role`, RLS activée avec policies réservées à `can_manage(auth.uid())` (comme le reste du CRM)

Aucun UPDATE sur les lignes existantes dans cette étape : les leads/devis déjà en base gardent score 0 / priorité COLD. Un bouton « Recalculer les scores » (action explicite, réservée Admin/Manager) permettra de rescorer le backlog après validation.

## 2. Scoring commercial 0-100

Calcul déterministe, pur, côté serveur et réutilisable (`src/lib/crm/scoring.ts`), avec détail stocké dans `score_breakdown` :
- Fraîcheur de la demande (0-20) : < 24h = 20, < 72h = 15, < 7j = 10, sinon 5
- Horizon de voyage (0-20) : départ dans 0-60j = 20, 61-120j = 15, 121-240j = 10, > 240j ou inconnu = 5
- Taille du groupe (0-15) : 1-2 = 5, 3-4 = 10, 5-8 = 13, 9+ = 15
- Qualité du contact (0-15) : téléphone + email = 15, un seul = 8, aucun = 0
- Intention exprimée (0-20) : message détaillé / dates précises / activités listées cumulent des points
- Canal et campagne (0-10) : formulaire de réservation ou campagne payante > formulaire générique > source inconnue

Priorité dérivée : score >= 70 → HOT, 40-69 → WARM, < 40 → COLD.

Valeur potentielle estimée : `party_size × tarif moyen jour × durée estimée`, avec paramètres par défaut centralisés (constantes modifiables dans `src/lib/crm/valuation.ts`), fallback si dates ou groupe manquants. La valeur reste éditable à la main dans la fiche.

## 3. Ingestion des leads

`/api/public/leads` conserve son contrat externe et son secret ; on ajoute seulement l'acceptation optionnelle de `campaign`, `utm_*` et `request_type` dans le schéma Zod (champs facultatifs → aucun appelant existant ne casse). `/api/internal/process-lead` mappe ces champs, calcule score / priorité / valeur estimée à l'insertion, et pose une prochaine action par défaut (« Premier contact WhatsApp » à +2h pour HOT, +24h WARM, +72h COLD). Si les champs UTM ne sont pas fournis, ils sont extraits de `raw_payload` quand ils y figurent.

## 4. Relances devis J+1 / J+3 / J+7 / J+14

- Ancrage : passage du devis au statut `sent` → `followup_anchor_at = now()`, `followup_stage = 0`, `next_action = « Relance J+1 »`.
- Une fonction serveur (`generateDueFollowups`) crée les `crm_tasks` échues manquantes pour les devis non pausés, non acceptés/refusés/payés. Elle est déclenchée à l'ouverture de la vue CRM (idempotente, contrainte d'unicité logique par devis + palier) — pas de cron dans cette étape.
- Chaque tâche contient un brouillon de message WhatsApp/e-mail pré-rempli (client, référence devis, montant, période). Rien n'est envoyé : l'utilisateur valide, copie, puis marque « Envoyé », ce qui avance `followup_stage`, met à jour `last_contact_at` et programme le palier suivant.
- Bouton « Suspendre les relances » sur le devis (`followup_paused`), réversible.

## 5. UI dans le Hub

Nouvelle route `/_authenticated/crm` enrichie (l'onglet Leads et Prospects existants sont conservés) avec un onglet **Priorités** en premier :
- Bandeau de compteurs : HOT / WARM / COLD / devis à relancer aujourd'hui / sans prochaine action
- Colonnes ou sections : « HOT — à traiter maintenant », « WARM », « COLD », « Devis à relancer aujourd'hui », « Sans prochaine action »
- Carte lead : nom, score + badge priorité, valeur estimée, période de voyage, type de demande, source/campagne, prochaine action + échéance (en retard en rouge), boutons : Contacté (met à jour `last_contact_at`), Définir prochaine action, Qualifier en prospect, Créer un devis
- Onglet **Relances** : liste des `crm_tasks` échues, message pré-rempli avec bouton copier, actions Valider / Marquer envoyé / Reporter / Annuler
- Le formulaire de devis reçoit un petit bloc « Suivi commercial » : prochaine action, date, dernier contact, palier de relance, interrupteur de suspension

Le design réutilise les composants et tokens existants (Card, pill, btn-primary, Fraunces) — aucune nouvelle direction visuelle.

## 6. Ordre d'implémentation

1. Migration additive (colonnes leads/prospects/quotes + table `crm_tasks` avec GRANT/RLS)
2. `src/lib/crm/scoring.ts`, `valuation.ts`, `priority.ts`, libellés pipeline
3. Server functions `src/lib/crm/crm.functions.ts` : rescore backlog, set next action, marquer contacté, générer/gérer les relances
4. Ingestion : Zod optionnel + enrichissement dans `process-lead`
5. UI : onglet Priorités + onglet Relances dans `/crm`
6. Bloc suivi commercial dans `quote-form.tsx` + ancrage des relances au passage en `sent`
7. Vérification : build, typecheck, parcours navigateur sur la vue CRM

## Fichiers touchés

- Migration Supabase (nouvelle)
- `src/routes/api/public/leads.ts`, `src/routes/api/internal/process-lead.ts` (ajouts rétro-compatibles)
- `src/routes/_authenticated/crm.tsx` (onglets ajoutés)
- `src/components/quote-form.tsx` (bloc suivi)
- Nouveaux : `src/lib/crm/*`, composants de la vue priorisée
- `src/integrations/supabase/types.ts` régénéré par la migration

## Risques et garde-fous

- **Données de prod** : la migration n'écrit aucune donnée ; le rescoring du backlog est une action manuelle explicite.
- **Contrat d'ingestion** : tous les nouveaux champs entrants sont optionnels, jeitinho.fr continue de fonctionner inchangé.
- **Doublons de relance** : génération idempotente par devis + palier, vérifiée avant insertion.
- **WhatsApp** : aucun envoi automatique, aucun connecteur ajouté — uniquement des brouillons à copier.
- **RLS** : `crm_tasks` réservée aux rôles Admin/Manager via `can_manage`, cohérent avec `leads`/`quotes`.

## Hypothèses

- Les tarifs de valorisation par défaut peuvent être posés par mes soins puis ajustés (fourchette Nordeste : jour/personne autour de 150 €).
- Les paliers de relance ne concernent que les devis au statut `sent`.
- Génération des relances déclenchée à l'ouverture de la vue CRM, pas par cron (à ajouter plus tard si souhaité).
