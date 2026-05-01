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
  const title = result.offer.title;
  const messages: Partial<Record<FilemakerJobBoardScrapeWriteAction, string>> = {
    organization_created: `Created organisation ${organizationName}.`,
    organization_linked: `Linked existing organisation ${organizationName}.`,
    organization_profile_updated: `Updated company profile for ${organizationName}.`,
    listing_address_updated: `Updated job listing address for ${title}.`,
    listing_created: `Created job listing ${title}.`,
    listing_updated: `Updated job listing ${title}.`,
    listing_skipped: `Skipped existing job listing ${title}.`,
    listing_lexicon_linked: `Linked job-board lexicon terms for ${title}.`,
  };
  return messages[action] ?? result.reason ?? `No organisation was created for ${result.offer.companyName}.`;
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
