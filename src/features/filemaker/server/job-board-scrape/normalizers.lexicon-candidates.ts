import 'server-only';

import type {
  FilemakerLexiconTermCategory,
  FilemakerLexiconValidationPattern,
  FilemakerLexiconValidationPatternSourceScope,
} from '@/shared/contracts/filemaker';
import type { JobBoardStructuredSnapshot } from '@/features/job-board/server/providers/job-board-sync';
import type { JobBoardProvider } from '@/shared/lib/job-board/job-board-providers';

import {
  normalizeLexiconKey,
  normalizeLexiconLabel,
} from './lexicon-rules';
import {
  classifyFilemakerLexiconLabelWithPatterns,
  filemakerLexiconValidationPatternSourceMatches,
  resolveFilemakerLexiconValidationPatterns,
} from './lexicon-validation-patterns';

export type LexiconPillCandidate = {
  category: FilemakerLexiconTermCategory;
  label: string;
};

const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

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

export const splitRawOfferPillLabels = (
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
  if (sourceScope === 'section_value') {
    return patternClassification?.typeKey === 'other' ? 'other' : category;
  }
  if (patternClassification !== null) return patternClassification.typeKey;
  return category;
};

export const classifyOfferPill = (
  ...args: [
    label: string,
    position: number,
    provider: JobBoardProvider,
    validationPatterns?: readonly FilemakerLexiconValidationPattern[] | null,
    sourceScope?: FilemakerLexiconValidationPatternSourceScope,
  ]
): FilemakerLexiconTermCategory => {
  const [label, , , validationPatterns, sourceScope = 'snapshot_pill'] = args;
  const patternClassification = classifyFilemakerLexiconLabelWithPatterns(
    validationPatterns,
    { label, sourceScope }
  );
  if (patternClassification !== null) return patternClassification.typeKey;
  return 'other';
};

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

export const snapshotFactPillCandidates = (
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

const sectionSeparators = (category: FilemakerLexiconTermCategory): RegExp =>
  category === 'technology' || category === 'benefit'
    ? /\n+|[•●▪]|;|\|/u
    : /\n+|[•●▪]/u;

const splitTechnologySectionPart = (
  part: string,
  category: FilemakerLexiconTermCategory
): string[] =>
  category === 'technology'
    ? part.split(/,(?=\s*[A-Za-z0-9+#. -]{2,40}(?:,|$))/u)
    : [part];

const sectionTermLabels = (text: string, category: FilemakerLexiconTermCategory): string[] => {
  const maxLength = maxSectionPillLabelLength(category);
  return uniqueStrings(
    text
      .replace(/\u00a0/g, ' ')
      .split(sectionSeparators(category))
      .flatMap((part) => splitTechnologySectionPart(part, category))
      .map(normalizeSectionPillLabel)
      .filter((label) => label.length >= 2 && label.length <= maxLength)
  ).slice(0, 24);
};

const splitSectionCandidateLabels = (
  label: string,
  category: FilemakerLexiconTermCategory,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): string[] =>
  category === 'benefit'
    ? splitRawBenefitPillLabels(label, validationPatterns, 'section_value')
    : [label];

export const snapshotSectionPillCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): LexiconPillCandidate[] =>
  (snapshot?.sections ?? []).flatMap((section) => {
    const category = categoryForSectionHeading(section.heading, validationPatterns);
    if (category === null) return [];
    return sectionTermLabels(section.text, category)
      .flatMap((label) => splitSectionCandidateLabels(label, category, validationPatterns))
      .map((label) => ({
        category: resolveCandidateCategory(category, label, validationPatterns, 'section_value'),
        label,
      }));
  });

export const pillKey = (category: FilemakerLexiconTermCategory, label: string): string =>
  `${category}:${normalizeLexiconKey(label)}`;

export const unclassifiedPillKey = (label: string): string => normalizeLexiconKey(label);
