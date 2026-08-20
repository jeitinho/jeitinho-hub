# JEITINHO HUB — Cloudflare Native

## Architecture

JEITINHO Hub runs as a TanStack Start application on Cloudflare Workers.

- **Cloudflare Workers** — application runtime and SSR/API
- **D1** — application database
- **R2** — private media storage
- **HttpOnly sessions** — authentication and authorization
- **GitHub API** — optional editorial publication integration
- **Resend API** — optional transactional email integration

There is no runtime dependency on Supabase or Lovable.

## Required Cloudflare resources

Create these resources in the Cloudflare account:

- D1 database: `jeitinho-hub`
- R2 bucket: `jeitinho-hub-media`

Put the resulting D1 database ID in `wrangler.jsonc`.

## Secrets / environment

Required for production bootstrap:

- `SETUP_KEY`
- `GITHUB_API_KEY` (only when GitHub publishing is enabled)
- `RESEND_API_KEY` and `RESEND_FROM` (only when password-reset email is enabled)

Never commit credentials to Git.

## D1 migrations

Run migrations against the Cloudflare D1 database using Wrangler. The schema lives in `migrations/`.

```bash
npx wrangler d1 migrations apply jeitinho-hub --remote
```

## Local development

Use a local D1 database when testing Worker APIs:

```bash
bun install
bun run dev
```

## Authentication

The first administrator can be bootstrapped once using the protected setup flow with `SETUP_KEY`. All subsequent registrations enter `pending_validation` until an administrator activates the account.

Passwords are hashed server-side. Sessions are stored as hashed random tokens in D1 and delivered only through an HttpOnly cookie.

## Deployment

Build the TanStack Start application and deploy the generated Worker with Wrangler:

```bash
bun run build
npx wrangler deploy
```

The GitHub CI workflow blocks reintroduction of Supabase/Lovable references in the application/runtime configuration.
