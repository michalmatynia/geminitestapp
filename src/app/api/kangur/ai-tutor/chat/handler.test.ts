import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurAiTutorLearnerMood } from '@/shared/contracts/kangur-ai-tutor-mood';

import { createPostRequest, createRequestContext } from './handler.test-support';

const {
  addMessageMock,
  buildAdaptiveGuidanceMock,
  buildKangurAiTutorLearnerMoodMock,
  buildSectionExplainMessageMock,
  buildTutorDrawingInstructionsMock,
  consumeKangurAiTutorDailyUsageMock,
  ensureKangurAiTutorDailyUsageAvailableMock,
  getKangurAiTutorSettingsForLearnerMock,
  logKangurServerEventMock,
  parseKangurAiTutorSettingsMock,
  readStoredSettingValueMock,
  requireActiveLearnerMock,
  resolveBrainExecutionConfigForCapabilityMock,
  resolveKangurActorMock,
  resolveKangurAiTutorAppSettingsMock,
  resolveKangurAiTutorAvailabilityMock,
  resolveKangurAiTutorContextRegistryBundleMock,
  resolveKangurAiTutorNativeGuideResolutionMock,
  resolveKangurAiTutorRuntimeDocumentsMock,
  resolveKangurAiTutorSectionKnowledgeBundleMock,
  resolveKangurAiTutorSemanticGraphContextMock,
  resolvePersonaInstructionsMock,
  runBrainChatCompletionMock,
  setKangurLearnerAiTutorStateMock,
  shouldEnableTutorDrawingSupportMock,
  supportsBrainJsonModeMock,
} = vi.hoisted(() => ({
  addMessageMock: vi.fn(),
  buildAdaptiveGuidanceMock: vi.fn(),
  buildKangurAiTutorLearnerMoodMock: vi.fn(),
  buildSectionExplainMessageMock: vi.fn(),
  buildTutorDrawingInstructionsMock: vi.fn(),
  consumeKangurAiTutorDailyUsageMock: vi.fn(),
  ensureKangurAiTutorDailyUsageAvailableMock: vi.fn(),
  getKangurAiTutorSettingsForLearnerMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  parseKangurAiTutorSettingsMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
  requireActiveLearnerMock: vi.fn(),
  resolveBrainExecutionConfigForCapabilityMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  resolveKangurAiTutorAppSettingsMock: vi.fn(),
  resolveKangurAiTutorAvailabilityMock: vi.fn(),
  resolveKangurAiTutorContextRegistryBundleMock: vi.fn(),
  resolveKangurAiTutorNativeGuideResolutionMock: vi.fn(),
  resolveKangurAiTutorRuntimeDocumentsMock: vi.fn(),
  resolveKangurAiTutorSectionKnowledgeBundleMock: vi.fn(),
  resolveKangurAiTutorSemanticGraphContextMock: vi.fn(),
  resolvePersonaInstructionsMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  setKangurLearnerAiTutorStateMock: vi.fn(),
  shouldEnableTutorDrawingSupportMock: vi.fn(),
  supportsBrainJsonModeMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/ai/ai-context-registry/context/page-context-shared', () => ({
  mergeContextRegistryRefs: (...groups: unknown[][]) => groups.flat(),
}));

vi.mock('@/features/kangur/server/ai-tutor-context-registry-cache', () => ({
  resolveKangurAiTutorContextRegistryBundle:
    resolveKangurAiTutorContextRegistryBundleMock,
}));

vi.mock('@/features/ai/chatbot/server', () => ({
  chatbotSessionRepository: {
    addMessage: addMessageMock,
  },
}));

vi.mock('@/features/kangur/ai-tutor/follow-up-reporting', () => ({
  summarizeKangurAiTutorFollowUpActions: () => null,
}));

