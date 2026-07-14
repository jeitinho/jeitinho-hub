import type { Publisher } from "./types";

export const websitePublisher: Publisher = {
  id: "website",
  label: "jeitinho.fr",
  channelSlug: "website",
  supportsContentType: (t) => ["landing_page", "seo_page"].includes(t),
  async publish() {
    return { ok: false, error: "Website Publisher — à implémenter (push GitHub jeitinho.fr)" };
  },
};