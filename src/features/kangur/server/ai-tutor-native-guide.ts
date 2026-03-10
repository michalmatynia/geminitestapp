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
  /wyjasnij(?: mi)?(?: te| ten| ta)?(?: sekcj| ekran| panel| widok| test| gra| lekcj)/u,
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

const normalizeMessage = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

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

const rankEntry = (
  entry: KangurAiTutorNativeGuideEntry,
  input: {
    normalizedMessage: string;
    context: KangurAiTutorConversationContext | undefined;
  }
): number => {
  let score = 0;

  if (entry.surface && entry.surface === input.context?.surface) {
    score += 40;
  } else if (entry.surface === null) {
    score += 10;
  }

  if (entry.focusKind && entry.focusKind === input.context?.focusKind) {
    score += 60;
  } else if (entry.focusKind === null) {
    score += 5;
  }

  if (
    entry.triggerPhrases.some((phrase) =>
      input.normalizedMessage.includes(normalizeMessage(phrase))
    )
  ) {
    score += 30;
  }

  if (
    input.context?.focusLabel &&
    entry.triggerPhrases.some((phrase) =>
      normalizeMessage(input.context?.focusLabel).includes(normalizeMessage(phrase))
    )
  ) {
    score += 15;
  }

  return score;
};

const selectGuideEntry = (
  entries: KangurAiTutorNativeGuideEntry[],
  input: {
    latestUserMessage: string | null;
    context: KangurAiTutorConversationContext | undefined;
  }
): KangurAiTutorNativeGuideEntry | null => {
  const normalizedMessage = normalizeMessage(input.latestUserMessage);
  const enabledEntries = entries.filter((entry) => entry.enabled);

  const ranked = enabledEntries
    .map((entry) => ({
      entry,
      score: rankEntry(entry, {
        normalizedMessage,
        context: input.context,
      }),
    }))
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

  return ranked[0]?.entry ?? null;
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

export async function resolveKangurAiTutorNativeGuideResponse(input: {
  latestUserMessage: string | null;
  context: KangurAiTutorConversationContext | undefined;
  locale?: string | null;
}): Promise<KangurAiTutorNativeGuideResponse | null> {
  if (!shouldUseNativeGuide(input)) {
    return null;
  }

  const store = await getKangurAiTutorNativeGuideStore(input.locale?.trim() || 'pl');
  const entry = selectGuideEntry(store.entries, input);
  if (!entry) {
    return null;
  }

  return {
    message: buildGuideMessage(entry, input.context),
    followUpActions: dedupeActions(entry.followUpActions),
  };
}
