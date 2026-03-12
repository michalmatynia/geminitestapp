import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/shared/contracts/kangur-ai-tutor-native-guide';

const { getKangurAiTutorNativeGuideStoreMock, getKangurPageContentEntryMock } = vi.hoisted(() => ({
  getKangurAiTutorNativeGuideStoreMock: vi.fn(),
  getKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('./ai-tutor-native-guide-repository', () => ({
  getKangurAiTutorNativeGuideStore: getKangurAiTutorNativeGuideStoreMock,
}));

vi.mock('./page-content-repository', () => ({
  getKangurPageContentEntry: getKangurPageContentEntryMock,
}));

import {
  resolveKangurAiTutorNativeGuideResolution,
  resolveKangurAiTutorNativeGuideResponse,
} from './ai-tutor-native-guide';

const normalizeCopy = (value: string | null | undefined): string =>
  typeof value === 'string'
    ? value
      .toLocaleLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l')
      .replace(/\s+/g, ' ')
      .trim()
    : '';

const expectMessageToContain = (
  message: string | null | undefined,
  fragment: string
): void => {
  expect(normalizeCopy(message)).toContain(normalizeCopy(fragment));
};

describe('resolveKangurAiTutorNativeGuideResponse', () => {
  beforeEach(() => {
    getKangurAiTutorNativeGuideStoreMock.mockReset();
    getKangurPageContentEntryMock.mockReset();
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue(
      DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE
    );
    getKangurPageContentEntryMock.mockResolvedValue(null);
  });

  it('routes guided game-question explains through the native guide even for generic prompts', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Pomoz mi z tym miejscem.',
      context: {
        surface: 'game',
        promptMode: 'explain',
        focusKind: 'question',
        focusLabel: '12 + 8 = ?',
        currentQuestion: '12 + 8 = ?',
      },
      locale: 'pl',
    });

    expect(getKangurAiTutorNativeGuideStoreMock).toHaveBeenCalledWith('pl');
    expectMessageToContain(response?.message, 'Pytanie w grze');
    expectMessageToContain(
      response?.message,
      'To aktualne zadanie do rozwiązania, w którym liczy się tok myślenia'
    );
  });

  it('prefers screen-title coverage for setup screens over the generic game overview', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Co robi ten ekran?',
      context: {
        surface: 'game',
        title: 'Konfiguracja treningu',
        focusLabel: 'Rozgrzewka tygodnia',
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Konfiguracja treningu');
    expectMessageToContain(
      response?.message,
      'Tutaj ustawiasz jedną sesję treningową: poziom, kategorie i liczbę pytań.'
    );
  });

  it('matches exact Mongo guide coverage from content id prefixes when the title is generic', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Wyjaśnij ten ekran.',
      context: {
        surface: 'game',
        contentId: 'game:operation-selector',
        title: 'Nowy ekran',
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Wybór rodzaju gry');
    expectMessageToContain(
      response?.message,
      'Tutaj wybierasz rodzaj gry lub szybkie ćwiczenie najlepiej pasujące do celu.'
    );
  });

  it('uses the new screen anchor coverage for game setup widgets', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Wyjaśnij ten panel.',
      context: {
        surface: 'game',
        promptMode: 'explain',
        focusKind: 'screen',
        focusId: 'kangur-game-training-setup',
        focusLabel: 'Konfiguracja treningu',
        title: 'Nowy ekran',
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Konfiguracja treningu');
    expectMessageToContain(
      response?.message,
      'Tutaj ustawiasz jedną sesję treningową: poziom, kategorie i liczbę pytań.'
    );
  });

  it('uses the new lesson library entry for the lessons list surface', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Powiedz mi o tej sekcji.',
      context: {
        surface: 'lesson',
        promptMode: 'explain',
        focusKind: 'library',
        focusId: 'kangur-lessons-library',
        contentId: 'lesson:list',
        focusLabel: 'Biblioteka lekcji',
        title: 'Lekcje',
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Biblioteka lekcji');
    expectMessageToContain(
      response?.message,
      'To lista tematów, z której wybierasz następną lekcję do przerobienia.'
    );
  });

  it('uses the game-specific review entry on the result surface', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Wyjaśnij omówienie tego wyniku.',
      context: {
        surface: 'game',
        promptMode: 'explain',
        focusKind: 'review',
        title: 'Wynik gry',
        focusLabel: 'Wynik gry',
        answerRevealed: true,
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Omówienie wyniku gry');
    expect(response?.followUpActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'game-review-retry' })])
    );
  });

  it('uses the dedicated empty-state entry for test suites without published questions', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Co oznacza ten pusty stan?',
      context: {
        surface: 'test',
        promptMode: 'explain',
        focusKind: 'empty_state',
        focusId: 'kangur-test-empty-state:suite-2024',
        contentId: 'suite-2024',
        title: 'Kangur 2024',
        focusLabel: 'Pusty zestaw testowy',
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Pusty zestaw testowy');
    expectMessageToContain(
      response?.message,
      'wybrany zestaw nie ma jeszcze opublikowanych pytań do rozwiązania'
    );
  });

  it('routes learner profile hero explains through the Mongo native guide store', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Powiedz mi o tej karcie.',
      context: {
        surface: 'profile',
        promptMode: 'explain',
        focusKind: 'hero',
        focusId: 'kangur-profile-hero',
        contentId: 'profile:learner-1',
        title: 'Profil ucznia',
        focusLabel: 'Hero profilu ucznia',
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Hero profilu ucznia');
    expectMessageToContain(response?.message, 'Hero profilu ucznia jest szybkim podsumowaniem');
  });

  it('routes parent dashboard assignment-tab explains through the Mongo native guide store', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Wyjaśnij te zadania.',
      context: {
        surface: 'parent_dashboard',
        promptMode: 'explain',
        focusKind: 'assignment',
        focusId: 'kangur-parent-dashboard-assignments',
        contentId: 'parent-dashboard:learner-1:assign',
        title: 'Panel rodzica: Zadania ucznia',
        focusLabel: 'Zadania ucznia',
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Zadania ucznia w dashboardzie rodzica');
    expectMessageToContain(
      response?.message,
      'Zakładka zadań w panelu rodzica służy do planowania najbliższej pracy ucznia.'
    );
  });

  it('routes auth login-form explains through the Mongo native guide store', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Wyjaśnij ten formularz.',
      context: {
        surface: 'auth',
        promptMode: 'explain',
        focusKind: 'login_form',
        focusId: 'kangur-auth-login-form',
        contentId: 'auth:login:sign-in',
        title: 'Logowanie do Kangur',
        focusLabel: 'Sekcja logowania',
      },
      locale: 'pl',
    });

    expectMessageToContain(response?.message, 'Formularz logowania Kangur');
    expectMessageToContain(
      response?.message,
      'Formularz logowania łączy dwa tryby pracy: zwykłe logowanie i założenie konta rodzica.'
    );
  });

  it('prefers an explicit Mongo knowledge reference for dropped-section explains', async () => {
    const resolution = await resolveKangurAiTutorNativeGuideResolution({
      latestUserMessage: 'Opowiedz mi o tym miejscu.',
      context: {
        surface: 'game',
        promptMode: 'chat',
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
      locale: 'pl',
    });

    expect(resolution).toMatchObject({
      status: 'hit',
      entryId: 'shared-leaderboard',
      coverageLevel: 'specific',
      matchedSignals: ['knowledge_reference'],
    });
    expectMessageToContain(resolution.status === 'hit' ? resolution.message : '', 'Ranking');
    expectMessageToContain(
      resolution.status === 'hit' ? resolution.message : '',
      'Ranking pokazuje wyniki i pozycje na tle innych prób.'
    );
  });

  it('resolves page-content knowledge references through linked native guides', async () => {
    getKangurPageContentEntryMock.mockResolvedValueOnce({
      id: 'game-home-leaderboard',
      pageKey: 'Game',
      screenKey: 'home',
      surface: 'game',
      route: '/game',
      componentId: 'leaderboard',
      widget: 'Leaderboard',
      sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
      title: 'Ranking na stronie glownej',
      summary: 'Sekcja rankingu na stronie glownej gry.',
      body: 'Pelna tresc rankingu na stronie glownej gry.',
      anchorIdPrefix: 'kangur-game-home-leaderboard',
      focusKind: 'leaderboard',
      contentIdPrefixes: ['game:home'],
      nativeGuideIds: ['shared-leaderboard'],
      triggerPhrases: ['ranking'],
      tags: ['page-content'],
      enabled: true,
      sortOrder: 10,
    });

    const resolution = await resolveKangurAiTutorNativeGuideResolution({
      latestUserMessage: 'Opowiedz mi o tym miejscu.',
      context: {
        surface: 'game',
        promptMode: 'chat',
        focusKind: 'leaderboard',
        focusId: 'kangur-game-home-leaderboard',
        focusLabel: 'Ranking',
        interactionIntent: 'explain',
        knowledgeReference: {
          sourceCollection: 'kangur_page_content',
          sourceRecordId: 'game-home-leaderboard',
          sourcePath: 'entry:game-home-leaderboard',
        },
      },
      locale: 'pl',
    });

    expect(getKangurPageContentEntryMock).toHaveBeenCalledWith('game-home-leaderboard', 'pl');
    expect(resolution).toMatchObject({
      status: 'hit',
      entryId: 'shared-leaderboard',
      coverageLevel: 'specific',
      matchedSignals: ['knowledge_reference'],
    });
  });

  it('marks section-specific requests that fall back to an overview entry as a coverage gap', async () => {
    const resolution = await resolveKangurAiTutorNativeGuideResolution({
      latestUserMessage: 'Wyjaśnij ten fragment.',
      context: {
        surface: 'lesson',
        contentId: 'lesson-1',
        promptMode: 'explain',
        focusKind: 'question',
        focusId: 'lesson-question-1',
        questionId: 'lesson-question-1',
        currentQuestion: 'Ile to 2 + 2?',
      },
      locale: 'pl',
    });

    expect(resolution).toMatchObject({
      status: 'hit',
      entryId: 'lesson-overview',
      coverageLevel: 'overview_fallback',
    });
  });
});
