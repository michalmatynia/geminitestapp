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
  if (normalized.length === 0) {
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
  if (normalizedValue.length === 0) {
    return { score: 0, signal: null };
  }

  let score = 0;
  let signal: KangurMobileAiTutorGuideMatchSignal | null = null;
  for (const prefix of prefixes) {
    const normalizedPrefix = normalizeMessage(prefix);
    if (normalizedPrefix.length === 0) {
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

const rankSurface = (
  entry: KangurAiTutorNativeGuideEntry,
  context: KangurAiTutorConversationContext | undefined,
): { score: number; signal: KangurMobileAiTutorGuideMatchSignal | null } => {
  if (entry.surface !== null && entry.surface === context?.surface) {
    return { score: 40, signal: 'surface' };
  }
  if (entry.surface === null) {
    return { score: 10, signal: null };
  }
  return { score: 0, signal: null };
};

const rankFocusKind = (
  entry: KangurAiTutorNativeGuideEntry,
  context: KangurAiTutorConversationContext | undefined,
): { score: number; signal: KangurMobileAiTutorGuideMatchSignal | null } => {
  if (entry.focusKind !== null && entry.focusKind === context?.focusKind) {
    return { score: 60, signal: 'focus_kind' };
  }
  if (entry.focusKind === null) {
    return { score: 5, signal: null };
  }
  return { score: 0, signal: null };
};

const rankGuideEntry = (
  entry: KangurAiTutorNativeGuideEntry,
  context: KangurAiTutorConversationContext | undefined,
): RankedGuideEntry => {
  if (context === undefined) {
    return { entry, matchedSignals: [], score: 0 };
  }

  let score = 0;
  const matchedSignals: KangurMobileAiTutorGuideMatchSignal[] = [];

  const surfaceRank = rankSurface(entry, context);
  score += surfaceRank.score;
  if (surfaceRank.signal !== null) {
    matchedSignals.push(surfaceRank.signal);
  }

  const focusKindRank = rankFocusKind(entry, context);
  score += focusKindRank.score;
  if (focusKindRank.signal !== null) {
    matchedSignals.push(focusKindRank.signal);
  }

  const focusIdMatch = matchLookupPrefixes(entry.focusIdPrefixes, context.focusId, {
    exact: 80,
    exactSignal: 'focus_id_exact',
    prefix: 45,
    prefixSignal: 'focus_id_prefix',
  });
  score += focusIdMatch.score;
  if (focusIdMatch.signal !== null) {
    matchedSignals.push(focusIdMatch.signal);
  }

  const contentIdMatch = matchLookupPrefixes(entry.contentIdPrefixes, context.contentId, {
    exact: 70,
    exactSignal: 'content_id_exact',
    prefix: 35,
    prefixSignal: 'content_id_prefix',
  });
  score += contentIdMatch.score;
  if (contentIdMatch.signal !== null) {
    matchedSignals.push(contentIdMatch.signal);
  }

  if (matchesTriggerPhrases(entry, context.focusLabel)) {
    score += 15;
    matchedSignals.push('focus_label_trigger');
  }

  if (matchesTriggerPhrases(entry, context.title)) {
    score += 18;
    matchedSignals.push('title_trigger');
  }

  return { entry, matchedSignals, score };
};

const isFocusMatch = (
  entry: KangurAiTutorNativeGuideEntry,
  context: KangurAiTutorConversationContext | undefined,
): boolean => {
  if (entry.focusKind !== null && entry.focusKind === context?.focusKind) return true;
  return entry.focusKind === null && entry.surface === context?.surface;
};

const isMatch = (
  ranked: RankedGuideEntry,
  context: KangurAiTutorConversationContext | undefined,
): boolean => {
  if (ranked.score > 0) return true;
  return isFocusMatch(ranked.entry, context);
};

export const selectKangurMobileAiTutorGuideEntry = (
  entries: KangurAiTutorNativeGuideEntry[],
  context: KangurAiTutorConversationContext | undefined,
): KangurAiTutorNativeGuideEntry | null => {
  const ranked = entries
    .filter((e) => e.enabled)
    .map((e) => rankGuideEntry(e, context))
    .filter((r) => isMatch(r, context));

  ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.entry.sortOrder - right.entry.sortOrder;
  });

  return ranked[0]?.entry ?? null;
};
