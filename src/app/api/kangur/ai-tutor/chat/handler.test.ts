import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  createContextRegistryBundle,
  createPostRequest,
  createRequestContext,
} from './handler.test-support';
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
}));
vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: logKangurServerEventMock,
}));
vi.mock('@/features/kangur/server/ai-tutor-adaptive', () => ({
  buildKangurAiTutorAdaptiveGuidance: buildKangurAiTutorAdaptiveGuidanceMock,
}));
vi.mock('@/features/kangur/server/ai-tutor-native-guide', () => ({
  resolveKangurAiTutorNativeGuideResolution: resolveKangurAiTutorNativeGuideResolutionMock,
}));
vi.mock('./section-knowledge', () => ({
  resolveKangurAiTutorSectionKnowledgeBundle: resolveKangurAiTutorSectionKnowledgeBundleMock,
}));
vi.mock('@/features/kangur/server/knowledge-graph/retrieval', () => ({
  resolveKangurAiTutorSemanticGraphContext: resolveKangurWebsiteHelpGraphContextMock,
  resolveKangurWebsiteHelpGraphContext: resolveKangurWebsiteHelpGraphContextMock,
}));
vi.unmock('@/features/kangur/settings-ai-tutor');
import { postKangurAiTutorChatHandler } from './handler';
const KANGUR_AI_TUTOR_BRAIN_CAPABILITY = 'kangur_ai_tutor.chat';
const expectTutorSource = (input: {
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

describe('kangur ai tutor chat handler', () => {
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
      })
    );
    resolveBrainExecutionConfigForCapabilityMock.mockResolvedValue({
      modelId: 'brain-model-1',
      temperature: 0.2,
      maxTokens: 500,
      systemPrompt: 'Base brain prompt',
    });
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Spróbuj policzyć po kolei i sprawdź każdą cyfrę.',
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
      systemPrompt: 'Relevant persona memory:\n- Mila remembers the learner benefits from short checkpoints.',
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
            agentPersonaId: 'persona-1',
            playwrightPersonaId: null,
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
          teachingAgentId: 'legacy-teacher',
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
  it('routes tutor chat through Brain with persona instructions and structured Kangur context', async () => {
    buildKangurAiTutorAdaptiveGuidanceMock.mockResolvedValue({
      instructions:
        'Adaptive learner guidance:\nTop recommendation: Powtórz lekcję: Dodawanie.\nStructured coaching mode: hint_ladder. Use a hint ladder: give one small next step or one checkpoint question, then stop.',
      followUpActions: [],
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
        rationale:
          'Uczeń jest w trakcie próby, więc tutor powinien prowadzić bardzo małymi krokami.',
      },
    });
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 74%. 2 active assignments. 1 lesson needs practice.',
        loginActivityFacts: {
          recentLoginActivitySummary:
            'Jan last signed into Kangur at 2026-03-07T09:30:00.000Z. The parent last logged into Kangur at 2026-03-07T08:00:00.000Z. In the last 7 days there were 3 learner sign-ins and 2 parent Kangur logins.',
        },
        testFacts: {
          title: 'Kangur Mini',
          description: 'Krótki zestaw próbny.',
          currentQuestion: 'Ile to 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
        },
      })
    );
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Spójrz najpierw na to, co oznacza znak plus.',
    });
    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Pomóż mi z tym pytaniem.' }],
          context: {
            surface: 'test',
            contentId: 'suite-2026',
            questionId: 'q-1',
            selectedText: '2 + 2',
            answerRevealed: false,
            promptMode: 'hint',
          },
          memory: {
            lastSurface: 'lesson',
            lastFocusLabel: 'Dodawanie do 20',
            lastUnresolvedBlocker: 'Myli kolejność dodawania przy większych liczbach.',
            lastRecommendedAction: 'Otwórz lekcję: Powtórz lekcję: Dodawanie',
            lastSuccessfulIntervention: 'Pomogło rozbicie zadania na dwa mniejsze kroki.',
            lastCoachingMode: 'hint_ladder',
          },
        })
      ),
      createRequestContext()
    );
    expect(contextRegistryResolveRefsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        depth: 1,
        maxNodes: 24,
        refs: expect.arrayContaining([
          expect.objectContaining({
            providerId: 'kangur',
            entityType: 'kangur_learner_snapshot',
          }),
          expect.objectContaining({
            providerId: 'kangur',
            entityType: 'kangur_login_activity',
          }),
          expect.objectContaining({
            providerId: 'kangur',
            entityType: 'kangur_test_context',
          }),
        ]),
      })
    );
    expect(buildKangurAiTutorAdaptiveGuidanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: 'learner-1',
        registryBundle: expect.objectContaining({
          documents: expect.arrayContaining([
            expect.objectContaining({ entityType: 'kangur_test_context' }),
          ]),
        }),
      })
    );
    expect(buildKangurAiTutorLearnerMoodMock).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: 'learner-1',
        latestUserMessage: 'Pomóż mi z tym pytaniem.',
        personaSuggestedMoodId: 'encouraging',
      })
    );
    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenCalledWith(
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
      expect.objectContaining({
        defaultTemperature: 0.4,
        defaultMaxTokens: 600,
      })
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledTimes(1);

    const brainInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(brainInput.modelId).toBe('brain-model-1');
    expect(brainInput.messages[0]).toMatchObject({
      role: 'system',
    });
    expect(brainInput.messages[0].content).toContain('Base brain prompt');
    expect(brainInput.messages[0].content).toContain('You are Mila.');
    expect(brainInput.messages[0].content).toContain('Role: Math coach.');
    expect(brainInput.messages[0].content).toContain('Use a calm, playful tone.');
    expect(brainInput.messages[0].content).toContain(
      'Relevant persona memory:\n- Mila remembers the learner benefits from short checkpoints.'
    );
    expect(brainInput.messages[0].content).toContain('Current Kangur surface: test practice.');
    expect(brainInput.messages[0].content).toContain('Current title: Kangur Mini');
    expect(brainInput.messages[0].content).toContain('Current description: Krótki zestaw próbny.');
    expect(brainInput.messages[0].content).toContain(
      'Learner snapshot: Average accuracy 74%. 2 active assignments. 1 lesson needs practice.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Recent Kangur login activity: Jan last signed into Kangur at 2026-03-07T09:30:00.000Z. The parent last logged into Kangur at 2026-03-07T08:00:00.000Z. In the last 7 days there were 3 learner sign-ins and 2 parent Kangur logins.'
    );
    expect(brainInput.messages[0].content).toContain('Current question: Ile to 2 + 2?');
    expect(brainInput.messages[0].content).toContain('Question progress: Pytanie 1/10');
    expect(brainInput.messages[0].content).toContain('Learner selected this text: """2 + 2"""');
    expect(brainInput.messages[0].content).toContain(
      'Registry policy: Use short Socratic guidance grounded in the resolved Kangur context.'
    );
    expect(brainInput.messages[0].content).toContain(
      'The learner asked for a hint. Give only the next helpful step or one guiding question.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Do not reveal the final answer, the correct option label, or solve the problem outright.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Adaptive learner guidance:\nTop recommendation: Powtórz lekcję: Dodawanie.\nStructured coaching mode: hint_ladder. Use a hint ladder: give one small next step or one checkpoint question, then stop.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Parent preference: guide the learner step by step without giving the final answer.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Parent preference: be comfortable proactively recommending the next practice move when the learner seems stuck.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Compact learner memory from recent Kangur tutor sessions:'
    );
    expect(brainInput.messages[0].content).toContain('Recent focus: Dodawanie do 20');
    expect(brainInput.messages[0].content).toContain(
      'Last unresolved blocker: Myli kolejność dodawania przy większych liczbach.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Learner-specific tutor mood: supportive.'
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        service: 'kangur.ai-tutor',
        statusCode: 200,
        context: expect.objectContaining({
          surface: 'test',
          contentId: 'suite-2026',
          promptMode: 'hint',
          brainCapability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
          retrievedSourceCount: 1,
          returnedSourceCount: 1,
          showSources: true,
          adaptiveGuidanceApplied: true,
          hintDepth: 'step_by_step',
          proactiveNudges: 'coach',
          rememberTutorContext: true,
          contextRegistryRefCount: 3,
          contextRegistryDocumentCount: 3,
          coachingMode: 'hint_ladder',
          hasLearnerMemory: true,
          personaId: 'persona-1',
          suggestedPersonaMoodId: 'encouraging',
          personaMemorySessionId: 'kangur-persona-session-1',
          tutorMoodId: 'supportive',
          tutorBaselineMoodId: 'encouraging',
          tutorMoodReasonCode: 'learner_confusion',
          tutorMoodConfidence: 0.72,
          dailyUsageCount: 0,
          usageDateKey: '2026-03-07',
        }),
      })
    );
    expect(chatbotSessionFindSessionIdByPersonaAndTitleMock).toHaveBeenCalledWith(
      'Kangur AI Tutor · Mila · learner:learner-1',
      'persona-1'
    );
    expect(chatbotSessionCreateMock).toHaveBeenCalledWith({
        title: 'Kangur AI Tutor · Mila · learner:learner-1',
        userId: null,
        personaId: 'persona-1',
        messages: [],
        messageCount: 0,
        settings: {
          personaId: 'persona-1',
        },
    });
    expect(chatbotSessionAddMessageMock).toHaveBeenCalledTimes(2);
    expect(chatbotSessionAddMessageMock).toHaveBeenNthCalledWith(
      1,
      'kangur-persona-session-1',
      expect.objectContaining({
        role: 'user',
        content: 'Pomóż mi z tym pytaniem.',
        metadata: expect.objectContaining({
          source: 'kangur_ai_tutor',
          learnerId: 'learner-1',
          contentId: 'suite-2026',
          questionId: 'q-1',
          promptMode: 'hint',
        }),
      })
    );
    expect(chatbotSessionAddMessageMock).toHaveBeenNthCalledWith(
      2,
      'kangur-persona-session-1',
      expect.objectContaining({
        role: 'assistant',
        content: 'Spójrz najpierw na to, co oznacza znak plus.',
        metadata: expect.objectContaining({
          source: 'kangur_ai_tutor',
          learnerId: 'learner-1',
          suggestedPersonaMoodId: 'encouraging',
          moodHints: ['encouraging'],
        }),
      })
    );
    expect(persistAgentPersonaExchangeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: 'persona-1',
        sourceType: 'chat_message',
        sourceLabel: 'Kangur test · suite-2026',
        sessionId: 'kangur-persona-session-1',
        userMessage: 'Pomóż mi z tym pytaniem.',
        assistantMessage: 'Spójrz najpierw na to, co oznacza znak plus.',
        tags: ['kangur', 'test', 'hint'],
        moodHints: ['encouraging'],
      })
    );
    expect(setKangurLearnerAiTutorStateMock).toHaveBeenCalledWith('learner-1', {
      currentMoodId: 'supportive',
      baselineMoodId: 'encouraging',
      confidence: 0.72,
      lastComputedAt: '2026-03-07T10:00:00.000Z',
      lastReasonCode: 'learner_confusion',
    });
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Spójrz najpierw na to, co oznacza znak plus.',
      answerResolutionMode: 'brain',
      followUpActions: [],
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
        rationale: 'Uczeń jest w trakcie próby, więc tutor powinien prowadzić bardzo małymi krokami.',
      },
      suggestedMoodId: 'encouraging',
      tutorMood: {
        currentMoodId: 'supportive',
        baselineMoodId: 'encouraging',
        confidence: 0.72,
        lastComputedAt: '2026-03-07T10:00:00.000Z',
        lastReasonCode: 'learner_confusion',
      },
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).toEqual(
      expectTutorSource({
        documentId: 'runtime:kangur:test:learner-1:suite-1:q-1:active',
        title: 'Kangur Mini',
        description: 'Krótki zestaw próbny.',
        tags: ['kangur', 'test'],
      })
    );
    expect(body.sources[0].text).toContain('Krótki zestaw próbny.');
    expect(body.sources[0].text).toContain('Ile to 2 + 2?');
  });

  it('extracts tutor drawing artifacts from the model response and strips the drawing block from persisted text', async () => {
    runBrainChatCompletionMock
      .mockResolvedValueOnce({
        text: 'Widac dwie grupy kropek ustawione obok siebie.',
      })
      .mockResolvedValueOnce({
        text: [
          'Policz najpierw lewą parę, potem prawą.',
          '<kangur_tutor_drawing>',
          '<title>Dwie pary</title>',
          '<caption>Każda para ma po dwa elementy.</caption>',
          '<alt>Dwie pary kropek ustawione obok siebie.</alt>',
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><circle cx="90" cy="90" r="18" fill="#f59e0b" /><circle cx="130" cy="90" r="18" fill="#f59e0b" /></svg>',
          '</kangur_tutor_drawing>',
        ].join('\n'),
      });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Wyjaśnij to rysunkiem.',
              artifacts: [
                {
                  type: 'user_drawing',
                  imageDataUrl: 'data:image/png;base64,AAA',
                },
              ],
            },
          ],
          context: {
            surface: 'lesson',
            contentId: 'lesson-1',
            title: 'Dodawanie obrazkami',
            promptMode: 'explain',
            drawingImageData: 'data:image/png;base64,AAA',
          },
        })
      ),
      createRequestContext()
    );

    expect(runBrainChatCompletionMock).toHaveBeenCalledTimes(2);
    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenNthCalledWith(
      1,
      'kangur_ai_tutor.drawing_analysis',
      expect.objectContaining({
        runtimeKind: 'vision',
      })
    );
    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenNthCalledWith(
      2,
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
      expect.objectContaining({
        runtimeKind: 'chat',
      })
    );
    const drawingAnalysisInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(drawingAnalysisInput?.messages?.[1]?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text' }),
        expect.objectContaining({
          type: 'image_url',
          image_url: expect.objectContaining({
            url: 'data:image/png;base64,AAA',
          }),
        }),
      ])
    );
    const tutorReplyInput = runBrainChatCompletionMock.mock.calls[1]?.[0];
    expect(tutorReplyInput?.messages?.[0]?.content).toContain('Drawing support:');
    expect(tutorReplyInput?.messages?.[0]?.content).toContain(
      'Learner drawing analysis summary:'
    );
    expect(resolveKangurAiTutorNativeGuideResolutionMock).not.toHaveBeenCalled();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Policz najpierw lewą parę, potem prawą.',
      artifacts: [
        {
          type: 'assistant_drawing',
          title: 'Dwie pary',
          caption: 'Każda para ma po dwa elementy.',
          alt: 'Dwie pary kropek ustawione obok siebie.',
        },
      ],
    });
    expect(body.artifacts[0]?.svgContent).toContain('<svg');
    expect(persistAgentPersonaExchangeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantMessage: 'Policz najpierw lewą parę, potem prawą.',
      })
    );
  });

  it('builds structured game tutor context from the live request when the registry has no game surface document', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 81%. 1 active assignment.',
      })
    );
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Najpierw dolicz 3 do 7, a potem jeszcze 2.',
    });
    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Poproszę wskazówkę.' }],
          context: {
            surface: 'game',
            contentId: 'game',
            title: 'Trening dodawania',
            description: 'Krótki trening z dodawania do 20.',
            masterySummary: 'Dodawanie mastery 68% po 3 próbach.',
            assignmentId: 'assignment-1',
            assignmentSummary: 'Trening: dodawanie do 20.',
            currentQuestion: 'Ile to 7 + 5?',
            questionId: 'game-q-2',
            questionProgressLabel: 'Pytanie 2/10',
            promptMode: 'hint',
            answerRevealed: false,
          },
        })
      ),
      createRequestContext()
    );
    const brainInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(brainInput.messages[0].content).toContain('Current Kangur surface: game practice.');
    expect(brainInput.messages[0].content).toContain('Current title: Trening dodawania');
    expect(brainInput.messages[0].content).toContain(
      'Current description: Krótki trening z dodawania do 20.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Learner snapshot: Average accuracy 81%. 1 active assignment.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Learner mastery snapshot: Dodawanie mastery 68% po 3 próbach.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Active assignment or focus: Trening: dodawanie do 20.'
    );
    expect(brainInput.messages[0].content).toContain('Current question: Ile to 7 + 5?');
    expect(brainInput.messages[0].content).toContain('Question progress: Pytanie 2/10');
    expect(brainInput.messages[0].content).toContain(
      'The learner is in an active practice question. Do not reveal the final answer or solve the problem outright.'
    );
    expect(persistAgentPersonaExchangeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceLabel: 'Kangur game · game',
        tags: ['kangur', 'game', 'hint'],
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Najpierw dolicz 3 do 7, a potem jeszcze 2.',
      followUpActions: [],
      suggestedMoodId: 'encouraging',
      tutorMood: {
        currentMoodId: 'supportive',
        baselineMoodId: 'encouraging',
        confidence: 0.72,
        lastComputedAt: '2026-03-07T10:00:00.000Z',
        lastReasonCode: 'learner_confusion',
      },
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).toEqual(
      expectTutorSource({
        documentId: 'runtime:kangur:game:game:game-q-2:active',
        title: 'Trening dodawania',
        description: 'Active game question Pytanie 2/10.',
        tags: ['kangur', 'game', 'ai-tutor'],
      })
    );
    expect(body.sources[0].text).toContain('Trening dodawania');
    expect(body.sources[0].text).toContain('Ile to 7 + 5?');
  });
  it('logs a coverage-gap warning when a section-specific explain request falls back to an overview guide entry', async () => {
    resolveKangurAiTutorNativeGuideResolutionMock.mockResolvedValue({
      status: 'hit',
      message: 'Ekran lekcji.\n\nTo tutaj uczen przechodzi przez temat krok po kroku.',
      followUpActions: [],
      entryId: 'lesson-overview',
      matchedSignals: ['surface'],
      coverageLevel: 'overview_fallback',
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij ten fragment.' }],
          context: {
            surface: 'lesson',
            contentId: 'lesson-1',
            title: 'Dodawanie',
            promptMode: 'explain',
            focusKind: 'question',
            focusId: 'lesson-question-1',
            questionId: 'lesson-question-1',
            currentQuestion: 'Ile to 2 + 2?',
          },
        })
      ),
      createRequestContext()
    );

    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.native-guide.coverage-gap',
        context: expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-1',
          focusKind: 'question',
          focusId: 'lesson-question-1',
          nativeGuideCoverageLevel: 'overview_fallback',
          nativeGuideEntryId: 'lesson-overview',
          knowledgeGraphRecallStrategy: null,
          knowledgeGraphLexicalHitCount: 0,
          knowledgeGraphVectorHitCount: 0,
          knowledgeGraphVectorRecallAttempted: false,
        }),
      })
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.native-guide.completed',
        context: expect.objectContaining({
          nativeGuideCoverageLevel: 'overview_fallback',
          nativeGuideEntryId: 'lesson-overview',
          knowledgeGraphRecallStrategy: null,
          knowledgeGraphLexicalHitCount: 0,
          knowledgeGraphVectorHitCount: 0,
          knowledgeGraphVectorRecallAttempted: false,
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('Ekran lekcji');
  });

  it('returns websiteHelpTarget for native-guide answers when graph retrieval resolves a target', async () => {
    resolveKangurAiTutorNativeGuideResolutionMock.mockResolvedValue({
      status: 'hit',
      message: 'Kliknij Zaloguj się w górnej nawigacji.',
      followUpActions: [],
      entryId: 'auth-login-help',
      matchedSignals: ['surface', 'message'],
      coverageLevel: 'exact',
    });
    resolveKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'hit',
      queryMode: 'website_help',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      instructions:
        'Kangur website-help graph context:\n- Sign in flow [flow]\n  Website target: / · anchor=kangur-primary-nav-login',
      nodeIds: ['flow:kangur:sign-in'],
      websiteHelpTarget: {
        nodeId: 'flow:kangur:sign-in',
        label: 'Sign in flow',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
      sourceCollections: ['kangur_ai_tutor_content'],
      hydrationSources: ['kangur_ai_tutor_content'],
      sources: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Jak sie zalogowac?' }],
          context: {
            surface: 'auth',
            contentId: 'login',
            promptMode: 'chat',
            focusKind: 'login_action',
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.websiteHelpTarget).toEqual({
      nodeId: 'flow:kangur:sign-in',
      label: 'Sign in flow',
      route: '/',
      anchorId: 'kangur-primary-nav-login',
    });
    expect(body.answerResolutionMode).toBe('native_guide');
    expect(body.knowledgeGraph).toEqual({
      applied: true,
      queryMode: 'website_help',
      queryStatus: 'hit',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      websiteHelpApplied: true,
      websiteHelpTargetNodeId: 'flow:kangur:sign-in',
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.native-guide.completed',
        context: expect.objectContaining({
          knowledgeGraphRecallStrategy: 'metadata_only',
          knowledgeGraphLexicalHitCount: 1,
          knowledgeGraphVectorHitCount: 0,
          knowledgeGraphVectorRecallAttempted: false,
          websiteHelpGraphApplied: true,
          websiteHelpGraphTargetNodeId: 'flow:kangur:sign-in',
          websiteHelpGraphTargetRoute: '/',
          websiteHelpGraphTargetAnchorId: 'kangur-primary-nav-login',
        }),
      })
    );
  });

  it('answers section explain requests directly from page-content knowledge when Zapytaj o to resolves a page-content reference', async () => {
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'game-home-actions',
        pageKey: 'Game',
        screenKey: 'home',
        surface: 'game',
        route: '/game',
        componentId: 'home-actions',
        widget: 'KangurGameHomeActionsWidget',
        sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
        title: 'Szybkie akcje',
        summary: 'Tutaj wybierasz, do której aktywności chcesz przejść dalej.',
        body: 'Sekcja prowadzi bezposrednio do lekcji, szybkiej gry, treningu mieszanego i Kangura Matematycznego.',
        anchorIdPrefix: 'kangur-game-home-actions',
        focusKind: 'home_actions',
        contentIdPrefixes: ['game:home'],
        nativeGuideIds: ['shared-home-actions'],
        triggerPhrases: ['szybkie akcje'],
        tags: ['page-content', 'game'],
        notes: 'Sekcja startowa gry.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [
        {
          id: 'shared-home-actions',
          surface: 'game',
          focusKind: 'home_actions',
          focusIdPrefixes: ['kangur-game-home-actions'],
          contentIdPrefixes: ['game:home'],
          title: 'Szybkie akcje',
          shortDescription: 'Pomagaja wejsc od razu do wlasciwego trybu pracy.',
          fullDescription: 'Ta karta zbiera najkrótsze przejścia do głównych aktywności Kangura.',
          hints: [],
          relatedGames: [],
          relatedTests: [],
          followUpActions: [
            { id: 'open-lessons', label: 'Otwórz lekcję', page: 'Lessons', reason: 'Aby zacząć od teorii.' },
          ],
          triggerPhrases: ['szybkie akcje'],
          enabled: true,
          sortOrder: 10,
        },
      ],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'game-home-actions',
          collectionId: 'kangur_page_content',
          text: 'Szybkie akcje\nTutaj wybierasz, do której aktywności chcesz przejść dalej.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'game-home-actions',
            title: 'Szybkie akcje',
            description: 'Tutaj wybierasz, do której aktywności chcesz przejść dalej.',
            tags: ['kangur', 'page-content', 'game'],
          },
        },
      ],
      followUpActions: [
        { id: 'open-lessons', label: 'Otwórz lekcję', page: 'Lessons', reason: 'Aby zacząć od teorii.' },
      ],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Powiedz mi o tej sekcji.' }],
          context: {
            surface: 'game',
            contentId: 'game:home',
            promptMode: 'explain',
            focusKind: 'home_actions',
            focusId: 'kangur-game-home-actions',
            focusLabel: 'Szybkie akcje',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'game-home-actions',
              sourcePath: 'entry:game-home-actions',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(resolveKangurAiTutorSectionKnowledgeBundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Powiedz mi o tej sekcji.',
        context: expect.objectContaining({
          knowledgeReference: {
            sourceCollection: 'kangur_page_content',
            sourceRecordId: 'game-home-actions',
            sourcePath: 'entry:game-home-actions',
          },
        }),
      })
    );
    expect(resolveKangurAiTutorNativeGuideResolutionMock).not.toHaveBeenCalled();
    expect(resolveKangurWebsiteHelpGraphContextMock).not.toHaveBeenCalled();
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.message).toContain('Szybkie akcje.');
    expect(body.message).toContain('Tutaj wybierasz, do której aktywności chcesz przejść dalej.');
    expect(body.message).toContain(
      'Sekcja prowadzi bezposrednio do lekcji, szybkiej gry, treningu mieszanego i Kangura Matematycznego.'
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'game-home-actions',
        }),
      ])
    );
    expect(body.followUpActions).toEqual([
      { id: 'open-lessons', label: 'Otwórz lekcję', page: 'Lessons', reason: 'Aby zacząć od teorii.' },
    ]);
    expect(body.answerResolutionMode).toBe('page_content');
    expect(body.knowledgeGraph).toEqual({
      applied: false,
      queryMode: null,
      queryStatus: 'skipped',
      recallStrategy: null,
      lexicalHitCount: 0,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      websiteHelpApplied: false,
      websiteHelpTargetNodeId: null,
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.page-content.completed',
        context: expect.objectContaining({
          pageContentEntryId: 'game-home-actions',
          linkedNativeGuideIds: ['shared-home-actions'],
          knowledgeGraphApplied: false,
        }),
      })
    );
  });

  it('answers selected-text explain requests directly from a matched page-content fragment', async () => {
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      fragment: {
        id: 'leaderboard-points',
        text: 'Liczba punktów',
        aliases: ['punkty'],
        explanation:
          'Ten tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
        nativeGuideIds: ['shared-leaderboard-points'],
        triggerPhrases: ['punkty'],
        enabled: true,
        sortOrder: 10,
      },
      section: {
        id: 'game-home-leaderboard',
        pageKey: 'Game',
        screenKey: 'home',
        surface: 'game',
        route: '/game',
        componentId: 'leaderboard',
        widget: 'Leaderboard',
        sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
        title: 'Ranking',
        summary: 'Porównaj wynik z innymi graczami.',
        body: 'Sekcja pokazuje najlepsze wyniki na tej planszy.',
        anchorIdPrefix: 'kangur-game-leaderboard',
        focusKind: 'leaderboard',
        contentIdPrefixes: ['game:home'],
        nativeGuideIds: ['shared-leaderboard'],
        triggerPhrases: ['ranking'],
        tags: ['page-content', 'game'],
        fragments: [],
        notes: 'Ranking głównej planszy.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [
        {
          id: 'shared-leaderboard-points',
          surface: 'game',
          focusKind: 'leaderboard',
          focusIdPrefixes: ['kangur-game-leaderboard'],
          contentIdPrefixes: ['game:home'],
          title: 'Punkty w rankingu',
          shortDescription: 'Wyjaśnia, jak czytać liczbę punktów na liście wyników.',
          fullDescription: 'Liczba punktów wpływa na pozycję ucznia w rankingu.',
          hints: [],
          relatedGames: [],
          relatedTests: [],
          followUpActions: [],
          triggerPhrases: ['punkty'],
          enabled: true,
          sortOrder: 20,
        },
      ],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'game-home-leaderboard#fragment:leaderboard-points',
          collectionId: 'kangur_page_content',
          text: 'Ranking\nLiczba punktów\nTen tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'game-home-leaderboard#fragment:leaderboard-points',
            title: 'Ranking -> Liczba punktów',
            description:
              'Ten tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.',
            tags: ['kangur', 'page-content', 'page-content-fragment', 'game'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij ten fragment.' }],
          context: {
            surface: 'game',
            contentId: 'game:home',
            promptMode: 'selected_text',
            selectedText: 'Liczba punktów',
            focusKind: 'leaderboard',
            focusId: 'kangur-game-leaderboard',
            focusLabel: 'Ranking',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'game-home-leaderboard',
              sourcePath: 'entry:game-home-leaderboard',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(resolveKangurAiTutorSectionKnowledgeBundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Wyjaśnij ten fragment.',
        context: expect.objectContaining({
          promptMode: 'selected_text',
          selectedText: 'Liczba punktów',
        }),
      })
    );
    expect(resolveKangurAiTutorNativeGuideResolutionMock).not.toHaveBeenCalled();
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.message).toContain('Ranking.');
    expect(body.message).toContain('Zaznaczony fragment: "Liczba punktów".');
    expect(body.message).toContain(
      'Ten tekst pokazuje wynik używany do ustawienia pozycji ucznia w rankingu.'
    );
    expect(body.message).not.toContain('Sekcja pokazuje najlepsze wyniki na tej planszy.');
    expect(body.answerResolutionMode).toBe('page_content');
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.page-content.completed',
        context: expect.objectContaining({
          pageContentEntryId: 'game-home-leaderboard',
          pageContentFragmentId: 'leaderboard-points',
        }),
      })
    );
  });

  it('adds live runtime overlays to direct page-content section answers for dynamic widgets', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 81%. 1 active assignment.',
        assignmentFacts: {
          title: 'Priorytet tygodnia',
          assignmentSummary: 'Powtórz lekcję: Dodawanie przed piątkiem.',
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'learner-profile-assignments',
        pageKey: 'LearnerProfile',
        screenKey: 'overview',
        surface: 'profile',
        route: '/profile',
        componentId: 'assignments',
        widget: 'LearnerAssignmentsWidget',
        sourcePath: 'src/features/kangur/ui/pages/LearnerProfile.tsx',
        title: 'Przebieg przydzielonych zadań',
        summary: 'Sprawdź, co jest nadal aktywne i co było ostatnim sukcesem.',
        body: 'Ta sekcja pokazuje aktualne zadania ucznia i pomaga wybrać najbliższy krok.',
        anchorIdPrefix: 'kangur-learner-profile-assignments',
        focusKind: 'assignment',
        contentIdPrefixes: ['profile:learner'],
        nativeGuideIds: ['learner-profile-assignments'],
        triggerPhrases: ['zadania ucznia'],
        tags: ['page-content', 'profile'],
        notes: 'Dynamiczna sekcja zadań ucznia.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'learner-profile-assignments',
          collectionId: 'kangur_page_content',
          text: 'Przebieg przydzielonych zadań\nSprawdź, co jest nadal aktywne i co było ostatnim sukcesem.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'learner-profile-assignments',
            title: 'Przebieg przydzielonych zadań',
            description: 'Sprawdź, co jest nadal aktywne i co było ostatnim sukcesem.',
            tags: ['kangur', 'page-content', 'profile'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi te zadania.' }],
          context: {
            surface: 'profile',
            contentId: 'profile:learner',
            promptMode: 'explain',
            focusKind: 'assignment',
            focusId: 'kangur-learner-profile-assignments',
            focusLabel: 'Zadania ucznia',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'learner-profile-assignments',
              sourcePath: 'entry:learner-profile-assignments',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.message).toContain('Przebieg przydzielonych zadań');
    expect(body.message).toContain(
      'Na żywo dla tego ucznia: Average accuracy 81%. 1 active assignment.'
    );
    expect(body.message).toContain(
      'Aktywny priorytet: Powtórz lekcję: Dodawanie przed piątkiem.'
    );
    expect(body.answerResolutionMode).toBe('page_content');
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'learner-profile-assignments',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:assignment:learner-1:assignment-1',
        }),
      ])
    );
  });

  it('adds live recommendation overlays to direct page-content answers for learner overview sections', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 88%. 0 active assignments.',
        learnerFacts: {
          topRecommendationTitle: 'Powtórz lekcję: Dodawanie',
          topRecommendationDescription:
            'Jedna krótka powtórka domknie kolejny próg mistrzostwa.',
          topRecommendationActionLabel: 'Otwórz lekcję',
          topRecommendationActionPage: 'Lessons',
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'profile-hero',
        pageKey: 'LearnerProfile',
        screenKey: 'profile',
        surface: 'profile',
        route: '/profile',
        componentId: 'hero',
        widget: 'KangurLearnerProfileHeroWidget',
        sourcePath: 'src/features/kangur/ui/pages/LearnerProfile.tsx',
        title: 'Hero profilu ucznia',
        summary: 'To główna sekcja profilu z szybkim obrazem postępu.',
        body: 'Pomaga szybko ocenić rytm nauki ucznia i najważniejsze dalsze kroki.',
        anchorIdPrefix: 'kangur-profile-hero',
        focusKind: 'hero',
        contentIdPrefixes: ['profile:learner'],
        nativeGuideIds: ['profile-hero'],
        triggerPhrases: ['profil ucznia'],
        tags: ['page-content', 'profile'],
        notes: 'Główny hero profilu ucznia.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'profile-hero',
          collectionId: 'kangur_page_content',
          text: 'Hero profilu ucznia\nTo główna sekcja profilu z szybkim obrazem postępu.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'profile-hero',
            title: 'Hero profilu ucznia',
            description: 'To główna sekcja profilu z szybkim obrazem postępu.',
            tags: ['kangur', 'page-content', 'profile'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi ten hero.' }],
          context: {
            surface: 'profile',
            contentId: 'profile:learner',
            promptMode: 'explain',
            focusKind: 'hero',
            focusId: 'kangur-profile-hero',
            focusLabel: 'Hero profilu ucznia',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'profile-hero',
              sourcePath: 'entry:profile-hero',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Hero profilu ucznia');
    expect(body.message).toContain(
      'Najlepszy następny krok: Powtórz lekcję: Dodawanie.'
    );
    expect(body.message).toContain(
      'Najprostsza akcja teraz: Otwórz lekcję w widoku Lessons.'
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'profile-hero',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:learner:learner-1',
        }),
      ])
    );
    const learnerSnapshotSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:learner:learner-1'
    );
    expect(learnerSnapshotSource?.text).toContain('Powtórz lekcję: Dodawanie');
  });

  it('adds live completion overlays to direct page-content answers for finished review sections', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(createContextRegistryBundle());
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'game-review',
        pageKey: 'Game',
        screenKey: 'result',
        surface: 'game',
        route: '/game',
        componentId: 'result-summary',
        widget: 'KangurGameResultWidget',
        sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
        title: 'Podsumowanie wyniku gry',
        summary: 'Ta sekcja zbiera wynik rundy i najważniejsze nagrody.',
        body: 'Pomaga zrozumieć rezultat i zdecydować, czy wracać do treningu, czy przejść dalej.',
        anchorIdPrefix: 'kangur-game-result-summary',
        focusKind: 'review',
        contentIdPrefixes: ['game:result'],
        nativeGuideIds: ['game-review'],
        triggerPhrases: ['wynik rundy'],
        tags: ['page-content', 'game'],
        notes: 'Podsumowanie po zakonczeniu gry.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'game-review',
          collectionId: 'kangur_page_content',
          text: 'Podsumowanie wyniku gry\nTa sekcja zbiera wynik rundy i najważniejsze nagrody.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'game-review',
            title: 'Podsumowanie wyniku gry',
            description: 'Ta sekcja zbiera wynik rundy i najważniejsze nagrody.',
            tags: ['kangur', 'page-content', 'game'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi ten wynik.' }],
          context: {
            surface: 'game',
            contentId: 'game:result',
            title: 'Podsumowanie wyniku',
            description: 'Final tej rundy z wynikiem i nagrodami.',
            assignmentSummary: 'Misja dnia - 2/3 wykonane.',
            questionProgressLabel: 'Wynik 7/10',
            answerRevealed: true,
            promptMode: 'explain',
            focusKind: 'review',
            focusId: 'kangur-game-result-summary',
            focusLabel: 'Podsumowanie wyniku gry',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'game-review',
              sourcePath: 'entry:game-review',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Podsumowanie wyniku gry');
    expect(body.message).toContain('Aktualny stan tej sekcji: Wynik 7/10.');
    expect(body.answerResolutionMode).toBe('page_content');
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'game-review',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:game:game:result:summary:revealed',
        }),
      ])
    );
    const gameSummarySource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:game:game:result:summary:revealed'
    );
    expect(gameSummarySource?.text).toContain('Wynik 7/10');
  });

  it('adds recent-session and operation overlays to profile performance section answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 84%. 2 active days this week.',
        learnerSections: [
          {
            id: 'recent_sessions',
            kind: 'items',
            title: 'Recent practice',
            items: [
              {
                id: 'session-1',
                operationLabel: 'Zegar',
                accuracyPercent: 83,
                score: 5,
                totalQuestions: 6,
                xpEarned: 28,
              },
            ],
          },
          {
            id: 'operation_performance',
            kind: 'items',
            title: 'Performance by operation',
            items: [
              {
                operation: 'addition',
                label: 'Dodawanie',
                averageAccuracy: 91,
                attempts: 3,
              },
              {
                operation: 'clock',
                label: 'Zegar',
                averageAccuracy: 68,
                attempts: 2,
              },
            ],
          },
        ],
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'profile-performance',
        pageKey: 'LearnerProfile',
        screenKey: 'profile',
        surface: 'profile',
        route: '/profile',
        componentId: 'performance',
        widget: 'KangurLearnerProfilePerformanceWidget',
        sourcePath: 'src/features/kangur/ui/pages/LearnerProfile.tsx',
        title: 'Skuteczność ucznia',
        summary: 'Ta sekcja pokazuje aktywność siedmiu dni i wyniki dla operacji.',
        body: 'Pomaga sprawdzić rytm gry oraz to, które operacje idą najlepiej, a które wymagają powtórki.',
        anchorIdPrefix: 'kangur-profile-performance',
        focusKind: 'summary',
        contentIdPrefixes: ['profile:learner'],
        nativeGuideIds: ['profile-performance'],
        triggerPhrases: ['skuteczność ucznia'],
        tags: ['page-content', 'profile'],
        notes: 'Sekcja skuteczności ucznia.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'profile-performance',
          collectionId: 'kangur_page_content',
          text: 'Skuteczność ucznia\nTa sekcja pokazuje aktywność siedmiu dni i wyniki dla operacji.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'profile-performance',
            title: 'Skuteczność ucznia',
            description: 'Ta sekcja pokazuje aktywność siedmiu dni i wyniki dla operacji.',
            tags: ['kangur', 'page-content', 'profile'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi te statystyki.' }],
          context: {
            surface: 'profile',
            contentId: 'profile:learner',
            promptMode: 'explain',
            focusKind: 'summary',
            focusId: 'kangur-profile-performance',
            focusLabel: 'Skuteczność ucznia',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'profile-performance',
              sourcePath: 'entry:profile-performance',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Ostatnia sesja: Zegar (83% skutecznosci, 5/6, +28 XP).');
    expect(body.message).toContain(
      'Najmocniejsza operacja teraz: Dodawanie ze srednia skutecznoscia 91%.'
    );
    expect(body.message).toContain(
      'Najwiecej pracy wymaga: Zegar ze srednia skutecznoscia 68% po 2 probach.'
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'profile-performance',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:learner:learner-1',
        }),
      ])
    );
    const learnerSnapshotSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:learner:learner-1'
    );
    expect(learnerSnapshotSource?.text).toContain('Latest session: Zegar.');
    expect(learnerSnapshotSource?.text).toContain('Strongest operation: Dodawanie at 91%.');
  });

  it('adds recent-session overlays to parent dashboard score answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 82%. 6 sessions in the last week.',
        learnerSections: [
          {
            id: 'recent_sessions',
            kind: 'items',
            title: 'Recent practice',
            items: [
              {
                id: 'session-2',
                operationLabel: 'Dodawanie',
                accuracyPercent: 90,
                score: 9,
                totalQuestions: 10,
                xpEarned: 18,
              },
            ],
          },
        ],
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'parent-dashboard-scores',
        pageKey: 'ParentDashboard',
        screenKey: 'dashboard',
        surface: 'parent_dashboard',
        route: '/parent',
        componentId: 'scores-tab',
        widget: 'KangurParentDashboardScoresWidget',
        sourcePath: 'src/features/kangur/ui/pages/ParentDashboard.tsx',
        title: 'Wyniki ucznia w dashboardzie rodzica',
        summary: 'Ta sekcja pokazuje najnowsze wyniki i historie gier ucznia.',
        body: 'Pomaga rodzicowi zobaczyc ostatnie podejscia i stabilnosc gry dziecka.',
        anchorIdPrefix: 'kangur-parent-dashboard-scores',
        focusKind: 'summary',
        contentIdPrefixes: ['parent-dashboard:learner-1:scores'],
        nativeGuideIds: ['parent-dashboard-scores'],
        triggerPhrases: ['wyniki ucznia'],
        tags: ['page-content', 'parent-dashboard'],
        notes: 'Zakladka wynikow w panelu rodzica.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'parent-dashboard-scores',
          collectionId: 'kangur_page_content',
          text: 'Wyniki ucznia w dashboardzie rodzica\nTa sekcja pokazuje najnowsze wyniki i historie gier ucznia.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'parent-dashboard-scores',
            title: 'Wyniki ucznia w dashboardzie rodzica',
            description: 'Ta sekcja pokazuje najnowsze wyniki i historie gier ucznia.',
            tags: ['kangur', 'page-content', 'parent-dashboard'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co pokazuje ta zakladka wynikow?' }],
          context: {
            surface: 'parent_dashboard',
            contentId: 'parent-dashboard:learner-1:scores',
            promptMode: 'explain',
            focusKind: 'summary',
            focusId: 'kangur-parent-dashboard-scores',
            focusLabel: 'Wyniki ucznia',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'parent-dashboard-scores',
              sourcePath: 'entry:parent-dashboard-scores',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain(
      'Ostatnia sesja: Dodawanie (90% skutecznosci, 9/10, +18 XP).'
    );
    expect(body.answerResolutionMode).toBe('page_content');
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectionId: 'kangur_page_content',
          documentId: 'parent-dashboard-scores',
        }),
        expect.objectContaining({
          collectionId: 'kangur-runtime-context',
          documentId: 'runtime:kangur:learner:learner-1',
        }),
      ])
    );
  });

  it('adds lesson document overlays to direct page-content lesson document answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Dodawanie',
          description: 'Licz dwa zbiory razem.',
          masterySummary: 'Dodawanie mastery 68% after 3 attempts.',
          documentSummary:
            'Dodawanie to łączenie dwóch liczb. Policz elementy po kolei i porównaj wynik z ilustracją.',
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'lesson-document',
        pageKey: 'Lessons',
        screenKey: 'active',
        surface: 'lesson',
        route: '/lessons',
        componentId: 'active-document',
        widget: 'KangurLessonDocumentRenderer',
        sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
        title: 'Materiał lekcji',
        summary: 'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
        body: 'Ta sekcja trzyma główną treść aktywnej lekcji i jej przykłady.',
        anchorIdPrefix: 'kangur-lesson-document',
        focusKind: 'document',
        contentIdPrefixes: ['adding'],
        nativeGuideIds: ['lesson-document'],
        triggerPhrases: ['materiał lekcji'],
        tags: ['page-content', 'lesson'],
        notes: 'Główny dokument lekcji.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'lesson-document',
          collectionId: 'kangur_page_content',
          text: 'Materiał lekcji\nCzytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'lesson-document',
            title: 'Materiał lekcji',
            description:
              'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
            tags: ['kangur', 'page-content', 'lesson'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi ten materiał.' }],
          context: {
            surface: 'lesson',
            contentId: 'adding',
            promptMode: 'explain',
            focusKind: 'document',
            focusId: 'kangur-lesson-document:adding',
            focusLabel: 'Dodawanie',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'lesson-document',
              sourcePath: 'entry:lesson-document',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Materiał lekcji: Dodawanie.');
    expect(body.message).toContain(
      'Z treści tej lekcji teraz: Dodawanie to łączenie dwóch liczb. Policz elementy po kolei i porównaj wynik z ilustracją.'
    );
    expect(body.message).toContain(
      'Aktualny obraz opanowania: Dodawanie mastery 68% after 3 attempts.'
    );
    const lessonSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:lesson:learner-1:lesson-1'
    );
    expect(lessonSource?.text).toContain('Dodawanie to łączenie dwóch liczb.');
  });

  it('answers selected-text lesson document explains from runtime lesson snippet cards when no page-content fragment exists', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Zegar',
          description: 'Nauka odczytywania godzin.',
          masterySummary: 'Zegar mastery 68% after 3 attempts.',
          documentSummary:
            'Co pokazuje krótka wskazówka? Krótka wskazówka pokazuje godzinę na tarczy.',
          documentSnippetCards: [
            {
              id: 'page-1:title',
              text: 'Co pokazuje krótka wskazówka?',
              explanation: 'Krótka wskazówka pokazuje godzinę.',
            },
            {
              id: 'block-1:text',
              text: 'Krótka wskazówka pokazuje godzinę na tarczy.',
              explanation:
                'Najpierw patrz na krótką wskazówkę, bo ona pokazuje godzinę.',
            },
          ],
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'lessons-active-document',
        pageKey: 'Lessons',
        screenKey: 'active',
        surface: 'lesson',
        route: '/lessons',
        componentId: 'active-document',
        widget: 'KangurLessonDocumentRenderer',
        sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
        title: 'Materiał lekcji',
        summary: 'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
        body: 'Ta sekcja trzyma główną treść aktywnej lekcji i jej przykłady.',
        anchorIdPrefix: 'kangur-lesson-document',
        focusKind: 'document',
        contentIdPrefixes: ['clock'],
        nativeGuideIds: ['lesson-document'],
        triggerPhrases: ['materiał lekcji'],
        tags: ['page-content', 'lesson'],
        fragments: [],
        notes: 'Główny dokument lekcji.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'lessons-active-document',
          collectionId: 'kangur_page_content',
          text: 'Materiał lekcji\nCzytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'lessons-active-document',
            title: 'Materiał lekcji',
            description:
              'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
            tags: ['kangur', 'page-content', 'lesson'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi ten fragment.' }],
          context: {
            surface: 'lesson',
            contentId: 'clock',
            promptMode: 'selected_text',
            selectedText: 'Co pokazuje krótka wskazówka?',
            focusKind: 'document',
            focusId: 'kangur-lesson-document:clock',
            focusLabel: 'Zegar',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'lessons-active-document',
              sourcePath: 'entry:lessons-active-document',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body.message).toContain('Materiał lekcji: Zegar.');
    expect(body.message).toContain('Zaznaczony fragment: "Co pokazuje krótka wskazówka?".');
    expect(body.message).toContain('Krótka wskazówka pokazuje godzinę.');
    expect(body.message).toContain(
      'Z treści tej lekcji teraz: Co pokazuje krótka wskazówka? Krótka wskazówka pokazuje godzinę na tarczy.'
    );
    expect(body.answerResolutionMode).toBe('page_content');
  });

  it('adds active assignment overlays to lesson header answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Dodawanie',
          description: 'Licz dwa zbiory razem.',
          masterySummary: 'Dodawanie mastery 68% after 3 attempts.',
          assignmentSummary:
            'Powtórz lekcję Dodawanie. Progress: 1 z 2 kroków. Suggested action: Otwórz lekcję on Lessons.',
          documentSummary:
            'Dodawanie to łączenie dwóch liczb. Zacznij od małych grup i sprawdź wynik głośno.',
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'lesson-header',
        pageKey: 'Lessons',
        screenKey: 'active',
        surface: 'lesson',
        route: '/lessons',
        componentId: 'active-header',
        widget: 'KangurActiveLessonHeader',
        sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
        title: 'Aktywna lekcja',
        summary:
          'Przejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
        body: 'To nagłówek aktywnej lekcji z najważniejszym stanem i szybkim wejściem do treści.',
        anchorIdPrefix: 'kangur-lesson-header',
        focusKind: 'lesson_header',
        contentIdPrefixes: ['adding'],
        nativeGuideIds: ['lesson-header'],
        triggerPhrases: ['aktywna lekcja'],
        tags: ['page-content', 'lesson'],
        notes: 'Nagłówek aktywnej lekcji.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'lesson-header',
          collectionId: 'kangur_page_content',
          text: 'Aktywna lekcja\nPrzejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'lesson-header',
            title: 'Aktywna lekcja',
            description:
              'Przejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
            tags: ['kangur', 'page-content', 'lesson'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co pokazuje ten naglowek lekcji?' }],
          context: {
            surface: 'lesson',
            contentId: 'adding',
            promptMode: 'explain',
            focusKind: 'lesson_header',
            focusId: 'kangur-lesson-header:adding',
            focusLabel: 'Dodawanie',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'lesson-header',
              sourcePath: 'entry:lesson-header',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Aktywna lekcja: Dodawanie.');
    expect(body.message).toContain(
      'Aktywny priorytet: Powtórz lekcję Dodawanie. Progress: 1 z 2 kroków. Suggested action: Otwórz lekcję on Lessons.'
    );
    expect(body.message).toContain(
      'Z treści tej lekcji teraz: Dodawanie to łączenie dwóch liczb. Zacznij od małych grup i sprawdź wynik głośno.'
    );
  });

  it('adds lesson navigation overlays to direct page-content navigation answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        lessonFacts: {
          title: 'Dodawanie',
          description: 'Licz dwa zbiory razem.',
          masterySummary: 'Dodawanie mastery 68% after 3 attempts.',
          navigationSummary:
            'Bez wracania do listy możesz cofnąć się do Kalendarz albo przejść dalej do Odejmowanie.',
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'lesson-navigation',
        pageKey: 'Lessons',
        screenKey: 'active',
        surface: 'lesson',
        route: '/lessons',
        componentId: 'lesson-navigation',
        widget: 'KangurLessonNavigationWidget',
        sourcePath: 'src/features/kangur/ui/pages/Lessons.tsx',
        title: 'Nawigacja lekcji',
        summary:
          'Przechodz do poprzedniej lub kolejnej lekcji bez wracania do calej listy tematow.',
        body: 'Ta sekcja daje szybkie przejście między sąsiednimi lekcjami.',
        anchorIdPrefix: 'kangur-lesson-navigation',
        focusKind: 'navigation',
        contentIdPrefixes: ['adding'],
        nativeGuideIds: ['lesson-navigation'],
        triggerPhrases: ['nawigacja lekcji'],
        tags: ['page-content', 'lesson'],
        notes: 'Nawigacja aktywnej lekcji.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'lesson-navigation',
          collectionId: 'kangur_page_content',
          text: 'Nawigacja lekcji\nPrzechodz do poprzedniej lub kolejnej lekcji bez wracania do calej listy tematow.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'lesson-navigation',
            title: 'Nawigacja lekcji',
            description:
              'Przechodz do poprzedniej lub kolejnej lekcji bez wracania do calej listy tematow.',
            tags: ['kangur', 'page-content', 'lesson'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Do czego sluzy ta nawigacja lekcji?' }],
          context: {
            surface: 'lesson',
            contentId: 'adding',
            promptMode: 'explain',
            focusKind: 'navigation',
            focusId: 'kangur-lesson-navigation:adding',
            focusLabel: 'Dodawanie',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'lesson-navigation',
              sourcePath: 'entry:lesson-navigation',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Nawigacja lekcji: Dodawanie.');
    expect(body.message).toContain(
      'Nawigacja tej lekcji: Bez wracania do listy możesz cofnąć się do Kalendarz albo przejść dalej do Odejmowanie.'
    );
    expect(body.message).toContain(
      'Aktualny obraz opanowania: Dodawanie mastery 68% after 3 attempts.'
    );
    const lessonSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId === 'runtime:kangur:lesson:learner-1:lesson-1'
    );
    expect(lessonSource?.text).toContain(
      'Bez wracania do listy możesz cofnąć się do Kalendarz albo przejść dalej do Odejmowanie.'
    );
  });

  it('adds active test question overlays to direct page-content question answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          currentQuestion: 'Ile to jest 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          questionPointValue: 3,
          questionChoicesSummary: 'Opcje odpowiedzi: A - 3; B - 4.',
          selectedChoiceLabel: 'B',
          selectedChoiceText: '4',
          answerRevealed: false,
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'test-question',
        pageKey: 'Tests',
        screenKey: 'suite',
        surface: 'test',
        route: '/tests',
        componentId: 'question',
        widget: 'KangurTestQuestionRenderer',
        sourcePath: 'src/features/kangur/ui/components/KangurTestSuitePlayer.tsx',
        title: 'Pytanie testowe',
        summary: 'Przeczytaj treść zadania i wybierz jedną odpowiedź przed sprawdzeniem wyniku.',
        body: 'Ta sekcja pokazuje aktywne pytanie wraz z możliwymi odpowiedziami.',
        anchorIdPrefix: 'kangur-test-question',
        focusKind: 'question',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-question'],
        triggerPhrases: ['pytanie testowe'],
        tags: ['page-content', 'test'],
        notes: 'Aktywne pytanie testowe.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'test-question',
          collectionId: 'kangur_page_content',
          text: 'Pytanie testowe\nPrzeczytaj treść zadania i wybierz jedną odpowiedź przed sprawdzeniem wyniku.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'test-question',
            title: 'Pytanie testowe',
            description:
              'Przeczytaj treść zadania i wybierz jedną odpowiedź przed sprawdzeniem wyniku.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co pokazuje to pytanie testowe?' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            description: 'Ile to jest 2 + 2?',
            promptMode: 'explain',
            focusKind: 'question',
            focusId: 'kangur-test-question:suite-1:question-1',
            focusLabel: 'Pytanie 1',
            questionId: 'question-1',
            currentQuestion: 'Ile to jest 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            answerRevealed: false,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'test-question',
              sourcePath: 'entry:test-question',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Pytanie testowe: Pytanie 1.');
    expect(body.message).toContain('Pytanie 1/10: Ile to jest 2 + 2?');
    expect(body.message).toContain('To pytanie jest warte 3 pkt.');
    expect(body.message).toContain('Opcje odpowiedzi: A - 3; B - 4.');
    expect(body.message).toContain('Aktualnie zaznaczona odpowiedź: B - 4.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:')
    );
    expect(testSource?.text).toContain('Question value: 3 pts.');
    expect(testSource?.text).toContain('Opcje odpowiedzi: A - 3; B - 4.');
    expect(testSource?.text).toContain('Selected choice: B - 4.');
  });

  it('adds selected-answer overlays to direct page-content selection answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
        description: 'Zestaw próbny.',
          currentQuestion: 'Ile to jest 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          selectedChoiceLabel: 'B',
          selectedChoiceText: '4',
          answerRevealed: false,
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'tests-selection',
        pageKey: 'Tests',
        screenKey: 'suite',
        surface: 'test',
        route: '/tests',
        componentId: 'selected-choice',
        widget: 'KangurTestQuestionRenderer',
        sourcePath: 'src/features/kangur/ui/components/KangurTestQuestionRenderer.tsx',
        title: 'Twój zaznaczony wybór',
        summary:
          'To jest odpowiedź wybrana przed sprawdzeniem wyniku. Tutor może wyjaśnić, co oznacza ten wybór i na co spojrzeć jeszcze raz.',
        body: 'Ta sekcja odnosi się do jednej, aktualnie zaznaczonej odpowiedzi w teście.',
        anchorIdPrefix: 'kangur-test-selection:',
        focusKind: 'selection',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-selection'],
        triggerPhrases: ['wybrana odpowiedź'],
        tags: ['page-content', 'test'],
        notes: 'Wybrana odpowiedź testowa.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'tests-selection',
          collectionId: 'kangur_page_content',
          text: 'Twój zaznaczony wybór\nTo jest odpowiedź wybrana przed sprawdzeniem wyniku.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'tests-selection',
            title: 'Twój zaznaczony wybór',
            description:
              'To jest odpowiedź wybrana przed sprawdzeniem wyniku. Tutor może wyjaśnić, co oznacza ten wybór i na co spojrzeć jeszcze raz.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co pokazuje mój zaznaczony wybór?' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            description: 'Ile to jest 2 + 2?',
            promptMode: 'explain',
            focusKind: 'selection',
            focusId: 'kangur-test-selection:suite-1:question-1:B',
            focusLabel: 'Odpowiedź B: 4',
            questionId: 'question-1',
            currentQuestion: 'Ile to jest 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            selectedChoiceLabel: 'B',
            selectedChoiceText: '4',
            answerRevealed: false,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'tests-selection',
              sourcePath: 'entry:tests-selection',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Twój zaznaczony wybór: Odpowiedź B: 4.');
    expect(body.message).toContain('Pytanie 1/10: Ile to jest 2 + 2?');
    expect(body.message).toContain('Aktualnie zaznaczona odpowiedź: B - 4.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:')
    );
    expect(testSource?.text).toContain('Selected choice: B - 4.');
  });

  it('adds finished test result overlays to direct page-content summary answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          questionProgressLabel: 'Ukończono 10/10',
          resultSummary: 'Wynik końcowy: 24/30 pkt (80%).',
          answerRevealed: true,
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'test-summary',
        pageKey: 'Tests',
        screenKey: 'summary',
        surface: 'test',
        route: '/tests',
        componentId: 'summary',
        widget: 'KangurSummaryPanel',
        sourcePath: 'src/features/kangur/ui/components/KangurTestSuitePlayer.tsx',
        title: 'Podsumowanie testu',
        summary: 'Sprawdź wynik końcowy i przejrzyj wszystkie odpowiedzi jeszcze raz.',
        body: 'Ta sekcja zamyka cały test i pokazuje wynik po ukończeniu zestawu.',
        anchorIdPrefix: 'kangur-test-summary',
        focusKind: 'summary',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-summary'],
        triggerPhrases: ['podsumowanie testu'],
        tags: ['page-content', 'test'],
        notes: 'Podsumowanie testu.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'test-summary',
          collectionId: 'kangur_page_content',
          text: 'Podsumowanie testu\nSprawdź wynik końcowy i przejrzyj wszystkie odpowiedzi jeszcze raz.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'test-summary',
            title: 'Podsumowanie testu',
            description: 'Sprawdź wynik końcowy i przejrzyj wszystkie odpowiedzi jeszcze raz.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co oznacza to podsumowanie testu?' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            description: 'Wynik końcowy: 24/30 pkt (80%).',
            promptMode: 'explain',
            focusKind: 'summary',
            focusId: 'kangur-test-summary:suite-1',
            focusLabel: 'Kangur Mini',
            questionProgressLabel: 'Ukończono 10/10',
            answerRevealed: true,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'test-summary',
              sourcePath: 'entry:test-summary',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Podsumowanie testu: Kangur Mini.');
    expect(body.message).toContain('Wynik końcowy: 24/30 pkt (80%).');
    expect(body.message).toContain('Aktualny stan tej sekcji: Ukończono 10/10.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:')
    );
    expect(testSource?.text).toContain('Wynik końcowy: 24/30 pkt (80%).');
  });

  it('adds revealed answer overlays to direct page-content review answers', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          currentQuestion: 'Ile to jest 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          reviewSummary: 'Wybrana odpowiedź: B - 5. Poprawna odpowiedź: A - 4.',
          revealedExplanation: '2 + 2 daje 4, bo łączymy dwie pary.',
          answerRevealed: true,
          correctChoiceLabel: 'A',
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'test-review',
        pageKey: 'Tests',
        screenKey: 'suite',
        surface: 'test',
        route: '/tests',
        componentId: 'review',
        widget: 'KangurTestQuestionRenderer',
        sourcePath: 'src/features/kangur/ui/components/KangurTestSuitePlayer.tsx',
        title: 'Omówienie odpowiedzi',
        summary: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
        body: 'Ta sekcja pokazuje wynik Twojej odpowiedzi po odsłonięciu rozwiązania.',
        anchorIdPrefix: 'kangur-test-question',
        focusKind: 'review',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-review'],
        triggerPhrases: ['omówienie odpowiedzi'],
        tags: ['page-content', 'test'],
        notes: 'Review pytania testowego.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'test-review',
          collectionId: 'kangur_page_content',
          text: 'Omówienie odpowiedzi\nPorównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'test-review',
            title: 'Omówienie odpowiedzi',
            description: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij mi to omówienie odpowiedzi.' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            description: 'Wybrana odpowiedź: B - 5. Poprawna odpowiedź: A - 4.',
            promptMode: 'explain',
            focusKind: 'review',
            focusId: 'kangur-test-question:suite-1:question-1',
            focusLabel: 'Pytanie 1',
            questionId: 'question-1',
            currentQuestion: 'Ile to jest 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            answerRevealed: true,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'test-review',
              sourcePath: 'entry:test-review',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Omówienie odpowiedzi: Pytanie 1.');
    expect(body.message).toContain('Wybrana odpowiedź: B - 5. Poprawna odpowiedź: A - 4.');
    expect(body.message).toContain('Pytanie 1/10: Ile to jest 2 + 2?');
    expect(body.message).toContain('Po pokazaniu odpowiedzi: 2 + 2 daje 4, bo łączymy dwie pary.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:')
    );
    expect(testSource?.text).toContain('Wybrana odpowiedź: B - 5. Poprawna odpowiedź: A - 4.');
  });

  it('falls back to canonical correct-answer facts for review answers when no review summary is present', async () => {
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        testFacts: {
          title: 'Kangur Mini',
          description: 'Zestaw próbny.',
          currentQuestion: 'Ile to jest 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          revealedExplanation: '2 + 2 daje 4, bo łączymy dwie pary.',
          answerRevealed: true,
          selectedChoiceLabel: 'B',
          selectedChoiceText: '5',
          correctChoiceLabel: 'A',
          correctChoiceText: '4',
        },
      })
    );
    resolveKangurAiTutorSectionKnowledgeBundleMock.mockResolvedValue({
      section: {
        id: 'test-review',
        pageKey: 'Tests',
        screenKey: 'suite',
        surface: 'test',
        route: '/tests',
        componentId: 'review',
        widget: 'KangurTestQuestionRenderer',
        sourcePath: 'src/features/kangur/ui/components/KangurTestSuitePlayer.tsx',
        title: 'Omówienie odpowiedzi',
        summary: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
        body: 'Ta sekcja pokazuje wynik Twojej odpowiedzi po odsłonięciu rozwiązania.',
        anchorIdPrefix: 'kangur-test-question',
        focusKind: 'review',
        contentIdPrefixes: ['suite-1'],
        nativeGuideIds: ['test-review'],
        triggerPhrases: ['omówienie odpowiedzi'],
        tags: ['page-content', 'test'],
        notes: 'Review pytania testowego.',
        enabled: true,
        sortOrder: 10,
      },
      linkedNativeGuides: [],
      instructions: 'unused in direct-answer path',
      sources: [
        {
          documentId: 'test-review',
          collectionId: 'kangur_page_content',
          text: 'Omówienie odpowiedzi\nPorównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
          score: 0.99,
          metadata: {
            source: 'manual-text',
            sourceId: 'test-review',
            title: 'Omówienie odpowiedzi',
            description: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj wyjaśnienie.',
            tags: ['kangur', 'page-content', 'test'],
          },
        },
      ],
      followUpActions: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co oznacza to omówienie odpowiedzi?' }],
          context: {
            surface: 'test',
            contentId: 'suite-1',
            title: 'Kangur Mini',
            promptMode: 'explain',
            focusKind: 'review',
            focusId: 'kangur-test-question:suite-1:question-1',
            focusLabel: 'Pytanie 1',
            questionId: 'question-1',
            currentQuestion: 'Ile to jest 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            answerRevealed: true,
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_page_content',
              sourceRecordId: 'test-review',
              sourcePath: 'entry:test-review',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.message).toContain('Poprawna odpowiedź: A - 4.');
    expect(body.message).toContain('Wybrana odpowiedź: B - 5.');
    expect(body.message).toContain('Po pokazaniu odpowiedzi: 2 + 2 daje 4, bo łączymy dwie pary.');
    const testSource = body.sources.find(
      (source: { documentId: string; collectionId: string; text: string }) =>
        source.collectionId === 'kangur-runtime-context' &&
        source.documentId.startsWith('runtime:kangur:test:learner-1:suite-1:')
    );
    expect(testSource?.text).toContain('Selected choice: B - 5.');
    expect(testSource?.text).toContain('Correct choice: A - 4.');
  });

  it('passes explicit knowledge references through to the native-guide resolver', async () => {
    resolveKangurAiTutorNativeGuideResolutionMock.mockResolvedValue({
      status: 'hit',
      message: 'Ranking pokazuje wyniki i pozycje na tle innych prob.',
      followUpActions: [],
      entryId: 'shared-leaderboard',
      matchedSignals: ['knowledge_reference'],
      coverageLevel: 'specific',
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Powiedz mi o tej sekcji.' }],
          context: {
            surface: 'game',
            contentId: 'game:home',
            promptMode: 'explain',
            focusKind: 'leaderboard',
            focusId: 'kangur-game-leaderboard',
            focusLabel: 'Ranking',
            interactionIntent: 'explain',
            knowledgeReference: {
              sourceCollection: 'kangur_ai_tutor_native_guides',
              sourceRecordId: 'shared-leaderboard',
              sourcePath: 'entry:shared-leaderboard',
            },
          },
        })
      ),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(resolveKangurAiTutorNativeGuideResolutionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Powiedz mi o tej sekcji.',
        context: expect.objectContaining({
          knowledgeReference: {
            sourceCollection: 'kangur_ai_tutor_native_guides',
            sourceRecordId: 'shared-leaderboard',
            sourcePath: 'entry:shared-leaderboard',
          },
        }),
      })
    );
  });

  it('returns adaptive follow-up actions with the tutor response', async () => {
    buildKangurAiTutorAdaptiveGuidanceMock.mockResolvedValue({
      instructions:
        'Adaptive learner guidance:\nWhen suggesting the next step, anchor it to the top recommendation.',
      followUpActions: [
        {
          id: 'recommendation:strengthen_lesson_mastery',
          label: 'Otwórz lekcję',
          page: 'Lessons',
          query: {
            focus: 'adding',
          },
          reason: 'Powtórz lekcję: Dodawanie',
        },
      ],
      coachingFrame: {
        mode: 'next_best_action',
        label: 'Nastepny krok',
        description: 'Wskaz jedna konkretna aktywnosc Kangur jako najlepszy dalszy ruch.',
        rationale: 'Najwiecej wartosci da teraz jedna jasna aktywnosc, a nie kilka opcji naraz.',
      },
    });
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 79%. 1 active assignment.',
        lessonFacts: {
          title: 'Dodawanie',
          description: 'Ćwiczenia z podstaw dodawania.',
          assignmentSummary: 'Powtórz lekcję: Dodawanie.',
          masterySummary: 'Dodawanie mastery 65% after 2 attempts.',
        },
      })
    );
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Wróć teraz do lekcji z dodawania i zrób jedną krótką powtórkę.',
    });
    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co dalej powinienem zrobić?' }],
          context: {
            surface: 'lesson',
            contentId: 'adding',
            promptMode: 'chat',
            interactionIntent: 'next_step',
          },
        })
      ),
      createRequestContext()
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        context: expect.objectContaining({
          interactionIntent: 'next_step',
          followUpActionCount: 1,
          primaryFollowUpActionId: 'recommendation:strengthen_lesson_mastery',
          primaryFollowUpPage: 'Lessons',
          hasBridgeFollowUpAction: false,
          bridgeFollowUpActionCount: 0,
          bridgeFollowUpDirection: null,
          coachingMode: 'next_best_action',
        }),
      })
    );
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Wróć teraz do lekcji z dodawania i zrób jedną krótką powtórkę.',
      followUpActions: [
        {
          id: 'recommendation:strengthen_lesson_mastery',
          label: 'Otwórz lekcję',
          page: 'Lessons',
          query: {
            focus: 'adding',
          },
          reason: 'Powtórz lekcję: Dodawanie',
        },
      ],
      coachingFrame: {
        mode: 'next_best_action',
        label: 'Nastepny krok',
        description: 'Wskaz jedna konkretna aktywnosc Kangur jako najlepszy dalszy ruch.',
        rationale: 'Najwiecej wartosci da teraz jedna jasna aktywnosc, a nie kilka opcji naraz.',
      },
      suggestedMoodId: 'encouraging',
      tutorMood: {
        currentMoodId: 'supportive',
        baselineMoodId: 'encouraging',
        confidence: 0.72,
        lastComputedAt: '2026-03-07T10:00:00.000Z',
        lastReasonCode: 'learner_confusion',
      },
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).toEqual(
      expectTutorSource({
        documentId: 'runtime:kangur:lesson:learner-1:lesson-1',
        title: 'Dodawanie',
        description: 'Ćwiczenia z podstaw dodawania.',
        tags: ['kangur', 'test'],
      })
    );
    expect(body.sources[0].text).toContain('Ćwiczenia z podstaw dodawania.');
    expect(body.sources[0].text).toContain('Powtórz lekcję: Dodawanie.');
  });
  it('ignores legacy teaching-agent ids and still uses the direct Brain runtime', async () => {
    buildKangurAiTutorAdaptiveGuidanceMock.mockResolvedValue({
      instructions: '',
      followUpActions: [],
      coachingFrame: null,
    });
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Skup sie na zaznaczonym fragmencie i policz krok po kroku.',
    });
    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Nie rozumiem tego przykładu.' }],
          context: {
            surface: 'lesson',
            contentId: 'lesson-adding',
            selectedText: '3 + 4',
            promptMode: 'selected_text',
          },
        })
      ),
      createRequestContext()
    );
    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenCalledWith(
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
      expect.objectContaining({
        defaultTemperature: 0.4,
        defaultMaxTokens: 600,
      })
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledTimes(1);
    const brainInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(brainInput.messages[0].content).toContain('Learner selected this text: """3 + 4"""');
    expect(brainInput.messages[0].content).toContain(
      'The learner selected a specific excerpt. Focus on that excerpt first and relate your response back to it.'
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Skup sie na zaznaczonym fragmencie i policz krok po kroku.',
      followUpActions: [],
      suggestedMoodId: 'encouraging',
      tutorMood: {
        currentMoodId: 'supportive',
        baselineMoodId: 'encouraging',
        confidence: 0.72,
        lastComputedAt: '2026-03-07T10:00:00.000Z',
        lastReasonCode: 'learner_confusion',
      },
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0]).toEqual(
      expectTutorSource({
        documentId: 'runtime:kangur:lesson:learner-1:lesson-1',
        title: 'Dodawanie',
        description: 'Ćwiczenia z podstaw dodawania.',
        tags: ['kangur', 'test'],
      })
    );
    expect(body.sources[0].text).toContain('Ćwiczenia z podstaw dodawania.');
  });
  it('logs failed tutor runs for observability', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            playwrightPersonaId: null,
            rememberTutorContext: true,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            hintDepth: 'step_by_step',
            proactiveNudges: 'coach',
            dailyMessageLimit: 2,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          agentPersonaId: 'persona-1',
          motionPresetId: null,
          dailyMessageLimit: 2,
        });
      }
      if (key === KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            dateKey: '2026-03-07',
            messageCount: 1,
            updatedAt: '2026-03-07T09:30:00.000Z',
          },
        });
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
    runBrainChatCompletionMock.mockRejectedValue(new Error('Tutor provider failed.'));
    await expect(
      postKangurAiTutorChatHandler(
        createPostRequest(
          JSON.stringify({
            messages: [{ role: 'user', content: 'Pomóż mi.' }],
            context: {
              surface: 'lesson',
              contentId: 'lesson-1',
              promptMode: 'chat',
            },
          })
        ),
        createRequestContext()
      )
    ).rejects.toThrow('Tutor provider failed.');

    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.failed',
        service: 'kangur.ai-tutor',
        statusCode: 500,
        context: expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-1',
          promptMode: 'chat',
          brainCapability: KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
        }),
      })
    );
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
  });
  it('rejects active test tutoring when the parent only allows review after the answer', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            playwrightPersonaId: null,
            allowLessons: true,
            testAccessMode: 'review_after_answer',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: null,
          },
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
    await expect(
      postKangurAiTutorChatHandler(
        createPostRequest(
          JSON.stringify({
            messages: [{ role: 'user', content: 'Podpowiedź mi.' }],
            context: {
              surface: 'test',
              contentId: 'suite-2026',
              questionId: 'q-1',
              answerRevealed: false,
              promptMode: 'hint',
            },
          })
        ),
        createRequestContext()
      )
    ).rejects.toMatchObject({
      message: 'AI tutor is available in tests only after the answer has been revealed.',
      httpStatus: 400,
    });
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.failed',
        statusCode: 400,
        context: expect.objectContaining({
          surface: 'test',
          contentId: 'suite-2026',
          promptMode: 'hint',
          testAccessMode: 'review_after_answer',
        }),
      })
    );
  });
  it('rejects game tutoring when the parent disables the tutor for Grajmy separately from lessons', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            playwrightPersonaId: null,
            allowLessons: true,
            allowGames: false,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: null,
          },
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

    await expect(
      postKangurAiTutorChatHandler(
        createPostRequest(
          JSON.stringify({
            messages: [{ role: 'user', content: 'Podpowiedź mi kolejny ruch.' }],
            context: {
              surface: 'game',
              contentId: 'calendar-quiz',
              questionId: 'calendar-1',
              currentQuestion: 'Który dzień jest po wtorku?',
              promptMode: 'hint',
            },
          })
        ),
        createRequestContext()
      )
    ).rejects.toMatchObject({
      message: 'AI tutor is disabled for games for this learner.',
      httpStatus: 400,
    });
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.failed',
        statusCode: 400,
        context: expect.objectContaining({
          surface: 'game',
          contentId: 'calendar-quiz',
          allowGames: false,
        }),
      })
    );
  });
  it('rejects requests after the learner reaches the daily tutor message limit', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            playwrightPersonaId: null,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: 2,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            dateKey: '2026-03-07',
            messageCount: 2,
            updatedAt: '2026-03-07T09:30:00.000Z',
          },
        });
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
    await expect(
      postKangurAiTutorChatHandler(
        createPostRequest(
          JSON.stringify({
            messages: [{ role: 'user', content: 'Pomóż mi jeszcze raz.' }],
            context: {
              surface: 'lesson',
              contentId: 'lesson-1',
              promptMode: 'chat',
            },
          })
        ),
        createRequestContext()
      )
    ).rejects.toMatchObject({
      message: 'Daily AI tutor message limit reached for this learner. Try again tomorrow.',
      httpStatus: 429,
    });
    expect(runBrainChatCompletionMock).not.toHaveBeenCalled();
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.failed',
        statusCode: 429,
        context: expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-1',
          dailyMessageLimit: 2,
        }),
      })
    );
  });

  it('adds website-help graph context and sources when Neo4j retrieval resolves a Kangur website query', async () => {
    resolveKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'hit',
      queryMode: 'website_help',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      instructions:
        'Kangur website-help graph context:\n- Sign in flow [flow]\n  Website target: / · anchor=kangur-primary-nav-login',
      nodeIds: ['flow:kangur:sign-in'],
      websiteHelpTarget: {
        nodeId: 'flow:kangur:sign-in',
        label: 'Sign in flow',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
      sourceCollections: ['kangur_ai_tutor_content'],
      hydrationSources: ['kangur_ai_tutor_content'],
      sources: [
        {
          documentId: 'flow:kangur:sign-in',
          collectionId: 'kangur-knowledge-graph',
          text: 'Sign in flow (flow)\nHow anonymous learners sign in from the Kangur website shell.',
          score: 0.94,
          metadata: {
            source: 'manual-text',
            sourceId: 'flow:kangur:sign-in',
            title: 'Sign in flow',
            description: 'How anonymous learners sign in from the Kangur website shell.',
            tags: ['kangur-knowledge-graph', 'flow', 'auth'],
          },
        },
      ],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Jak się zalogować do Kangura?' }],
          context: {
            surface: 'lesson',
            contentId: 'lesson-1',
            promptMode: 'chat',
          },
        })
      ),
      createRequestContext()
    );
    const body = await response.json();

    expect(resolveKangurWebsiteHelpGraphContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Jak się zalogować do Kangura?',
        locale: 'pl',
        runtimeDocuments: expect.arrayContaining([
          expect.objectContaining({ entityType: 'kangur_learner_snapshot' }),
          expect.objectContaining({ entityType: 'kangur_lesson_context' }),
        ]),
      })
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Kangur website-help graph context:'),
          }),
        ]),
      })
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: 'flow:kangur:sign-in',
          collectionId: 'kangur-knowledge-graph',
        }),
      ])
    );
    expect(body.websiteHelpTarget).toEqual({
      nodeId: 'flow:kangur:sign-in',
      label: 'Sign in flow',
      route: '/',
      anchorId: 'kangur-primary-nav-login',
    });
    expect(body.knowledgeGraph).toEqual({
      applied: true,
      queryMode: 'website_help',
      queryStatus: 'hit',
      recallStrategy: 'metadata_only',
      lexicalHitCount: 1,
      vectorHitCount: 0,
      vectorRecallAttempted: false,
      websiteHelpApplied: true,
      websiteHelpTargetNodeId: 'flow:kangur:sign-in',
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        context: expect.objectContaining({
          knowledgeGraphRecallStrategy: 'metadata_only',
          knowledgeGraphLexicalHitCount: 1,
          knowledgeGraphVectorHitCount: 0,
          knowledgeGraphVectorRecallAttempted: false,
          websiteHelpGraphApplied: true,
          websiteHelpGraphSourceCollections: ['kangur_ai_tutor_content'],
          websiteHelpGraphHydrationSources: ['kangur_ai_tutor_content'],
          websiteHelpGraphTargetNodeId: 'flow:kangur:sign-in',
          websiteHelpGraphTargetRoute: '/',
          websiteHelpGraphTargetAnchorId: 'kangur-primary-nav-login',
        }),
      })
    );
  });

  it('adds semantic graph context for section-level Tutor-AI prompts and records the query mode', async () => {
    resolveKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'hit',
      queryMode: 'semantic',
      recallStrategy: 'hybrid_vector',
      lexicalHitCount: 2,
      vectorHitCount: 3,
      vectorRecallAttempted: true,
      instructions:
        'Kangur semantic graph context:\n- Ranking wynikow [guide]\n  Tutaj widac porownanie ostatnich wynikow i pozycje ucznia.',
      nodeIds: ['guide:native:game-leaderboard'],
      sourceCollections: ['kangur_ai_tutor_native_guides'],
      hydrationSources: ['kangur_ai_tutor_native_guides'],
      sources: [
        {
          documentId: 'guide:native:game-leaderboard',
          collectionId: 'kangur_ai_tutor_native_guides',
          text: 'Ranking wynikow (guide)\nSekcja rankingu pokazuje wyniki i pozycje ucznia.',
          score: 0.94,
          metadata: {
            source: 'manual-text',
            sourceId: 'guide:native:game-leaderboard',
            title: 'Ranking wynikow',
            description: 'Tutaj widac porownanie ostatnich wynikow i pozycje ucznia.',
            tags: ['kangur-knowledge-graph', 'guide', 'game', 'leaderboard'],
          },
        },
      ],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Wyjaśnij ten panel' }],
          context: {
            surface: 'game',
            contentId: 'game:practice:addition',
            title: 'Podsumowanie gry',
            promptMode: 'explain',
            focusKind: 'leaderboard',
            focusId: 'kangur-game-result-leaderboard',
            focusLabel: 'Ranking wyników',
          },
        })
      ),
      createRequestContext()
    );
    const body = await response.json();

    expect(resolveKangurWebsiteHelpGraphContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserMessage: 'Wyjaśnij ten panel',
        context: expect.objectContaining({
          surface: 'game',
          focusKind: 'leaderboard',
          focusId: 'kangur-game-result-leaderboard',
        }),
      })
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Kangur semantic graph context:'),
          }),
        ]),
      })
    );
    expect(body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId: 'guide:native:game-leaderboard',
          collectionId: 'kangur_ai_tutor_native_guides',
        }),
      ])
    );
    expect(body.knowledgeGraph).toEqual({
      applied: true,
      queryMode: 'semantic',
      queryStatus: 'hit',
      recallStrategy: 'hybrid_vector',
      lexicalHitCount: 2,
      vectorHitCount: 3,
      vectorRecallAttempted: true,
      websiteHelpApplied: false,
      websiteHelpTargetNodeId: null,
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        context: expect.objectContaining({
          knowledgeGraphApplied: true,
          knowledgeGraphQueryMode: 'semantic',
          knowledgeGraphRecallStrategy: 'hybrid_vector',
          knowledgeGraphLexicalHitCount: 2,
          knowledgeGraphVectorHitCount: 3,
          knowledgeGraphVectorRecallAttempted: true,
          knowledgeGraphSourceCollections: ['kangur_ai_tutor_native_guides'],
          knowledgeGraphHydrationSources: ['kangur_ai_tutor_native_guides'],
          websiteHelpGraphApplied: false,
          websiteHelpGraphSourceCollections: [],
          websiteHelpGraphHydrationSources: [],
          websiteHelpGraphTargetNodeId: null,
          websiteHelpGraphTargetRoute: null,
          websiteHelpGraphTargetAnchorId: null,
        }),
      })
    );
  });
});
