# ARCHITECTURE — JEITINHO Platform

> Système d'exploitation interne JEITINHO. Ce document est le point d'entrée pour toute personne (ou IA) reprenant le projet. Il reflète l'état à la date de mise en pause (juillet 2026).

## 1. Stack

- **Framework** : TanStack Start v1 (SSR + server functions) sur Cloudflare Workers via Vite 7
- **UI** : React 19, Tailwind CSS v4 (tokens dans `src/styles.css`), shadcn/ui
- **Backend** : Lovable Cloud = Supabase managé (Postgres + Auth + Storage + RLS)
- **Éditeur** : Tiptap avec extensions custom (`src/components/editor/`)
- **Package manager** : Bun
- **Déploiement** : Cloudflare Workers (app) + Cloudflare Pages (blog `rio-uncovered`)

## 2. Structure des dossiers

```
src/
  routes/                      routing fichiers TanStack (ne PAS créer src/pages/)
    __root.tsx                 shell HTML + providers
    index.tsx                  landing
    auth.tsx                   connexion / création de compte
    reset-password.tsx         reset mot de passe (Supabase)
    setup.tsx                  bootstrap premier admin (SETUP_KEY)
    _authenticated/            layout protégé (ssr:false, géré par intégration)
      route.tsx                gate auth + pending validation
      dashboard.tsx
      blog.tsx / blog.$id.tsx / blog.new.tsx
      crm.tsx, clients.tsx, devis.tsx, contenus.tsx, mediatheque.tsx,
      partenaires.tsx, calendrier.tsx, analytics.tsx, voyages.tsx,
      experiences.tsx / experiences.$id.tsx / experiences.new.tsx,
      parametres.tsx / parametres.utilisateurs.tsx
  components/
    app-sidebar.tsx            navigation principale
    page-shell.tsx             layout de page standard
    article-form.tsx           formulaire article (méta + éditeur)
    pending-validation-screen.tsx
    editor/                    Tiptap + extensions custom (callout, faq, gallery,
                               video-embed, button-block)
    workflow/                  publish, republish, revisions, comments, delete
  lib/
    publishers/                architecture de diffusion multi-canal (voir §7)
    setup/                     server fn bootstrap admin
    avatars.ts, utils.ts, error-*.ts
  hooks/                       use-auth, use-avatar-url, use-mobile
  integrations/supabase/       AUTO-GÉNÉRÉ — ne pas éditer
    client.ts                  client navigateur
    client.server.ts           client admin (server only)
    auth-middleware.ts         requireSupabaseAuth pour server fn
    auth-attacher.ts           bearer token middleware côté client
    types.ts                   types DB générés
  styles.css                   tokens design system Tailwind v4
  router.tsx, start.ts, server.ts
supabase/
  migrations/                  SQL versionné (voir §8)
  config.toml                  AUTO-GÉNÉRÉ
```

## 3. Schéma de base de données

Toutes les tables sont en schéma `public`, RLS activé, avec `GRANT` explicites vers `authenticated` / `service_role`.

### Auth & rôles

- **`profiles`** — miroir de `auth.users` (id, email, full_name, avatar_url, status `active|pending_validation|suspended`, timestamps). Créé par trigger `handle_new_user`.
- **`roles`** — catalogue de rôles (id, code, libellé, is_active). Codes : `admin`, `manager`, `redacteur_chef`, `redacteur`, `auteur`, `guide`, `prestataire`.
- **`user_roles`** — jonction (user_id → auth.users, role app_role enum). Un user peut avoir 1..N rôles. Le premier user créé devient automatiquement `admin`.

### Content OS (Blog / Instagram / Newsletter / Guides / SEO)

