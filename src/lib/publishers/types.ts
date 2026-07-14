export type PublisherContext = {
  contentId: string;
  triggeredBy: string;
  dryRun: boolean;
};

export type PublisherResult = {
  ok: boolean;
  externalRef?: string;
  externalUrl?: string;
  payload?: Record<string, unknown>;
  preview?: string;
  error?: string;
};

export type Publisher = {
  id: string;
  label: string;
  channelSlug: string;
  supportsContentType: (type: string) => boolean;
  publish: (ctx: PublisherContext) => Promise<PublisherResult>;
};