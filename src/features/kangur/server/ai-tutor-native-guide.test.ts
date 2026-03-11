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
