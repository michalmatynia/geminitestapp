import 'server-only';

import { randomUUID } from 'crypto';

import type { FilemakerLexiconTermCategory } from '@/shared/contracts/filemaker';
import { internalError } from '@/shared/errors/app-error';

import type { FilemakerJobBoardScrapedOffer } from '../../filemaker-job-board-scrape-contracts';
import { toIdToken } from '../../filemaker-settings.helpers';
import {
  createFilemakerJobListing,
  createFilemakerJobListingLexiconLink,
  createFilemakerLexiconTerm,
} from '../../settings';
import type {
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerJobListingLexiconLink,
  FilemakerLexiconTerm,
} from '../../types';

import { normalizeLexiconKey, uniqueStrings } from './normalizers';

export type OfferLexiconApplyResult = {
  changed: boolean;
  createdTerms: number;
  linkedTerms: number;
};

export const buildLexiconTermId = (
  category: FilemakerLexiconTermCategory,
  normalizedLabel: string
): string => {
  const token = toIdToken(`${category}-${normalizedLabel}`);
  return `filemaker-lexicon-term-${token.length > 0 ? token : randomUUID()}`;
};

export const buildJobListingLexiconLinkId = (
  jobListingId: string,
  lexiconTermId: string
): string => {
  const token = toIdToken(`${jobListingId}-${lexiconTermId}`);
  return `filemaker-job-listing-lexicon-link-${token.length > 0 ? token : randomUUID()}`;
};

const scrapedPillTypeKey = (
  pill: FilemakerJobBoardScrapedOffer['pills'][number]
): FilemakerLexiconTermCategory => pill.typeKey;

export const upsertLexiconTerm = (
  database: FilemakerDatabase,
  pill: FilemakerJobBoardScrapedOffer['pills'][number],
  sourceProvider: string
): { created: boolean; term: FilemakerLexiconTerm; updated: boolean } => {
  const normalizedLabel = normalizeLexiconKey(pill.label);
  const typeKey = scrapedPillTypeKey(pill);
  const existingIndex = database.lexiconTerms.findIndex(
    (term: FilemakerLexiconTerm): boolean =>
      term.typeKey === typeKey && term.normalizedLabel === normalizedLabel
  );
  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    const existing = database.lexiconTerms[existingIndex];
    if (existing === undefined) {
      throw internalError('Lexicon term index resolved without a term.');
    }
    const next = createFilemakerLexiconTerm({
      ...existing,
      lastSeenAt: now,
      occurrenceCount: existing.occurrenceCount + 1,
      updatedAt: now,
    });
    database.lexiconTerms.splice(existingIndex, 1, next);
    return { created: false, term: next, updated: true };
  }
  const otherIndex =
    typeKey !== 'other'
      ? database.lexiconTerms.findIndex(
          (term: FilemakerLexiconTerm): boolean =>
            term.typeKey === 'other' && term.normalizedLabel === normalizedLabel
        )
      : -1;
  if (otherIndex >= 0) {
    const existing = database.lexiconTerms[otherIndex];
    if (existing === undefined) {
      throw internalError('Other lexicon term index resolved without a term.');
    }
    const next = createFilemakerLexiconTerm({
      ...existing,
      label: existing.label.trim().length > 0 ? existing.label : pill.label,
      typeKey,
      category: typeKey,
      sourceSite: existing.sourceSite ?? pill.sourceSite,
      sourceProvider: existing.sourceProvider ?? sourceProvider,
      lastSeenAt: now,
      occurrenceCount: existing.occurrenceCount + 1,
      updatedAt: now,
    });
    database.lexiconTerms.splice(otherIndex, 1, next);
    return { created: false, term: next, updated: true };
  }
  const term = createFilemakerLexiconTerm({
    id: buildLexiconTermId(typeKey, normalizedLabel),
    label: pill.label,
    normalizedLabel,
    typeKey,
    category: typeKey,
    sourceSite: pill.sourceSite,
    sourceProvider,
    firstSeenAt: now,
    lastSeenAt: now,
    occurrenceCount: 1,
  });
  database.lexiconTerms.push(term);
  return { created: true, term, updated: true };
};

