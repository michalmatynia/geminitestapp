import {
  kangurAiTutorMessageArtifactSchema,
  type KangurAiTutorCoachingFrame,
  type KangurAiTutorConversationContext,
  type KangurAiTutorFocusKind,
  type KangurAiTutorFollowUpAction,
  type KangurAiTutorInteractionIntent,
  type KangurAiTutorLearnerMemory,
  type KangurAiTutorMessageArtifact,
  type KangurAiTutorRecoverySignal,
  type KangurAiTutorRuntimeMessage as ChatMessage,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurAiTutorLearnerMood,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';

// ---------------------------------------------------------------------------
// Re-exported types (moved here so storage + Runtime.shared.ts can import)
// ---------------------------------------------------------------------------

export type KangurAiTutorSessionRegistration = {
  token: symbol;
  learnerId: string | null;
  sessionContext: KangurAiTutorConversationContext | null;
  sessionKey: string;
};

export type KangurAiTutorSessionRegistrationSetter =
  | KangurAiTutorSessionRegistration
  | null
  | ((
      current: KangurAiTutorSessionRegistration | null
    ) => KangurAiTutorSessionRegistration | null);

// ---------------------------------------------------------------------------
// Internal type
// ---------------------------------------------------------------------------

export type KangurAiTutorHintRecoveryCandidate = {
  surface: KangurAiTutorConversationContext['surface'];
  contentId: string | null;
  questionId: string | null;
  focusKind: KangurAiTutorFocusKind | null;
  focusKey: string | null;
  coachingMode: KangurAiTutorCoachingFrame['mode'] | null;
  interactionIntent: KangurAiTutorInteractionIntent | null;
  answerRevealedAtHint: boolean;
};

// ---------------------------------------------------------------------------
// String / text normalization
// ---------------------------------------------------------------------------

export const normalizeTutorMessageForComparison = (value: string): string =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

export const normalizeTutorScopePart = (
  value: string | null | undefined,
  maxLength: number
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9:_-]+/gi, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-:]+|[-:]+$/g, '');

  if (!normalized) {
    return null;
  }

  return normalized.length > maxLength
    ? normalized.slice(0, maxLength).replace(/[-:]+$/g, '')
    : normalized;
};

export const normalizeTutorContextIdentifier = (
  value: string | null | undefined,
  maxLength: number
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > maxLength ? normalized.slice(0, maxLength).trimEnd() : normalized;
};

export const normalizeTutorMemoryText = (
  value: string | null | undefined,
  maxLength: number
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > maxLength ? normalized.slice(0, maxLength).trimEnd() : normalized;
};

// ---------------------------------------------------------------------------
// Session / memory key builders
// ---------------------------------------------------------------------------

export const buildTutorSessionScope = (
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (!sessionContext) {
    return null;
  }

  const contentIdPart = normalizeTutorScopePart(sessionContext.contentId, 120);
  const assignmentPart = normalizeTutorScopePart(sessionContext.assignmentId, 60);

  const bucket =
    contentIdPart !== null
      ? assignmentPart !== null
        ? `${contentIdPart}:assignment:${assignmentPart}`
        : contentIdPart
      : assignmentPart !== null
        ? `assignment:${assignmentPart}`
        : normalizeTutorScopePart(sessionContext.focusId, 120)?.replace(
            /^/,
            `focus:${sessionContext.focusKind ?? 'unknown'}:`
          ) ??
          normalizeTutorScopePart(sessionContext.title, 120)?.replace(/^/, 'title:') ??
          'none';

  return `${sessionContext.surface}:${bucket}`;
};

const KANGUR_AI_TUTOR_MEMORY_SCOPE_SEPARATOR = '::';

export const buildLearnerMemoryKey = (
  learnerId: string | null | undefined,
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (!learnerId) {
    return null;
  }

  const scope = buildTutorSessionScope(sessionContext);
  return scope ? `${learnerId}${KANGUR_AI_TUTOR_MEMORY_SCOPE_SEPARATOR}${scope}` : null;
};

