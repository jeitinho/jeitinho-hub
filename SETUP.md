# SETUP — JEITINHO Hub

JEITINHO Hub runs on Cloudflare Workers for hosting/SSR and private R2 media,
with Supabase as the system of record for authentication and application data.

## 1. Prerequisites

- Bun >= 1.1
- Node >= 20 for tooling compatibility
- A Cloudflare account with permission to manage Workers, R2 and secrets
- Access to the `JEITINHO` Supabase project (`sxzdabtarlgozixcbzus`)

## 2. Install

```bash
git clone <repo-url> jeitinho-hub
cd jeitinho-hub
bun install
```

## 3. Cloudflare resources

Create:

- R2 bucket: `jeitinho-hub-media`

A D1 database binding (`jeitinho-hub`) is also declared in `wrangler.jsonc` for
legacy code that is no longer on any live request path (see `ARCHITECTURE.md`
§9) — it does not need to hold real data to run the app.

## 4. Secrets

Set server-only secrets with Wrangler:

```bash
npx wrangler secret put GITHUB_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
```

Only configure the optional integration secrets when the feature is enabled.
The Supabase URL and publishable key are not secrets and are already in
`src/integrations/supabase/client.ts` / `src/lib/auth/supabase-auth.ts`.

For CI deploys, set these GitHub Actions repository secrets
(Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Without them, the `Deploy Cloudflare Worker` workflow fails and deploys must be
run manually (`npx wrangler deploy`) from a machine with Cloudflare credentials.

## 5. Database

The schema, RLS policies and RPC functions live in Supabase. Apply changes
through the Supabase MCP tools or Supabase CLI, then regenerate
`src/integrations/supabase/types.ts` from the live project schema.

## 6. First administrator / account activation

New signups through `/auth` land in `pending_validation` until a manager or
admin activates them from `/parametres/utilisateurs` (choose full name, roles,
photo). There is no separate one-shot bootstrap flow currently wired to
Supabase — the first account must be activated directly in Supabase (set
`profiles.status = 'active'`, `profiles.is_active = true`, and insert an
`admin` row into `user_roles`) if no admin exists yet.

## 7. Development

```bash
bun run dev
bun run typecheck
bun run build
```

## 8. Deployment

```bash
bun run build
npx wrangler deploy
```

## 9. Security rules

- Never commit `.env`, API keys, or Cloudflare secrets.
- Never add a Supabase service-role key to client-reachable code — RLS is the
  authorization boundary for everything under `src/integrations/supabase/`.
- Keep R2 media private and serve it through authenticated Worker routes.
