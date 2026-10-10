/**
 * Ouverture « fluide » des liens externes sur téléphone.
 *
 * Le manager génère des liens web (Gmail web en mode rédaction, profil Instagram).
 * Sur ordinateur, on les garde tels quels. Sur téléphone, un lien web Gmail ouvre
 * le navigateur, redemande la connexion et perd le brouillon : on ouvre donc
 * directement l'application, avec destinataire, objet et texte déjà remplis.
 *
 * Fonctions pures (testées) + un écouteur global installé une seule fois.
 */

export type Platform = "ios" | "android" | "desktop";

export function detectPlatform(ua: string): Platform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS se présente comme un Mac avec écran tactile : traité par l'appelant.
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export type AppLink = { app: string; fallback: string | null };

/** Lien Gmail web de rédaction → paramètres. Null si ce n'est pas un lien de rédaction. */
export function parseGmailCompose(
  href: string,
): { to: string; subject: string; body: string } | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if (u.hostname !== "mail.google.com" || u.searchParams.get("view") !== "cm") return null;
  return {
    to: u.searchParams.get("to") ?? "",
    subject: u.searchParams.get("su") ?? "",
    body: u.searchParams.get("body") ?? "",
  };
}

/** Pseudo du profil depuis instagram.com/<pseudo>, ig.me/m/<pseudo>. Null sinon. */
export function parseInstagramHandle(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  if (host === "ig.me" && parts[0] === "m" && parts[1]) return parts[1];
  if (
    host === "instagram.com" &&
    parts.length === 1 &&
    !/^(p|reel|explore|accounts|direct|stories)$/i.test(parts[0])
  )
    return parts[0];
  return null;
}

const enc = encodeURIComponent;

function mailto(p: { to: string; subject: string; body: string }) {
  return `mailto:${p.to}?subject=${enc(p.subject)}&body=${enc(p.body)}`;
}

/** Lien d'application à ouvrir sur téléphone à la place du lien web, ou null (lien laissé tel quel). */
export function appLinkFor(href: string, platform: Platform): AppLink | null {
  if (platform === "desktop") return null;

  const mail = parseGmailCompose(href);
  if (mail) {
    if (platform === "ios")
      return {
        app: `googlegmail://co?to=${enc(mail.to)}&subject=${enc(mail.subject)}&body=${enc(mail.body)}`,
        // Gmail pas installé : app Mail d'Apple, toujours prérempli.
        fallback: mailto(mail),
      };
    // Android : mailto ouvre Gmail (appli mail par défaut), brouillon prérempli.
    return { app: mailto(mail), fallback: null };
  }

  if (href.startsWith("mailto:")) return null; // déjà une appli

  const handle = parseInstagramHandle(href);
  if (handle) {
    const web = `https://www.instagram.com/${handle}/`;
    if (platform === "ios")
      return { app: `instagram://user?username=${enc(handle)}`, fallback: web };
    return {
      app: `intent://instagram.com/_u/${handle}/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${enc(web)};end`,
      fallback: null,
    };
  }
  if (/^https:\/\/(www\.)?instagram\.com\/?$/.test(href)) {
    if (platform === "ios") return { app: "instagram://app", fallback: href };
    return {
      app: `intent://instagram.com/#Intent;package=com.instagram.android;scheme=https;S.browser_fallback_url=${enc(href)};end`,
      fallback: null,
    };
  }
  return null;
}

function currentPlatform(): Platform {
  const p = detectPlatform(navigator.userAgent);
  if (p === "desktop" && navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
    return "ios";
  return p;
}

/** Ouvre l'appli ; si rien ne s'est ouvert après 1,5 s (page toujours visible), ouvre le secours. */
function openApp(link: AppLink) {
  window.location.href = link.app;
  if (!link.fallback) return;
  const fallback = link.fallback;
  const timer = window.setTimeout(() => {
    if (document.visibilityState === "visible") window.location.href = fallback;
  }, 1500);
  const cancel = () => {
    if (document.visibilityState === "hidden") window.clearTimeout(timer);
  };
  document.addEventListener("visibilitychange", cancel, { once: true });
}

let installed = false;

/**
 * Écouteur global (phase de bouillonnement, donc APRÈS les onClick React :
 * « copier puis ouvrir » continue de copier le message avant l'ouverture).
 */
export function installAppLinks() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    const link = appLinkFor(a.href, currentPlatform());
    if (!link) return;
    e.preventDefault();
    openApp(link);
  });
}
