# ARCHITECTURE — JEITINHO Platform

> Système d'exploitation interne JEITINHO. Ce document est le point d'entrée pour toute personne (ou IA) reprenant le projet.

## 1. Stack

- **Framework** : TanStack Start v1 (SSR + server functions) sur Cloudflare Workers via Vite 7
- **UI** : React 19, Tailwind CSS v4 (tokens dans `src/styles.css`), shadcn/ui
- **Backend** : Lovable Cloud = Supabase managé (Postgres + Auth + Storage + RLS)
- **Éditeur** : Tiptap avec extensions custom (`src/components/editor/`)
- **Package manager** : Bun
- **Déploiement** : Cloudflare Workers (app) + Cloudflare Pages (blog `rio-uncovered`)

## 2. Structure des dossiers

```text
src/
  routes/                      routing fichiers TanStack (ne PAS créer src/pages/)
    __root.tsx                 shell HTML + providers
    auth.tsx                   connexion / création de compte
    reset-password.tsx         reset mot de passe (Supabase)
    setup.tsx                   bootstrap premier admin (SETUP_KEY)
    _authenticated/             layout protégé
      route.tsx
      dashboard.tsx
      agents.tsx                centre de contrôle des agents
      crm.tsx, clients.tsx, devis.tsx, contenus.tsx, mediatheque.tsx,
      partenaires.tsx, calendrier.tsx, analytics.tsx, voyages.tsx,
      services.tsx, billetterie.tsx,
      experiences.tsx / experiences.$id.tsx / experiences.new.tsx,
      parametres.tsx / parametres.utilisateurs.tsx
    api/
      public/
      internal/
  components/
    app-sidebar.tsx
    ...
  lib/
    agents/
      registry.ts              registre typé des agents et capacités
      types.ts                 contrats d'exécution, permissions et risques
    publishers/
    ...
  integrations/supabase/
    ...
  styles.css
  router.tsx
  server.ts

supabase/
  migrations/
    ...
  config.toml
```

## 3. Agent Operating System

Le Hub est la source de vérité métier. Les agents n'ont pas de base parallèle.

### Agents

- **Revenue Agent** : revenus, marges, ROI et monétisation.
- **Sales Agent** : leads, devis, relances et conversion.
- **Concierge Agent** : propositions combinant expériences, services et voyages.
- **Content Research Agent** : veille, événements, SEO, concurrents et opportunités éditoriales.
- **Content Agent** : création et recyclage multi-canaux.
- **Partner Agent** : performance et risque fournisseurs.
- **Acquisition Agent** : attribution, sources et conversion.
- **Retention Agent** : réachat, referrals et suivi post-trip.
- **Operations Agent** : voyages, services assignés, contrôles et exceptions.
- **Finance Agent** : encaissements, coûts, commissions et soldes.
- **Product & Offer Agent** : packs, upsells, prix et catalogue.
- **CEO Agent** : synthèse et priorités de direction.

### Autonomie

- **N0** : observer.
- **N1** : recommander.
- **N2** : préparer pour validation.
- **N3** : exécuter les actions autorisées.

La valeur par défaut est N1/N2. Les actions N3 sont explicitement autorisées outil par outil.

### Audit

Les exécutions sont enregistrées dans `agent_runs` et les actions dans `agent_actions`. Ces journaux permettent de savoir ce que l'agent a proposé, ce qu'il a modifié, son niveau de confiance et quelle personne a validé l'action.

## 4. Schéma de base de données

Toutes les tables sont en schéma `public`, RLS activé.

### Auth & rôles

- `profiles`
- `roles`
- `user_roles`

### Content OS

- `contents`
- `content_categories`
- `content_media`
- `content_comments`
- `content_revisions`
- `authors`
- `tags`
- `media`
- `channels`
- `publications`

### CRM & Conciergerie

- `prospects`
- `leads`
- `clients`
- `partners`
- `experiences`
- `services`
- `trips`
- `quotes`
- `quote_lines`
- `quote_number_sequences`
- `calendar_events`

### Agent OS

- `agent_runs`
- `agent_actions`

## 5. Rôles & RLS

Règle générale : aucune autorisation métier critique ne repose uniquement sur le front. Les appels d'exécution agents et les écritures restent protégés côté serveur et par RLS.

## 6. Routes / Pages

### Publiques
- `/`
- `/auth`
- `/reset-password`
- `/setup`

### Protégées
- `/dashboard`
- `/agents`
- `/crm`
- `/clients`
- `/devis`
- `/voyages`
- `/experiences`
- `/services`
- `/billetterie`
- `/contenus`
- `/blog`
- `/mediatheque`
- `/partenaires`
- `/calendrier`
- `/analytics`
- `/parametres`

## 7. Workflow contenu

Le workflow contenu existant reste inchangé. Le Content Agent prépare les contenus et respecte le workflow humain existant avant publication.

## 8. Conventions de code

- Routing : fichiers plats dans `src/routes/`.
- Ne jamais éditer `routeTree.gen.ts`.
- Server functions avec `createServerFn` et `requireSupabaseAuth`.
- Client Supabase navigateur via `@/integrations/supabase/client`.
- Admin server via `@/integrations/supabase/client.server`.
- Types DB générés automatiquement.
- Nouvelles migrations uniquement, jamais modifier une migration déjà appliquée.
