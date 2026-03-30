
/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  loadProgressMock,
  persistedHeroRecentScoresBootSnapshot,
  persistedHeroTrainingFocusBootSnapshot,
  persistedLessonCheckpointBootSnapshot,
  renderHomeScreen,
  replaceMock,
  setupHomeScreenTest,
  shareKangurDuelInviteMock,
  subscribeToProgressMock,
  useHomeScreenBootStateMock,
  useHomeScreenDeferredPanelsMock,
  useKangurMobileAuthMock,
  useKangurMobileHomeAssignmentsMock,
  useKangurMobileHomeBadgesMock,
  useKangurMobileHomeDuelsInvitesMock,
  useKangurMobileHomeDuelsLeaderboardMock,
  useKangurMobileHomeDuelsPresenceMock,
  useKangurMobileHomeDuelsRematchesMock,
  useKangurMobileHomeDuelsSpotlightMock,
  useKangurMobileHomeLessonCheckpointsMock,
  useKangurMobileHomeLessonMasteryMock,
  useKangurMobileRecentResultsMock,
  useKangurMobileRuntimeMock,
  useKangurMobileTrainingFocusMock,
} from './HomeScreen.test-support';

describe('HomeScreen', () => {
  setupHomeScreenTest();

it('shows the learner-session restoring shell while auth-backed sections are still loading', () => {
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: true,
    session: {
      status: 'anonymous',
      user: null,
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileRecentResultsMock.mockReturnValue({
    error: null,
    isEnabled: false,
    isLoading: true,
    isRestoringAuth: true,
    refresh: vi.fn(),
    results: [],
  });
  useKangurMobileTrainingFocusMock.mockReturnValue({
    error: null,
    isEnabled: false,
    isLoading: true,
    isRestoringAuth: true,
    recentResults: [],
    refresh: vi.fn(),
    strongestLessonFocus: null,
    strongestOperation: null,
    weakestLessonFocus: null,
    weakestOperation: null,
  });

  renderHomeScreen();

  expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
  expect(screen.getByText('Wyniki 0')).toBeTruthy();
  expect(screen.getByText('Checkpointy 0')).toBeTruthy();
  expect(screen.getByText('Fokus treningowy: Trening mieszany')).toBeTruthy();
  expect(screen.getByText('Plan dnia teraz')).toBeTruthy();
  expect(screen.getByText('Status: przywracanie')).toBeTruthy();
  expect(screen.getByText('Użytkownik: przywracanie logowania')).toBeTruthy();
  expect(
    screen.getByText(
      'Przywracamy teraz logowanie, ostatnie wyniki i wskazówki treningowe.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText('Przywracamy logowanie i fokus treningowy oparty na wynikach.'),
  ).toBeTruthy();
  expect(screen.getByText('Pobieramy wyniki ucznia.')).toBeTruthy();
  expect(screen.queryByText('Login ucznia')).toBeNull();
  expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
  expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
});

it('renders the home loading shell before the home panels settle', () => {
  useHomeScreenBootStateMock.mockReturnValue(true);

  renderHomeScreen();

  expect(screen.getByTestId('home-loading-shell')).toBeTruthy();
  expect(screen.getByTestId('home-loading-hero')).toBeTruthy();
  expect(screen.getByTestId('home-loading-account-card')).toBeTruthy();
  expect(screen.getByTestId('home-loading-navigation-card')).toBeTruthy();
  expect(screen.queryByText('Kangur mobilnie')).toBeNull();
  expect(subscribeToProgressMock).not.toHaveBeenCalled();
  expect(useHomeScreenDeferredPanelsMock).not.toHaveBeenCalled();
  expect(useKangurMobileAuthMock).not.toHaveBeenCalled();
  expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
  expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsInvitesMock).not.toHaveBeenCalled();
});

it('shows the combined startup placeholder until deferred top and lower home panels are ready', () => {
  useHomeScreenDeferredPanelsMock.mockReturnValue(false);

  renderHomeScreen();

  expect(screen.getByText('Start w Kangurze')).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy wyniki, lekcje, status konta, nawigację, pojedynki i kolejne zapisane sekcje na następne etapy ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Konto i połączenie')).toBeNull();
  expect(screen.queryByText('Nawigacja')).toBeNull();
  expect(screen.queryByText('Szybki dostęp')).toBeNull();
  expect(screen.queryByText('Kolejne sekcje startowe')).toBeNull();
  expect(
    screen.queryByText(
      'Po zalogowaniu zobaczysz tutaj prywatne zaproszenia do pojedynków od innych uczniów.',
    ),
  ).toBeNull();
  expect(screen.queryByText('Fokus treningowy')).toBeNull();
  expect(screen.queryByText('Więcej danych startowych')).toBeNull();
  expect(
    screen.queryByText(
      'Przygotowujemy wyniki, lekcje i szybkie skróty na następny etap ekranu startowego.',
    ),
  ).toBeNull();
  expect(
    screen.queryByText(
      'Przygotowujemy status konta, nawigację, pojedynki, fokus treningowy i kolejne zapisane sekcje na następne etapy ekranu startowego.',
    ),
  ).toBeNull();
  expect(useKangurMobileHomeDuelsInvitesMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsPresenceMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsRematchesMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsSpotlightMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsLeaderboardMock).not.toHaveBeenCalled();
  expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
  expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
});

it('keeps the shared home progress subscription deferred until the progress stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:progress',
  );

  renderHomeScreen();

  expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
  expect(loadProgressMock).not.toHaveBeenCalled();
  expect(subscribeToProgressMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeLessonCheckpointsMock).not.toHaveBeenCalledWith({
    limit: 1,
  });
});

it('keeps duel cards deferred until the secondary duel stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) =>
      panelKey !== 'home:duels:secondary' &&
      panelKey !== 'home:duels:invites' &&
      panelKey !== 'home:duels:advanced',
  );

  renderHomeScreen();

  expect(screen.getByText('Zaproszenia do pojedynków')).toBeTruthy();
  expect(screen.getByText('Wysłane wyzwania')).toBeTruthy();
  expect(
    screen.getAllByText(
      'Przygotowujemy kolejne karty pojedynków na następny etap ekranu startowego.',
    ),
  ).toHaveLength(6);
  expect(
    screen.queryByText(
      'Po zalogowaniu zobaczysz tutaj prywatne zaproszenia do pojedynków od innych uczniów.',
    ),
  ).toBeNull();
  expect(
    screen.queryByText(
      'Po zalogowaniu pojawią się tutaj Twoje prywatne wyzwania razem z akcją ponownego udostępnienia zaproszenia.',
    ),
  ).toBeNull();
  expect(
    screen.queryByText(
      'Po zalogowaniu zobaczysz tutaj aktywnych rywali z lobby pojedynków razem z bezpośrednią akcją prywatnego wyzwania.',
    ),
  ).toBeNull();
  expect(
    screen.queryByText(
      'Teraz nie ma aktywnych publicznych pojedynków. Otwórz lobby, aby wystartować z nowym meczem albo poczekać na kolejnego rywala.',
    ),
  ).toBeNull();
  expect(
    screen.queryByText(
      'Po zalogowaniu pojawią się tutaj ostatni rywale razem z akcją szybkiego prywatnego rewanżu.',
    ),
  ).toBeNull();
  expect(
    screen.queryByText(
      'W tym oknie nie ma jeszcze zakończonych pojedynków. Pierwsze skończone serie od razu wypełnią tutaj ten stan pojedynków.',
    ),
  ).toBeNull();
  expect(useKangurMobileHomeDuelsInvitesMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsPresenceMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsRematchesMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsSpotlightMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsLeaderboardMock).not.toHaveBeenCalled();
});

