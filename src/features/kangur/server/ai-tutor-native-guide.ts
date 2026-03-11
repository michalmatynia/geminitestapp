import 'server-only';

import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFollowUpAction,
} from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';

import { getKangurAiTutorNativeGuideStore } from './ai-tutor-native-guide-repository';

const ALWAYS_NATIVE_EXPLAIN_FOCUS_KINDS = new Set([
  'home_actions',
  'home_quest',
  'priority_assignments',
  'leaderboard',
  'progress',
  'lesson_header',
  'assignment',
  'document',
  'question',
  'summary',
  'review',
]);

const PAGE_HELP_PATTERNS = [
  /co to jest/u,
  /co robi/u,
  /do czego sluzy/u,
  /jak dziala/u,
  /na czym polega/u,
  /co moge tutaj zrobic/u,
  /jak korzystac/u,
  /gdzie znajde/u,
  /opisz/u,
  /wyjasnij(?: mi)?(?: te| ten| ta)?(?: sekcj| ekran| panel| widok| test| gra| lekcj| pytan| zadani| podsumowani| omowieni)/u,
  /powiedz o/u,
];

const NON_NATIVE_PATTERNS = [
  /zaznaczon/u,
  /fragment/u,
  /krok po kroku/u,
  /rozwiaz/u,
  /odpowiedz/u,
  /wynik/u,
];

type KangurAiTutorNativeGuideResponse = {
  message: string;
  followUpActions: KangurAiTutorFollowUpAction[];
};

type KangurAiTutorNativeGuideMatchSignal =
  | 'surface'
  | 'focus_kind'
  | 'focus_id_exact'
  | 'focus_id_prefix'
  | 'content_id_exact'
  | 'content_id_prefix'
  | 'message_trigger'
  | 'focus_label_trigger'
  | 'title_trigger';

type RankedNativeGuideEntry = {
  entry: KangurAiTutorNativeGuideEntry;
  score: number;
  matchedSignals: KangurAiTutorNativeGuideMatchSignal[];
};

export type KangurAiTutorNativeGuideCoverageLevel = 'specific' | 'overview_fallback';

export type KangurAiTutorNativeGuideResolution =
  | {
    status: 'skipped';
    message: null;
    followUpActions: [];
    entryId: null;
    matchedSignals: [];
    coverageLevel: null;
  }
  | {
    status: 'miss';
    message: null;
    followUpActions: [];
    entryId: null;
    matchedSignals: [];
    coverageLevel: null;
  }
  | {
    status: 'hit';
    message: string;
    followUpActions: KangurAiTutorFollowUpAction[];
    entryId: string;
    matchedSignals: KangurAiTutorNativeGuideMatchSignal[];
    coverageLevel: KangurAiTutorNativeGuideCoverageLevel;
  };

const OVERVIEW_ENTRY_IDS = new Set(['lesson-overview', 'game-overview', 'test-overview']);

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
  value: string | null | undefined
): boolean => {
  const normalized = normalizeMessage(value);

  if (!normalized) {
    return false;
  }

  return entry.triggerPhrases.some((phrase) => normalized.includes(normalizeMessage(phrase)));
};

const matchLookupPrefixes = (
  prefixes: string[],
  value: string | null | undefined,
  options: {
    exact: number;
    prefix: number;
    exactSignal: KangurAiTutorNativeGuideMatchSignal;
    prefixSignal: KangurAiTutorNativeGuideMatchSignal;
  }
): { score: number; signal: KangurAiTutorNativeGuideMatchSignal | null } => {
  const normalizedValue = normalizeMessage(value);

  if (!normalizedValue) {
    return { score: 0, signal: null };
  }

  let score = 0;
  let signal: KangurAiTutorNativeGuideMatchSignal | null = null;
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
    if (normalizedValue.startsWith(normalizedPrefix)) {
      if (options.prefix > score) {
        score = options.prefix;
        signal = options.prefixSignal;
      }
    }
  }

  return { score, signal };
};

const shouldUseNativeGuide = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): boolean => {
  const normalized = normalizeMessage(input.latestUserMessage);
  const focusKind = input.context?.focusKind ?? null;

  if (
    input.context?.promptMode === 'explain' &&
    focusKind &&
    ALWAYS_NATIVE_EXPLAIN_FOCUS_KINDS.has(focusKind)
  ) {
    return true;
  }

  if (!normalized) {
    return false;
  }

  if (
    NON_NATIVE_PATTERNS.some((pattern) => pattern.test(normalized)) &&
    (Boolean(input.context?.selectedText?.trim()) || Boolean(input.context?.currentQuestion?.trim()))
  ) {
    return false;
  }

  return PAGE_HELP_PATTERNS.some((pattern) => pattern.test(normalized));
};

