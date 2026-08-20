# SETUP — JEITINHO Hub Cloudflare

JEITINHO Hub runs on Cloudflare Workers with D1 and R2. There is no Supabase or Lovable runtime dependency.

## 1. Prerequisites

- Bun >= 1.1
- Node >= 20 for tooling compatibility
- A Cloudflare account with permission to manage Workers, D1, R2 and secrets

## 2. Install

```bash
git clone <repo-url> jeitinho-hub
cd jeitinho-hub
bun install
```

## 3. Cloudflare resources

Create:

- D1 database: `jeitinho-hub`
- R2 bucket: `jeitinho-hub-media`

Put the D1 database ID in `wrangler.jsonc`.

## 4. Secrets

Set server-only secrets with Wrangler:

```bash
npx wrangler secret put SETUP_KEY
npx wrangler secret put GITHUB_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM
```

Only configure the optional integration secrets when the feature is enabled.

## 5. Migrations

Apply the D1 schema:

```bash
npx wrangler d1 migrations apply jeitinho-hub --remote
```

The source of truth is `migrations/`.

## 6. First administrator

Open `/auth` and create the first account, or use the protected setup flow with `SETUP_KEY`.

The first account is `admin`. Subsequent signups are `pending_validation` until a manager/admin activates them.

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
- Never expose D1 credentials to the browser.
- Keep R2 media private and serve it through authenticated Worker routes.
- Do not reintroduce Supabase or Lovable SDKs, environment variables, gateways or managed database calls.
