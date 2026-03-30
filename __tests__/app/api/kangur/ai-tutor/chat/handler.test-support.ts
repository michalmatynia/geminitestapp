import { afterEach, beforeEach, expect, vi } from 'vitest';

import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import {
  __resetUsageCacheForTests,
  KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY,
} from '@/features/kangur/server/ai-tutor-usage';
import { __resetContextRegistryBundleCacheForTests } from '@/features/kangur/server/ai-tutor-context-registry-cache';
import {
  createContextRegistryBundle as createContextRegistryBundleImpl,
  createPostRequest as createPostRequestImpl,
  createRequestContext as createRequestContextImpl,
} from '@/app/api/kangur/ai-tutor/chat/handler.test-support';

export const createContextRegistryBundle = createContextRegistryBundleImpl;
export const createPostRequest = createPostRequestImpl;
export const createRequestContext = createRequestContextImpl;

const {
  resolveKangurActorMock,
  buildKangurAiTutorLearnerMoodMock,
  setKangurLearnerAiTutorStateMock,
  resolveBrainExecutionConfigForCapabilityMock,
  runBrainChatCompletionMock,
  contextRegistryResolveRefsMock,
  buildPersonaChatMemoryContextMock,
  persistAgentPersonaExchangeMemoryMock,
  chatbotSessionAddMessageMock,
  chatbotSessionFindSessionIdByPersonaAndTitleMock,
  chatbotSessionCreateMock,
  readStoredSettingValueMock,
  upsertStoredSettingValueMock,
  logKangurServerEventMock,
  buildKangurAiTutorAdaptiveGuidanceMock,
  resolveKangurAiTutorNativeGuideResolutionMock,
  resolveKangurAiTutorSectionKnowledgeBundleMock,
  resolveKangurWebsiteHelpGraphContextMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  buildKangurAiTutorLearnerMoodMock: vi.fn(),
  setKangurLearnerAiTutorStateMock: vi.fn(),
  resolveBrainExecutionConfigForCapabilityMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  contextRegistryResolveRefsMock: vi.fn(),
  buildPersonaChatMemoryContextMock: vi.fn(),
  persistAgentPersonaExchangeMemoryMock: vi.fn(),
  chatbotSessionAddMessageMock: vi.fn(),
  chatbotSessionFindSessionIdByPersonaAndTitleMock: vi.fn(),
  chatbotSessionCreateMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  buildKangurAiTutorAdaptiveGuidanceMock: vi.fn(),
  resolveKangurAiTutorNativeGuideResolutionMock: vi.fn(),
  resolveKangurAiTutorSectionKnowledgeBundleMock: vi.fn(),
  resolveKangurWebsiteHelpGraphContextMock: vi.fn(),
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
  buildKangurAiTutorLearnerMood: buildKangurAiTutorLearnerMoodMock,
  setKangurLearnerAiTutorState: setKangurLearnerAiTutorStateMock,
  requireActiveLearner: (actor: { activeLearner?: unknown }) => actor.activeLearner,
}));

vi.mock('@/features/ai/agentcreator/server/persona-memory', () => ({
  buildPersonaChatMemoryContext: buildPersonaChatMemoryContextMock,
  persistAgentPersonaExchangeMemory: persistAgentPersonaExchangeMemoryMock,
}));

vi.mock('@/features/ai/chatbot/server', () => ({
  chatbotSessionRepository: {
    addMessage: chatbotSessionAddMessageMock,
    findSessionIdByPersonaAndTitle: chatbotSessionFindSessionIdByPersonaAndTitleMock,
    create: chatbotSessionCreateMock,
  },
}));

vi.mock('@/features/ai/ai-context-registry/server', () => ({
  contextRegistryEngine: {
    resolveRefs: contextRegistryResolveRefsMock,
  },
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: resolveBrainExecutionConfigForCapabilityMock,
  readStoredSettingValue: readStoredSettingValueMock,
  upsertStoredSettingValue: upsertStoredSettingValueMock,
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: runBrainChatCompletionMock,
  supportsBrainJsonMode: vi.fn(() => true),
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
  getErrorFingerprint: vi.fn(() => 'test-fingerprint'),
}));

vi.mock('@/features/kangur/server/ai-tutor-adaptive', () => ({
  buildKangurAiTutorAdaptiveGuidance: buildKangurAiTutorAdaptiveGuidanceMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-native-guide', () => ({
  resolveKangurAiTutorNativeGuideResolution: resolveKangurAiTutorNativeGuideResolutionMock,
}));

vi.mock('@/app/api/kangur/ai-tutor/chat/section-knowledge', () => ({
  resolveKangurAiTutorSectionKnowledgeBundle: resolveKangurAiTutorSectionKnowledgeBundleMock,
}));

vi.mock('@/features/kangur/server/knowledge-graph/retrieval', () => ({
  resolveKangurAiTutorSemanticGraphContext: resolveKangurWebsiteHelpGraphContextMock,
  resolveKangurWebsiteHelpGraphContext: resolveKangurWebsiteHelpGraphContextMock,
}));

vi.unmock('@/features/kangur/settings-ai-tutor');

import { postKangurAiTutorChatHandler as postKangurAiTutorChatHandlerImpl } from '@/app/api/kangur/ai-tutor/chat/handler';

