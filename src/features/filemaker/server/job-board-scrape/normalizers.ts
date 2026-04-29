import 'server-only';
/* eslint-disable max-lines */

import type {
  FilemakerLexiconTermCategory,
  FilemakerLexiconValidationPattern,
  FilemakerLexiconValidationPatternSourceScope,
} from '@/shared/contracts/filemaker';
import type { JobBoardStructuredSnapshot } from '@/features/job-board/server/providers/job-board-sync';
import type { JobBoardProvider } from '@/shared/lib/job-board/job-board-providers';

import type {
  FilemakerJobBoardScrapedOffer,
  FilemakerJobBoardUnclassifiedPill,
} from '../../filemaker-job-board-scrape-contracts';
import {
  isProviderNoisePill,
  normalizeLexiconKey,
  normalizeLexiconLabel,
} from './lexicon-rules';
import {
  classifyFilemakerLexiconLabelWithPatterns,
  filemakerLexiconValidationPatternSourceMatches,
  resolveFilemakerLexiconValidationPatterns,
} from './lexicon-validation-patterns';

export {
  looksLikeAddressPill,
  normalizeLexiconKey,
  normalizeLexiconLabel,
} from './lexicon-rules';

type LexiconPillCandidate = {
  category: FilemakerLexiconTermCategory;
  label: string;
};

export const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const toStringValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const toNullableString = (value: unknown): string | null => {
  const normalized = toStringValue(value);
  return normalized.length > 0 ? normalized : null;
};

export const toNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const normalizeSalaryPeriod = (
  value: unknown
): FilemakerJobBoardScrapedOffer['salaryPeriod'] => {
  const normalized = normalizeLexiconKey(toStringValue(value));
  if (/^(hour|hours|hourly|h|godz|godzina|godzinowo)$/.test(normalized)) return 'hourly';
  if (/^(year|years|yearly|annual|annually|rok|rocznie)$/.test(normalized)) return 'yearly';
  if (/^(fixed|one time|project|contract)$/.test(normalized)) return 'fixed';
  return 'monthly';
};

export const normalizeJobBoardSourceUrl = (value: unknown): string | null => {
  const raw = toStringValue(value);
  if (raw.length === 0) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

const benefitSplitLabelsFromPatterns = (
  label: string,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined,
  sourceScope: FilemakerLexiconValidationPatternSourceScope
): string[] => {
  const key = normalizeLexiconKey(label);
  const seen = new Set<string>();
  return resolveFilemakerLexiconValidationPatterns(validationPatterns)
    .filter(
      (pattern) =>
        pattern.targetTypeKey === 'benefit' &&
        (pattern.matchMode === 'contains' || pattern.matchMode === 'exact') &&
        filemakerLexiconValidationPatternSourceMatches(pattern, sourceScope)
    )
    .map((pattern) => normalizeLexiconLabel(pattern.pattern))
    .filter((patternLabel) => patternLabel.length > 0)
    .filter((patternLabel) => key.includes(normalizeLexiconKey(patternLabel)))
    .sort(
      (left, right) =>
        key.indexOf(normalizeLexiconKey(left)) - key.indexOf(normalizeLexiconKey(right))
    )
    .filter((patternLabel) => {
      const patternKey = normalizeLexiconKey(patternLabel);
      if (seen.has(patternKey)) return false;
      seen.add(patternKey);
      return true;
    });
};

const splitRawBenefitPillLabels = (
  label: string,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined,
  sourceScope: FilemakerLexiconValidationPatternSourceScope
): string[] => {
  const matches = benefitSplitLabelsFromPatterns(label, validationPatterns, sourceScope);
  return matches.length > 0 ? matches : [label];
};

const splitRawTechnologyPillLabelsWithPatterns = (
  label: string,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined,
  sourceScope: FilemakerLexiconValidationPatternSourceScope
): string[] => {
  const parts = label
    .split(/[,;|/]+/u)
    .map(normalizeLexiconLabel)
    .filter((part) => part.length > 0 && part.length <= 80);
  if (parts.length < 2) return [label];
  const allTechnology = parts.every(
    (part) =>
      classifyFilemakerLexiconLabelWithPatterns(validationPatterns, {
        label: part,
        sourceScope,
      })?.typeKey === 'technology'
  );
  return allTechnology ? parts : [label];
};

const shouldPreserveRawOfferPillLabel = (
  label: string,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): boolean =>
  classifyFilemakerLexiconLabelWithPatterns(validationPatterns, {
    label,
    sourceScope: 'snapshot_pill',
  })?.typeKey === 'other';

const splitRawOfferPillLabels = (
  label: string,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): string[] =>
  shouldPreserveRawOfferPillLabel(label, validationPatterns)
    ? [label]
    : splitRawTechnologyPillLabelsWithPatterns(
        label,
        validationPatterns,
        'snapshot_pill'
      ).flatMap((part) =>
        splitRawBenefitPillLabels(part, validationPatterns, 'snapshot_pill')
      );

const resolveCandidateCategory = (
  category: FilemakerLexiconTermCategory,
  label: string,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined,
  sourceScope: FilemakerLexiconValidationPatternSourceScope
): FilemakerLexiconTermCategory => {
  const patternClassification = classifyFilemakerLexiconLabelWithPatterns(
    validationPatterns,
    { label, sourceScope }
  );
  if (patternClassification !== null) return patternClassification.typeKey;
  return category;
};

/* eslint-disable max-params */
export const classifyOfferPill = (
  label: string,
  position: number,
  provider: JobBoardProvider,
  validationPatterns?: readonly FilemakerLexiconValidationPattern[] | null,
  sourceScope: FilemakerLexiconValidationPatternSourceScope = 'snapshot_pill'
): FilemakerLexiconTermCategory => {
  void position;
  void provider;
  const patternClassification = classifyFilemakerLexiconLabelWithPatterns(
    validationPatterns,
    { label, sourceScope }
  );
  if (patternClassification !== null) return patternClassification.typeKey;
  return 'other';
};
/* eslint-enable max-params */

export const snapshotPillValues = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] => {
  const values = snapshot?.pills ?? [];
  return uniqueStrings(values.map(normalizeLexiconLabel)).slice(0, 48);
};

