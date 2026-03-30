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
  useKangurMobileLessonsAssignmentsMock,
  useKangurMobileLessonsBadgesMock,
  useKangurMobileLessonCheckpointsMock,
  useKangurMobileLessonsLessonMasteryMock,
  useKangurMobileLessonsRecentResultsMock,
  useKangurMobileLessonsDuelsMock,
  useKangurMobileLessonsMock,
  useLocalSearchParamsMock,
  useRouterMock,
} = vi.hoisted(() => ({
  getKangurPortableLessonBodyMock: vi.fn(),
  replaceMock: vi.fn(),
  useLessonsScreenBootStateMock: vi.fn(),
  useKangurMobileLessonsAssignmentsMock: vi.fn(),
  useKangurMobileLessonsBadgesMock: vi.fn(),
  useKangurMobileLessonCheckpointsMock: vi.fn(),
  useKangurMobileLessonsLessonMasteryMock: vi.fn(),
  useKangurMobileLessonsRecentResultsMock: vi.fn(),
  useKangurMobileLessonsDuelsMock: vi.fn(),
  useKangurMobileLessonsMock: vi.fn(),
  useLocalSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('react-native', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      accessibilityHint: _accessibilityHint,
      accessibilityLabel,
      accessibilityRole,
      children,
      contentContainerStyle: _contentContainerStyle,
      keyboardShouldPersistTaps: _keyboardShouldPersistTaps,
      onPress,
      testID,
      ...props
    }: React.PropsWithChildren<
      Record<string, unknown> & {
        accessibilityHint?: string;
        accessibilityLabel?: string;
        accessibilityRole?: string;
        contentContainerStyle?: unknown;
        keyboardShouldPersistTaps?: string;
        onPress?: () => void;
        testID?: string;
      }
    >) =>
      React.createElement(
        tagName,
        {
          ...props,
          ...(testID ? { 'data-testid': testID } : {}),
          ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}),
          ...(accessibilityRole ? { role: accessibilityRole } : {}),
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
    return ({
      accessibilityLabel,
      accessibilityRole,
      children,
      testID,
      ...props
    }: React.PropsWithChildren<
      Record<string, unknown> & {
        accessibilityLabel?: string;
        accessibilityRole?: string;
        testID?: string;
      }
    >) =>
      React.createElement(
        tagName,
        {
          ...props,
          ...(testID ? { 'data-testid': testID } : {}),
          ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}),
          ...(accessibilityRole ? { role: accessibilityRole } : {}),
        },
        children,
      );
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
  getLocalizedKangurMetadataBadgeName: vi.fn((badgeId: string) => badgeId),
  getKangurLeaderboardOperationInfo: vi.fn((value: string) => ({
    family: 'arithmetic',
    label: value,
  })),
  getKangurPortableLessonBody: getKangurPortableLessonBodyMock,
  getKangurPracticeOperationForLessonComponent: vi.fn(() => 'clock'),
}));

vi.mock('./useLessonsScreenBootState', () => ({
  useLessonsScreenBootState: useLessonsScreenBootStateMock,
}));

vi.mock('./useKangurMobileLessons', () => ({
  useKangurMobileLessons: useKangurMobileLessonsMock,
}));

vi.mock('./useKangurMobileLessonCheckpoints', () => ({
  useKangurMobileLessonCheckpoints: useKangurMobileLessonCheckpointsMock,
}));

vi.mock('./useKangurMobileLessonsAssignments', () => ({
  useKangurMobileLessonsAssignments: useKangurMobileLessonsAssignmentsMock,
}));

vi.mock('./useKangurMobileLessonsBadges', () => ({
  useKangurMobileLessonsBadges: useKangurMobileLessonsBadgesMock,
}));

vi.mock('./useKangurMobileLessonsLessonMastery', () => ({
  useKangurMobileLessonsLessonMastery: useKangurMobileLessonsLessonMasteryMock,
}));

vi.mock('./useKangurMobileLessonsRecentResults', () => ({
  useKangurMobileLessonsRecentResults: useKangurMobileLessonsRecentResultsMock,
}));

