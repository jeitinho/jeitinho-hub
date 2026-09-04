# JEITINHO HUB — Cloudflare + Supabase

## Architecture

JEITINHO Hub runs as a TanStack Start application on Cloudflare Workers, with
Supabase as the system of record for authentication and business data.

- **Cloudflare Workers** — application runtime and SSR/API
- **Supabase (Postgres + RLS + Auth)** — application database and authentication
- **R2** — private media storage, proxied through Worker routes
- **HttpOnly cookie** — carries the Supabase session (access/refresh token)
- **GitHub API** — optional editorial publication integration
- **Resend API** — optional transactional email integration

See `ARCHITECTURE.md` for the full picture, including the legacy Cloudflare D1
code that predates the move to Supabase and is no longer on any live request
path.

## Required Cloudflare resources

- R2 bucket: `jeitinho-hub-media`
- (D1 database binding `jeitinho-hub` is declared in `wrangler.jsonc` for
  legacy code only — see `ARCHITECTURE.md` §9)

## Secrets / environment

Worker secrets (optional integrations only):

- `GITHUB_API_KEY` (only when GitHub publishing is enabled)
- `RESEND_API_KEY` and `RESEND_FROM` (only when password-reset email is enabled)

GitHub Actions repository secrets, required for the `Deploy Cloudflare Worker`
workflow to actually deploy:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Never commit credentials to Git.

## Supabase schema changes

Apply migrations through the Supabase MCP tools or CLI against the `JEITINHO`
project, then regenerate `src/integrations/supabase/types.ts`.

## Local development

```bash
bun install
bun run dev
```

## Authentication

Supabase Auth issues the session; `/api/auth/*` routes bridge it to an
HttpOnly cookie and resolve the caller's Hub profile/roles. New signups enter
`pending_validation` until an administrator activates them from
`/parametres/utilisateurs`.

## Deployment

Build the TanStack Start application and deploy the generated Worker with
Wrangler:

```bash
bun run build
npx wrangler deploy
```

CI (`.github/workflows/ci.yml`) runs `typecheck`, `build` and `wrangler check`
on every push/PR to `main`; keep it green before merging.