- **`contents`** — table centrale (31 colonnes) : id, type (`blog|instagram|newsletter|guide|seo`), slug, title, excerpt, body_json (Tiptap), body_markdown, hero_image_id, category_id, author_id, reading_time, status (9 statuts : `draft|in_review|changes_requested|approved|ready_to_publish|scheduled|published|archived|deleted`), scheduled_for, published_at, seo (jsonb), tags[], meta, timestamps.
- **`content_categories`** — arbre (parent_id, scope[] = types applicables, name, slug, title, intro, faq jsonb).
- **`content_media`** — jonction contents ↔ media (ordre, rôle).
- **`content_comments`** — commentaires inline sur un content, avec mentions `@user`.
- **`content_revisions`** — snapshot body_json à chaque transition workflow.
- **`authors`** — fiche auteur (slug, name, role, bio, long_bio, photo_url, social jsonb, lié à un user_id optionnel).
- **`tags`** — étiquettes libres partagées.
- **`media`** — bibliothèque médiathèque (url, mime, dimensions, alt, credits, tags[], uploader).
- **`channels`** — canaux de diffusion (kind, slug, name, config jsonb). Utilisé par `publications`.
- **`publications`** — log de publications (content_id, channel_id, url, commit_sha, commit_url, status, published_at, payload jsonb).

### CRM & Conciergerie

- **`prospects`** — leads bruts entrants (formulaire jeitinho.fr, source, raw jsonb, statut de traitement).
- **`leads`** — leads qualifiés issus de prospects.
- **`clients`** — clients confirmés (stage pipeline, tags[], assigned_to, last_contact_at).
- **`partners`** — prestataires / partenaires locaux.
- **`experiences`** — catalogue d'expériences (24 colonnes : titre, description, tarifs, durée, lieu, photos, actif).
- **`trips`** — voyages / séjours clients (futur module Travel OS).
- **`quotes`** — devis (numéro, client, statut, totaux HT/TTC, TVA, échéance, notes).
- **`quote_lines`** — lignes de devis (label, qty, prix, remise, ordre).
- **`quote_number_sequences`** — séquence annuelle (fonction `next_quote_number`).
- **`calendar_events`** — événements liés à un trip ou content.

### Fonctions SQL clés

- `has_role(user_id, role)` SECURITY DEFINER — utilisée dans toutes les policies RLS
- `is_admin`, `can_manage`, `can_edit_content`, `can_review_content` — helpers de rôle
- `is_account_active(user_id)` — statut profils
- `handle_new_user()` — trigger auth : crée profile + role admin si premier user
- `next_quote_number()` — génère un numéro annuel `YYYY-NNN`
- `update_updated_at_column()` — trigger générique

## 4. Rôles & RLS

| Rôle | Description | Permissions clés |
|---|---|---|
| `admin` | Administrateur | Tout accès, validation comptes, gestion rôles |
| `manager` | Direction opérationnelle | CRM, devis, validation contenus, utilisateurs |
| `redacteur_chef` | Rédacteur en chef | Review + publication contenus |
| `redacteur` | Rédacteur | Édition contenus, propose à review |
| `auteur` | Auteur externe | Rédige ses propres articles |
| `guide` | Guide sur place | Accès expériences / voyages assignés |
| `prestataire` | Partenaire externe | Accès limité à ses missions (à construire) |

**Règle générale** : chaque table publique a au moins 2 policies (lecture + écriture) qui s'appuient sur `has_role` / `can_*`. Aucune vérif de rôle uniquement côté front — toujours en RLS.

## 5. Routes / Pages

### Publiques
- `/` — landing
- `/auth` — email/password + mot de passe oublié
- `/reset-password` — flow Supabase `resetPasswordForEmail`
- `/setup` — bootstrap premier admin (protégé par `SETUP_KEY`)

### Protégées (`_authenticated/`)
- `/dashboard` — vue d'ensemble (KPIs, activité récente)
- `/blog` `/blog/new` `/blog/$id` — module Articles (rédaction → publication GitHub)
- `/contenus` — hub Content OS multi-canal (placeholder)
- `/mediatheque` — bibliothèque médias (placeholder)
- `/crm` — pipeline (placeholder)
- `/clients` — fiche clients (placeholder)
- `/devis` — devis + PDF (placeholder)
- `/experiences` `/experiences/new` `/experiences/$id` — catalogue expériences
- `/voyages` — futur Travel OS (placeholder)
- `/partenaires` — prestataires (placeholder)
- `/calendrier` — planning (placeholder)
- `/analytics` — analytics (placeholder)
- `/parametres` `/parametres/utilisateurs` — comptes, rôles, avatars

## 6. Conventions de code

