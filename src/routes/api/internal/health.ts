import { createFileRoute } from "@tanstack/react-router";

// Temporary diagnostic route: reports presence (never values) of the
// server-only env vars the Worker needs, plus the raw SUPABASE_URL (not a
// secret — already public in public-config.ts) and a live round-trip check
// of the Supabase admin client. Safe to leave public — no secrets, no PII.
export const Route = createFileRoute("/api/internal/health")({
  server: {
    handlers: {
      GET: async () => {
        const envStatus = {
          SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          SETUP_KEY: Boolean(process.env.SETUP_KEY),
          GITHUB_API_KEY: Boolean(process.env.GITHUB_API_KEY),
        };
        const supabaseUrlRaw = process.env.SUPABASE_URL ?? null;

        let database = false;
        let details = "not_checked";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
          database = !error;
          details = error ? `supabase_query_failed: ${error.message}` : "ok";
        } catch (err) {
          details = `supabase_client_failed: ${err instanceof Error ? err.message : String(err)}`;
        }

        const ok = Object.values(envStatus).every(Boolean) && database;
        return Response.json({ ok, env: envStatus, supabaseUrlRaw, database, details });
      },
    },
  },
});
