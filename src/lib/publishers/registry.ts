import type { Publisher } from "./types";
import { githubPublisher } from "./githubPublisher";
import { instagramPublisher } from "./instagramPublisher";
import { newsletterPublisher } from "./newsletterPublisher";
import { websitePublisher } from "./websitePublisher";

export const publishers: Record<string, Publisher> = {
  [githubPublisher.id]: githubPublisher,
  [instagramPublisher.id]: instagramPublisher,
  [newsletterPublisher.id]: newsletterPublisher,
  [websitePublisher.id]: websitePublisher,
};

export function getPublishersForType(type: string): Publisher[] {
  return Object.values(publishers).filter((p) => p.supportsContentType(type));
}

export function getPublisher(id: string): Publisher | undefined {
  return publishers[id];
}