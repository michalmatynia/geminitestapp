import 'server-only';

import type {
  FilemakerJobBoardOrganizationMatch,
  FilemakerJobBoardScrapeOfferResult,
  FilemakerJobBoardScrapeResponse,
  FilemakerJobBoardScrapeWriteAction,
  FilemakerJobBoardScrapedOffer,
} from '../../filemaker-job-board-scrape-contracts';

import {
  EMPTY_IMPORT_COUNTERS,
  EMPTY_IMPORT_VERIFICATION,
  type ImportCounters,
  type ImportVerification,
} from './import-verification';

export const buildOfferResult = (
  offer: FilemakerJobBoardScrapedOffer,
  match: FilemakerJobBoardOrganizationMatch | null
): FilemakerJobBoardScrapeOfferResult => ({
  listingId: null,
  match,
  offer,
  reason: null,
  status: 'preview',
});

export const buildWriteMessage = (
  action: FilemakerJobBoardScrapeWriteAction,
  result: FilemakerJobBoardScrapeOfferResult
): string => {
  const organizationName = result.match?.organizationName ?? result.offer.companyName;
  if (action === 'organization_created') {
    return `Created organisation ${organizationName}.`;
  }
  if (action === 'organization_linked') {
    return `Linked existing organisation ${organizationName}.`;
  }
  if (action === 'organization_profile_updated') {
    return `Updated company profile for ${organizationName}.`;
  }
  if (action === 'listing_address_updated') {
    return `Updated job listing address for ${result.offer.title}.`;
  }
  if (action === 'listing_created') {
    return `Created job listing ${result.offer.title}.`;
  }
  if (action === 'listing_updated') {
    return `Updated job listing ${result.offer.title}.`;
  }
  if (action === 'listing_skipped') {
    return `Skipped existing job listing ${result.offer.title}.`;
  }
  if (action === 'listing_lexicon_linked') {
    return `Linked job-board lexicon terms for ${result.offer.title}.`;
  }
  return result.reason ?? `No organisation was created for ${result.offer.companyName}.`;
};

export const buildSummary = (
  offers: readonly FilemakerJobBoardScrapeOfferResult[],
  counters: ImportCounters = EMPTY_IMPORT_COUNTERS,
  verification: ImportVerification = EMPTY_IMPORT_VERIFICATION
): FilemakerJobBoardScrapeResponse['summary'] => ({
  createdListings: offers.filter((offer) => offer.status === 'created').length,
  createdLexiconTerms: counters.createdLexiconTerms,
  createdOrganizations: counters.createdOrganizations,
  linkedLexiconTerms: counters.linkedLexiconTerms,
  matchedOffers: offers.filter((offer) => offer.match !== null).length,
  profileUpdates: counters.profileUpdates,
  addressUpdates: counters.addressUpdates,
  scrapedOffers: offers.length,
  skippedOffers: offers.filter((offer) => offer.status === 'skipped').length,
  unmatchedOffers: offers.filter((offer) => offer.status === 'unmatched').length,
  updatedOrganizations: counters.updatedOrganizations,
  updatedListings: offers.filter((offer) => offer.status === 'updated').length,
  verifiedListings: verification.verifiedListings,
});