export const postKangurAiTutorChatHandler = postKangurAiTutorChatHandlerImpl;

export {
  AGENT_PERSONA_SETTINGS_KEY,
  buildKangurAiTutorAdaptiveGuidanceMock,
  buildKangurAiTutorLearnerMoodMock,
  buildPersonaChatMemoryContextMock,
  chatbotSessionAddMessageMock,
  chatbotSessionCreateMock,
  chatbotSessionFindSessionIdByPersonaAndTitleMock,
  contextRegistryResolveRefsMock,
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY,
  logKangurServerEventMock,
  persistAgentPersonaExchangeMemoryMock,
  readStoredSettingValueMock,
  resolveBrainExecutionConfigForCapabilityMock,
  resolveKangurActorMock,
  resolveKangurAiTutorNativeGuideResolutionMock,
  resolveKangurAiTutorSectionKnowledgeBundleMock,
  resolveKangurWebsiteHelpGraphContextMock,
  runBrainChatCompletionMock,
  setKangurLearnerAiTutorStateMock,
  upsertStoredSettingValueMock,
};

export const KANGUR_AI_TUTOR_BRAIN_CAPABILITY = 'kangur_ai_tutor.chat';

export const expectTutorSource = (input: {
  documentId: string;
  title: string;
  description: string;
  tags: string[];
}) =>
  expect.objectContaining({
    documentId: input.documentId,
    collectionId: 'kangur-runtime-context',
    score: expect.any(Number),
    text: expect.any(String),
    metadata: expect.objectContaining({
      source: 'manual-text',
      sourceId: input.documentId,
      title: input.title,
      description: input.description,
      tags: input.tags,
    }),
  });

export const registerKangurAiTutorChatHandlerTestHooks = () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetUsageCacheForTests();
    __resetContextRegistryBundleCacheForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T10:00:00.000Z'));
    resolveKangurActorMock.mockResolvedValue({
      activeLearner: {
        id: 'learner-1',
        aiTutor: {
          currentMoodId: 'neutral',
          baselineMoodId: 'neutral',
          confidence: 0.25,
          lastComputedAt: null,
          lastReasonCode: null,
        },
      },
    });
    buildKangurAiTutorLearnerMoodMock.mockResolvedValue({
      currentMoodId: 'supportive',
      baselineMoodId: 'encouraging',
      confidence: 0.72,
      lastComputedAt: '2026-03-07T10:00:00.000Z',
      lastReasonCode: 'learner_confusion',
    });
    setKangurLearnerAiTutorStateMock.mockResolvedValue({
      id: 'learner-1',
    });
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Dodawanie',
          description: 'Ćwiczenia z podstaw dodawania.',
        },
      }),
    );
    resolveBrainExecutionConfigForCapabilityMock.mockResolvedValue({
      modelId: 'brain-model-1',
      temperature: 0.2,
      maxTokens: 500,
      systemPrompt: 'Base brain prompt',
    });
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Policz najpierw lewą parę, potem prawą. :::assistant_drawing:{"type":"assistant_drawing","title":"Dwie pary","caption":"Każda para ma po dwa elementy.","alt":"Dwie pary kropek ustawione obok siebie."}:::',
    });
    buildPersonaChatMemoryContextMock.mockResolvedValue({
      persona: {
        id: 'persona-1',
        name: 'Mila',
      },
      memory: {
        items: [],
        summary: {
          personaId: 'persona-1',
          suggestedMoodId: 'encouraging',
          totalRecords: 0,
          memoryEntryCount: 0,
          conversationMessageCount: 0,
        },
      },
      systemPrompt:
        'Relevant persona memory:\n- Mila remembers the learner benefits from short checkpoints.',
      suggestedMoodId: 'encouraging',
    });
    persistAgentPersonaExchangeMemoryMock.mockResolvedValue(undefined);
    chatbotSessionAddMessageMock.mockResolvedValue(null);
    chatbotSessionFindSessionIdByPersonaAndTitleMock.mockResolvedValue(null);
    chatbotSessionCreateMock.mockResolvedValue({
      id: 'kangur-persona-session-1',
    });
    upsertStoredSettingValueMock.mockResolvedValue(true);
    buildKangurAiTutorAdaptiveGuidanceMock.mockResolvedValue({
      instructions: '',
      followUpActions: [],
      coachingFrame: null,
    });
    resolveKangurAiTutorNativeGuideResolutionMock.mockResolvedValue({
      status: 'skipped',
      message: null,
      followUpActions: [],
      entryId: null,
      matchedSignals: [],
      coverageLevel: null,
    });
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue(null);
    resolveKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'skipped',
      queryMode: null,
      instructions: null,
      sources: [],
      nodeIds: [],
    });
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: 'legacy-teacher',
            rememberTutorContext: true,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            hintDepth: 'step_by_step',
            proactiveNudges: 'coach',
            dailyMessageLimit: null,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          agentPersonaId: 'persona-1',
          motionPresetId: null,
          dailyMessageLimit: null,
        });
      }
      if (key === KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY) {
        return JSON.stringify({});
      }
      if (key === AGENT_PERSONA_SETTINGS_KEY) {
        return JSON.stringify([
          {
            id: 'persona-1',
            name: 'Mila',
            role: 'Math coach',
            instructions: 'Use a calm, playful tone.',
          },
        ]);
      }
      return null;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });
};