const normalizeSnapshotFactPillLabel = (value: string): string => {
  const normalized = normalizeLexiconLabel(value.replace(/_/g, ' '));
  const key = normalizeLexiconKey(normalized);
  if (key === 'full time') return 'full-time';
  if (key === 'part time') return 'part-time';
  if (key === 'b2b') return 'B2B contract';
  return /^[A-Z0-9_ -]+$/.test(normalized) ? normalized.toLowerCase() : normalized;
};

const categoryForSnapshotFactLabel = (
  label: string,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): FilemakerLexiconTermCategory | null => {
  const patternClassification = classifyFilemakerLexiconLabelWithPatterns(
    validationPatterns,
    { label, sourceScope: 'snapshot_fact' }
  );
  return patternClassification?.typeKey ?? null;
};

const snapshotFactPillCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): LexiconPillCandidate[] => {
  const facts = [...(snapshot?.facts ?? []), ...(snapshot?.companyProfile?.facts ?? [])];
  return facts.flatMap((fact) => {
    const category = categoryForSnapshotFactLabel(fact.label, validationPatterns);
    if (category === null) return [];
    return normalizeLexiconLabel(fact.value)
      .split(/[,;|]/)
      .map(normalizeSnapshotFactPillLabel)
      .filter((label) => label.length > 0 && label.length <= 120)
      .map((label) => ({
        category: resolveCandidateCategory(
          category,
          label,
          validationPatterns,
          'snapshot_fact'
        ),
        label,
      }));
  });
};

const categoryForSectionHeading = (
  heading: string | null | undefined,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): FilemakerLexiconTermCategory | null => {
  const label = normalizeLexiconLabel(heading ?? '');
  if (label.length === 0) return null;
  const patternClassification = classifyFilemakerLexiconLabelWithPatterns(
    validationPatterns,
    { label, sourceScope: 'section_heading' }
  );
  return patternClassification?.typeKey ?? null;
};

const normalizeSectionPillLabel = (value: string): string =>
  normalizeLexiconLabel(
    value
      .replace(/^[-*•●▪–—]\s*/u, '')
      .replace(/^\d+[.)]\s*/u, '')
      .replace(/\s+[;,.]$/u, '')
  );

const maxSectionPillLabelLength = (category: FilemakerLexiconTermCategory): number => {
  if (category === 'requirement' || category === 'responsibility') return 500;
  if (category === 'company_attribute') return 300;
  return 140;
};

