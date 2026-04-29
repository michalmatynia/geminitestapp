import 'server-only';

import type { FilemakerJobListing } from '../../types';
import type { FilemakerJobBoardScrapedOffer } from '../../filemaker-job-board-scrape-contracts';

import { normalizeJobBoardSourceUrl, toStringValue } from './normalizers';

export type ListingSourceIdentity = {
  sourceExternalId?: unknown;
  sourceSite?: unknown;
  sourceUrl?: unknown;
};

export const normalizeNameForMatch = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(spolka|sp|zoo|z o o|s a|sa|inc|ltd|llc|gmbh|fundacja|stowarzyszenie)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeDedupeKey = (value: string): string => normalizeNameForMatch(value);

export const normalizeSourceSiteForDedupe = (value: unknown): string =>
  normalizeDedupeKey(toStringValue(value));

export const normalizeExternalIdForDedupe = (value: unknown): string =>
  toStringValue(value).toLowerCase();

export const normalizeSourceUrlForDedupe = (value: unknown): string => {
  const normalized = normalizeJobBoardSourceUrl(value) ?? toStringValue(value);
  if (normalized.length === 0) return '';
  try {
    const parsed = new URL(normalized);
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().toLowerCase();
  } catch {
    return normalizeDedupeKey(normalized);
  }
};

export const listingSourceMatchesOfferSource = (
  listing: FilemakerJobListing,
  offer: FilemakerJobBoardScrapedOffer
): boolean => {
  const listingSourceSite = normalizeSourceSiteForDedupe(listing.sourceSite);
  const offerSourceSite = normalizeSourceSiteForDedupe(offer.sourceSite);
  return (
    listingSourceSite.length === 0 ||
    offerSourceSite.length === 0 ||
    listingSourceSite === offerSourceSite
  );
};

export const listingSourceMatchesIdentitySource = (
  listing: FilemakerJobListing,
  identity: ListingSourceIdentity
): boolean => {
  const listingSourceSite = normalizeSourceSiteForDedupe(listing.sourceSite);
  const identitySourceSite = normalizeSourceSiteForDedupe(identity.sourceSite);
  return (
    listingSourceSite.length === 0 ||
    identitySourceSite.length === 0 ||
    listingSourceSite === identitySourceSite
  );
};

const samePresentValue = (left: string, right: string): boolean =>
  left.length > 0 && right.length > 0 && left === right;

const listingMatchesOfferExternalId = (
  listing: FilemakerJobListing,
  offerExternalId: string
): boolean => samePresentValue(normalizeExternalIdForDedupe(listing.sourceExternalId), offerExternalId);

const listingMatchesOfferSourceUrl = (
  listing: FilemakerJobListing,
  offerSourceUrl: string
): boolean => samePresentValue(normalizeSourceUrlForDedupe(listing.sourceUrl), offerSourceUrl);

export const listingMatchesSourceIdentity = (
  listing: FilemakerJobListing,
  identity: ListingSourceIdentity
): boolean => {
  if (!listingSourceMatchesIdentitySource(listing, identity)) return false;
  const sourceExternalId = normalizeExternalIdForDedupe(identity.sourceExternalId);
  const sourceUrl = normalizeSourceUrlForDedupe(identity.sourceUrl);
  if (sourceExternalId.length === 0 && sourceUrl.length === 0) return false;
  return (
    listingMatchesOfferExternalId(listing, sourceExternalId) ||
    listingMatchesOfferSourceUrl(listing, sourceUrl)
  );
};

const listingMatchesOfferTitle = (
  listing: FilemakerJobListing,
  titleKey: string
): boolean => {
  const listingTitleKey = normalizeDedupeKey(
    `${listing.organizationId} ${listing.title} ${listing.location ?? ''}`
  );
  return listingTitleKey === titleKey;
};

const listingMatchesOffer = (input: {
  hasSourceIdentity: boolean;
  listing: FilemakerJobListing;
  offer: FilemakerJobBoardScrapedOffer;
  offerExternalId: string;
  offerSourceUrl: string;
  organizationId: string;
  titleKey: string;
}): boolean => {
  if (input.listing.organizationId !== input.organizationId) return false;
  if (!listingSourceMatchesOfferSource(input.listing, input.offer)) return false;
  if (listingMatchesOfferExternalId(input.listing, input.offerExternalId)) return true;
  if (listingMatchesOfferSourceUrl(input.listing, input.offerSourceUrl)) return true;
  if (input.hasSourceIdentity) return false;
  return listingMatchesOfferTitle(input.listing, input.titleKey);
};

export const findExistingListingIndex = (
  listings: readonly FilemakerJobListing[],
  organizationId: string,
  offer: FilemakerJobBoardScrapedOffer
): number => {
  const titleKey = normalizeDedupeKey(`${organizationId} ${offer.title} ${offer.location}`);
  const offerExternalId = normalizeExternalIdForDedupe(offer.sourceExternalId);
  const offerSourceUrl = normalizeSourceUrlForDedupe(offer.sourceUrl);
  const hasSourceIdentity = offerExternalId.length > 0 || offerSourceUrl.length > 0;
  return listings.findIndex((listing: FilemakerJobListing): boolean =>
    listingMatchesOffer({
      hasSourceIdentity,
      listing,
      offer,
      offerExternalId,
      offerSourceUrl,
      organizationId,
      titleKey,
    })
  );
};

export const findExistingListingIndexBySourceIdentity = (
  listings: readonly FilemakerJobListing[],
  identity: ListingSourceIdentity
): number =>
  listings.findIndex((listing: FilemakerJobListing): boolean =>
    listingMatchesSourceIdentity(listing, identity)
  );
