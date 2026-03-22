/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurMobileAuthMock,
  useKangurMobileRuntimeMock,
} = vi.hoisted(() => ({
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

import { useKangurMobileAiTutor } from './useKangurMobileAiTutor';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createWrapper =
  (queryClient: QueryClient) =>
  ({ children }: { children: React.ReactNode }): React.JSX.Element =>
    (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

const createJsonResponse = (payload: unknown, ok = true): Response =>
  ({
    ok,
    json: async () => payload,
  }) as Response;

describe('useKangurMobileAiTutor', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);

    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
    });
  });

  it('keeps the guide visible while sign-in is still required', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      session: {
        status: 'anonymous',
        user: null,
      },
    });

    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          common: {
            defaultTutorName: 'Janek',
          },
          quickActions: {
            explain: {
              defaultLabel: 'Wyjaśnij',
              defaultPrompt: 'Wyjaśnij mi to prostymi słowami.',
            },
            hint: {
              defaultLabel: 'Podpowiedź',
              defaultPrompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
            },
            howThink: {
              defaultLabel: 'Jak myśleć?',
              defaultPrompt:
                'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.',
            },
            nextStep: {
              defaultLabel: 'Co dalej?',
              defaultPrompt:
                'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.',
              gamePrompt: 'Powiedz, co warto ćwiczyć dalej na podstawie mojej gry.',
              reviewGamePrompt: 'Powiedz, jaki powinien być mój następny krok po tej grze.',
              reviewOtherLabel: 'Co ćwiczyć?',
              reviewQuestionLabel: 'Co poprawić?',
              reviewQuestionPrompt: 'Powiedz, co ćwiczyć dalej po tym pytaniu.',
              reviewTestPrompt: 'Powiedz, jaki powinien być mój następny krok po tym teście.',
            },
            review: {
              gameLabel: 'Omów grę',
              gamePrompt: 'Omów moją ostatnią grę.',
              questionLabel: 'Omów odpowiedź',
              questionPrompt: 'Omów to pytanie.',
              resultLabel: 'Omów wynik',
              resultPrompt: 'Omów mój wynik testu.',
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          entries: [
            {
              contentIdPrefixes: [],
              enabled: true,
              focusIdPrefixes: ['kangur-test-question:'],
              focusKind: 'question',
              followUpActions: [],
              fullDescription: 'Przeczytaj zadanie jeszcze raz.',
              hints: ['Zwróć uwagę na liczby.'],
              id: 'test-question',
              relatedGames: [],
              relatedTests: [],
              shortDescription: 'To jest pytanie testowe.',
              sortOrder: 20,
              surface: 'test',
              title: 'Pytanie testowe',
              triggerPhrases: [],
            },
          ],
          locale: 'pl',
          version: 1,
        }),
      );

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () =>
        useKangurMobileAiTutor({
          context: {
            focusId: 'kangur-test-question:question-1',
            focusKind: 'question',
            questionId: 'question-1',
            surface: 'test',
          },
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(result.current.guideEntry?.id).toBe('test-question');
    });

    expect(result.current.availabilityState).toBe('signed_out');
    expect(result.current.tutorName).toBe('Janek');
    expect(result.current.canSendMessages).toBe(false);
  });

  it('sends a tutor quick action and resolves follow-up navigation for competition', async () => {
    useKangurMobileAuthMock.mockReturnValue({
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          id: 'user-1',
        },
      },
    });

    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          common: {
            defaultTutorName: 'Janek',
          },
          quickActions: {
            explain: {
              defaultLabel: 'Wyjaśnij',
              defaultPrompt: 'Wyjaśnij mi to prostymi słowami.',
            },
            hint: {
              defaultLabel: 'Podpowiedź',
              defaultPrompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
            },
            howThink: {
              defaultLabel: 'Jak myśleć?',
              defaultPrompt:
                'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.',
            },
            nextStep: {
              defaultLabel: 'Co dalej?',
              defaultPrompt:
                'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.',
              gamePrompt: 'Powiedz, co warto ćwiczyć dalej na podstawie mojej gry.',
              reviewGamePrompt: 'Powiedz, jaki powinien być mój następny krok po tej grze.',
              reviewOtherLabel: 'Co ćwiczyć?',
              reviewQuestionLabel: 'Co poprawić?',
              reviewQuestionPrompt: 'Powiedz, co ćwiczyć dalej po tym pytaniu.',
              reviewTestPrompt: 'Powiedz, jaki powinien być mój następny krok po tym teście.',
            },
            review: {
              gameLabel: 'Omów grę',
              gamePrompt: 'Omów moją ostatnią grę.',
              questionLabel: 'Omów odpowiedź',
              questionPrompt: 'Omów to pytanie.',
              resultLabel: 'Omów wynik',
              resultPrompt: 'Omów mój wynik testu.',
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          entries: [
            {
              contentIdPrefixes: ['game:result'],
              enabled: true,
              focusIdPrefixes: [],
              focusKind: 'summary',
              followUpActions: [],
              fullDescription: 'Podsumowanie gry pomaga wybrać kolejny krok.',
              hints: ['Wybierz jedną rzecz do poprawy.'],
              id: 'game-summary',
              relatedGames: [],
              relatedTests: [],
              shortDescription: 'To jest podsumowanie gry.',
              sortOrder: 20,
              surface: 'game',
              title: 'Podsumowanie gry',
              triggerPhrases: [],
            },
          ],
          locale: 'pl',
          version: 1,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          usage: {
            dailyMessageLimit: 8,
            dateKey: '2026-03-22',
            messageCount: 1,
            remainingMessages: 7,
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          followUpActions: [
            {
              id: 'next-competition-round',
              label: 'Wróć do konkursu',
              page: 'Game',
              query: {
                mode: 'full_test_2024',
              },
            },
          ],
          message: 'Najpierw wróć do pełnej rundy i sprawdź najtrudniejsze zadanie.',
          websiteHelpTarget: {
            label: 'Konfiguracja konkursu',
            nodeId: 'guide:native:game-kangur-setup',
            route: '/game',
          },
        }),
      );

    const queryClient = createQueryClient();
    const { result } = renderHook(
      () =>
        useKangurMobileAiTutor({
          context: {
            contentId: 'game:result:kangur',
            focusKind: 'summary',
            surface: 'game',
            title: 'Kangur 2024',
          },
          gameTarget: 'competition',
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    await waitFor(() => {
      expect(result.current.canSendMessages).toBe(true);
    });

    await act(async () => {
      await result.current.sendQuickAction('review');
    });

    await waitFor(() => {
      expect(result.current.responseMessage).toContain('Najpierw wróć do pełnej rundy');
    });

    expect(result.current.responseActions[0]).toEqual({
      href: {
        pathname: '/competition',
        params: {
          mode: 'full_test_2024',
        },
      },
      id: 'next-competition-round',
      label: 'Wróć do konkursu',
      reason: null,
    });
    expect(result.current.websiteHelpTarget).toEqual({
      href: '/competition',
      label: 'Konfiguracja konkursu',
    });
  });
});
