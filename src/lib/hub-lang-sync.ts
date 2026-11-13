/**
 * Synchronise la langue du hub (mémorisée dans le navigateur) avec le profil
 * Supabase (`profiles.ui_lang`). Le serveur s'en sert pour envoyer les
 * notifications push dans la langue de chacun, et un nouvel appareil reprend
 * automatiquement la langue déjà choisie ailleurs.
 */
import { supabase } from "@/integrations/supabase/client";
import { getLang, hasStoredLang, setLang, type HubLang } from "@/lib/i18n";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function saveLangToProfile(lang: HubLang): Promise<void> {
  try {
    const id = await currentUserId();
    if (id) await supabase.from("profiles").update({ ui_lang: lang }).eq("id", id);
  } catch {
    /* hors ligne : le prochain démarrage resynchronisera */
  }
}

/** Change la langue : profil d'abord (pour les notifications), puis rechargement. */
export async function changeHubLang(lang: HubLang): Promise<void> {
  if (lang === getLang()) return;
  await saveLangToProfile(lang);
  setLang(lang);
}

/** À appeler une fois au démarrage de l'espace connecté. */
export async function syncLangWithProfile(): Promise<void> {
  try {
    const id = await currentUserId();
    if (!id) return;
    const { data } = await supabase.from("profiles").select("ui_lang").eq("id", id).maybeSingle();
    const remote = (data?.ui_lang ?? "fr") as HubLang;
    if (hasStoredLang()) {
      if (remote !== getLang()) await saveLangToProfile(getLang());
    } else if (remote !== "fr") {
      setLang(remote); // nouvel appareil : on reprend la langue du profil
    }
  } catch {
    /* sans incidence : l'interface garde la langue locale */
  }
}
