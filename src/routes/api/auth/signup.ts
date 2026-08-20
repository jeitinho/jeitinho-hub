import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getBindings } from "@/lib/cloudflare-db";
import { createSession, hashPassword, sessionCookie } from "@/lib/auth/cloudflare-auth";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  fullName: z.string().trim().min(2).max(120),
});

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const parsed = SignupSchema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: "Informations invalides." }, { status: 400 });
        const { DB } = getBindings();
        const email = parsed.data.email.toLowerCase();
        const existing = await DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first<{ id: string }>();
        if (existing) return Response.json({ ok: false, error: "Un compte existe déjà avec cet email." }, { status: 409 });

        const userId = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);
        const firstUser = await DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
        const isFirstUser = Number(firstUser?.count ?? 0) === 0;
        const status = isFirstUser ? "active" : "pending_validation";
        const passwordHash = await hashPassword(parsed.data.password);

        await DB.prepare(
          "INSERT INTO users (id,email,password_hash,full_name,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)"
        ).bind(userId, email, passwordHash, parsed.data.fullName, status, now, now).run();
        await DB.prepare(
          "INSERT INTO user_roles (user_id,role,is_active,created_at) VALUES (?,?,1,?)"
        ).bind(userId, isFirstUser ? "admin" : "auteur", now).run();

        if (!isFirstUser) {
          return Response.json({ ok: true, active: false, message: "Compte créé. Un administrateur doit valider votre accès." });
        }

        const token = await createSession(DB, userId);
        return new Response(JSON.stringify({ ok: true, active: true }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "set-cookie": sessionCookie(token, new URL(request.url).protocol === "https:"),
          },
        });
      },
    },
  },
});
