import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createSession, hashPassword, sessionCookie, verifyPassword } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

type UserRecord = { id: string; email: string; password_hash: string; status: string };

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const parsed = LoginSchema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: "Identifiants invalides." }, { status: 400 });
        const { DB } = getBindings();
        const user = await DB.prepare("SELECT id,email,password_hash,status FROM users WHERE email = ? LIMIT 1")
          .bind(parsed.data.email.toLowerCase())
          .first<UserRecord>();
        if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
          return Response.json({ ok: false, error: "Email ou mot de passe incorrect." }, { status: 401 });
        }
        if (user.status !== "active") {
          return Response.json({ ok: false, error: "Votre compte n'est pas encore actif." }, { status: 403 });
        }
        const token = await createSession(DB, user.id);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": sessionCookie(token, new URL(request.url).protocol === "https:") },
        });
      },
    },
  },
});
