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

const isReliableSourceUrlForListingDedupe = (value: unknown): boolean => {
  const normalized = normalizeJobBoardSourceUrl(value) ?? toStringValue(value);
  if (normalized.length === 0) return false;
  try {
    const parsed = new URL(normalized);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname;
    if (hostname === 'pracuj.pl' || hostname.endsWith('.pracuj.pl')) {
      return /,oferta,/iu.test(pathname);
    }
    if (hostname === 'justjoin.it' || hostname.endsWith('.justjoin.it')) {
      return /\/job-offer\//iu.test(pathname);
    }
    if (hostname === 'nofluffjobs.com' || hostname.endsWith('.nofluffjobs.com')) {
      return /\/(?:pl\/)?job\//iu.test(pathname);
    }
    return false;
  } catch {
    return false;
  }
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
): boolean =>
  isReliableSourceUrlForListingDedupe(listing.sourceUrl) &&
  isReliableSourceUrlForListingDedupe(offerSourceUrl) &&
  samePresentValue(normalizeSourceUrlForDedupe(listing.sourceUrl), offerSourceUrl);

export const listingMatchesSourceIdentity = (
  listing: FilemakerJobListing,
  identity: ListingSourceIdentity
): boolean => {
  const listingSourceSite = normalizeSourceSiteForDedupe(listing.sourceSite);
  const identitySourceSite = normalizeSourceSiteForDedupe(identity.sourceSite);
  const sourceSitesMatch =
    listingSourceSite.length > 0 &&
    identitySourceSite.length > 0 &&
    listingSourceSite === identitySourceSite;
  const sourceExternalId = normalizeExternalIdForDedupe(identity.sourceExternalId);
  const sourceUrl = normalizeSourceUrlForDedupe(identity.sourceUrl);
  if (sourceExternalId.length === 0 && sourceUrl.length === 0) return false;
  if (listingMatchesOfferSourceUrl(listing, sourceUrl)) return true;
  return sourceSitesMatch && listingMatchesOfferExternalId(listing, sourceExternalId);
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
  if (listingMatchesOfferSourceUrl(input.listing, input.offerSourceUrl)) return true;
  const listingSourceSite = normalizeSourceSiteForDedupe(input.listing.sourceSite);
  const offerSourceSite = normalizeSourceSiteForDedupe(input.offer.sourceSite);
  const sourceSitesMatch =
    listingSourceSite.length > 0 &&
    offerSourceSite.length > 0 &&
    listingSourceSite === offerSourceSite;
  if (
    sourceSitesMatch &&
    listingMatchesOfferExternalId(input.listing, input.offerExternalId)
  ) {
    return true;
  }
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

export const findExistingListingIndexesBySourceIdentity = (
  listings: readonly FilemakerJobListing[],
  identity: ListingSourceIdentity
): number[] =>
  listings.flatMap((listing: FilemakerJobListing, index: number): number[] =>
    listingMatchesSourceIdentity(listing, identity) ? [index] : []
  );

const LISTING_ADDRESS_FIELDS = [
  'addressId',
  'city',
  'country',
  'countryId',
  'postalCode',
  'street',
  'streetNumber',
] as const;

export const listingAddressFieldsEqual = (
  left: FilemakerJobListing,
  right: FilemakerJobListing
): boolean => {
  for (const field of LISTING_ADDRESS_FIELDS) {
    if (left[field] !== right[field]) return false;
  }
  return true;
};
