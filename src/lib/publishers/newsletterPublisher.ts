import type { Publisher } from "./types";

export const newsletterPublisher: Publisher = {
  id: "newsletter",
  label: "Newsletter",
  channelSlug: "newsletter",
  supportsContentType: (t) => t === "newsletter",
  async publish() {
    return { ok: false, error: "Newsletter Publisher — à implémenter (Resend / Beehiiv)" };
  },
};