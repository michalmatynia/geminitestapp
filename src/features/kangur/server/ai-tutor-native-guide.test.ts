import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/shared/contracts/kangur-ai-tutor-native-guide';

const { getKangurAiTutorNativeGuideStoreMock } = vi.hoisted(() => ({
  getKangurAiTutorNativeGuideStoreMock: vi.fn(),
}));

vi.mock('./ai-tutor-native-guide-repository', () => ({
  getKangurAiTutorNativeGuideStore: getKangurAiTutorNativeGuideStoreMock,
}));

import {
  resolveKangurAiTutorNativeGuideResolution,
  resolveKangurAiTutorNativeGuideResponse,
} from './ai-tutor-native-guide';

describe('resolveKangurAiTutorNativeGuideResponse', () => {
  beforeEach(() => {
    getKangurAiTutorNativeGuideStoreMock.mockReset();
    getKangurAiTutorNativeGuideStoreMock.mockResolvedValue(
      DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE
    );
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
    expect(response?.message).toContain('Pytanie w grze');
    expect(response?.message).toContain(
      'To aktualne zadanie do rozwiazania, w ktorym liczy sie tok myslenia'
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

    expect(response?.message).toContain('Konfiguracja treningu');
    expect(response?.message).toContain(
      'Tutaj ustawiasz jedna sesje treningowa: poziom, kategorie i liczbe pytan.'
    );
  });

  it('matches exact Mongo guide coverage from content id prefixes when the title is generic', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Wyjasnij ten ekran.',
      context: {
        surface: 'game',
        contentId: 'game:operation-selector',
        title: 'Nowy ekran',
      },
      locale: 'pl',
    });

    expect(response?.message).toContain('Wybor rodzaju gry');
    expect(response?.message).toContain(
      'Tutaj wybierasz rodzaj gry lub szybkie cwiczenie najlepiej pasujace do celu.'
    );
  });

  it('uses the new screen anchor coverage for game setup widgets', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Wyjasnij ten panel.',
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

    expect(response?.message).toContain('Konfiguracja treningu');
    expect(response?.message).toContain(
      'Tutaj ustawiasz jedna sesje treningowa: poziom, kategorie i liczbe pytan.'
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

    expect(response?.message).toContain('Biblioteka lekcji');
    expect(response?.message).toContain(
      'To lista tematow, z ktorej wybierasz nastepna lekcje do przerobienia.'
    );
  });

  it('uses the game-specific review entry on the result surface', async () => {
    const response = await resolveKangurAiTutorNativeGuideResponse({
      latestUserMessage: 'Wyjasnij omowienie tego wyniku.',
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

    expect(response?.message).toContain('Omowienie wyniku gry');
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

    expect(response?.message).toContain('Pusty zestaw testowy');
    expect(response?.message).toContain(
      'wybrany zestaw nie ma jeszcze opublikowanych pytan do rozwiazania'
    );
  });

  it('marks section-specific requests that fall back to an overview entry as a coverage gap', async () => {
    const resolution = await resolveKangurAiTutorNativeGuideResolution({
      latestUserMessage: 'Wyjasnij ten fragment.',
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
