import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export type HubBindings = {
  DB: D1Database;
  MEDIA?: R2Bucket;
  ENVIRONMENT?: string;
  SETUP_KEY?: string;
  GITHUB_API_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
};

export function getBindings(): HubBindings {
  const bindings = globalThis.__CF_ENV__;
  if (!bindings?.DB) {
    throw new Error("Cloudflare bindings unavailable. JEITINHO Hub must run inside Cloudflare Workers.");
  }
  return bindings;
}

declare global {
  var __CF_ENV__: HubBindings | undefined;
}
