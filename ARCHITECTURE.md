# ARCHITECTURE — JEITINHO Platform

> Source of truth for the JEITINHO Hub.

## 1. Stack

- Framework: TanStack Start v1 + React 19
- UI: Tailwind CSS v4 + shadcn/ui
- Runtime: Cloudflare Workers (SSR + API routes)
- Database & Auth: **Supabase** (Postgres with Row Level Security, Supabase Auth)
- Media storage: Cloudflare R2, served through authenticated Worker routes
- Editor: Tiptap
- Package manager: Bun
- Deployment: Wrangler

The application data model, business logic and auth live in Supabase. Cloudflare
Workers host the app and proxy private R2 media. Cloudflare D1 is provisioned in
`wrangler.jsonc` but is **not** the system of record — see §9.

## 2. Structure

```text
src/
  routes/                    TanStack file routes
    auth.tsx                 login / signup
    reset-password.tsx       password reset UI
    api/auth/*               Supabase-backed session endpoints
    api/storage/*             private R2 media endpoints (avatars, media library)
    api/content/*             content workflow API (writes to Supabase)
    _authenticated/           authenticated application modules
  components/                UI and domain components
  hooks/                     React hooks
  integrations/supabase/     Supabase client, generated types
  lib/
    auth/supabase-auth.ts    Supabase-backed authentication (source of truth)
    publishers/               external publication adapters
    setup/                    one-shot admin bootstrap (D1, currently unused — see §9)
    avatars.ts                R2 avatar helpers
migrations/                   legacy D1 SQLite migrations (see §9)
supabase/                     Supabase migrations applied via MCP/Supabase CLI
wrangler.jsonc                Workers + D1 + R2 configuration
```

## 3. Data model

Business data lives in Supabase Postgres: CRM (clients, prospects, leads), quotes,
trips (`trips`, `trip_travelers`, `trip_activities`), experiences/services/ticket
offers, partners, the blog/content workflow (`contents`, `content_categories`,
`content_revisions`, `content_comments`, `authors`, `channels`, `publications`),
media, and staff/roles.

Authentication:

- `auth.users` / `auth.identities`: Supabase Auth, email + password
- `public.profiles`: application-facing profile (status, is_active, full_name)
- `public.user_roles`: application roles, keyed to `auth.users.id`
- `public.roles`: role catalog shown when validating a pending account

Every table with sensitive data has Row Level Security enabled; policies are
enforced by `can_manage(uid)` (admin/manager) and `can_edit_content(uid)`
(admin/manager/redacteur) helper functions defined in Supabase.

## 4. Roles and authorization

Roles:

- `admin`
- `manager`
- `redacteur_chef`
- `redacteur`
- `auteur`
- `guide`
- `prestataire`

The frontend hides modules by role, and Supabase RLS is the authoritative
enforcement layer for every table read/write. Cross-table business operations
(e.g. converting an accepted quote into a trip) are implemented as
`SECURITY DEFINER` Postgres functions called via `supabase.rpc(...)`.

## 5. Authentication flow

1. `/api/auth/signup` calls Supabase Auth `signUp`, then creates a
   `pending_validation` row in `public.profiles`.
2. The first account created in Supabase (by email) is treated as the admin
   once a manager/admin activates it through `/parametres/utilisateurs`.
3. `/api/auth/login` authenticates against Supabase, then resolves the caller's
   Hub profile + roles via the `get_hub_user_by_auth_uid` RPC.
4. The Supabase access/refresh token pair is stored in a single HttpOnly,
   SameSite cookie (`jeitinho_supabase_session`) — never exposed to client JS.
5. `/api/auth/me` refreshes the session and re-resolves the profile on every
   authenticated page load.
6. `/api/auth/logout` revokes the Supabase session.

## 6. Data access

Browser code talks to Supabase directly through `src/integrations/supabase/client.ts`
(publishable/anon key only — RLS enforces access control). There is no
custom D1 query proxy in the request path for business data.

## 7. Media

Private media is stored in the Cloudflare R2 bucket `jeitinho-hub-media`, proxied
through Worker routes that authenticate the caller via the Supabase session
cookie:

- Upload: `/api/storage/upload`
- Authenticated object URL: `/api/storage/signed-url`
- Stream object: `/api/storage/file`

## 8. Content workflow

`draft → writing → to_review → changes_requested/approved → ready_to_publish/scheduled → published → archived`

Every transition writes a row in `content_revisions` (`/api/content/$contentId/workflow`,
which authenticates via Supabase and writes to Supabase using the caller's own
access token so RLS applies). Publication adapters use server-side GitHub
credentials only when configured.

## 9. Cloudflare D1 — legacy, not in use

An earlier iteration of this app targeted Cloudflare D1 for both auth and
business data (`migrations/`, `src/lib/auth/cloudflare-auth.ts`,
`src/lib/db-client.ts`, `src/routes/api/db/*`). That migration was reverted:
D1's `users`/`profiles` tables are empty in production, and the app has run on
Supabase auth + data since. This legacy code remains in the tree (D1 binding
still declared in `wrangler.jsonc`) but is no longer on any request path
reachable from the UI. Do not add new features against it; treat it as
scheduled for removal once confirmed fully dead.

## 10. External integrations

GitHub and Resend are optional external APIs called from the Worker. Credentials
are Cloudflare secrets.

## 11. Deployment

Required Cloudflare resources:

- R2: `jeitinho-hub-media`
- (D1 binding `jeitinho-hub` remains declared for the legacy code in §9)

Required Supabase project: `JEITINHO` (`sxzdabtarlgozixcbzus`).

Commands:

```bash
bun install
bun run build
npx wrangler deploy
```

Deploys happen via the `Deploy Cloudflare Worker` GitHub Actions workflow,
which requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets. Until those are configured, deploys must be run manually with
`npx wrangler deploy` from a machine with Cloudflare credentials.
