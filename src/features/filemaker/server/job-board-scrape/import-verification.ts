import 'server-only';

import type {
  FilemakerJobBoardScrapeOfferResult,
  FilemakerJobBoardScrapedOffer,
} from '../../filemaker-job-board-scrape-contracts';
import type {
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerJobListingLexiconLink,
  FilemakerLexiconTerm,
  FilemakerOrganization,
} from '../../types';

import { normalizeLexiconKey, uniqueStrings } from './normalizers';

export type ImportCounters = {
  addressUpdates: number;
  createdLexiconTerms: number;
  createdOrganizations: number;
  linkedLexiconTerms: number;
  profileUpdates: number;
  updatedOrganizations: number;
};

export type ImportVerification = {
  verifiedListings: number;
  warnings: string[];
};

export const EMPTY_IMPORT_COUNTERS: ImportCounters = {
  addressUpdates: 0,
  createdLexiconTerms: 0,
  createdOrganizations: 0,
  linkedLexiconTerms: 0,
  profileUpdates: 0,
  updatedOrganizations: 0,
};

export const EMPTY_IMPORT_VERIFICATION: ImportVerification = {
  verifiedListings: 0,
  warnings: [],
};

const pillTypeKey = (
  pill: FilemakerJobBoardScrapedOffer['pills'][number]
): FilemakerLexiconTerm['typeKey'] => pill.typeKey;

const findImportedOrganizationWarning = (
  database: FilemakerDatabase,
  result: FilemakerJobBoardScrapeOfferResult
): string | null => {
  const match = result.match;
  if (match === null) return null;
  const organization = database.organizations.find(
    (entry: FilemakerOrganization): boolean => entry.id === match.organizationId
  );
  if (organization === undefined) {
    return `Import verification could not find organisation ${match.organizationName}.`;
  }
  if (
    result.offer.companyProfile.trim().length > 0 &&
    organization.jobBoardCompanyProfile !== result.offer.companyProfile
  ) {
    return `Import verification could not confirm company profile for ${organization.name}.`;
  }
  return null;
};

const buildListingLinkedTermIds = (
  database: FilemakerDatabase,
  listing: FilemakerJobListing
): Set<string> =>
  new Set([
    ...listing.lexiconTermIds,
    ...database.jobListingLexiconLinks
      .filter(
        (link: FilemakerJobListingLexiconLink): boolean => link.jobListingId === listing.id
      )
      .map((link: FilemakerJobListingLexiconLink): string => link.lexiconTermId),
  ]);

const hasMissingLinkedPillTerm = (
  database: FilemakerDatabase,
  listingLinkedTermIds: Set<string>,
  pills: FilemakerJobBoardScrapedOffer['pills']
): boolean =>
  pills.some((pill): boolean => {
    const normalizedLabel = normalizeLexiconKey(pill.label);
    const typeKey = pillTypeKey(pill);
    const term = database.lexiconTerms.find(
      (entry: FilemakerLexiconTerm): boolean =>
        entry.typeKey === typeKey && entry.normalizedLabel === normalizedLabel
    );
    return term === undefined || !listingLinkedTermIds.has(term.id);
  });

const verifyImportedListing = (
  database: FilemakerDatabase,
  result: FilemakerJobBoardScrapeOfferResult
): { verified: boolean; warning: string | null } => {
  if (result.listingId === null || result.status === 'unmatched') {
    return { verified: false, warning: null };
  }
  const listing = database.jobListings.find(
    (entry: FilemakerJobListing): boolean => entry.id === result.listingId
  );
  if (listing === undefined) {
    return {
      verified: false,
      warning: `Import verification could not find listing ${result.offer.title}.`,
    };
  }
  const hasMissingTerm =
    result.offer.pills.length > 0 &&
    hasMissingLinkedPillTerm(database, buildListingLinkedTermIds(database, listing), result.offer.pills);
  return {
    verified: true,
    warning: hasMissingTerm
      ? `Import verification could not confirm lexicon terms for ${result.offer.title}.`
      : null,
  };
};

export const verifyImportedResults = (
  database: FilemakerDatabase,
  results: readonly FilemakerJobBoardScrapeOfferResult[]
): ImportVerification => {
  const warnings: string[] = [];
  let verifiedListings = 0;

  for (const result of results) {
    const organizationWarning = findImportedOrganizationWarning(database, result);
    if (organizationWarning !== null) {
      warnings.push(organizationWarning);
    }

    const listingVerification = verifyImportedListing(database, result);
    if (listingVerification.warning !== null) {
      warnings.push(listingVerification.warning);
    }
    if (listingVerification.verified) {
      verifiedListings += 1;
    }
  }

  return { verifiedListings, warnings: uniqueStrings(warnings) };
};
