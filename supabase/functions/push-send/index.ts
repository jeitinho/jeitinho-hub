// Envoi des notifications push du hub.
// Appelée sans contenu par la base (push_wake) : lit push_outbox avec la clé serveur
// et envoie aux abonnements de chaque destinataire. Un appel externe ne peut donc
// déclencher que l'envoi de ce qui est déjà en file.
// GET : renvoie la clé publique VAPID (générée au premier appel, gardée en base).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

async function vapid() {
  const { data } = await admin.from("push_vapid").select("public_key,private_key").eq("id", 1).maybeSingle();
  if (data) return data;
  const k = webpush.generateVAPIDKeys();
  const row = { id: 1, public_key: k.publicKey, private_key: k.privateKey };
  // En cas de course entre deux appels, le premier gagne et on relit.
  await admin.from("push_vapid").upsert(row, { onConflict: "id", ignoreDuplicates: true });
  const again = await admin.from("push_vapid").select("public_key,private_key").eq("id", 1).single();
  return again.data!;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const keys = await vapid();
  if (req.method === "GET") {
    return new Response(JSON.stringify({ publicKey: keys.public_key }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails("mailto:contact@jeitinho.fr", keys.public_key, keys.private_key);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: queue } = await admin
    .from("push_outbox")
    .select("id,user_id,title,body,url,tag")
    .is("sent_at", null)
    .gte("created_at", since)
    .order("id")
    .limit(200);

  let sent = 0;
  for (const m of queue ?? []) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .eq("user_id", m.user_id);
    const errors: string[] = [];
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag }),
          { TTL: 60 * 60 * 12, urgency: "high" },
        );
        sent++;
        await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
        else errors.push(String(code ?? (e as Error).message).slice(0, 200));
      }
    }
    await admin
      .from("push_outbox")
      .update({ sent_at: new Date().toISOString(), error: errors.length ? errors.join(" | ") : null })
      .eq("id", m.id);
  }
  return new Response(JSON.stringify({ processed: queue?.length ?? 0, sent }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
