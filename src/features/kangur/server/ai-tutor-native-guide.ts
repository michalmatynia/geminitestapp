import 'server-only';

import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFollowUpAction,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorNativeGuideEntry } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';

import { extractKangurPageContentFragmentId } from '@/features/kangur/page-content-fragments';
import { getKangurAiTutorNativeGuideStore } from './ai-tutor-native-guide-repository';
import { getKangurPageContentEntry } from './page-content-repository';

const ALWAYS_NATIVE_EXPLAIN_FOCUS_KINDS = new Set([
  'hero',
  'screen',
  'library',
  'empty_state',
  'navigation',
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
  'login_action',
  'create_account_action',
  'login_identifier_field',
  'login_form',
]);

const PAGE_HELP_PATTERNS = [
  /co to jest/u,
  /co robi/u,
  /do czego s[łl]u[żz]y/u,
  /jak dzia[łl]a/u,
  /na czym polega/u,
  /co mog[ęe] tutaj zrobi[ćc]/u,
  /jak korzysta[ćc]/u,
  /gdzie znajd[ęe]/u,
  /opisz/u,
  /wyja[śs]nij(?: mi)?(?: t[eę]| ten| ta)?(?: sekcj| ekran| panel| widok| test| gra| lekcj| pytan| zadani| podsumowani| omowieni)/u,
  /powiedz o/u,
];

const NON_NATIVE_PATTERNS = [
  /zaznaczon/u,
  /fragment/u,
  /krok po kroku/u,
  /rozwi[ąa][żz]/u,
  /odpowied[źz]/u,
  /wynik/u,
];

type KangurAiTutorNativeGuideResponse = {
  message: string;
  followUpActions: KangurAiTutorFollowUpAction[];
};

type KangurAiTutorNativeGuideMatchSignal =
  | 'knowledge_reference'
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

const OVERVIEW_ENTRY_IDS = new Set([
  'lesson-overview',
  'game-overview',
  'test-overview',
  'auth-overview',
]);

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

const hasKnowledgeReferenceNativeExplainIntent = (
  context: KangurAiTutorConversationContext | undefined,
): boolean =>
  (context?.knowledgeReference?.sourceCollection ===
    'kangur_ai_tutor_native_guides' ||
    context?.knowledgeReference?.sourceCollection ===
      'kangur_page_content') &&
  context?.interactionIntent === 'explain';

const hasAlwaysNativeExplainFocus = (
  context: KangurAiTutorConversationContext | undefined,
): boolean => {
  const focusKind = context?.focusKind ?? null;

  return (
    context?.promptMode === 'explain' &&
    typeof focusKind === 'string' &&
    ALWAYS_NATIVE_EXPLAIN_FOCUS_KINDS.has(focusKind)
  );
};

const shouldBlockNativeGuideForSelectionIntent = (
  normalizedMessage: string,
  context: KangurAiTutorConversationContext | undefined,
): boolean =>
  NON_NATIVE_PATTERNS.some((pattern) => pattern.test(normalizedMessage)) &&
  (Boolean(context?.selectedText?.trim()) ||
    Boolean(context?.currentQuestion?.trim()));

const hasPageHelpIntent = (normalizedMessage: string): boolean =>
  PAGE_HELP_PATTERNS.some((pattern) => pattern.test(normalizedMessage));

const hasNativeGuidePriorityContext = (
  context: KangurAiTutorConversationContext | undefined,
): boolean =>
  hasKnowledgeReferenceNativeExplainIntent(context) || hasAlwaysNativeExplainFocus(context);

const shouldUseNativeGuideFromMessageIntent = (
  normalizedMessage: string,
  context: KangurAiTutorConversationContext | undefined,
): boolean =>
  normalizedMessage.length > 0 &&
  !shouldBlockNativeGuideForSelectionIntent(normalizedMessage, context) &&
  hasPageHelpIntent(normalizedMessage);

const shouldUseNativeGuide = (input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
}): boolean => {
  const normalized = normalizeMessage(input.latestUserMessage);

  if (hasNativeGuidePriorityContext(input.context)) {
    return true;
  }

  return shouldUseNativeGuideFromMessageIntent(normalized, input.context);
};

type RankedEntryAccumulator = {
  matchedSignals: KangurAiTutorNativeGuideMatchSignal[];
  score: number;
};

const createRankedEntryAccumulator = (): RankedEntryAccumulator => ({
  matchedSignals: [],
  score: 0,
});

const addRankedEntryScore = (
  accumulator: RankedEntryAccumulator,
  score: number,
  signal?: KangurAiTutorNativeGuideMatchSignal | null,
): void => {
  accumulator.score += score;
  if (signal) {
    accumulator.matchedSignals.push(signal);
  }
};

const applyNullableFieldMatchScore = (
  accumulator: RankedEntryAccumulator,
  entryValue: string | null,
  contextValue: string | undefined,
  matchScore: number,
  fallbackScore: number,
  signal: KangurAiTutorNativeGuideMatchSignal,
): void => {
  if (entryValue && entryValue === contextValue) {
    addRankedEntryScore(accumulator, matchScore, signal);
    return;
  }

  if (entryValue === null) {
    addRankedEntryScore(accumulator, fallbackScore);
  }
};

