import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getBindings } from "@/lib/cloudflare-db";
import { hashPassword } from "@/lib/auth/cloudflare-auth";

const ResetSchema = z.object({ token: z.string().min(20), password: z.string().min(10) });

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = ResetSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "Lien ou mot de passe invalide." }, { status: 400 });
        const env = getBindings();
        const tokenHash = await sha256Hex(parsed.data.token);
        const now = Math.floor(Date.now() / 1000);
        const reset = await env.DB.prepare(
          "SELECT id,user_id,expires_at,used_at FROM auth_password_resets WHERE token_hash=? LIMIT 1"
        ).bind(tokenHash).first<{ id: string; user_id: string; expires_at: number; used_at: number | null }>();
        if (!reset || reset.used_at !== null || reset.expires_at <= now) {
          return Response.json({ ok: false, error: "Lien de réinitialisation invalide ou expiré." }, { status: 400 });
        }
        const passwordHash = await hashPassword(parsed.data.password);
        await env.DB.batch([
          env.DB.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").bind(passwordHash, new Date().toISOString(), reset.user_id),
          env.DB.prepare("UPDATE auth_password_resets SET used_at=? WHERE id=?").bind(now, reset.id),
          env.DB.prepare("UPDATE auth_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL").bind(now, reset.user_id),
        ]);
        return Response.json({ ok: true });
      },
    },
  },
});
