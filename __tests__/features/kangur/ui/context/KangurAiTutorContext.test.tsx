/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { trackKangurClientEventMock, logKangurClientErrorMock, withKangurClientError, withKangurClientErrorSync } =
  globalThis.__kangurClientErrorMocks();
const settingsStoreMock = {
  get: vi.fn<(key: string) => string | undefined>(),
};
const apiGetMock = vi.fn();
const apiPostMock = vi.fn();
const useAgentPersonasMock = vi.fn();
const useOptionalKangurAuthMock = vi.fn();

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      get: (...args: Parameters<typeof apiGetMock>) => apiGetMock(...args),
      post: (...args: Parameters<typeof apiPostMock>) => apiPostMock(...args),
    },
  };
});

vi.mock('@/shared/hooks/useAgentPersonaVisuals', () => ({
  useAgentPersonaVisuals: (...args: Parameters<typeof useAgentPersonasMock>) =>
    useAgentPersonasMock(...args),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: (...args: Parameters<typeof useOptionalKangurAuthMock>) =>
    useOptionalKangurAuthMock(...args),
}));

vi.mock('@/features/kangur/observability/client', () => {
  const {
    trackKangurClientEventMock,
    logKangurClientErrorMock,
    withKangurClientError,
    withKangurClientErrorSync,
  } = globalThis.__kangurClientErrorMocks();
  return {
    trackKangurClientEvent: trackKangurClientEventMock,
    logKangurClientError: logKangurClientErrorMock,
    withKangurClientError,
    withKangurClientErrorSync,
  };
});

import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
} from '@/features/kangur/settings-ai-tutor';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';
import { ApiError } from '@/shared/lib/api-client';
import {
  KangurAiTutorProvider,
  KangurAiTutorSessionSync,
  useKangurAiTutor,
} from '@/features/kangur/ui/context/KangurAiTutorContext';

function Harness(): React.JSX.Element {
  const {
    appSettings,
    tutorName,
    tutorMoodId,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorBehaviorMoodDescription,
    tutorAvatarSvg,
    tutorAvatarImageUrl,
    messages,
    sendMessage,
    usageSummary,
    isOpen,
    isLoading,
    isUsageLoading,
    openChat,
    recordFollowUpCompletion,
  } = useKangurAiTutor();
  const followUpSummary = messages
    .flatMap((message) =>
      (message.followUpActions ?? []).map((action) => `${action.reason ?? action.id}:${action.label}`)
    )
    .join(' | ');
  const coachingSummary = messages
    .flatMap((message) =>
      message.coachingFrame
        ? [`${message.coachingFrame.mode}:${message.coachingFrame.label}`]
        : []
    )
    .join(' | ');
  const websiteHelpTargets = messages
    .flatMap((message) =>
      message.websiteHelpTarget
        ? [
            `${message.websiteHelpTarget.label}:${message.websiteHelpTarget.route ?? 'none'}:${message.websiteHelpTarget.anchorId ?? 'none'}`,
          ]
        : []
    )
    .join(' | ');

  return (
    <div>
      <div data-testid='guest-intro-mode'>{appSettings.guestIntroMode}</div>
      <div data-testid='tutor-name'>{tutorName}</div>
      <div data-testid='tutor-mood'>{tutorMoodId}</div>
      <div data-testid='tutor-behavior-mood'>{tutorBehaviorMoodId}</div>
      <div data-testid='tutor-behavior-mood-label'>{tutorBehaviorMoodLabel}</div>
      <div data-testid='tutor-behavior-mood-description'>{tutorBehaviorMoodDescription}</div>
      <div data-testid='tutor-avatar'>{tutorAvatarSvg ? 'present' : 'missing'}</div>
      <div data-testid='tutor-avatar-image-url'>{tutorAvatarImageUrl ?? 'none'}</div>
      <div data-testid='is-open'>{String(isOpen)}</div>
      <div data-testid='is-loading'>{String(isLoading)}</div>
      <div data-testid='is-usage-loading'>{String(isUsageLoading)}</div>
      <div data-testid='usage-summary'>
        {usageSummary
          ? `${usageSummary.messageCount}/${usageSummary.dailyMessageLimit ?? 'none'}/${usageSummary.remainingMessages ?? 'none'}`
          : 'none'}
      </div>
      <button type='button' onClick={openChat}>
        Open tutor
      </button>
      <button
        type='button'
        onClick={() =>
          recordFollowUpCompletion?.({
            actionId: 'recommendation:strengthen_lesson_mastery',
            actionLabel: 'Otwórz lekcję',
            actionReason: 'Powtórz lekcję: Dodawanie',
            actionPage: 'Lessons',
            targetPath: '/kangur/lessons',
            targetSearch: '?focus=adding',
          })
        }
      >
        Record follow-up completion
      </button>
      <button
        type='button'
        onClick={() =>
          void sendMessage('Pomóż mi z tym zadaniem.', {
            promptMode: 'hint',
            selectedText: '2 + 2',
          })
        }
      >
        Send
      </button>
      <div data-testid='messages'>{messages.map((message) => message.content).join(' | ')}</div>
      <div data-testid='follow-up-actions'>{followUpSummary || 'none'}</div>
      <div data-testid='coaching-summary'>{coachingSummary || 'none'}</div>
      <div data-testid='website-help-targets'>{websiteHelpTargets || 'none'}</div>
    </div>
  );
}

