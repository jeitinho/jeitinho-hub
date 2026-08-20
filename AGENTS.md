# JEITINHO HUB — Engineering Rules

This repository is Cloudflare-native. Do not reintroduce Supabase or Lovable dependencies.

## Runtime

- TanStack Start on Cloudflare Workers
- D1 for application data
- R2 for private media
- HttpOnly session cookies for authentication

## Data access

UI code must use the authenticated D1 client in `src/lib/db-client.ts` or dedicated server routes. Database credentials must never be exposed to the browser.

## Secrets

Use Cloudflare Worker secrets (`wrangler secret put`). Never commit API keys, service-role credentials, or `.env` files.

## Deployment

Use Wrangler for Cloudflare builds/deploys. GitHub CI should remain green before merging.

## Legacy ban

Do not add:

- `@supabase/*`
- `SUPABASE_*` environment variables
- `@lovable.dev/*`
- `LOVABLE_API_KEY`
- `connector-gateway.lovable.dev`
- Lovable-managed server/database calls
