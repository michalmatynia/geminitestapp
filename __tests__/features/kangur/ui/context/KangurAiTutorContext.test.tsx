/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  DrawingHarness,
  Harness,
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  KangurAiTutorProvider,
  SelectedTextHarness,
  SurfaceOverrideHarness,
  TutorAvailabilityHarness,
  apiGetMock,
  apiPostMock,
  createApiError,
  logKangurClientErrorMock,
  resetKangurAiTutorContextTestState,
  settingsStoreMock,
  trackKangurClientEventMock,
  useAgentPersonasMock,
  useOptionalKangurAuthMock,
} from './KangurAiTutorContext.test-support';

describe('KangurAiTutorContext', () => {
  beforeEach(() => {
    resetKangurAiTutorContextTestState();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads current tutor usage and refreshes it after a successful tutor send', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowCrossPagePersistence: true,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: 3,
          },
        });
      }
      return undefined;
    });
    apiGetMock.mockResolvedValue({
      usage: {
        dateKey: '2026-03-07',
        messageCount: 1,
        dailyMessageLimit: 3,
        remainingMessages: 2,
      },
    });
    apiPostMock.mockResolvedValue({
      message: 'Spróbuj policzyć krok po kroku.',
      answerResolutionMode: 'brain',
      suggestedMoodId: 'encouraging',
      knowledgeGraph: {
        applied: true,
        queryStatus: 'hit',
        queryMode: 'website_help',
        recallStrategy: 'metadata_only',
        lexicalHitCount: 1,
        vectorHitCount: 0,
        vectorRecallAttempted: false,
        websiteHelpApplied: true,
        websiteHelpTargetNodeId: 'flow:kangur:sign-in',
      },
      websiteHelpTarget: {
        nodeId: 'flow:kangur:sign-in',
        label: 'Zaloguj się',
        route: '/',
        anchorId: 'kangur-primary-nav-login',
      },
      tutorMood: {
        currentMoodId: 'supportive',
        baselineMoodId: 'encouraging',
        confidence: 0.72,
        lastComputedAt: '2026-03-08T12:00:00.000Z',
        lastReasonCode: 'learner_confusion',
      },
      sources: [
        {
          documentId: 'doc-1',
          collectionId: 'math-docs',
          score: 0.88,
          text: 'Dodawanie polega na łączeniu dwóch liczb.',
        },
      ],
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
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
        rationale:
          'Uczeń jest w trakcie próby, więc tutor powinien prowadzić bardzo małymi krokami.',
      },
      usage: {
        dateKey: '2026-03-07',
        messageCount: 2,
        dailyMessageLimit: 3,
        remainingMessages: 1,
      },
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'test',
          contentId: 'suite-1',
          title: 'Kangur Mini',
          currentQuestion: 'Ile to 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    expect(screen.getByTestId('tutor-name')).toHaveTextContent('Mila');
    expect(screen.getByTestId('guest-intro-mode')).toHaveTextContent('first_visit');
    expect(screen.getByTestId('tutor-mood')).toHaveTextContent('neutral');
    expect(screen.getByTestId('tutor-behavior-mood')).toHaveTextContent('neutral');
    expect(screen.getByTestId('tutor-behavior-mood-label')).toHaveTextContent('Neutralny');
    expect(screen.getByTestId('tutor-avatar')).toHaveTextContent('present');
    expect(screen.getByTestId('tutor-avatar-image-url')).toHaveTextContent('none');
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/usage'));
    expect(screen.getByTestId('usage-summary')).toHaveTextContent('1/3/2');

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('tutor-mood')).toHaveTextContent('encouraging'));
    await waitFor(() =>
      expect(screen.getByTestId('tutor-behavior-mood')).toHaveTextContent('supportive')
    );
    expect(screen.getByTestId('tutor-behavior-mood-label')).toHaveTextContent('Wspierający');

    expect(apiPostMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/chat', {
      messages: [{ role: 'user', content: 'Pomóż mi z tym zadaniem.' }],
      context: {
        surface: 'test',
        contentId: 'suite-1',
        title: 'Kangur Mini',
        currentQuestion: 'Ile to 2 + 2?',
        questionProgressLabel: 'Pytanie 1/10',
        promptMode: 'hint',
        selectedText: '2 + 2',
      },
    });
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      1,
      'kangur_ai_tutor_message_sent',
      expect.objectContaining({
        surface: 'test',
        contentId: 'suite-1',
        title: 'Kangur Mini',
        promptMode: 'hint',
        selectedText: '2 + 2',
        latestUserMessage: 'Pomóż mi z tym zadaniem.',
        hasSelectedText: true,
        messageCount: 1,
      })
    );
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      2,
      'kangur_ai_tutor_message_succeeded',
      expect.objectContaining({
        surface: 'test',
        contentId: 'suite-1',
        promptMode: 'hint',
        hasSources: true,
        sourcesCount: 1,
        followUpActionCount: 1,
        primaryFollowUpActionId: 'recommendation:strengthen_lesson_mastery',
        primaryFollowUpPage: 'Lessons',
        hasBridgeFollowUpAction: false,
        bridgeFollowUpActionCount: 0,
        bridgeFollowUpDirection: null,
        coachingMode: 'hint_ladder',
        knowledgeGraphApplied: true,
        knowledgeGraphQueryMode: 'website_help',
        knowledgeGraphRecallStrategy: 'metadata_only',
        knowledgeGraphLexicalHitCount: 1,
        knowledgeGraphVectorHitCount: 0,
        knowledgeGraphVectorRecallAttempted: false,
        answerResolutionMode: 'brain',
        websiteHelpGraphApplied: true,
        websiteHelpGraphTargetNodeId: 'flow:kangur:sign-in',
      })
    );
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Spróbuj policzyć krok po kroku.'
      )
    );
    expect(screen.getByTestId('follow-up-actions')).toHaveTextContent(
      'Powtórz lekcję: Dodawanie:Otwórz lekcję'
    );
    expect(screen.getByTestId('coaching-summary')).toHaveTextContent(
      'hint_ladder:Jeden trop'
    );
    expect(screen.getByTestId('website-help-targets')).toHaveTextContent(
      'Zaloguj się:/:kangur-primary-nav-login'
    );
    expect(screen.getByTestId('usage-summary')).toHaveTextContent('2/3/1');
  });

  it('includes selected choice metadata from the active test session in outgoing tutor requests', async () => {
    apiPostMock.mockResolvedValue({
      message: 'Sprawdź jeszcze raz, czy wybrana odpowiedź pasuje do treści zadania.',
      sources: [],
      followUpActions: [],
      usage: {
        dateKey: '2026-03-07',
        messageCount: 1,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'test',
          contentId: 'suite-1',
          title: 'Kangur Mini',
          questionId: 'question-1',
          currentQuestion: 'Ile to 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          selectedChoiceLabel: 'B',
          selectedChoiceText: '5',
          answerRevealed: false,
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    const expectedHintContext = {
      surface: 'test',
      contentId: 'suite-1',
      questionId: 'question-1',
      currentQuestion: 'Ile to 2 + 2?',
      questionProgressLabel: 'Pytanie 1/10',
      selectedChoiceLabel: 'B',
      selectedChoiceText: '5',
      promptMode: 'hint',
      selectedText: '2 + 2',
    };
    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/ai-tutor/chat',
      expect.objectContaining({
        context: expect.objectContaining(expectedHintContext),
      })
    );
  });

  it('allows section explains to override the active page surface when the anchor belongs to auth', async () => {
    apiPostMock.mockResolvedValue({
      message: 'To przycisk logowania dla osób, które mają już konto.',
      sources: [],
      followUpActions: [],
      usage: {
        dateKey: '2026-03-07',
        messageCount: 1,
        dailyMessageLimit: 3,
        remainingMessages: 2,
      },
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'game',
          contentId: 'game:home',
          title: 'Gra Kangur',
        }}
      >
        <SurfaceOverrideHarness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send with surface override' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(apiPostMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/chat', {
      messages: [{ role: 'user', content: 'Wyjaśnij logowanie.' }],
      context: {
        surface: 'auth',
        contentId: 'game:home',
        title: 'Gra Kangur',
        promptMode: 'explain',
        focusKind: 'login_action',
        focusId: 'kangur-auth-login-action',
        focusLabel: 'Zaloguj się',
        interactionIntent: 'explain',
      },
    });
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      1,
      'kangur_ai_tutor_message_sent',
      expect.objectContaining({
        surface: 'auth',
        promptMode: 'explain',
        focusKind: 'login_action',
        focusId: 'kangur-auth-login-action',
        focusLabel: 'Zaloguj się',
        interactionIntent: 'explain',
        latestUserMessage: 'Wyjaśnij logowanie.',
      })
    );
  });

  it('sends learner drawings as artifacts and stores assistant drawing replies', async () => {
    apiPostMock.mockResolvedValue({
      message: 'Najpierw policz lewa strone, potem prawa.',
      artifacts: [
        {
          type: 'assistant_drawing',
          title: 'Dwie pary',
          caption: 'Kazda para ma po dwa elementy.',
          alt: 'Dwie pary kropek ustawione obok siebie.',
          svgContent:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><circle cx="90" cy="90" r="18" fill="#f59e0b" /><circle cx="130" cy="90" r="18" fill="#f59e0b" /><circle cx="190" cy="90" r="18" fill="#fb7185" /><circle cx="230" cy="90" r="18" fill="#fb7185" /></svg>',
        },
      ],
      sources: [],
      followUpActions: [],
      usage: {
        dateKey: '2026-03-07',
        messageCount: 1,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-2',
          title: 'Dodawanie obrazkami',
        }}
      >
        <DrawingHarness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send drawing' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(apiPostMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/chat', {
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
        contentId: 'lesson-2',
        title: 'Dodawanie obrazkami',
        promptMode: 'explain',
        drawingImageData: 'data:image/png;base64,AAA',
      },
    });
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      1,
      'kangur_ai_tutor_message_sent',
      expect.objectContaining({
        surface: 'lesson',
        contentId: 'lesson-2',
        promptMode: 'explain',
        hasDrawingAttachment: true,
      })
    );
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      2,
      'kangur_ai_tutor_message_succeeded',
      expect.objectContaining({
        surface: 'lesson',
        contentId: 'lesson-2',
        promptMode: 'explain',
        hasDrawingArtifact: true,
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('drawing-messages')).toHaveTextContent(
        'Wyjaśnij to rysunkiem. | Najpierw policz lewa strone, potem prawa.'
      )
    );
    expect(screen.getByTestId('drawing-artifacts')).toHaveTextContent('user_drawing');
    expect(screen.getByTestId('drawing-artifacts')).toHaveTextContent('assistant_drawing');
    expect(screen.getByTestId('drawing-artifacts')).toHaveTextContent('Dwie pary');
  });

  it('reads global AI Tutor app settings from the settings store', () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          guestIntroMode: 'every_visit',
          dailyMessageLimit: 6,
        });
      }

      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({});
      }

      return undefined;
    });

    render(
      <KangurAiTutorProvider>
        <Harness />
      </KangurAiTutorProvider>
    );

    expect(screen.getByTestId('guest-intro-mode')).toHaveTextContent('every_visit');
  });

  it('uses the global tutor persona identity when no learner is active', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          agentPersonaId: 'persona-1',
        });
      }

      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({});
      }

      return undefined;
    });

    useAgentPersonasMock.mockReturnValue({
      data: [
        {
          id: 'persona-1',
          name: 'Mila',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '',
              avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/avatar.png',
              avatarImageFileId: 'file-1',
            },
          ],
        },
      ],
    });

    render(
      <KangurAiTutorProvider>
        <Harness />
      </KangurAiTutorProvider>
    );

    await waitFor(() => expect(screen.getByTestId('tutor-name')).toHaveTextContent('Mila'));
    expect(screen.getByTestId('tutor-avatar-image-url')).toHaveTextContent(
      '/uploads/agentcreator/personas/persona-1/neutral/avatar.png'
    );
  });

  it('keeps learner tutor settings available without a live tutor session', () => {
    useOptionalKangurAuthMock.mockReturnValue({
      user: {
        ownerEmailVerified: true,
        activeLearner: {
          id: 'learner-1',
          aiTutor: null,
        },
        learners: [
          {
            id: 'learner-1',
            aiTutor: null,
          },
        ],
      },
    });

    render(
      <KangurAiTutorProvider>
        <TutorAvailabilityHarness />
      </KangurAiTutorProvider>
    );

    expect(screen.getByTestId('settings-enabled')).toHaveTextContent('true');
    expect(screen.getByTestId('availability-enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('has-session-context')).toHaveTextContent('false');
  });

  it('falls back to the content-backed tutor name when no persona is resolved', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_APP_SETTINGS_KEY) {
        return JSON.stringify({
          enabled: true,
          agentPersonaId: 'persona-missing',
          guestIntroMode: 'first_visit',
        });
      }

      return undefined;
    });
    useAgentPersonasMock.mockReturnValue({
      data: [],
    });

    render(
      <KangurAiTutorProvider>
        <Harness />
      </KangurAiTutorProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('tutor-name')).toHaveTextContent(
        DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.defaultTutorName
      )
    );
  });

  it('tracks repeated tutor questions within the same session before sending again', async () => {
    apiPostMock.mockResolvedValue({
      message: 'Spróbuj jeszcze raz od pierwszego kroku.',
      sources: [],
      followUpActions: [],
      usage: {
        dateKey: '2026-03-07',
        messageCount: 1,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Spróbuj jeszcze raz od pierwszego kroku.'
      )
    );

    trackKangurClientEventMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect(apiPostMock).toHaveBeenLastCalledWith(
      '/api/kangur/ai-tutor/chat',
      expect.objectContaining({
        context: expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-1',
          promptMode: 'hint',
          selectedText: '2 + 2',
          repeatedQuestionCount: 1,
        }),
      })
    );
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      1,
      'kangur_ai_tutor_repeat_question_detected',
      expect.objectContaining({
        surface: 'lesson',
        contentId: 'lesson-1',
        promptMode: 'hint',
        isRepeatedQuestion: true,
        repeatCount: 1,
      })
    );
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      2,
      'kangur_ai_tutor_message_sent',
      expect.objectContaining({
        surface: 'lesson',
        contentId: 'lesson-1',
        promptMode: 'hint',
        isRepeatedQuestion: true,
        repeatCount: 1,
      })
    );
  });

  it('tracks same-session recovery after a hint when the learner reaches review mode', async () => {
    apiPostMock.mockResolvedValue({
      message: 'Zacznij od dodania pierwszych dwóch liczb.',
      sources: [],
      followUpActions: [],
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
      },
    });

    const { rerender } = render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'test',
          contentId: 'suite-1',
          title: 'Kangur Mini',
          questionId: 'question-1',
          currentQuestion: 'Ile to 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          answerRevealed: false,
          focusKind: 'question',
          focusId: 'question-1',
          focusLabel: 'Pytanie 1',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Zacznij od dodania pierwszych dwóch liczb.'
      )
    );

    trackKangurClientEventMock.mockClear();

    rerender(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'test',
          contentId: 'suite-1',
          title: 'Kangur Mini',
          questionId: 'question-1',
          currentQuestion: 'Ile to 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          answerRevealed: true,
          focusKind: 'review',
          focusId: 'review-1',
          focusLabel: 'Omówienie pytania 1',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    await waitFor(() =>
      expect(trackKangurClientEventMock).toHaveBeenCalledWith(
        'kangur_ai_tutor_recovery_after_hint',
        expect.objectContaining({
          surface: 'test',
          contentId: 'suite-1',
          questionId: 'question-1',
          focusKind: 'question',
          coachingMode: 'hint_ladder',
          recoverySignal: 'answer_revealed',
          nextQuestionId: 'question-1',
          nextFocusKind: 'review',
        })
      )
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledTimes(1);

    apiPostMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(apiPostMock).toHaveBeenLastCalledWith(
      '/api/kangur/ai-tutor/chat',
      expect.objectContaining({
        context: expect.objectContaining({
          surface: 'test',
          contentId: 'suite-1',
          promptMode: 'hint',
          selectedText: '2 + 2',
          recentHintRecoverySignal: 'answer_revealed',
          previousCoachingMode: 'hint_ladder',
        }),
      })
    );

    rerender(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'test',
          contentId: 'suite-1',
          title: 'Kangur Mini',
          questionId: 'question-1',
          currentQuestion: 'Ile to 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          answerRevealed: true,
          focusKind: 'review',
          focusId: 'review-1',
          focusLabel: 'Omówienie pytania 1',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    await waitFor(() =>
      expect(
        trackKangurClientEventMock.mock.calls.filter(
          ([eventName]) => eventName === 'kangur_ai_tutor_recovery_after_hint'
        )
      ).toHaveLength(1)
    );
  });

  it('hydrates the learner-scoped tutor mood from the active learner profile', async () => {
    useOptionalKangurAuthMock.mockReturnValue({
      user: {
        id: 'parent-1',
        full_name: 'Parent Ada',
        email: 'parent@example.com',
        role: 'user',
        actorType: 'parent',
        canManageLearners: true,
        ownerUserId: 'parent-1',
        activeLearner: {
          id: 'learner-1',
          ownerUserId: 'parent-1',
          displayName: 'Ada',
          loginName: 'ada',
          status: 'active',
          legacyUserKey: null,
          aiTutor: {
            currentMoodId: 'calm',
            baselineMoodId: 'supportive',
            confidence: 0.66,
            lastComputedAt: '2026-03-08T11:30:00.000Z',
            lastReasonCode: 'learner_confusion',
          },
          createdAt: '2026-03-07T10:00:00.000Z',
          updatedAt: '2026-03-08T11:30:00.000Z',
        },
        learners: [],
      },
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId('tutor-behavior-mood')).toHaveTextContent('calm')
    );
    expect(screen.getByTestId('tutor-behavior-mood-label')).toHaveTextContent('Spokojny');
    expect(screen.getByTestId('tutor-behavior-mood-description')).toHaveTextContent(
      'Tutor obniża napięcie i porządkuje sytuację krok po kroku.'
    );
  });

  it('surfaces uploaded persona avatar image URLs from the resolved tutor mood', async () => {
    useAgentPersonasMock.mockReturnValue({
      data: [
        {
          id: 'persona-1',
          name: 'Mila',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '',
              avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/avatar.png',
              avatarImageFileId: 'file-1',
            },
          ],
        },
      ],
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    await waitFor(() => expect(screen.getByTestId('tutor-name')).toHaveTextContent('Mila'));
    expect(screen.getByTestId('tutor-avatar')).toHaveTextContent('missing');
    expect(screen.getByTestId('tutor-avatar-image-url')).toHaveTextContent(
      '/uploads/agentcreator/personas/persona-1/neutral/avatar.png'
    );
  });

  it('prefers embedded persona avatar thumbnails when the resolved mood opts into them', async () => {
    useAgentPersonasMock.mockReturnValue({
      data: [
        {
          id: 'persona-1',
          name: 'Mila',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '',
              avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/avatar.png',
              avatarImageFileId: 'file-1',
              avatarThumbnailDataUrl: 'data:image/png;base64,AAA',
              avatarThumbnailMimeType: 'image/png',
              avatarThumbnailBytes: 3,
              avatarThumbnailWidth: 64,
              avatarThumbnailHeight: 64,
              useEmbeddedThumbnail: true,
            },
          ],
        },
      ],
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    await waitFor(() => expect(screen.getByTestId('tutor-name')).toHaveTextContent('Mila'));
    expect(screen.getByTestId('tutor-avatar')).toHaveTextContent('missing');
    expect(screen.getByTestId('tutor-avatar-image-url')).toHaveTextContent(
      'data:image/png;base64,AAA'
    );
  });

  it('falls back to the default mood avatar image when the active tutor mood has no visual asset', async () => {
    apiPostMock.mockReturnValue(new Promise<never>(() => {}));

    useAgentPersonasMock.mockReturnValue({
      data: [
        {
          id: 'persona-1',
          name: 'Mila',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent: '',
              avatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/avatar.png',
              avatarImageFileId: 'file-1',
            },
            {
              id: 'thinking',
              label: 'Thinking',
              svgContent: '',
              avatarImageUrl: null,
              avatarImageFileId: null,
            },
          ],
        },
      ],
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByTestId('is-loading')).toHaveTextContent('true'));
    expect(screen.getByTestId('tutor-mood')).toHaveTextContent('thinking');
    expect(screen.getByTestId('tutor-avatar-image-url')).toHaveTextContent(
      '/uploads/agentcreator/personas/persona-1/neutral/avatar.png'
    );
  });

  it('tracks failed tutor sends and logs the client error', async () => {
    apiPostMock.mockRejectedValue(
      createApiError('Daily AI Tutor message limit reached for this learner. Try again tomorrow.', 429)
    );

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(trackKangurClientEventMock).toHaveBeenCalledWith(
        'kangur_ai_tutor_message_failed',
        expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-1',
          promptMode: 'hint',
        })
      )
    );
    expect(logKangurClientErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'KangurAiTutorContext',
        action: 'sendMessage',
        surface: 'lesson',
        contentId: 'lesson-1',
        promptMode: 'hint',
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Daily AI Tutor message limit reached for this learner. Try again tomorrow.'
      )
    );
  });

  it('switches to the thinking mood while a tutor response is loading', async () => {
    useAgentPersonasMock.mockReturnValue({
      data: [
        {
          id: 'persona-1',
          name: 'Mila',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent:
                '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="#ffffff" /></svg>',
            },
            {
              id: 'thinking',
              label: 'Thinking',
              svgContent:
                '<svg viewBox="0 0 100 100"><rect x="22" y="22" width="56" height="56" fill="#ffffff" /></svg>',
            },
            {
              id: 'happy',
              label: 'Happy',
              svgContent:
                '<svg viewBox="0 0 100 100"><circle cx="36" cy="40" r="8" fill="#ffffff" /><circle cx="64" cy="40" r="8" fill="#ffffff" /><path d="M24 58 Q50 82 76 58" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
            },
          ],
        },
      ],
    });
    let resolveChat:
      | ((value: {
          message: string;
          suggestedMoodId?: 'happy';
          sources: [];
          followUpActions: [];
        }) => void)
      | null = null;
    apiPostMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve;
        })
    );

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByTestId('tutor-mood')).toHaveTextContent('thinking'));

    resolveChat?.({
      message: 'Spróbuj policzyć od lewej.',
      suggestedMoodId: 'happy',
      sources: [],
      followUpActions: [],
    });

    await waitFor(() => expect(screen.getByTestId('tutor-mood')).toHaveTextContent('happy'));
  });

  it('drops selected-text metadata and hidden sources when parent guardrails disable them', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowCrossPagePersistence: true,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: false,
            allowSelectedTextSupport: false,
            dailyMessageLimit: 10,
          },
        });
      }
      return undefined;
    });

    apiPostMock.mockResolvedValue({
      message: 'Najpierw sprawdź działanie.',
      sources: [
        {
          documentId: 'doc-1',
          collectionId: 'math-docs',
          score: 0.88,
          text: 'Dodawanie polega na łączeniu dwóch liczb.',
        },
      ],
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <SelectedTextHarness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send selected text' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));

    expect(apiPostMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/chat', {
      messages: [{ role: 'user', content: 'Wyjaśnij zaznaczony fragment.' }],
      context: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
        promptMode: 'chat',
      },
    });
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      1,
      'kangur_ai_tutor_message_sent',
      expect.objectContaining({
        promptMode: 'chat',
        hasSelectedText: false,
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('selected-text-messages')).toHaveTextContent(
        'Wyjaśnij zaznaczony fragment. | Najpierw sprawdź działanie.'
      )
    );
  });
});