- **Routing** : fichiers plats dot-separated dans `src/routes/`. Ne jamais éditer `routeTree.gen.ts`.
- **Server functions** : `createServerFn` depuis `@tanstack/react-start`, fichiers `*.functions.ts` importables côté client. Auth via `.middleware([requireSupabaseAuth])`. Jamais d'edge function Supabase.
- **Client Supabase** :
  - Navigateur : `@/integrations/supabase/client`
  - Server fn user-scoped : `context.supabase` (via `requireSupabaseAuth`)
  - Admin (bypass RLS, webhooks) : `@/integrations/supabase/client.server` importé **dynamiquement** dans le handler
- **Composants** : PascalCase, un composant / fichier, `src/components/<domain>/`
- **Hooks** : `use-*.ts(x)` dans `src/hooks/`
- **Styles** : tokens design system dans `src/styles.css`, jamais de couleurs hardcodées (`text-white`, `bg-[#...]`) dans les composants
- **Types DB** : générés automatiquement dans `src/integrations/supabase/types.ts`
- **Migrations** : jamais éditer un fichier existant, toujours créer une nouvelle migration via l'outil

### Convention `publishers/`

Architecture pluggable pour diffuser un contenu vers plusieurs canaux :

```
src/lib/publishers/
  types.ts                  interfaces Publisher, PublishResult, PublishContext
  registry.ts               map { channel: Publisher }
  ts-generator.ts           sérialise un `contents` row → fichier .ts au format rio-uncovered
  githubPublisher.ts        preview + validation, appelle github-push
  github-push.functions.ts  server fn : push réel via connecteur GITHUB_API_KEY
  article-lifecycle.functions.ts  archive / delete / republish
  instagramPublisher.ts     stub (à implémenter)
  newsletterPublisher.ts    stub
  websitePublisher.ts       stub
```

Chaque publisher expose `preview(content)` et `publish(content, ctx)` et logge le résultat dans `publications`.

## 7. Workflow contenu (9 statuts)

`draft → in_review → (changes_requested | approved) → ready_to_publish → (scheduled | published) → archived → deleted`

Transitions gérées dans `src/components/workflow/workflow-panel.tsx`. Chaque transition :
1. écrit une révision (`content_revisions`)
2. vérifie le rôle via RLS + helpers `can_review_content` / `can_edit_content`
3. déclenche le publisher approprié quand `ready_to_publish → published`

## 8. Migrations Supabase appliquées

Ordre chronologique — **ne pas recréer** :

| Fichier | Contenu |
|---|---|
| `20260712062002_2e076ebf-3661-4c15-936a-d12bbb6dc4ec.sql` | Base initiale : profiles, user_roles, has_role, handle_new_user, RLS |
| `20260713025934_f048102b-1d0d-4e38-b320-fdc270e96138.sql` | Content OS : enums `content_type`, `content_status`, `app_role` |
| `20260713030057_efdeeda2-de9a-43a4-90c5-9f72bf890e8a.sql` | Tables contents / authors / categories / media / tags / channels / publications + workflow |
| `20260716064933_928219f8-fc7a-4546-9175-a7103e8bde7b.sql` | CRM : prospects, leads, clients, partners, quotes, quote_lines, experiences, trips, calendar_events |
| `20260717015033_dede525e-2660-46dc-93c8-faadd8d1988b.sql` | Multi-rôles : table `roles` catalogue, rôles étendus, account_status enum |
| `20260717015058_c534e39c-bc6a-45f0-9a56-15f1ce4a4502.sql` | Storage bucket `avatars`, policies avatars, helpers `can_*`, `is_account_active` |

Toute nouvelle migration doit être créée via `supabase--migration` (outil Lovable) et suivre le format `YYYYMMDDHHMMSS_<uuid>.sql`.

## 9. État d'avancement des modules