vi.mock('./useKangurMobileLessonsDuels', () => ({
  useKangurMobileLessonsDuels: useKangurMobileLessonsDuelsMock,
}));

vi.mock('../ai-tutor/KangurMobileAiTutorCard', () => ({
  KangurMobileAiTutorCard: () => React.createElement('div', {}, 'AI Tutor Card'),
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
  checkpointSummary: {
    attempts: 4,
    bestScorePercent: 100,
    lastCompletedAt: '2026-03-20T12:00:00.000Z',
    lastScorePercent: 90,
    masteryPercent: 92,
  },
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
  practiceHref: {
    pathname: '/practice',
    params: {
      operation: 'time_compare',
    },
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
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [],
    });
    useKangurMobileLessonsAssignmentsMock.mockReturnValue({
      assignmentItems: [],
    });
    useKangurMobileLessonsBadgesMock.mockReturnValue({
      recentBadges: [],
      remainingBadges: 9,
      totalBadges: 9,
      unlockedBadges: 0,
    });
    useKangurMobileLessonsLessonMasteryMock.mockReturnValue({
      lessonsNeedingPractice: 0,
      masteredLessons: 0,
      strongest: [],
      trackedLessons: 0,
      weakest: [],
    });
    useKangurMobileLessonsRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: false,
      isRestoringAuth: false,
      recentResultItems: [],
      refresh: vi.fn(),
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
    expect(
      screen.getByText(
        'Tutaj połączysz katalog tematów z zapisanymi checkpointami, pasującym treningiem oraz szybkim powrotem do historii i planu dnia.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Śledzone 0')).toBeTruthy();
    expect(screen.getByText('Opanowane 0')).toBeTruthy();
    expect(screen.getByText('Do powtórki 0')).toBeTruthy();
    expect(screen.getByText('Otwórz pełną historię')).toBeTruthy();
    expect(screen.getByText('Otwórz plan dnia')).toBeTruthy();
    expect(screen.getByText('AI Tutor Card')).toBeTruthy();
    expect(screen.getByText('Ładowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Przygotowujemy lekcję i sekcje do czytania.')).toBeTruthy();
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
    useKangurMobileLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [
        {
          attempts: 3,
          bestScorePercent: 72,
          componentId: 'adding',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          title: 'Dodawanie',
        },
      ],
    });
    useKangurMobileLessonsAssignmentsMock.mockReturnValue({
      assignmentItems: [
        {
          assignment: {
            action: {
              label: 'Open lesson',
              page: 'Lessons',
              query: {
                focus: 'clock',
              },
            },
            description: 'Wroc do lekcji o zegarze i domknij ostatnie braki.',
            id: 'assignment-lessons-1',
            priority: 'high',
            target: '1 lekcja',
            title: 'Domknij zegar',
          },
          href: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
        },
      ],
    });
    useKangurMobileLessonsBadgesMock.mockReturnValue({
      recentBadges: [
        {
          emoji: '📚',
          id: 'lesson_hero',
          name: 'Bohater lekcji',
        },
        {
          emoji: '🕒',
          id: 'clock_master',
          name: 'Mistrz zegara',
        },
      ],
      remainingBadges: 7,
      totalBadges: 9,
      unlockedBadges: 2,
    });
    useKangurMobileLessonsLessonMasteryMock.mockReturnValue({
      lessonsNeedingPractice: 1,
      masteredLessons: 1,
      strongest: [
        {
          attempts: 4,
          bestScorePercent: 96,
          componentId: 'clock',
          emoji: '🕒',
          lastCompletedAt: '2026-03-21T08:18:00.000Z',
          lastScorePercent: 94,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
          masteryPercent: 93,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'clock',
            },
          },
          title: 'Nauka zegara',
        },
      ],
      trackedLessons: 2,
      weakest: [
        {
          attempts: 3,
          bestScorePercent: 72,
          componentId: 'adding',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          title: 'Dodawanie',
        },
      ],
    });
    useKangurMobileLessonsRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      recentResultItems: [
        {
          historyHref: {
            pathname: '/results',
            params: {
              operation: 'addition',
            },
          },
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          result: {
            correct_answers: 7,
            created_date: '2026-03-21T08:00:00.000Z',
            id: 'score-1',
            operation: 'addition',
            total_questions: 8,
          },
        },
      ],
      refresh: vi.fn(),
    });

    renderLessonsScreen();

    expect(screen.getByText('Lekcje')).toBeTruthy();
    expect(screen.getByText('AI Tutor Card')).toBeTruthy();
    expect(screen.getByText('Wybrana lekcja')).toBeTruthy();
    expect(screen.getAllByText('🕒 Nauka zegara').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Sekcje lekcji')).toBeTruthy();
    expect(
      screen.getByText(
        'Aktualnie otwarte: Nauka zegara. Możesz od razu czytać dalej albo przejść do pasującego treningu.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Otwarte ze skrótu')).toBeTruthy();
    expect(
      screen.getByText(
        'Zacznij od nowych tematów albo wróć do obszarów wymagających powtórki.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Po lekcji')).toBeTruthy();
    expect(screen.getByText('Ostatnie checkpointy lekcji')).toBeTruthy();
    expect(screen.getByText('Kontynuuj lekcje')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik 70% • opanowanie 68%')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcje')).toBeTruthy();
    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(
      screen.getByText(
        'Ostatnie wyniki są tutaj pod ręką, aby można było od razu wrócić do treningu, pasującej lekcji albo historii trybu.',
      ),
    ).toBeTruthy();
    expect(screen.getAllByText('Otwórz pełną historię').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Trenuj ponownie')).toBeTruthy();
    expect(screen.getByText('Historia trybu')).toBeTruthy();
    expect(screen.getByText('Opanowanie lekcji')).toBeTruthy();
    expect(screen.getByText('Plan lekcji po czytaniu')).toBeTruthy();
    expect(
      screen.getByText(
        'Fokus po czytaniu: Dodawanie potrzebuje jeszcze krótkiej powtórki, zanim przejdziesz dalej.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Skup się: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Podtrzymaj: Nauka zegara')).toBeTruthy();
    expect(screen.getByText('Odznaki')).toBeTruthy();
    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Odblokowane 2/9')).toBeTruthy();
    expect(screen.getByText('Do zdobycia 7')).toBeTruthy();
    expect(screen.getByText('Ostatnio odblokowane')).toBeTruthy();
    expect(screen.getByText('📚 Bohater lekcji')).toBeTruthy();
    expect(screen.getByText('🕒 Mistrz zegara')).toBeTruthy();
    expect(screen.getByText('Otwórz profil i odznaki')).toBeTruthy();
    expect(screen.getAllByText('Śledzone 2').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Opanowane 1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Do powtórki 1').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Najmocniejsza lekcja')).toBeTruthy();
    expect(screen.getByText('Próby 4 • ostatni wynik 94%')).toBeTruthy();
    expect(screen.getAllByText('Po lekcjach').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Plan po lekcjach')).toBeTruthy();
    expect(screen.getByText('Domknij zegar')).toBeTruthy();
    expect(screen.getByText('Priorytet wysoki')).toBeTruthy();
    expect(screen.getByText('Cel: 1 lekcja')).toBeTruthy();
    expect(screen.getAllByText('Otwórz lekcję').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Ostatni checkpoint')).toBeTruthy();
    expect(screen.getByText('Wynik 90% • najlepszy 100%')).toBeTruthy();
    expect(screen.getByText('Otwórz lekcję: Nauka zegara')).toBeTruthy();
    expect(screen.getAllByText('Uruchom trening: Nauka zegara').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(screen.getByText('Rywale 1')).toBeTruthy();
    expect(screen.getByText('Twoja pozycja #2')).toBeTruthy();
    expect(screen.getByText('Szybki rewanż')).toBeTruthy();
    expect(screen.getByText('Odśwież pojedynki')).toBeTruthy();
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

  it('shows signed-out duel guidance without mobile-overview wording', () => {
    useLessonsScreenBootStateMock.mockReturnValue(false);

    renderLessonsScreen();

    expect(
      screen.getByText(
        'Zaloguj się, aby zobaczyć tutaj wyniki.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(
      screen.getByText(
        'Zaloguj się, aby zobaczyć tutaj stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
      ),
    ).toBeTruthy();
  });

  it('shows the pending duel standing when the learner rank is not visible yet', () => {
    useLessonsScreenBootStateMock.mockReturnValue(false);
    useKangurMobileLessonsDuelsMock.mockReturnValue({
      actionError: null,
      createRematch: vi.fn(),
      currentEntry: null,
      currentRank: null,
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [],
      pendingOpponentLearnerId: null,
      refresh: vi.fn(),
    });

    renderLessonsScreen();

    expect(screen.getByText('Szybki powrót do rywali')).toBeTruthy();
    expect(screen.getByText('Rywale 0')).toBeTruthy();
    expect(screen.getByText('Czeka na widoczność')).toBeTruthy();
    expect(
      screen.getByText(
        'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
      ),
    ).toBeTruthy();
  });

  it('passes the active locale into the lesson body resolver and renders German body copy', () => {
    useLessonsScreenBootStateMock.mockReturnValue(false);

    renderLessonsScreen('de');

    expect(getKangurPortableLessonBodyMock).toHaveBeenCalledWith('clock', 'de');
    expect(screen.getByText('Schau zuerst, wie sich die Zeiger bewegen.')).toBeTruthy();
    expect(screen.getByText('Volle Stunden')).toBeTruthy();
    expect(screen.getByText('Nach der Lektion kannst du direkt in das kuerzere Uhrtraining wechseln.')).toBeTruthy();
  });

  it('renders a learner-facing lesson brief when the focused lesson has no mobile body yet', () => {
    useLessonsScreenBootStateMock.mockReturnValue(false);
    getKangurPortableLessonBodyMock.mockReturnValue(null);

    renderLessonsScreen();

    expect(screen.getByText('Skrót lekcji')).toBeTruthy();
    expect(
      screen.getByText(
        'Ta lekcja jest tu na razie dostępna jako krótki skrót. Widzisz już stan opanowania, ostatni zapis oraz najszybszy powrót do pasującego treningu.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Próby 4')).toBeTruthy();
    expect(screen.getByText('Najlepszy wynik 100%')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik 90%')).toBeTruthy();
    expect(screen.getAllByText(/Ostatni zapis/).length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByText(/Właściwa treść tej lekcji nie jest jeszcze przeniesiona/),
    ).toBeNull();
  });

  it('shows a lesson-shortcut recovery state when the focused lesson is missing', () => {
    useLessonsScreenBootStateMock.mockReturnValue(false);
    useLocalSearchParamsMock.mockReturnValue({
      focus: 'fractions',
    });
    useKangurMobileLessonsMock.mockReturnValue({
      actionError: null,
      focusToken: 'fractions',
      lessons: [mockLessonItem],
      saveLessonCheckpoint: vi.fn(),
      selectedLesson: null,
    });

    renderLessonsScreen();

    expect(screen.getByText(/Skrót próbował otworzyć "fractions"\./)).toBeTruthy();
    expect(screen.getByText('Skrót do lekcji')).toBeTruthy();
    expect(screen.getByText('Ten skrót nie otwiera już lekcji "fractions"')).toBeTruthy();
    expect(screen.getByText('Otwórz pełny katalog')).toBeTruthy();
    expect(screen.queryByText('Brak dopasowania')).toBeNull();
    expect(
      screen.queryByText('Pokazujemy pełny katalog, aby można było przejść dalej ręcznie.'),
    ).toBeNull();

    fireEvent.click(screen.getByText('Otwórz pełny katalog'));

    expect(replaceMock).toHaveBeenCalledWith('/lessons');
  });

  it('saves a local lesson checkpoint from the current section coverage', () => {
    const saveLessonCheckpointMock = vi.fn().mockReturnValue({
      countsAsLessonCompletion: false,
      newBadges: ['lesson_hero'],
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
    expect(screen.getByText('Nowa odznaka: lesson_hero')).toBeTruthy();
  });
});
