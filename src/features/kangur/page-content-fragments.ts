import type { KangurAiTutorKnowledgeReference } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type {
  KangurPageContentEntry,
  KangurPageContentFragment,
} from '@/features/kangur/shared/contracts/kangur-page-content';

const FRAGMENT_SOURCE_PATH_PATTERN = /#fragment:([^#]+)$/u;

const normalizeFragmentText = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const scoreFragmentCandidateText = (
  normalizedSelection: string,
  normalizedCandidate: string
): number => {
  if (!normalizedSelection || !normalizedCandidate) {
    return 0;
  }

  if (normalizedSelection === normalizedCandidate) {
    return 1_000 + normalizedCandidate.length;
  }

  const allowContains = normalizedSelection.length >= 8 && normalizedCandidate.length >= 8;
  if (!allowContains) {
    return 0;
  }

  if (normalizedSelection.includes(normalizedCandidate)) {
    return 720 + normalizedCandidate.length;
  }

  if (normalizedCandidate.includes(normalizedSelection)) {
    return 680 + normalizedSelection.length;
  }

  return 0;
};

export const extractKangurPageContentFragmentId = (
  sourcePath: string | null | undefined
): string | null => sourcePath?.match(FRAGMENT_SOURCE_PATH_PATTERN)?.[1]?.trim() ?? null;

export const resolveExplicitKangurPageContentFragment = (input: {
  entry: KangurPageContentEntry;
  knowledgeReference?: KangurAiTutorKnowledgeReference | null;
}): KangurPageContentFragment | null => {
  if (input.knowledgeReference?.sourceCollection !== 'kangur_page_content') {
    return null;
  }

  const fragmentId = extractKangurPageContentFragmentId(input.knowledgeReference.sourcePath);
  if (!fragmentId) {
    return null;
  }

  return input.entry.fragments.find((fragment) => fragment.enabled && fragment.id === fragmentId) ?? null;
};

export const resolveKangurPageContentFragment = (input: {
  entry: KangurPageContentEntry;
  knowledgeReference?: KangurAiTutorKnowledgeReference | null;
  selectedText?: string | null;
}): KangurPageContentFragment | null => {
  const explicitFragment = resolveExplicitKangurPageContentFragment(input);
  if (explicitFragment) {
    return explicitFragment;
  }

  const normalizedSelection = normalizeFragmentText(input.selectedText);
  if (!normalizedSelection) {
    return null;
  }

  const rankedFragments = input.entry.fragments
    .filter((fragment) => fragment.enabled)
    .map((fragment) => {
      const scores = [
        scoreFragmentCandidateText(normalizedSelection, normalizeFragmentText(fragment.text)),
        ...fragment.aliases.map((alias) =>
          scoreFragmentCandidateText(normalizedSelection, normalizeFragmentText(alias))
        ),
      ];
      const score = Math.max(0, ...scores);
      return { fragment, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      if (left.fragment.sortOrder !== right.fragment.sortOrder) {
        return left.fragment.sortOrder - right.fragment.sortOrder;
      }
      return left.fragment.id.localeCompare(right.fragment.id);
    });

  const bestMatch = rankedFragments[0] ?? null;
  const secondBestMatch = rankedFragments[1] ?? null;
  if (!bestMatch) {
    return null;
  }

  if (secondBestMatch?.score === bestMatch.score) {
    return null;
  }

  return bestMatch.fragment;
};