export const isLearnerMemoryKeyForLearner = (key: string, learnerId: string): boolean =>
  key === learnerId || key.startsWith(`${learnerId}${KANGUR_AI_TUTOR_MEMORY_SCOPE_SEPARATOR}`);

export const buildSessionKey = (
  learnerId: string | null,
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  const scope = buildTutorSessionScope(sessionContext);
  if (!scope) {
    return null;
  }

  return `${learnerId ?? 'guest'}:${scope}`;
};

// ---------------------------------------------------------------------------
// Message helpers
// ---------------------------------------------------------------------------

export const countRepeatedUserMessages = (
  messages: ChatMessage[],
  nextText: string
): number => {
  const normalizedNextText = normalizeTutorMessageForComparison(nextText);
  if (!normalizedNextText) {
    return 0;
  }

  return messages.reduce((count, message) => {
    if (message.role !== 'user') {
      return count;
    }

    return normalizeTutorMessageForComparison(message.content) === normalizedNextText
      ? count + 1
      : count;
  }, 0);
};

export const getLastAssistantCoachingMode = (
  messages: ChatMessage[],
  fallback: KangurAiTutorLearnerMemory | null
): KangurAiTutorCoachingFrame['mode'] | null => {
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  return latestAssistantMessage?.coachingFrame?.mode ?? fallback?.lastCoachingMode ?? null;
};

// ---------------------------------------------------------------------------
// Artifact helpers
// ---------------------------------------------------------------------------

export const buildUserDrawingArtifacts = (
  drawingImageData: string | null | undefined
): KangurAiTutorMessageArtifact[] | undefined => {
  const normalized = typeof drawingImageData === 'string' ? drawingImageData.trim() : '';
  if (!normalized) {
    return undefined;
  }

  return [
    {
      type: 'user_drawing',
      imageDataUrl: normalized,
    },
  ];
};

export const normalizeMessageArtifacts = (
  value: unknown,
  fallbackDrawingImageData?: unknown
): KangurAiTutorMessageArtifact[] | undefined => {
  const normalizedArtifacts = Array.isArray(value)
    ? value
      .map((artifact) => kangurAiTutorMessageArtifactSchema.safeParse(artifact).data ?? null)
      .filter((artifact): artifact is KangurAiTutorMessageArtifact => artifact !== null)
    : [];

  if (normalizedArtifacts.length > 0) {
    return normalizedArtifacts;
  }

  return buildUserDrawingArtifacts(
    typeof fallbackDrawingImageData === 'string' ? fallbackDrawingImageData : null
  );
};

// ---------------------------------------------------------------------------
// Mood helpers
// ---------------------------------------------------------------------------

