import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  email: z.string().email(),
  setupKey: z.string().min(1),
});

/**
 * One-shot bootstrap: invites the initial administrator by email.
 * Guardrails:
 * - Requires SETUP_KEY server secret.
 * - Refuses to run once any admin already exists.
 * - No password is ever generated, stored, or logged.
 * - handle_new_user trigger auto-assigns admin to the first profile.
 */
export const inviteInitialAdmin = createServerFn({ method: "POST" })
  .inputValidator((i) => InputSchema.parse(i))
  .handler(async ({ data }) => {
    const expected = process.env.SETUP_KEY;
    if (!expected) return { ok: false as const, error: "SETUP_KEY non configuré." };
    if (data.setupKey.length !== expected.length) return { ok: false as const, error: "Clé invalide." };
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ data.setupKey.charCodeAt(i);
    if (diff !== 0) return { ok: false as const, error: "Clé invalide." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) return { ok: false as const, error: countErr.message };
    if ((count ?? 0) > 0) {
      return { ok: false as const, error: "Un administrateur existe déjà. Setup verrouillé." };
    }

    const { data: invite, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, userId: invite?.user?.id ?? null, email: data.email };
  });