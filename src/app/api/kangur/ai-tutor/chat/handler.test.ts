import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import { KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY } from '@/features/kangur/server/ai-tutor-usage';
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
  prismaChatbotSessionFindFirstMock,
  prismaChatbotSessionCreateMock,
  readStoredSettingValueMock,
  upsertStoredSettingValueMock,
  logKangurServerEventMock,
  buildKangurAiTutorAdaptiveGuidanceMock,
  resolveKangurAiTutorNativeGuideResolutionMock,
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
  prismaChatbotSessionFindFirstMock: vi.fn(),
  prismaChatbotSessionCreateMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  buildKangurAiTutorAdaptiveGuidanceMock: vi.fn(),
  resolveKangurAiTutorNativeGuideResolutionMock: vi.fn(),
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
  },
}));
vi.mock('@/shared/lib/db/prisma', () => ({
  default: {
    chatbotSession: {
      findFirst: prismaChatbotSessionFindFirstMock,
      create: prismaChatbotSessionCreateMock,
    },
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
vi.mock('@/features/kangur/server/knowledge-graph/retrieval', () => ({
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
    prismaChatbotSessionFindFirstMock.mockResolvedValue(null);
    prismaChatbotSessionCreateMock.mockResolvedValue({
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
    resolveKangurWebsiteHelpGraphContextMock.mockResolvedValue({
      status: 'skipped',
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
        'Adaptive learner guidance:\nTop recommendation: Powtorz lekcje: Dodawanie.\nStructured coaching mode: hint_ladder. Use a hint ladder: give one small next step or one checkpoint question, then stop.',
      followUpActions: [],
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden maly krok albo pytanie kontrolne, bez pelnego rozwiazania.',
        rationale: 'Uczen jest w trakcie proby, wiec tutor powinien prowadzic bardzo malymi krokami.',
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
            lastUnresolvedBlocker: 'Myli kolejnosc dodawania przy wiekszych liczbach.',
            lastRecommendedAction: 'Otworz lekcje: Powtorz lekcje: Dodawanie',
            lastSuccessfulIntervention: 'Pomoglo rozbicie zadania na dwa mniejsze kroki.',
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
      'Adaptive learner guidance:\nTop recommendation: Powtorz lekcje: Dodawanie.\nStructured coaching mode: hint_ladder. Use a hint ladder: give one small next step or one checkpoint question, then stop.'
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
      'Last unresolved blocker: Myli kolejnosc dodawania przy wiekszych liczbach.'
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
    expect(prismaChatbotSessionFindFirstMock).toHaveBeenCalledWith({
      where: {
        personaId: 'persona-1',
        title: 'Kangur AI Tutor · Mila · learner:learner-1',
      },
      select: {
        id: true,
      },
    });
    expect(prismaChatbotSessionCreateMock).toHaveBeenCalledWith({
      data: {
        title: 'Kangur AI Tutor · Mila · learner:learner-1',
        personaId: 'persona-1',
        settings: {
          personaId: 'persona-1',
        },
      },
      select: {
        id: true,
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
      followUpActions: [],
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden maly krok albo pytanie kontrolne, bez pelnego rozwiazania.',
        rationale: 'Uczen jest w trakcie proby, wiec tutor powinien prowadzic bardzo malymi krokami.',
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
          'Policz najpierw lewa pare, potem prawa.',
          '<kangur_tutor_drawing>',
          '<title>Dwie pary</title>',
          '<caption>Kazda para ma po dwa elementy.</caption>',
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
              content: 'Wyjasnij to rysunkiem.',
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
      message: 'Policz najpierw lewa pare, potem prawa.',
      artifacts: [
        {
          type: 'assistant_drawing',
          title: 'Dwie pary',
          caption: 'Kazda para ma po dwa elementy.',
          alt: 'Dwie pary kropek ustawione obok siebie.',
        },
      ],
    });
    expect(body.artifacts[0]?.svgContent).toContain('<svg');
    expect(persistAgentPersonaExchangeMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantMessage: 'Policz najpierw lewa pare, potem prawa.',
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
          messages: [{ role: 'user', content: 'Poprosze wskazowke.' }],
          context: {
            surface: 'game',
            contentId: 'game',
            title: 'Trening dodawania',
            description: 'Krotki trening z dodawania do 20.',
            masterySummary: 'Dodawanie mastery 68% po 3 probach.',
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
      'Current description: Krotki trening z dodawania do 20.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Learner snapshot: Average accuracy 81%. 1 active assignment.'
    );
    expect(brainInput.messages[0].content).toContain(
      'Learner mastery snapshot: Dodawanie mastery 68% po 3 probach.'
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
          messages: [{ role: 'user', content: 'Wyjasnij ten fragment.' }],
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
        }),
      })
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.native-guide.completed',
        context: expect.objectContaining({
          nativeGuideCoverageLevel: 'overview_fallback',
          nativeGuideEntryId: 'lesson-overview',
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('Ekran lekcji');
  });
  it('returns adaptive follow-up actions with the tutor response', async () => {
    buildKangurAiTutorAdaptiveGuidanceMock.mockResolvedValue({
      instructions:
        'Adaptive learner guidance:\nWhen suggesting the next step, anchor it to the top recommendation.',
      followUpActions: [
        {
          id: 'recommendation:strengthen_lesson_mastery',
          label: 'Otworz lekcje',
          page: 'Lessons',
          query: {
            focus: 'adding',
          },
          reason: 'Powtorz lekcje: Dodawanie',
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
          assignmentSummary: 'Powtorz lekcje: Dodawanie.',
          masterySummary: 'Dodawanie mastery 65% after 2 attempts.',
        },
      })
    );
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Wroc teraz do lekcji z dodawania i zrob jedna krotka powtorke.',
    });
    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co dalej powinienem zrobic?' }],
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
      message: 'Wroc teraz do lekcji z dodawania i zrob jedna krotka powtorke.',
      followUpActions: [
        {
          id: 'recommendation:strengthen_lesson_mastery',
          label: 'Otworz lekcje',
          page: 'Lessons',
          query: {
            focus: 'adding',
          },
          reason: 'Powtorz lekcje: Dodawanie',
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
    expect(body.sources[0].text).toContain('Powtorz lekcje: Dodawanie.');
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
            messages: [{ role: 'user', content: 'Podpowiedz mi.' }],
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
            messages: [{ role: 'user', content: 'Podpowiedz mi kolejny ruch.' }],
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
      instructions:
        'Kangur website-help graph context:\n- Sign in flow [flow]\n  Website target: / · anchor=kangur-primary-nav-login',
      nodeIds: ['flow:kangur:sign-in'],
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
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        context: expect.objectContaining({
          websiteHelpGraphApplied: true,
        }),
      })
    );
  });
});