const applyPrefixLookupScore = (
  accumulator: RankedEntryAccumulator,
  match: { score: number; signal: KangurAiTutorNativeGuideMatchSignal | null },
): void => {
  addRankedEntryScore(accumulator, match.score, match.signal);
};

const applyTriggerPhraseScore = (
  accumulator: RankedEntryAccumulator,
  entry: KangurAiTutorNativeGuideEntry,
  value: string | null | undefined,
  score: number,
  signal: KangurAiTutorNativeGuideMatchSignal,
): void => {
  if (matchesTriggerPhrases(entry, value)) {
    addRankedEntryScore(accumulator, score, signal);
  }
};

const analyzeEntryMatch = (
  entry: KangurAiTutorNativeGuideEntry,
  input: {
    normalizedMessage: string;
    context: KangurAiTutorConversationContext | undefined;
  }
): RankedNativeGuideEntry => {
  const accumulator = createRankedEntryAccumulator();

  applyNullableFieldMatchScore(
    accumulator,
    entry.surface,
    input.context?.surface,
    40,
    10,
    'surface',
  );
  applyNullableFieldMatchScore(
    accumulator,
    entry.focusKind,
    input.context?.focusKind,
    60,
    5,
    'focus_kind',
  );

  applyPrefixLookupScore(
    accumulator,
    matchLookupPrefixes(entry.focusIdPrefixes, input.context?.focusId, {
      exact: 80,
      prefix: 45,
      exactSignal: 'focus_id_exact',
      prefixSignal: 'focus_id_prefix',
    }),
  );
  applyPrefixLookupScore(
    accumulator,
    matchLookupPrefixes(entry.contentIdPrefixes, input.context?.contentId, {
      exact: 70,
      prefix: 35,
      exactSignal: 'content_id_exact',
      prefixSignal: 'content_id_prefix',
    }),
  );

  applyTriggerPhraseScore(accumulator, entry, input.normalizedMessage, 30, 'message_trigger');
  applyTriggerPhraseScore(accumulator, entry, input.context?.focusLabel, 15, 'focus_label_trigger');
  applyTriggerPhraseScore(accumulator, entry, input.context?.title, 18, 'title_trigger');

  return {
    entry,
    score: accumulator.score,
    matchedSignals: accumulator.matchedSignals,
  };
};

const selectGuideEntryFromKnowledgeReference = async (
  entries: KangurAiTutorNativeGuideEntry[],
  context: KangurAiTutorConversationContext | undefined,
  locale: string
): Promise<RankedNativeGuideEntry | null> => {
  const knowledgeReference = context?.knowledgeReference;
  if (!knowledgeReference) {
    return null;
  }

  const sourceRecordId = knowledgeReference.sourceRecordId.trim();
  if (!sourceRecordId) {
    return null;
  }

  if (knowledgeReference.sourceCollection === 'kangur_ai_tutor_native_guides') {
    const entry = entries.find((candidate) => candidate.enabled && candidate.id === sourceRecordId);
    if (!entry) {
      return null;
    }

    return {
      entry,
      score: Number.MAX_SAFE_INTEGER,
      matchedSignals: ['knowledge_reference'],
    };
  }

  if (knowledgeReference.sourceCollection !== 'kangur_page_content') {
    return null;
  }

  const pageContentEntry = await getKangurPageContentEntry(sourceRecordId, locale);
  if (!pageContentEntry?.enabled) {
    return null;
  }

  const explicitFragmentId = extractKangurPageContentFragmentId(knowledgeReference.sourcePath);
  const explicitFragment =
    explicitFragmentId !== null
      ? pageContentEntry.fragments.find(
          (candidate) => candidate.enabled && candidate.id === explicitFragmentId
        ) ?? null
      : null;
  const linkedGuideCandidateIds =
    explicitFragment?.nativeGuideIds.length
      ? explicitFragment.nativeGuideIds
      : pageContentEntry.nativeGuideIds;
  const linkedGuideId = linkedGuideCandidateIds.find((guideId) =>
    entries.some((candidate) => candidate.enabled && candidate.id === guideId)
  );
  if (!linkedGuideId) {
    return null;
  }

  const linkedEntry = entries.find((candidate) => candidate.enabled && candidate.id === linkedGuideId);
  if (!linkedEntry) {
    return null;
  }

  return {
    entry: linkedEntry,
    score: Number.MAX_SAFE_INTEGER,
    matchedSignals: ['knowledge_reference'],
  };
};

const selectGuideEntry = async (
  entries: KangurAiTutorNativeGuideEntry[],
  input: {
    latestUserMessage: string | null;
    context: KangurAiTutorConversationContext | undefined;
    locale: string;
  }
): Promise<RankedNativeGuideEntry | null> => {
  const directEntry = await selectGuideEntryFromKnowledgeReference(
    entries,
    input.context,
    input.locale
  );
  if (directEntry) {
    return directEntry;
  }

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
    lines.push(`Wskazówki: ${entry.hints.join(' ')}`);
  }

  if (entry.relatedGames.length > 0) {
    lines.push(`Powiązane gry: ${entry.relatedGames.join(', ')}.`);
  }

  if (entry.relatedTests.length > 0) {
    lines.push(`Powiązane testy: ${entry.relatedTests.join(', ')}.`);
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
  const rankedEntry = await selectGuideEntry(store.entries, {
    ...input,
    locale: input.locale?.trim() || 'pl',
  });
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
