import 'server-only';

import type { FilemakerLexiconValidationPattern } from '@/shared/contracts/filemaker';
import type { JobBoardStructuredSnapshot } from '@/features/job-board/server/providers/job-board-sync';
import type { JobBoardProvider } from '@/shared/lib/job-board/job-board-providers';

import type {
  FilemakerJobBoardScrapedOffer,
  FilemakerJobBoardUnclassifiedPill,
} from '../../filemaker-job-board-scrape-contracts';
import { isProviderNoisePill } from './lexicon-rules';
import {
  classifyOfferPill,
  pillKey,
  snapshotFactPillCandidates,
  snapshotPillValues,
  snapshotSectionPillCandidates,
  splitRawOfferPillLabels,
  unclassifiedPillKey,
  type LexiconPillCandidate,
} from './normalizers.lexicon-candidates';

export { classifyOfferPill, snapshotPillValues } from './normalizers.lexicon-candidates';

export type ScrapedOfferLexiconExtraction = {
  pills: FilemakerJobBoardScrapedOffer['pills'];
  unclassifiedPills: FilemakerJobBoardUnclassifiedPill[];
};

type BuildLexiconInput = {
  provider: JobBoardProvider;
  snapshot: JobBoardStructuredSnapshot | null | undefined;
  sourceSite: string;
  sourceUrl: string;
  validationPatterns?: readonly FilemakerLexiconValidationPattern[] | null;
};

type ScrapedOfferPill = FilemakerJobBoardScrapedOffer['pills'][number];

type LexiconExtractionState = {
  seen: Set<string>;
  seenTypedLabels: Set<string>;
  seenUnclassified: Set<string>;
};

const createLexiconExtractionState = (): LexiconExtractionState => ({
  seen: new Set<string>(),
  seenTypedLabels: new Set<string>(),
  seenUnclassified: new Set<string>(),
});

const expandedSnapshotPillLabels = (input: BuildLexiconInput): string[] =>
  snapshotPillValues(input.snapshot).flatMap((label) =>
    splitRawOfferPillLabels(label, input.validationPatterns)
  );

const toScrapedPill = (input: {
  category: ScrapedOfferPill['category'];
  label: string;
  position: number;
  sourceSite: string;
  sourceUrl: string;
}): ScrapedOfferPill => ({
  category: input.category,
  typeKey: input.category,
  label: input.label,
  position: input.position,
  sourceSite: input.sourceSite,
  sourceUrl: input.sourceUrl,
});

const buildSnapshotPills = (
  input: BuildLexiconInput,
  state: LexiconExtractionState
): ScrapedOfferPill[] =>
  expandedSnapshotPillLabels(input).flatMap((label, index) => {
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
    if (state.seen.has(key)) return [];
    state.seen.add(key);
    state.seenTypedLabels.add(unclassifiedPillKey(label));
    return [
      toScrapedPill({
        category,
        label,
        position: index,
        sourceSite: input.sourceSite,
        sourceUrl: input.sourceUrl,
      }),
    ];
  });

const buildUnclassifiedPills = (
  input: BuildLexiconInput,
  state: LexiconExtractionState
): FilemakerJobBoardUnclassifiedPill[] =>
  expandedSnapshotPillLabels(input).flatMap((label, index): FilemakerJobBoardUnclassifiedPill[] => {
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
    if (key.length === 0 || state.seenUnclassified.has(key)) return [];
    state.seenUnclassified.add(key);
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

const buildTypedCandidatePills = (
  input: BuildLexiconInput,
  snapshotPillCount: number,
  state: LexiconExtractionState
): ScrapedOfferPill[] => {
  const typedCandidates: LexiconPillCandidate[] = [
    ...snapshotFactPillCandidates(input.snapshot, input.validationPatterns),
    ...snapshotSectionPillCandidates(input.snapshot, input.validationPatterns),
  ];
  return typedCandidates.flatMap((candidate, index) => {
    if (candidate.category === 'address' || candidate.category === 'other') return [];
    const key = pillKey(candidate.category, candidate.label);
    if (state.seen.has(key)) return [];
    state.seen.add(key);
    state.seenTypedLabels.add(unclassifiedPillKey(candidate.label));
    return [
      toScrapedPill({
        category: candidate.category,
        label: candidate.label,
        position: snapshotPillCount + index,
        sourceSite: input.sourceSite,
        sourceUrl: input.sourceUrl,
      }),
    ];
  });
};

const removeTypedUnclassifiedPills = (
  pills: FilemakerJobBoardUnclassifiedPill[],
  state: LexiconExtractionState
): FilemakerJobBoardUnclassifiedPill[] =>
  pills.filter((pill) => !state.seenTypedLabels.has(unclassifiedPillKey(pill.label)));

export const buildScrapedOfferLexiconExtraction = (
  input: BuildLexiconInput
): ScrapedOfferLexiconExtraction => {
  const state = createLexiconExtractionState();
  const snapshotPills = buildSnapshotPills(input, state);
  const unclassifiedPills = buildUnclassifiedPills(input, state);
  const factPills = buildTypedCandidatePills(input, snapshotPills.length, state);
  return {
    pills: [...snapshotPills, ...factPills].slice(0, 100),
    unclassifiedPills: removeTypedUnclassifiedPills(unclassifiedPills, state).slice(0, 100),
  };
};

export const buildScrapedOfferPills = (
  input: BuildLexiconInput
): FilemakerJobBoardScrapedOffer['pills'] =>
  buildScrapedOfferLexiconExtraction(input).pills;
