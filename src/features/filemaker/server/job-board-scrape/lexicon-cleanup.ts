/* eslint-disable max-lines, max-lines-per-function */

import {
  createFilemakerJobListing,
  createFilemakerJobListingLexiconLink,
  createFilemakerLexiconTerm,
} from '../../filemaker-settings.entities';
import { normalizeFilemakerDatabase } from '../../filemaker-settings.database';
import type {
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerJobListingLexiconLink,
  FilemakerLexiconTerm,
  FilemakerLexiconTermCategory,
} from '../../types';
import {
  isProviderNoisePill,
  normalizeLexiconKey,
} from './lexicon-rules';
import { classifyFilemakerLexiconLabelWithPatterns } from './lexicon-validation-patterns';

type LexiconTermSample = {
  id: string;
  label: string;
  from?: FilemakerLexiconTermCategory;
  to?: FilemakerLexiconTermCategory;
};

export type FilemakerJobBoardLexiconRepairSummary = {
  beforeTermCount: number;
  afterTermCount: number;
  promotedTechnologyTerms: number;
  mergedTechnologyTerms: number;
  promotedRequirementTerms: number;
  mergedRequirementTerms: number;
  promotedValidationPatternTerms: number;
  mergedValidationPatternTerms: number;
  removedNoiseTerms: number;
  removedLexiconLinks: number;
  updatedLexiconLinks: number;
  updatedListings: number;
  promotedSamples: LexiconTermSample[];
  mergedSamples: LexiconTermSample[];
  removedSamples: LexiconTermSample[];
};

export type FilemakerJobBoardLexiconRepairResult = {
  changed: boolean;
  database: FilemakerDatabase;
  summary: FilemakerJobBoardLexiconRepairSummary;
};

const PRACUJ_LOCATION_NOISE_KEYS = new Set<string>([
  'dolnoslaskie',
  'dolnoslaskie province',
  'kujawsko pomorskie',
  'lodzkie',
  'lubelskie',
  'lubuskie',
  'lower silesia',
  'malopolskie',
  'mazowieckie',
  'opolskie',
  'podkarpackie',
  'podlaskie',
  'pomorskie',
  'silesia',
  'slaskie',
  'swietokrzyskie',
  'warminsko mazurskie',
  'wielkopolskie',
  'wojewodztwo dolnoslaskie',
  'wojewodztwo kujawsko pomorskie',
  'wojewodztwo lodzkie',
  'wojewodztwo lubelskie',
  'wojewodztwo lubuskie',
  'wojewodztwo malopolskie',
  'wojewodztwo mazowieckie',
  'wojewodztwo opolskie',
  'wojewodztwo podkarpackie',
  'wojewodztwo podlaskie',
  'wojewodztwo pomorskie',
  'wojewodztwo slaskie',
  'wojewodztwo swietokrzyskie',
  'wojewodztwo warminsko mazurskie',
  'wojewodztwo wielkopolskie',
  'wojewodztwo zachodniopomorskie',
  'zachodniopomorskie',
]);
const SCRAPED_JOB_BOARD_SOURCE_MARKERS = [
  'pracuj',
  'justjoin',
  'theprotocol',
  'nofluffjobs',
  'bulldogjob',
  'linkedin',
  'job',
];