it('keeps private duel refresh deferred until the invites stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) =>
      panelKey !== 'home:duels:invites' && panelKey !== 'home:duels:advanced',
  );
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Ada Learner',
          id: 'learner-1',
        },
        actorType: 'learner',
        full_name: 'Ada Learner',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileHomeDuelsInvitesMock.mockReturnValue({
    error: null,
    invites: [],
    isDeferred: true,
    isAuthenticated: true,
    isLoading: false,
    isRestoringAuth: false,
    outgoingChallenges: [],
    refresh: vi.fn(),
  });

  renderHomeScreen();

  expect(
    screen.getByText(
      'Przygotowujemy odświeżone prywatne zaproszenia do pojedynków na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy odświeżone wysłane wyzwania na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(useKangurMobileHomeDuelsInvitesMock).toHaveBeenCalledWith({
    enabled: false,
  });
  expect(useKangurMobileHomeDuelsPresenceMock).toHaveBeenCalledWith({
    enabled: false,
  });
});

it('keeps advanced duel cards deferred until the advanced duel stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:duels:advanced',
  );
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Ada Learner',
          id: 'learner-1',
        },
        actorType: 'learner',
        full_name: 'Ada Learner',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileHomeDuelsInvitesMock.mockReturnValue({
    error: null,
    invites: [],
    isDeferred: false,
    isAuthenticated: true,
    isLoading: false,
    isRestoringAuth: false,
    outgoingChallenges: [],
    refresh: vi.fn(),
  });

  renderHomeScreen();

  expect(screen.getByText('Zaproszenia do pojedynków')).toBeTruthy();
  expect(screen.getByText('Wysłane wyzwania')).toBeTruthy();
  expect(
    screen.getByText(
      'Brak oczekujących zaproszeń. Możesz otworzyć lobby i wysłać nowe wyzwanie.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      'Nie wysłano jeszcze prywatnych wyzwań. Otwórz lobby, aby od razu zaprosić rywala.',
    ),
  ).toBeTruthy();
  expect(
    screen.getAllByText(
      'Przygotowujemy kolejne karty pojedynków na następny etap ekranu startowego.',
    ),
  ).toHaveLength(4);
  expect(useKangurMobileHomeDuelsInvitesMock).toHaveBeenCalledWith({
    enabled: true,
  });
  expect(useKangurMobileHomeDuelsPresenceMock).toHaveBeenCalledWith({
    enabled: false,
  });
  expect(useKangurMobileHomeDuelsRematchesMock).toHaveBeenCalledWith({
    enabled: false,
  });
  expect(useKangurMobileHomeDuelsSpotlightMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeDuelsLeaderboardMock).not.toHaveBeenCalled();
});

