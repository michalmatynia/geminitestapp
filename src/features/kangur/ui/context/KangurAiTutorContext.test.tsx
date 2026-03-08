/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  settingsStoreMock,
  apiGetMock,
  apiPostMock,
  useAgentPersonasMock,
  useOptionalKangurAuthMock,
  trackKangurClientEventMock,
  logKangurClientErrorMock,
} = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  useAgentPersonasMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      get: apiGetMock,
      post: apiPostMock,
    },
  };
});

vi.mock('@/features/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/ai')>();
  return {
    ...actual,
    useAgentPersonas: useAgentPersonasMock,
  };
});

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
  logKangurClientError: logKangurClientErrorMock,
}));

import { KANGUR_AI_TUTOR_SETTINGS_KEY } from '@/features/kangur/settings-ai-tutor';
import { ApiError } from '@/shared/lib/api-client';
import {
  KangurAiTutorProvider,
  KangurAiTutorSessionSync,
  useKangurAiTutor,
} from './KangurAiTutorContext';

function Harness(): React.JSX.Element {
  const {
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
  } = useKangurAiTutor();
  const followUpSummary = messages
    .flatMap((message) =>
      (message.followUpActions ?? []).map((action) => `${action.reason ?? action.id}:${action.label}`)
    )
    .join(' | ');

  return (
    <div>
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

describe('KangurAiTutorContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      suggestedMoodId: 'encouraging',
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
    expect(screen.getByTestId('tutor-behavior-mood-label')).toHaveTextContent('Wspierajacy');

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
        promptMode: 'hint',
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
      })
    );
    expect(logKangurClientErrorMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Spróbuj policzyć krok po kroku.'
      )
    );
    expect(screen.getByTestId('follow-up-actions')).toHaveTextContent(
      'Powtorz lekcje: Dodawanie:Otworz lekcje'
    );
    expect(screen.getByTestId('usage-summary')).toHaveTextContent('2/3/1');
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
      'Tutor obniza napiecie i porzadkuje sytuacje krok po kroku.'
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
      new ApiError('Daily AI tutor message limit reached for this learner. Try again tomorrow.', 429)
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
        'Pomóż mi z tym zadaniem. | Daily AI tutor message limit reached for this learner. Try again tomorrow.'
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