vi.mock('@/features/kangur/context-registry/refs', () => ({
  buildKangurAiTutorContextRegistryRefs: () => [],
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));

vi.mock('@/features/kangur/server', () => ({
  buildKangurAiTutorLearnerMood: buildKangurAiTutorLearnerMoodMock,
  requireActiveLearner: requireActiveLearnerMock,
  resolveKangurActor: resolveKangurActorMock,
  setKangurLearnerAiTutorState: setKangurLearnerAiTutorStateMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-adaptive', () => ({
  buildKangurAiTutorAdaptiveGuidance: buildAdaptiveGuidanceMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-native-guide', () => ({
  resolveKangurAiTutorNativeGuideResolution:
    resolveKangurAiTutorNativeGuideResolutionMock,
}));

vi.mock('@/features/kangur/server/knowledge-graph/retrieval', () => ({
  resolveKangurAiTutorSemanticGraphContext:
    resolveKangurAiTutorSemanticGraphContextMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-usage', () => ({
  consumeKangurAiTutorDailyUsage: consumeKangurAiTutorDailyUsageMock,
  ensureKangurAiTutorDailyUsageAvailable:
    ensureKangurAiTutorDailyUsageAvailableMock,
}));

vi.mock('@/features/kangur/server/context-registry', () => ({
  resolveKangurAiTutorRuntimeDocuments: resolveKangurAiTutorRuntimeDocumentsMock,
}));

vi.mock('@/features/kangur/ai-tutor/settings', () => ({
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY: 'kangur.aiTutor.app',
  KANGUR_AI_TUTOR_SETTINGS_KEY: 'kangur.aiTutor.settings',
  parseKangurAiTutorSettings: parseKangurAiTutorSettingsMock,
  getKangurAiTutorSettingsForLearner: getKangurAiTutorSettingsForLearnerMock,
  resolveKangurAiTutorAvailability: resolveKangurAiTutorAvailabilityMock,
  resolveKangurAiTutorAppSettings: resolveKangurAiTutorAppSettingsMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readStoredSettingValue: readStoredSettingValueMock,
  resolveBrainExecutionConfigForCapability:
    resolveBrainExecutionConfigForCapabilityMock,
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: runBrainChatCompletionMock,
  supportsBrainJsonMode: supportsBrainJsonModeMock,
}));

vi.mock('./drawing', () => ({
  analyzeLearnerDrawingWithBrain: vi.fn(),
  buildTutorDrawingInstructions: buildTutorDrawingInstructionsMock,
  extractTutorDrawingArtifactsFromJson: vi.fn(),
  extractTutorDrawingArtifactsFromResponse: (message: string) => ({
    message,
    artifacts: [],
  }),
  shouldEnableTutorDrawingSupport: shouldEnableTutorDrawingSupportMock,
}));

vi.mock('./persona', () => ({
  buildPersonaChatMemoryContext: vi.fn(),
  persistAgentPersonaExchangeMemory: vi.fn(),
  resolveKangurPersonaSessionId: vi.fn(),
  resolvePersonaInstructions: resolvePersonaInstructionsMock,
}));

vi.mock('./runtime-overlays', () => ({
  buildSectionExplainMessage: buildSectionExplainMessageMock,
  readContextString: (value: string | null | undefined) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null,
}));

vi.mock('./section-knowledge', () => ({
  resolveKangurAiTutorSectionKnowledgeBundle:
    resolveKangurAiTutorSectionKnowledgeBundleMock,
}));

import { postKangurAiTutorChatHandler } from './handler';

describe('postKangurAiTutorChatHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    const actor = {
      ownerEmailVerified: true,
      activeLearner: {
        id: 'learner-1',
        aiTutor: null,
      },
    };
    const tutorMood = createDefaultKangurAiTutorLearnerMood();

    resolveKangurActorMock.mockResolvedValue(actor);
    requireActiveLearnerMock.mockImplementation((resolvedActor) => resolvedActor.activeLearner);
    readStoredSettingValueMock.mockResolvedValue(null);
    parseKangurAiTutorSettingsMock.mockReturnValue({});
    resolveKangurAiTutorAppSettingsMock.mockReturnValue({});
    getKangurAiTutorSettingsForLearnerMock.mockReturnValue({
      allowSelectedTextSupport: true,
      knowledgeGraphEnabled: false,
      contextRegistryMaxNodes: 0,
      contextRegistryDepth: 0,
      agentPersonaId: null,
      dailyMessageLimit: 20,
      showSources: true,
      allowLessons: true,
      allowGames: true,
      testAccessMode: 'review_after_answer_only',
      hintDepth: 'standard',
      proactiveNudges: true,
      rememberTutorContext: true,
    });
    resolveKangurAiTutorAvailabilityMock.mockReturnValue({ allowed: true });
    ensureKangurAiTutorDailyUsageAvailableMock.mockResolvedValue(undefined);
    resolveKangurAiTutorRuntimeDocumentsMock.mockReturnValue({
      learnerSnapshot: null,
      loginActivity: null,
      surfaceContext: null,
      assignmentContext: null,
    });
    resolvePersonaInstructionsMock.mockResolvedValue(null);
    buildKangurAiTutorLearnerMoodMock.mockResolvedValue(tutorMood);
    shouldEnableTutorDrawingSupportMock.mockReturnValue(false);
    buildSectionExplainMessageMock.mockReturnValue('To odpowiedź z bazy wiedzy.');
    consumeKangurAiTutorDailyUsageMock.mockResolvedValue({
      dateKey: '2026-03-24',
      messageCount: 1,
      dailyMessageLimit: 20,
      remainingMessages: 19,
    });
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'tests-question',
        title: 'Pytanie testowe',
        summary: 'Sekcja z treścią pytania konkursowego.',
        body: 'Tutaj uczeń czyta pytanie i wybiera odpowiedź.',
        pageKey: 'Tests',
        route: '/tests',
        anchorIdPrefix: 'kangur-test-question:',
        nativeGuideIds: [],
      },
      fragment: {
        id: 'kangur-q1-squares',
        text:
          'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
        explanation:
          'To zadanie sprawdza porównywanie kształtów po rozcięciu.',
        nativeGuideIds: [],
      },
      linkedNativeGuides: [],
      instructions: 'Fragment knowledge',
      sources: [
        {
          documentId: 'tests-question#fragment:kangur-q1-squares',
          collectionId: 'kangur_page_content',
          text: 'Fragment explanation',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'tests-question#fragment:kangur-q1-squares',
            title:
              'Pytanie testowe -> Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
            description:
              'To zadanie sprawdza porównywanie kształtów po rozcięciu.',
            tags: ['kangur', 'page-content'],
          },
        },
      ],
      followUpActions: [],
    });
    resolveKangurAiTutorNativeGuideResolutionMock.mockResolvedValue({
      status: 'miss',
      message: null,
      followUpActions: [],
      entryId: null,
      matchedSignals: [],
      coverageLevel: null,
    });
    resolveKangurAiTutorSemanticGraphContextMock.mockResolvedValue({
      status: 'skipped',
    });
    buildAdaptiveGuidanceMock.mockResolvedValue({
      followUpActions: [],
      coachingFrame: null,
      messagePrefix: null,
      systemPromptSupplement: null,
    });
    runBrainChatCompletionMock.mockResolvedValue({
      message: 'fallback',
      usage: null,
      model: 'test',
      provider: 'test',
    });
    supportsBrainJsonModeMock.mockReturnValue(false);
    addMessageMock.mockResolvedValue(undefined);
    setKangurLearnerAiTutorStateMock.mockResolvedValue(undefined);
    logKangurServerEventMock.mockResolvedValue(undefined);
    resolveBrainExecutionConfigForCapabilityMock.mockResolvedValue(null);
  });

  it('answers selected-text requests from page content even when interactionIntent is missing', async () => {
    const selectedText =
      'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?';
    const request = createPostRequest(
      JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Wyjaśnij zaznaczony fragment.',
          },
        ],
        context: {
          surface: 'test',
          contentId: 'suite-add-1',
          promptMode: 'selected_text',
          selectedText,
          focusKind: 'question',
          focusId: 'kangur-test-question:suite-add-1:question-add-1',
          focusLabel: 'Pytanie 1/1',
          knowledgeReference: {
            sourceCollection: 'kangur_page_content',
            sourceRecordId: 'tests-question',
            sourcePath: 'entry:tests-question',
          },
        },
      })
    );

    const response = await postKangurAiTutorChatHandler(
      request,
      createRequestContext()
    );
    const payload = await response.json();

    expect(resolveKangurAiTutorSectionKnowledgeBundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Wyjaśnij zaznaczony fragment.',
        context: expect.objectContaining({
          promptMode: 'selected_text',
          selectedText,
        }),
      })
    );
    expect(resolveKangurAiTutorNativeGuideResolutionMock).not.toHaveBeenCalled();
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      message: 'To odpowiedź z bazy wiedzy.',
      answerResolutionMode: 'page_content',
      followUpActions: [],
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.page-content.completed',
        context: expect.objectContaining({
          pageContentEntryId: 'tests-question',
          pageContentFragmentId: 'kangur-q1-squares',
        }),
      })
    );
  });
});