it('keeps secondary home insights deferred until the staged gate is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation((panelKey: string) =>
    panelKey === 'home:duels',
  );

  renderHomeScreen();

  expect(screen.getByText('Więcej danych startowych')).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy zapisane lekcje, odznaki, zadania i rozszerzoną sekcję wyników na ekran startowy.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Plan lekcji ze startu')).toBeNull();
  expect(useKangurMobileHomeAssignmentsMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeLessonMasteryMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeBadgesMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeLessonCheckpointsMock).not.toHaveBeenCalled();
  expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
  expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
});

it('keeps live lesson insights deferred while recent lessons render from the boot snapshot', () => {
  const storageSnapshot = new Map<string, string>([
    [
      'kangur.mobile.home.lessonCheckpoints',
      JSON.stringify(persistedLessonCheckpointBootSnapshot),
    ],
  ]);
  const getItemMock = vi.fn((key: string) => storageSnapshot.get(key) ?? null);
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) =>
      panelKey !== 'home:insights:lessons' && panelKey !== 'home:progress',
  );
  useKangurMobileRuntimeMock.mockReturnValue({
    apiBaseUrl: 'http://localhost:3000',
    apiBaseUrlSource: 'env',
    progressStore: {
      subscribeToProgress: subscribeToProgressMock,
      loadProgress: loadProgressMock,
    },
    storage: {
      getItem: getItemMock,
      removeItem: (key: string) => {
        storageSnapshot.delete(key);
      },
      setItem: (key: string, value: string) => {
        storageSnapshot.set(key, value);
      },
    },
  });

  renderHomeScreen();

  expect(screen.getByText('Plan lekcji ze startu')).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy pełne podsumowanie lekcji na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
  expect(screen.getByText('➕ Dodawanie')).toBeTruthy();
  expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
  expect(loadProgressMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeLessonMasteryMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeLessonCheckpointsMock).not.toHaveBeenCalled();
});

it('keeps lesson plan details deferred until the dedicated lesson-plan stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:insights:lessons:plan:details',
  );

  renderHomeScreen();

  expect(screen.getByText('Plan lekcji ze startu')).toBeTruthy();
  expect(
    screen.getByText(
      'Od razu zobacz, co wymaga powtórki, a którą lekcję trzeba tylko krótko odświeżyć.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy szczegółowe karty lekcji i wskazówki nauki na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Śledzone 2')).toBeNull();
  expect(screen.queryByText('Opanowane 1')).toBeNull();
  expect(screen.queryByText('Najmocniejsza lekcja')).toBeNull();
  expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
  expect(useKangurMobileHomeLessonMasteryMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeLessonCheckpointsMock).toHaveBeenCalledWith({
    limit: 1,
  });
});