| Module | Statut | Détails |
|---|---|---|
| **Auth & rôles multi-rôles** | ✅ Terminé | Signup, login, reset password, pending validation, avatars, gestion rôles admin |
| **Articles (blog)** | ✅ Terminé | CRUD, Tiptap avec blocs custom, workflow 9 statuts, révisions, commentaires, push GitHub réel, archive/delete/republish |
| **Design system** | 🟡 En cours | Tokens Tailwind v4 en place, shadcn intégré ; composants métier à harmoniser |
| **Dashboard** | 🟡 En cours | Structure et cartes ; branchement données réelles partiel |
| **Content OS multi-canal** | 🟠 Amorcé | Schéma DB prêt, publishers stubs Instagram/Newsletter/Website à implémenter |
| **Médiathèque** | 🟠 Amorcé | Table `media` + bucket `avatars` ; UI upload/browse à faire |
| **Utilisateurs / paramètres** | ✅ Terminé | Validation comptes, assignation rôles, upload photo |
| **Prospects (leads entrants)** | ⛔ Pas commencé | Endpoint public signé `/api/public/leads` + UI à créer |
| **CRM (pipeline clients)** | ⛔ Pas commencé | Schéma prêt, UI kanban à construire |
| **Devis** | ⛔ Pas commencé | Schéma prêt (quotes/quote_lines/séquence), éditeur + PDF Carolina à faire |
| **Expériences** | 🟠 Amorcé | Table + form créés, workflow catalogue à finaliser |
| **Partenaires / Prestataires** | ⛔ Pas commencé | Schéma prêt |
| **Calendrier** | ⛔ Pas commencé | Table `calendar_events` prête |
| **Analytics** | ⛔ Pas commencé | Placeholder |
| **Travel OS (voyages)** | ⛔ Pas commencé | Voir §10 pour la vision |
| **Automatisations (Gmail / n8n)** | ⛔ Pas commencé | |
| **Assistant Concierge IA** | ⛔ Pas commencé | Prévu via Lovable AI Gateway |

## 10. Vision Travel OS (module à venir)

Travel OS transformera un devis accepté en **espace voyage interactif** pour le client. Il devra rester un module natif de JEITINHO Platform, connecté au CRM, aux devis, au calendrier, au Content OS et au Jeitinho Media.

### Parcours cible

`Lead → Devis → Paiement → Travel OS → Suivi séjour → Avis → Fidélisation`

### Fonctionnalités visées

- **Avant** : billets, hébergements, transferts, documents, checklist bagages, météo, countdown
- **Pendant** : itinéraire jour/jour (horaires, activités, transferts, QR/vouchers, adresses Maps, contacts prestataires, WhatsApp Jeitinho), fiches activités détaillées
- **Recommandations géo-contextuelles** : restaurants, bars, plages, rooftops, pharmacies, distributeurs, articles Jeitinho Media
- **Notifications** : web puis push mobile (rappels, chauffeur, météo)
- **Assistant Concierge IA** avec bascule vers concierge humain
- **Back-office** : génération automatique du carnet, drag & drop journées, envoi notifications, suivi temps réel

### Contraintes d'architecture

- **Mobile-first** dès le web (responsive fluide, sensation app)
- URLs client type `client.jeitinho.fr/<slug>` ou `app.jeitinho.fr/voyage/<id>`
- Séparer **logique métier / services** (server fn + Supabase) de la **couche UI** pour permettre plus tard une app iOS/Android réutilisant les mêmes API
- S'appuyer sur les tables existantes (`trips`, `clients`, `quotes`, `experiences`, `calendar_events`, `contents`) — pas de duplication

## 11. Sécurité — checklist

- ✅ RLS activé sur toutes les tables `public`
- ✅ `GRANT` explicites `authenticated` / `service_role`
- ✅ Rôles stockés dans `user_roles` (jamais sur `profiles`)
- ✅ `has_role` en `SECURITY DEFINER` avec `search_path=public`
- ✅ Client admin (`client.server.ts`) importé uniquement dans handlers server-only
- ✅ Google OAuth via broker Lovable (non activé pour l'instant)
- ⚠️ Endpoints `/api/public/*` : à vérifier signature avant tout write (aucun existant pour l'instant)

## 12. Points de reprise après pause

Ordre suggéré à la reprise :
1. Endpoint `/api/public/leads` signé + module **Prospects** UI
2. Module **Devis** (éditeur lignes + PDF via `@react-pdf/renderer`)
3. **CRM** (kanban clients + pipeline)
4. **Médiathèque** (upload storage, tags, cropper)
5. Amorce **Travel OS** : schéma détaillé `trips` + itinéraire jour/jour
6. Automatisations Gmail / n8n
7. Assistant Concierge IA (Lovable AI Gateway)