function SelectedTextHarness(): React.JSX.Element {
  const { messages, sendMessage } = useKangurAiTutor();

  return (
    <div>
      <button
        type='button'
        onClick={() =>
          void sendMessage('Wyjaśnij zaznaczony fragment.', {
            promptMode: 'selected_text',
            selectedText: '2 + 2',
          })
        }
      >
        Send selected text
      </button>
      <div data-testid='selected-text-messages'>
        {messages.map((message) => message.content).join(' | ')}
      </div>
    </div>
  );
}

function DrawingHarness(): React.JSX.Element {
  const { messages, sendMessage } = useKangurAiTutor();

  return (
    <div>
      <button
        type='button'
        onClick={() =>
          void sendMessage('Wyjaśnij to rysunkiem.', {
            promptMode: 'explain',
            drawingImageData: 'data:image/png;base64,AAA',
          })
        }
      >
        Send drawing
      </button>
      <div data-testid='drawing-messages'>
        {messages.map((message) => message.content).join(' | ')}
      </div>
      <div data-testid='drawing-artifacts'>
        {JSON.stringify(messages.map((message) => message.artifacts ?? []))}
      </div>
    </div>
  );
}

function SurfaceOverrideHarness(): React.JSX.Element {
  const { messages, sendMessage } = useKangurAiTutor();

  return (
    <div>
      <button
        type='button'
        onClick={() =>
          void sendMessage('Wyjaśnij logowanie.', {
            promptMode: 'explain',
            focusKind: 'login_action',
            focusId: 'kangur-auth-login-action',
            focusLabel: 'Zaloguj się',
            interactionIntent: 'explain',
            surface: 'auth',
          })
        }
      >
        Send with surface override
      </button>
      <div data-testid='surface-override-messages'>
        {messages.map((message) => message.content).join(' | ')}
      </div>
    </div>
  );
}

function TutorAvailabilityHarness(): React.JSX.Element {
  const { enabled, tutorSettings, sessionContext } = useKangurAiTutor();

  return (
    <div>
      <div data-testid='availability-enabled'>{String(enabled)}</div>
      <div data-testid='settings-enabled'>{String(tutorSettings?.enabled ?? false)}</div>
      <div data-testid='has-session-context'>{String(Boolean(sessionContext))}</div>
    </div>
  );
}

