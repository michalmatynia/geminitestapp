/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  Harness,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  KangurAiTutorProvider,
  KangurAiTutorSessionSync,
  apiPostMock,
  resetKangurAiTutorContextTestState,
  settingsStoreMock,
  trackKangurClientEventMock,
  useAgentPersonasMock,
} from './KangurAiTutorContext.test-support';

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

describe('KangurAiTutorContext persistence', () => {
  beforeEach(() => {
    resetKangurAiTutorContextTestState();
  });

  afterEach(() => {
    cleanup();
  });

  it('persists tutor conversations per session key across session switches', async () => {
    apiPostMock.mockResolvedValue({
      message: 'Skup się na pierwszym kroku.',
      sources: [],
    });

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
