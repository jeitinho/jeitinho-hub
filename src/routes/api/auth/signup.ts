import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, "Le mot de passe doit contenir au moins 10 caractères."),
  fullName: z.string().trim().min(2).max(120),
});

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = SignupSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Informations invalides." }, { status: 400 });
        }
        const env = getBindings();
        const email = parsed.data.email.toLowerCase();
        try {
          const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first<{ id: string }>();
          if (existing) return Response.json({ ok: false, error: "Un compte existe déjà avec cet email." }, { status: 409 });

          const admin = await env.DB.prepare(
            "SELECT u.id FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role = 'admin' AND r.is_active = 1 LIMIT 1",
          ).first<{ id: string }>();
          const isFirstAccount = !admin;

          const userId = crypto.randomUUID();
          const now = Math.floor(Date.now() / 1000);
          const passwordHash = await hashPassword(parsed.data.password);
          const status = isFirstAccount ? "active" : "pending_validation";

          const statements = [
            env.DB.prepare("INSERT INTO users (id,email,password_hash,full_name,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
              .bind(userId, email, passwordHash, parsed.data.fullName, status, now, now),
            env.DB.prepare("INSERT OR IGNORE INTO profiles (id,email,full_name,status,created_at,updated_at) VALUES (?,?,?,?,?,?)")
              .bind(userId, email, parsed.data.fullName, status, now, now),
          ];
          if (isFirstAccount) {
            statements.push(
              env.DB.prepare("INSERT INTO user_roles (user_id,role,is_active,created_at) VALUES (?, 'admin', 1, ?)").bind(userId, now),
            );
          }
          await env.DB.batch(statements);

          return Response.json({
            ok: true,
            active: isFirstAccount,
            message: isFirstAccount
              ? "Compte administrateur créé. Vous pouvez vous connecter."
              : "Compte créé. Un administrateur doit valider votre accès.",
          });
        } catch (error) {
          console.error("[auth/signup]", error);
          return Response.json({ ok: false, error: "Création impossible." }, { status: 500 });
        }
      },
    },
  },
});