describe('KangurAiTutorContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.sessionStorage.clear();
    apiGetMock.mockResolvedValue({
      usage: {
        dateKey: '2026-03-07',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });

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
            dailyMessageLimit: null,
          },
        });
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
              id: 'encouraging',
              label: 'Encouraging',
              svgContent:
                '<svg viewBox="0 0 100 100"><path d="M20 60 Q50 20 80 60" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
            },
          ],
        },
      ],
    });
    useOptionalKangurAuthMock.mockReturnValue(null);
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
    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/kangur/ai-tutor/chat',
      expect.objectContaining({
        context: expect.objectContaining({
          surface: 'test',
          contentId: 'suite-1',
          questionId: 'question-1',
          currentQuestion: 'Ile to 2 + 2?',
          questionProgressLabel: 'Pytanie 1/10',
          selectedChoiceLabel: 'B',
          selectedChoiceText: '5',
          promptMode: 'hint',
          selectedText: '2 + 2',
        }),
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
      new ApiError('Daily AI Tutor message limit reached for this learner. Try again tomorrow.', 429)
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
      expect.any(ApiError),
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

  it('persists tutor conversations per session key across session switches', async () => {
    apiPostMock.mockResolvedValue({
      message: 'Skup się na pierwszym kroku.',
      sources: [],
    });

    function SessionSwitcherHarness(): React.JSX.Element {
      const [lessonId, setLessonId] = React.useState<'lesson-1' | 'lesson-2'>('lesson-1');

      return (
        <div>
          <KangurAiTutorSessionSync
            learnerId='learner-1'
            sessionContext={{
              surface: 'lesson',
              contentId: lessonId,
              title: lessonId === 'lesson-1' ? 'Dodawanie' : 'Odejmowanie',
            }}
          />
          <button type='button' onClick={() => setLessonId('lesson-1')}>
            Go to lesson 1
          </button>
          <button type='button' onClick={() => setLessonId('lesson-2')}>
            Go to lesson 2
          </button>
          <Harness />
        </div>
      );
    }

    render(
      <KangurAiTutorProvider>
        <SessionSwitcherHarness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open tutor' }));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Skup się na pierwszym kroku.'
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to lesson 2' }));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('messages')).toHaveTextContent(''));

    fireEvent.click(screen.getByRole('button', { name: 'Go to lesson 1' }));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Skup się na pierwszym kroku.'
      )
    );
  });

  it('stores compact learner memory and reuses it on the next tutor request when allowed', async () => {
    apiPostMock
      .mockResolvedValueOnce({
        message: 'Skup się na rozbiciu zadania na dwa kroki.',
        sources: [],
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
      })
      .mockResolvedValueOnce({
        message: 'Wróć do dodawania i spróbuj najpierw dojść do pełnej dziesiątki.',
        sources: [],
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
    expect((apiPostMock.mock.calls[0] ?? [])[1]).not.toHaveProperty('memory');
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Skup się na rozbiciu zadania na dwa kroki.'
      )
    );

    await waitFor(() => {
      const persisted = JSON.parse(
        window.sessionStorage.getItem('kangur-ai-tutor-runtime-v1') ?? '{}'
      ) as {
        learnerMemories?: Record<string, Record<string, unknown>>;
      };

      expect(persisted.learnerMemories?.['learner-1::lesson:lesson-1']).toMatchObject({
        lastSurface: 'lesson',
        lastFocusLabel: 'Dodawanie',
        lastUnresolvedBlocker: 'Pomóż mi z tym zadaniem.',
        lastRecommendedAction: 'Otwórz lekcję: Powtórz lekcję: Dodawanie',
        lastSuccessfulIntervention: 'Skup się na rozbiciu zadania na dwa kroki.',
        lastCoachingMode: 'hint_ladder',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect((apiPostMock.mock.calls[1] ?? [])[1]).toMatchObject({
      memory: {
        lastSurface: 'lesson',
        lastFocusLabel: 'Dodawanie',
        lastUnresolvedBlocker: 'Pomóż mi z tym zadaniem.',
        lastRecommendedAction: 'Otwórz lekcję: Powtórz lekcję: Dodawanie',
        lastSuccessfulIntervention: 'Skup się na rozbiciu zadania na dwa kroki.',
        lastCoachingMode: 'hint_ladder',
      },
    });
  });

  it('scopes compact learner memory to the active tutor context so it does not bleed into another lesson', async () => {
    apiPostMock
      .mockResolvedValueOnce({
        message: 'Najpierw rozbij dodawanie na dwa kroki.',
        sources: [],
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
        },
      })
      .mockResolvedValueOnce({
        message: 'W nowej lekcji zacznij od pierwszej odejmowanej liczby.',
        sources: [],
      })
      .mockResolvedValueOnce({
        message: 'Wróć do rozbicia dodawania na dwa kroki.',
        sources: [],
      });

    function SessionSwitcherHarness(): React.JSX.Element {
      const [lessonId, setLessonId] = React.useState<'lesson-1' | 'lesson-2'>('lesson-1');

      return (
        <div>
          <KangurAiTutorSessionSync
            learnerId='learner-1'
            sessionContext={{
              surface: 'lesson',
              contentId: lessonId,
              title: lessonId === 'lesson-1' ? 'Dodawanie' : 'Odejmowanie',
            }}
          />
          <button type='button' onClick={() => setLessonId('lesson-1')}>
            Go to lesson 1
          </button>
          <button type='button' onClick={() => setLessonId('lesson-2')}>
            Go to lesson 2
          </button>
          <Harness />
        </div>
      );
    }

    render(
      <KangurAiTutorProvider>
        <SessionSwitcherHarness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect((apiPostMock.mock.calls[0] ?? [])[1]).not.toHaveProperty('memory');

    fireEvent.click(screen.getByRole('button', { name: 'Go to lesson 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect((apiPostMock.mock.calls[1] ?? [])[1]).not.toHaveProperty('memory');

    fireEvent.click(screen.getByRole('button', { name: 'Go to lesson 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(3));
    expect((apiPostMock.mock.calls[2] ?? [])[1]).toMatchObject({
      memory: {
        lastSurface: 'lesson',
        lastFocusLabel: 'Dodawanie',
        lastUnresolvedBlocker: 'Pomóż mi z tym zadaniem.',
        lastRecommendedAction: 'Otwórz lekcję: Powtórz lekcję: Dodawanie',
        lastSuccessfulIntervention: 'Najpierw rozbij dodawanie na dwa kroki.',
        lastCoachingMode: 'hint_ladder',
      },
    });
  });

  it('records completed tutor follow-ups into compact learner memory for the next request', async () => {
    apiPostMock
      .mockResolvedValueOnce({
        message: 'Wróć do lekcji z dodawania i zrób jedną krótką powtórkę.',
        sources: [],
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
          label: 'Następny krok',
          description: 'Wskaż jedną konkretną aktywność Kangur jako najlepszy dalszy ruch.',
        },
      })
      .mockResolvedValueOnce({
        message: 'Dobrze, po tej powtórce sprawdź jeszcze jedną próbę.',
        sources: [],
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

    fireEvent.click(screen.getByRole('button', { name: 'Record follow-up completion' }));

    await waitFor(() => {
      const persisted = JSON.parse(
        window.sessionStorage.getItem('kangur-ai-tutor-runtime-v1') ?? '{}'
      ) as {
        learnerMemories?: Record<string, Record<string, unknown>>;
      };

      expect(persisted.learnerMemories?.['learner-1::lesson:lesson-1']).toMatchObject({
        lastSurface: 'lesson',
        lastFocusLabel: 'Dodawanie',
        lastRecommendedAction: 'Completed follow-up: Otwórz lekcję: Powtórz lekcję: Dodawanie',
        lastSuccessfulIntervention:
          'The learner completed the tutor follow-up Otwórz lekcję for Powtórz lekcję: Dodawanie on Lessons.',
        lastCoachingMode: 'next_best_action',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect((apiPostMock.mock.calls[1] ?? [])[1]).toMatchObject({
      memory: {
        lastRecommendedAction: 'Completed follow-up: Otwórz lekcję: Powtórz lekcję: Dodawanie',
        lastSuccessfulIntervention:
          'The learner completed the tutor follow-up Otwórz lekcję for Powtórz lekcję: Dodawanie on Lessons.',
        lastCoachingMode: 'next_best_action',
      },
    });
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_follow_up_memory_recorded',
      expect.objectContaining({
        surface: 'lesson',
        contentId: 'lesson-1',
        actionId: 'recommendation:strengthen_lesson_mastery',
        actionPage: 'Lessons',
        targetPath: '/kangur/lessons',
        targetSearch: '?focus=adding',
      })
    );
  });

  it('does not persist compact learner memory when tutor memory is disabled', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowCrossPagePersistence: true,
            rememberTutorContext: false,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: null,
          },
        });
      }
      return undefined;
    });
    apiPostMock.mockResolvedValue({
      message: 'Skup się na pierwszym kroku.',
      sources: [],
      coachingFrame: {
        mode: 'hint_ladder',
        label: 'Jeden trop',
        description:
          'Daj tylko jeden mały krok albo pytanie kontrolne, bez pełnego rozwiązania.',
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
    expect((apiPostMock.mock.calls[0] ?? [])[1]).not.toHaveProperty('memory');

    await waitFor(() => {
      const persisted = JSON.parse(
        window.sessionStorage.getItem('kangur-ai-tutor-runtime-v1') ?? '{}'
      ) as {
        learnerMemories?: Record<string, Record<string, unknown>>;
      };

      expect(persisted.learnerMemories ?? {}).toEqual({});
    });
  });

  it('closes the tutor and drops session history across switches when cross-page persistence is disabled', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowCrossPagePersistence: false,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: null,
          },
        });
      }
      return undefined;
    });
    apiPostMock.mockResolvedValue({
      message: 'Skup się na pierwszym kroku.',
      sources: [],
    });

    function SessionSwitcherHarness(): React.JSX.Element {
      const [lessonId, setLessonId] = React.useState<'lesson-1' | 'lesson-2'>('lesson-1');

      return (
        <div>
          <KangurAiTutorSessionSync
            learnerId='learner-1'
            sessionContext={{
              surface: 'lesson',
              contentId: lessonId,
              title: lessonId === 'lesson-1' ? 'Dodawanie' : 'Odejmowanie',
            }}
          />
          <button type='button' onClick={() => setLessonId('lesson-1')}>
            Go to lesson 1
          </button>
          <button type='button' onClick={() => setLessonId('lesson-2')}>
            Go to lesson 2
          </button>
          <Harness />
        </div>
      );
    }

    render(
      <KangurAiTutorProvider>
        <SessionSwitcherHarness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open tutor' }));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Skup się na pierwszym kroku.'
      )
    );
    expect(window.sessionStorage.getItem('kangur-ai-tutor-runtime-v1')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Go to lesson 2' }));

    await waitFor(() => expect(screen.getByTestId('is-open')).toHaveTextContent('false'));
    await waitFor(() => expect(screen.getByTestId('messages')).toHaveTextContent(''));
    expect(window.sessionStorage.getItem('kangur-ai-tutor-runtime-v1')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Go to lesson 1' }));

    await waitFor(() => expect(screen.getByTestId('is-open')).toHaveTextContent('false'));
    expect(screen.getByTestId('messages')).toHaveTextContent('');
  });

  it('does not restore a persisted open tutor through session sync when cross-page persistence is disabled', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowCrossPagePersistence: false,
            allowLessons: true,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: null,
          },
        });
      }
      return undefined;
    });

    window.sessionStorage.setItem(
      'kangur-ai-tutor-runtime-v1',
      JSON.stringify({
        isOpen: true,
        sessionStates: {
          'learner-1:lesson:lesson-1': {
            messages: [
              {
                role: 'assistant',
                content: 'Witaj ponownie.',
              },
            ],
            isLoading: false,
            isUsageLoading: false,
            highlightedText: null,
            usageSummary: null,
          },
        },
      })
    );

    render(
      <KangurAiTutorProvider>
        <KangurAiTutorSessionSync
          learnerId='learner-1'
          sessionContext={{
            surface: 'lesson',
            contentId: 'lesson-1',
            title: 'Dodawanie',
          }}
        />
        <Harness />
      </KangurAiTutorProvider>
    );

    await waitFor(() => expect(screen.getByTestId('is-open')).toHaveTextContent('false'));
    expect(screen.getByTestId('messages')).toHaveTextContent('');
    expect(window.sessionStorage.getItem('kangur-ai-tutor-runtime-v1')).toBeNull();
  });

  it('does not hit a render loop when the provider receives an equivalent session context object', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const { rerender } = render(
        <React.StrictMode>
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
        </React.StrictMode>
      );

      await waitFor(() => expect(screen.getByTestId('tutor-name')).toHaveTextContent('Mila'));

      rerender(
        <React.StrictMode>
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
        </React.StrictMode>
      );

      await waitFor(() => expect(screen.getByTestId('tutor-name')).toHaveTextContent('Mila'));

      expect(
        consoleErrorSpy.mock.calls.some((args) =>
          args.some(
            (value) =>
              typeof value === 'string' && value.includes('Maximum update depth exceeded')
          )
        )
      ).toBe(false);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('hydrates persisted tutor runtime state without restoring transient loading flags', async () => {
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
              id: 'happy',
              label: 'Happy',
              svgContent:
                '<svg viewBox="0 0 100 100"><circle cx="36" cy="40" r="8" fill="#ffffff" /><circle cx="64" cy="40" r="8" fill="#ffffff" /><path d="M24 58 Q50 82 76 58" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
            },
          ],
        },
      ],
    });
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

    window.sessionStorage.setItem(
      'kangur-ai-tutor-runtime-v1',
      JSON.stringify({
        isOpen: true,
        sessionStates: {
          'learner-1:lesson:lesson-1': {
            messages: [
              {
                role: 'assistant',
                content: 'Witaj ponownie.',
              },
            ],
            isLoading: true,
            isUsageLoading: true,
            highlightedText: '2 + 2',
            suggestedMoodId: 'happy',
            usageSummary: {
              dateKey: '2026-03-07',
              messageCount: 1,
              dailyMessageLimit: 3,
              remainingMessages: 2,
            },
          },
        },
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

    await waitFor(() => expect(screen.getByTestId('is-open')).toHaveTextContent('true'));
    expect(screen.getByTestId('messages')).toHaveTextContent('Witaj ponownie.');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('is-usage-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('tutor-mood')).toHaveTextContent('happy');
  });

  it('restores persisted website-help targets from session storage', async () => {
    window.sessionStorage.setItem(
      'kangur-ai-tutor-runtime-v1',
      JSON.stringify({
        isOpen: true,
        sessionStates: {
          'learner-1:lesson:lesson-1': {
            messages: [
              {
                role: 'assistant',
                content: 'Kliknij przycisk logowania w górnej nawigacji.',
                websiteHelpTarget: {
                  nodeId: 'flow:kangur:sign-in',
                  label: 'Zaloguj się',
                  route: '/',
                  anchorId: 'kangur-primary-nav-login',
                },
              },
            ],
            isLoading: false,
            isUsageLoading: false,
            highlightedText: null,
            usageSummary: null,
          },
        },
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

    await waitFor(() => expect(screen.getByTestId('is-open')).toHaveTextContent('true'));
    expect(screen.getByTestId('messages')).toHaveTextContent(
      'Kliknij przycisk logowania w górnej nawigacji.'
    );
    expect(screen.getByTestId('website-help-targets')).toHaveTextContent(
      'Zaloguj się:/:kangur-primary-nav-login'
    );
  });

  it('closes a persisted open tutor when the restored session is not allowed', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
        return JSON.stringify({
          'learner-1': {
            enabled: true,
            agentPersonaId: 'persona-1',
            motionPresetId: null,
            allowLessons: false,
            testAccessMode: 'guided',
            showSources: true,
            allowSelectedTextSupport: true,
            dailyMessageLimit: null,
          },
        });
      }
      return undefined;
    });

    window.sessionStorage.setItem(
      'kangur-ai-tutor-runtime-v1',
      JSON.stringify({
        isOpen: true,
        sessionStates: {
          'learner-1:lesson:lesson-1': {
            messages: [
              {
                role: 'assistant',
                content: 'Witaj ponownie.',
              },
            ],
            isLoading: false,
            isUsageLoading: false,
            highlightedText: null,
            usageSummary: null,
          },
        },
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

    await waitFor(() => expect(screen.getByTestId('is-open')).toHaveTextContent('false'));
  });
});