it('keeps recent lesson details deferred until the dedicated recent-lessons stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:insights:lessons:recent:details',
  );
  useKangurMobileHomeLessonCheckpointsMock.mockReturnValue({
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

  renderHomeScreen();

  expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy kolejne zapisane lekcje i szybkie przejścia na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby ostatnie lekcje pojawiły się tutaj.')).toBeNull();
  expect(screen.queryByText('Otwórz wszystkie lekcje')).toBeNull();
});

it('keeps tertiary home insights deferred until the extra stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:insights:extras',
  );

  renderHomeScreen();

  expect(screen.getByText('Plan lekcji ze startu')).toBeTruthy();
  expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
  expect(screen.getByText('Kolejne zapisane sekcje')).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy odznaki, zadania i centrum wyników na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Centrum odznak')).toBeNull();
  expect(screen.queryByText('Plan z ekranu głównego')).toBeNull();
  expect(screen.queryByText('Centrum wyników')).toBeNull();
  expect(useKangurMobileHomeAssignmentsMock).not.toHaveBeenCalled();
  expect(useKangurMobileHomeBadgesMock).not.toHaveBeenCalled();
});

it('keeps the live score refresh deferred until the dedicated score stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:insights:scores',
  );
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Maja Uczennica',
          id: 'learner-1',
        },
        actorType: 'learner',
        canManageLearners: false,
        full_name: 'Maja Uczennica',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });

  renderHomeScreen();

  expect(
    screen.getByText(
      'Przygotowujemy odświeżony fokus treningowy na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy odświeżone podsumowanie wyników na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(useKangurMobileRecentResultsMock).toHaveBeenCalledWith({
    enabled: false,
  });
  expect(useKangurMobileTrainingFocusMock).toHaveBeenCalledWith({
    enabled: false,
    recentResultsLimit: 3,
  });
});

it('keeps authenticated hero score hooks deferred until the dedicated hero score stage is ready', () => {
  const storageSnapshot = new Map<string, string>([
    [
      'kangur.mobile.scores.recent',
      JSON.stringify(persistedHeroRecentScoresBootSnapshot),
    ],
    [
      'kangur.mobile.scores.trainingFocus',
      JSON.stringify(persistedHeroTrainingFocusBootSnapshot),
    ],
  ]);
  const getItemMock = vi.fn((key: string) => storageSnapshot.get(key) ?? null);
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) =>
      panelKey !== 'home:hero:scores' && panelKey !== 'home:progress',
  );
  useKangurMobileRuntimeMock.mockReturnValue({
    apiBaseUrl: 'http://localhost:3000',
    apiBaseUrlSource: 'env',
    progressStore: {
      subscribeToProgress: subscribeToProgressMock,
      loadProgress: loadProgressMock,
    },
    storage: {
      getItem: getItemMock,
      removeItem: (key: string) => {
        storageSnapshot.delete(key);
      },
      setItem: (key: string, value: string) => {
        storageSnapshot.set(key, value);
      },
    },
  });
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Maja Uczennica',
          id: 'learner-1',
        },
        actorType: 'learner',
        canManageLearners: false,
        full_name: 'Maja Uczennica',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });

  renderHomeScreen();

  expect(screen.getByText('Fokus treningowy: Trening mieszany')).toBeTruthy();
  expect(screen.queryByText('Ostatni wynik 7/8')).toBeNull();
  expect(loadProgressMock).not.toHaveBeenCalled();
  expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
  expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
  expect(getItemMock).not.toHaveBeenCalledWith('kangur.mobile.scores.recent');
  expect(getItemMock).not.toHaveBeenCalledWith(
    'kangur.mobile.scores.trainingFocus',
  );
});

