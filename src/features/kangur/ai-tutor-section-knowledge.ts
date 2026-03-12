import type { KangurTutorAnchorKind } from '@/features/kangur/ui/context/kangur-tutor-types';
import type { KangurAiTutorKnowledgeReference } from '@/shared/contracts/kangur-ai-tutor';

import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
  type KangurAiTutorPageCoverageEntry,
} from './ai-tutor-page-coverage-manifest';

// Scoring weights for section knowledge resolution.
// Higher = stronger signal. Anchor matches take priority over content ID matches.
const SCORE_ANCHOR_STARTS_WITH_PREFIX = 600; // anchorId starts with section's anchorIdPrefix
const SCORE_PREFIX_STARTS_WITH_ANCHOR = 450; // section's anchorIdPrefix starts with anchorId (partial)
const SCORE_EXACT_CONTENT_ID = 400;          // contentId exactly matches a contentIdPrefix
const SCORE_CONTENT_ID_PREFIX = 200;         // contentId starts with a contentIdPrefix

const resolveContentPrefixScore = (
  entry: KangurAiTutorPageCoverageEntry,
  contentId: string | null | undefined
): number => {
  if (!contentId) {
    return 0;
  }

  let bestScore = 0;
  for (const prefix of entry.contentIdPrefixes) {
    if (contentId === prefix) {
      bestScore = Math.max(bestScore, SCORE_EXACT_CONTENT_ID + prefix.length);
      continue;
    }

    if (contentId.startsWith(prefix)) {
      bestScore = Math.max(bestScore, SCORE_CONTENT_ID_PREFIX + prefix.length);
    }
  }

  return bestScore;
};

const scoreCoverageEntry = (input: {
  anchorId: string;
  contentId: string | null | undefined;
  focusKind: KangurTutorAnchorKind;
  section: KangurAiTutorPageCoverageEntry;
}): number | null => {
  const { anchorId, contentId, focusKind, section } = input;
  if (section.focusKind !== focusKind) {
    return null;
  }

  const anchorPrefixScore = section.anchorIdPrefix
    ? anchorId.startsWith(section.anchorIdPrefix)
      ? SCORE_ANCHOR_STARTS_WITH_PREFIX + section.anchorIdPrefix.length
      : section.anchorIdPrefix.startsWith(anchorId)
        ? SCORE_PREFIX_STARTS_WITH_ANCHOR + anchorId.length
        : 0
    : 0;
  const contentPrefixScore = resolveContentPrefixScore(section, contentId);
  if (contentId && section.contentIdPrefixes.length > 0 && contentPrefixScore === 0) {
    return null;
  }

  if (anchorPrefixScore === 0 && contentPrefixScore === 0) {
    return null;
  }

  return anchorPrefixScore + contentPrefixScore;
};

export const resolveKangurTutorSectionKnowledgeReference = (input: {
  anchorId: string;
  contentId?: string | null;
  focusKind: KangurTutorAnchorKind;
}): KangurAiTutorKnowledgeReference | null => {
  const rankedSection = KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map((section) => ({
    score:
      scoreCoverageEntry({
        anchorId: input.anchorId,
        contentId: input.contentId,
        focusKind: input.focusKind,
        section,
      }) ?? -1,
    section,
  }))
    .filter((candidate) => candidate.score >= 0)
    .sort((left, right) => right.score - left.score)[0]?.section;

  const sourceRecordId = rankedSection?.id.trim() ?? null;
  if (!sourceRecordId) {
    return null;
  }

  return {
    sourceCollection: 'kangur_page_content',
    sourceRecordId,
    sourcePath: `entry:${sourceRecordId}`,
  };
};
