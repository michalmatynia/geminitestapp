import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { AGENT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/agents';
import { KANGUR_AI_TUTOR_SETTINGS_KEY } from '@/features/kangur/settings-ai-tutor';
import { KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY } from '@/features/kangur/server/ai-tutor-usage';

const {
  runTeachingChatMock,
  resolveKangurActorMock,
  resolveBrainExecutionConfigForCapabilityMock,
  runBrainChatCompletionMock,
  readStoredSettingValueMock,
  upsertStoredSettingValueMock,
  logKangurServerEventMock,
  buildKangurAiTutorAdaptiveGuidanceMock,
} = vi.hoisted(() => ({
  runTeachingChatMock: vi.fn(),
  resolveKangurActorMock: vi.fn(),
  resolveBrainExecutionConfigForCapabilityMock: vi.fn(),
  runBrainChatCompletionMock: vi.fn(),
  readStoredSettingValueMock: vi.fn(),
  upsertStoredSettingValueMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  buildKangurAiTutorAdaptiveGuidanceMock: vi.fn(),
}));

vi.mock('@/features/ai/agentcreator/teaching/server/chat', () => ({
  runTeachingChat: runTeachingChatMock,
}));

vi.mock('@/features/kangur/server', () => ({
  resolveKangurActor: resolveKangurActorMock,
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
      },
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
            teachingAgentId: 'teacher-1',
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

  it('passes structured test context into the teaching-agent chat and returns retrieved sources', async () => {
    buildKangurAiTutorAdaptiveGuidanceMock.mockResolvedValue({
      instructions: 'Adaptive learner guidance:\nTop recommendation: Powtorz lekcje: Dodawanie.',
      followUpActions: [],
    });

    runTeachingChatMock.mockResolvedValue({
      message: 'Spójrz najpierw na to, co oznacza znak plus.',
      sources: [
        {
          documentId: 'doc-1',
          collectionId: 'collection-1',
          score: 0.91,
          text: 'Dodawanie łączy dwie liczby w jedną sumę.',
          metadata: {
            title: 'Dodawanie podstawy',
          },
        },
      ],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Pomóż mi z tym pytaniem.' }],
          context: {
            surface: 'test',
            contentId: 'suite-2026',
            title: 'Kangur Mini',
            description: 'Krótki zestaw próbny.',
            currentQuestion: 'Ile to 2 + 2?',
            questionProgressLabel: 'Pytanie 1/10',
            selectedText: '2 + 2',
            answerRevealed: false,
            promptMode: 'hint',
          },
        })
      ),
      createRequestContext()
    );

    expect(runTeachingChatMock).toHaveBeenCalledTimes(1);

    const chatInput = runTeachingChatMock.mock.calls[0]?.[0];
    expect(chatInput.agentId).toBe('teacher-1');
    expect(chatInput.messages[0]).toMatchObject({
      role: 'system',
    });
    expect(chatInput.messages[0].content).toContain('friendly AI tutor helping a child');
    expect(chatInput.messages[0].content).toContain('Current Kangur surface: test practice.');
    expect(chatInput.messages[0].content).toContain('Current question: Ile to 2 + 2?');
    expect(chatInput.messages[0].content).toContain('Question progress: Pytanie 1/10');
    expect(chatInput.messages[0].content).toContain('Learner selected this text: """2 + 2"""');
    expect(chatInput.messages[0].content).toContain(
      'The learner asked for a hint. Give only the next helpful step or one guiding question.'
    );
    expect(chatInput.messages[0].content).toContain(
      'Do not reveal the final answer, the correct option label, or solve the problem outright.'
    );
    expect(chatInput.messages[0].content).toContain(
      'Adaptive learner guidance:\nTop recommendation: Powtorz lekcje: Dodawanie.'
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
          usedTeachingAgent: true,
          retrievedSourceCount: 1,
          returnedSourceCount: 1,
          showSources: true,
          adaptiveGuidanceApplied: true,
          dailyUsageCount: 0,
          usageDateKey: '2026-03-07',
        }),
      })
    );
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: 'Spójrz najpierw na to, co oznacza znak plus.',
      sources: [
        {
          documentId: 'doc-1',
          collectionId: 'collection-1',
          score: 0.91,
          text: 'Dodawanie łączy dwie liczby w jedną sumę.',
          metadata: {
            title: 'Dodawanie podstawy',
          },
        },
      ],
      followUpActions: [],
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

    runTeachingChatMock.mockResolvedValue({
      message: 'Wroc teraz do lekcji z dodawania i zrob jedna krotka powtorke.',
      sources: [],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Co dalej powinienem zrobic?' }],
          context: {
            surface: 'lesson',
            contentId: 'adding',
            title: 'Dodawanie',
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
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
  });

  it('falls back to the Brain chat runtime when no teaching agent is configured', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: null,
            agentPersonaId: null,
            playwrightPersonaId: null,
            allowLessons: true,
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
      return null;
    });

    resolveBrainExecutionConfigForCapabilityMock.mockResolvedValue({
      modelId: 'brain-model-1',
      temperature: 0.2,
      maxTokens: 500,
      systemPrompt: 'Base brain prompt',
    });
    runBrainChatCompletionMock.mockResolvedValue({
      text: 'Spróbuj policzyć po kolei i sprawdź każdą cyfrę.',
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Nie rozumiem tego przykładu.' }],
          context: {
            surface: 'lesson',
            contentId: 'lesson-adding',
            title: 'Dodawanie',
            description: 'Ćwiczenia z podstaw dodawania.',
            masterySummary: 'Ukończono 2× · ostatni wynik 65%',
            assignmentSummary: 'Powtórz tę lekcję jeszcze raz.',
            selectedText: '3 + 4',
            promptMode: 'selected_text',
          },
        })
      ),
      createRequestContext()
    );

    expect(runTeachingChatMock).not.toHaveBeenCalled();
    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenCalledWith(
      'agent_teaching.chat',
      expect.objectContaining({
        defaultTemperature: 0.4,
        defaultMaxTokens: 600,
      })
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledTimes(1);

    const brainInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(brainInput.modelId).toBe('brain-model-1');
    expect(brainInput.messages[0].content).toContain('Base brain prompt');
    expect(brainInput.messages[0].content).toContain('Current Kangur surface: lesson learning.');
    expect(brainInput.messages[0].content).toContain('Current title: Dodawanie');
    expect(brainInput.messages[0].content).toContain(
      'Learner mastery snapshot: Ukończono 2× · ostatni wynik 65%'
    );
    expect(brainInput.messages[0].content).toContain(
      'Active assignment or focus: Powtórz tę lekcję jeszcze raz.'
    );
    expect(brainInput.messages[0].content).toContain('Learner selected this text: """3 + 4"""');
    expect(brainInput.messages[0].content).toContain(
      'The learner selected a specific excerpt. Focus on that excerpt first and relate your response back to it.'
    );
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        service: 'kangur.ai-tutor',
        statusCode: 200,
        context: expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-adding',
          promptMode: 'selected_text',
          usedTeachingAgent: false,
          retrievedSourceCount: 0,
          returnedSourceCount: 0,
          showSources: true,
          dailyUsageCount: 0,
          usageDateKey: '2026-03-07',
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: 'Spróbuj policzyć po kolei i sprawdź każdą cyfrę.',
      sources: [],
      followUpActions: [],
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
  });

  it('logs failed tutor runs for observability', async () => {
    runTeachingChatMock.mockRejectedValue(new Error('Tutor provider failed.'));

    await expect(
      postKangurAiTutorChatHandler(
        createPostRequest(
          JSON.stringify({
            messages: [{ role: 'user', content: 'Pomóż mi.' }],
            context: {
              surface: 'lesson',
              contentId: 'lesson-1',
              title: 'Dodawanie',
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
          usedTeachingAgent: true,
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
            teachingAgentId: 'teacher-1',
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
              title: 'Kangur Mini',
              currentQuestion: 'Ile to 2 + 2?',
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

    expect(runTeachingChatMock).not.toHaveBeenCalled();
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

  it('strips sources when the parent disables source visibility', async () => {
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: 'teacher-1',
            agentPersonaId: 'persona-1',
            playwrightPersonaId: null,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: false,
            allowSelectedTextSupport: true,
            dailyMessageLimit: 2,
          },
        });
      }
      if (key === KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            dateKey: '2026-03-07',
            messageCount: 1,
            updatedAt: '2026-03-07T08:00:00.000Z',
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

    runTeachingChatMock.mockResolvedValue({
      message: 'Sprawdź znak działania i policz jeszcze raz.',
      sources: [
        {
          documentId: 'doc-1',
          collectionId: 'collection-1',
          score: 0.91,
          text: 'Dodawanie łączy dwie liczby w jedną sumę.',
          metadata: {
            title: 'Dodawanie podstawy',
          },
        },
      ],
    });

    const response = await postKangurAiTutorChatHandler(
      createPostRequest(
        JSON.stringify({
          messages: [{ role: 'user', content: 'Pomóż mi z tym pytaniem.' }],
          context: {
            surface: 'lesson',
            contentId: 'lesson-1',
            title: 'Dodawanie',
            promptMode: 'chat',
          },
        })
      ),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual({
      message: 'Sprawdź znak działania i policz jeszcze raz.',
      sources: [],
      followUpActions: [],
      usage: {
        dateKey: '2026-03-07',
        messageCount: 2,
        dailyMessageLimit: 2,
        remainingMessages: 0,
      },
    });
    expect(logKangurServerEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'kangur.ai-tutor.chat.completed',
        context: expect.objectContaining({
          returnedSourceCount: 0,
          retrievedSourceCount: 1,
          showSources: false,
          dailyMessageLimit: 2,
          dailyUsageCount: 2,
          dailyUsageRemaining: 0,
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
            teachingAgentId: 'teacher-1',
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
              title: 'Dodawanie',
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

    expect(runTeachingChatMock).not.toHaveBeenCalled();
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
