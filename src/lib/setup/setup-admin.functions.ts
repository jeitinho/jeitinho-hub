import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getBindings } from "@/lib/cloudflare-db";
import { hashPassword } from "@/lib/auth/cloudflare-auth";

const InputSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(120),
  setupKey: z.string().min(1),
  password: z.string().min(10),
});

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const bootstrapInitialAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const env = getBindings();
    if (!env.SETUP_KEY || !constantTimeEqual(data.setupKey, env.SETUP_KEY)) {
      return { ok: false as const, error: "Clé invalide." };
    }
    const admin = await env.DB.prepare("SELECT u.id FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role = 'admin' LIMIT 1").first<{ id: string }>();
    if (admin) return { ok: false as const, error: "Un administrateur existe déjà. Setup verrouillé." };

    const email = data.email.toLowerCase();
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first<{ id: string }>();
    if (existing) return { ok: false as const, error: "Un compte existe déjà avec cet email." };

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(data.password);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id,email,password_hash,full_name,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
        .bind(userId, email, passwordHash, data.fullName, "active", now, now),
      env.DB.prepare("INSERT INTO profiles (id,email,full_name,status,created_at,updated_at) VALUES (?,?,?,?,?,?)")
        .bind(userId, email, data.fullName, "active", now, now),
      env.DB.prepare("INSERT INTO user_roles (user_id,role,is_active,created_at) VALUES (?, 'admin', 1, ?)")
        .bind(userId, now),
    ]);
    return { ok: true as const, userId, email };
  });
