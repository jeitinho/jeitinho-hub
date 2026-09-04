# JEITINHO HUB — Engineering Rules

This repository runs on Cloudflare Workers (hosting/SSR + private R2 media) with
**Supabase** as the system of record for authentication and business data. See
`ARCHITECTURE.md` for the full picture, including the legacy Cloudflare D1 code
(§9) that is no longer on any live request path — don't build new features
against it.

## Runtime

- TanStack Start on Cloudflare Workers
- Supabase (Postgres + Row Level Security) for auth and application data
- R2 for private media, proxied through Worker routes
- Supabase session (access/refresh token) in an HttpOnly cookie for authentication

## Data access

UI code uses `src/integrations/supabase/client.ts` directly. RLS policies are
the authorization boundary — never bypass them by adding a service-role key to
client-reachable code. Cross-table writes that need elevated privilege are
Postgres `SECURITY DEFINER` functions, called via `supabase.rpc(...)`, that
re-check the caller's role internally (mirror the existing `can_manage`/
`can_edit_content` pattern).

## Schema changes

Apply Supabase migrations through the Supabase MCP tools (`apply_migration`)
or the Supabase CLI, then regenerate `src/integrations/supabase/types.ts`.
Never hand-edit `types.ts`.

## Secrets

Use Cloudflare Worker secrets (`wrangler secret put`) for Worker-side secrets
(GitHub, Resend). Never commit API keys or `.env` files. The Supabase
publishable/anon key is not a secret and is safe to keep in client code; never
add a Supabase service-role key to anything reachable from the browser.

## Deployment

Use Wrangler for Cloudflare builds/deploys. GitHub CI (`typecheck` + `build` +
`wrangler check`) should remain green before merging. The `Deploy Cloudflare
Worker` workflow requires `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`
repository secrets — confirm they're set before assuming a push auto-deploys.
