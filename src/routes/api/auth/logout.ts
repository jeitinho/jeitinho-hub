import { createFileRoute } from "@tanstack/react-router";
import { getBindings } from "@/lib/cloudflare-db";
import { clearSessionCookie, getSessionToken, revokeSession } from "@/lib/auth/cloudflare-auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getSessionToken(request);
        if (token) await revokeSession(getBindings().DB, token);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() },
        });
      },
    },
  },
});