const analyzeEntryMatch = (
  entry: KangurAiTutorNativeGuideEntry,
  input: {
    normalizedMessage: string;
    context: KangurAiTutorConversationContext | undefined;
  }
): RankedNativeGuideEntry => {
  let score = 0;
  const matchedSignals: KangurAiTutorNativeGuideMatchSignal[] = [];

  if (entry.surface && entry.surface === input.context?.surface) {
    score += 40;
    matchedSignals.push('surface');
  } else if (entry.surface === null) {
    score += 10;
  }

  if (entry.focusKind && entry.focusKind === input.context?.focusKind) {
    score += 60;
    matchedSignals.push('focus_kind');
  } else if (entry.focusKind === null) {
    score += 5;
  }

  const focusIdMatch = matchLookupPrefixes(entry.focusIdPrefixes, input.context?.focusId, {
    exact: 80,
    prefix: 45,
    exactSignal: 'focus_id_exact',
    prefixSignal: 'focus_id_prefix',
  });
  score += focusIdMatch.score;
  if (focusIdMatch.signal) {
    matchedSignals.push(focusIdMatch.signal);
  }

  const contentIdMatch = matchLookupPrefixes(entry.contentIdPrefixes, input.context?.contentId, {
    exact: 70,
    prefix: 35,
    exactSignal: 'content_id_exact',
    prefixSignal: 'content_id_prefix',
  });
  score += contentIdMatch.score;
  if (contentIdMatch.signal) {
    matchedSignals.push(contentIdMatch.signal);
  }

  if (
    matchesTriggerPhrases(entry, input.normalizedMessage)
  ) {
    score += 30;
    matchedSignals.push('message_trigger');
  }

  if (matchesTriggerPhrases(entry, input.context?.focusLabel)) {
    score += 15;
    matchedSignals.push('focus_label_trigger');
  }

  if (matchesTriggerPhrases(entry, input.context?.title)) {
    score += 18;
    matchedSignals.push('title_trigger');
  }

  return {
    entry,
    score,
    matchedSignals,
  };
};

const selectGuideEntry = (
  entries: KangurAiTutorNativeGuideEntry[],
  input: {
    latestUserMessage: string | null;
    context: KangurAiTutorConversationContext | undefined;
  }
): RankedNativeGuideEntry | null => {
  const normalizedMessage = normalizeMessage(input.latestUserMessage);
  const enabledEntries = entries.filter((entry) => entry.enabled);

  const ranked = enabledEntries
    .map((entry) =>
      analyzeEntryMatch(entry, {
        normalizedMessage,
        context: input.context,
      })
    )
    .filter(({ score, entry }) => {
      if (score > 0) {
        return true;
      }
      if (entry.focusKind && entry.focusKind === input.context?.focusKind) {
        return true;
      }
      return entry.focusKind === null && entry.surface === input.context?.surface;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.entry.sortOrder - right.entry.sortOrder;
    });

  return ranked[0] ?? null;
};

const resolveCoverageLevel = (
  entry: KangurAiTutorNativeGuideEntry,
  context: KangurAiTutorConversationContext | undefined
): KangurAiTutorNativeGuideCoverageLevel => {
  const hasSectionSpecificContext = Boolean(
    context?.focusKind || context?.focusId || context?.questionId || context?.assignmentId
  );

  if (OVERVIEW_ENTRY_IDS.has(entry.id) && hasSectionSpecificContext) {
    return 'overview_fallback';
  }

  return 'specific';
};

const dedupeActions = (
  actions: KangurAiTutorFollowUpAction[]
): KangurAiTutorFollowUpAction[] => {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.id}:${action.page}:${JSON.stringify(action.query ?? {})}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const buildGuideMessage = (
  entry: KangurAiTutorNativeGuideEntry,
  context: KangurAiTutorConversationContext | undefined
): string => {
  const lines: string[] = [];
  const scopedLabel = context?.focusLabel?.trim() || context?.title?.trim() || null;

  if (scopedLabel) {
    lines.push(`${entry.title}: ${scopedLabel}.`);
  } else {
    lines.push(`${entry.title}.`);
  }

  lines.push(entry.shortDescription);
  lines.push(entry.fullDescription);

  if (entry.hints.length > 0) {
    lines.push(`Wskazowki: ${entry.hints.join(' ')}`);
  }

  if (entry.relatedGames.length > 0) {
    lines.push(`Powiazane gry: ${entry.relatedGames.join(', ')}.`);
  }

  if (entry.relatedTests.length > 0) {
    lines.push(`Powiazane testy: ${entry.relatedTests.join(', ')}.`);
  }

  return lines.join('\n\n');
};

export async function resolveKangurAiTutorNativeGuideResolution(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string | null;
}): Promise<KangurAiTutorNativeGuideResolution> {
  if (!shouldUseNativeGuide(input)) {
    return {
      status: 'skipped',
      message: null,
      followUpActions: [],
      entryId: null,
      matchedSignals: [],
      coverageLevel: null,
    };
  }

  const store = await getKangurAiTutorNativeGuideStore(input.locale?.trim() || 'pl');
  const rankedEntry = selectGuideEntry(store.entries, input);
  if (!rankedEntry) {
    return {
      status: 'miss',
      message: null,
      followUpActions: [],
      entryId: null,
      matchedSignals: [],
      coverageLevel: null,
    };
  }

  const followUpActions = dedupeActions(rankedEntry.entry.followUpActions);

  return {
    status: 'hit',
    message: buildGuideMessage(rankedEntry.entry, input.context),
    followUpActions,
    entryId: rankedEntry.entry.id,
    matchedSignals: rankedEntry.matchedSignals,
    coverageLevel: resolveCoverageLevel(rankedEntry.entry, input.context),
  };
}

export async function resolveKangurAiTutorNativeGuideResponse(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string | null;
}): Promise<KangurAiTutorNativeGuideResponse | null> {
  const resolution = await resolveKangurAiTutorNativeGuideResolution(input);

  if (resolution.status !== 'hit') {
    return null;
  }

  return {
    message: resolution.message,
    followUpActions: resolution.followUpActions,
  };
}
