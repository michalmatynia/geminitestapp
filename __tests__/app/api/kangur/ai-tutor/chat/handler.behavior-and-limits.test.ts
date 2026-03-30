import { describe, expect, it, vi } from 'vitest';

import * as kangurAiTutorSettings from '@/features/kangur/settings-ai-tutor';
import * as kangurAiTutorUsage from '@/features/kangur/server/ai-tutor-usage';
import { quotaExceededError } from '@/shared/errors/app-error';

import {
  AGENT_PERSONA_SETTINGS_KEY,
  buildKangurAiTutorAdaptiveGuidanceMock,
  contextRegistryResolveRefsMock,
  createContextRegistryBundle,
  createPostRequest,
  createRequestContext,
  expectTutorSource,
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  KANGUR_AI_TUTOR_USAGE_SETTINGS_KEY,
  logKangurServerEventMock,
  postKangurAiTutorChatHandler,
  readStoredSettingValueMock,
  registerKangurAiTutorChatHandlerTestHooks,
  resolveBrainExecutionConfigForCapabilityMock,
  runBrainChatCompletionMock,
  upsertStoredSettingValueMock,
} from './handler.test-support';

const createTutorSettings = (
  overrides: Partial<kangurAiTutorSettings.KangurAiTutorLearnerSettings> = {},
): kangurAiTutorSettings.KangurAiTutorLearnerSettings => ({
  ...kangurAiTutorSettings.DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS,
  enabled: true,
  agentPersonaId: 'persona-1',
  allowLessons: true,
  allowGames: true,
  testAccessMode: 'guided',
  showSources: true,
  allowSelectedTextSupport: true,
  hintDepth: 'step_by_step',
  proactiveNudges: 'coach',
  rememberTutorContext: true,
  ...overrides,
});

describe('kangur ai tutor chat handler behavior and limits', () => {
  registerKangurAiTutorChatHandlerTestHooks();

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
          reason: 'Powtorz lekcje: Dodawanie',
        },
      ],
      coachingFrame: {
        mode: 'next_best_action',
        label: 'Następny krok',
        description: 'Wskaz jedna konkretna aktywność Kangur jako najlepszy dalszy ruch.',
        rationale: 'Najwięcej wartosci da teraz jedna jasna aktywność, a nie kilka opcji naraz.',
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
      }),
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
        }),
      ),
      createRequestContext(),
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
      }),
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
          reason: 'Powtorz lekcje: Dodawanie',
        },
      ],
      coachingFrame: {
        mode: 'next_best_action',
        label: 'Następny krok',
        description: 'Wskaz jedna konkretna aktywność Kangur jako najlepszy dalszy ruch.',
        rationale: 'Najwięcej wartosci da teraz jedna jasna aktywność, a nie kilka opcji naraz.',
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
      }),
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
      text: JSON.stringify({
        message: 'Skup się na zaznaczonym fragmencie i policz krok po kroku.',
      }),
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
        }),
      ),
      createRequestContext(),
    );

    expect(resolveBrainExecutionConfigForCapabilityMock).toHaveBeenCalledWith(
      KANGUR_AI_TUTOR_BRAIN_CAPABILITY,
      expect.objectContaining({
        defaultTemperature: 0.4,
        defaultMaxTokens: 600,
      }),
    );
    expect(runBrainChatCompletionMock).toHaveBeenCalledTimes(1);
    const brainInput = runBrainChatCompletionMock.mock.calls[0]?.[0];
    expect(brainInput.jsonMode).toBe(true);
    expect(brainInput.messages[0].content).toContain('Learner selected this text: """3 + 4"""');
    expect(brainInput.messages[0].content).toContain(
      'The learner selected a specific excerpt. Focus on that excerpt first and relate your response back to it.',
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      message: 'Skup się na zaznaczonym fragmencie i policz krok po kroku.',
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
      }),
    );
    expect(body.sources[0].text).toContain('Ćwiczenia z podstaw dodawania.');
  });

  it('logs failed tutor runs for observability', async () => {
    vi
      .spyOn(kangurAiTutorSettings, 'getKangurAiTutorSettingsForLearner')
      .mockReturnValue(
        createTutorSettings({
          dailyMessageLimit: 2,
        }),
      );
    vi
      .spyOn(kangurAiTutorSettings, 'resolveKangurAiTutorAvailability')
      .mockReturnValue({ allowed: true });
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
          }),
        ),
        createRequestContext(),
      ),
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
      }),
    );
    expect(upsertStoredSettingValueMock).not.toHaveBeenCalled();
  });

  it('rejects active test tutoring when the parent only allows review after the answer', async () => {
    vi
      .spyOn(kangurAiTutorSettings, 'getKangurAiTutorSettingsForLearner')
      .mockReturnValue(
        createTutorSettings({
          testAccessMode: 'review_after_answer',
        }),
      );
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: 'legacy-teacher',
            rememberTutorContext: true,
            allowLessons: true,
            testAccessMode: 'review_after_answer',
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
          }),
        ),
        createRequestContext(),
      ),
    ).rejects.toMatchObject({
      message: 'AI Tutor is available in tests only after the answer has been revealed.',
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
      }),
    );
  });

  it('rejects game tutoring when the parent disables the tutor for Grajmy separately from lessons', async () => {
    vi
      .spyOn(kangurAiTutorSettings, 'getKangurAiTutorSettingsForLearner')
      .mockReturnValue(
        createTutorSettings({
          allowGames: false,
        }),
      );
    readStoredSettingValueMock.mockImplementation(async (key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            teachingAgentId: 'legacy-teacher',
            rememberTutorContext: true,
            allowLessons: true,
            allowGames: false,
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
          }),
        ),
        createRequestContext(),
      ),
    ).rejects.toMatchObject({
      message: 'AI Tutor is disabled for games for this learner.',
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
      }),
    );
  });

  it('rejects requests after the learner reaches the daily tutor message limit', async () => {
    vi
      .spyOn(kangurAiTutorSettings, 'getKangurAiTutorSettingsForLearner')
      .mockReturnValue(
        createTutorSettings({
          dailyMessageLimit: 2,
        }),
      );
    vi
      .spyOn(kangurAiTutorSettings, 'resolveKangurAiTutorAvailability')
      .mockReturnValue({ allowed: true });
    vi
      .spyOn(kangurAiTutorUsage, 'ensureKangurAiTutorDailyUsageAvailable')
      .mockRejectedValue(
        quotaExceededError(
          'Daily AI Tutor message limit reached for this learner. Try again tomorrow.',
          {
            learnerId: 'learner-1',
            dateKey: '2026-03-07',
            dailyMessageLimit: 2,
            messageCount: 2,
            remainingMessages: 0,
          },
        ),
      );
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
          }),
        ),
        createRequestContext(),
      ),
    ).rejects.toMatchObject({
      message: 'Daily AI Tutor message limit reached for this learner. Try again tomorrow.',
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
      }),
    );
  });
});
