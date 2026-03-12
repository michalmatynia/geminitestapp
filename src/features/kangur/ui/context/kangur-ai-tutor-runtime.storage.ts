import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import {
  agentPersonaMoodIdSchema,
  type AgentPersonaMoodId,
} from '@/shared/contracts/agents';
import {
  kangurAiTutorAnswerResolutionModeSchema,
  kangurAiTutorCoachingFrameSchema,
  kangurAiTutorLearnerMemorySchema,
  kangurAiTutorUsageSummarySchema,
  kangurAiTutorWebsiteHelpTargetSchema,
  type KangurAiTutorFollowUpAction,
  type KangurAiTutorLearnerMemory,
  type KangurAiTutorRuntimeMessage as ChatMessage,
  type KangurAiTutorUsageSummary,
} from '@/shared/contracts/kangur-ai-tutor';

import { normalizeMessageArtifacts } from './kangur-ai-tutor-runtime.helpers';

// ---------------------------------------------------------------------------
// Session state type (exported — re-exported from Runtime.shared.ts)
// ---------------------------------------------------------------------------

export type KangurAiTutorSessionState = {
  messages: ChatMessage[];
  isLoading: boolean;
  isUsageLoading: boolean;
  highlightedText: string | null;
  suggestedMoodId: AgentPersonaMoodId | null;
  usageSummary: KangurAiTutorUsageSummary | null;
};

// ---------------------------------------------------------------------------
// Persisted runtime state (internal)
// ---------------------------------------------------------------------------

type PersistedKangurAiTutorRuntimeState = {
  isOpen: boolean;
  sessionStates: Record<string, KangurAiTutorSessionState>;
  learnerMemories: Record<string, KangurAiTutorLearnerMemory>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY = 'kangur-ai-tutor-runtime-v1';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export const createEmptySessionState = (): KangurAiTutorSessionState => ({
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

// ---------------------------------------------------------------------------
// Message normalization
// ---------------------------------------------------------------------------

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
  const websiteHelpTarget = kangurAiTutorWebsiteHelpTargetSchema.safeParse(
    input['websiteHelpTarget']
  ).data;
  const answerResolutionMode = kangurAiTutorAnswerResolutionModeSchema.safeParse(
    input['answerResolutionMode']
  ).data;
  const drawingImageData =
    typeof input['drawingImageData'] === 'string' ? input['drawingImageData'] : null;
  const artifacts = normalizeMessageArtifacts(input['artifacts'], drawingImageData);

  return {
    role,
    content,
    ...(artifacts ? { artifacts } : {}),
    ...(drawingImageData ? { drawingImageData } : {}),
    ...(Array.isArray(input['sources'])
      ? { sources: input['sources'] as AgentTeachingChatSource[] }
      : {}),
    ...(Array.isArray(input['followUpActions'])
      ? { followUpActions: input['followUpActions'] as KangurAiTutorFollowUpAction[] }
      : {}),
    ...(coachingFrame ? { coachingFrame } : {}),
    ...(websiteHelpTarget ? { websiteHelpTarget } : {}),
    ...(answerResolutionMode ? { answerResolutionMode } : {}),
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
  const suggestedMoodId =
    agentPersonaMoodIdSchema.safeParse(input['suggestedMoodId']).data ?? null;
  const usageSummary =
    kangurAiTutorUsageSummarySchema.safeParse(input['usageSummary']).data ?? null;

  return {
    messages,
    isLoading: false,
    isUsageLoading: false,
    highlightedText:
      typeof input['highlightedText'] === 'string' ? input['highlightedText'] : null,
    suggestedMoodId,
    usageSummary,
  };
};

const normalizePersistedLearnerMemory = (
  value: unknown
): KangurAiTutorLearnerMemory | null =>
  kangurAiTutorLearnerMemorySchema.safeParse(value).data ?? null;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export const loadPersistedRuntimeState = (): PersistedKangurAiTutorRuntimeState => {
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
          ? Object.entries(parsed.sessionStates).reduce<
            Record<string, KangurAiTutorSessionState>
          >((acc, [sessionKey, sessionState]) => {
            const normalized = normalizePersistedSessionState(sessionState);
            if (!normalized) {
              return acc;
            }

            acc[sessionKey] = normalized;
            return acc;
          }, {})
          : {},
      learnerMemories:
        parsed.learnerMemories && typeof parsed.learnerMemories === 'object'
          ? Object.entries(parsed.learnerMemories).reduce<
            Record<string, KangurAiTutorLearnerMemory>
          >((acc, [memoryKey, learnerMemory]) => {
            const normalized = normalizePersistedLearnerMemory(learnerMemory);
            if (!normalized || !memoryKey.trim()) {
              return acc;
            }

            acc[memoryKey] = normalized;
            return acc;
          }, {})
          : {},
    };
  } catch {
    return createEmptyPersistedRuntimeState();
  }
};

export const persistRuntimeState = (
  state: Pick<
    PersistedKangurAiTutorRuntimeState,
    'isOpen' | 'sessionStates' | 'learnerMemories'
  >
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage write failures so the tutor still works when storage is unavailable.
  }
};

export const clearPersistedRuntimeState = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(KANGUR_AI_TUTOR_RUNTIME_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures so the tutor remains functional.
  }
};
