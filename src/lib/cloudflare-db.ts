import type { D1Database } from "@cloudflare/workers-types";

export type HubBindings = {
  DB: D1Database;
  SETUP_KEY?: string;
  GITHUB_API_KEY?: string;
};

export function getBindings(): HubBindings {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> }; __CF_ENV__?: HubBindings };
  if (runtime.__CF_ENV__) return runtime.__CF_ENV__;
  throw new Error("Cloudflare bindings not available. The Hub must run inside Cloudflare Workers.");
}