const toMoodTimestamp = (mood: KangurAiTutorLearnerMood | null | undefined): number => {
  if (!mood?.lastComputedAt) {
    return 0;
  }

  const timestamp = Date.parse(mood.lastComputedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const mergeLearnerTutorMood = (
  current: KangurAiTutorLearnerMood | null | undefined,
  next: KangurAiTutorLearnerMood | null | undefined
): KangurAiTutorLearnerMood => {
  if (!current) {
    return next ?? createDefaultKangurAiTutorLearnerMood();
  }
  if (!next) {
    return current;
  }

  return toMoodTimestamp(next) >= toMoodTimestamp(current) ? next : current;
};

// ---------------------------------------------------------------------------
// Hint recovery
// ---------------------------------------------------------------------------

export const buildTutorRecoveryFocusKey = (
  context: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (!context) {
    return null;
  }

  const questionId = normalizeTutorContextIdentifier(context.questionId, 120);
  if (questionId) {
    return `question:${questionId}`;
  }

  const assignmentId = normalizeTutorContextIdentifier(context.assignmentId, 120);
  if (assignmentId) {
    return `assignment:${assignmentId}`;
  }

  const focusId = normalizeTutorContextIdentifier(context.focusId, 120);
  if (focusId) {
    return `focus:${context.focusKind ?? 'unknown'}:${focusId}`;
  }

  const currentQuestion = normalizeTutorContextIdentifier(context.currentQuestion, 160);
  if (currentQuestion) {
    return `question_text:${normalizeTutorMessageForComparison(currentQuestion)}`;
  }

  const focusLabel = normalizeTutorContextIdentifier(context.focusLabel, 160);
  if (focusLabel) {
    return `focus_label:${normalizeTutorMessageForComparison(focusLabel)}`;
  }

  return null;
};

export const buildHintRecoveryCandidate = (input: {
  context: KangurAiTutorConversationContext;
  coachingFrame: KangurAiTutorCoachingFrame | null;
}): KangurAiTutorHintRecoveryCandidate => ({
  surface: input.context.surface,
  contentId: input.context.contentId ?? null,
  questionId: input.context.questionId ?? null,
  focusKind: input.context.focusKind ?? null,
  focusKey: buildTutorRecoveryFocusKey(input.context),
  coachingMode: input.coachingFrame?.mode ?? null,
  interactionIntent: input.context.interactionIntent ?? null,
  answerRevealedAtHint: input.context.answerRevealed === true,
});

export const resolveHintRecoverySignal = (input: {
  candidate: KangurAiTutorHintRecoveryCandidate;
  nextContext: KangurAiTutorConversationContext | null;
}): KangurAiTutorRecoverySignal | null => {
  const { candidate, nextContext } = input;
  if (!nextContext) {
    return null;
  }

  if (!candidate.answerRevealedAtHint && nextContext.answerRevealed === true) {
    return 'answer_revealed';
  }

  const nextFocusKey = buildTutorRecoveryFocusKey(nextContext);
  if (candidate.focusKey && nextFocusKey && candidate.focusKey !== nextFocusKey) {
    return 'focus_advanced';
  }

  return null;
};

// ---------------------------------------------------------------------------
// Learner memory builders
// ---------------------------------------------------------------------------

export const omitUndefinedFields = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;

const buildTutorMemoryFocusLabel = (
  context: KangurAiTutorConversationContext
): string | undefined => {
  const candidate =
    normalizeTutorMemoryText(context.focusLabel, 160) ??
    normalizeTutorMemoryText(context.title, 160) ??
    normalizeTutorMemoryText(context.selectedText, 160) ??
    normalizeTutorMemoryText(context.currentQuestion, 160) ??
    normalizeTutorMemoryText(context.contentId, 160);

  return candidate ?? undefined;
};

const buildTutorMemoryRecommendedAction = (input: {
  followUpActions: KangurAiTutorFollowUpAction[];
  coachingFrame: KangurAiTutorCoachingFrame | null;
}): string | undefined => {
  const primaryAction = input.followUpActions[0] ?? null;
  const candidate = primaryAction
    ? normalizeTutorMemoryText(
      primaryAction.reason
        ? `${primaryAction.label}: ${primaryAction.reason}`
        : primaryAction.label,
      160
    )
    : normalizeTutorMemoryText(input.coachingFrame?.label, 160);

  return candidate ?? undefined;
};

export const buildNextLearnerMemory = (input: {
  current: KangurAiTutorLearnerMemory | null;
  context: KangurAiTutorConversationContext;
  userMessage: string;
  assistantMessage: string;
  followUpActions: KangurAiTutorFollowUpAction[];
  coachingFrame: KangurAiTutorCoachingFrame | null;
}): KangurAiTutorLearnerMemory => {
  const latestHint = normalizeTutorMemoryText(input.assistantMessage, 160);
  const previousHints = input.current?.lastGivenHints ?? [];
  const nextHints = latestHint
    ? [latestHint, ...previousHints].slice(0, 3)
    : previousHints.length > 0
      ? previousHints
      : undefined;

  return omitUndefinedFields({
    lastSurface: input.context.surface,
    lastFocusLabel: buildTutorMemoryFocusLabel(input.context) ?? input.current?.lastFocusLabel,
    lastUnresolvedBlocker:
      normalizeTutorMemoryText(input.userMessage, 200) ?? input.current?.lastUnresolvedBlocker,
    lastRecommendedAction:
      buildTutorMemoryRecommendedAction({
        followUpActions: input.followUpActions,
        coachingFrame: input.coachingFrame,
      }) ?? input.current?.lastRecommendedAction,
    lastSuccessfulIntervention:
      normalizeTutorMemoryText(input.assistantMessage, 200) ??
      input.current?.lastSuccessfulIntervention,
    lastCoachingMode: input.coachingFrame?.mode ?? input.current?.lastCoachingMode,
    lastGivenHints: nextHints,
  });
};

export const buildLearnerMemoryFromCompletedFollowUp = (input: {
  current: KangurAiTutorLearnerMemory | null;
  context: KangurAiTutorConversationContext;
  actionLabel: string;
  actionReason?: string | null;
  actionPage: string;
}): KangurAiTutorLearnerMemory =>
  omitUndefinedFields({
    lastSurface: input.context.surface,
    lastFocusLabel: buildTutorMemoryFocusLabel(input.context) ?? input.current?.lastFocusLabel,
    lastUnresolvedBlocker: input.current?.lastUnresolvedBlocker,
    lastRecommendedAction:
      normalizeTutorMemoryText(
        input.actionReason
          ? `Completed follow-up: ${input.actionLabel}: ${input.actionReason}`
          : `Completed follow-up: ${input.actionLabel}`,
        160
      ) ?? input.current?.lastRecommendedAction,
    lastSuccessfulIntervention:
      normalizeTutorMemoryText(
        input.actionReason
          ? `The learner completed the tutor follow-up ${input.actionLabel} for ${input.actionReason} on ${input.actionPage}.`
          : `The learner completed the tutor follow-up ${input.actionLabel} on ${input.actionPage}.`,
        200
      ) ?? input.current?.lastSuccessfulIntervention,
    lastCoachingMode: 'next_best_action',
  });

// ---------------------------------------------------------------------------
// Equality helpers
// ---------------------------------------------------------------------------

export const areConversationContextsEqual = (
  left: KangurAiTutorConversationContext | null,
  right: KangurAiTutorConversationContext | null
): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  return (
    left.surface === right.surface &&
    left.contentId === right.contentId &&
    left.description === right.description &&
    left.questionId === right.questionId &&
    left.selectedChoiceLabel === right.selectedChoiceLabel &&
    left.selectedChoiceText === right.selectedChoiceText &&
    left.selectedText === right.selectedText &&
    left.answerRevealed === right.answerRevealed &&
    left.promptMode === right.promptMode &&
    left.focusKind === right.focusKind &&
    left.focusId === right.focusId &&
    left.focusLabel === right.focusLabel &&
    left.assignmentId === right.assignmentId &&
    left.knowledgeReference?.sourceCollection === right.knowledgeReference?.sourceCollection &&
    left.knowledgeReference?.sourceRecordId === right.knowledgeReference?.sourceRecordId &&
    left.knowledgeReference?.sourcePath === right.knowledgeReference?.sourcePath &&
    left.interactionIntent === right.interactionIntent
  );
};

export const areSessionRegistrationsEqual = (
  left: KangurAiTutorSessionRegistration | null,
  right: KangurAiTutorSessionRegistration | null
): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  return (
    left.token === right.token &&
    left.learnerId === right.learnerId &&
    left.sessionKey === right.sessionKey &&
    areConversationContextsEqual(left.sessionContext, right.sessionContext)
  );
};
