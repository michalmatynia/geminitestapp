export type TraderaBrowserListingResult = {
  externalListingId: string;
  listingUrl?: string;
  completedAt?: string;
  simulated?: boolean;
  metadata?: Record<string, unknown>;
};