const sectionTermLabels = (text: string, category: FilemakerLexiconTermCategory): string[] => {
  const normalized = text.replace(/\u00a0/g, ' ');
  const separators = category === 'technology' || category === 'benefit'
    ? /\n+|[•●▪]|;|\|/u
    : /\n+|[•●▪]/u;
  const maxLength = maxSectionPillLabelLength(category);
  return uniqueStrings(
    normalized
      .split(separators)
      .flatMap((part) =>
        category === 'technology'
          ? part.split(/,(?=\s*[A-Za-z0-9+#. -]{2,40}(?:,|$))/u)
          : [part]
      )
      .map(normalizeSectionPillLabel)
      .filter((label) => label.length >= 2 && label.length <= maxLength)
  ).slice(0, 24);
};

const snapshotSectionPillCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): LexiconPillCandidate[] =>
  (snapshot?.sections ?? []).flatMap((section) => {
    const category = categoryForSectionHeading(section.heading, validationPatterns);
    if (category === null) return [];
    return sectionTermLabels(section.text, category)
      .flatMap((label) =>
        category === 'benefit'
          ? splitRawBenefitPillLabels(label, validationPatterns, 'section_value')
          : [label]
      )
      .map((label) => ({
        category: resolveCandidateCategory(category, label, validationPatterns, 'section_value'),
        label,
      }));
  });

const pillKey = (category: FilemakerLexiconTermCategory, label: string): string =>
  `${category}:${normalizeLexiconKey(label)}`;

const unclassifiedPillKey = (label: string): string => normalizeLexiconKey(label);

export type ScrapedOfferLexiconExtraction = {
  pills: FilemakerJobBoardScrapedOffer['pills'];
  unclassifiedPills: FilemakerJobBoardUnclassifiedPill[];
};

// eslint-disable-next-line max-lines-per-function
export const buildScrapedOfferLexiconExtraction = (input: {
  provider: JobBoardProvider;
  snapshot: JobBoardStructuredSnapshot | null | undefined;
  sourceSite: string;
  sourceUrl: string;
  validationPatterns?: readonly FilemakerLexiconValidationPattern[] | null;
}): ScrapedOfferLexiconExtraction => {
  const seen = new Set<string>();
  const seenTypedLabels = new Set<string>();
  const seenUnclassified = new Set<string>();
  const snapshotPills = snapshotPillValues(input.snapshot)
    .flatMap((label) => splitRawOfferPillLabels(label, input.validationPatterns))
    .flatMap((label, index) => {
      if (isProviderNoisePill(label, input.provider)) return [];
      const category = classifyOfferPill(
        label,
        index,
        input.provider,
        input.validationPatterns,
        'snapshot_pill'
      );
      if (category === 'other' || category === 'address') return [];
      const key = pillKey(category, label);
      if (seen.has(key)) return [];
      seen.add(key);
      seenTypedLabels.add(unclassifiedPillKey(label));
      return [
        {
          category,
          typeKey: category,
          label,
          position: index,
          sourceSite: input.sourceSite,
          sourceUrl: input.sourceUrl,
        },
      ];
    });
  const unclassifiedPills = snapshotPillValues(input.snapshot)
    .flatMap((label) => splitRawOfferPillLabels(label, input.validationPatterns))
    .flatMap((label, index): FilemakerJobBoardUnclassifiedPill[] => {
      if (isProviderNoisePill(label, input.provider)) return [];
      const category = classifyOfferPill(
        label,
        index,
        input.provider,
        input.validationPatterns,
        'snapshot_pill'
      );
      if (category !== 'other') return [];
      const key = unclassifiedPillKey(label);
      if (key.length === 0 || seenUnclassified.has(key)) return [];
      seenUnclassified.add(key);
      return [
        {
          label,
          position: index,
          reason: 'unclassified',
          sourceSite: input.sourceSite,
          sourceUrl: input.sourceUrl,
        },
      ];
    });
  const typedCandidates = [
    ...snapshotFactPillCandidates(input.snapshot, input.validationPatterns),
    ...snapshotSectionPillCandidates(input.snapshot, input.validationPatterns),
  ];
  const factPills = typedCandidates.flatMap((candidate, index) => {
    if (candidate.category === 'address' || candidate.category === 'other') return [];
    const key = pillKey(candidate.category, candidate.label);
    if (seen.has(key)) return [];
    seen.add(key);
    seenTypedLabels.add(unclassifiedPillKey(candidate.label));
    return [
      {
        category: candidate.category,
        typeKey: candidate.category,
        label: candidate.label,
        position: snapshotPills.length + index,
        sourceSite: input.sourceSite,
        sourceUrl: input.sourceUrl,
      },
    ];
  });
  const pills = [...snapshotPills, ...factPills].slice(0, 100);
  return {
    pills,
    unclassifiedPills: unclassifiedPills
      .filter((pill) => !seenTypedLabels.has(unclassifiedPillKey(pill.label)))
      .slice(0, 100),
  };
};

export const buildScrapedOfferPills = (input: {
  provider: JobBoardProvider;
  snapshot: JobBoardStructuredSnapshot | null | undefined;
  sourceSite: string;
  sourceUrl: string;
  validationPatterns?: readonly FilemakerLexiconValidationPattern[] | null;
}): FilemakerJobBoardScrapedOffer['pills'] =>
  buildScrapedOfferLexiconExtraction(input).pills;

export const clipProfileText = (value: string, max = 8_000): string =>
  value.length > max ? `${value.slice(0, Math.max(0, max - 3))}...` : value;

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

export const recordString = (record: Record<string, unknown> | null, key: string): string =>
  toStringValue(record?.[key]);

export const recordNullableString = (
  record: Record<string, unknown> | null,
  key: string
): string | null => toNullableString(record?.[key]);