export const ensureJobListingLexiconLink = (
  database: FilemakerDatabase,
  jobListingId: string,
  term: FilemakerLexiconTerm,
  pill: FilemakerJobBoardScrapedOffer['pills'][number]
): boolean => {
  const existingIndex = database.jobListingLexiconLinks.findIndex(
    (link: FilemakerJobListingLexiconLink): boolean =>
      link.jobListingId === jobListingId && link.lexiconTermId === term.id
  );
  const typeKey = scrapedPillTypeKey(pill);
  if (existingIndex >= 0) {
    const existing = database.jobListingLexiconLinks[existingIndex];
    if (existing === undefined) return false;
    const next = createFilemakerJobListingLexiconLink({
      ...existing,
      sourceSite: pill.sourceSite,
      sourceUrl: pill.sourceUrl,
      sourceValue: pill.label,
      typeKey,
      category: typeKey,
      position: pill.position,
      updatedAt: new Date().toISOString(),
    });
    if (
      existing.sourceSite === next.sourceSite &&
      existing.sourceUrl === next.sourceUrl &&
      existing.sourceValue === next.sourceValue &&
      existing.typeKey === next.typeKey &&
      existing.category === next.category &&
      existing.position === next.position
    ) {
      return false;
    }
    database.jobListingLexiconLinks.splice(existingIndex, 1, next);
    return true;
  }
  database.jobListingLexiconLinks.push(
    createFilemakerJobListingLexiconLink({
      id: buildJobListingLexiconLinkId(jobListingId, term.id),
      jobListingId,
      lexiconTermId: term.id,
      sourceSite: pill.sourceSite,
      sourceUrl: pill.sourceUrl,
      sourceValue: pill.label,
      typeKey,
      category: typeKey,
      position: pill.position,
    })
  );
  return true;
};

export const updateListingLexiconTermIds = (
  database: FilemakerDatabase,
  jobListingId: string,
  termIds: string[]
): boolean => {
  const index = database.jobListings.findIndex(
    (listing: FilemakerJobListing): boolean => listing.id === jobListingId
  );
  if (index < 0) return false;
  const listing = database.jobListings[index];
  if (listing === undefined) return false;
  const nextTermIds = uniqueStrings([...listing.lexiconTermIds, ...termIds]);
  if (nextTermIds.length === listing.lexiconTermIds.length) return false;
  database.jobListings.splice(
    index,
    1,
    createFilemakerJobListing({
      ...listing,
      lexiconTermIds: nextTermIds,
      updatedAt: new Date().toISOString(),
    })
  );
  return true;
};

export const applyOfferLexiconToListing = (
  database: FilemakerDatabase,
  listingId: string,
  offer: FilemakerJobBoardScrapedOffer
): OfferLexiconApplyResult => {
  const lexiconPills = offer.pills;
  if (lexiconPills.length === 0) {
    return { changed: false, createdTerms: 0, linkedTerms: 0 };
  }
  const termIds: string[] = [];
  let createdTerms = 0;
  let linkedTerms = 0;
  let changed = false;
  for (const pill of lexiconPills) {
    const termResult = upsertLexiconTerm(database, pill, offer.sourceSite);
    if (termResult.created) createdTerms += 1;
    if (termResult.updated) changed = true;
    termIds.push(termResult.term.id);
    if (ensureJobListingLexiconLink(database, listingId, termResult.term, pill)) {
      linkedTerms += 1;
      changed = true;
    }
  }
  if (updateListingLexiconTermIds(database, listingId, termIds)) {
    changed = true;
  }
  return { changed, createdTerms, linkedTerms };
};

export const upsertClassifiedPillsToLexicon = (
  database: FilemakerDatabase,
  pills: FilemakerJobBoardScrapedOffer['pills'],
  sourceProvider: string
): { changed: boolean; createdTerms: number } => {
  let changed = false;
  let createdTerms = 0;
  pills.forEach((pill) => {
    const result = upsertLexiconTerm(database, pill, sourceProvider);
    if (result.created) createdTerms += 1;
    if (result.updated) changed = true;
  });
  return { changed, createdTerms };
};
