/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  getKangurPortableLessonBodyMock,
  replaceMock,
  useLessonsScreenBootStateMock,
  useKangurMobileLessonsDuelsMock,
  useKangurMobileLessonsMock,
  useLocalSearchParamsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  getKangurPortableLessonBodyMock: vi.fn(),
  replaceMock: vi.fn(),
  useLessonsScreenBootStateMock: vi.fn(),
  useKangurMobileLessonsDuelsMock: vi.fn(),
  useKangurMobileLessonsMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('react-native', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      children,
      onPress,
      ...props
    }: React.PropsWithChildren<Record<string, unknown> & { onPress?: () => void }>) =>
      React.createElement(
        tagName,
        {
          ...props,
          ...(onPress ? { onClick: onPress } : {}),
        },
        children,
      );
  };

  return {
    Pressable: createPrimitive('button'),
    ScrollView: createPrimitive('div'),
    Text: createPrimitive('span'),
    View: createPrimitive('div'),
  };
});

vi.mock('react-native-safe-area-context', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tagName, props, children);
  };

  return {
    SafeAreaView: createPrimitive('div'),
  };
});

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

vi.mock('@kangur/core', () => ({
  getKangurPortableLessonBody: getKangurPortableLessonBodyMock,
  getKangurPracticeOperationForLessonComponent: vi.fn(() => 'clock'),
}));

vi.mock('./useLessonsScreenBootState', () => ({
  useLessonsScreenBootState: useLessonsScreenBootStateMock,
}));

vi.mock('./useKangurMobileLessons', () => ({
  useKangurMobileLessons: useKangurMobileLessonsMock,
}));

vi.mock('./useKangurMobileLessonsDuels', () => ({
  useKangurMobileLessonsDuels: useKangurMobileLessonsDuelsMock,
}));

import { KangurLessonsScreen } from './KangurLessonsScreen';

const renderLessonsScreen = (locale?: 'pl' | 'en' | 'de') =>
  render(
    locale ? (
      <KangurMobileI18nProvider locale={locale}>
        <KangurLessonsScreen />
      </KangurMobileI18nProvider>
    ) : (
      <KangurLessonsScreen />
    ),
  );

const mockLessonItem = {
  isFocused: true,
  lesson: {
    componentId: 'clock',
    description: 'Naucz sie odczytywac godziny na zegarze.',
    emoji: '🕒',
    id: 'lesson-clock',
    title: 'Nauka zegara',
  },
  mastery: {
    badgeAccent: 'emerald',
    statusLabel: 'Opanowane 100%',
    summaryLabel: 'Swietnie radzisz sobie z odczytywaniem godzin.',
  },
};

