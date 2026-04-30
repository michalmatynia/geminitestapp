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

export const verifyImportedResults = (
  database: FilemakerDatabase,
  results: readonly FilemakerJobBoardScrapeOfferResult[]
): ImportVerification => {
  const warnings: string[] = [];
  let verifiedListings = 0;

  for (const result of results) {
    const match = result.match;
    if (match !== null) {
      const organization = database.organizations.find(
        (entry: FilemakerOrganization): boolean => entry.id === match.organizationId
      );
      if (organization === undefined) {
        warnings.push(
          `Import verification could not find organisation ${match.organizationName}.`
        );
      } else if (
        result.offer.companyProfile.trim().length > 0 &&
        organization.jobBoardCompanyProfile !== result.offer.companyProfile
      ) {
        warnings.push(
          `Import verification could not confirm company profile for ${organization.name}.`
        );
      }
    }

    if (result.listingId === null || result.status === 'unmatched') {
      continue;
    }
    const listing = database.jobListings.find(
      (entry: FilemakerJobListing): boolean => entry.id === result.listingId
    );
    if (listing === undefined) {
      warnings.push(`Import verification could not find listing ${result.offer.title}.`);
      continue;
    }
    if (result.offer.pills.length > 0) {
      const listingLinkedTermIds = new Set([
        ...listing.lexiconTermIds,
        ...database.jobListingLexiconLinks
          .filter(
            (link: FilemakerJobListingLexiconLink): boolean =>
              link.jobListingId === listing.id
          )
          .map((link: FilemakerJobListingLexiconLink): string => link.lexiconTermId),
      ]);
      const missingTerm = result.offer.pills.find((pill): boolean => {
        const normalizedLabel = normalizeLexiconKey(pill.label);
        const typeKey = pillTypeKey(pill);
        const term = database.lexiconTerms.find(
          (entry: FilemakerLexiconTerm): boolean =>
            entry.typeKey === typeKey && entry.normalizedLabel === normalizedLabel
        );
        return term === undefined || !listingLinkedTermIds.has(term.id);
      });
      if (missingTerm !== undefined) {
        warnings.push(
          `Import verification could not confirm lexicon terms for ${result.offer.title}.`
        );
      }
    }
    verifiedListings += 1;
  }

  return { verifiedListings, warnings: uniqueStrings(warnings) };
};
