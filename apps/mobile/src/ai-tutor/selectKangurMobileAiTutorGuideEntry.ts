import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorNativeGuideEntry } from '../../../../src/shared/contracts/kangur-ai-tutor-native-guide';

type KangurMobileAiTutorGuideMatchSignal =
  | 'content_id_exact'
  | 'content_id_prefix'
  | 'focus_id_exact'
  | 'focus_id_prefix'
  | 'focus_kind'
  | 'focus_label_trigger'
  | 'surface'
  | 'title_trigger';

type RankedGuideEntry = {
  entry: KangurAiTutorNativeGuideEntry;
  matchedSignals: KangurMobileAiTutorGuideMatchSignal[];
  score: number;
};

const normalizeMessage = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const matchesTriggerPhrases = (
  entry: KangurAiTutorNativeGuideEntry,
  value: string | null | undefined,
): boolean => {
  const normalized = normalizeMessage(value);
  if (!normalized) {
    return false;
  }

  return entry.triggerPhrases.some((phrase) =>
    normalized.includes(normalizeMessage(phrase)),
  );
};

const matchLookupPrefixes = (
  prefixes: string[],
  value: string | null | undefined,
  options: {
    exact: number;
    exactSignal: KangurMobileAiTutorGuideMatchSignal;
    prefix: number;
    prefixSignal: KangurMobileAiTutorGuideMatchSignal;
  },
): { score: number; signal: KangurMobileAiTutorGuideMatchSignal | null } => {
  const normalizedValue = normalizeMessage(value);
  if (!normalizedValue) {
    return { score: 0, signal: null };
  }

  let score = 0;
  let signal: KangurMobileAiTutorGuideMatchSignal | null = null;
  for (const prefix of prefixes) {
    const normalizedPrefix = normalizeMessage(prefix);
    if (!normalizedPrefix) {
      continue;
    }

    if (normalizedValue === normalizedPrefix) {
      if (options.exact > score) {
        score = options.exact;
        signal = options.exactSignal;
      }
      continue;
    }

    if (normalizedValue.startsWith(normalizedPrefix) && options.prefix > score) {
      score = options.prefix;
      signal = options.prefixSignal;
    }
  }

  return { score, signal };
};

const rankGuideEntry = (
  entry: KangurAiTutorNativeGuideEntry,
  context: KangurAiTutorConversationContext | undefined,
): RankedGuideEntry => {
  let score = 0;
  const matchedSignals: KangurMobileAiTutorGuideMatchSignal[] = [];

  if (entry.surface && entry.surface === context?.surface) {
    score += 40;
    matchedSignals.push('surface');
  } else if (entry.surface === null) {
    score += 10;
  }

  if (entry.focusKind && entry.focusKind === context?.focusKind) {
    score += 60;
    matchedSignals.push('focus_kind');
  } else if (entry.focusKind === null) {
    score += 5;
  }

  const focusIdMatch = matchLookupPrefixes(entry.focusIdPrefixes, context?.focusId, {
    exact: 80,
    exactSignal: 'focus_id_exact',
    prefix: 45,
    prefixSignal: 'focus_id_prefix',
  });
  score += focusIdMatch.score;
  if (focusIdMatch.signal) {
    matchedSignals.push(focusIdMatch.signal);
  }

  const contentIdMatch = matchLookupPrefixes(entry.contentIdPrefixes, context?.contentId, {
    exact: 70,
    exactSignal: 'content_id_exact',
    prefix: 35,
    prefixSignal: 'content_id_prefix',
  });
  score += contentIdMatch.score;
  if (contentIdMatch.signal) {
    matchedSignals.push(contentIdMatch.signal);
  }

  if (matchesTriggerPhrases(entry, context?.focusLabel)) {
    score += 15;
    matchedSignals.push('focus_label_trigger');
  }

  if (matchesTriggerPhrases(entry, context?.title)) {
    score += 18;
    matchedSignals.push('title_trigger');
  }

  return {
    entry,
    matchedSignals,
    score,
  };
};

export const selectKangurMobileAiTutorGuideEntry = (
  entries: KangurAiTutorNativeGuideEntry[],
  context: KangurAiTutorConversationContext | undefined,
): KangurAiTutorNativeGuideEntry | null => {
  const rankedEntries = entries
    .filter((entry) => entry.enabled)
    .map((entry) => rankGuideEntry(entry, context))
    .filter(({ entry, score }) => {
      if (score > 0) {
        return true;
      }

      if (entry.focusKind && entry.focusKind === context?.focusKind) {
        return true;
      }

      return entry.focusKind === null && entry.surface === context?.surface;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.entry.sortOrder - right.entry.sortOrder;
    });

  return rankedEntries[0]?.entry ?? null;
};
