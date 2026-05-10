import { createFilemakerLexiconTerm } from '../../filemaker-settings.entities';
import type {
  FilemakerDatabase,
  FilemakerJobListingLexiconLink,
  FilemakerLexiconTerm,
  FilemakerLexiconTermCategory,
} from '../../types';
import type { FilemakerJobBoardLexiconRepairSummary, LexiconTermSample } from './lexicon-cleanup.types';
import {
  isProviderNoisePill,
  normalizeLexiconKey,
} from './lexicon-rules';
import { classifyFilemakerLexiconLabelWithPatterns } from './lexicon-validation-patterns';

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

export const uniqueStrings = (values: readonly string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const sameStringList = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

export const samplePush = (samples: LexiconTermSample[], sample: LexiconTermSample): void => {
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

export const buildLinksByTermId = (
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

export const isPracujLocationNoiseTerm = (
  term: FilemakerLexiconTerm,
  links: readonly FilemakerJobListingLexiconLink[]
): boolean =>
  isOtherTerm(term) &&
  PRACUJ_LOCATION_NOISE_KEYS.has(normalizeLexiconKey(term.label)) &&
  hasPracujSource(term, links);

export const isPracujProviderNoiseTerm = (term: FilemakerLexiconTerm): boolean =>
  isOtherTerm(term) && isProviderNoisePill(term.label, 'pracuj_pl');

const firstIso = (values: readonly (string | null | undefined)[]): string | undefined => {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();
  return sorted[0];
};

const lastIso = (values: readonly (string | null | undefined)[]): string | undefined => {
  const sorted = values.filter((value): value is string => Boolean(value)).sort();
  return sorted[sorted.length - 1];
};

export const mergeTermStats = (
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

export const buildCategoryCanonicalIds = (
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

export const repairPromotionCategory = (
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

export const remapTermId = (
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

export const hasRepairSummaryChanges = (
  summary: FilemakerJobBoardLexiconRepairSummary
): boolean => REPAIR_SUMMARY_CHANGE_KEYS.some((key): boolean => summary[key] > 0);
