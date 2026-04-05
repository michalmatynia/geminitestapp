export type TraderaBrowserListingResult = {
  externalListingId: string | null;
  listingUrl?: string;
  completedAt?: string;
  simulated?: boolean;
  metadata?: Record<string, unknown>;
};
