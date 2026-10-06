import { createServerFn } from "@tanstack/react-start";

/*
 * Relais serveur du flux RSS de blog.jeitinho.fr : utilisé seulement quand le
 * navigateur ne peut pas lire le flux directement (le blog n'envoie pas
 * d'en-tête Access-Control-Allow-Origin). URLs fixes : pas de proxy ouvert.
 */

const FEED_URLS = [
  "https://blog.jeitinho.fr/rss.xml",
  "https://blog.jeitinho.fr/feed.xml",
  "https://blog.jeitinho.fr/rss",
];

type RelayResult = { ok: true; url: string; xml: string } | { ok: false; error: string };

export const fetchBlogFeedViaServer = createServerFn({ method: "GET" }).handler(
  async (): Promise<RelayResult> => {
    const errors: string[] = [];
    for (const url of FEED_URLS) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/rss+xml, application/xml" },
        });
        if (!res.ok) {
          errors.push(`${new URL(url).pathname} ${res.status}`);
          continue;
        }
        const xml = await res.text();
        if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(xml)) {
          errors.push(`${new URL(url).pathname} : pas un flux RSS`);
          continue;
        }
        return { ok: true, url, xml };
      } catch (e) {
        errors.push(`${new URL(url).pathname} ${(e as Error).message}`);
      }
    }
    return { ok: false, error: errors.join(" · ") };
  },
);
