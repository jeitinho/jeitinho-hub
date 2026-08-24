import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, getSessionToken, revokeSession } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getSessionToken(request);
        if (token) {
          try {
            await revokeSession(getBindings().DB, token);
          } catch (error) {
            console.error("[auth/logout]", error);
          }
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() },
        });
      },
    },
  },
});
