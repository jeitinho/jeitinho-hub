# ARCHITECTURE — JEITINHO Platform

> Source of truth for the JEITINHO Hub. The runtime is Cloudflare-native: Workers + D1 + R2. Supabase and Lovable are not part of the architecture.

## 1. Stack

- Framework: TanStack Start v1 + React 19
- UI: Tailwind CSS v4 + shadcn/ui
- Runtime: Cloudflare Workers
- Database: Cloudflare D1
- Media: Cloudflare R2
- Auth: application-owned sessions stored in D1, delivered with HttpOnly cookies
- Editor: Tiptap
- Package manager: Bun
- Deployment: Wrangler

## 2. Structure

```text
src/
  routes/                    TanStack file routes
    auth.tsx                 login / signup
    reset-password.tsx       password reset UI
    api/auth/*               session endpoints
    api/db/*                 authenticated D1 query/RPC endpoints
    api/storage/*            private R2 media endpoints
    api/content/*            content workflow APIs
    _authenticated/          authenticated application modules
  components/                UI and domain components
  hooks/                     React hooks
  lib/
    auth/                    Cloudflare-native authentication
    db-client.ts             browser-safe D1 API client
    cloudflare-db.ts         Worker bindings
    publishers/              external publication adapters
    setup/                   one-shot admin bootstrap
    avatars.ts               R2 avatar helpers
migrations/                  D1 SQLite migrations
wrangler.jsonc               Workers + D1 + R2 configuration
```

## 3. Data model

The D1 schema mirrors the Hub business model: CRM, prospects and leads, clients, quotes, travel, experiences/services/tickets, content OS, media, publications, agents, manual content, and analytics.

Authentication is separate from business profiles:

- `users`: email, password hash, account status
- `user_roles`: application roles
- `auth_sessions`: hashed random session tokens with expiry/revocation
- `profiles`: user-facing profile data

Business tables are in `migrations/0002_core.sql`.

## 4. Roles and authorization

Roles:

- `admin`
- `manager`
- `redacteur_chef`
- `redacteur`
- `auteur`
- `guide`
- `prestataire`

The frontend can hide modules, but server routes remain authoritative. Every write API checks the authenticated session and role before touching D1.

## 5. Authentication flow

1. User signs up through `/api/auth/signup`.
2. The first account is bootstrapped as `admin`; subsequent accounts enter `pending_validation`.
3. Login is handled by `/api/auth/login`.
4. The Worker stores a one-way hash of the random session token in D1.
5. The raw token is sent only through an HttpOnly, SameSite cookie.
6. `/api/auth/me` resolves the current account and roles.
7. `/api/auth/logout` revokes the session server-side.

The dedicated setup function can create the initial administrator once using the Cloudflare `SETUP_KEY` secret.

## 6. Data access

Browser code uses `src/lib/db-client.ts`, which talks to authenticated Worker endpoints. It does not contain database credentials.

The Worker validates table names, columns, filters and sort keys against D1 schema metadata before executing SQL. RPC-style business operations live in `src/routes/api/db/rpc.ts`.

## 7. Media

Private media is stored in the Cloudflare R2 bucket `jeitinho-hub-media`.

- Upload: `/api/storage/upload`
- Authenticated object URL: `/api/storage/signed-url`
- Stream object: `/api/storage/file`

The bucket is private; application session authentication is required for access.

## 8. Content workflow

`draft → writing → to_review → changes_requested/approved → ready_to_publish/scheduled → published → archived`

Every transition writes a row in `content_revisions`. Publication adapters use server-side GitHub credentials only when configured.

## 9. External integrations

GitHub and Resend are optional external APIs called from the Worker. Credentials are Cloudflare secrets.

No provider-specific database or auth SDK is required at runtime.

## 10. Deployment

Required resources:

- D1: `jeitinho-hub`
- R2: `jeitinho-hub-media`

Required secret for initial bootstrap:

- `SETUP_KEY`

Optional secrets:

- `GITHUB_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM`

Commands:

```bash
bun install
bun run build
npx wrangler d1 migrations apply jeitinho-hub --remote
npx wrangler deploy
```

Do not add Supabase, Lovable, or provider-managed database/auth configuration back into the repository.