it('keeps detailed training focus cards deferred until the dedicated training focus stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:training-focus:details',
  );
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Maja Uczennica',
          id: 'learner-1',
        },
        actorType: 'learner',
        canManageLearners: false,
        full_name: 'Maja Uczennica',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileTrainingFocusMock.mockReturnValue({
    error: null,
    isEnabled: true,
    isLoading: false,
    isRestoringAuth: false,
    recentResults: [],
    refresh: vi.fn(),
    strongestLessonFocus: 'clock',
    strongestOperation: {
      averageAccuracyPercent: 94,
      operation: 'clock',
      sessions: 4,
    },
    weakestLessonFocus: 'adding',
    weakestOperation: {
      averageAccuracyPercent: 52,
      operation: 'addition',
      sessions: 3,
    },
  });

  renderHomeScreen();

  expect(screen.getByText('Fokus treningowy')).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy szczegółowe karty treningowe na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Najmocniejszy tryb')).toBeNull();
  expect(screen.queryByText('Trenuj najsłabszy tryb')).toBeNull();
  expect(screen.queryByText('Utrzymaj tempo')).toBeNull();
});

it('keeps the long hero intro deferred until the dedicated hero intro stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:hero:intro',
  );
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Ada Learner',
          id: 'learner-1',
        },
        actorType: 'learner',
        canManageLearners: false,
        full_name: 'Ada Learner',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });

  renderHomeScreen();

  expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
  expect(screen.getByText('Witaj ponownie, Ada Learner.')).toBeTruthy();
  expect(
    screen.queryByText(
      'Witaj ponownie, Ada Learner. Zacznij od fokusu treningowego, wróć do ostatniej lekcji albo od razu otwórz plan dnia.',
    ),
  ).toBeNull();
});

it('keeps hero chips and secondary quick links deferred until the dedicated hero details stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:hero:details',
  );

  renderHomeScreen();

  expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
  expect(screen.getByText('Fokus treningowy: Trening mieszany')).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy ostatnią lekcję, ostatni wynik i kolejne szybkie skróty na następny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Wyniki 0')).toBeNull();
  expect(screen.queryByText('Checkpointy 0')).toBeNull();
  expect(screen.queryByText('Plan dnia teraz')).toBeNull();
  expect(screen.queryByText('Ostatnia lekcja: Dodawanie')).toBeNull();
  expect(useKangurMobileHomeLessonCheckpointsMock).not.toHaveBeenCalledWith({
    limit: 1,
  });
});

it('keeps results hub summary details deferred until the results stage is ready', () => {
  useHomeScreenDeferredPanelsMock.mockImplementation(
    (panelKey: string) => panelKey !== 'home:insights:results',
  );
  useKangurMobileAuthMock.mockReturnValue({
    authError: null,
    authMode: 'learner-session',
    developerAutoSignInEnabled: false,
    hasAttemptedDeveloperAutoSignIn: false,
    isLoadingAuth: false,
    session: {
      status: 'authenticated',
      user: {
        activeLearner: {
          displayName: 'Maja Uczennica',
          id: 'learner-1',
        },
        actorType: 'learner',
        canManageLearners: false,
        full_name: 'Maja Uczennica',
      },
    },
    signIn: vi.fn(),
    signInWithLearnerCredentials: vi.fn(),
    signOut: vi.fn(),
    supportsLearnerCredentials: true,
  });
  useKangurMobileRecentResultsMock.mockReturnValue({
    error: null,
    isEnabled: true,
    isLoading: false,
    isRestoringAuth: false,
    refresh: vi.fn(),
    results: [
      {
        correct_answers: 7,
        created_by: 'user-1',
        created_date: '2026-03-21T08:00:00.000Z',
        id: 'score-1',
        learner_id: 'learner-1',
        operation: 'addition',
        owner_user_id: 'user-1',
        player_name: 'Ada Learner',
        score: 7,
        subject: 'maths',
        time_taken: 42,
        total_questions: 8,
      },
    ],
  });

  renderHomeScreen();

  expect(screen.getByText('Centrum wyników')).toBeTruthy();
  expect(
    screen.getByText(
      'Przygotowujemy skrót ostatnich wyników na kolejny etap ekranu startowego.',
    ),
  ).toBeTruthy();
  expect(screen.queryByText('Pokaż ostatnie wyniki')).toBeNull();
  expect(screen.queryByText('Otwórz pełną historię')).toBeNull();
  expect(screen.queryByText('7/8 poprawnych')).toBeNull();
  expect(screen.queryByText('Historia trybu: Dodawanie')).toBeNull();
});

});