describe('KangurLessonsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    getKangurPortableLessonBodyMock.mockImplementation((_: string, locale?: string) => {
      if (locale === 'de') {
        return {
          introduction: 'Schau zuerst, wie sich die Zeiger bewegen.',
          practiceNote:
            'Nach der Lektion kannst du direkt in das kuerzere Uhrtraining wechseln.',
          sections: [
            {
              description: 'Beginne mit vollen Stunden.',
              id: 'sec-1',
              reminders: ['Schau zuerst auf den kurzen Zeiger.'],
              title: 'Volle Stunden',
            },
          ],
        };
      }

      if (locale === 'en') {
        return {
          introduction: 'First watch how the hands move.',
          practiceNote: 'After the lesson, go straight into the shorter clock practice.',
          sections: [
            {
              description: 'Start with full hours.',
              id: 'sec-1',
              reminders: ['Look at the short hand first.'],
              title: 'Full hours',
            },
          ],
        };
      }

      return {
        introduction: 'Najpierw zobacz, jak przesuwaja sie wskazowki.',
        practiceNote: 'Po lekcji przejdz od razu do krotszego treningu zegara.',
        sections: [
          {
            description: 'Zacznij od pelnych godzin.',
            id: 'sec-1',
            reminders: ['Najpierw patrz na krotsza wskazowke.'],
            title: 'Pelne godziny',
          },
        ],
      };
    });
    useKangurMobileLessonsMock.mockReturnValue({
      actionError: null,
      focusToken: 'clock',
      lessons: [mockLessonItem],
      saveLessonCheckpoint: vi.fn(),
      selectedLesson: mockLessonItem,
    });
    useKangurMobileLessonsDuelsMock.mockReturnValue({
      actionError: null,
      createRematch: vi.fn(),
      currentEntry: null,
      currentRank: null,
      error: null,
      isActionPending: false,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });
  });

  it('keeps the hero visible while lesson skeletons are loading', () => {
    useLessonsScreenBootStateMock.mockReturnValue(true);

    renderLessonsScreen();

    expect(screen.getByText('Lekcje')).toBeTruthy();
    expect(screen.getByText('Nauka i powtórki')).toBeTruthy();
    expect(screen.getByText('Ładowanie lekcji')).toBeTruthy();
    expect(
      screen.getByText('Przygotowujemy wybraną lekcję i sekcje do czytania.'),
    ).toBeTruthy();
    expect(screen.getByText('Wczytujemy listę tematów i stan opanowania.')).toBeTruthy();
    expect(screen.queryByText('Wybrana lekcja')).toBeNull();
  });

  it('replaces the loading cards with the focused lesson content after boot', async () => {
    useLessonsScreenBootStateMock.mockReturnValue(false);
    const createRematchMock = vi.fn().mockResolvedValue('duel-lessons-1');
    useKangurMobileLessonsDuelsMock.mockReturnValue({
      actionError: null,
      createRematch: createRematchMock,
      currentEntry: {
        displayName: 'Ada Learner',
        lastPlayedAt: '2026-03-21T08:07:00.000Z',
        learnerId: 'learner-1',
        losses: 2,
        matches: 5,
        ties: 0,
        winRate: 0.6,
        wins: 3,
      },
      currentRank: 2,
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [
        {
          displayName: 'Leo Mentor',
          lastPlayedAt: '2026-03-21T08:05:00.000Z',
          learnerId: 'learner-2',
        },
      ],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });

    renderLessonsScreen();

    expect(screen.getByText('Lekcje')).toBeTruthy();
    expect(screen.getByText('Wybrana lekcja')).toBeTruthy();
    expect(screen.getAllByText('🕒 Nauka zegara').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Sekcje lekcji')).toBeTruthy();
    expect(
      screen.getByText(
        'Zacznij od nowych tematów albo wróć do obszarów wymagających powtórki.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.queryByText('Ładowanie lekcji')).toBeNull();
    expect(screen.queryByText('Wczytujemy listę tematów i stan opanowania.')).toBeNull();

    fireEvent.click(screen.getByText('Szybki rewanż'));

    expect(createRematchMock).toHaveBeenCalledWith('learner-2');
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-lessons-1',
        },
      });
    });
  });

  it('renders German lesson-shell copy when the locale is de', () => {
    useLessonsScreenBootStateMock.mockReturnValue(true);

    renderLessonsScreen('de');

    expect(screen.getByText('Lektionen')).toBeTruthy();
    expect(screen.getByText('Lernen und Wiederholen')).toBeTruthy();
    expect(screen.getByText('Lektionen werden geladen')).toBeTruthy();
    expect(screen.getByText('Die Themenliste und der Beherrschungsstand werden geladen.')).toBeTruthy();
  });

  it('passes the active locale into the lesson body resolver and renders German body copy', () => {
    useLessonsScreenBootStateMock.mockReturnValue(false);

    renderLessonsScreen('de');

    expect(getKangurPortableLessonBodyMock).toHaveBeenCalledWith('clock', 'de');
    expect(screen.getByText('Schau zuerst, wie sich die Zeiger bewegen.')).toBeTruthy();
    expect(screen.getByText('Volle Stunden')).toBeTruthy();
    expect(screen.getByText('Nach der Lektion kannst du direkt in das kuerzere Uhrtraining wechseln.')).toBeTruthy();
  });

  it('saves a local lesson checkpoint from the current section coverage', () => {
    const saveLessonCheckpointMock = vi.fn().mockReturnValue({
      countsAsLessonCompletion: false,
      newBadges: [],
      scorePercent: 50,
    });
    useLessonsScreenBootStateMock.mockReturnValue(false);
    getKangurPortableLessonBodyMock.mockReturnValue({
      introduction: 'Najpierw zobacz, jak przesuwaja sie wskazowki.',
      practiceNote: 'Po lekcji przejdz od razu do krotszego treningu zegara.',
      sections: [
        {
          description: 'Zacznij od pelnych godzin.',
          id: 'sec-1',
          reminders: ['Najpierw patrz na krotsza wskazowke.'],
          title: 'Pelne godziny',
        },
        {
          description: 'Potem dodaj minuty.',
          id: 'sec-2',
          reminders: ['Sprawdz, czy dluzsza wskazowka nie przekroczyla polowy.'],
          title: 'Minuty',
        },
      ],
    });
    useKangurMobileLessonsMock.mockReturnValue({
      actionError: null,
      focusToken: 'clock',
      lessons: [mockLessonItem],
      saveLessonCheckpoint: saveLessonCheckpointMock,
      selectedLesson: mockLessonItem,
    });

    renderLessonsScreen();

    expect(screen.getByText('Postęp lekcji')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    fireEvent.click(screen.getByText('Zapisz checkpoint'));

    expect(saveLessonCheckpointMock).toHaveBeenCalledWith({
      countsAsLessonCompletion: false,
      lessonComponentId: 'clock',
      scorePercent: 50,
    });
    expect(
      screen.getByText('Checkpoint lekcji zapisano lokalnie z wynikiem 50%.'),
    ).toBeTruthy();
  });
});
