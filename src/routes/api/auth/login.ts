import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createSession, getCurrentUser, sessionCookie, verifyPassword } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = LoginSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "Identifiants invalides." }, { status: 400 });
        const env = getBindings();
        const email = parsed.data.email.toLowerCase();
        try {
          const row = await env.DB.prepare("SELECT id, password_hash, status FROM users WHERE email = ? LIMIT 1")
            .bind(email)
            .first<{ id: string; password_hash: string; status: string }>();
          if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
            return Response.json({ ok: false, error: "Email ou mot de passe incorrect." }, { status: 401 });
          }
          if (row.status !== "active") {
            const message =
              row.status === "pending_validation"
                ? "Votre compte attend la validation d'un administrateur."
                : "Votre compte n'est pas actif. Contactez un administrateur.";
            return Response.json({ ok: false, error: message, status: row.status }, { status: 403 });
          }
          const token = await createSession(env.DB, row.id);
          const secure = new URL(request.url).protocol === "https:";
          const cookie = sessionCookie(token, secure);
          const user = await getCurrentUser(env.DB, new Request(request.url, { headers: { Cookie: cookie } }));
          return new Response(JSON.stringify({ ok: true, user }), {
            status: 200,
            headers: { "content-type": "application/json", "set-cookie": cookie },
          });
        } catch (error) {
          console.error("[auth/login]", error);
          return Response.json({ ok: false, error: "Connexion impossible." }, { status: 500 });
        }
      },
    },
  },
});
