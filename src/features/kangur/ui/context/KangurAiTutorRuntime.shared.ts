'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from 'react';

import { summarizeKangurAiTutorFollowUpActions } from '@/features/kangur/ai-tutor/follow-up-reporting';
import { buildKangurAiTutorContextRegistryRefs } from '@/features/kangur/context-registry/refs';
import {
  logKangurClientError,
  trackKangurClientEvent,
} from '@/features/kangur/observability/client';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
  resolveKangurAiTutorAvailability,
  type KangurAiTutorAppSettings,
  type KangurAiTutorLearnerSettings,
} from '@/features/kangur/settings-ai-tutor';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import {
  DEFAULT_AGENT_PERSONA_MOOD_ID,
  agentPersonaMoodIdSchema,
  type AgentPersona,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import { getKangurAiTutorMoodCopy } from '@/shared/contracts/kangur-ai-tutor-content';
import {
  kangurAiTutorCoachingFrameSchema,
  kangurAiTutorLearnerMemorySchema,
  kangurAiTutorUsageSummarySchema,
  type KangurAiTutorChatResponse,
  type KangurAiTutorCoachingFrame,
  type KangurAiTutorConversationContext,
  type KangurAiTutorFocusKind,
  type KangurAiTutorFollowUpAction,
  type KangurAiTutorInteractionIntent,
  type KangurAiTutorLearnerMemory,
  type KangurAiTutorPromptMode,
  type KangurAiTutorRecoverySignal,
  type KangurAiTutorUsageSummary,
  type KangurAiTutorUsageResponse,
} from '@/shared/contracts/kangur-ai-tutor';
import {
  createDefaultKangurAiTutorLearnerMood,
  type KangurAiTutorLearnerMood,
  type KangurTutorMoodId,
} from '@/shared/contracts/kangur-ai-tutor-mood';
import { useAgentPersonaVisuals } from '@/shared/hooks/useAgentPersonaVisuals';
import { resolveAgentPersonaMood } from '@/shared/lib/agent-personas';
import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { ApiError, api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { useKangurAiTutorContent } from './KangurAiTutorContentContext';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  sources?: AgentTeachingChatSource[];
  followUpActions?: KangurAiTutorFollowUpAction[];
  coachingFrame?: KangurAiTutorCoachingFrame;
};

export type KangurAiTutorSessionState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isUsageLoading: boolean;
  highlightedText: string | null;
  suggestedMoodId: AgentPersonaMoodId | null;
  usageSummary: KangurAiTutorUsageSummary | null;
};

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

export type KangurAiTutorContextValue = {
  enabled: boolean;
  appSettings: KangurAiTutorAppSettings;
  tutorSettings: KangurAiTutorLearnerSettings | null;
  tutorPersona: AgentPersona | null;
  tutorName: string;
  tutorMoodId: AgentPersonaMoodId;
  tutorBehaviorMoodId: KangurTutorMoodId;
  tutorBehaviorMoodLabel: string;
  tutorBehaviorMoodDescription: string;
  tutorAvatarSvg: string | null;
  tutorAvatarImageUrl: string | null;
  sessionContext: KangurAiTutorConversationContext | null;
  learnerMemory: KangurAiTutorLearnerMemory | null;
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  isUsageLoading: boolean;
  highlightedText: string | null;
  usageSummary: KangurAiTutorUsageSummary | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (
    text: string,
    options?: {
      promptMode?: KangurAiTutorPromptMode;
      selectedText?: string | null;
      focusKind?: KangurAiTutorFocusKind;
      focusId?: string | null;
      focusLabel?: string | null;
      assignmentId?: string | null;
      interactionIntent?: KangurAiTutorInteractionIntent;
    }
  ) => Promise<void>;
  recordFollowUpCompletion?: (input: {
    actionId: string;
    actionLabel: string;
    actionReason?: string | null;
    actionPage: string;
    targetPath: string;
    targetSearch?: string | null;
  }) => void;
  setHighlightedText: (text: string | null) => void;
};

export type KangurAiTutorSessionSyncProps = {
  learnerId: string | null;
  sessionContext?: KangurAiTutorConversationContext | null;
};

type PersistedKangurAiTutorRuntimeState = {
  isOpen: boolean;
  sessionStates: Record<string, KangurAiTutorSessionState>;
  learnerMemories: Record<string, KangurAiTutorLearnerMemory>;
};

type KangurAiTutorHintRecoveryCandidate = {
  surface: KangurAiTutorConversationContext['surface'];
  contentId: string | null;
  questionId: string | null;
  focusKind: KangurAiTutorFocusKind | null;
  focusKey: string | null;
  coachingMode: KangurAiTutorCoachingFrame['mode'] | null;
  interactionIntent: KangurAiTutorInteractionIntent | null;
  answerRevealedAtHint: boolean;
};

export type KangurAiTutorSessionRegistryContextValue = {
  setRegistration: (registration: KangurAiTutorSessionRegistrationSetter) => void;
};

type KangurAiTutorRuntimeResult = {
  value: KangurAiTutorContextValue;
  sessionRegistryValue: KangurAiTutorSessionRegistryContextValue;
};

export const KangurAiTutorSessionRegistryContext =
  createContext<KangurAiTutorSessionRegistryContextValue | null>(null);

const KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY = 'kangur-ai-tutor-runtime-v1';
const KANGUR_AI_TUTOR_MEMORY_SCOPE_SEPARATOR = '::';

const createEmptySessionState = (): KangurAiTutorSessionState => ({
  messages: [],
  isLoading: false,
  isUsageLoading: false,
  highlightedText: null,
  suggestedMoodId: null,
  usageSummary: null,
});

const createEmptyPersistedRuntimeState = (): PersistedKangurAiTutorRuntimeState => ({
  isOpen: false,
  sessionStates: {},
  learnerMemories: {},
});

const normalizeTutorMessageForComparison = (value: string): string =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

const normalizeTutorScopePart = (
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

const buildTutorSessionScope = (
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (!sessionContext) {
    return null;
  }

  const bucket =
    normalizeTutorScopePart(sessionContext.contentId, 120) ??
    normalizeTutorScopePart(sessionContext.assignmentId, 120)?.replace(/^/, 'assignment:') ??
    normalizeTutorScopePart(sessionContext.focusId, 120)?.replace(
      /^/,
      `focus:${sessionContext.focusKind ?? 'unknown'}:`
    ) ??
    normalizeTutorScopePart(sessionContext.title, 120)?.replace(/^/, 'title:') ??
    'none';

  return `${sessionContext.surface}:${bucket}`;
};

const buildLearnerMemoryKey = (
  learnerId: string | null | undefined,
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  if (!learnerId) {
    return null;
  }

  const scope = buildTutorSessionScope(sessionContext);
  return scope ? `${learnerId}${KANGUR_AI_TUTOR_MEMORY_SCOPE_SEPARATOR}${scope}` : null;
};

const isLearnerMemoryKeyForLearner = (key: string, learnerId: string): boolean =>
  key === learnerId || key.startsWith(`${learnerId}${KANGUR_AI_TUTOR_MEMORY_SCOPE_SEPARATOR}`);

const normalizeTutorContextIdentifier = (
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

const countRepeatedUserMessages = (
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

const getLastAssistantCoachingMode = (
  messages: ChatMessage[],
  fallback: KangurAiTutorLearnerMemory | null
): KangurAiTutorCoachingFrame['mode'] | null => {
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  return latestAssistantMessage?.coachingFrame?.mode ?? fallback?.lastCoachingMode ?? null;
};

const buildTutorRecoveryFocusKey = (
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

const buildHintRecoveryCandidate = (input: {
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

const resolveHintRecoverySignal = (input: {
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

const normalizePersistedMessage = (value: unknown): ChatMessage | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const role = input['role'];
  const content = input['content'];
  if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
    return null;
  }

  const coachingFrame = kangurAiTutorCoachingFrameSchema.safeParse(input['coachingFrame']).data;

  return {
    role,
    content,
    ...(Array.isArray(input['sources']) ? { sources: input['sources'] as AgentTeachingChatSource[] } : {}),
    ...(Array.isArray(input['followUpActions'])
      ? { followUpActions: input['followUpActions'] as KangurAiTutorFollowUpAction[] }
      : {}),
    ...(coachingFrame ? { coachingFrame } : {}),
  };
};

const normalizePersistedSessionState = (value: unknown): KangurAiTutorSessionState | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  const messages = Array.isArray(input['messages'])
    ? input['messages']
      .map(normalizePersistedMessage)
      .filter((message): message is ChatMessage => message !== null)
    : [];
  const suggestedMoodId = agentPersonaMoodIdSchema.safeParse(input['suggestedMoodId']).data ?? null;
  const usageSummary = kangurAiTutorUsageSummarySchema.safeParse(input['usageSummary']).data ?? null;

  return {
    messages,
    isLoading: false,
    isUsageLoading: false,
    highlightedText: typeof input['highlightedText'] === 'string' ? input['highlightedText'] : null,
    suggestedMoodId,
    usageSummary,
  };
};

const normalizePersistedLearnerMemory = (value: unknown): KangurAiTutorLearnerMemory | null =>
  kangurAiTutorLearnerMemorySchema.safeParse(value).data ?? null;

const loadPersistedRuntimeState = (): PersistedKangurAiTutorRuntimeState => {
  if (typeof window === 'undefined') {
    return createEmptyPersistedRuntimeState();
  }

  try {
    const raw = window.sessionStorage.getItem(KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY);
    if (!raw) {
      return createEmptyPersistedRuntimeState();
    }

    const parsed = JSON.parse(raw) as Partial<PersistedKangurAiTutorRuntimeState> | null;
    if (!parsed || typeof parsed !== 'object') {
      return createEmptyPersistedRuntimeState();
    }

    return {
      isOpen: parsed.isOpen === true,
      sessionStates:
        parsed.sessionStates && typeof parsed.sessionStates === 'object'
          ? Object.entries(parsed.sessionStates).reduce<Record<string, KangurAiTutorSessionState>>(
            (acc, [sessionKey, sessionState]) => {
              const normalized = normalizePersistedSessionState(sessionState);
              if (!normalized) {
                return acc;
              }

              acc[sessionKey] = normalized;
              return acc;
            },
            {}
          )
          : {},
      learnerMemories:
        parsed.learnerMemories && typeof parsed.learnerMemories === 'object'
          ? Object.entries(parsed.learnerMemories).reduce<Record<string, KangurAiTutorLearnerMemory>>(
            (acc, [memoryKey, learnerMemory]) => {
              const normalized = normalizePersistedLearnerMemory(learnerMemory);
              if (!normalized || !memoryKey.trim()) {
                return acc;
              }

              acc[memoryKey] = normalized;
              return acc;
            },
            {}
          )
          : {},
    };
  } catch {
    return createEmptyPersistedRuntimeState();
  }
};

const persistRuntimeState = (state: PersistedKangurAiTutorRuntimeState): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write failures so the tutor still works when storage is unavailable.
  }
};

const clearPersistedRuntimeState = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures so the tutor remains functional.
  }
};

const toMoodTimestamp = (mood: KangurAiTutorLearnerMood | null | undefined): number => {
  if (!mood?.lastComputedAt) {
    return 0;
  }

  const timestamp = Date.parse(mood.lastComputedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const mergeLearnerTutorMood = (
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

const omitUndefinedFields = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as T;

const normalizeTutorMemoryText = (
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

const buildNextLearnerMemory = (input: {
  current: KangurAiTutorLearnerMemory | null;
  context: KangurAiTutorConversationContext;
  userMessage: string;
  assistantMessage: string;
  followUpActions: KangurAiTutorFollowUpAction[];
  coachingFrame: KangurAiTutorCoachingFrame | null;
}): KangurAiTutorLearnerMemory =>
  omitUndefinedFields({
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
  });

const buildLearnerMemoryFromCompletedFollowUp = (input: {
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

const buildSessionKey = (
  learnerId: string | null,
  sessionContext: KangurAiTutorConversationContext | null | undefined
): string | null => {
  const scope = buildTutorSessionScope(sessionContext);
  if (!scope) {
    return null;
  }

  return `${learnerId ?? 'guest'}:${scope}`;
};

const areConversationContextsEqual = (
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
    left.questionId === right.questionId &&
    left.selectedText === right.selectedText &&
    left.answerRevealed === right.answerRevealed &&
    left.promptMode === right.promptMode &&
    left.focusKind === right.focusKind &&
    left.focusId === right.focusId &&
    left.focusLabel === right.focusLabel &&
    left.assignmentId === right.assignmentId &&
    left.interactionIntent === right.interactionIntent
  );
};

const areSessionRegistrationsEqual = (
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

export const useKangurAiTutorSessionSync = ({
  learnerId,
  sessionContext,
}: KangurAiTutorSessionSyncProps): void => {
  const tutorContent = useKangurAiTutorContent();
  const registry = useContext(KangurAiTutorSessionRegistryContext);
  const tokenRef = useRef(Symbol('kangur-ai-tutor-session'));
  const setRegistration = registry?.setRegistration;
  const normalizedSessionContext = useMemo<KangurAiTutorConversationContext | null>(() => {
    if (!sessionContext) {
      return null;
    }

    return omitUndefinedFields({
      surface: sessionContext.surface,
      contentId: sessionContext.contentId,
      title: sessionContext.title,
      description: sessionContext.description,
      masterySummary: sessionContext.masterySummary,
      assignmentSummary: sessionContext.assignmentSummary,
      questionId: sessionContext.questionId,
      selectedText: sessionContext.selectedText,
      currentQuestion: sessionContext.currentQuestion,
      questionProgressLabel: sessionContext.questionProgressLabel,
      answerRevealed: sessionContext.answerRevealed,
      promptMode: sessionContext.promptMode,
      focusKind: sessionContext.focusKind,
      focusId: sessionContext.focusId,
      focusLabel: sessionContext.focusLabel,
      assignmentId: sessionContext.assignmentId,
      interactionIntent: sessionContext.interactionIntent,
    });
  }, [
    sessionContext?.answerRevealed,
    sessionContext?.assignmentId,
    sessionContext?.assignmentSummary,
    sessionContext?.contentId,
    sessionContext?.currentQuestion,
    sessionContext?.description,
    sessionContext?.focusId,
    sessionContext?.focusKind,
    sessionContext?.focusLabel,
    sessionContext?.interactionIntent,
    sessionContext?.masterySummary,
    sessionContext?.promptMode,
    sessionContext?.questionProgressLabel,
    sessionContext?.questionId,
    sessionContext?.selectedText,
    sessionContext?.surface,
    sessionContext?.title,
  ]);
  const sessionKey = useMemo(
    () => buildSessionKey(learnerId, normalizedSessionContext),
    [learnerId, normalizedSessionContext]
  );
  const registrySource = useMemo(
    () =>
      registry && learnerId && normalizedSessionContext
        ? {
          label: tutorContent.common.sessionRegistryLabel,
          refs: buildKangurAiTutorContextRegistryRefs({
            learnerId,
            context: normalizedSessionContext,
          }),
        }
        : null,
    [learnerId, normalizedSessionContext, registry, tutorContent.common.sessionRegistryLabel]
  );

  useRegisterContextRegistryPageSource('kangur-ai-tutor-session', registrySource);

  useLayoutEffect(() => {
    if (!setRegistration) {
      return undefined;
    }

    const registration =
      sessionKey === null
        ? null
        : {
          token: tokenRef.current,
          learnerId,
          sessionContext: normalizedSessionContext,
          sessionKey,
        };

    setRegistration(registration);

    return () => {
      setRegistration((current) => (current?.token === tokenRef.current ? null : current));
    };
  }, [learnerId, normalizedSessionContext, sessionKey, setRegistration]);
};

export function KangurAiTutorSessionSyncInner({
  learnerId,
  sessionContext,
}: KangurAiTutorSessionSyncProps): JSX.Element | null {
  useKangurAiTutorSessionSync({
    learnerId,
    sessionContext,
  });

  return null;
}

export const useKangurAiTutorRuntime = (): KangurAiTutorRuntimeResult => {
  const tutorContent = useKangurAiTutorContent();
  const settingsStore = useSettingsStore();
  const initialRuntimeStateRef = useRef<PersistedKangurAiTutorRuntimeState | null>(null);
  if (initialRuntimeStateRef.current === null) {
    initialRuntimeStateRef.current = loadPersistedRuntimeState();
  }

  const [isOpen, setIsOpen] = useState(initialRuntimeStateRef.current.isOpen);
  const [activeRegistration, setActiveRegistration] =
    useState<KangurAiTutorSessionRegistration | null>(null);
  const [sessionStates, setSessionStates] = useState<Record<string, KangurAiTutorSessionState>>(
    initialRuntimeStateRef.current.sessionStates
  );
  const [learnerMemories, setLearnerMemories] = useState<Record<string, KangurAiTutorLearnerMemory>>(
    initialRuntimeStateRef.current.learnerMemories
  );
  const [learnerMoodById, setLearnerMoodById] = useState<Record<string, KangurAiTutorLearnerMood>>(
    {}
  );
  const authState = useOptionalKangurAuth();
  const authUser = authState?.user ?? null;
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();

  const activeLearnerId = activeRegistration?.learnerId ?? authUser?.activeLearner?.id ?? null;
  const activeSessionContext = activeRegistration?.sessionContext ?? null;
  const activeSessionKey = activeRegistration?.sessionKey ?? null;

  useEffect(() => {
    const nextEntries = [
      ...(authUser?.learners ?? []),
      ...(authUser?.activeLearner ? [authUser.activeLearner] : []),
    ];

    if (nextEntries.length === 0) {
      return;
    }

    setLearnerMoodById((current) => {
      let changed = false;
      const nextState = { ...current };

      nextEntries.forEach((learner) => {
        const merged = mergeLearnerTutorMood(nextState[learner.id], learner.aiTutor);
        if (merged !== nextState[learner.id]) {
          nextState[learner.id] = merged;
          changed = true;
        }
      });

      return changed ? nextState : current;
    });
  }, [authUser]);

  const rawSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const rawAppSettings = settingsStore.get(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const parsedSettings = useMemo(() => parseKangurAiTutorSettings(rawSettings), [rawSettings]);
  const appSettings = useMemo(
    () => resolveKangurAiTutorAppSettings(rawAppSettings, parsedSettings),
    [parsedSettings, rawAppSettings]
  );
  const tutorSettings = useMemo(
    () =>
      activeLearnerId
        ? getKangurAiTutorSettingsForLearner(parsedSettings, activeLearnerId, appSettings)
        : null,
    [activeLearnerId, appSettings, parsedSettings]
  );
  const availability = useMemo(
    () =>
      resolveKangurAiTutorAvailability(tutorSettings, activeSessionContext, {
        ownerEmailVerified: authUser?.ownerEmailVerified,
      }),
    [activeSessionContext, authUser?.ownerEmailVerified, tutorSettings]
  );
  const enabled = availability.allowed;
  const allowCrossPagePersistence = tutorSettings?.allowCrossPagePersistence ?? true;
  const allowLearnerMemory =
    allowCrossPagePersistence && (tutorSettings?.rememberTutorContext ?? true);
  const allowSelectedTextSupport = tutorSettings?.allowSelectedTextSupport ?? true;
  const showSources = tutorSettings?.showSources ?? true;
  const activeLearnerMemoryKey = useMemo(
    () => buildLearnerMemoryKey(activeLearnerId, activeSessionContext),
    [activeLearnerId, activeSessionContext]
  );
  const activeLearnerMemory =
    activeLearnerMemoryKey && allowLearnerMemory
      ? learnerMemories[activeLearnerMemoryKey] ?? null
      : null;

  const activeSessionState = activeSessionKey
    ? (sessionStates[activeSessionKey] ?? createEmptySessionState())
    : createEmptySessionState();
  const {
    messages,
    isLoading,
    isUsageLoading,
    highlightedText,
    suggestedMoodId,
    usageSummary,
  } = activeSessionState;
  const tutorBehaviorMood = useMemo(
    () =>
      activeLearnerId
        ? mergeLearnerTutorMood(learnerMoodById[activeLearnerId], null)
        : createDefaultKangurAiTutorLearnerMood(),
    [activeLearnerId, learnerMoodById]
  );
  const tutorBehaviorMoodCopy = useMemo(
    () => getKangurAiTutorMoodCopy(tutorContent, tutorBehaviorMood.currentMoodId),
    [tutorContent.moods, tutorBehaviorMood.currentMoodId]
  );

  const updateSessionState = useCallback(
    (
      sessionKey: string | null,
      updater: (state: KangurAiTutorSessionState) => KangurAiTutorSessionState
    ) => {
      if (!sessionKey) {
        return;
      }

      setSessionStates((prev) => {
        const currentState = prev[sessionKey] ?? createEmptySessionState();
        const nextState = updater(currentState);
        if (nextState === currentState) {
          return prev;
        }

        return {
          ...prev,
          [sessionKey]: nextState,
        };
      });
    },
    []
  );

  const updateLearnerMemory = useCallback(
    (
      memoryKey: string | null,
      updater: (memory: KangurAiTutorLearnerMemory | null) => KangurAiTutorLearnerMemory | null
    ) => {
      if (!memoryKey) {
        return;
      }

      setLearnerMemories((prev) => {
        const currentMemory = prev[memoryKey] ?? null;
        const nextMemory = updater(currentMemory);
        if (nextMemory === currentMemory) {
          return prev;
        }

        if (!nextMemory) {
          if (!(memoryKey in prev)) {
            return prev;
          }

          const nextState = { ...prev };
          delete nextState[memoryKey];
          return nextState;
        }

        return {
          ...prev,
          [memoryKey]: nextMemory,
        };
      });
    },
    []
  );

  const effectiveTutorPersonaId = tutorSettings?.agentPersonaId ?? appSettings.agentPersonaId;
  const { data: agentPersonas = [] } = useAgentPersonaVisuals(effectiveTutorPersonaId);
  const tutorPersona = useMemo<AgentPersona | null>(() => {
    const personaId = effectiveTutorPersonaId;
    if (!personaId) {
      return null;
    }

    return agentPersonas.find((persona) => persona.id === personaId) ?? null;
  }, [agentPersonas, effectiveTutorPersonaId]);
  const tutorName = tutorPersona?.name ?? tutorContent.common.defaultTutorName;
  const requestedTutorMoodId = useMemo<AgentPersonaMoodId>(() => {
    if (isLoading) {
      return 'thinking';
    }

    if (suggestedMoodId) {
      return suggestedMoodId;
    }

    if (messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      return 'encouraging';
    }

    return DEFAULT_AGENT_PERSONA_MOOD_ID;
  }, [isLoading, messages, suggestedMoodId]);
  const resolvedTutorMood = useMemo(
    () => resolveAgentPersonaMood(tutorPersona, requestedTutorMoodId),
    [requestedTutorMoodId, tutorPersona]
  );
  const defaultTutorMood = useMemo(() => resolveAgentPersonaMood(tutorPersona), [tutorPersona]);
  const resolvedTutorMoodVisuals = useMemo(() => {
    const resolvedThumbnail =
      resolvedTutorMood.useEmbeddedThumbnail === true
        ? resolvedTutorMood.avatarThumbnailDataUrl?.trim() || null
        : null;
    if (resolvedThumbnail) {
      return {
        tutorAvatarImageUrl: resolvedThumbnail,
        tutorAvatarSvg: null,
      };
    }

    const resolvedImage = resolvedTutorMood.avatarImageUrl?.trim() || null;
    const resolvedSvg = resolvedTutorMood.svgContent.trim() || null;

    if (resolvedImage) {
      return {
        tutorAvatarImageUrl: resolvedImage,
        tutorAvatarSvg: null,
      };
    }

    if (resolvedSvg) {
      return {
        tutorAvatarImageUrl: null,
        tutorAvatarSvg: resolvedSvg,
      };
    }

    const fallbackThumbnail =
      defaultTutorMood.useEmbeddedThumbnail === true
        ? defaultTutorMood.avatarThumbnailDataUrl?.trim() || null
        : null;
    if (fallbackThumbnail) {
      return {
        tutorAvatarImageUrl: fallbackThumbnail,
        tutorAvatarSvg: null,
      };
    }

    const fallbackImage = defaultTutorMood.avatarImageUrl?.trim() || null;
    if (fallbackImage) {
      return {
        tutorAvatarImageUrl: fallbackImage,
        tutorAvatarSvg: null,
      };
    }

    return {
      tutorAvatarImageUrl: null,
      tutorAvatarSvg: defaultTutorMood.svgContent.trim() || null,
    };
  }, [
    defaultTutorMood.avatarThumbnailDataUrl,
    defaultTutorMood.avatarImageUrl,
    defaultTutorMood.svgContent,
    defaultTutorMood.useEmbeddedThumbnail,
    resolvedTutorMood.avatarThumbnailDataUrl,
    resolvedTutorMood.avatarImageUrl,
    resolvedTutorMood.svgContent,
    resolvedTutorMood.useEmbeddedThumbnail,
  ]);
  const tutorMoodId = resolvedTutorMood.id;
  const tutorAvatarSvg = resolvedTutorMoodVisuals.tutorAvatarSvg;
  const tutorAvatarImageUrl = resolvedTutorMoodVisuals.tutorAvatarImageUrl;

  const previousSessionKeyRef = useRef<string | null>(null);
  const pendingHintRecoveryBySessionKeyRef = useRef<
    Record<string, KangurAiTutorHintRecoveryCandidate>
  >({});
  const recentHintRecoverySignalBySessionKeyRef = useRef<
    Record<string, KangurAiTutorRecoverySignal>
  >({});

  useEffect(() => {
    if (!allowCrossPagePersistence) {
      clearPersistedRuntimeState();
      return;
    }

    persistRuntimeState({
      isOpen,
      sessionStates,
      learnerMemories,
    });
  }, [allowCrossPagePersistence, isOpen, learnerMemories, sessionStates]);

  useLayoutEffect(() => {
    if (allowCrossPagePersistence) {
      return;
    }

    clearPersistedRuntimeState();
    setIsOpen(false);
    setSessionStates((currentStates) =>
      Object.keys(currentStates).length === 0 ? currentStates : {}
    );
    setLearnerMemories((currentMemories) =>
      Object.keys(currentMemories).length === 0 ? currentMemories : {}
    );
  }, [activeSessionKey, allowCrossPagePersistence]);

  useEffect(() => {
    if (allowLearnerMemory || !activeLearnerId) {
      return;
    }

    setLearnerMemories((prev) => {
      let changed = false;
      const nextState = { ...prev };

      Object.keys(prev).forEach((memoryKey) => {
        if (!isLearnerMemoryKeyForLearner(memoryKey, activeLearnerId)) {
          return;
        }

        delete nextState[memoryKey];
        changed = true;
      });

      return changed ? nextState : prev;
    });
  }, [activeLearnerId, allowLearnerMemory]);

  useEffect(() => {
    const previousSessionKey = previousSessionKeyRef.current;
    if (previousSessionKey && activeSessionKey && previousSessionKey !== activeSessionKey) {
      trackKangurClientEvent('kangur_ai_tutor_context_switched', {
        previousSessionKey,
        nextSessionKey: activeSessionKey,
        surface: activeSessionContext?.surface ?? null,
        contentId: activeSessionContext?.contentId ?? null,
      });
    }

    if (activeSessionKey) {
      previousSessionKeyRef.current = activeSessionKey;
    }
  }, [activeSessionContext?.contentId, activeSessionContext?.surface, activeSessionKey]);

  useEffect(() => {
    if (!activeSessionKey || !activeSessionContext) {
      return;
    }

    const pendingCandidate = pendingHintRecoveryBySessionKeyRef.current[activeSessionKey];
    if (!pendingCandidate) {
      return;
    }

    const recoverySignal = resolveHintRecoverySignal({
      candidate: pendingCandidate,
      nextContext: activeSessionContext,
    });
    if (!recoverySignal) {
      return;
    }

    trackKangurClientEvent('kangur_ai_tutor_recovery_after_hint', {
      surface: pendingCandidate.surface,
      contentId: pendingCandidate.contentId,
      questionId: pendingCandidate.questionId,
      focusKind: pendingCandidate.focusKind,
      coachingMode: pendingCandidate.coachingMode,
      interactionIntent: pendingCandidate.interactionIntent,
      recoverySignal,
      nextQuestionId: activeSessionContext.questionId ?? null,
      nextFocusKind: activeSessionContext.focusKind ?? null,
    });
    recentHintRecoverySignalBySessionKeyRef.current[activeSessionKey] = recoverySignal;
    delete pendingHintRecoveryBySessionKeyRef.current[activeSessionKey];
  }, [
    activeSessionContext,
    activeSessionContext?.answerRevealed,
    activeSessionContext?.assignmentId,
    activeSessionContext?.currentQuestion,
    activeSessionContext?.focusId,
    activeSessionContext?.focusKind,
    activeSessionContext?.focusLabel,
    activeSessionContext?.questionId,
    activeSessionKey,
  ]);

  useLayoutEffect(() => {
    if (!activeSessionKey) {
      return;
    }

    if (!enabled) {
      setIsOpen(false);
      updateSessionState(activeSessionKey, (currentState) =>
        currentState.isLoading || currentState.isUsageLoading
          ? {
            ...currentState,
            isLoading: false,
            isUsageLoading: false,
          }
          : currentState
      );
    }
  }, [activeSessionKey, enabled, updateSessionState]);

  useEffect(() => {
    if (!activeSessionKey) {
      return;
    }

    if (!enabled || !activeLearnerId || tutorSettings?.dailyMessageLimit === null) {
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        isUsageLoading: false,
        usageSummary: null,
      }));
      return;
    }

    let cancelled = false;
    updateSessionState(activeSessionKey, (currentState) => ({
      ...currentState,
      isUsageLoading: true,
    }));

    void api
      .get<KangurAiTutorUsageResponse>('/api/kangur/ai-tutor/usage')
      .then((result) => {
        if (cancelled) {
          return;
        }

        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          usageSummary: result.usage,
        }));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        logKangurClientError(error, {
          source: 'KangurAiTutorContext',
          action: 'loadUsage',
          surface: activeSessionContext?.surface ?? null,
          contentId: activeSessionContext?.contentId ?? null,
        });
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          isUsageLoading: false,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeLearnerId,
    activeSessionContext?.contentId,
    activeSessionContext?.surface,
    activeSessionKey,
    enabled,
    tutorSettings?.dailyMessageLimit,
    updateSessionState,
  ]);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const setHighlightedText = useCallback(
    (text: string | null) =>
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        highlightedText: text,
      })),
    [activeSessionKey, updateSessionState]
  );

  const recordFollowUpCompletion = useCallback(
    (input: {
      actionId: string;
      actionLabel: string;
      actionReason?: string | null;
      actionPage: string;
      targetPath: string;
      targetSearch?: string | null;
    }) => {
      if (!allowLearnerMemory || !activeLearnerMemoryKey || !activeSessionContext) {
        return;
      }

      updateLearnerMemory(activeLearnerMemoryKey, (currentMemory) =>
        buildLearnerMemoryFromCompletedFollowUp({
          current: currentMemory,
          context: activeSessionContext,
          actionLabel: input.actionLabel,
          actionReason: input.actionReason ?? null,
          actionPage: input.actionPage,
        })
      );

      trackKangurClientEvent('kangur_ai_tutor_follow_up_memory_recorded', {
        surface: activeSessionContext.surface,
        contentId: activeSessionContext.contentId ?? null,
        actionId: input.actionId,
        actionPage: input.actionPage,
        targetPath: input.targetPath,
        targetSearch: input.targetSearch ?? null,
      });
    },
    [
      activeLearnerMemoryKey,
      activeSessionContext,
      allowLearnerMemory,
      updateLearnerMemory,
    ]
  );

  const sendMessage = useCallback(
    async (
      text: string,
      options?: {
        promptMode?: KangurAiTutorPromptMode;
        selectedText?: string | null;
        focusKind?: KangurAiTutorFocusKind;
        focusId?: string | null;
        focusLabel?: string | null;
        assignmentId?: string | null;
        interactionIntent?: KangurAiTutorInteractionIntent;
      }
    ): Promise<void> => {
      if (!text.trim() || !enabled || !activeSessionContext || !activeSessionKey) {
        return;
      }

      const userMessage: ChatMessage = { role: 'user', content: text.trim() };
      const outgoingMessages: ChatMessage[] = [...messages, userMessage];
      const requestedPromptMode = options?.promptMode ?? 'chat';
      const resolvedPromptMode =
        requestedPromptMode === 'selected_text' && !allowSelectedTextSupport
          ? 'chat'
          : requestedPromptMode;
      const resolvedSelectedText = allowSelectedTextSupport
        ? (options?.selectedText ?? highlightedText)?.trim() || null
        : null;
      const repeatCount = countRepeatedUserMessages(messages, userMessage.content);
      const previousCoachingMode = getLastAssistantCoachingMode(messages, activeLearnerMemory);
      const recentHintRecoverySignal =
        recentHintRecoverySignalBySessionKeyRef.current[activeSessionKey] ?? null;
      const telemetryContext = {
        surface: activeSessionContext?.surface ?? null,
        contentId: activeSessionContext?.contentId ?? null,
        promptMode: resolvedPromptMode,
        hasSelectedText: Boolean(resolvedSelectedText),
        hasLearnerMemory: Boolean(activeLearnerMemory),
        contextRegistryRefCount: pageContextRegistry?.refs.length ?? 0,
        focusKind: options?.focusKind ?? null,
        interactionIntent: options?.interactionIntent ?? null,
        messageCount: outgoingMessages.length,
        isRepeatedQuestion: repeatCount > 0,
        repeatCount,
        previousCoachingMode,
        recentHintRecoverySignal,
      };
      updateSessionState(activeSessionKey, (currentState) => ({
        ...currentState,
        messages: outgoingMessages,
        isLoading: true,
      }));
      if (repeatCount > 0) {
        trackKangurClientEvent('kangur_ai_tutor_repeat_question_detected', telemetryContext);
      }
      trackKangurClientEvent('kangur_ai_tutor_message_sent', telemetryContext);

      try {
        const nextContext = omitUndefinedFields({
          ...activeSessionContext,
          promptMode: resolvedPromptMode,
          ...(resolvedSelectedText ? { selectedText: resolvedSelectedText } : {}),
          ...(options?.focusKind ? { focusKind: options.focusKind } : {}),
          ...(options?.focusId ? { focusId: options.focusId } : {}),
          ...(options?.focusLabel ? { focusLabel: options.focusLabel } : {}),
          ...(options?.assignmentId ? { assignmentId: options.assignmentId } : {}),
          ...(options?.interactionIntent ? { interactionIntent: options.interactionIntent } : {}),
          ...(repeatCount > 0 ? { repeatedQuestionCount: repeatCount } : {}),
          ...(recentHintRecoverySignal
            ? { recentHintRecoverySignal }
            : {}),
          ...(previousCoachingMode
            ? { previousCoachingMode }
            : {}),
        });
        const result = await api.post<KangurAiTutorChatResponse>('/api/kangur/ai-tutor/chat', {
          messages: outgoingMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          context: nextContext,
          ...(pageContextRegistry ? { contextRegistry: pageContextRegistry } : {}),
          ...(activeLearnerMemory ? { memory: activeLearnerMemory } : {}),
        });
        const sources = showSources && Array.isArray(result.sources) ? result.sources : [];
        const followUpActions = Array.isArray(result.followUpActions)
          ? result.followUpActions
          : [];
        const followUpReporting = summarizeKangurAiTutorFollowUpActions(followUpActions);
        const coachingFrame =
          kangurAiTutorCoachingFrameSchema.safeParse(result.coachingFrame).data ?? null;
        trackKangurClientEvent('kangur_ai_tutor_message_succeeded', {
          ...telemetryContext,
          sourcesCount: sources.length,
          hasSources: sources.length > 0,
          followUpActionCount: followUpActions.length,
          primaryFollowUpActionId: followUpReporting.primaryFollowUpActionId,
          primaryFollowUpPage: followUpReporting.primaryFollowUpPage,
          hasBridgeFollowUpAction: followUpReporting.hasBridgeFollowUpAction,
          bridgeFollowUpActionCount: followUpReporting.bridgeFollowUpActionCount,
          bridgeFollowUpDirection: followUpReporting.bridgeFollowUpDirection,
          coachingMode: coachingFrame?.mode ?? null,
        });
        if (resolvedPromptMode === 'hint') {
          pendingHintRecoveryBySessionKeyRef.current[activeSessionKey] = buildHintRecoveryCandidate({
            context: nextContext,
            coachingFrame,
          });
        } else {
          delete pendingHintRecoveryBySessionKeyRef.current[activeSessionKey];
        }
        delete recentHintRecoverySignalBySessionKeyRef.current[activeSessionKey];
        if (result.tutorMood && activeLearnerId) {
          setLearnerMoodById((current) => ({
            ...current,
            [activeLearnerId]: mergeLearnerTutorMood(current[activeLearnerId], result.tutorMood),
          }));
        }
        if (allowLearnerMemory && activeLearnerMemoryKey) {
          updateLearnerMemory(activeLearnerMemoryKey, (currentMemory) =>
            buildNextLearnerMemory({
              current: currentMemory,
              context: nextContext,
              userMessage: userMessage.content,
              assistantMessage: result.message,
              followUpActions,
              coachingFrame,
            })
          );
        }
        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          messages: [
            ...outgoingMessages,
            {
              role: 'assistant',
              content: result.message,
              sources,
              followUpActions,
              ...(coachingFrame ? { coachingFrame } : {}),
            },
          ],
          suggestedMoodId: result.suggestedMoodId ?? null,
          usageSummary: result.usage ?? currentState.usageSummary,
        }));
      } catch (error) {
        trackKangurClientEvent('kangur_ai_tutor_message_failed', telemetryContext);
        logKangurClientError(error, {
          source: 'KangurAiTutorContext',
          action: 'sendMessage',
          ...telemetryContext,
        });
        const usageFromError =
          error instanceof ApiError && error.payload && typeof error.payload === 'object'
            ? kangurAiTutorUsageSummarySchema
              .safeParse((error.payload as Record<string, unknown>)['details'])
              .data ?? null
            : null;
        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          suggestedMoodId: null,
          usageSummary: usageFromError ?? currentState.usageSummary,
          messages: [
            ...outgoingMessages,
            {
              role: 'assistant',
              content:
                error instanceof ApiError && error.message.trim()
                  ? error.message
                  : tutorContent.common.sendFailureFallback,
            },
          ],
        }));
      } finally {
        updateSessionState(activeSessionKey, (currentState) => ({
          ...currentState,
          isLoading: false,
        }));
      }
    },
    [
      activeLearnerId,
      activeLearnerMemoryKey,
      activeLearnerMemory,
      activeSessionContext,
      activeSessionKey,
      allowLearnerMemory,
      allowSelectedTextSupport,
      enabled,
      highlightedText,
      messages,
      pageContextRegistry,
      showSources,
      updateLearnerMemory,
      updateSessionState,
    ]
  );

  const setRegistration = useCallback((registration: KangurAiTutorSessionRegistrationSetter) => {
    setActiveRegistration((current) => {
      const next = typeof registration === 'function' ? registration(current) : registration;
      return areSessionRegistrationsEqual(current, next) ? current : next;
    });
  }, []);
  const sessionRegistryValue = useMemo(() => ({ setRegistration }), [setRegistration]);

  const value = useMemo<KangurAiTutorContextValue>(
    () => ({
      enabled,
      appSettings,
      tutorSettings,
      tutorPersona,
      tutorName,
      tutorMoodId,
      tutorBehaviorMoodId: tutorBehaviorMood.currentMoodId,
      tutorBehaviorMoodLabel: tutorBehaviorMoodCopy.label,
      tutorBehaviorMoodDescription: tutorBehaviorMoodCopy.description,
      tutorAvatarSvg,
      tutorAvatarImageUrl,
      sessionContext: activeSessionContext,
      learnerMemory: activeLearnerMemory,
      isOpen,
      messages,
      isLoading,
      isUsageLoading,
      highlightedText,
      usageSummary,
      openChat,
      closeChat,
      sendMessage,
      recordFollowUpCompletion,
      setHighlightedText,
    }),
    [
      activeSessionContext,
      appSettings,
      closeChat,
      enabled,
      highlightedText,
      isLoading,
      isOpen,
      isUsageLoading,
      messages,
      openChat,
      recordFollowUpCompletion,
      sendMessage,
      setHighlightedText,
      tutorAvatarImageUrl,
      tutorAvatarSvg,
      tutorBehaviorMood.currentMoodId,
      tutorBehaviorMoodCopy.description,
      tutorBehaviorMoodCopy.label,
      tutorMoodId,
      tutorName,
      tutorPersona,
      tutorSettings,
      activeLearnerMemory,
      usageSummary,
    ]
  );

  return {
    value,
    sessionRegistryValue,
  };
};
