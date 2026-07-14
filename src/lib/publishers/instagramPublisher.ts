import type { Publisher } from "./types";

export const instagramPublisher: Publisher = {
  id: "instagram",
  label: "Instagram",
  channelSlug: "instagram",
  supportsContentType: (t) =>
    ["instagram_post", "instagram_reel", "instagram_story", "instagram_carousel"].includes(t),
  async publish() {
    return { ok: false, error: "Instagram Publisher — à implémenter (Meta Graph API)" };
  },
};