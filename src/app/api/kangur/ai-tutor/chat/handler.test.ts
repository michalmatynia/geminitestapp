import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import { KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY } from '@/features/kangur/server/ai-tutor-usage';

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

vi.unmock('@/features/kangur/settings-ai-tutor');

import { postKangurAiTutorChatHandler } from './handler';

const KANGUR_AI_TUTOR_BRAIN_CAPABILITY = 'kangur_ai_tutor.chat';

const createRuntimeDocument = (input: {
  entityType: string;
  id: string;
  title: string;
  summary?: string;
  facts?: Record<string, unknown>;
}) => ({
  id: input.id,
  kind: 'runtime_document' as const,
  entityType: input.entityType,
  title: input.title,
  summary: input.summary ?? input.title,
  status: 'active',
  tags: ['kangur', 'test'],
  relatedNodeIds: [],
  facts: input.facts ?? {},
  sections: [],
  provenance: {
    providerId: 'kangur',
    source: 'test',
  },
});

const createContextRegistryBundle = (input?: {
  learnerSummary?: string;
  lessonFacts?: Record<string, unknown>;
  testFacts?: Record<string, unknown>;
  assignmentFacts?: Record<string, unknown>;
}) => {
  const documents = [
    createRuntimeDocument({
      id: 'runtime:kangur:learner:learner-1',
      entityType: 'kangur_learner_snapshot',
      title: 'Learner snapshot',
      summary: input?.learnerSummary ?? 'Average accuracy 74%.',
      facts: {
        learnerSummary: input?.learnerSummary ?? 'Average accuracy 74%.',
      },
    }),
  ];

  if (input?.lessonFacts) {
    documents.push(
      createRuntimeDocument({
        id: 'runtime:kangur:lesson:learner-1:lesson-1',
        entityType: 'kangur_lesson_context',
        title: String(input.lessonFacts['title'] ?? 'Lesson context'),
        summary: String(
          input.lessonFacts['description'] ?? input.lessonFacts['assignmentSummary'] ?? 'Lesson context'
        ),
        facts: input.lessonFacts,
      })
    );
  }

  if (input?.testFacts) {
    documents.push(
      createRuntimeDocument({
        id: 'runtime:kangur:test:learner-1:suite-1:q-1:active',
        entityType: 'kangur_test_context',
        title: String(input.testFacts['title'] ?? 'Test context'),
        summary: String(
          input.testFacts['description'] ?? input.testFacts['currentQuestion'] ?? 'Test context'
        ),
        facts: input.testFacts,
      })
    );
  }

  if (input?.assignmentFacts) {
    documents.push(
      createRuntimeDocument({
        id: 'runtime:kangur:assignment:learner-1:assignment-1',
        entityType: 'kangur_assignment_context',
        title: String(input.assignmentFacts['title'] ?? 'Assignment context'),
        summary: String(input.assignmentFacts['assignmentSummary'] ?? 'Assignment context'),
        facts: input.assignmentFacts,
      })
    );
  }

  return {
    refs: documents.map((document) => ({
      id: document.id,
      kind: 'runtime_document' as const,
      providerId: 'kangur',
      entityType: document.entityType,
    })),
    nodes: [
      {
        id: 'policy:kangur-ai-tutor-socratic',
        kind: 'policy' as const,
        description: 'Use short Socratic guidance grounded in the resolved Kangur context.',
      },
      {
        id: 'policy:kangur-ai-tutor-test-guardrails',
        kind: 'policy' as const,
        description: 'Protect active test integrity and avoid giving away answers.',
      },
    ],
    documents,
    truncated: false,
    engineVersion: 'test-engine',
  };
};

const createRequestContext = (): ApiHandlerContext =>
  ({
    requestId: 'request-kangur-ai-tutor-1',
    traceId: 'trace-kangur-ai-tutor-1',
    correlationId: 'corr-kangur-ai-tutor-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
  }) as ApiHandlerContext;

const createPostRequest = (body: string): NextRequest =>
  new NextRequest('http://localhost/api/kangur/ai-tutor/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

describe('kangur ai tutor chat handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    });

    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: 'legacy-teacher',
            agentPersonaId: 'persona-1',
            playwrightPersonaId: null,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
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
      instructions: 'Adaptive learner guidance:\nTop recommendation: Powtorz lekcje: Dodawanie.',
      followUpActions: [],
    });
    contextRegistryResolveRefsMock.mockResolvedValue(
      createContextRegistryBundle({
        learnerSummary: 'Average accuracy 74%. 2 active assignments. 1 lesson needs practice.',
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
      'Adaptive learner guidance:\nTop recommendation: Powtorz lekcje: Dodawanie.'
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
          retrievedSourceCount: 0,
          returnedSourceCount: 0,
          showSources: true,
          adaptiveGuidanceApplied: true,
          contextRegistryRefCount: 2,
          contextRegistryDocumentCount: 2,
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
    await expect(response.json()).resolves.toEqual({
      message: 'Spójrz najpierw na to, co oznacza znak plus.',
      sources: [],
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
        }),
      })
    );
    await expect(response.json()).resolves.toEqual({
      message: 'Wroc teraz do lekcji z dodawania i zrob jedna krotka powtorke.',
      sources: [],
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
  });

  it('ignores legacy teaching-agent ids and still uses the direct Brain runtime', async () => {
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
    await expect(response.json()).resolves.toEqual({
      message: 'Skup sie na zaznaczonym fragmencie i policz krok po kroku.',
      sources: [],
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
  });

  it('logs failed tutor runs for observability', async () => {
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
});
