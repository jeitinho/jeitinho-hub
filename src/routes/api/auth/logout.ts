import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, getSession, signOut } from "@/lib/auth/supabase-auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await signOut(getSession(request)?.access_token ?? null);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() },
        });
      },
    },
  },
});