const uniqueStrings = (values: readonly string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const sameStringList = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

const samplePush = (samples: LexiconTermSample[], sample: LexiconTermSample): void => {
  if (samples.length < 20) samples.push(sample);
};

const isOtherTerm = (term: FilemakerLexiconTerm): boolean =>
  term.typeKey === 'other' || term.category === 'other';

const isPracujSourceValue = (value: string | undefined): boolean =>
  normalizeLexiconKey(value ?? '').includes('pracuj');

const isScrapedJobBoardSourceValue = (value: string | undefined): boolean => {
  const normalized = normalizeLexiconKey(value ?? '');
  if (normalized.length === 0 || normalized === 'manual') return false;
  return SCRAPED_JOB_BOARD_SOURCE_MARKERS.some((marker): boolean =>
    normalized.includes(marker)
  );
};

const buildLinksByTermId = (
  links: readonly FilemakerJobListingLexiconLink[]
): Map<string, FilemakerJobListingLexiconLink[]> => {
  const byTermId = new Map<string, FilemakerJobListingLexiconLink[]>();
  links.forEach((link) => {
    const existing = byTermId.get(link.lexiconTermId) ?? [];
    existing.push(link);
    byTermId.set(link.lexiconTermId, existing);
  });
  return byTermId;
};

const hasPracujSource = (
  term: FilemakerLexiconTerm,
  links: readonly FilemakerJobListingLexiconLink[]
): boolean =>
  isPracujSourceValue(term.sourceProvider) ||
  isPracujSourceValue(term.sourceSite) ||
  links.some(
    (link) => isPracujSourceValue(link.sourceSite) || isPracujSourceValue(link.sourceUrl)
  );

const hasScrapedJobBoardSource = (
  term: FilemakerLexiconTerm,
  links: readonly FilemakerJobListingLexiconLink[]
): boolean =>
  isScrapedJobBoardSourceValue(term.sourceProvider) ||
  isScrapedJobBoardSourceValue(term.sourceSite) ||
  links.some(
    (link) =>
      isScrapedJobBoardSourceValue(link.sourceSite) ||
      isScrapedJobBoardSourceValue(link.sourceUrl)
  );

const isPracujLocationNoiseTerm = (
  term: FilemakerLexiconTerm,
  links: readonly FilemakerJobListingLexiconLink[]
): boolean =>
  isOtherTerm(term) &&
  PRACUJ_LOCATION_NOISE_KEYS.has(normalizeLexiconKey(term.label)) &&
  hasPracujSource(term, links);

const isPracujProviderNoiseTerm = (term: FilemakerLexiconTerm): boolean =>
  isOtherTerm(term) && isProviderNoisePill(term.label, 'pracuj_pl');

const firstIso = (values: readonly (string | null | undefined)[]): string | undefined => {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();
  return sorted[0];
};

const lastIso = (values: readonly (string | null | undefined)[]): string | undefined => {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();
  return sorted[sorted.length - 1];
};

const mergeTermStats = (
  target: FilemakerLexiconTerm,
  merged: FilemakerLexiconTerm[],
  now: string
): FilemakerLexiconTerm => {
  if (merged.length === 0) return target;
  return createFilemakerLexiconTerm({
    ...target,
    firstSeenAt: firstIso([target.firstSeenAt, ...merged.map((term) => term.firstSeenAt)]),
    lastSeenAt: lastIso([target.lastSeenAt, ...merged.map((term) => term.lastSeenAt)]),
    occurrenceCount:
      target.occurrenceCount +
      merged.reduce((total, term) => total + term.occurrenceCount, 0),
    updatedAt: now,
  });
};

const buildCategoryCanonicalIds = (
  terms: readonly FilemakerLexiconTerm[],
  removedTermIds: ReadonlySet<string>,
  category: FilemakerLexiconTermCategory
): Map<string, string> => {
  const canonicalIds = new Map<string, string>();
  terms.forEach((term) => {
    if (removedTermIds.has(term.id)) return;
    if (term.typeKey !== category) return;
    const key = normalizeLexiconKey(term.label);
    if (key.length === 0 || canonicalIds.has(key)) return;
    canonicalIds.set(key, term.id);
  });
  return canonicalIds;
};

const repairPromotionCategory = (
  term: FilemakerLexiconTerm,
  links: readonly FilemakerJobListingLexiconLink[],
  database: FilemakerDatabase
): FilemakerLexiconTermCategory | null => {
  if (!hasScrapedJobBoardSource(term, links)) return null;
  const classification = classifyFilemakerLexiconLabelWithPatterns(
    database.lexiconValidationPatterns,
    { label: term.label, sourceScope: 'unclassified' }
  );
  const typeKey = classification?.typeKey ?? null;
  return typeKey !== null && typeKey !== 'other' && typeKey !== term.typeKey ? typeKey : null;
};

const remapTermId = (
  termId: string,
  removedTermIds: ReadonlySet<string>,
  replacementTermIds: ReadonlyMap<string, string>
): string | null => {
  if (removedTermIds.has(termId)) return null;
  return replacementTermIds.get(termId) ?? termId;
};

const REPAIR_SUMMARY_CHANGE_KEYS: Array<keyof Pick<
  FilemakerJobBoardLexiconRepairSummary,
  | 'promotedTechnologyTerms'
  | 'mergedTechnologyTerms'
  | 'promotedRequirementTerms'
  | 'mergedRequirementTerms'
  | 'promotedValidationPatternTerms'
  | 'mergedValidationPatternTerms'
  | 'removedNoiseTerms'
  | 'removedLexiconLinks'
  | 'updatedLexiconLinks'
  | 'updatedListings'
>> = [
  'promotedTechnologyTerms',
  'mergedTechnologyTerms',
  'promotedRequirementTerms',
  'mergedRequirementTerms',
  'promotedValidationPatternTerms',
  'mergedValidationPatternTerms',
  'removedNoiseTerms',
  'removedLexiconLinks',
  'updatedLexiconLinks',
  'updatedListings',
];

const hasRepairSummaryChanges = (summary: FilemakerJobBoardLexiconRepairSummary): boolean =>
  REPAIR_SUMMARY_CHANGE_KEYS.some((key): boolean => summary[key] > 0);

export const repairFilemakerJobBoardLexicon = (
  database: FilemakerDatabase
): FilemakerJobBoardLexiconRepairResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const linksByTermId = buildLinksByTermId(normalizedDatabase.jobListingLexiconLinks);
  const now = new Date().toISOString();
  const summary: FilemakerJobBoardLexiconRepairSummary = {
    beforeTermCount: normalizedDatabase.lexiconTerms.length,
    afterTermCount: normalizedDatabase.lexiconTerms.length,
    promotedTechnologyTerms: 0,
    mergedTechnologyTerms: 0,
    promotedRequirementTerms: 0,
    mergedRequirementTerms: 0,
    promotedValidationPatternTerms: 0,
    mergedValidationPatternTerms: 0,
    removedNoiseTerms: 0,
    removedLexiconLinks: 0,
    updatedLexiconLinks: 0,
    updatedListings: 0,
    promotedSamples: [],
    mergedSamples: [],
    removedSamples: [],
  };

  const removedTermIds = new Set<string>();
  normalizedDatabase.lexiconTerms.forEach((term) => {
    const links = linksByTermId.get(term.id) ?? [];
    if (!isPracujProviderNoiseTerm(term) && !isPracujLocationNoiseTerm(term, links)) return;
    removedTermIds.add(term.id);
    summary.removedNoiseTerms += 1;
    samplePush(summary.removedSamples, {
      id: term.id,
      label: term.label,
      from: term.typeKey,
    });
  });

  const canonicalIdsByCategory = new Map<
    FilemakerLexiconTermCategory,
    Map<string, string>
  >();
  const canonicalIdsForCategory = (
    category: FilemakerLexiconTermCategory
  ): Map<string, string> => {
    const existing = canonicalIdsByCategory.get(category);
    if (existing !== undefined) return existing;
    const canonicalIds = buildCategoryCanonicalIds(
      normalizedDatabase.lexiconTerms,
      removedTermIds,
      category
    );
    canonicalIdsByCategory.set(category, canonicalIds);
    return canonicalIds;
  };
  const replacementTermIds = new Map<string, string>();
  const mergedTermsByTargetId = new Map<string, FilemakerLexiconTerm[]>();
  const nextTerms: FilemakerLexiconTerm[] = [];

  const incrementPromotionCounters = (
    promotedCategory: FilemakerLexiconTermCategory,
    mode: 'merged' | 'promoted'
  ): void => {
    if (mode === 'merged') {
      summary.mergedValidationPatternTerms += 1;
      if (promotedCategory === 'technology') summary.mergedTechnologyTerms += 1;
      if (promotedCategory === 'requirement') summary.mergedRequirementTerms += 1;
      return;
    }
    summary.promotedValidationPatternTerms += 1;
    if (promotedCategory === 'technology') summary.promotedTechnologyTerms += 1;
    if (promotedCategory === 'requirement') summary.promotedRequirementTerms += 1;
  };

  const processLexiconTerm = (term: FilemakerLexiconTerm): void => {
    if (removedTermIds.has(term.id)) return;
    const termKey = normalizeLexiconKey(term.label);
    const links = linksByTermId.get(term.id) ?? [];
    const promotedCategory = repairPromotionCategory(term, links, normalizedDatabase);
    if (promotedCategory === null) {
      nextTerms.push(term);
      return;
    }
    const canonicalIds = canonicalIdsForCategory(promotedCategory);
    const canonicalId = canonicalIds.get(termKey);
    if (canonicalId !== undefined && canonicalId !== term.id) {
      replacementTermIds.set(term.id, canonicalId);
      const merged = mergedTermsByTargetId.get(canonicalId) ?? [];
      merged.push(term);
      mergedTermsByTargetId.set(canonicalId, merged);
      incrementPromotionCounters(promotedCategory, 'merged');
      samplePush(summary.mergedSamples, {
        id: term.id,
        label: term.label,
        from: term.typeKey,
        to: promotedCategory,
      });
      return;
    }
    canonicalIds.set(termKey, term.id);
    incrementPromotionCounters(promotedCategory, 'promoted');
    samplePush(summary.promotedSamples, {
      id: term.id,
      label: term.label,
      from: term.typeKey,
      to: promotedCategory,
    });
    nextTerms.push(
      createFilemakerLexiconTerm({
        ...term,
        normalizedLabel: termKey,
        typeKey: promotedCategory,
        category: promotedCategory,
        updatedAt: now,
      })
    );
  };

  normalizedDatabase.lexiconTerms.forEach(processLexiconTerm);

  const mergedTerms = nextTerms.map((term) =>
    mergeTermStats(term, mergedTermsByTargetId.get(term.id) ?? [], now)
  );
  const termTypeById = new Map(
    mergedTerms.map((term): [string, FilemakerLexiconTermCategory] => [term.id, term.typeKey])
  );
  const seenLinkRelations = new Set<string>();
  const nextLinks: FilemakerJobListingLexiconLink[] = [];

  normalizedDatabase.jobListingLexiconLinks.forEach((link) => {
    const nextTermId = remapTermId(link.lexiconTermId, removedTermIds, replacementTermIds);
    if (nextTermId === null) {
      summary.removedLexiconLinks += 1;
      return;
    }
    const relationKey = `${link.jobListingId}:${nextTermId}`;
    if (seenLinkRelations.has(relationKey)) {
      summary.removedLexiconLinks += 1;
      return;
    }
    seenLinkRelations.add(relationKey);

    const nextTypeKey = termTypeById.get(nextTermId) ?? link.typeKey;
    const changed =
      nextTermId !== link.lexiconTermId ||
      nextTypeKey !== link.typeKey ||
      nextTypeKey !== link.category;
    if (changed) summary.updatedLexiconLinks += 1;
    nextLinks.push(
      createFilemakerJobListingLexiconLink({
        ...link,
        lexiconTermId: nextTermId,
        typeKey: nextTypeKey,
        category: nextTypeKey,
        updatedAt: changed ? now : link.updatedAt,
      })
    );
  });

  const existingTermIds = new Set(mergedTerms.map((term) => term.id));
  const nextListings = normalizedDatabase.jobListings.map((listing): FilemakerJobListing => {
    const nextLexiconTermIds = uniqueStrings(
      listing.lexiconTermIds
        .map((termId) => remapTermId(termId, removedTermIds, replacementTermIds))
        .filter((termId): termId is string => termId !== null && existingTermIds.has(termId))
    );
    if (sameStringList(listing.lexiconTermIds, nextLexiconTermIds)) return listing;
    summary.updatedListings += 1;
    return createFilemakerJobListing({
      ...listing,
      lexiconTermIds: nextLexiconTermIds,
      updatedAt: now,
    });
  });

  summary.afterTermCount = mergedTerms.length;
  const nextDatabase = normalizeFilemakerDatabase({
    ...normalizedDatabase,
    lexiconTerms: mergedTerms,
    jobListingLexiconLinks: nextLinks,
    jobListings: nextListings,
  });
  const changed = hasRepairSummaryChanges(summary);

  return { changed, database: nextDatabase, summary };
};
